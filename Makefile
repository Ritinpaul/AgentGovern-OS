.PHONY: help install dev up down migrate seed test lint format clean demo

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-15s\033[0m %s\n", $$1, $$2}'

install: ## Install production dependencies
	pip install -e .

dev: ## Install dev + ml dependencies
	pip install -e ".[dev,ml]"
	pre-commit install

up: ## Start all services via Docker Compose
	docker compose up -d

down: ## Stop all services
	docker compose down

migrate: ## Run Alembic migrations
	cd services/governance-api && alembic upgrade head

seed: ## Seed demo data
	python scripts/seed_demo.py

test: ## Run all tests
	pytest tests/ -v --cov

lint: ## Lint codebase
	ruff check .
	mypy services/

format: ## Auto-format codebase
	ruff check --fix .
	ruff format .

clean: ## Remove caches and build artifacts
	find . -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null; true
	find . -type d -name .pytest_cache -exec rm -rf {} + 2>/dev/null; true
	find . -type f -name "*.pyc" -delete 2>/dev/null; true

demo: ## Start full demo stack and seed data
	docker compose up -d
	sleep 5
	python scripts/seed_demo.py
	@echo "\n✅ AgentGovern OS demo ready at http://localhost:8000/docs"
