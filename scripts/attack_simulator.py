#!/usr/bin/env python3
"""
attack_simulator.py

Deterministic attack/event simulator for market-abuse scenarios.
Generates JSON-lines (one event per line) to stdout or to a file for easy ingestion by your demo pipeline.
Designed for hackathon reproducibility and deterministic playback.

Scenarios implemented:
 - wash_trade
 - layering
 - spoofing
 - circular_trading

Usage examples:
  python3 attack_simulator.py --scenario wash_trade --speed 5 --duration 60 --output stdout --seed 42
  python3 attack_simulator.py --scenario layering --speed 10 --duration 30 --output file --outpath /tmp/events.jsonl
  python3 attack_simulator.py --scenario spoofing --speed 2 --duration 120 --output stdout

Options:
  --scenario   scenario name (wash_trade | layering | spoofing | circular_trading)
  --speed      events per second (int)
  --duration   duration in seconds (int)
  --output     output mode: stdout | file
  --outpath    file path when output=file (default: ./sim_events.jsonl)
  --seed       randomness seed for reproducibility (default: 1337)

Event schema (JSON):
  {
    "event_id": "UUID",
    "ts": "ISO8601 UTC",
    "type": "order|cancel|trade|custody_transfer|account_update",
    "instrument": "ABC",
    "account": "ACC-1",
    "side": "buy|sell|",
    "qty": 1000,
    "price": 100.5,
    "order_ref": "ORD-xxx",
    "related_to": "ORD-yyy or TRADE-zzz or null",
    "meta": { ... scenario-specific metadata ... }
  }

This script avoids external dependencies so judges can run it locally quickly.
"""

import argparse
import json
import time
import uuid
import random
from datetime import datetime, timedelta

def iso_ts(base_time, seconds_offset):
    return (base_time + timedelta(seconds=seconds_offset)).isoformat() + "Z"

def make_order(event_id, ts, instrument, account, side, qty, price, order_ref):
    return {
        "event_id": event_id,
        "ts": ts,
        "type": "order",
        "instrument": instrument,
        "account": account,
        "side": side,
        "qty": qty,
        "price": price,
        "order_ref": order_ref,
        "related_to": None,
        "meta": {}
    }

def make_cancel(event_id, ts, instrument, account, order_ref, reason="user_cancel"):
    return {
        "event_id": event_id,
        "ts": ts,
        "type": "cancel",
        "instrument": instrument,
        "account": account,
        "side": None,
        "qty": None,
        "price": None,
        "order_ref": order_ref,
        "related_to": order_ref,
        "meta": {"reason": reason}
    }

def make_trade(event_id, ts, instrument, buy_account, sell_account, qty, price, buy_order_ref, sell_order_ref):
    return {
        "event_id": event_id,
        "ts": ts,
        "type": "trade",
        "instrument": instrument,
        "account": None,
        "side": None,
        "qty": qty,
        "price": price,
        "order_ref": None,
        "related_to": {"buy_order": buy_order_ref, "sell_order": sell_order_ref},
        "meta": {"buy_account": buy_account, "sell_account": sell_account}
    }

def make_custody_transfer(event_id, ts, from_account, to_account, instrument, qty):
    return {
        "event_id": event_id,
        "ts": ts,
        "type": "custody_transfer",
        "instrument": instrument,
        "account": None,
        "side": None,
        "qty": qty,
        "price": None,
        "order_ref": None,
        "related_to": None,
        "meta": {"from": from_account, "to": to_account}
    }

# ---------------- SCENARIOS ----------------

def scenario_wash_trade(base_time, speed, duration, cfg):
    """
    Two accounts controlled by same entity self-trade through rapid buy/sell matching.
    Produces immediate cancels, small fills, and repeated patterns.
    """
    events = []
    # deterministically chosen identifiers
    instrument = cfg.get("instrument", "ABC")
    maker = "ACC-WASH-MAKER"
    taker = "ACC-WASH-TAKER"
    price = cfg.get("base_price", 100.00)
    seconds = 0
    order_counter = 0

    while seconds < duration:
        # create a buy order from maker
        order_counter += 1
        buy_ref = f"ORD-W-{order_counter:04d}"
        e1 = make_order(str(uuid.uuid4()), iso_ts(base_time, seconds), instrument, maker, "buy", 100, price, buy_ref)
        events.append(e1)

        # immediate cancel or trade depending on deterministic pattern
        if order_counter % 3 == 0:
            # force a trade between maker and taker
            sell_ref = f"ORD-T-{order_counter:04d}"
            e2 = make_order(str(uuid.uuid4()), iso_ts(base_time, seconds + 0.1), instrument, taker, "sell", 100, price, sell_ref)
            e3 = make_trade(str(uuid.uuid4()), iso_ts(base_time, seconds + 0.2), instrument, maker, taker, 100, price, buy_ref, sell_ref)
            events.extend([e2, e3])
        else:
            # cancel the buy
            e2 = make_cancel(str(uuid.uuid4()), iso_ts(base_time, seconds + 0.05), instrument, maker, buy_ref, reason="immediate_cancel")
            events.append(e2)

        # occasional custody shuffle to hide trail
        if order_counter % 7 == 0:
            e4 = make_custody_transfer(str(uuid.uuid4()), iso_ts(base_time, seconds + 0.5), taker, maker, instrument, 100)
            events.append(e4)

        seconds += max(1.0 / speed, 0.01)

    return events

