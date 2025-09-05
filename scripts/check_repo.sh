#!/usr/bin/env bash
# scripts/check_repo.sh
set -euo pipefail

# Usage:
#   ./scripts/check_repo.sh              # just check
#   ./scripts/check_repo.sh --bootstrap  # bootstrap placeholders in current dir
#   ./scripts/check_repo.sh <path>       # check a specific repo path
#   ./scripts/check_repo.sh <path> --bootstrap

ROOT="."
BOOTSTRAP=0

# Parse arguments
for arg in "$@"; do
  case "$arg" in
    --bootstrap) BOOTSTRAP=1 ;;
    *) ROOT="$arg" ;;
  esac
done

declare -a MUST=(
  "scripts/run_demo.sh"
  "attack_simulator.py"
  "app/ingest.py"
  "app/detector.py"
  "results/evidence_samples/sample_evidence_001.json"
  "tools/anchor_evidence.py"
  "README.md"
)

declare -a NICE=(
  "app/narrative.py"
  "app/rule_engine.py"
  "app/graph_adapter.py"
  "evaluation/metrics.py"
  "tools/federated_stubs.py"
  "requirements.txt"
  "Dockerfile"
)

echo "Checking repo at: ${ROOT}"
missing=()
for f in "${MUST[@]}"; do
  if [[ ! -f "${ROOT}/${f}" ]]; then
    echo "MISSING (required): ${f}"
    missing+=("${f}")
  fi
done

for f in "${NICE[@]}"; do
  if [[ ! -f "${ROOT}/${f}" ]]; then
    echo "MISSING (recommended): ${f}"
  fi
done

if [[ ${#missing[@]} -eq 0 ]]; then
  echo "OK: All required files present."
  exit 0
fi

if [[ $BOOTSTRAP -eq 1 ]]; then
  echo
  echo "Bootstrapping placeholders into ${ROOT} ..."
  for f in "${missing[@]}"; do
    dir=$(dirname "$f")
    mkdir -p "${ROOT}/${dir}"
    case "$f" in
      "attack_simulator.py")
        cat > "${ROOT}/${f}" <<'PY'
#!/usr/bin/env python3
print("PLACEHOLDER: attack_simulator.py - replace with real simulator logic.")
PY
        chmod +x "${ROOT}/${f}"
        ;;
      "tools/anchor_evidence.py")
        cat > "${ROOT}/${f}" <<'PY'
#!/usr/bin/env python3
import sys, json, os
print("PLACEHOLDER: anchor_evidence.py - simulated anchoring")
if "--evidence" in sys.argv:
    ev=sys.argv[sys.argv.index("--evidence")+1]
    out = ev.replace(".json",".anchored.json")
    os.makedirs(os.path.dirname(out), exist_ok=True)
    with open(out,"w") as f: f.write(json.dumps({"anchored":True}))
PY
        chmod +x "${ROOT}/${f}"
        ;;
      "results/evidence_samples/sample_evidence_001.json")
        echo '{"sample":"placeholder evidence"}' > "${ROOT}/${f}"
        ;;
      "README.md")
        echo "# IntegrityPlay Demo\n\nThis is a placeholder README. Replace with project details." > "${ROOT}/${f}"
        ;;
      *)
        echo "# placeholder" > "${ROOT}/${f}"
        ;;
    esac
    echo "WROTE placeholder: ${f}"
  done
  echo "Done bootstrapping. Re-run scripts/run_demo.sh --no-throttle"
else
  echo
  echo "You are missing required files. To create placeholders, run:"
  echo "  ./scripts/check_repo.sh --bootstrap"
fi
