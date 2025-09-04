#!/usr/bin/env python3
"""tools/federated_stubs.py

Small set of stubs to simulate federated update aggregation and lightweight signing.
Intended for demo purposes only (hackathon staging).
"""
from __future__ import annotations
import json, hashlib, hmac, time, os
from typing import List, Dict, Any, Optional

def aggregate_updates(updates: List[Dict[str, Any]]) -> Dict[str, Any]:
    if not updates:
        return {}
    keys = set()
    for u in updates:
        w = u.get('weights', {})
        keys.update(w.keys())
    agg = {'weights': {}, 'meta': {'count': len(updates), 'ts': time.time()}}
    for k in keys:
        vals = [u.get('weights',{}).get(k,0.0) for u in updates]
        agg['weights'][k] = sum(vals)/len(vals)
    return agg

def sign_model(model: Dict[str, Any], key: Optional[str] = None) -> str:
    payload = json.dumps(model, sort_keys=True).encode('utf-8')
    if key:
        return hmac.new(key.encode('utf-8'), payload, hashlib.sha256).hexdigest()
    else:
        return hashlib.sha256(payload).hexdigest()

def verify_signature(model: Dict[str, Any], signature: str, key: Optional[str] = None) -> bool:
    expected = sign_model(model, key=key)
    return expected == signature

def demo():
    print("Federated stubs demo")
    u1 = {'weights': {'w1': 0.1, 'w2': 0.2}, 'meta':{'node':'n1'}}
    u2 = {'weights': {'w1': 0.15, 'w2': 0.25}, 'meta':{'node':'n2'}}
    agg = aggregate_updates([u1,u2])
    sig = sign_model(agg, key='demo_key')
    print("AGGREGATED:", json.dumps(agg, indent=2))
    print("SIGNATURE:", sig)
    ok = verify_signature(agg, sig, key='demo_key')
    print("VERIFY:", ok)

if __name__ == '__main__':
    demo()
