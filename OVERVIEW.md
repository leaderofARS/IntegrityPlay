# OVERVIEW.md

This document is a practical, up-to-date guide for contributors, reviewers, and judges. It explains the system architecture, developer workflow, configuration, quality gates, and how to run demos reliably in local and CI environments.

## Project Overview

IntegrityPlay is a privacy-first real-time market surveillance system designed for financial markets. It's a full-stack application built for the **Global Fintech Festival 2025 SEBI Securities Market Hackathon** that detects financial fraud (wash trades, layering, circular trading) with tamper-evident evidence packs and privacy-preserving consortium sharing.

## Repository at a glance

- Purpose: Real-time market surveillance and investigation with explainable alerts, graph analytics (2D/3D), HMAC chain-of-custody, and case management.
- Stack: FastAPI + Postgres/Redis/MinIO (backend), Next.js/TypeScript (frontend), WebSockets for realtime, Plotly/NetworkX & Cytoscape for graph visuals.
- Demo UX: Start “SEBI Storyline ▶” from the Dashboard (or /demo/sebi). Alerts stream to the dashboard, then drill into Explain, 2D/3D, Verify HMAC Chain, and case workflow.

## Common Development Commands

### Quick Start (Full Stack)
```bash
make dev                    # Start full stack via Docker Compose (Frontend: http://localhost:3000, Backend: http://localhost:8000/docs)
make demo                   # Run demo pipeline with --no-throttle flag
make down                   # Stop and remove all containers
make logs                   # View container logs
```

### Environment Setup
```bash
cp .env.example .env        # Copy environment template (or let Makefile handle it)
```

### Testing & Quality
```bash
make test                   # Run backend unit tests (requires Python dependencies)
make ci                     # Run full CI pipeline: lint, test, demo, e2e tests
python -m pytest -q backend/tests                           # Run backend tests directly
npx playwright test --config frontend/playwright.config.ts  # Run e2e tests
```

### Linting & Formatting
```bash
# Python (local):
black .                      # Auto-format
ruff check --fix .           # Auto-fix safe lints

# Frontend (local):
(cd frontend && npm run lint -- --fix)
```

CI runs the same auto-fix steps to avoid style-only failures during the hackathon.

### Manual Execution
```bash
./scripts/run_demo.sh --no-throttle        # Run demo pipeline directly (USE_API=1 to drive via backend)
USE_API=1 ./scripts/run_demo.sh --no-throttle
python attack_simulator.py                 # Generate synthetic attack data
python app/ingest.py --help                # See ingestion options
```

## Architecture Overview

### High-Level Flow
Market/Simulated Events → Ingest → Graph Adapter → Detector (rules + optional ML) → Alerts → Explainability + Evidence → HMAC Chain-of-Custody → Case Mgmt + Reports → UI (2D/3D, Realtime)

### Core Components

#### Backend Services (FastAPI)
- main.py: FastAPI API (alerts, cases, demo/storyline, metrics, WebSocket endpoints)
- ingest_integration.py: Ingest + persistence + HMAC chain; broadcasts to realtime
- realtime.py: WebSocket broadcaster for live alert updates
- explanation.py: Aggregates explainability for alerts
- tasks.py: Async task orchestration for demos/storylines
- models.py, schemas.py: SQLAlchemy models and Pydantic schemas (alerts, cases, audit)
- storage.py: MinIO integration for evidence artifacts

#### Detection Pipeline (app/)
- ingest.py: File/webhook ingest, streaming/throttling, alert artifact writer
- detector.py: Real-time detection with rule-based scoring and optional IsolationForest
- graph_adaptor.py: Lightweight relationship store; used by detector
- rule_engine.py: Rule-based signal evaluation helpers
- narrative.py: Human-readable summaries used in reports
- network_viz.py: Plotly/NetworkX visuals (backend 3D HTML generation)

#### Frontend (Next.js + TypeScript)
- Next.js App Router pages: dashboard, alerts, cases, demo/sebi
- Components: AlertDetailTabs (Explain, 2D, 3D), Network3D, Graph2D, ExplainPanel
- WebSockets client with auto-reconnect for live alerts
- Recharts for metrics, Cytoscape.js for 2D graphs, Tailwind CSS for styling
- API proxy routes for authenticated evidence downloads

