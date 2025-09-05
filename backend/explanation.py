from __future__ import annotations
from typing import Any, Dict, Optional
import json
import os

try:
    from app.explainable_ai import create_explainer
except Exception:  # pragma: no cover
    create_explainer = None


def _aggregate_features_from_signals(contributing_signals: Dict[str, Dict[str, float]]) -> Dict[str, float]:
    """Aggregate per-account signals into a single feature vector.

    Simple heuristic: take mean across accounts for numeric features.
    """
    accs = list(contributing_signals.values())
    if not accs:
        return {}
    keys = set()
    for d in accs:
        keys.update([k for k, v in d.items() if isinstance(v, (int, float)) and not str(k).startswith('_')])
    out: Dict[str, float] = {}
    for k in keys:
        vals = [float(d.get(k, 0.0)) for d in accs]
        out[k] = sum(vals) / max(1, len(vals))
    return out


def compute_explanation(alert: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    if create_explainer is None:
        return None
    try:
        evpath = alert.get("evidence_path")
        contributing_signals: Dict[str, Dict[str, float]] = {}
        if evpath and os.path.exists(evpath):
            with open(evpath, "r", encoding="utf-8") as f:
                evj = json.load(f)
                contributing_signals = evj.get("contributing_signals") or {}
        # fallback: try alert.signals if not found
        if not contributing_signals:
            contributing_signals = alert.get("signals") or {}
        features = _aggregate_features_from_signals(contributing_signals)
        explainer = create_explainer()
        explanation = explainer.explain_alert(
            {"alert_id": alert.get("alert_id", "")},
            features,
        )
        return explanation.to_dict()
    except Exception:
        return None
