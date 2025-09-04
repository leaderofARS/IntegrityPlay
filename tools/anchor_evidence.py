#!/usr/bin/env python3
"""
tools/anchor_evidence.py

Create a tamper-evident anchor for an evidence JSON file by:
 - computing a canonical SHA-256 fingerprint of the evidence JSON
 - optionally signing the fingerprint (HMAC or Ethereum signature)
 - optionally anchoring the fingerprint on-chain (local Hardhat/Ganache or any RPC)

Produces an updated evidence file with an `anchor` block that contains:
 - sha256_fingerprint
 - timestamp_utc
 - anchor_mode: onchain | hmac | simulated
 - anchor_proof: { tx_hash / hmac_signature / simulated_id }
 - signer: eth_address or HMAC key id (if available)
 - verification helper metadata

Usage examples:
  # 1) Simple simulate anchor (no extras)
  python3 tools/anchor_evidence.py --evidence results/evidence_samples/sample_evidence_001.json --simulate

  # 2) Create HMAC signature proof
  python3 tools/anchor_evidence.py --evidence results/evidence_samples/sample_evidence_001.json --hmac-key "my-secret-key"

  # 3) Anchor on a local Hardhat/Ganache chain (account must have funds)
  python3 tools/anchor_evidence.py --evidence results/evidence_samples/sample_evidence_001.json --rpc http://127.0.0.1:8545 --private-key 0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa

  # 4) Verify an anchored evidence file (detect tampering)
  python3 tools/anchor_evidence.py --verify results/evidence_samples/sample_evidence_001.anchored.json --rpc http://127.0.0.1:8545

Notes:
 - This script is resilient: it will not crash if web3.py is missing; on-chain features are optional.
 - For hackathon submissions, the simulated/hmac anchor + included verification steps are sufficient to demonstrate tamper-evidence.
"""

import argparse
import json
import os
import sys
import hashlib
import time
import uuid
from datetime import datetime, timezone

# Optional dependencies
try:
    from web3 import Web3, HTTPProvider
    from eth_account import Account
    from eth_account.messages import encode_defunct
    WEB3_AVAILABLE = True
except Exception:
    WEB3_AVAILABLE = False

def canonical_json_bytes(obj):
    """
    Produce canonical JSON bytes: sorted keys, separators compacted, no whitespace.
    This ensures deterministic fingerprinting.
    """
    return json.dumps(obj, sort_keys=True, separators=(",", ":"), ensure_ascii=False).encode("utf-8")

def compute_sha256_fingerprint(evidence_obj):
    b = canonical_json_bytes(evidence_obj)
    h = hashlib.sha256(b).hexdigest()
    return h

def load_json(path):
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)

def save_json(obj, path):
    with open(path, "w", encoding="utf-8") as f:
        json.dump(obj, f, indent=2, sort_keys=False, ensure_ascii=False)
    print(f"WROTE: {path}")

def make_anchor_record(fingerprint, mode, proof, signer=None):
    return {
        "sha256_fingerprint": fingerprint,
        "anchored_at_utc": datetime.now(timezone.utc).isoformat(),
        "anchor_mode": mode,
        "anchor_proof": proof,
        "signer": signer
    }

def simulate_anchor(fingerprint):
    # Create a deterministic simulated tx id (UUID v5 using fingerprint)
    sim_id = "SIMULATED_TX_" + uuid.uuid5(uuid.NAMESPACE_URL, fingerprint).hex
    proof = {"simulated_tx_id": sim_id}
    return make_anchor_record(fingerprint, "simulated", proof, signer=None)

def hmac_anchor(fingerprint, hmac_key):
    # HMAC-SHA256 signature (hex)
    import hmac
    sig = hmac.new(hmac_key.encode("utf-8"), fingerprint.encode("utf-8"), hashlib.sha256).hexdigest()
    proof = {"hmac_signature": sig}
    # we store a short key id (SHA1 of key) to avoid exposing secret in metadata
    key_id = hashlib.sha1(hmac_key.encode("utf-8")).hexdigest()[:12]
    return make_anchor_record(fingerprint, "hmac", proof, signer={"hmac_key_id": key_id})

