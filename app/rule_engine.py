#!/usr/bin/env python3
"""app/rule_engine.py

Small, deterministic rule engine to produce explainable rule-level flags for alerts.
Used to augment ML/rule hybrid scoring with plain, auditable triggers.
"""
from __future__ import annotations
from typing import Dict, Any, Tuple, List

# Default thresholds (opinionated for demo)
THRESHOLDS = {
    "immediate_cancel_ratio": 0.4,
    "round_trip_rate": 0.15,
    "beneficiary_churn": 0.6,
    "network_cluster_score": 0.35,
    "trade_to_order_ratio": 2.0,
    "_ml_anomaly": 0.6
}

def evaluate_signals(signals: Dict[str, Any], thresholds: Dict[str, float] = None) -> Tuple[bool, List[str]]:
    if thresholds is None:
        thresholds = THRESHOLDS
    reasons = []
    s = signals or {}
    # primary rule checks
    for key, th in thresholds.items():
        if key.startswith('_'):
            val = float(s.get(key, 0.0))
            if key == "_ml_anomaly" and val >= th:
                reasons.append(f"ML anomaly >= {th} (val={val})")
            continue
        val = float(s.get(key, 0.0))
        if val >= th:
            reasons.append(f"{key} >= {th} (val={val})")

    # composite heuristic
    try:
        if float(s.get("immediate_cancel_ratio",0)) >= thresholds["immediate_cancel_ratio"] and \
           float(s.get("round_trip_rate",0)) >= thresholds["round_trip_rate"] and \
           float(s.get("cluster_size",0)) <= 3:
            reasons.append("Composite: immediate cancels + round-trips in very small cluster -> likely wash/laddering")
    except Exception:
        pass

    is_suspicious = len(reasons) > 0
    return is_suspicious, reasons
