# Multi-Cloud Platform Console

A reference **multi-cloud platform/integration engineering console**: it
tracks migration and integration workstreams running across AWS, Azure, and
GCP (a cluster migration, an observability consolidation, a Kafka topic
redesign — anything a platform engineer is driving to production), scores
each against the signals that matter to a Lead/Senior Platform Engineer
(risk score, deploy latency, monthly cost), and gates anything not yet
reviewed behind an ADR-style approval step before it moves to `approved`.

It is built to demonstrate, end-to-end and runnably, the kind of platform
described across four real job descriptions for Lead Forward-Deployed /
Multi-Cloud Platform Engineer roles: multi-cloud infrastructure (AWS,
Azure, GCP), Architecture Decision Record governance, CI/CD delivery
gates, and the observability/cost discipline expected of a senior platform
engineer running production migrations.

## What this application is

- **Frontend**: a React 18 + TypeScript 5.6 + Vite console — "Multi-Cloud
  Platform Console" — with five tabs (Overview, Workstreams, Analytics,
  Reports, Governance) behind React Router, breadcrumbs, and a header badge
  that reflects the real WebSocket connection state. A sortable/filterable
  data grid (`@tanstack/react-table`), live-updating trend/bar charts
  (`recharts`), and a CSV-exportable report round out the console.
- **Backend**: a FastAPI (Python 3.13) service built around a **ports-and-
  adapters** architecture (`app/adapters/`) — routers depend on `Protocol`
  interfaces, never concrete classes, so the workstream registry,
  telemetry, auth, and cloud-cost-sync backends are all swappable via one
  environment variable each (see "Adapter / Plugin Architecture" below).
  Ships `GET /api/workstreams`, `/summary`, `/history`, `/config`,
  `/audit`, a WebSocket live feed at `/api/ws/workstreams`, and
  `POST /api/workstreams/{id}/approve`.
- **Monorepo tooling**: Nx-driven (`nx run frontend:build`, etc.), so CI
  and local dev only touch the projects that actually changed as the
  repo grows additional apps.
- **Infra**: Dockerfiles for both services, a GKE Terraform module
  (network + private cluster + node pool), and Kubernetes manifests
  (Deployment + Service, readiness/liveness probes, resource limits) for
  both.

## Main components

```
multicloud-platform-console-ts/
├── apps/
│   ├── frontend/         React 18 + TS 5.6 + Vite + TanStack Query/Table + Recharts + Router
│   │   ├── src/pages/    OverviewPage, WorkstreamsPage, AnalyticsPage, ReportsPage, GovernancePage
│   │   └── tests/        unit/ (Vitest+RTL) · integration/ (Vitest+RTL+MSW) · e2e/ (Playwright)
│   └── backend/          FastAPI + Pydantic v2, Python 3.13
│       └── app/adapters/ ports.py, memory.py, noop.py, stubs.py, factory.py
├── infra/
│   ├── terraform/        GKE cluster module (network, private nodes)
│   └── k8s/              Deployment + Service manifests
├── docker-compose.yml    local two-service stack
├── .github/workflows/    CI: backend lint/type/test → frontend lint/test/build → e2e → docker build
├── .pre-commit-config.yaml
└── Makefile
```

## Architecture (wire diagram)

```
┌───────────────────────────────────────────────────────────────────────┐
│  Browser                                                              │
│  ┌─────────────────────────────────────────────────────────────────┐ │
│  │ Multi-Cloud Platform Console                        ● live      │ │
│  ├─────────────────────────────────────────────────────────────────┤ │
│  │  WS: 5  Review: 1  Blocked: 1  Risk: 37.6%  Cost: $21,850.00     │ │
│  │                                                                 │ │
│  │  ┌────────────────────────────────┬──────────┬──────┬────────┐ │ │
│  │  │ Migrate EKS to AKS    [azure]  │ blocked   │ 78.5 │  ...   │ │ │
│  │  ├────────────────────────────────┼──────────┼──────┼────────┤ │ │
│  │  │ Consolidate observ.   [aws]    │ in_review │ 34.0 │ [Ap]   │ │ │
│  │  ├────────────────────────────────┼──────────┼──────┼────────┤ │ │
│  │  │ RAG index Hermes docs [gcp]    │ approved  │ 22.0 │  ...   │ │ │
│  │  └────────────────────────────────┴──────────┴──────┴────────┘ │ │
│  └─────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────┬────────────────────────────────────────┘
                                │ HTTPS  /api/*
                                ▼
                 ┌──────────────────────────────┐
                 │   nginx (frontend container)  │
                 │   serves static build,        │
                 │   proxies /api/* → backend    │
                 └──────────────┬────────────────┘
                                │
                                ▼
                 ┌───────────────────────────────┐
                 │  FastAPI (backend container)   │
                 │  /api/workstreams               │
                 │  /api/summary                   │
                 │  /api/workstreams/{id}/approve  │
                 │  /healthz                       │
                 └──────────────┬────────────────┘
                                │
                                ▼
                 ┌───────────────────────────────┐
                 │  In-memory registry             │
                 │  (MemoryWorkstreamRepository) —  │
                 │  swap for Postgres in prod       │
                 └───────────────────────────────┘
```

