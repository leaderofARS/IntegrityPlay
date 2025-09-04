# IntegrityPlay — Privacy-first Real-time Market Surveillance (Hackathon Submission)

**One-line:** Adversarial-proof, tamper-evident surveillance for collusion & wash trades with privacy-preserving consortium mode and regulator-ready evidence packs.

## What judges should run (10 minutes)
1. Start simulator and produce sample events:
   ```bash
   # Quick reproducible run (prints JSONL to console)
   python3 attack_simulator.py --scenario wash_trade --speed 5 --duration 20 --seed 42
   ```
   or produce a file for fast playback:
   ```bash
   python3 attack_simulator.py --scenario layering --speed 10 --duration 30 --output file --outpath ./events.jsonl --no-throttle
   ```

2. Anchor the included sample evidence (no blockchain required):
   ```bash
   # simulated anchor (zero-deps)
   python3 tools/anchor_evidence.py --evidence results/evidence_samples/sample_evidence_001.json --simulate
   ```
   Expected output: the script prints the computed SHA256 fingerprint and writes `results/evidence_samples/sample_evidence_001.anchored.json` containing an `_anchor` block with `simulated_tx_id`.

3. (Optional) Demonstrate HMAC signing:
   ```bash
   python3 tools/anchor_evidence.py --evidence results/evidence_samples/sample_evidence_001.json --hmac-key "supersecret_demo_key"
   ```
   Expected: `_anchor.anchor_proof.hmac_signature` present in the anchored JSON. Use `--verify --verify-hmac-key` to validate later.

4. (Optional advanced) Anchor on local chain (Hardhat/Ganache):
   ```bash
   # start a local chain (outside this repo) and provide RPC + a funded private key
   python3 tools/anchor_evidence.py --evidence results/evidence_samples/sample_evidence_001.json --rpc http://127.0.0.1:8545 --private-key 0xYOURPRIVATEKEY
   ```
   Expected: transaction hash printed and included in `_anchor.anchor_proof.tx_hash` for verification.

5. Run evaluation (if provided) to see detection metrics:
   ```bash
   # if you included evaluation scripts
   bash evaluation/run_evaluation.sh
   cat results/detection_results.csv
   ```

## Quick demo checklist (what judges will see)
- Attack trace (wash_trade/layering/spoofing) generated deterministically.
- Anchored evidence JSON with SHA256 fingerprint (simulated/hmac/on-chain).
- Plain-English narrative summarizing why the alert was raised.
- Verification command to confirm tamper-evidence (recomputes fingerprint).

## Files added for demo convenience
- `results/evidence_samples/sample_evidence_001.json` — sample evidence with events, narrative, and investigator actions.
- `tools/anchor_evidence.py` — anchoring utility (simulate/hmac/on-chain + verification).

## Expected quick outputs
- After `--simulate`, you will see:
  - Computed SHA256 fingerprint: `XXXXXXXX...`
  - WROTE: `results/evidence_samples/sample_evidence_001.anchored.json`
- After `--verify` on the anchored file you will see a confirmation that fingerprint matches and (if on-chain/HMAC) proof verifies.

## Notes for judges
- This repo is intentionally dependency-light. On-chain features are optional and work with a local Hardhat/Ganache instance for demoing ledger anchoring. HMAC mode demonstrates cryptographic signing without any blockchain dependency.
- For full integration, see `docs/` for adapter specifications (FIX, WebSocket, Depository events).

---
If you want, I will also produce a minimal `DEMO.md` with step-by-step commands and screenshots or a short recorded GIF. The sample evidence file is at `/mnt/data/results/evidence_samples/sample_evidence_001.json`.