def scenario_layering(base_time, speed, duration, cfg):
    """
    Large number of ghost orders to create false depth (spoofing/layering)
    Real small marketable order later that executes against liquidity created earlier.
    """
    events = []
    instrument = cfg.get("instrument", "XYZ")
    spoof_account = "ACC-SPOOF-1"
    legitimate_trader = "ACC-LIVE-1"
    price = cfg.get("base_price", 50.00)
    seconds = 0
    order_counter = 0

    # early: create layers (many orders at different price levels)
    while seconds < duration:
        order_counter += 1
        side = "sell" if (order_counter % 2 == 0) else "buy"
        ref = f"ORD-L-{order_counter:05d}"
        qty = 500 if side == "sell" else 300
        p = price + ((order_counter % 5) * 0.1) * (1 if side == "sell" else -1)
        e1 = make_order(str(uuid.uuid4()), iso_ts(base_time, seconds), instrument, spoof_account, side, qty, round(p,2), ref)
        events.append(e1)

        # occasionally cancel large batches to simulate spoofing
        if order_counter % 10 == 0:
            e2 = make_cancel(str(uuid.uuid4()), iso_ts(base_time, seconds + 0.02), instrument, spoof_account, ref, reason="spoof_cancel_batch")
            events.append(e2)

        # after some layering, place marketable order from legitimate trader to eat the book
        if order_counter == int(duration * speed / 4):
            buy_ref = f"ORD-LIVE-B-{order_counter}"
            e3 = make_order(str(uuid.uuid4()), iso_ts(base_time, seconds + 0.05), instrument, legitimate_trader, "buy", 1000, price, buy_ref)
            # simulated trades against some earlier spoof orders (linking to refs)
            e4 = make_trade(str(uuid.uuid4()), iso_ts(base_time, seconds + 0.1), instrument, legitimate_trader, spoof_account, 1000, price, buy_ref, ref)
            events.extend([e3, e4])

        seconds += max(1.0 / speed, 0.01)

    return events

def scenario_spoofing(base_time, speed, duration, cfg):
    """
    Rapid add/remove of orders to create false market signals, followed by a flash move by accomplices.
    """
    events = []
    instrument = cfg.get("instrument", "EFG")
    spoof_accounts = [f"ACC-SPOOF-{i}" for i in range(1,4)]
    colluder = "ACC-COLLUDER-1"
    price = cfg.get("base_price", 200.0)
    seconds = 0
    order_counter = 0

    while seconds < duration:
        order_counter += 1
        acc = random.choice(spoof_accounts)
        ref = f"ORD-S-{order_counter:05d}"
        p = price + ((order_counter % 3) - 1) * 0.5
        e1 = make_order(str(uuid.uuid4()), iso_ts(base_time, seconds), instrument, acc, "sell", 200, round(p,2), ref)
        events.append(e1)

        # cancel almost immediately to create illusion of depth
        e2 = make_cancel(str(uuid.uuid4()), iso_ts(base_time, seconds + 0.02), instrument, acc, ref, reason="spoof_immediate_cancel")
        events.append(e2)

        # periodic coordinated trade by colluder exploiting the momentary depth
        if order_counter % 15 == 0:
            live_ref = f"ORD-C-{order_counter:05d}"
            e3 = make_order(str(uuid.uuid4()), iso_ts(base_time, seconds + 0.03), instrument, colluder, "buy", 600, round(p - 0.1,2), live_ref)
            e4 = make_trade(str(uuid.uuid4()), iso_ts(base_time, seconds + 0.06), instrument, colluder, acc, 600, round(p - 0.1,2), live_ref, ref)
            events.extend([e3, e4])

        seconds += max(1.0 / speed, 0.01)

    return events