## Request flow — approving a workstream

```
User clicks [Approve] on "Consolidate observability"
        │
        ▼
POST /api/workstreams/ws-002/approve
        │
        ▼
MemoryWorkstreamRepository.approve(workstream_id)
        │
        ├─ workstream not found ──► 404 { detail: "Workstream 'ws-002' not found" }
        │
        └─ found ──► status → "approved" ──► 200 Workstream
                                │
                                ▼
                 Frontend invalidates ["workstreams"], ["summary"], ["history"]
                 TanStack Query refetches ──► grid + summary + charts re-render
                                │
                                ▼
                 WebSocket broadcast ──► every open tab updates without polling
```

## Prerequisites

Install these before anything else in this README. Platform-specific steps
below; all three end with `git`, `python3.13`, `node`, `docker`, `terraform`,
and `kubectl` on your `PATH`.

| Tool | Why it's required |
|---|---|
| Git | clone the repo, run pre-commit hooks on `git commit` |
| Python 3.13 | run/test the backend |
| Node.js 22+ | run/build/test the frontend |
| **Docker Desktop / Docker Engine** | `docker compose up` (local stack), `docker build` (CI parity), and the **`hadolint-docker`** pre-commit hook — it runs a container, so without Docker running that hook fails with `Executable 'docker' not found` |
| Terraform (or OpenTofu) | `terraform_fmt` / `terraform_validate` pre-commit hooks, and `infra/terraform` itself |
| kubectl | deploying to GKE |

### Windows 11 — Docker Desktop

```powershell
winget install --id Docker.DockerDesktop -e
```
Launch Docker Desktop once after install and leave it running. If you'll run
pre-commit from WSL2 (recommended, see callout below), enable
**Settings → Resources → WSL Integration → (toggle your distro)** so
`docker` is callable from inside WSL too, without installing a second Docker
engine there.

### Ubuntu (WSL2 or bare metal) — Docker Engine

If Docker Desktop's WSL integration is already enabled, skip this. Otherwise:
```bash
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker "$USER"
newgrp docker
docker run hello-world
```

> ### ⚠️ Windows users: run `git commit` / `pre-commit` from WSL2, not native PowerShell/CMD/Git Bash
> The `terraform_fmt` and `terraform_validate` pre-commit hooks are Bash
> scripts; native Windows Git Bash mangles Windows-style paths when invoking
> them. Do all Git operations for this repo from inside WSL2 Ubuntu, where
> paths are native POSIX and the hooks run exactly as they do in CI:
> ```bash
> cd ~/multicloud-platform-console-ts
> git commit -m "..."
> ```
> If you'd rather stay on native Windows, drop the two Terraform hooks from
> `.pre-commit-config.yaml` and rely on the `terraform` CI job (Linux) as your
> formatting/validation gate instead — everything else (ruff, mypy, eslint,
> hadolint) is unaffected.

### Ubuntu 24.04 (WSL or bare metal / cloud VM) — full toolchain

```bash
# 1. System packages
sudo apt update
sudo apt install -y git python3.13 python3.13-venv python3-pip curl unzip

# 2. Node.js 22+ (via nvm)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
source ~/.bashrc && nvm install 22

# 3. Docker Engine (skip if using Docker Desktop's WSL integration)
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker "$USER"

# 4. Terraform
curl -fsSL https://apt.releases.hashicorp.com/gpg | sudo gpg --dearmor -o /usr/share/keyrings/hashicorp-archive-keyring.gpg
echo "deb [signed-by=/usr/share/keyrings/hashicorp-archive-keyring.gpg] https://apt.releases.hashicorp.com $(lsb_release -cs) main" | sudo tee /etc/apt/sources.list.d/hashicorp.list
sudo apt update && sudo apt install -y terraform

# 5. kubectl
curl -LO "https://dl.k8s.io/release/$(curl -Ls https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
sudo install -o root -g root -m 0755 kubectl /usr/local/bin/kubectl

# 6. Clone and install
git clone https://github.com/<your-org>/multicloud-platform-console-ts.git
cd multicloud-platform-console-ts
make backend-install
make frontend-install
```

