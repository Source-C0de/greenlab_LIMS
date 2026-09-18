GreenLabLIMS KSA — Backend Plan & System Design                                                                                                 
                                                                                                                                               
 ▎ Status: Planning only. No implementation has started. Awaiting your go-ahead before any code is written.

 ---
 1. Context

 GreenLabLIMS KSA today is a React SPA (Vite + React 18 + TypeScript, wouter routing, @tanstack/react-query, Tailwind, Radix UI) that simulates
 a full Laboratory Information Management System. It currently runs entirely on in-memory mock data under src/mock-data/ (samples, clients,
 reagents, invoices, journals, specifications, etc.) and is wired through react-query in the SPA.

 You want a real Python backend that:

 - Owns auth, business logic, and persistence (you chose "Full BFF").
 - Serves the existing React frontend as a JSON API.
 - Runs on a single VPS (DigitalOcean / Hetzner), kept simple.
 - Uses FastAPI in Python.
 - Models a single lab / single tenant with role-based access (admin, analyst, reviewer, client, etc.).

 The deliverable is a step-by-step plan — technology choices, architecture, database, day-by-day schedule, and production rollout — that you can
  follow yourself or hand to a team.

 ---
 2. High-Level System Architecture

 ┌──────────────────────────────────────────────────────────────────┐
 │                         Browser (Users)                          │
 │   Admin / Analyst / Reviewer / Client roles                      │
 └───────────────────────────┬──────────────────────────────────────┘
                             │ HTTPS
                             ▼
 ┌──────────────────────────────────────────────────────────────────┐
 │                 Nginx (reverse proxy + TLS)                      │
 │   - Terminates Let's Encrypt SSL                                 │
 │   - Serves built React SPA static files                          │
 │   - Proxies /api/*  →  127.0.0.1:8000                             │
 └──────────────┬─────────────────────────────────┬─────────────────┘
                │ /api/*                          │ /*
                ▼                                 ▼
 ┌──────────────────────────┐         ┌─────────────────────────────┐
 │   FastAPI app (uvicorn)  │         │   React SPA (Vite build)    │
 │   - JWT auth             │         │   served as static files    │
 │   - REST endpoints       │         │                             │
 │   - Pydantic validation  │         │                             │
 │   - SQLAlchemy ORM       │         │                             │
 │   - Alembic migrations   │         │                             │
 └──────┬──────────┬────────┘         └─────────────────────────────┘
        │          │
        │          │   Redis (cache + Celery broker)
        │          ▼
        │   ┌──────────────────────────┐
        │   │  Celery worker(s)        │
        │   │  - PDF report generation │
        │   │  - Email / OTP           │
        │   │  - Periodic tasks        │
        │   └──────────────────────────┘
        │
        ▼
 ┌──────────────────────────────────────────────────────────────────┐
 │   PostgreSQL 15 (primary store)                                  │
 │   - All lab data: samples, clients, tests, reports, invoices...  │
 └──────────────────────────────────────────────────────────────────┘

 Key design decisions

 - Frontend stays as-is. The React SPA keeps using @tanstack/react-query; we only swap the in-memory mock layer for real fetch calls against
 /api/*. This minimizes frontend churn.
 - Single backend process. FastAPI under Uvicorn behind Nginx. One Celery worker process for async work. No microservices — overkill for
 single-tenant single-lab.
 - PostgreSQL, not MongoDB. LIMS data is highly relational (samples ↔ tests ↔ results ↔ reports ↔ invoices ↔ clients). Relational
 integrity, transactions, and reporting SQL are essential.
 - Redis for Celery + small cache. One Redis instance doubles as the Celery broker and a tiny response cache.
 - Single tenant, role-based. No tenant_id on every row; instead, users have a role enum and per-endpoint permission checks via FastAPI
 dependencies.

 ---
 3. Technology Choices

 ┌────────────────┬────────────────────────────────────────────────────────┬───────────────────────────────────────────────────────────────┐
 │     Layer      │                         Choice                         │                              Why                              │
 ├────────────────┼────────────────────────────────────────────────────────┼───────────────────────────────────────────────────────────────┤
 │ Language       │ Python 3.12                                            │ Stable, well-supported, matches your preference.              │
 ├────────────────┼────────────────────────────────────────────────────────┼───────────────────────────────────────────────────────────────┤
 │ Web framework  │ FastAPI                                                │ Async, auto OpenAPI docs, Pydantic v2 validation, great SPA   │
 │                │                                                        │ backend.                                                      │
 ├────────────────┼────────────────────────────────────────────────────────┼───────────────────────────────────────────────────────────────┤
 │ ASGI server    │ Uvicorn (workers via Gunicorn)                         │ Standard FastAPI deployment.                                  │
 ├────────────────┼────────────────────────────────────────────────────────┼───────────────────────────────────────────────────────────────┤
 │ ORM            │ SQLAlchemy 2.x (async)                                 │ Mature, type-friendly, migration-friendly.                    │
 ├────────────────┼────────────────────────────────────────────────────────┼───────────────────────────────────────────────────────────────┤
 │ Migrations     │ Alembic                                                │ De facto standard for SQLAlchemy.                             │
 ├────────────────┼────────────────────────────────────────────────────────┼───────────────────────────────────────────────────────────────┤
 │ Validation     │ Pydantic v2                                            │ Already on frontend (zod); Pydantic covers backend.           │
 ├────────────────┼────────────────────────────────────────────────────────┼───────────────────────────────────────────────────────────────┤
 │ Auth           │ JWT (access + refresh) via python-jose +               │ Stateless, simple, plays well with SPA.                       │
 │                │ passlib[bcrypt]                                        │                                                               │
 ├────────────────┼────────────────────────────────────────────────────────┼───────────────────────────────────────────────────────────────┤
 │ Background     │ Celery + Redis                                         │ PDFs, emails, scheduled cleanups.                             │
 │ jobs           │                                                        │                                                               │
 ├────────────────┼────────────────────────────────────────────────────────┼───────────────────────────────────────────────────────────────┤
 │ Cache / broker │ Redis 7                                                │ One tool, two roles.                                          │
 ├────────────────┼────────────────────────────────────────────────────────┼───────────────────────────────────────────────────────────────┤
 │ Database       │ PostgreSQL 15                                          │ Relational integrity for lab data, JSONB for flexible spec    │
 │                │                                                        │ fields.                                                       │
 ├────────────────┼────────────────────────────────────────────────────────┼───────────────────────────────────────────────────────────────┤
 │ Reverse proxy  │ Nginx                                                  │ TLS termination, static SPA hosting, /api proxy.              │
 ├────────────────┼────────────────────────────────────────────────────────┼───────────────────────────────────────────────────────────────┤
 │ TLS            │ Let's Encrypt via certbot                              │ Free, automated renewal.                                      │
 ├────────────────┼────────────────────────────────────────────────────────┼───────────────────────────────────────────────────────────────┤
 │ Process        │ systemd                                                │ Built into Ubuntu/Debian, no extra dependency.                │
 │ manager        │                                                        │                                                               │
 ├────────────────┼────────────────────────────────────────────────────────┼───────────────────────────────────────────────────────────────┤
 │ Backups        │ pg_dump + cron + offsite (rclone/Spaces)               │ Simple, reliable.                                             │
 ├────────────────┼────────────────────────────────────────────────────────┼───────────────────────────────────────────────────────────────┤
 │ Observability  │ Sentry (errors) + Promtail → Loki (logs) + Uptime Kuma │ Lightweight, low-ops.                                         │
 │                │  (ping)                                                │                                                               │
 ├────────────────┼────────────────────────────────────────────────────────┼───────────────────────────────────────────────────────────────┤
 │ CI/CD          │ GitHub Actions → SSH to VPS → docker compose pull &&   │ Matches "simple VPS" goal.                                    │
 │                │ restart                                                │                                                               │
 └────────────────┴────────────────────────────────────────────────────────┴───────────────────────────────────────────────────────────────┘

 Why not Django? FastAPI is leaner for a SPA BFF, gives you async I/O, and you don't need Django admin or its ORM conventions here. You'd lose
 the auto-generated OpenAPI docs that are gold for a React frontend.

 Why not MongoDB? Lab data is relational. A Sample has many TestResults, which belong to a Report, which generates an Invoice, which posts to
 Journal entries. SQL expresses this naturally; MongoDB forces denormalization and hand-rolled integrity.

 ---
 4. Database — PostgreSQL Schema (overview)

 Single database greenlims, one schema public. Logical groups:

 Identity & access
 - users (id, email, hashed_password, full_name, role, is_active, created_at)
 - roles enum: admin, analyst, reviewer, client, accountant
 - refresh_tokens (id, user_id, token_hash, expires_at, revoked)

 Clients & people
 - clients (id, name, contact_name, email, phone, address, tax_id, created_at)
 - client_users (link between users and clients for the client portal)

 Samples & workflow
 - sample_types (id, code, name_en, name_ar)
 - samples (id, sample_code, client_id, sample_type_id, received_at, status, due_date, notes)
 - sample_assignments (id, sample_id, analyst_user_id, assigned_at)
 - workflow_stages (id, name, order_index)
 - sample_stage_history (id, sample_id, stage_id, entered_at, exited_at, by_user_id)

 Tests, specifications, results
 - specifications (id, name, version, is_active, created_by, approved_by, approved_at)
 - specification_parameters (id, specification_id, name, unit, method, expected_min, expected_max)
 - tests (id, sample_id, parameter_id, result_value, result_text, status, tested_by, tested_at)
 - test_attachments (id, test_id, file_path, mime_type, uploaded_by)

 Reports
 - reports (id, sample_id, version, status, pdf_path, generated_by, generated_at, approved_by, approved_at)

 Inventory
 - reagents (id, name, catalog_no, quantity, unit, expires_at, location)
 - reagent_usage (id, reagent_id, sample_id, quantity_used, used_by, used_at)

 Invoicing & accounting
 - invoices (id, client_id, number, issued_at, due_at, status, subtotal, tax, total)
 - invoice_lines (id, invoice_id, description, quantity, unit_price, amount)
 - accounts (id, code, name, type) — chart of accounts
 - journals (id, date, memo, posted_by, posted_at)
 - journal_lines (id, journal_id, account_id, debit, credit)

 Notifications
 - notifications (id, user_id, type, payload_json, read_at, created_at)
 - otp_codes (id, user_id, code_hash, expires_at, used_at) — for OTP login

 Indexes on all foreign keys, on samples.sample_code, reports.sample_id, invoices.number, users.email (unique).

 ---
 5. API Surface (REST, JSON, JWT)

 Mounted under /api/v1. OpenAPI auto-generated at /api/v1/docs.

 POST   /api/v1/auth/login              → access + refresh tokens
 POST   /api/v1/auth/refresh
 POST   /api/v1/auth/logout
 POST   /api/v1/auth/forgot-password
 POST   /api/v1/auth/otp-verify

 GET    /api/v1/me
 PATCH  /api/v1/me

 # Clients
 GET    /api/v1/clients                 (paginated, filter, search)
 POST   /api/v1/clients                 (admin only)
 GET    /api/v1/clients/{id}
 PATCH  /api/v1/clients/{id}
 DELETE /api/v1/clients/{id}            (admin only)

 # Samples
 GET    /api/v1/samples                 (filters: status, client, date range)
 POST   /api/v1/samples                 (creates + assigns workflow stage)
 GET    /api/v1/samples/{id}
 PATCH  /api/v1/samples/{id}
 POST   /api/v1/samples/{id}/transitions (move workflow stage)

 # Tests & results
 GET    /api/v1/samples/{id}/tests
 POST   /api/v1/samples/{id}/tests
 PATCH  /api/v1/tests/{id}

 # Reports
 GET    /api/v1/reports
 POST   /api/v1/reports                 → enqueues PDF generation
 GET    /api/v1/reports/{id}
 GET    /api/v1/reports/{id}/pdf

 # Specifications
 GET    /api/v1/specifications
 POST   /api/v1/specifications
 POST   /api/v1/specifications/{id}/approve

 # Inventory
 GET    /api/v1/reagents
 POST   /api/v1/reagents
 POST   /api/v1/reagents/{id}/usage

 # Invoices & accounting
 GET    /api/v1/invoices
 POST   /api/v1/invoices
 GET    /api/v1/accounting/accounts
 GET    /api/v1/accounting/journals
 POST   /api/v1/accounting/journals

 # Notifications
 GET    /api/v1/notifications
 POST   /api/v1/notifications/{id}/read

 # Admin
 GET    /api/v1/admin/users
 POST   /api/v1/admin/users
 PATCH  /api/v1/admin/users/{id}

 Conventions: cursor or offset pagination, ?include= for relations, RFC-7807-style error responses.

 ---
 6. Backend Repository Layout

 backend/
 ├── pyproject.toml             # Poetry or uv
 ├── alembic.ini
 ├── .env.example
 ├── docker-compose.yml         # local dev: api, worker, postgres, redis
 ├── Dockerfile
 ├── app/
 │   ├── main.py                # FastAPI app, middleware, router include
 │   ├── core/
 │   │   ├── config.py          # pydantic-settings, env vars
 │   │   ├── security.py        # JWT, password hashing
 │   │   ├── deps.py            # current_user, require_role
 │   │   └── logging.py
 │   ├── db/
 │   │   ├── base.py            # SQLAlchemy Base
 │   │   ├── session.py         # async engine, session factory
 │   │   └── seed.py            # initial admin + roles
 │   ├── models/                # SQLAlchemy models, one per table
 │   ├── schemas/               # Pydantic v2 schemas (request/response)
 │   ├── api/
 │   │   └── v1/
 │   │       ├── auth.py
 │   │       ├── clients.py
 │   │       ├── samples.py
 │   │       ├── tests_results.py
 │   │       ├── reports.py
 │   │       ├── specifications.py
 │   │       ├── inventory.py
 │   │       ├── invoices.py
 │   │       ├── accounting.py
 │   │       ├── notifications.py
 │   │       └── admin.py
 │   ├── services/              # business logic, no FastAPI imports
 │   │   ├── sample_workflow.py
 │   │   ├── report_generator.py
 │   │   └── pdf_renderer.py
 │   ├── workers/
 │   │   ├── celery_app.py
 │   │   └── tasks.py
 │   └── tests/                 # pytest + httpx AsyncClient
 └── deploy/
     ├── nginx.conf
     ├── greenlims-api.service  # systemd unit
     ├── greenlims-worker.service
     └── backup.sh

 ---
 7. Day-by-Day Schedule (4 weeks, solo backend developer)

 ▎ Working assumption: ~6 productive hours/day, 5 days/week. Adjust if you have more or less time.

 Week 1 — Foundation

 - Day 1: Repo scaffold (backend/), pyproject.toml, docker-compose.yml (api, worker, postgres, redis), .env.example, core/config.py, /health
 endpoint, CI lint + test stub.
 - Day 2: SQLAlchemy Base, async engine/session, Alembic init, first migration (empty), db/seed.py for roles + admin user.
 - Day 3: User model + auth router: register, login (bcrypt + JWT access/refresh), /me, refresh, logout, password hashing, dependency
 get_current_user.
 - Day 4: Client model + CRUD endpoints + Pydantic schemas + pagination + role checks. Write pytest cases for auth and clients.
 - Day 5: Add frontend API client layer (src/lib/api.ts + useApiQuery wrapper around react-query), wire Login + Clients pages to real API.

 Week 2 — Core domain (samples, workflow, tests)

 - Day 6: SampleType, Sample models + Alembic migration; sample CRUD + filtering.
 - Day 7: WorkflowStage, SampleStageHistory, transitions endpoint, sample receiving page integration.
 - Day 8: Specification + SpecificationParameter models, list/create/approve endpoints, parameter library UI.
 - Day 9: Test (result) model, attach results to samples, file upload (local disk in dev, S3-compatible later via boto3).
 - Day 10: Wire samples list, detail, workflow board to API; replace src/mock-data reads in those pages.

 Week 3 — Reports, inventory, accounting, notifications

 - Day 11: Report model, Celery + Redis setup, generate_report_pdf task using WeasyPrint + Jinja2 templates.
 - Day 12: Reports list/detail pages wired; PDF download endpoint.
 - Day 13: Reagent model + usage tracking; inventory page integration.
 - Day 14: Invoice, Account, Journal, JournalLine models; invoices list/detail + accounting dashboard endpoints.
 - Day 15: Notifications model + endpoints + OTP login flow (email via SMTP/SES later). End-to-end smoke test on staging VPS.

 Week 4 — Hardening, deploy, production

 - Day 16: Rate limiting (slowapi), CORS lockdown, request ID middleware, structured JSON logging.
 - Day 17: Error tracking (Sentry), health checks (/health, /ready), basic metrics endpoint.
 - Day 18: Provision VPS: Ubuntu 24.04, install Docker (or native Python 3.12 + systemd), Nginx, Certbot. Wire DNS.
 - Day 19: Write deploy/nginx.conf, systemd units (or docker compose prod profile), deploy/backup.sh (pg_dump + rclone).
 - Day 20: GitHub Actions: lint → test → build image → deploy to VPS. Run a load smoke test (50 concurrent users on dashboard). Final cutover.

 After Week 4 you'll have: a working backend, CI/CD, backups, observability, TLS, and a production URL.

 ---
 8. Production Rollout Checklist

 - VPS provisioned (4 GB RAM / 80 GB SSD is plenty to start), Ubuntu 24.04, non-root user, SSH keys only, ufw allowing 22/80/443.
 - DNS A record → VPS IP.
 - PostgreSQL with pg_hba.conf restricted to localhost; strong greenlims DB password in .env.
 - Redis with requirepass and bind 127.0.0.1.
 - Nginx vhost serving SPA + proxying /api/.
 - Certbot auto-renewal timer enabled.
 - systemd units for greenlims-api and greenlims-worker with Restart=always.
 - Daily pg_dump cron + offsite copy (Spaces/Backblaze/S3).
 - Sentry DSN set in .env.
 - Uptime Kuma pinging /health every 60 s, alerting to email/Telegram.
 - First admin user created via python -m app.db.seed; default password rotated.
 - Frontend VITE_API_BASE_URL set to https://yourdomain/api/v1.
 - SPA built (npm run build) and copied to /var/www/greenlims/.
 - Smoke test: login → create client → receive sample → run test → generate report → issue invoice.

 ---
 9. Risks & Mitigations

 ┌─────────────────────────────────────────┬────────────────────────────────────────────────────────────────────────────────────────────────┐
 │                  Risk                   │                                           Mitigation                                           │
 ├─────────────────────────────────────────┼────────────────────────────────────────────────────────────────────────────────────────────────┤
 │ File uploads fill disk                  │ Set client_max_body_size in Nginx, daily cleanup of orphan uploads, plan S3 swap.              │
 ├─────────────────────────────────────────┼────────────────────────────────────────────────────────────────────────────────────────────────┤
 │ PDF generation is slow under load       │ Celery worker scales horizontally; PDFs are queued, not inline.                                │
 ├─────────────────────────────────────────┼────────────────────────────────────────────────────────────────────────────────────────────────┤
 │ PostgreSQL data loss                    │ Offsite nightly pg_dump + WAL archiving if budget allows.                                      │
 ├─────────────────────────────────────────┼────────────────────────────────────────────────────────────────────────────────────────────────┤
 │ Single VPS is a single point of failure │ Acceptable for single lab; document the upgrade path to a managed Postgres + second VPS.       │
 ├─────────────────────────────────────────┼────────────────────────────────────────────────────────────────────────────────────────────────┤
 │ Bilingual (EN/AR) content               │ Store name_en / name_ar columns where needed; frontend already handles RTL.                    │
 ├─────────────────────────────────────────┼────────────────────────────────────────────────────────────────────────────────────────────────┤
 │ Secrets in .env leak                    │ .env not committed; secrets injected by GitHub Actions from repo secrets; rotate on hire/exit. │
 └─────────────────────────────────────────┴────────────────────────────────────────────────────────────────────────────────────────────────┘

 ---
 10. Files in This Workspace to Touch Later (during implementation)

 These will be modified when we move from plan → implementation:

 - package.json — add @tanstack/react-query dev dep (already present), add src/lib/api.ts.
 - src/lib/queryClient.ts — (new) central API base + auth header injection.
 - src/pages/login.tsx, src/pages/register.tsx, src/pages/otp-verify.tsx, src/pages/forgot-password.tsx — swap mock for real POST /auth/*.
 - src/pages/clients.tsx, src/pages/samples/*, src/pages/reports/*, src/pages/inventory.tsx, src/pages/invoices/*, src/pages/specifications/*,
 src/pages/accounting/* — swap src/mock-data/* reads for react-query calls to /api/v1/*.
 - src/context/AppContext.tsx — fetch GET /me on mount instead of mock user.

 The mock-data files stay (useful for Storybook/tests) until each page is migrated.

 ---
 11. Open Questions for You (before implementation)

 1. Bilingual storage: confirm we should use name_en / name_ar columns for things like sample_types, specifications, accounts.
 2. File storage: start with local disk under /var/greenlims/uploads, or go straight to S3-compatible (DigitalOcean Spaces) from day 1?
 3. Email: transactional email provider (SES, Mailgun, Postmark) or just SMTP from the VPS to start?
 4. Reporting templates: do you want PDFs branded for a specific lab name/logo now, or generic GreenLabLIMS for v1?
 5. Auth extras: do you need SSO (Google/Microsoft) at launch, or is email + password + OTP enough for v1?
 6. Hosting region: DigitalOcean Frankfurt, Hetzner Falkenstein, or somewhere closer to KSA (e.g., DO Bangalore / Bahrain) for latency?