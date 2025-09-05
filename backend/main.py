from __future__ import annotations
import asyncio
import json
from typing import Optional
from datetime import datetime

from fastapi import Depends, FastAPI, HTTPException, WebSocket, WebSocketDisconnect, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse, Response
from sqlalchemy import text
from sqlalchemy.orm import Session

from .config import get_settings
from .database import get_db, engine
from .models import Base, Alert, Case, CaseComment, AlertCase, AuditLog
from .schemas import (
    HealthResponse,
    RunDemoRequest,
    RunDemoResponse,
    AlertsQuery,
    AlertListResponse,
    IngestRequest,
    IngestResponse,
    AlertBase,
    CaseCreate,
    CaseBase,
    CaseListResponse,
    CaseAssignRequest,
    CaseCommentRequest,
)
from .tasks import task_registry
from .ingest_integration import (
    generate_events_file,
    run_ingest_on_file,
    ensure_demo_alert_if_missing,
)
from .realtime import broadcaster
from .explanation import compute_explanation
try:
    from app.network_viz import create_network_visualizer
except Exception:  # pragma: no cover
    create_network_visualizer = None

settings = get_settings()


def _get_api_key_header(x_api_key: Optional[str] = Header(default=None)) -> None:
    if settings.API_KEY and x_api_key != settings.API_KEY:
        raise HTTPException(status_code=401, detail="Invalid API key")


app = FastAPI(title=settings.API_TITLE, version=settings.API_VERSION)

