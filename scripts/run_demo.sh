#!/usr/bin/env bash
# run_demo.sh - Orchestrated demo runner (updated)
# Purpose: single-command demo for judges that:
#  1. produces deterministic attack events (attack_simulator.py)
#  2. anchors the included sample evidence (tools/anchor_evidence.py)
#  3. ingests events into app/ingest.py (which runs the Detector in-process)
#  4. verifies anchored evidence and writes a lightweight detection summary
#
# Usage (default quick run):
#   chmod +x scripts/run_demo.sh
#   ./scripts/run_demo.sh
#
# Optional overrides (export or prefix on command line):
#   SCENARIO=layering SPEED=8 DURATION=30 ./scripts/run_demo.sh --no-throttle
#   HMAC_KEY=demo_key ./scripts/run_demo.sh
#   RPC=http://127.0.0.1:8545 PRIVATE_KEY=0x... ./scripts/run_demo.sh
#
set -euo pipefail
IFS=$'\n\t'

# ---- Config (can be overridden via env) ----
SCENARIO="${SCENARIO:-wash_trade}"
SPEED="${SPEED:-5}"           # events/sec fallback
DURATION="${DURATION:-20}"    # seconds (simulator duration)
OUTDIR="${OUTDIR:-results/demo_run}"
EVENTS_FILE="${EVENTS_FILE:-${OUTDIR}/events.jsonl}"
SAMPLE_EVIDENCE="${SAMPLE_EVIDENCE:-results/evidence_samples/sample_evidence_001.json}"
ANCHOR_OUT="${ANCHOR_OUT:-${OUTDIR}/sample_evidence_anchored.json}"
HMAC_KEY="${HMAC_KEY:-}"
RPC="${RPC:-}"
PRIVATE_KEY="${PRIVATE_KEY:-}"
NO_THROTTLE_FLAG=""
if [[ "${1:-}" == "--no-throttle" || "${NO_THROTTLE:-}" == "1" ]]; then
  NO_THROTTLE_FLAG="--no-throttle"
fi

# Create outdir
mkdir -p "${OUTDIR}"

echo "=========================="
echo "IntegrityPlay - Demo Runner (Updated)"
echo "SCENARIO: ${SCENARIO} | SPEED: ${SPEED} ev/s | DURATION: ${DURATION}s"
echo "EVENTS_FILE: ${EVENTS_FILE}"
echo "SAMPLE_EVIDENCE: ${SAMPLE_EVIDENCE}"
echo "OUTDIR: ${OUTDIR}"
echo "=========================="

# Check python3
if ! command -v python3 >/dev/null 2>&1; then
  echo "ERROR: python3 not found. Please install Python 3.8+."
  exit 1
fi

# Step 1: produce deterministic events file
echo "[1/6] Generating deterministic events -> ${EVENTS_FILE}"
if [[ ! -f "attack_simulator.py" ]]; then
  echo "ERROR: attack_simulator.py not found in repo root. Please include it."
  exit 2
fi
python3 attack_simulator.py --scenario "${SCENARIO}" --speed "${SPEED}" --duration "${DURATION}" --output file --outpath "${EVENTS_FILE}" ${NO_THROTTLE_FLAG}
echo "WROTE events -> ${EVENTS_FILE} (lines: $(wc -l < "${EVENTS_FILE}"))"

# Step 2: Anchor the sample evidence (optional modes: on-chain, HMAC, simulated)
echo "[2/6] Anchoring sample evidence: ${SAMPLE_EVIDENCE}"
if [[ -n "${RPC}" && -n "${PRIVATE_KEY}" && -f "tools/anchor_evidence.py" ]]; then
  echo "Trying on-chain anchor (RPC + PRIVATE_KEY provided)"
  set +e
  python3 tools/anchor_evidence.py --evidence "${SAMPLE_EVIDENCE}" --rpc "${RPC}" --private-key "${PRIVATE_KEY}" --out "${ANCHOR_OUT}"
  rc=$?
  set -e
  if [[ $rc -ne 0 ]]; then
    echo "On-chain anchor failed (maybe web3 not installed). Falling back to simulated anchor."
    python3 tools/anchor_evidence.py --evidence "${SAMPLE_EVIDENCE}" --simulate --out "${ANCHOR_OUT}"
  fi
