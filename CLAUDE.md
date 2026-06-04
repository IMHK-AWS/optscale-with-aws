# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What is OptScale

OptScale is an open-source FinOps and MLOps platform for cloud cost optimization across AWS, Azure, GCP, Alibaba Cloud, and Kubernetes. It is structured as a large microservices monorepo with 45+ services, each independently deployable as a Docker container into Kubernetes.

## Commands

### Python Services
Each Python service has a `run_test.sh` script that runs linting and tests:
```bash
./rest_api/run_test.sh
./auth/run_test.sh
./herald/run_test.sh
```

To run individually after `uv sync`:
```bash
cd <service>
uv sync
uv run pycodestyle <service_dir>/   # or ruff format/check for newer services
uv run pylint .
uv run pytest -n auto <service_dir> --disable-warnings
```

`rest_api` and `auth` use pycodestyle + pylint. `herald` and newer services use ruff.

### Frontend (ngui)
```bash
cd ngui
pnpm install
pnpm dev           # dev server (both GraphQL server + React UI)
pnpm check         # ESLint
pnpm fix           # ESLint autofix
pnpm test          # UI tests
pnpm translate:check  # i18n translation validation
```

### Building Docker Images
```bash
./build.sh                        # build all services
./build.sh <component> [tag]      # build one service
./build.sh --no-cache             # force clean build
./build.sh --use-nerdctl          # use nerdctl instead of docker
```

### Alembic Migrations
`rest_api` and `auth` manage DB schemas with Alembic. Migration checks run as part of their `run_test.sh`. To run manually:
```bash
cd rest_api
uv run tools/check_alembic_down_revisions/check_alembic_down_revisions.py \
  --alembic_versions_path rest_api/rest_api_server/alembic/versions
```

## Architecture

### Service Categories

| Category | Services |
|---|---|
| Core APIs | `rest_api` (port 8999), `auth`, `config` |
| Frontend | `ngui` (GraphQL/Apollo server port 4000 + React UI) |
| Notifications | `herald` (email/Slack dispatcher), `slacker`, `jira_bus` |
| Cloud Data Ingestion | `diworker`, `diproxy`, `trapper_scheduler/worker` |
| Cost Analysis | `gemini_*`, `bumischeduler/worker`, `risp_*`, `insider_*` |
| Metrics | `metroculus_*`, `katara_*`, `keeper` |
| Executors (async job runners) | `herald_executor`, `keeper_executor`, `slacker_executor`, `webhook_executor` |
| Cleanup/Maintenance | `cleanmongodb`, `layout_cleaner`, `demo_org_cleanup`, `bailiff` |
| Infrastructure | MariaDB, MongoDB, ClickHouse, Redis, RabbitMQ, etcd |

### Technology Stack
- **Python 3.12+** with **uv** for all backend services; Tornado as the HTTP framework for APIs
- **SQLAlchemy + Alembic** for relational data (MariaDB); **MongoEngine** for document data (MongoDB)
- **Kombu** for RabbitMQ message passing between scheduler/worker pairs
- **React + TypeScript + Vite** for the UI; **Apollo Client** (GraphQL) to the `ngui` server; `ngui/server` is an Express.js GraphQL gateway that proxies to backend REST APIs

### Service Communication Pattern
Most services expose a REST API consumed by other services via thin client libraries in `optscale_client/`. Workers are triggered by scheduler services through RabbitMQ queues. The `rest_api` is the primary integration point; `auth` is called by nearly every service for token validation.

### Shared Libraries
- `optscale_client/` — REST client wrappers for each service
- `tools/` — shared utilities: `optscale_exceptions`, `optscale_telemetry` (OTEL), `cloud_adapter` (multi-cloud SDK abstraction), `optscale_types`, etc.

### OpenTelemetry
Instrumentation is being added incrementally. `tools/optscale_telemetry` provides a shared OTEL setup used by `auth`, `diworker`, and others.

### Frontend Structure
`ngui/` is a pnpm workspace:
- `ngui/server/` — Express + Apollo GraphQL server (TypeScript), proxies to REST APIs
- `ngui/ui/` — React SPA (TypeScript, Vite, MUI), talks only to the GraphQL server
- `ngui/ui/src/translations/` — i18n strings; run `pnpm translate:check` after adding new keys

## Demo Presentation (`demo-presentation/`)

A single-file HTML deck built for the **AI+ Power 2026** talk: *"Agentic FinOps for Multi-Cloud"* by John NG (Partner Solution Architect). 10-minute slot covering demo + Q&A, audience is general public.

### Key files
| File | Purpose |
|---|---|
| `presentation.html` | The entire deck — all CSS and JS inline, no build step |
| `screenshots/` | Real screenshots used in the Demo slide (OptScale dashboard, AWS Quick Suite Chat Agent, recommended actions table) |
| `solution-architecture/OptScale-QuickSuite-Page-1.drawio.png` | Technical architecture diagram (shown in appendix slide 6) |
| `linkedin/linkedin-qr-code.jpeg` | QR code for slide 7 LinkedIn CTA |
| `pdfs/` | Exported PDF versions |

### Deck structure (7 slides)
1. **Title** — dark hero
2. **Problem** — split layout (dark left / light right), builder-voice frustration narrative
3. **Story strip** — 4 plain-English cards: bills flow in → spike spotted → AI proposes fix → human approves
4. **Demo walk-through** — 3 screenshot panels with real images
5. **Honest takeaways** — 4 builder lessons
6. **Technical architecture** — appendix with drawio PNG (for technical Q&A)
7. **Q&A** — dark hero with LinkedIn QR card

### Presentation editing rules
- **Human-in-the-loop**: the workflow requires human approval before any action executes — never imply full autonomy
- **Builder tone**: first-person, honest, demo-focused; avoid salesy/marketing language
- **No Ingram Micro branding** in this deck
- **Placeholder demo URL** on slides 4 and 5: `https://your-demo-link-here.example.com` — replace with live link before presenting
- PDF export: Chrome → Cmd+P → Save as PDF → Landscape → Margins: None → Background graphics ON

### HTML deck architecture
- Horizontal scroll via `transform: translateX(-N * 100vw)` on `#deck`
- `@page { size: 297mm 167mm; margin: 0; }` for print (never use px-based page sizes)
- Nav bar is `position: fixed` — all content containers need `padding-bottom: 90px` on screen, overridden to `44px` in `@media print`
- Each slide has a `<img class="print-logo">` as first child for PDF export (the fixed `#im-logo` doesn't repeat across print pages)

## Deployment

Deployments target Kubernetes via Ansible playbooks in `optscale-deploy/`. For local dev, `ngui/` and `bi_exporter/` have docker-compose files. Minimum production hardware: 8 CPU cores, 16 GB RAM, 150 GB SSD.

```bash
cd optscale-deploy
./runkube.py --with-elk -o overlay/user_template.yml -- <deployment_name> <version>
./runkube.py --no-pull -o overlay/user_template.yml -- <deployment_name> local  # local images
```