def scenario_circular_trading(base_time, speed, duration, cfg):
    """
    Multiple accounts pass positions in a circle to create false volume and price movement.
    """
    events = []
    instrument = cfg.get("instrument", "LMN")
    accounts = [f"ACC-C-{i}" for i in range(1,6)]
    price = cfg.get("base_price", 10.0)
    seconds = 0
    round_counter = 0

    while seconds < duration:
        round_counter += 1
        # create rotating trades between neighboring accounts
        for i in range(len(accounts)):
            buy_acc = accounts[i]
            sell_acc = accounts[(i+1) % len(accounts)]
            ref_b = f"ORD-CIR-B-{round_counter}-{i}"
            ref_s = f"ORD-CIR-S-{round_counter}-{i}"
            qty = 100 + (round_counter % 5) * 10
            p = price + ((round_counter % 3) * 0.2)
            e1 = make_order(str(uuid.uuid4()), iso_ts(base_time, seconds), instrument, buy_acc, "buy", qty, round(p,2), ref_b)
            e2 = make_order(str(uuid.uuid4()), iso_ts(base_time, seconds + 0.01), instrument, sell_acc, "sell", qty, round(p,2), ref_s)
            e3 = make_trade(str(uuid.uuid4()), iso_ts(base_time, seconds + 0.02), instrument, buy_acc, sell_acc, qty, round(p,2), ref_b, ref_s)
            events.extend([e1,e2,e3])
            seconds += max(0.01, 1.0 / (speed * len(accounts)))
            if seconds >= duration:
                break
        if seconds >= duration:
            break

    return events

# ---------------- ENGINE ----------------

SCENARIO_MAP = {
    "wash_trade": scenario_wash_trade,
    "layering": scenario_layering,
    "spoofing": scenario_spoofing,
    "circular_trading": scenario_circular_trading
}

def generate_events(scenario, speed, duration, seed, cfg):
    random.seed(seed)
    base_time = datetime.utcnow()
    if scenario not in SCENARIO_MAP:
        raise ValueError(f"Unknown scenario '{scenario}'. Valid: {list(SCENARIO_MAP.keys())}")
    func = SCENARIO_MAP[scenario]
    events = func(base_time, speed, duration, cfg)
    # ensure deterministic ordering (by ts then by event_id) for repeatability
    events_sorted = sorted(events, key=lambda e: (e["ts"], e["event_id"]))
    return events_sorted

def stream_events(events, output_mode="stdout", outpath="./sim_events.jsonl", throttle=True):
    """
    Streams events to stdout or to a file. throttle controls real-time pacing; set to False for fast playback.
    """
    if output_mode == "file":
        f = open(outpath, "w", encoding="utf-8")
    else:
        f = None

    try:
        last_ts = None
        for ev in events:
            # pacing logic: attempt to approximate orig event timing differences
            if throttle and last_ts is not None:
                # compute delta between events in seconds (ISO8601 ends with Z)
                t1 = datetime.fromisoformat(ev["ts"].rstrip("Z"))
                t0 = datetime.fromisoformat(last_ts.rstrip("Z"))
                delta = (t1 - t0).total_seconds()
                if delta > 0:
                    time.sleep(min(delta, 1.0))  # cap sleep to 1s for demo speed
            line = json.dumps(ev, ensure_ascii=False)
            if f:
                f.write(line + "\n")
            else:
                print(line, flush=True)
            last_ts = ev["ts"]
    finally:
        if f:
            f.close()

def parse_args():
    p = argparse.ArgumentParser(description="Deterministic market-abuse attack simulator (JSONL events).")
    p.add_argument("--scenario", required=True, choices=list(SCENARIO_MAP.keys()), help="scenario to run")
    p.add_argument("--speed", type=int, default=5, help="events-per-second (controls density)")
    p.add_argument("--duration", type=int, default=60, help="duration in seconds")
    p.add_argument("--output", choices=["stdout","file"], default="stdout", help="output destination")
    p.add_argument("--outpath", default="./sim_events.jsonl", help="path when output=file")
    p.add_argument("--seed", type=int, default=1337, help="randomness seed for deterministic runs")
    p.add_argument("--no-throttle", action="store_true", help="disable real-time pacing (fast playback)")
    return p.parse_args()

def main():
    args = parse_args()
    cfg = {}
    events = generate_events(args.scenario, args.speed, args.duration, args.seed, cfg)
    throttle = not args.no_throttle
    stream_events(events, output_mode=args.output, outpath=args.outpath, throttle=throttle)

if __name__ == "__main__":
    main()
