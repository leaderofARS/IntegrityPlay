from __future__ import annotations
import asyncio
import json
import os
import subprocess
from pathlib import Path
from typing import Any, Dict, List, Optional

from sqlalchemy.orm import Session
import os, hmac, hashlib, time, random

from .config import get_settings
from .models import Alert
from .storage import storage

# Import app.ingest from repo
try:
    from app import ingest as app_ingest
except Exception as e:  # pragma: no cover
    app_ingest = None

settings = get_settings()


def _safe_int(x: Any, default: int) -> int:
    try:
        return int(x)
    except Exception:
        return default


def generate_events_file(scenario: str, speed: float, duration: int, outpath: str, no_throttle: bool = True) -> None:
    """Generate deterministic events using attack_simulator.py.

    Prefer direct import if available; fallback to subprocess.
    """
    script = Path("attack_simulator.py")
    if script.exists():
        try:
            # Attempt module import path execution
            import runpy
            args = [
                str(script),
                "--scenario", scenario,
                "--speed", str(speed),
                "--duration", str(duration),
                "--output", "file",
                "--outpath", outpath,
            ]
            if no_throttle:
                args.append("--no-throttle")
            # Fallback to subprocess to avoid assumptions about attack_simulator API
            subprocess.run(["python", *args], check=True)
            return
        except Exception:
            pass
    # Subprocess fallback
    cmd = [
        "python",
        "attack_simulator.py",
        "--scenario", scenario,
        "--speed", str(speed),
        "--duration", str(duration),
        "--output", "file",
        "--outpath", outpath,
    ]
    if no_throttle:
        cmd.append("--no-throttle")
    subprocess.run(cmd, check=True)


def run_ingest_on_file(db: Session, events_path: str, run_detector: bool = True, anchor: bool = True, no_throttle: bool = True, scan_interval: int = 2, randomize_scores: bool = False) -> List[Dict[str, Any]]:
    """Use the existing app.ingest.ingest_file_mode to process events and emit alerts.

    Returns the list of emitted alerts (dicts). Also persists them into the DB.
    """
    emitted: List[Dict[str, Any]] = []
    if app_ingest is None:
        return emitted
    try:
        emitted = app_ingest.ingest_file_mode(
            path=events_path,
            out_events_path=None,
            throttle=not no_throttle,
            speed=5.0,
            run_detector=run_detector,
            detector_threshold=0.6,
            scan_interval=scan_interval,
            anchor=anchor,
            once=False,
            verbose=False,
        )
    except Exception as e:  # pragma: no cover
        emitted = []

    # Randomize scores if requested
    if randomize_scores:
        for a in emitted:
            r = random.random()
            a['score'] = r
            a['cluster_score'] = r

    # Persist alerts to DB
    from .realtime import broadcaster  # local import to avoid circular on module import
    for a in emitted:
        alert_id = a.get("alert_id") or a.get("id") or ""
        evidence_path = a.get("evidence_path")
        rule_flags = a.get("rule_flags") or {}
        signals = a.get("signals") or {}
        # robust score extraction
        score = a.get("score")
        if score is None:
            score = a.get("cluster_score")
        if score is None:
            score = a.get("alert_score")
        if score is None:
            try:
                pac = a.get("per_account_scores") or {}
                if isinstance(pac, dict) and pac:
                    vals = list(pac.values())
                    mx = max(vals)
                    mn = sum(vals) / len(vals)
                    score = mx * 0.7 + mn * 0.3
            except Exception:
                score = None
        try:
            if score is not None:
                score = float(score)
        except Exception:
            score = None
        anchored = bool(a.get("anchored", False))
        if not alert_id:
            continue
        if evidence_path and os.path.exists(evidence_path):
            storage.put_file(evidence_path)
            try:
                _append_hmac_chain(evidence_path)
            except Exception:
                pass
        obj = Alert(
            alert_id=alert_id,
            score=score,
            anchored=anchored,
            evidence_path=evidence_path,
            rule_flags=rule_flags,
            signals=signals,
        )
        # Upsert-like behavior: if exists, update score if missing
        existing = db.query(Alert).filter_by(alert_id=alert_id).one_or_none()
        if existing is None:
            db.add(obj)
            db.commit()
            # broadcast newly created alert to websocket clients
            try:
                import asyncio
                asyncio.create_task(broadcaster.broadcast_alert(obj.to_dict()))
            except Exception:
                pass
        else:
            # update score and metadata if missing
            updated = False
            if existing.score is None and score is not None:
                existing.score = score
                updated = True
            if (existing.rule_flags or {}) != (rule_flags or {}):
                existing.rule_flags = rule_flags
                updated = True
            if (existing.signals or {}) != (signals or {}):
                existing.signals = signals
                updated = True
            if updated:
                db.commit()
                try:
                    import asyncio
                    asyncio.create_task(broadcaster.broadcast_alert(existing.to_dict()))
                except Exception:
                    pass
    # Update demo metrics (naive)
    try:
        from .main import _metrics
        now = time.time()
        # simulate eps ~ emitted per second over small window
        _metrics['alerts_emitted'] = _metrics.get('alerts_emitted', 0) + len(emitted)
        _metrics['eps'] = round(5.0 + random.random() * 10.0, 2)
        _metrics['p50_ms'] = round(40 + random.random() * 30, 1)
        _metrics['p95_ms'] = round(90 + random.random() * 120, 1)
    except Exception:
        pass

    return emitted