def onchain_anchor(fingerprint, rpc_url, private_key, gas_price_gwei=1, gas_limit=21000):
    """
    Send a raw transaction with the fingerprint as calldata (encoded as ASCII bytes -> hex).
    Returns anchor record with tx_hash. Requires web3.py and a funded account.
    Warning: For hackathon/demo use, run against local Hardhat/Ganache network.
    """
    if not WEB3_AVAILABLE:
        raise RuntimeError("web3.py or eth-account not installed. Install with: pip install web3 eth-account")

    w3 = Web3(HTTPProvider(rpc_url))
    acct = Account.from_key(private_key)
    from_addr = acct.address

    # Build txn: send 0 wei, data = fingerprint_hex
    fingerprint_hex = "0x" + fingerprint.encode("utf-8").hex()
    nonce = w3.eth.get_transaction_count(from_addr)
    tx = {
        "nonce": nonce,
        "to": from_addr,  # self tx; could be to zero address
        "value": 0,
        "gas": gas_limit,
        "gasPrice": w3.toWei(gas_price_gwei, "gwei"),
        "data": fingerprint_hex
    }
    signed = acct.sign_transaction(tx)
    tx_hash = w3.eth.send_raw_transaction(signed.rawTransaction)
    tx_hash_hex = w3.toHex(tx_hash)
    proof = {"tx_hash": tx_hash_hex, "rpc": rpc_url}
    signer = {"eth_address": from_addr}
    return make_anchor_record(fingerprint, "onchain", proof, signer=signer)

def verify_onchain_anchor(anchor_record, rpc_url):
    """
    Verify that the chain contains the fingerprint data in the transaction input.
    Returns (ok:bool, message:str)
    """
    if not WEB3_AVAILABLE:
        return False, "web3.py not available; cannot verify on-chain anchor."

    w3 = Web3(HTTPProvider(rpc_url))
    tx_hash = anchor_record.get("anchor_proof", {}).get("tx_hash")
    if not tx_hash:
        return False, "No tx_hash in anchor_proof."

    try:
        tx = w3.eth.get_transaction(tx_hash)
    except Exception as e:
        return False, f"Failed fetching tx: {e}"

    input_data = tx.input  # hex string starting with 0x
    # reconstruct expected data hex
    expected_hex = "0x" + anchor_record["sha256_fingerprint"].encode("utf-8").hex()
    if input_data.lower().startswith(expected_hex.lower()):
        return True, f"On-chain anchor verified (tx: {tx_hash})."
    else:
        return False, f"On-chain anchor mismatch. tx.input does not start with expected fingerprint."

def verify_hmac_anchor(anchor_record, hmac_key):
    import hmac
    expected_sig = hmac.new(hmac_key.encode("utf-8"), anchor_record["sha256_fingerprint"].encode("utf-8"), hashlib.sha256).hexdigest()
    got_sig = anchor_record.get("anchor_proof", {}).get("hmac_signature")
    if not got_sig:
        return False, "No hmac_signature found in anchor_proof."
    if hmac.compare_digest(expected_sig, got_sig):
        return True, "HMAC signature verified."
    else:
        return False, "HMAC signature mismatch."

def attach_anchor_and_write(evidence_path, anchor_record, outpath=None):
    base = load_json(evidence_path)
    # don't mutate original input; attach anchor under 'anchor' key
    base_copy = dict(base)
    base_copy["_anchor"] = anchor_record
    if outpath is None:
        outpath = os.path.splitext(evidence_path)[0] + ".anchored.json"
    save_json(base_copy, outpath)
    return outpath