# CORS
origins = [o.strip() for o in settings.CORS_ORIGINS.split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins or ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def on_startup() -> None:
    # Ensure tables for SQLite/in-memory scenarios
    if settings.DATABASE_URL.startswith("sqlite"):
        Base.metadata.create_all(bind=engine)


@app.get("/api/health", response_model=HealthResponse)
async def health() -> HealthResponse:
    return HealthResponse(status="ok", version=settings.API_VERSION)


# Metrics (simple demo counters)
_metrics = {"eps": 0.0, "p50_ms": 0.0, "p95_ms": 0.0, "alerts_emitted": 0, "rules": {"cancel_to_order": 0, "otr_spikes": 0, "quote_stuffing": 0, "layering": 0, "wash_trades": 0}}

@app.get("/api/metrics")
async def metrics(auth: None = Depends(_get_api_key_header)):
    return _metrics


@app.post("/api/run_demo", response_model=RunDemoResponse)
async def run_demo(payload: RunDemoRequest, db: Session = Depends(get_db), auth: None = Depends(_get_api_key_header)) -> RunDemoResponse:
    task = await task_registry.create()

    async def _runner() -> None:
        try:
            await task_registry.set_status(task.id, "running")
            await task_registry.append_log(task.id, "Generating deterministic events...")
            events_path = f"{settings.RESULTS_DIR}/demo_run/events.jsonl"
            generate_events_file(
                scenario=payload.scenario,
                speed=payload.speed,
                duration=payload.duration,
                outpath=events_path,
                no_throttle=payload.no_throttle,
            )

            await task_registry.append_log(task.id, "Running ingest pipeline...")
            emitted = run_ingest_on_file(db, events_path, run_detector=True, anchor=True, no_throttle=payload.no_throttle, randomize_scores=payload.randomize_scores)

            if not emitted:
                await task_registry.append_log(task.id, "No alerts emitted; ensuring demo fallback...")
                ensure_demo_alert_if_missing(db)

            await task_registry.append_log(task.id, "Demo completed.")
            await task_registry.set_status(task.id, "completed")
            await task_registry.set_result(task.id, {"alerts_emitted": len(emitted)})
        except Exception as e:
            await task_registry.append_log(task.id, f"Error: {e}")
            await task_registry.set_status(task.id, "failed")
            await task_registry.set_error(task.id, str(e))

    asyncio.create_task(_runner())
    return RunDemoResponse(task_id=task.id, message="Task started")


@app.post("/api/demo/sebi_storyline")
async def sebi_storyline(db: Session = Depends(get_db), auth: None = Depends(_get_api_key_header)):
    task = await task_registry.create()

    async def _runner() -> None:
        try:
            await task_registry.set_status(task.id, "running")
            scenarios = [
                ("layering", 8.0, 10),
                ("wash_trade", 6.0, 10),
                ("custody_shuffle", 3.0, 8),
                ("benign", 4.0, 5),
            ]
            total = 0
            for scenario, speed, duration in scenarios:
                await task_registry.append_log(task.id, f"Running {scenario}...")
                events_path = f"{settings.RESULTS_DIR}/demo_run/events_{scenario}.jsonl"
                generate_events_file(scenario, speed, duration, events_path, no_throttle=True)
                emitted = run_ingest_on_file(db, events_path, run_detector=True, anchor=True, no_throttle=True, randomize_scores=False)
                total += len(emitted)
            await task_registry.append_log(task.id, f"SEBI storyline completed. Alerts: {total}")
            await task_registry.set_result(task.id, {"alerts_emitted": total})
            await task_registry.set_status(task.id, "completed")
        except Exception as e:
            await task_registry.append_log(task.id, f"Error: {e}")
            await task_registry.set_status(task.id, "failed")
            await task_registry.set_error(task.id, str(e))

    asyncio.create_task(_runner())
    return RunDemoResponse(task_id=task.id, message="SEBI storyline started")


@app.get("/api/alerts", response_model=AlertListResponse)
async def list_alerts(page: int = 1, page_size: int = 20, anchored: Optional[bool] = None, min_score: Optional[float] = None, db: Session = Depends(get_db), auth: None = Depends(_get_api_key_header)) -> AlertListResponse:
    q = db.query(Alert)
    if anchored is not None:
        q = q.filter(Alert.anchored == anchored)
    if min_score is not None:
        q = q.filter((Alert.score >= min_score))
    total = q.count()
    items = q.order_by(Alert.created_at.desc()).offset((page - 1) * page_size).limit(page_size).all()
    return AlertListResponse(total=total, items=[AlertBase(**a.to_dict()) for a in items])


@app.get("/api/alerts/{alert_id}", response_model=AlertBase)
async def get_alert(alert_id: str, db: Session = Depends(get_db), auth: None = Depends(_get_api_key_header)) -> AlertBase:
    a = db.query(Alert).filter_by(alert_id=alert_id).one_or_none()
    if a is None:
        raise HTTPException(status_code=404, detail="Alert not found")
    return AlertBase(**a.to_dict())


@app.get("/api/alerts/{alert_id}/explanation")
async def get_alert_explanation(alert_id: str, db: Session = Depends(get_db), auth: None = Depends(_get_api_key_header)):
    a = db.query(Alert).filter_by(alert_id=alert_id).one_or_none()
    if a is None:
        raise HTTPException(status_code=404, detail="Alert not found")
    exp = compute_explanation(a.to_dict())
    if exp is None:
        return JSONResponse({"status": "unavailable"}, status_code=501)
    return JSONResponse(exp)


@app.get("/api/alerts/{alert_id}/viz3d")
async def get_alert_viz3d(alert_id: str, db: Session = Depends(get_db), auth: None = Depends(_get_api_key_header)):
    a = db.query(Alert).filter_by(alert_id=alert_id).one_or_none()
    if a is None:
        raise HTTPException(status_code=404, detail="Alert not found")
    if create_network_visualizer is None:
        return JSONResponse({"status": "unavailable"}, status_code=501)
    # Attempt to build network data from evidence events
    try:
        import pandas as pd
        import json, os
        viz = create_network_visualizer()
        evpath = a.evidence_path
        accounts_df = pd.DataFrame([{ 'account_id': acc, 'cluster_score': 0.0 } for acc in []])
        transactions_df = pd.DataFrame(columns=['source_account','target_account','amount'])
        if evpath and os.path.exists(evpath):
            with open(evpath, 'r', encoding='utf-8') as f:
                evj = json.load(f)
            accounts = evj.get('accounts') or evj.get('cluster_accounts') or []
            # signals may contain cluster_score per account
            sigs = evj.get('contributing_signals') or {}
            rows = []
            for acc in accounts:
                cs = 0.0
                try:
                    cs = float((sigs.get(acc) or {}).get('network_cluster_score', 0.0))
                except Exception:
                    cs = 0.0
                rows.append({'account_id': acc, 'cluster_score': cs, 'transaction_volume': 0, 'transaction_count': 0})
            accounts_df = pd.DataFrame(rows)
            # build transactions from events
            evs = evj.get('events') or []
            tr = []
            for e in evs:
                if e.get('type') == 'trade':
                    b = (e.get('meta') or {}).get('buy_account') or e.get('buy_account')
                    s = (e.get('meta') or {}).get('sell_account') or e.get('sell_account')
                    amt = e.get('amount') or e.get('qty') or 0
                    if b and s:
                        tr.append({'source_account': b, 'target_account': s, 'amount': amt})
            transactions_df = pd.DataFrame(tr)
        network = viz.prepare_network_data(accounts_df, transactions_df)
        html = viz.create_3d_visualization(network) or "<div>Visualization unavailable</div>"
        return Response(content=html, media_type='text/html')
    except Exception as e:
        return JSONResponse({"status": "error", "message": str(e)}, status_code=500)


@app.get("/api/alerts/{alert_id}/verify_chain")
async def verify_chain(alert_id: str, db: Session = Depends(get_db), auth: None = Depends(_get_api_key_header)):
    import json, os, hashlib, hmac
    a = db.query(Alert).filter_by(alert_id=alert_id).one_or_none()
    if a is None or not a.evidence_path or not os.path.exists(a.evidence_path):
        raise HTTPException(status_code=404, detail="Evidence not found")
    chain_file = os.path.join('results', 'chain', 'hmac_chain.jsonl')
    if not os.path.exists(chain_file):
        return JSONResponse({"verified": False, "reason": "Chain file missing"}, status_code=404)
    with open(a.evidence_path, 'rb') as f:
        file_hash = hashlib.sha256(f.read()).hexdigest()
    rec = None
    with open(chain_file, 'r', encoding='utf-8') as cf:
        for line in cf:
            try:
                r = json.loads(line)
                if r.get('file') == a.evidence_path and r.get('file_hash') == file_hash:
                    rec = r
            except Exception:
                continue
    if not rec:
        return JSONResponse({"verified": False, "reason": "No matching chain record"}, status_code=404)
    secret = (settings.API_KEY or 'demo_key').encode()
    msg = (rec.get('prev_chain_hash','') + file_hash).encode()
    calc = hmac.new(secret, msg, hashlib.sha256).hexdigest()
    return {"verified": calc == rec.get('chain_hash'), "record": rec}

@app.post("/api/alerts/{alert_id}/download_pack")
async def download_pack(alert_id: str, db: Session = Depends(get_db), auth: None = Depends(_get_api_key_header)):
    a = db.query(Alert).filter_by(alert_id=alert_id).one_or_none()
    if a is None:
        raise HTTPException(status_code=404, detail="Alert not found")

    import io, zipfile, os

    mem = io.BytesIO()
    with zipfile.ZipFile(mem, mode="w", compression=zipfile.ZIP_DEFLATED) as zf:
        # Add JSON
        json_path = f"{settings.ALERTS_DIR}/{alert_id}.json"
        if os.path.exists(json_path):
            zf.write(json_path, arcname=f"{alert_id}.json")
        # Add narrative
        txt_path = f"{settings.ALERTS_DIR}/{alert_id}.txt"
        if os.path.exists(txt_path):
            zf.write(txt_path, arcname=f"{alert_id}.txt")
        # Add evidence
        if a.evidence_path and os.path.exists(a.evidence_path):
            zf.write(a.evidence_path, arcname=os.path.join("evidence", os.path.basename(a.evidence_path)))
    mem.seek(0)

    headers = {"Content-Disposition": f"attachment; filename={alert_id}_pack.zip"}
    return StreamingResponse(mem, media_type="application/zip", headers=headers)


@app.post("/api/ingest", response_model=IngestResponse)
async def api_ingest(payload: IngestRequest, db: Session = Depends(get_db), auth: None = Depends(_get_api_key_header)) -> IngestResponse:
    events_path = payload.events_jsonl_path or f"{settings.RESULTS_DIR}/demo_run/events.jsonl"
    emitted = run_ingest_on_file(db, events_path, run_detector=payload.run_detector, anchor=payload.anchor, no_throttle=payload.no_throttle, randomize_scores=payload.randomize_scores)
    if not emitted:
        ensure_demo_alert_if_missing(db)
    return IngestResponse(alerts_emitted=len(emitted))


# Case management endpoints
@app.post("/api/cases", response_model=CaseBase)
async def create_case(payload: CaseCreate, db: Session = Depends(get_db), auth: None = Depends(_get_api_key_header)) -> CaseBase:
    import uuid
    c = Case(case_id=f"CASE-{uuid.uuid4().hex[:8]}", title=payload.title, priority=payload.priority, assignee=payload.assignee)
    db.add(c)
    db.add(AuditLog(object_type="case", object_id=c.case_id, action="create", details={"title": c.title}))
    db.commit()
    return CaseBase(**c.to_dict())

@app.get("/api/cases", response_model=CaseListResponse)
async def list_cases(page: int = 1, page_size: int = 20, db: Session = Depends(get_db), auth: None = Depends(_get_api_key_header)) -> CaseListResponse:
    q = db.query(Case)
    total = q.count()
    items = q.order_by(Case.created_at.desc()).offset((page - 1) * page_size).limit(page_size).all()
    return CaseListResponse(total=total, items=[CaseBase(**c.to_dict()) for c in items])

@app.get("/api/cases/{case_id}")
async def get_case(case_id: str, db: Session = Depends(get_db), auth: None = Depends(_get_api_key_header)):
    c = db.query(Case).filter_by(case_id=case_id).one_or_none()
    if c is None:
        raise HTTPException(status_code=404, detail="Case not found")
    comments = [cc.to_dict() for cc in c.comments]
    links = [ {"alert_id": link.alert_id} for link in c.links]
    return {**c.to_dict(), "comments": comments, "links": links}

@app.post("/api/cases/{case_id}/assign", response_model=CaseBase)
async def assign_case(case_id: str, payload: CaseAssignRequest, db: Session = Depends(get_db), auth: None = Depends(_get_api_key_header)) -> CaseBase:
    c = db.query(Case).filter_by(case_id=case_id).one_or_none()
    if c is None:
        raise HTTPException(status_code=404, detail="Case not found")
    c.assignee = payload.assignee
    c.updated_at = datetime.utcnow()
    db.add(AuditLog(object_type="case", object_id=c.case_id, action="assign", details={"assignee": c.assignee}))
    db.commit()
    return CaseBase(**c.to_dict())

@app.post("/api/cases/{case_id}/comment")
async def comment_case(case_id: str, payload: CaseCommentRequest, db: Session = Depends(get_db), auth: None = Depends(_get_api_key_header)):
    c = db.query(Case).filter_by(case_id=case_id).one_or_none()
    if c is None:
        raise HTTPException(status_code=404, detail="Case not found")
    cc = CaseComment(case_id=c.id, author=payload.author, text=payload.text)
    db.add(cc)
    db.add(AuditLog(object_type="case", object_id=c.case_id, action="comment", details={"author": payload.author}))
    db.commit()
    return {"status": "ok"}

@app.post("/api/cases/{case_id}/link_alert/{alert_id}")
async def link_alert_to_case(case_id: str, alert_id: str, db: Session = Depends(get_db), auth: None = Depends(_get_api_key_header)):
    c = db.query(Case).filter_by(case_id=case_id).one_or_none()
    if c is None:
        raise HTTPException(status_code=404, detail="Case not found")
    link = AlertCase(case_id=c.id, alert_id=alert_id)
    db.add(link)
    db.add(AuditLog(object_type="case", object_id=c.case_id, action="link_alert", details={"alert_id": alert_id}))
    db.commit()
    return {"status": "ok"}

@app.get("/api/cases/{case_id}/report")
async def case_report(case_id: str, db: Session = Depends(get_db), auth: None = Depends(_get_api_key_header)):
    c = db.query(Case).filter_by(case_id=case_id).one_or_none()
    if c is None:
        raise HTTPException(status_code=404, detail="Case not found")
    alerts = db.query(Alert).join(AlertCase, AlertCase.alert_id == Alert.alert_id).filter(AlertCase.case_id == c.id).all()
    html = """
    <html><head><title>Case Report</title></head><body>
    <h1>Case {case_id} - {title}</h1>
    <p>Status: {status} | Priority: {priority} | Assignee: {assignee}</p>
    <h2>Linked Alerts</h2>
    <ul>{alerts}</ul>
    <h2>Audit Trail</h2>
    <ul>{audits}</ul>
    </body></html>
    """
    alert_items = "".join([f"<li>{a.alert_id} (score={a.score})</li>" for a in alerts])
    audits = db.query(AuditLog).filter_by(object_type="case", object_id=c.case_id).order_by(AuditLog.created_at.asc()).all()
    audit_items = "".join([f"<li>{al.created_at}: {al.action} {al.details}</li>" for al in audits])
    out = html.format(case_id=c.case_id, title=c.title, status=c.status, priority=c.priority, assignee=c.assignee or '-', alerts=alert_items, audits=audit_items)
    return Response(content=out, media_type='text/html')


@app.websocket("/ws/tasks/{task_id}")
async def ws_task_logs(websocket: WebSocket, task_id: str):
    await websocket.accept()
    try:
        # Simple polling of task logs
        last_len = 0
        while True:
            ts = await task_registry.get(task_id)
            if ts is None:
                await asyncio.sleep(0.5)
                continue
            new_logs = ts.logs[last_len:]
            for line in new_logs:
                await websocket.send_text(line)
            last_len = len(ts.logs)
            if ts.status in ("completed", "failed"):
                await websocket.send_text(f"STATUS:{ts.status}")
                break
            await asyncio.sleep(0.5)
    except WebSocketDisconnect:
        return


@app.websocket("/ws/realtime")
async def ws_realtime(websocket: WebSocket):
    await broadcaster.connect(websocket)
    try:
        while True:
            # Keep connection open; we don't expect client messages in this demo
            await asyncio.sleep(2.0)
    except WebSocketDisconnect:
        await broadcaster.disconnect(websocket)
        return

