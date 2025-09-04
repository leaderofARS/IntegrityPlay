#!/usr/bin/env python3
"""
attack_simulator.py

Deterministic event generator for IntegrityPlay demo runner.

Usage (compatible with scripts/run_demo.sh):
  python3 attack_simulator.py --scenario wash_trade --speed 5 --duration 20 --output file --outpath results/demo_run/events.jsonl [--no-throttle]

Features:
  - Multiple scenarios: wash_trade, layering, custody_shuffle, benign
  - Produces JSONL (one event per line) with fields compatible with app.detector
  - Deterministic (seeded) for reproducible demo runs
  - Lightweight, zero external dependencies
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

# ------------------ Helpers ------------------

def iso(ts: datetime) -> str:
    # produce ISO8601 UTC with Z
    return ts.replace(tzinfo=timezone.utc).isoformat().replace("+00:00", "Z")

def deterministic_seed(s: str) -> int:
    return int(hashlib.sha256(s.encode("utf-8")).hexdigest()[:16], 16) % (2**32)

def ensure_dir(path: str):
    d = os.path.dirname(path)
    if d and not os.path.exists(d):
        os.makedirs(d, exist_ok=True)

# ------------------ Scenario generators ------------------

def gen_wash_trade(base_ts: datetime, event_count: int, speed: float) -> List[Dict[str, Any]]:
    """Generate a sequence that simulates wash trades between colluding accounts."""
    events = []
    # colluding accounts and instrument
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
            # A places a buy order
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
            # B places a sell order matching that buy
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
            # trade occurs matching previous two orders
            # pick last two order refs from events
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
            # occasionally an immediate cancel to create noise
            # pick a recent order and cancel it quickly
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
                # fallback: a custody shuffle to add graph edges
                ev = {
                    "type": "custody_transfer",
                    "meta": {"from": acct_b, "to": acct_a},
                    "instrument": inst,
                    "ts": iso(t)
                }
                events.append(ev)
    return events

def gen_layering(base_ts: datetime, event_count: int, speed: float) -> List[Dict[str, Any]]:
    """Generate a layering style scenario: many orders and cancels to manipulate book depth."""
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
            # cancel recent order quickly (layering)
            candidate = None
            for e in reversed(events):
                if e.get("type") == "order" and random.random() < 0.7:
                    candidate = e; break
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
                # small trade to move market occasionally
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
        # sometimes add a trade to link accounts
        if random.random() < 0.3:
            ev2 = {
                "type": "trade",
                "meta": {"buy_account": frm, "sell_account": to},
                "instrument": inst,
                "qty": int(random.choice([5,20,50])),
                "ts": iso(t + timedelta(seconds=0.1))
            }
            events.append(ev2)
    return events

def gen_benign(base_ts: datetime, event_count: int, speed: float) -> List[Dict[str, Any]]:
    events = []
    accounts = [f"ACC-B{i}" for i in range(1,20)]
    insts = ["AAA","BBB","CCC","DDD"]
    step = 1.0 / max(1.0, speed)
    order_counter = 0
    for i in range(event_count):
        t = base_ts + timedelta(seconds=i * step)
        r = random.random()
        acct = random.choice(accounts)
        inst = random.choice(insts)
        if r < 0.5:
            order_counter += 1
            ev = {
                "type": "order",
                "order_ref": f"ORD-B-{order_counter:06d}",
                "account": acct,
                "instrument": inst,
                "side": random.choice(["buy","sell"]),
                "qty": int(random.choice([10,20,50,100])),
                "ts": iso(t)
            }
            events.append(ev)
        elif r < 0.8:
            # trade between two different accounts
            buy = acct
            sell = random.choice([a for a in accounts if a != buy])
            ev = {
                "type": "trade",
                "meta": {"buy_account": buy, "sell_account": sell},
                "instrument": inst,
                "qty": int(random.choice([10,20,50])),
                "ts": iso(t)
            }
            events.append(ev)
        else:
            # cancel occasionally
            candidate = None
            for e in reversed(events):
                if e.get("type") == "order":
                    candidate = e; break
            if candidate:
                ev = {
                    "type": "cancel",
                    "order_ref": candidate.get("order_ref"),
                    "account": candidate.get("account"),
                    "ts": iso(t + timedelta(seconds=0.5))
                }
                events.append(ev)
    return events

# ------------------ Orchestrator ------------------

SCENARIOS = {
    "wash_trade": gen_wash_trade,
    "layering": gen_layering,
    "custody_shuffle": gen_custody_shuffle,
    "benign": gen_benign
}

def generate_events(scenario: str, duration: int, speed: float, deterministic_name: str = "") -> List[Dict[str,Any]]:
    # derive count from duration*speed (minimum 10)
    count = max(10, int(duration * max(1.0, speed)))
    # deterministic seed for reproducibility
    seed_input = f"{scenario}:{duration}:{speed}:{deterministic_name}"
    random.seed(deterministic_seed(seed_input))
    base_ts = datetime(2025, 9, 4, 0, 0, 0, tzinfo=timezone.utc)  # fixed anchor for reproducibility
    gen = SCENARIOS.get(scenario, gen_benign)
    events = gen(base_ts, count, speed)
    # ensure events sorted by ts
    events_sorted = sorted(events, key=lambda e: e.get("ts") or "")
    return events_sorted

def write_jsonl(events: List[Dict[str,Any]], outpath: str):
    ensure_dir(outpath)
    with open(outpath, "w", encoding="utf-8") as f:
        for ev in events:
            f.write(json.dumps(ev, ensure_ascii=False) + "\n")
    print(f"WROTE: {outpath} (events: {len(events)})")

# ------------------ CLI ------------------

def parse_args():
    p = argparse.ArgumentParser(description="Deterministic attack event simulator for IntegrityPlay demo")
    p.add_argument("--scenario", default="wash_trade", choices=list(SCENARIOS.keys()), help="Scenario to generate")
    p.add_argument("--speed", type=float, default=5.0, help="Events per second (used to space timestamps)")
    p.add_argument("--duration", type=int, default=20, help="Virtual duration in seconds (affects total events)")
    p.add_argument("--output", choices=["file","stdout"], default="file", help="Where to write events")
    p.add_argument("--outpath", default="results/demo_run/events.jsonl", help="Output file path for JSONL when --output file")
    p.add_argument("--det-name", default="", help="Deterministic name salt (optional) to vary seed)")
    p.add_argument("--no-throttle", action="store_true", help="If set, simulator does not sleep when used interactively (not relevant for file output)")
    return p.parse_args()

def main():
    args = parse_args()
    events = generate_events(args.scenario, args.duration, args.speed, deterministic_name=args.det_name)
    if args.output == "file":
        write_jsonl(events, args.outpath)
    else:
        for ev in events:
            print(json.dumps(ev, ensure_ascii=False))

if __name__ == "__main__":
    main()
