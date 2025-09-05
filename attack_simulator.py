#!/usr/bin/env python3
"""
IntegrityPlay Market Attack Simulator
====================================

Generates synthetic financial market events for testing fraud detection algorithms.
Produces deterministic, reproducible trading scenarios including wash trades,
layering attacks, custody shuffles, and benign trading patterns.

Technical Architecture:
- Event-based simulation with ISO 8601 timestamps
- Multiple account interactions with realistic timing
- JSONL output format compatible with detection pipeline
- Seeded randomization for reproducible results
- Zero external dependencies for lightweight deployment

Generated Event Types:
- order: Buy/sell order placement with account, instrument, quantity
- cancel: Order cancellation with timing analysis
- trade: Matched trades between accounts with order references
- custody_transfer: Asset transfers between custodial accounts

Scenario Types:
- wash_trade: Coordinated trading between colluding accounts to inflate volume
- layering: Rapid order placement/cancellation to manipulate market depth
- custody_shuffle: Suspicious asset transfers to obscure beneficial ownership
- benign: Normal trading patterns for baseline comparison

Output Format:
JSONL (one JSON object per line) containing event data with:
- Consistent field naming for detector compatibility
- ISO 8601 UTC timestamps with Z suffix
- Account identifiers, instrument codes, quantities
- Relational data linking orders to trades

Usage:
python attack_simulator.py --scenario wash_trade --speed 10 --duration 60
"""

from __future__ import annotations
import argparse
import json
import os
import sys
import time
import math
import random
import hashlib
from datetime import datetime, timedelta, timezone
from typing import List, Dict, Any

def iso(ts: datetime) -> str:
    return ts.replace(tzinfo=timezone.utc).isoformat().replace("+00:00", "Z")

def deterministic_seed(s: str) -> int:
    return int(hashlib.sha256(s.encode("utf-8")).hexdigest()[:16], 16) % (2**32)

def ensure_dir(path: str):
    d = os.path.dirname(path)
    if d and not os.path.exists(d):
        os.makedirs(d, exist_ok=True)

def gen_wash_trade(base_ts: datetime, event_count: int, speed: float) -> List[Dict[str, Any]]:
    events = []
    acct_a = "ACC-W1"
    acct_b = "ACC-W2"
    inst = "XYZ"
    qty = 100
    step = 1.0 / max(1.0, speed)
    order_seq = 0

    for i in range(event_count):
        t = base_ts + timedelta(seconds=i * step)
        cycle = i % 4
        if cycle == 0:
            order_seq += 1
            ord_ref = f"ORD-W-{order_seq:04d}"
            ev = {
                "type": "order",
                "order_ref": ord_ref,
                "account": acct_a,
                "instrument": inst,
                "side": "buy",
                "qty": qty,
                "ts": iso(t)
            }
            events.append(ev)
        elif cycle == 1:
            order_seq += 1
            ord_ref = f"ORD-W-{order_seq:04d}"
            ev = {
                "type": "order",
                "order_ref": ord_ref,
                "account": acct_b,
                "instrument": inst,
                "side": "sell",
                "qty": qty,
                "ts": iso(t)
            }
            events.append(ev)
        elif cycle == 2:
            buy_ref = None
            sell_ref = None
            for e in reversed(events):
                if e.get("type") == "order":
                    if e.get("side") == "sell" and sell_ref is None:
                        sell_ref = e.get("order_ref")
                    elif e.get("side") == "buy" and buy_ref is None:
                        buy_ref = e.get("order_ref")
                    if buy_ref and sell_ref:
                        break
            ev = {
                "type": "trade",
                "meta": {"buy_account": acct_a, "sell_account": acct_b},
                "instrument": inst,
                "qty": qty,
                "ts": iso(t),
                "related_to": {"buy_order": buy_ref, "sell_order": sell_ref}
            }
            events.append(ev)
        else:
            candidate = None
            for e in reversed(events):
                if e.get("type") == "order" and random.random() < 0.6:
                    candidate = e
                    break
            if candidate:
                delta = 0.1 if random.random() < 0.7 else 2.5
                cancel_ts = t + timedelta(seconds=delta)
                ev = {
                    "type": "cancel",
                    "order_ref": candidate.get("order_ref"),
                    "account": candidate.get("account"),
                    "ts": iso(cancel_ts)
                }
                events.append(ev)
            else:
                ev = {
                    "type": "custody_transfer",
                    "meta": {"from": acct_b, "to": acct_a},
                    "instrument": inst,
                    "ts": iso(t)
                }
                events.append(ev)
    return events