elif [[ -n "${HMAC_KEY}" && -f "tools/anchor_evidence.py" ]]; then
  echo "Using HMAC anchor (HMAC_KEY provided)"
  python3 tools/anchor_evidence.py --evidence "${SAMPLE_EVIDENCE}" --hmac-key "${HMAC_KEY}" --out "${ANCHOR_OUT}"
elif [[ -f "tools/anchor_evidence.py" ]]; then
  echo "No anchor key provided -> using simulated anchor (default)"
  python3 tools/anchor_evidence.py --evidence "${SAMPLE_EVIDENCE}" --simulate --out "${ANCHOR_OUT}"
else
  echo "WARNING: tools/anchor_evidence.py missing; skipping sample evidence anchor."
fi
echo "Anchored sample evidence (if tool present) -> ${ANCHOR_OUT}"

# Step 3: Run ingest.py to process the generated events and run the detector in-process
echo "[3/6] Ingesting events and running detector (app/ingest.py)"
if [[ ! -f "app/ingest.py" ]]; then
  echo "ERROR: app/ingest.py not found. Please ensure detector and ingest exist."
  exit 3
fi

INGEST_CMD=(python3 app/ingest.py --mode stream --events "${EVENTS_FILE}" --run-detector --anchor --scan-interval 2)
if [[ -n "${NO_THROTTLE_FLAG}" ]]; then
  INGEST_CMD+=(--no-throttle)
fi
echo "Running: ${INGEST_CMD[*]}"
"${INGEST_CMD[@]}"

# Step 4: Lightweight detection summary (counts by event type)
echo "[4/6] Producing lightweight detection summary -> ${OUTDIR}/detection_summary.json"
python3 - <<PY > "${OUTDIR}/detection_summary.json"
import json,sys
from collections import Counter
p = "${EVENTS_FILE}"
cnt = Counter(); events=[]
try:
    with open(p,'r',encoding='utf-8') as f:
        for line in f:
            line=line.strip()
            if not line:
                continue
            try:
                ev=json.loads(line)
            except Exception:
                continue
            events.append(ev)
            cnt[ev.get("type","unknown")] += 1
    summary = {
        "total_events": sum(cnt.values()),
        "by_type": dict(cnt),
        "first_event_ts": events[0].get("ts") if events else None,
        "last_event_ts": events[-1].get("ts") if events else None
    }
    print(json.dumps(summary, indent=2))
except Exception as e:
    print(json.dumps({"error":str(e)}))
PY
echo "WROTE: ${OUTDIR}/detection_summary.json"
cat "${OUTDIR}/detection_summary.json"
echo

# Step 5: Verify the anchored sample evidence (best-effort)
echo "[5/6] Verifying anchored evidence (best-effort)"
if [[ -f "tools/anchor_evidence.py" && -f "${ANCHOR_OUT}" ]]; then
  python3 tools/anchor_evidence.py --verify "${ANCHOR_OUT}" || true
else
  echo "Skipping verification (anchor tool or anchored file missing)"
fi

# Step 6: Final summary and pointers for judges
echo "[6/6] Demo complete."
echo "Artifacts produced under: ${OUTDIR}"
echo "- events file: ${EVENTS_FILE}"
echo "- detection summary: ${OUTDIR}/detection_summary.json"
echo "- alerts (if any): results/alerts/  (open to inspect any emitted ALERT-*.json files)"
echo "- evidence samples: results/evidence_samples/ (and anchored files .anchored.json)"
echo
echo "Quick commands for judges:"
echo "  chmod +x scripts/run_demo.sh"
echo "  ./scripts/run_demo.sh --no-throttle"
echo "  python3 app/ingest.py --mode webhook --webhook-port 8000  # to demo webhook ingestion"
echo
echo "Notes: On-chain anchoring requires a local test chain (Hardhat/Ganache) and web3 dependencies; HMAC mode requires HMAC_KEY env var."