### Windows 11 (native, PowerShell) — editing + Docker only

```powershell
winget install --id Git.Git -e
winget install --id Python.Python.3.13 -e
winget install --id OpenJS.NodeJS.LTS -e
winget install --id Docker.DockerDesktop -e
winget install --id Hashicorp.Terraform -e
winget install --id Kubernetes.kubectl -e

git clone https://github.com/<your-org>/multicloud-platform-console-ts.git
cd multicloud-platform-console-ts
py -3.13 -m venv apps\backend\.venv
apps\backend\.venv\Scripts\Activate.ps1
pip install -r apps\backend\requirements.txt pytest httpx ruff mypy
```
Native Windows works for editing, Docker Desktop, and `docker compose up`.
For pre-commit hooks and test suites, WSL2 is recommended.

### Install the pre-commit git hook (all platforms)

```bash
pip install pre-commit==3.8.0
pre-commit install --install-hooks
pre-commit run --all-files   # optional: run once now
```

### Troubleshooting

**`Neither Terraform nor OpenTofu binary could be found` (Windows)** —
Terraform isn't on the `PATH` of the shell Git is running hooks from
(usually installed after the terminal/IDE was opened). Close and reopen your
terminal, verify with `terraform -v`.

**`hadolint-docker` fails or hangs** — Docker Desktop must be running (and,
on WSL, its WSL Integration enabled for your distro). To skip it for one
commit only: `SKIP=hadolint-docker git commit -m "..."` — CI still runs it.

**`backend-mypy` / `frontend-eslint` fail with "command not found"** — run
`make backend-install` / `make frontend-install` first; these hooks reuse
each service's own installed tool rather than an isolated pre-commit env.

## Running locally (without Docker)

```bash
# Terminal 1 — backend
cd apps/backend
python3.13 -m venv .venv && source .venv/bin/activate   # Windows: .venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

# Terminal 2 — frontend
cd apps/frontend
npm install
npm run dev
```
Open http://localhost:5173 — Vite proxies `/api/*` to `localhost:8000`.

## Running with Docker

```bash
docker compose up --build
```
Frontend: http://localhost:8080 · Backend: http://localhost:8000/healthz

## Testing strategy — unit, integration, and E2E

Three layers, mirroring the coverage shape of the `architect-ai-showcase`
reference template:

| Layer | Location | Tool | What it exercises |
|---|---|---|---|
| **Unit** | `apps/frontend/tests/unit/`, `apps/backend/tests/` | Vitest + Testing Library (frontend), pytest (backend) | A single component (`WorkstreamsGrid` sorts/filters, `SummaryBar` renders its stats, `Breadcrumbs` labels each route) or a single backend module (the in-memory repository/adapters, endpoint status codes) in isolation. |
| **Integration** | `apps/frontend/tests/integration/` | Vitest + Testing Library + MSW (mocked backend) | The full `<App>` — routing, TanStack Query, and the approve mutation — wired together against a mocked `/api/*`, verifying an action on one tab (approving a workstream on Workstreams) is reflected on another (the audit trail on Governance) without a real backend running. |
| **E2E** | `apps/frontend/tests/e2e/` | Playwright, against the real built frontend + real FastAPI backend | Tab navigation updates the URL and breadcrumb, the Workstreams grid filter/sort actually works in a real browser, and an approval made through the real UI produces a real audit event via the real WebSocket-driven refresh. |

```bash
# backend
cd apps/backend && source .venv/bin/activate
ruff check app && mypy app --ignore-missing-imports && pytest -q

# frontend — unit + integration (fast, mocked backend, run in CI's `frontend` job)
cd apps/frontend
npm run lint
npm run test              # tests/unit + tests/integration together
npm run test:unit         # unit only
npm run test:integration  # integration only
npm run test:coverage     # adds a coverage/ report (text + html + lcov)
npm run build

# frontend — E2E (needs the real backend running; run in CI's `e2e` job)
cd apps/backend && source .venv/bin/activate && uvicorn app.main:app --port 8000 &
cd apps/frontend
npx playwright install --with-deps chromium   # once, downloads browser binaries
npm run build
npm run test:e2e          # builds nothing itself — starts `vite preview` via Playwright's webServer
```