#### Tools & Scripts
- **tools/anchor_evidence.py**: Blockchain anchoring for tamper-evident evidence
- **tools/federated_stub.py**: Privacy-preserving consortium simulation
- **attack_simulator.py**: Generates deterministic synthetic market manipulation scenarios

### Data Flow
1. Events ingested via JSON/JSONL files or webhook API
2. Graph adapter builds account relationship networks
3. Detector applies rule-based scoring + optional ML anomaly detection
4. Alerts are persisted and broadcast over WebSocket to UI
5. Explainability and visualization (2D/3D) data is prepared on demand
6. Evidence integrity chained via HMAC; verification endpoint exposes proof
7. Results stored in Postgres + MinIO; APIs serve alerts/cases/reports

### Key Technologies
- Backend: FastAPI, SQLAlchemy, PostgreSQL, Redis, MinIO
- Frontend: Next.js 14, TypeScript, TanStack Query, Tailwind, Cytoscape.js
- Detection/Graphs: NetworkX, optional scikit-learn, Plotly (3D)
- Realtime: WebSockets broadcaster (backend) + client (frontend)
- Infrastructure: Docker Compose; Makefile helpers; CI via GitHub Actions

## Development Patterns

### Alert Structure
Alerts persisted in the DB and files include:
- alert_id (string), score (float), anchored (bool), evidence_path (string | null)
- rule_flags (per-account reasons), signals (features), created_at/updated_at
- Evidence JSON may contain events, cluster accounts, contributing_signals

### Event Processing
Events are processed through a sliding window detector that:
- Maintains recent event history (default 300 seconds)
- Tracks account statistics and relationships
- Applies multiple detection algorithms simultaneously
- Emits alerts when thresholds are exceeded

### Testing Strategy
- Backend unit tests: backend/tests
- E2E (Playwright): frontend/tests-e2e (assumes docker compose running stack)
- CI pipeline: lint (auto-fix), compose up, smoke demo, unit + e2e tests
- Deterministic storyline scenarios for reliable demo outcomes

### Environment Configuration
Key variables (see .env.example):
- API_KEY, DATABASE_URL, REDIS_URL, MINIO_* (endpoint, credentials, bucket)
- RESULTS_DIR, ALERTS_DIR, EVIDENCE_DIR
- CORS_ORIGINS
- Frontend: NEXT_PUBLIC_API_BASE_URL, NEXT_PUBLIC_API_KEY

## Repository Structure Notes

- `results/` contains generated outputs (alerts, evidence, metrics)
- `docs/` has architecture diagrams and sequence flows
- `evaluation/` includes metrics computation for precision/recall
- `.github/workflows/ci.yml` defines the CI/CD pipeline
- All Python code follows Black formatting (line length 100)
- Frontend uses ESLint + Prettier for code quality

## API Endpoints (selected)

- POST /api/demo/sebi_storyline — Start curated typologies (logs via WS)
- POST /api/run_demo — Start generic demo run
- GET /api/alerts — Paginated list; filters: anchored, min_score
- GET /api/alerts/{id} — Alert details
- GET /api/alerts/{id}/explanation — Explainability data
- GET /api/alerts/{id}/viz3d — 3D network HTML
- GET /api/alerts/{id}/verify_chain — HMAC chain verification
- POST /api/alerts/{id}/download_pack — ZIP pack with artifacts
- Case endpoints: create/list/get/assign/comment/link_alert/report
- WebSocket /ws/realtime — Live alerts; /ws/tasks/{id} — Task logs

## Judge/Demo Mode

- One-command start: docker compose up -d --build (or make dev)
- UI: http://localhost:3000, API: http://localhost:8000/docs
- Dashboard → “SEBI Storyline ▶” starts a curated run (logs via WS)
- Alerts page should populate within seconds (WS + 2s refetch)
- Alert detail: Explain, 2D Graph, 3D Network, Verify HMAC Chain, Downloads
- Cases: create/assign/comment/link, HTML report (audit log)
- DEMO.md contains a 3-minute judge flow and troubleshooting
