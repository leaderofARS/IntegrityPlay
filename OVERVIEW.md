# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

IntegrityPlay is a privacy-first real-time market surveillance system designed for financial markets. It's a full-stack application built for the **Global Fintech Festival 2025 SEBI Securities Market Hackathon** that detects financial fraud (wash trades, layering, circular trading) with tamper-evident evidence packs and privacy-preserving consortium sharing.

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
black --check .             # Check Python code formatting
ruff check .                # Run Python linter
npm --prefix frontend run lint  # Run frontend linting
```

### Manual Execution
```bash
./scripts/run_demo.sh --no-throttle        # Run demo pipeline directly
python attack_simulator.py                 # Generate synthetic attack data
python app/ingest.py --help                # See ingestion options
```

## Architecture Overview

### High-Level Flow
**Attack Simulator** → **Ingest** → **Graph Adapter** → **Detector** (rules + optional ML) → **Narrative Engine** → **Evidence Anchor** → **Federated Stub**

### Core Components

#### Backend Services (FastAPI)
- **main.py**: FastAPI application with REST API endpoints
- **ingest_integration.py**: Bridge between app/ detection pipeline and web API
- **tasks.py**: Asynchronous task management for demo runs
- **models.py/schemas.py**: SQLAlchemy models and Pydantic schemas for alerts
- **storage.py**: MinIO integration for file storage

#### Detection Pipeline (app/)
- **ingest.py**: Event ingestion with streaming, throttling, and webhook support
- **detector.py**: Core fraud detection engine with rule-based + optional ML scoring
- **graph_adaptor.py**: Graph-based relationship analysis between accounts
- **rule_engine.py**: Rule-based signal evaluation
- **narrative.py**: Converts alerts to human-readable narratives

#### Frontend (Next.js + TypeScript)
- React application with TanStack Query for API state management
- Cytoscape.js for graph visualization
- Recharts for metrics visualization
- Tailwind CSS for styling

#### Tools & Scripts
- **tools/anchor_evidence.py**: Blockchain anchoring for tamper-evident evidence
- **tools/federated_stub.py**: Privacy-preserving consortium simulation
- **attack_simulator.py**: Generates deterministic synthetic market manipulation scenarios

### Data Flow
1. Events ingested via JSON/JSONL files or webhook API
2. Graph adapter builds account relationship networks
3. Detector applies rule-based scoring + optional ML anomaly detection
4. Alerts enriched with narrative summaries and evidence packs
5. Evidence optionally anchored to blockchain for tamper-evidence
6. Results stored in PostgreSQL + MinIO, accessible via REST API

### Key Technologies
- **Backend**: FastAPI, SQLAlchemy, PostgreSQL, Redis, MinIO
- **Frontend**: Next.js, TypeScript, TanStack Query, Cytoscape.js
- **Detection**: NetworkX for graphs, optional scikit-learn for ML
- **Infrastructure**: Docker Compose for local development

## Development Patterns

### Alert Structure
All alerts follow a consistent schema with:
- `alert_id`, `scenario`, `detected_at`, `score`
- `cluster_accounts` (involved accounts)
- `evidence_path` (JSON evidence pack)
- `narrative` (human-readable summary)
- Optional `anchor_tx` for blockchain verification

### Event Processing
Events are processed through a sliding window detector that:
- Maintains recent event history (default 300 seconds)
- Tracks account statistics and relationships
- Applies multiple detection algorithms simultaneously
- Emits alerts when thresholds are exceeded

### Testing Strategy
- Unit tests in `backend/tests/` for core business logic
- End-to-end tests using Playwright for UI workflows
- Demo pipeline serves as integration test
- Deterministic data generation ensures reproducible results

### Environment Configuration
All services configured via environment variables:
- Database, Redis, MinIO connection strings
- API keys and CORS settings
- Feature flags (ML weights, detection thresholds)
- File paths for results and artifacts

## Repository Structure Notes

- `results/` contains generated outputs (alerts, evidence, metrics)
- `docs/` has architecture diagrams and sequence flows
- `evaluation/` includes metrics computation for precision/recall
- `.github/workflows/ci.yml` defines the CI/CD pipeline
- All Python code follows Black formatting (line length 100)
- Frontend uses ESLint + Prettier for code quality

## API Endpoints

Key endpoints for integration:
- `POST /api/run_demo` - Trigger full demo pipeline
- `GET /api/alerts` - Paginated alert listing  
- `GET /api/alerts/{id}` - Individual alert details
- `POST /api/alerts/{id}/download_pack` - Download evidence ZIP
- `POST /api/ingest` - Manual event ingestion
- `WebSocket /ws/tasks/{id}` - Real-time task progress

## Judge/Demo Mode

The system is designed for deterministic demonstration:
- `make dev && navigate to localhost:3000` for full UI demo
- `./scripts/run_demo.sh --no-throttle` for command-line demo
- Always produces `ALERT-DEMO-001` fallback if no natural alerts occur
- Docker setup ensures consistent environment across machines