E2E notes: `playwright.config.ts`'s `webServer` starts `npm run preview`
(the built frontend on port 4173) automatically; the **real backend must
already be running** on port 8000 separately, since `vite preview`'s
`/api` proxy (configured in `vite.config.ts`) forwards to it. The approval
test is written to be safe to re-run against a long-lived backend: it
`test.skip()`s itself if no workstream is currently `in_review` (e.g. a
prior run already approved it), rather than failing on stale state. The
grid filter/sort test also waits for the first row to actually render
before capturing its baseline row count, avoiding a race against the
initial API fetch.

## Deploying to the cloud (GKE)

```bash
cd infra/terraform
terraform init
terraform apply -var="project_id=<your-gcp-project>"

# Point kubectl at the new cluster
gcloud container clusters get-credentials multicloud-platform-console --region us-east1

# Build & push images (replace with your registry), then:
kubectl apply -f ../k8s/backend.yaml
kubectl apply -f ../k8s/frontend.yaml
kubectl get svc frontend   # EXTERNAL-IP once the LoadBalancer provisions
```

## Why this project, why these choices

The four source JDs (Deloitte Lead FDE, EY Advanced Forward Engineering,
ServiceNow's cloud-infra requirement, and Ramp's platform-scale bullet)
share a common core: run and govern multi-cloud infrastructure and
integration work in production, with cost, latency, and risk visibility,
and change-control gates. Each choice below is justified against that
union of requirements:

| Choice | Why |
|---|---|
| **React 18 + TypeScript 5.6 + Vite** | Fast iteration for a data-dense platform console; TypeScript keeps the `Workstream`/`ConsoleSummary` contract in sync between UI and API. |
| **TanStack Query with a WebSocket-driven cache invalidation** | A platform console is inherently a live-monitoring surface; a broadcast-on-mutation socket is lower latency and lower load than interval polling. |
| **`@tanstack/react-table` for the Workstreams grid** | Sorting/filtering a table by hand accumulates bugs fast; this is the industry-standard headless table library, so the grid gets correct multi-column sort/filter behavior for free. |
| **`recharts` for Analytics** | Declarative, React-idiomatic charting with a small API surface — enough for a risk/blocked trend line and a cost-by-cloud bar chart without pulling in a heavier charting engine. |
| **React Router (tabs as routes) + breadcrumbs** | Makes each tab a real, bookmarkable/shareable URL (`/analytics`, `/reports`) rather than client-only view state. |
| **FastAPI + Pydantic v2 (Python 3.13)** | Mirrors the resume's production Python/FastAPI experience. Pydantic validates the workstream/summary contracts "for free" — meaningful when an approval action changes production infrastructure state. |
| **In-memory `MemoryWorkstreamRepository` behind a `WorkstreamRepository` Protocol** | Keeps the reference app runnable with zero external dependencies while making the seam where a real Postgres-backed store (with an append-only ADR/change-log table) plugs in explicit, typed, and swappable — see "Adapter / Plugin Architecture" below. |
| **Status-gated approval (`in_review` → `approved`)** | Directly demonstrates the ADR / change-control review pattern common to platform-engineering delivery — a workstream doesn't move to `approved` without a recorded, auditable action. |
| **`cloud` as a first-class field on every workstream** | Multi-cloud is the JDs' explicit ask (AWS/Azure/GCP); making it a queryable/sortable/chartable dimension — not just prose in a name field — is what makes the console actually about multi-cloud platform work. |
| **Vitest + Testing Library (unit) + MSW (integration) + Playwright (E2E)** | Mirrors the three-layer test pyramid from the `architect-ai-showcase` reference template: fast mocked tests run on every CI push (`frontend` job), a real-browser-against-real-backend suite runs in its own CI job (`e2e`) so a slow/flaky E2E run never blocks the fast feedback loop. |
| **Docker multi-stage builds, non-root runtime user** | Slim, reproducible images; the builder stage never ships into the runtime image, shrinking attack surface. |
| **GKE via Terraform, private nodes** | Matches the "cloud environments (AWS/Azure/GCP)" requirement common to all four JDs; private nodes are a baseline control any platform reviewer expects. GCP/GKE is the deployment target here specifically to demonstrate operating a *fourth* cloud's control plane while the app's own domain models AWS/Azure/GCP workloads — the same "cloud-agnostic operations" skill the JDs ask for. |
| **Kubernetes readiness/liveness probes + resource limits** | Table-stakes for anything claiming "production-grade" — without them a stuck container never gets cycled and can starve neighbors. |
| **GitHub Actions split by concern (backend / frontend / e2e / docker)** | Each job fails fast independently, so a frontend lint issue doesn't block backend test feedback, and a slower E2E suite doesn't block either. |
| **pre-commit (ruff, mypy, eslint, hadolint, terraform fmt/validate)** | Catches issues before they reach CI — cheaper for the engineer, and keeps the CI signal meaningful rather than noisy. |
| **Nx workspace** | As the reference monorepo grows (e.g. a second frontend variant, shared TS types package), Nx's dependency graph means CI only rebuilds/retests what actually changed. |