def main():
    p = argparse.ArgumentParser(description="Anchor an evidence JSON by computing sha256 and creating an anchor proof.")
    p.add_argument("--evidence", required=False, help="Path to evidence JSON. If omitted and --demo, a sample will be produced.")
    p.add_argument("--simulate", action="store_true", help="Create simulated anchor (default lightweight option).")
    p.add_argument("--hmac-key", help="HMAC secret key to sign the fingerprint (do NOT commit secret to repo).")
    p.add_argument("--rpc", help="RPC URL to an Ethereum node (Hardhat/Ganache recommended for demo).")
    p.add_argument("--private-key", help="Private key (0x...) used to send on-chain anchor transaction. Must have funds on the chain.")
    p.add_argument("--out", help="Output anchored evidence path.")
    p.add_argument("--verify", help="Verify an anchored evidence JSON file instead of anchoring a new one.")
    p.add_argument("--verify-hmac-key", help="HMAC key used for verifying hmac anchors (if applicable).")
    args = p.parse_args()

    if args.verify:
        # verification flow
        anchored = load_json(args.verify)
        anchor_record = anchored.get("_anchor")
        if not anchor_record:
            print("No _anchor block found in the file. Cannot verify.")
            sys.exit(2)

        # recompute fingerprint of the evidence content (without _anchor)
        original = dict(anchored)
        original.pop("_anchor", None)
        recomputed = compute_sha256_fingerprint(original)
        if recomputed != anchor_record.get("sha256_fingerprint"):
            print("FINGERPRINT MISMATCH: Evidence content has changed since anchoring!")
            print(f"expected: {anchor_record.get('sha256_fingerprint')}")
            print(f"recomputed: {recomputed}")
            sys.exit(3)
        else:
            print("Fingerprint matches anchor record. Evidence content has not been tampered with.")

        mode = anchor_record.get("anchor_mode")
        if mode == "onchain":
            if args.rpc is None:
                print("Anchor mode is onchain. Provide --rpc to verify on-chain proof.")
                sys.exit(0)
            ok, msg = verify_onchain_anchor(anchor_record, args.rpc)
            print(msg)
            sys.exit(0 if ok else 4)
        elif mode == "hmac":
            if not args.verify_hmac_key:
                print("Anchor mode is hmac. Provide --verify-hmac-key to verify signature.")
                sys.exit(0)
            ok, msg = verify_hmac_anchor(anchor_record, args.verify_hmac_key)
            print(msg)
            sys.exit(0 if ok else 5)
        elif mode == "simulated":
            print("Simulated anchor; fingerprint present and verified locally. No on-chain proof available.")
            sys.exit(0)
        else:
            print(f"Unknown anchor mode: {mode}")
            sys.exit(6)

    # anchoring flow
    if not args.evidence:
        print("No evidence path provided. For demo, run with --demo or provide --evidence path.")
        sys.exit(1)

    if not os.path.exists(args.evidence):
        print(f"Evidence file not found: {args.evidence}")
        sys.exit(2)

    evidence_obj = load_json(args.evidence)
    # recompute fingerprint deterministically excluding any existing _anchor
    evidence_copy = dict(evidence_obj)
    evidence_copy.pop("_anchor", None)
    fingerprint = compute_sha256_fingerprint(evidence_copy)
    print("Computed SHA256 fingerprint:", fingerprint)

    # choose anchoring method
    anchor_record = None
    if args.rpc and args.private_key:
        try:
            print("Attempting on-chain anchor using RPC:", args.rpc)
            anchor_record = onchain_anchor(fingerprint, args.rpc, args.private_key)
            print("On-chain tx submitted:", anchor_record["anchor_proof"]["tx_hash"])
        except Exception as e:
            print("On-chain anchoring failed:", e)
            print("Falling back to simulated anchor.")
            anchor_record = simulate_anchor(fingerprint)
    elif args.hmac_key:
        anchor_record = hmac_anchor(fingerprint, args.hmac_key)
        print("HMAC anchor created; key id:", anchor_record.get("signer"))
    elif args.simulate:
        anchor_record = simulate_anchor(fingerprint)
        print("Simulated anchor created:", anchor_record["anchor_proof"]["simulated_tx_id"])
    else:
        # default to simulated anchor if nothing else specified
        print("No anchoring option provided; creating simulated anchor by default.")
        anchor_record = simulate_anchor(fingerprint)
        print("Simulated anchor created:", anchor_record["anchor_proof"]["simulated_tx_id"])

    outpath = attach_anchor_and_write(args.evidence, anchor_record, outpath=args.out)
    print("Anchored evidence saved to:", outpath)
    print("To verify later run:")
    print(f"  python3 tools/anchor_evidence.py --verify {outpath} --rpc <RPC_URL> --verify-hmac-key <HMAC_KEY>")
    print("End.")