def gen_layering(base_ts: datetime, event_count: int, speed: float) -> List[Dict[str, Any]]:
    events = []
    accounts = [f"ACC-L{i}" for i in range(1,5)]
    insts = ["AAA","BBB","CCC"]
    step = 1.0 / max(1.0, speed)
    order_counter = 0
    for i in range(event_count):
        t = base_ts + timedelta(seconds=i * step)
        acct = random.choice(accounts)
        inst = random.choice(insts)
        r = random.random()
        if r < 0.6:
            order_counter += 1
            ev = {
                "type": "order",
                "order_ref": f"ORD-L-{order_counter:05d}",
                "account": acct,
                "instrument": inst,
                "side": random.choice(["buy","sell"]),
                "qty": int(random.choice([10,50,100,200])),
                "ts": iso(t)
            }
            events.append(ev)
        else:
            candidate = None
            for e in reversed(events):
                if e.get("type") == "order" and random.random() < 0.7:
                    candidate = e
                    break
            if candidate:
                cancel_ts = t + timedelta(seconds=random.choice([0.2, 0.5, 1.5]))
                ev = {
                    "type": "cancel",
                    "order_ref": candidate.get("order_ref"),
                    "account": candidate.get("account"),
                    "ts": iso(cancel_ts)
                }
                events.append(ev)
            else:
                ev = {
                    "type": "trade",
                    "meta": {"buy_account": acct, "sell_account": random.choice(accounts)},
                    "instrument": inst,
                    "qty": 10,
                    "ts": iso(t)
                }
                events.append(ev)
    return events

def gen_custody_shuffle(base_ts: datetime, event_count: int, speed: float) -> List[Dict[str, Any]]:
    events = []
    accounts = [f"ACC-C{i}" for i in range(1,8)]
    insts = ["XYZ","LMN","QRS"]
    step = 1.0 / max(1.0, speed)
    for i in range(event_count):
        t = base_ts + timedelta(seconds=i * step)
        frm = random.choice(accounts)
        to = random.choice([a for a in accounts if a != frm])
        inst = random.choice(insts)
        ev = {
            "type": "custody_transfer",
            "meta": {"from": frm, "to": to},
            "instrument": inst,
            "ts": iso(t)
        }
        events.append(ev)
    return events

def gen_benign(base_ts: datetime, event_count: int, speed: float) -> List[Dict[str, Any]]:
    events = []
    accounts = [f"ACC-B{i}" for i in range(1,6)]
    insts = ["STOCK1","STOCK2","BOND1"]
    step = 1.0 / max(1.0, speed)
    order_counter = 0
    
    for i in range(event_count):
        t = base_ts + timedelta(seconds=i * step)
        acct = random.choice(accounts)
        inst = random.choice(insts)
        r = random.random()
        
        if r < 0.4:
            order_counter += 1
            ev = {
                "type": "order",
                "order_ref": f"ORD-B-{order_counter:05d}",
                "account": acct,
                "instrument": inst,
                "side": random.choice(["buy","sell"]),
                "qty": int(random.choice([50,100,500,1000])),
                "ts": iso(t)
            }
            events.append(ev)
        elif r < 0.7:
            recent_orders = [e for e in reversed(events[-20:]) if e.get("type") == "order"]
            if recent_orders and random.random() < 0.3:
                candidate = random.choice(recent_orders)
                cancel_ts = t + timedelta(seconds=random.uniform(10, 300))
                ev = {
                    "type": "cancel",
                    "order_ref": candidate.get("order_ref"),
                    "account": candidate.get("account"),
                    "ts": iso(cancel_ts)
                }
                events.append(ev)
        else:
            buy_acct = acct
            sell_acct = random.choice([a for a in accounts if a != buy_acct])
            ev = {
                "type": "trade",
                "meta": {"buy_account": buy_acct, "sell_account": sell_acct},
                "instrument": inst,
                "qty": int(random.choice([25,100,250])),
                "ts": iso(t)
            }
            events.append(ev)
    
    return events

def main():
    parser = argparse.ArgumentParser(description="Generate synthetic market events for fraud detection testing")
    parser.add_argument("--scenario", choices=["wash_trade", "layering", "custody_shuffle", "benign"], 
                        default="wash_trade", help="Type of scenario to generate")
    parser.add_argument("--speed", type=float, default=5.0, help="Events per second")
    parser.add_argument("--duration", type=int, default=20, help="Duration in seconds")
    parser.add_argument("--output", choices=["stdout", "file"], default="stdout", help="Output destination")
    parser.add_argument("--outpath", default="events.jsonl", help="Output file path")
    parser.add_argument("--det-name", default="demo", help="Deterministic name for seeding")
    parser.add_argument("--no-throttle", action="store_true", help="Disable output throttling")
    
    args = parser.parse_args()
    
    random.seed(deterministic_seed(f"{args.scenario}-{args.det_name}"))
    
    base_ts = datetime.now(timezone.utc).replace(microsecond=0)
    event_count = int(args.speed * args.duration)
    
    if args.scenario == "wash_trade":
        events = gen_wash_trade(base_ts, event_count, args.speed)
    elif args.scenario == "layering":
        events = gen_layering(base_ts, event_count, args.speed)
    elif args.scenario == "custody_shuffle":
        events = gen_custody_shuffle(base_ts, event_count, args.speed)
    elif args.scenario == "benign":
        events = gen_benign(base_ts, event_count, args.speed)
    
    if args.output == "file":
        ensure_dir(args.outpath)
        with open(args.outpath, "w", encoding="utf-8") as f:
            for ev in events:
                f.write(json.dumps(ev, ensure_ascii=False) + "\n")
        print(f"WROTE: {args.outpath} (events: {len(events)})")
    else:
        for ev in events:
            print(json.dumps(ev, ensure_ascii=False))
            if not args.no_throttle:
                time.sleep(1.0 / max(1.0, args.speed))

if __name__ == "__main__":
    main()
