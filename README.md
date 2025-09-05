# IntegrityPlay

Enterprise-grade, real-time market surveillance with explainable AI, graph analytics (2D/3D), case management, and tamper-evident evidence. Built to help regulators, exchanges, and brokers detect and investigate market abuse quickly and defensibly.

## Why this matters (How it helps others)

- Reduce time-to-detection for manipulative trading (wash trades, layering, quote stuffing)
- Provide defensible, audit-ready evidence with HMAC chain-of-custody
- Equip investigators with clear explanations and network visualizations (2D/3D)
- Streamline triage to closure with built-in case management and reports
- Demo-friendly, containerized stack that runs locally with zero cloud dependencies

## What’s unique in this solution

- Realtime WebSockets with auto-reconnect delivering live alerts to the UI
- Explainable AI for each alert (top contributing features, confidence)
- Dual graph views: fast 2D (Cytoscape) and rich 3D (Plotly/NetworkX)
- HMAC chain-of-custody for evidence integrity verification
- Case management with audit logs and downloadable HTML reports
- Rule Counters and ingest metrics surfaced on the dashboard
- Curated SEBI storyline demo highlighting common typologies

## Repository Structure

- backend/
  - main.py — FastAPI API (alerts, cases, demo, metrics, WS endpoints)
  - realtime.py — WebSocket broadcaster (live alerts)
  - explanation.py — Aggregates explainability for alerts
  - ingest_integration.py — Ingest + persistence + HMAC chain
  - models.py, schemas.py — SQLAlchemy models and Pydantic schemas
- frontend/
  - app/ (Next.js App Router pages: dashboard, alerts, cases, demo)
  - components/ (AlertDetailTabs, ExplainPanel, Network3D, Graph2D, etc.)
  - lib/ (api.ts axios client, websocket.ts realtime client)
- docker-compose.yml — Full stack orchestration
- Makefile — Convenience targets (dev, logs, down)
- results/ — Outputs (alerts, evidence, chain files)

## Quick Start

- Prerequisites: Docker Desktop and Git
- Build & Run:
  - `docker compose up -d --build`
- Open:
  - Frontend: http://localhost:3000
  - Backend API Docs: http://localhost:8000/docs
- Start storyline (recommended):
  - From UI: Dashboard → “SEBI Storyline ▶” (or /demo/sebi)
  - API: `POST /api/demo/sebi_storyline` with `X-API-Key: demo_key`

## Core Features at a glance

- Alerts:
  - Live updates via WS, filtering/searching
  - Explain tab, 3D Network tab, 2D Graph tab
  - Verify HMAC Chain, JSON and ZIP export
- Dashboard:
  - Realtime badge, EPS and latency banners, Rule Counters
- Cases:
  - Create/list cases, assign, comment, link alerts, HTML report

## Security and Compliance

- HMAC chaining for evidence files to ensure tamper-evidence
- Immutable audit logs for case actions
- API key auth (default demo_key; configurable)

## Contributing

- Follow existing patterns/idioms in backend (FastAPI) and frontend (Next.js/TypeScript)
- Prefer small, well-scoped PRs with clear descriptions
- Consider adding unit or e2e tests for new features

## License

This repository is provided for demonstration and hackathon purposes. Adapt licensing as needed for production.

## Run the Demo

To run the demo smoothly (requirements, tools, commands, troubleshooting), see DEMO.md.

—

Built for Global Fintech Festival 2025 — SEBI Securities Market Hackathon

