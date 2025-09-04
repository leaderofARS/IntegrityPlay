#!/usr/bin/env python3
"""app/narrative.py

Human-friendly narrative generator for alerts.
Produces investigator-ready plain-text summaries that accompany evidence packs.
"""
from __future__ import annotations
from typing import Dict, Any, List

def _top_reasons_from_signals(signals: Dict[str, Dict[str, float]], top_n: int = 3) -> List[str]:
    ranked = []
    for acct, s in (signals or {}).items():
        keys = [k for k in s.keys() if not k.startswith('_')]
        if not keys:
            continue
        top_key = max(keys, key=lambda k: float(s.get(k, 0.0)))
        ranked.append((acct, top_key, float(s.get(top_key, 0.0))))
    ranked_sorted = sorted(ranked, key=lambda x: x[2], reverse=True)
    reasons = [f"{acct}: {sig}={val}" for acct, sig, val in ranked_sorted[:top_n]]
    return reasons

def generate_alert_text(alert: Dict[str, Any], signals_map: Dict[str, Dict[str, float]]) -> str:
    aid = alert.get("alert_id") or alert.get("id") or "UNKNOWN"
    created = alert.get("created_at") or "unknown time"
    cluster_seed = alert.get("cluster_seed", "<unknown>")
    score = alert.get("cluster_score") or alert.get("alert_score") or 0.0

    header = f"Alert {aid} — score={score} — seed={cluster_seed}\nGenerated: {created}\n"
    header += "=" * 72 + "\n\n"

    reasons = _top_reasons_from_signals(signals_map or {}, top_n=5)
    if reasons:
        reason_text = "Primary contributing signals (top accounts):\n" + "\n".join([f" - {r}" for r in reasons]) + "\n\n"
    else:
        reason_text = "No strong signal highlights available. See contributing_signals in evidence pack.\n\n"

    narrative = alert.get("narrative") or "Chronology available in evidence pack."

    actions = (
        "Recommended next steps:\n"
        "  1) Triage: prioritize accounts in the cluster_accounts list by per_account_scores in the alert.\n"
        "  2) Replay: use results/demo_run/events.jsonl to replay the event sequence for these accounts.\n"
        "  3) Preserve: anchor evidence (anchored file path available next to evidence JSON).\n"
        "  4) Investigate custody flows and off-exchange transfers.\n\n"
    )

    footer = "For regulator use: attach the evidence JSON and anchored proof when escalating.\n"

    text = header + reason_text + "Narrative:\n" + narrative + "\n\n" + actions + footer
    return text


def write_alert_summary(alert: Dict[str, Any], signals_map: Dict[str, Dict[str,float]], outpath: str):
    import os
    try:
        os.makedirs(os.path.dirname(outpath) or '.', exist_ok=True)
        with open(outpath, "w", encoding="utf-8") as f:
            f.write(generate_alert_text(alert, signals_map))
    except Exception as e:
        print("WARN: failed to write alert summary:", e)