def _append_hmac_chain(file_path: str):
    chain_dir = os.path.join('results', 'chain')
    os.makedirs(chain_dir, exist_ok=True)
    chain_file = os.path.join(chain_dir, 'hmac_chain.jsonl')
    secret = (os.getenv('API_KEY') or 'demo_key').encode()

    with open(file_path, 'rb') as f:
        content = f.read()
    file_hash = hashlib.sha256(content).hexdigest()

    prev_hash = ''
    if os.path.exists(chain_file):
        try:
            with open(chain_file, 'rb') as cf:
                last = None
                for line in cf:
                    if line.strip():
                        last = line
                if last:
                    import json as _json
                    prev_hash = _json.loads(last.decode()).get('chain_hash', '')
        except Exception:
            prev_hash = ''

    msg = (prev_hash + file_hash).encode()
    mac = hmac.new(secret, msg, hashlib.sha256).hexdigest()

    import json as _json
    rec = {
        'file': file_path,
        'file_hash': file_hash,
        'prev_chain_hash': prev_hash,
        'chain_hash': mac,
        'ts': time.time()
    }
    with open(chain_file, 'a', encoding='utf-8') as cf:
        cf.write(_json.dumps(rec) + '\n')


def ensure_demo_alert_if_missing(db: Session) -> Dict[str, Any]:
    """Create ALERT-DEMO-001 artifacts and DB row if none exist."""
    alerts_dir = Path(settings.ALERTS_DIR)
    alerts_dir.mkdir(parents=True, exist_ok=True)
    json_path = alerts_dir / "ALERT-DEMO-001.json"
    txt_path = alerts_dir / "ALERT-DEMO-001.txt"

    if json_path.exists():
        # If already exists, ensure DB row
        data = {}
        try:
            with open(json_path, "r", encoding="utf-8") as f:
                data = json.load(f)
        except Exception:
            data = {"alert_id": "ALERT-DEMO-001", "score": 0.73}
        if db.query(Alert).filter_by(alert_id="ALERT-DEMO-001").count() == 0:
            db.add(Alert(alert_id="ALERT-DEMO-001", score=float(data.get("score", 0.73)), anchored=True, evidence_path=data.get("evidence_path"), rule_flags=data.get("rule_flags") or {}, signals=data.get("signals") or {}))
            db.commit()
        return data

    # Assemble a minimal demo alert
    ev_path = Path(settings.EVIDENCE_DIR) / "sample_evidence_001.json"
    data = {
        "alert_id": "ALERT-DEMO-001",
        "score": 0.73,
        "accounts": ["ACC-W1", "ACC-W2"],
        "evidence_path": str(ev_path) if ev_path.exists() else None,
        "rule_flags": {"ACC-W1": {"suspicious": True, "reasons": ["wash-trade pattern"]}},
        "signals": {"volume_spike": 2.1, "reciprocal_trades": 5},
    }
    alerts_dir.mkdir(parents=True, exist_ok=True)
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)
    with open(txt_path, "w", encoding="utf-8") as f:
        f.write("IntegrityPlay Demo Narrative\n\n" + "Wash-trade behavior detected between ACC-W1 and ACC-W2.\n")

    # Persist DB row
    db.add(
        Alert(
            alert_id="ALERT-DEMO-001",
            score=0.73,
            anchored=True,
            evidence_path=str(ev_path) if ev_path.exists() else None,
            rule_flags=data["rule_flags"],
            signals=data["signals"],
        )
    )
    db.commit()
    return data

