# IntegrityPlay Demo Guide

End-to-end instructions to run the demo smoothly on Windows, macOS, and Linux. This guide covers prerequisites, environment variables, startup commands, verification steps, and a recommended judge flow.

## 1) Requirements

- OS: Windows 10/11, macOS 13+, or any modern Linux
- Hardware: 4 GB RAM minimum (8 GB recommended), ~2 GB free disk space
- Network: Internet connection to pull Docker images

## 2) Tools to Install

- Docker Desktop
  - Windows: requires WSL 2 Backend (Docker Desktop installer can enable this)
  - Download: https://www.docker.com/products/docker-desktop
- Git
  - Download: https://git-scm.com/downloads
- Optional (local development): Node.js 20+ and Python 3.10+ (not required for Docker demo)

## 3) Clone and Configure

```bash
# Clone the repository
git clone <your-repo-url>
cd IntegrityPlay

# Optional: create a .env from example (used by docker-compose)
# If .env is missing, safe defaults are used
cp -n .env.example .env 2>/dev/null || true
```

### Important environment variables
- API_KEY: API key for backend (default: demo_key)
- DATABASE_URL: Postgres connection (docker default provided)
- NEXT_PUBLIC_API_BASE_URL: http://localhost:8000 (frontend uses this)
- NEXT_PUBLIC_API_KEY: demo_key (frontend sends this header)

You can set these in .env (backend) and Docker Compose already passes reasonable defaults.

## 4) Start the Stack

- Windows/macOS/Linux (Docker Desktop):
```bash
# Build and start all services in background
docker compose up -d --build
```

- Alternative (if you have Make available on macOS/Linux):
```bash
make dev
```

Wait 30–90 seconds for all services to become healthy.

## 5) Verify Services

- Frontend: http://localhost:3000
- Backend API docs: http://localhost:8000/docs
- Health check:
  - Windows PowerShell: `Invoke-WebRequest http://localhost:8000/api/health`
  - Bash: `curl http://localhost:8000/api/health`

To see recent logs:
```bash
docker compose logs --no-color --tail=200
```

## 6) Run the Demo

You can start either a simple demo run or the curated SEBI storyline. Both generate alerts and evidence.

- Fast path (macOS/Linux with Make installed):
```bash
make demo
```
This uses scripts/run_demo.sh to orchestrate a local demo run (or API mode if configured).

- SEBI storyline (recommended for judges):
  - Frontend: open http://localhost:3000 and click “SEBI Storyline ▶” or navigate to /demo/sebi and click “Run Storyline”
  - Backend API: `POST http://localhost:8000/api/demo/sebi_storyline` with header `X-API-Key: demo_key`

- Simple demo run:
  - Backend API: `POST http://localhost:8000/api/run_demo` with header `X-API-Key: demo_key`

## 7) What to Show (Judge Flow ~3 minutes)

1. Dashboard
   - Show realtime badge (Connected) and metrics (EPS, p50/p95 latency, Rule Counters)
   - Click “SEBI Storyline ▶” to start, watch metrics and alerts move
2. Alerts
   - Open /alerts and show new alerts arriving
   - Click an alert for details
   - Explain tab: aggregated explainability with top features
   - 3D Network tab: interactive Plotly-based network
   - 2D Graph tab: Cytoscape layout as a fast overview
   - Verify HMAC Chain: click “Verify HMAC Chain” to show integrity verified
   - Download JSON or pack (ZIP)
3. Cases
   - Go to /cases, create a case, link the alert, add a comment
   - Download HTML report to show audit trail

## 8) API Cheatsheet

```bash
# Start storyline
curl -X POST "http://localhost:8000/api/demo/sebi_storyline" -H "X-API-Key: demo_key"

# Trigger a simple demo run
curl -X POST "http://localhost:8000/api/run_demo" -H "X-API-Key: demo_key" -H "Content-Type: application/json" -d '{"scenario":"wash_trade","speed":8.0,"duration":20,"no_throttle":true}'

# List alerts
curl -H "X-API-Key: demo_key" "http://localhost:8000/api/alerts?page=1&page_size=50"

# Alert details
curl -H "X-API-Key: demo_key" "http://localhost:8000/api/alerts/ALERT-1234"

# Verify HMAC chain
curl -H "X-API-Key: demo_key" "http://localhost:8000/api/alerts/ALERT-1234/verify_chain"

# Download ZIP pack (POST)
curl -X POST -H "X-API-Key: demo_key" "http://localhost:8000/api/alerts/ALERT-1234/download_pack" -o pack.zip
```

## 9) Troubleshooting

- Docker Desktop not running
  - Start Docker Desktop first; re-run `docker compose up -d --build`
- Port conflict (3000, 8000, 5432, 6379, 9000-9001)
  - Stop whatever is using the port or adjust compose ports accordingly
- Frontend shows “Offline” badge
  - Wait 10–20 seconds after startup; ensure backend at http://localhost:8000 is reachable
  - Verify env: NEXT_PUBLIC_API_BASE_URL and NEXT_PUBLIC_API_KEY in frontend container
- Explain or 3D visualization unavailable (501)
  - The UI will show a friendly message; try a new alert or ensure Python deps are installed in the backend image (already handled in Docker)
- HMAC chain not verified
  - Ensure results/chain/hmac_chain.jsonl exists (generated when evidence is written during ingest)
- Full reset
  - `docker compose down -v && docker compose up -d --build`

## 10) Clean Up

```bash
docker compose down -v
```

You’re all set. For a quick overview of the system and its architecture, see README.md.
