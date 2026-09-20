.PHONY: backend-install frontend-install backend-test frontend-test lint dev

backend-install:
	cd apps/backend && python3.13 -m venv .venv && . .venv/bin/activate && pip install -r requirements.txt pytest httpx ruff mypy

frontend-install:
	cd apps/frontend && npm install

backend-test:
	cd apps/backend && . .venv/bin/activate && pytest -q

frontend-test:
	cd apps/frontend && npm run test

lint:
	cd apps/backend && . .venv/bin/activate && ruff check app && mypy app --ignore-missing-imports
	cd apps/frontend && npm run lint

dev:
	docker compose up --build
