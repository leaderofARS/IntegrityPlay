SHELL := /usr/bin/env bash
.ONESHELL:

.DEFAULT_GOAL := help

PROJECT_NAME := integrityplay
COMPOSE := docker compose

help:
	@echo "Targets: dev, demo, test, ci, down, logs"

env:
	@test -f .env || cp .env.example .env

# Start full stack for local dev
dev: env
	$(COMPOSE) up -d --build
	@echo "Frontend: http://localhost:3000"
	@echo "Backend:  http://localhost:8000/docs"

# Run demo via API by default (falls back to local if API not reachable)
demo: env
	USE_API=1 bash scripts/run_demo.sh --no-throttle

# Run backend unit tests
 test:
	python -m pip install -r backend/requirements.txt
	python -m pytest -q backend/tests

# CI pipeline (lint, test, demo, e2e)
 ci: env
	python -m pip install -r backend/requirements.txt
	npm --prefix frontend ci || npm --prefix frontend install
	black --check .
	ruff check .
	python -m pytest -q backend/tests
	$(COMPOSE) up -d --build
	USE_API=1 bash scripts/run_demo.sh --no-throttle || (echo "Demo failed" && exit 1)
	npx --yes playwright install --with-deps
	npx --yes playwright test --config frontend/playwright.config.ts

logs:
	$(COMPOSE) logs --no-color --tail=200

down:
	$(COMPOSE) down -v