## What the UI looks like — tabs and interactions

- **Overview** (`/`) — the summary bar (7 live stats, including p95 deploy
  latency) plus a "Highest-risk workstreams" grid, sorted by risk score
  descending.
- **Workstreams** (`/workstreams`) — the full sortable, filterable
  `WorkstreamsGrid`: click any column header to sort, type in the filter
  box to narrow by name, cloud, owner, or status; click **Approve** on
  anything `in_review`.
- **Analytics** (`/analytics`) — a risk/blocked-workstream trend line chart
  (from `/api/history`, which grows a new point on every mutation) and a
  monthly-cost-by-cloud bar chart.
- **Reports** (`/reports`) — an aggregated workstream-count/cost-by-cloud
  table with an **Export CSV** button (client-side `Blob` download, no
  backend round-trip).
- **Governance** (`/governance`) — the platform being honest about itself:
  which adapter is live behind each port right now (from `/api/config`),
  and the append-only audit trail (from `/api/audit`) of every approval.
- **Header** — a live-status badge (`● live` / `connecting…` /
  `reconnecting…`) reflecting the WebSocket's actual connection state.
- **Breadcrumbs** under the tab bar always show `Home / <current tab>`.

Every tab shares one `Workstream`/`ConsoleSummary` data source via
TanStack Query, and the WebSocket handler invalidates all of `workstreams`,
`summary`, `history`, and `audit` on every broadcast — so approving a
workstream on the Workstreams tab updates the Overview stats, the
Analytics trend line, and the Governance audit trail without a manual
refresh anywhere.

## Adapter / Plugin Architecture

This app is built around **ports and adapters** (`apps/backend/app/adapters/`):
routers depend only on `Protocol` interfaces in `ports.py`, never on a
concrete class, and `factory.py` is the *only* place that decides — from
`ADAPTER_*` environment variables — which concrete adapter satisfies each
port. This is what makes each roadmap item below a **swap-in**, not a
rewrite: the router/UI code that calls a port doesn't change when its
adapter changes.

```
                     ┌───────────────────────────┐
                     │  routers/workstreams.py,   │
                     │  ws.py, meta.py (call only │
                     │  via Depends(get_x) — never│
                     │  a concrete adapter class) │
                     └─────────────┬─────────────┘
                                   │ Protocol
                                   ▼
        ┌───────────────────────────────────────────────┐
        │  adapters/ports.py                             │
        │  WorkstreamRepository · CloudProviderPort ·    │
        │  TelemetryPort · AuthPort · AuditLogPort        │
        └───────────────────────────────────────────────┘
                                   ▲
                                   │ implements
        ┌──────────────────────────┴──────────────────────────┐
        │                                                       │
┌───────┴────────┐  ┌──────────────┐  ┌───────────────────────┐│
│ adapters/       │  │ adapters/    │  │ adapters/stubs.py      ││
│ memory.py       │  │ noop.py      │  │ (Postgres, cloud cost, ││
│ (default, live) │  │ (default)    │  │  OTel, OIDC — inactive)││
└─────────────────┘  └──────────────┘  └───────────────────────┘│
                                   ▲                              │
                                   │ selected by                  │
                          adapters/factory.py  ◄────────ADAPTER_* env vars
```

Each roadmap item maps to a specific set of files to change or add —
nothing else in the codebase needs to move:

### 1. Postgres-backed workstream registry + ADR audit log

| Do this | In this file |
|---|---|
| Implement all 5 `WorkstreamRepository` methods against a real DB | `adapters/stubs.py::PostgresWorkstreamRepository` (already stubbed with the exact method signatures) |
| Implement `record`/`all_events` as INSERT/SELECT | `adapters/stubs.py::PostgresAuditLog` |
| Add `asyncpg` (or `sqlalchemy[asyncio]`) | `apps/backend/requirements.txt` |
| Register the new adapter | `adapters/factory.py::ADAPTER_REGISTRY["workstream_repository"]["postgres"] = "postgres"`, and branch `get_workstream_repository()` on it |
| Point at the DB | Set `ADAPTER_WORKSTREAM_REPOSITORY=postgres` and `ADAPTER_POSTGRES_DSN=...` |
| New | A `migrations/` folder (Alembic) defining the `workstreams` and `audit_events` tables, with `audit_events` insert-only (never UPDATE/DELETE) so it functions as a real ADR trail |

**No changes needed** in `routers/workstreams.py`, `routers/meta.py`, or
any frontend file — they already call the port, not the class.

### 2. Real AWS/Azure/GCP cost & usage sync

| Do this | In this file |
|---|---|
| Implement `sync_cost_and_usage` to call the relevant cloud's billing API based on the workstream's `cloud` field | `adapters/stubs.py::MultiCloudCostExplorer` |
| Add `boto3` (AWS), `azure-mgmt-costmanagement` (Azure), and/or `google-cloud-billing` (GCP) | `requirements.txt` |
| Register it | `factory.py::get_cloud_provider()` (new function, mirrors `get_workstream_repository`) |
| New route | `routers/workstreams.py::POST /api/workstreams/{id}/sync-cost` calling `provider.sync_cost_and_usage(...)`, writing the result back through the `WorkstreamRepository` |
| New UI | A "Sync cost" button on the Workstreams tab (`WorkstreamsPage.tsx`) posting to the new route, and a "last synced" timestamp column |
| Point at it | Set `ADAPTER_CLOUD_CREDENTIALS_PATH=/path/to/creds` |

### 3. OpenTelemetry → Grafana/Tempo

| Do this | In this file |
|---|---|
| Implement `start_span`/`record_metric` for real | `adapters/stubs.py::OtelTelemetry` |
| Add `opentelemetry-sdk`, `opentelemetry-exporter-otlp` | `requirements.txt` |
| Register it | `factory.py::get_telemetry()`, set `ADAPTER_TELEMETRY=otel` |
| Wrap request handling | `main.py` — add `FastAPIInstrumentor.instrument_app(app)` |
| Surface real p95, not the sampled one | `AnalyticsPage.tsx` — point its latency panel at an OTel-backed metrics endpoint instead of `/api/history` |
| New infra | A Grafana/Tempo stack (Helm chart or `docker-compose.observability.yml`) |

### 4. OIDC role-scoped auth

| Do this | In this file |
|---|---|
| Implement `current_user`/`require_role` against real JWTs | `adapters/stubs.py::OidcAuth` |
| Add `python-jose` or `authlib` | `requirements.txt` |
| Register it | `factory.py::get_auth()`, set `ADAPTER_AUTH=oidc`, `ADAPTER_OIDC_ISSUER`, `ADAPTER_OIDC_AUDIENCE` |
| Enforce it | `routers/workstreams.py::approve_workstream` — add `user: str = Depends(lambda: get_auth().require_role(token, "approver"))`, pass `user` (not `"anonymous"`) into `repo.approve(workstream_id, approved_by=user)` |
| New UI | A login/token step before the Workstreams tab is usable; the Governance audit table already renders whatever `actor` string it's given |

### 5. Shared types library (frontend ↔ its JS-variant sibling)

| Do this | In this file |
|---|---|
| Move `types.ts`'s interfaces verbatim | New `libs/shared-types/index.ts` (a new Nx library) |
| Re-export from both frontends | `apps/frontend/src/types.ts` (this repo) and the JS-variant repo's equivalent become one-line re-exports of the shared lib |
| Register the Nx project | `libs/shared-types/project.json`, and add it to both apps' `tsconfig.json` `paths` |

None of these five require touching `App.tsx`'s route table, `main.py`'s
router registration, or any test file beyond the one covering the adapter
being replaced — that isolation is the point of the ports-and-adapters
split.
