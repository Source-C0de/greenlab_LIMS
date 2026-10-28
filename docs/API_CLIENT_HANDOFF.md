# Task 4 — Project Handoff

> **Scope note.** This document records the **verified** state of the frontend
> API client against the shipped FastAPI backend. It separates three things
> that are easy to conflate:
>
> - **Verified** — read directly from source in one of the two repositories.
> - **Intended** — what the frontend docs / code comments say should happen.
> - **UNKNOWN** — not established by inspection.
>
> No application code was modified while producing this document.
>
> **Lineage warning.** `docs/api/` in this repo is a *pre-implementation*
> contract written before the backend existed. The backend was built to a
> **different** contract. Where the two disagree, the **backend source is
> authoritative** and the frontend docs are wrong. See
> [Docs vs. Code Disagreements](#docs-vs-code-disagreements).

## Status

- Task: Audit and Standardize the Frontend API Client
- Phase: **Audit complete — no implementation performed yet.**
- Frontend repository: `F:/Project/Lims` (git branch `feature/frontend-api-client`, HEAD `5730fca`)
- Backend repository: `F:/Project/lims_backend`
- Last verified: **2026-10-27**

### Audit outcome in one paragraph

The frontend API client is **well-architected** — a single `apiFetch` primitive,
explicit (not global) envelope unwrapping, a centralized bilingual error-code
map, a ports-and-adapters DI container, and a race-free auth session adapter
with proactive token renewal. Its understanding of the backend's **envelope
contract is accurate and verified against source**. Its understanding of the
backend's **route paths, request bodies, and auth endpoint set is wrong in
seven concrete places** (F2–F7), all of which will produce HTTP 404 or 422 at
runtime, plus one further latent base-URL trap (F1). None of these are
architectural problems — they are contract-drift bugs concentrated in
`src/infrastructure/api/auth.ts` and the base-URL handling in
`src/infrastructure/api/api.ts`.

## Architecture

### Frontend

| Property | Value | Evidence |
|---|---|---|
| Framework | React 18.3.1 + TypeScript 5.9.3 | `package.json` |
| Build tool | Vite 6.0.7 (dev server on port 3000) | `vite.config.ts:19` |
| Package manager | npm (`package-lock.json` present) | `package.json` |
| Routing | **Wouter 3.3.5** — not React Router | `package.json` |
| Server state | TanStack Query 5.64.1 | `package.json`, `src/App.tsx` |
| Layered architecture | `domain/` · `infrastructure/` · `presentation/` · `shared/` | `src/` tree |
| HTTP library | **None** — hand-rolled `fetch` wrapper | `src/infrastructure/api/api.ts:120` |
| Validation | Zod 3.24.1 (used for forms, not for wire payloads) | `package.json` |
| i18n | Hand-rolled via `AppContext.language` (no `react-i18next`) | `src/presentation/providers/AppContext.tsx` |

> **Correction to `PUKU.md`.** The root `PUKU.md` describes a flat layout
> (`src/lib/api.ts`, `src/lib/queries.ts`, `src/mock-data/`, `src/components/`).
> That layout **no longer exists**. The repo has since been restructured into
> the four-layer tree above, and the API client now lives at
> `src/infrastructure/api/`. `src/lib/api.ts` and `src/mock-data/` do not
> exist. `PUKU.md` is stale and should be updated separately.

### Backend

| Property | Value | Evidence |
|---|---|---|
| Framework | FastAPI (Python) | `app/main.py` |
| ORM | SQLAlchemy 2.x **async** (not Prisma, not raw SQL) | `app/db/session.py:96`, `app/core/deps.py:74` |
| Migrations | Alembic 1.20.0 | `requirements.txt:38` |
| Engines | PostgreSQL (`postgresql+asyncpg`, prod) **or** SQLite (`sqlite+aiosqlite`, dev/test default) | `app/core/config.py:47,64` |
| Test framework | **pytest 9.1.1** + `pytest-asyncio` (`asyncio_mode = auto`) | `requirements.txt:53-54`, `pytest.ini:2` |
| Route surface | 66 paths / 95 operations | `scripts/check_routes.py` → `docs/openapi_baseline.json` |
| Lint / types | `ruff` (lint), `mypy` (typecheck) | `Makefile:215-228` |

### Backend API prefixes (two, not one)

| Surface | Prefix | Evidence |
|---|---|---|
| Tenant API | **`/api/v1`** | `app/api/v1/__init__.py:26` |
| Superadmin API | **`/api/superadmin`** | `app/api/v1/superadmin.py:17` |

Both are mounted on the app at `app/main.py:459-460`. OpenAPI/docs are served
at `/api/v1/docs`, `/api/v1/redoc`, `/api/v1/openapi.json` (`app/main.py:113-115`).

## Previous API Contract Tasks

The source conversation did not contain a completed Task 1–3 transcript, and
the repository contains no `docs/TASKS.md`, `docs/ARCHITECTURE.md`, or
`docs/API_CONTRACT.md` (the files the agent profile expects to read). The
agent profile also references `docs/TASK_4_HANDOFF.md`; the actual file on
disk is `docs/API_CLIENT_HANDOFF.md`.

Task 1–3 outcomes are therefore **UNKNOWN** from the documentation alone.
What *can* be verified is the resulting code state, recorded below.

### Task 1

- Intended outcome: **UNKNOWN** — no task statement is present in the repo.
- Verified implementation: The **canonical enveloped response contract** was
  adopted client-side. Evidence: `src/infrastructure/api/response.ts` declares
  `SuccessEnvelope<T>`, `ApiMeta`, `Pagination`, `ErrorEnvelope`, plus
  `isSuccessEnvelope` / `isErrorEnvelope` / `unwrapData` / `unwrapPage` /
  `extractValidationIssues` / `getApiErrorCode` / `getApiErrorRequestId`.
  Git history corroborates a dedicated commit: `85a9958 Adopt the canonical
  enveloped response contract on the client`.
- Relevant files: `src/infrastructure/api/response.ts`,
  `src/infrastructure/api/api.ts`, `src/infrastructure/api/errors.ts`

### Task 2

- Intended outcome: **UNKNOWN**.
- Verified implementation: A **ports-and-adapters DI container** exists, with
  the auth adapter selected once at module load rather than branched on in
  20+ call sites. Evidence: `src/infrastructure/di/container.ts` (`API_ENABLED`
  is evaluated once; `auth: API_ENABLED ? httpAuthSession : mockAuthSession`).
  `src/presentation/providers/AuthContext.tsx` contains no `isApiEnabled()`
  branch and imports only the `AuthSession` port.
- Relevant files: `src/infrastructure/di/container.ts`,
  `src/presentation/providers/AuthContext.tsx`,
  `src/infrastructure/api/repositories/authSession.ts`,
  `src/infrastructure/mock/repositories/authSession.ts`

### Task 3

- Intended outcome: **UNKNOWN**.
- Verified implementation: A **layering guard** enforces the one-way
  dependency rule (`presentation` → `infrastructure`/`domain`/`shared`;
  `domain` → `shared` only). Evidence: `scripts/check-layering.mjs`, wired as
  `npm run lint:layers`. The guard was itself load-bearing — `container.ts:10-24`
  documents that it *rejected* the original `application/di/container.ts`
  placement and forced the move to `infrastructure/di/`.
- Relevant files: `scripts/check-layering.mjs`,
  `src/infrastructure/di/container.ts`

## API Contract

### Success envelope

**Verified.** The frontend always requests `X-LIMS-API-Version: enveloped`
(`src/infrastructure/api/api.ts:130-132`), so it receives:

```jsonc
{ "data": <object|array>, "meta": { "request_id": "...", "pagination": {...}? } }
```

- Envelope is built by HTTP **middleware**, not a dependency or decorator:
  `app/main.py:154-254` (`api_version_middleware`) → `app/api/envelope.py:87-146`
  (`wrap_success_body`).
- `data` is the payload; `meta` is always constructed (`app/api/envelope.py:110`).
- `meta.pagination` is present **only** on paginated list endpoints
  (`app/api/envelope.py:116,123`).

**Verified exception — the envelope is not universal.** Three response classes
bypass it entirely, and the frontend's `isSuccessEnvelope` guard
(`response.ts:69-78`, requires both `data` *and* `meta`) will not match them:

| Case | Backend behaviour | Evidence |
|---|---|---|
| 204 / 205 / 304 | Skipped by middleware | `app/main.py:193-194` |
| File download / streaming export (`Content-Disposition`) | Skipped | `app/main.py:202-203` |
| Route with **no declared `response_model`** | Passed through **raw** — no `data`/`meta` at all | `app/main.py:236-243` |

`apiFetch` already returns `undefined` for 204 (`api.ts:163`), so that path is
handled. The **no-`response_model`** case is the live risk: an `enveloped`
caller can receive a bare object with no `data` key, and `unwrapData` would
then silently return `undefined`.

### Error envelope

**Verified.** The frontend's `ErrorEnvelope` (`response.ts:56-59`) matches the
backend's `enveloped` error shape exactly:

```jsonc
{ "error": { "code": "...", "message": "...", "details": {...}? }, "meta": { "request_id": "..." } }
```

- Built by `app/main.py:266-322` (`_error_response`); `enveloped` branch at
  `app/main.py:297-307`.
- `error.details` is **omitted entirely when null** (`exclude_none=True`,
  `app/main.py:305`).
- Backend `ErrorBody` = `code` + `message` + optional `details` + optional
  `request_id` (`app/domains/shared/common.py:89-107`).

**Verified — exception handlers.** `app/main.py:336-451`:
`HTTPException` → status-map code, else `http_error`; `RequestValidationError`
→ **422**, `code="validation_error"`, `details={"errors":[{loc,msg,type}]}`;
`StarletteHTTPException` (unmatched 404/405) → `not_found`/`bad_request`;
`DomainError` → its own code; unhandled `Exception` → **500**,
`code="internal_error"`, generic message, traceback logged only.

**Verified — the frontend's error-code map is complete.** All 22 backend codes
are covered by `CODE_MESSAGES` in `src/infrastructure/api/errors.ts:17-42`
(`http_error` is the sole omission, and it correctly falls through to the
server's own message at `errors.ts:73-78`). The frontend declares **no** code
the backend does not emit. Backend code set, from
`app/domains/shared/errors.py` + `app/main.py:79-90`:

`validation`, `validation_error`, `bad_request`, `unauthorized`, `forbidden`,
`not_found`, `conflict`, `gone`, `stale_write`, `locked`, `rate_limited`,
`internal_error`, `http_error`, `last_admin`, `confirm_mismatch`,
`duplicate_email`, `duplicate_username`, `role_in_use`, `fixed_role_immutable`,
`slug_reserved`, `duplicate_slug`, `self_demotion`, `self_reset`.

### Request ID

**Verified.**

- Header name: **`X-Request-ID`** (exact casing). `app/main.py:140-146`.
- Generated per request: `request.headers.get("X-Request-ID") or str(uuid4())`.
  A **client-supplied id is echoed back, not replaced** — pinned by
  `tests/test_response_contract.py:321-328`.
- Present on **every** response, including 204s and downloads.
- In-body location: `meta.request_id` under `enveloped`
  (`app/main.py:300`); **`error.request_id` under `modern`** (`app/main.py:309-316`).

The frontend reads the header first, then falls back to `meta.request_id`
(`api.ts:170-171`, `response.ts:169-178`). Correct for the `enveloped`
contract it always requests. The `modern`-style location is **not** read —
harmless today, but it is a latent gap if the contract is ever switched.

### Pagination

**Verified — the response shape matches the frontend exactly.**

`meta.pagination` = `{ "limit": int, "offset": int, "total": int }`, all three
required. Evidence: `app/domains/shared/common.py:55-64` (`PaginationInfo`),
`app/api/envelope.py:60-66` (`_pagination_from_paginated`). Pinned by
`tests/test_response_contract.py:70-82`
(`assert set(pagination) == {"limit","offset","total"}`).

`total_pages` is **deliberately dropped** from the wire (`app/core/pagination.py:12-16`).
The frontend's `Pagination` type (`response.ts:36-40`) matches.

**Verified — but the query-parameter style is NOT uniform.** The response is
always `{limit, offset, total}`, but routes *accept* two different param styles:

| Style | Params | Routes |
|---|---|---|
| `limit` / `offset` | `limit` (default 50, 1–200), `offset` (default 0, ≥0) | clients, samples, test-list, test-parameters |
| `page` / `page_size` | `page` (default 1, ≥1), `page_size` | `/admin/users` (default 25, max 100), superadmin tenants, superadmin audit |

Evidence: `app/domains/clients/router.py:34-35`,
`app/domains/users/router_admin.py:87-88`,
`app/domains/superadmin/router_tenant.py:50`.

`/admin/users` uses a plain `page_size` parameter with **no** camelCase alias,
so `pageSize` is **rejected** there; the superadmin tenant route uses
`legacy_choices("page_size")` (`app/domains/shared/naming.py:49-62`) and does
accept `pageSize`.

> **Actionable mismatch.** `usersApi.buildListQuery` sends `pageSize`
> (`usersApi.ts:196-198`) to `/admin/users`, which only accepts `page_size`.
> The parameter is **silently ignored** by FastAPI (unknown query params are
> discarded, not rejected), so the page silently falls back to the server's
> default page size of 25. Same for `limit`/`offset` sent to a `page`-style
> route.

### Authentication strategy

**Verified — JWT Bearer only. Not cookies. Not both.**

- `OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")` — header-based only
  (`app/core/deps.py:33`). No cookie support anywhere (`set_cookie` → 0 hits).
- Access token: **15 min** (`app/core/config.py:78`,
  `app/core/security.py:83`).
- Refresh token: **7 days**, and it is **opaque, not a JWT**
  (`app/core/config.py:79`, `app/core/security.py:90-101` — `token_urlsafe(48)`
  + SHA-256 hash lookup).
- **Refresh tokens rotate.** The presented token is revoked and a fresh pair
  is minted (`app/domains/auth/service.py:160-163`; superadmin:
  `app/domains/superadmin/service_auth.py:200`). The frontend already handles
  this correctly — `authSession.ts:156-157` persists **both** new values.
- Token types are isolated: tenant `access`/`refresh`, superadmin
  `superadmin_access`/`superadmin_refresh`, plus `impersonation`
  (`app/core/security.py:54-58`); `decode_token` enforces exact type match
  (`app/core/security.py:195-202`).
- **No CSRF protection** — 0 hits for `csrf`/`xsrf`/`SameSite`. Coherent with
  Bearer-only auth. The frontend's `credentials: "include"`
  (`api.ts:159`) is therefore unnecessary but harmless.
- **CORS with credentials is enabled** (`app/main.py:119-125`), default
  origins `http://localhost:3000,http://localhost:5173`
  (`app/core/config.py:94`); production refuses a wildcard origin
  (`app/core/config.py:259-260`).
- **Rate limiting is NOT implemented.** `rate_limited` exists only as a 429
  status-map entry (`app/main.py:89`); there are no `X-RateLimit-*` headers and
  no `Retry-After`.

**Frontend token storage** — `localStorage` under `glims_auth_token` /
`glims_auth_refresh` (`src/infrastructure/api/auth.ts:15-16`). The agent
profile says "do not introduce localStorage token storage as a default" — it
**already is** the default here, and changing it would be a redesign of auth
that the profile forbids without evidence of a concrete defect. The backend's
Bearer-only model makes httpOnly cookies impossible without a backend change.
**Flagged for user decision, not acted on.**

### OpenAPI schema / type generation

**Verified — available, but not wired into the frontend.**

- Backend serves a live OpenAPI document at `/api/v1/openapi.json` and
  `/api/v1/docs` (`app/main.py:113-115`).
- A static baseline exists at `app/docs/openapi_baseline.json`
  (66 paths / 95 operations).
- The frontend ships **no** OpenAPI codegen, **no** generated-types directory,
  and **no** dependency on an OpenAPI toolchain. The wire types in
  `src/infrastructure/api/` are all **hand-written**.
- `docs/api/openapi.yaml` in the frontend repo is a **hand-authored,
  pre-implementation** spec that does **not** match the shipped backend (see
  below). It is not machine-generated and is not a reliable type source.

**UNKNOWN:** whether the backend's live `/api/v1/openapi.json` is intended to
become the source of truth for frontend type generation. No codegen tooling
or ADR referencing it was found in either repo.

## Verified Frontend Architecture

### The HTTP primitive

`src/infrastructure/api/api.ts` is the single source of truth for HTTP calls
and is **the only place `fetch` is called in `src/infrastructure/`**. It:

- Prefixes `getBaseUrl()` (`api.ts:41-45`).
- Sets `Accept: application/json` by default (`api.ts:125`).
- Sets `X-LIMS-API-Version: enveloped` as a **default**, overridable per
  request (`api.ts:130-132`).
- Injects `Authorization: Bearer <token>`, preferring the runtime token over
  the `VITE_API_TOKEN` env fallback, and re-reading it on **every** call so
  logout takes effect immediately (`api.ts:137-147`).
- Serializes a JSON body and sets `Content-Type` when a body is present
  (`api.ts:149-153`).
- Defaults `credentials: "include"` (`api.ts:159`).
- Returns `undefined` for **204** without parsing (`api.ts:163`).
- Parses JSON or text based on `Content-Type` (`api.ts:165-167`).
- Throws a structured `ApiError` carrying `status`, `body`, and `requestId`
  (`api.ts:169-173`).
- Reads the error message from `error.message` → top-level `message` →
  `detail` → `HTTP <status>` (`api.ts:82-97`).

### Envelope handling — explicit, not global

**Verified and correct.** There is **no hidden global unwrap**. `apiFetch`
returns the raw parsed body; each client declares whether it wants a single
resource (`unwrapData`) or a page (`unwrapPage`) and unwraps at the call site.
This matches the profile's rule ("do not globally unwrap API response
envelopes until every affected consumer has been inspected") — that inspection
has effectively already been done and the safer design adopted.

### Error normalization

`src/infrastructure/api/errors.ts` is the single error-mapping module:

- `describeApiError(err, lang)` → `{en, ar, code}` for **bilingual toasts**,
  driven by the 22-entry `CODE_MESSAGES` map. Unknown codes fall back to the
  server's own message, mirrored to both languages — information is never lost.
- `describeApiErrorDetailed(err, fallback)` → `{title, description?}` for
  **inline error blocks** (forms, dialogs). Renders FastAPI validation issues
  as `field: message` lines.

The two are deliberately separate functions with distinct names (the
docstring at `errors.ts:80-87` records that they previously shared a name,
which made call sites ambiguous).

### API clients

| File | Endpoints | Notes |
|---|---|---|
| `src/infrastructure/api/auth.ts` | login, superadmin-login, logout, superadmin-logout, me, refresh, register, forgot-password, OTP verify/resend | **Several paths are wrong — see findings.** |
| `src/infrastructure/api/clients/usersApi.ts` | `/admin/users` CRUD, suspend, activate, reset-password, menu-overrides | `normalizeUser` bridges snake_case → camelCase (`usersApi.ts:244-261`) |
| `src/infrastructure/api/clients/rolesApi.ts` | `/admin/roles` CRUD, status, menu-permissions; `/admin/menu-keys` | `normalizeRole` / `normalizeMenuKey` bridges casing (`rolesApi.ts:109-121,150-159`) |
| `src/infrastructure/api/clients/testParametersApi.ts` | `/test-parameters` CRUD | `limit`/`offset` pagination — correct for this route |
| `src/infrastructure/api/clients/testListApi.ts` | `/test-list` CRUD | `limit`/`offset` — correct for this route |

### TanStack Query hooks

`src/infrastructure/api/tanstack-queries.ts` — 20+ hooks. Every one is gated
by `enabled: isApiEnabled()`, so the app remains mock-first. Error handling is
sensible: `useMe` **does not retry on 401** (`tanstack-queries.ts:118-122`),
since a 401 means "no session", not a transient failure.

**Verified quirk:** `useTestParameter(id)` does **not** call
`GET /test-parameters/{id}`. It fetches `limit: 200` and scans the list
(`tanstack-queries.ts:177-186`), because the page has no single-record
consumer. The single-record endpoint *is* implemented
(`testParametersApi.ts:179-181`) but is unused.

### Auth session adapter — the strongest part of the codebase

`src/infrastructure/api/repositories/authSession.ts` is a genuinely careful
implementation:

- **Race guard via a monotonic generation counter**, replacing a 2-second
  timestamp heuristic. The file's header comment
  (`authSession.ts:6-33`) explains the ordering bug it prevents: a slow
  `/auth/me` arriving after a successful login and overwriting the session.
  The generation check is *exact* rather than time-based, so a slow login is
  never discarded.
- **Only a real 401 clears the token** (`authSession.ts:249`). The previous
  bare `catch` treated a 500, network blip, CORS failure, or Vite-HMR abort as
  a dead session and destroyed a valid token.
- **Proactive renewal** with a 30-second skew (`authSession.ts:136,181-186`),
  so a request is never sent with a token that will expire in flight — which
  matters because access tokens live only 15 minutes.
- **Refresh-token rotation is honoured** — both new values are persisted
  (`authSession.ts:156-157`).
- `getTokenExpiry` (`auth.ts:224-247`) decodes the JWT `exp` claim client-side
  as a *hint only*, explicitly documented as non-authoritative.

### Remaining direct HTTP call (outside the client)

**One** `fetch` bypasses `apiFetch`:
`src/presentation/pages/login.tsx:327`, in the `TestBackendButton`
connectivity probe. It builds its own URL from `VITE_API_BASE_URL` and posts
`{}` to `/auth/login`. It does not set `X-LIMS-API-Version`, does not
normalise errors, and duplicates base-URL logic. It is a debug affordance,
not a data path, but it is the one place where the base-URL bug (§Findings F1)
surfaces in the UI.

No `axios`, no `XMLHttpRequest`, no other `fetch` call exists in `src/`.

## Task 4 Decisions

- Preserve existing application behavior and UI.
- Audit before changing application code.
- Keep backend application code unchanged unless authorized.
- Implement only missing or incorrect functionality.
- Add regression tests for affected consumers.

**Status of these decisions:** the audit is complete; **no implementation has
been performed**. No application code was modified. The findings below are
awaiting approval before any edit.

## Findings

Ordered by severity. Each is a **verified** defect with file/line evidence on
both sides.

### F1 — `VITE_API_BASE_URL` silently drops the `/api/v1` prefix (MEDIUM, latent)

`getBaseUrl()` returns the env var **verbatim** (`api.ts:42-44`) and `apiFetch`
concatenates it with the path (`api.ts:122`). If the env var is set to an
origin without the prefix:

```
http://localhost:8000 + /auth/login  →  http://localhost:8000/auth/login
```

The backend serves the tenant API at **`/api/v1/auth/login`**, so every
request would 404. The `/api/v1` default (`api.ts:44`) is only reached when
the env var is **empty or unset**.

**Current state — this is latent, not an active breakage:**

- `.env.local:9` has `VITE_API_BASE_URL` **commented out**
  (`# VITE_API_BASE_URL=http://localhost:8000`). So the active dev config
  falls through to the `/api/v1` default and the Vite `/api` proxy
  (`vite.config.ts:32-34`) → `http://localhost:8000`. **Correct.**
- `.env.example:10` has it **uncommented** as `http://localhost:8000` — i.e.
  the *template* a new developer copies contains the broken value, and
  `.env.example:8` even says "Dev: leave EMPTY to use the Vite /api proxy".
  The comment is right; the value on the next line contradicts it.

So the trap is: a developer who uncomments the line (as the file's own
comment invites them to consider) silently loses the prefix, and **every**
tenant call 404s with no error at configuration time. The Vite proxy only
handles same-origin `/api/*`; an absolute `http://localhost:8000` URL bypasses
the proxy entirely.

**Also stale:** the comment in `api.ts:47-61` (`warnEnvTokenOnce`) asserts
the backend is "missing" a token field in `/auth/login`. That is **wrong** —
the backend does return `access_token` and `refresh_token`
(`app/domains/auth/schemas.py:64-68`), and `auth.ts:112-123` already types
them correctly. The warning will fire on every cold start in dev and send
developers chasing a non-existent backend defect.

**Fix (proposed, not applied):** normalise inside `getBaseUrl()` so that both
`http://localhost:8000` and `http://localhost:8000/api/v1` resolve to the
prefixed form, and correct `.env.example` to match its own comment.

### F2 — Superadmin auth endpoints use the wrong URL prefix (HIGH)

`src/infrastructure/api/auth.ts:156-161,177-180` calls:

- `POST /auth/superadmin/login`
- `POST /auth/superadmin/logout`

with base `/api/v1`, producing `/api/v1/auth/superadmin/login`.

**Verified actual backend paths:**

- `app/api/v1/superadmin.py:17` → `APIRouter(prefix="/api/superadmin")`
- `app/domains/superadmin/router_auth.py:43` → `APIRouter(prefix="/auth")`
- `app/domains/superadmin/router_auth.py:55` → `@router.post("/login")`

⇒ **`POST /api/superadmin/auth/login`**, and logout at
**`POST /api/superadmin/auth/logout`**.

The superadmin surface is a **separate mounted prefix with its own token
family** — not a sub-path of the tenant API. `getBaseUrl()` returns a single
base (`api.ts:41-45`), so the superadmin client needs its own base URL. This
is the same root cause as F1.

`src/presentation/pages/superadmin-login.tsx:24` calls
`superadminLoginRequest(...)`, so the superadmin login is **currently broken**.

### F3 — Login request body sends `username`; the backend accepts only `email` (HIGH)

`buildLoginPayload` (`auth.ts:102-110`) routes a non-`@` identifier to
`{ username, password }`.

**Verified backend schema** (`app/domains/auth/schemas.py:11-13`):

```python
class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1)
```

There is **no `username` field**. FastAPI/Pydantic ignores unknown fields by
default, so a `{username, password}` body is rejected for the **missing
required `email`** → **422**.

The backend's `UserOut` (`app/domains/auth/schemas.py:53-61`) confirms there
is no `username` on the user model either: `id`, `email`, `full_name`, `role`,
`is_active`, `created_at`. The backend authenticates by **email only**.

Consequences in the frontend:

- `auth.ts:87-93` (`LoginRequest` with optional `username`) and
  `auth.ts:102-110` (`buildLoginPayload`) encode a contract the backend does
  not implement.
- `authSession.ts:289-296` (`signIn`) sends `{ email, password }` directly —
  this one is **correct**, and it is the path actually used by
  `AuthContext.login` (`AuthContext.tsx:207-219`), so the main login form
  works. The `buildLoginPayload` path is used by
  `superadmin-login.tsx:24` and the OTP flow.
- `AuthUser` (`auth.ts:73-85`) declares `username`, `clientId`, `lastLoginAt`,
  `updatedAt`, `fullName` — fields the backend's `UserOut` does not carry.
  `normaliseUser` (`authSession.ts:87-103`) defaults them, so nothing crashes,
  but `username` and `clientId` are **always empty strings / null** in API
  mode.

### F4 — `forgot-password` and `otp-verify` paths are wrong (MEDIUM)

| Frontend call | Actual path | Frontend source | Backend source |
|---|---|---|---|
| `POST /auth/password/forgot` | `POST /auth/forgot-password` | `auth.ts:252-257` | `app/domains/auth/router.py:67` |
| `POST /auth/otp/verify` | `POST /auth/otp-verify` | `auth.ts:259-264` | `app/domains/auth/router.py:86` |
| `POST /auth/otp/resend` | **route does not exist** | `auth.ts:266-270` | 0 hits for `resend` |

All three are 404 today.

### F5 — OTP body field is `otp`; the backend expects `code` (MEDIUM)

`verifyOtp({ email, otp })` (`auth.ts:259-264`), and the caller
`src/presentation/pages/otp-verify.tsx:51` sends `{ email, otp: value }`.

**Verified backend schema** (`app/domains/auth/schemas.py:28-31`):

```python
class OtpVerifyRequest(BaseModel):
    email: EmailStr
    code: str = Field(min_length=4, max_length=12)
```

The field is **`code`**, not `otp` → **422** even after the path is fixed.

### F6 — `/auth/register` and OTP resend have no backend route (MEDIUM)

- `requestRegister` → `POST /auth/register` (`auth.ts:249-250`).
  **No such route exists** in the backend — grep for `register` finds only
  comments. Backend has `/auth/superadmin/...` tenant creation instead.
- `resendOtp` → `POST /auth/otp/resend` (`auth.ts:266-270`). No route exists.

Both are called from the frontend. `src/presentation/pages/register.tsx` and
the "resend" button at `otp-verify.tsx:158` therefore hit 404s.

### F7 — `pageSize` is sent to `/admin/users`, which only accepts `page_size` (MEDIUM)

`usersApi.buildListQuery` sends `pageSize` (`usersApi.ts:196-198`).
The backend route declares `page_size` with **no** camelCase alias
(`app/domains/users/router_admin.py:88`).

FastAPI **silently ignores** unknown query parameters, so this is not a 422 —
it is a **silent** failure: the request succeeds, the server applies its own
default `page_size=25`, and the SPA's requested page size is discarded. This
is the most dangerous class of bug in the list, because it is invisible.

(The superadmin tenant route *does* accept `pageSize`, via
`legacy_choices("page_size")` at `app/domains/shared/naming.py:49-62`.)

### F8 — `isSuccessEnvelope` cannot match a non-enveloped success body (LOW)

`response.ts:69-78` requires both `data` and `meta`. The backend passes
through **raw** any route with no declared `response_model`
(`app/main.py:236-243`), and skips the envelope for 204 and downloads. A
client that receives such a body and calls `unwrapData` gets `undefined`
rather than a loud contract error. `unwrapPage` correctly throws when
`meta.pagination` is missing (`response.ts:110-115`); `unwrapData` has no
equivalent guard.

### F9 — `error.request_id` is never read (LOW, latent)

Under the `modern` contract the request id lives at `error.request_id`
(`app/main.py:309-316`), not `meta.request_id`. The frontend reads only the
`meta` location (`response.ts:175`, `api.ts:106-111`). Harmless while the
client always requests `enveloped`; a latent gap if the contract is switched.
`usersApi.ts:159-165` already declares a `requestId` field on its local
`ApiErrorBody` for exactly this case, but nothing reads it.

### F10 — `credentials: "include"` implies an auth model that does not exist (LOW)

`api.ts:159` sends cookies on every request, and `api.ts:47-61` warns about
"Cookie auth (per the spec)". The backend is **Bearer-only** and sets no
cookies (`set_cookie` → 0 hits). Harmless — but the comments are misleading
and the frontend `docs/api/` spec's cookie+CSRF model (see below) never
existed in the backend.

### F11 — `PUKU.md` and `docs/api/` are stale relative to the code (LOW, doc-only)

- `PUKU.md` describes a flat `src/lib/`, `src/mock-data/`, `src/components/`
  layout and a `src/lib/api.ts` entry point. **None of it exists**; the repo
  is now layered and the client is at `src/infrastructure/api/`.
- `docs/api/` is a pre-implementation contract that disagrees with the
  shipped backend on **20 points** (enumerated below). It also never
  mentions `X-LIMS-API-Version` — the string appears **0 times** across all
  seven files in that directory.

### F12 — No frontend test infrastructure (LOW, but blocking for "add regression tests")

There is **no** test framework configured: no Vitest, no Jest, no
`*.test.*` / `*.spec.*` file, no test script in `package.json`, and no
`vitest.config.*` / `jest.config.*`. `docs/api/integration-guide.md` calls for
a 7-phase wiring plan, but there is nothing to carry regression tests in.

The backend *does* have a real test suite (284 tests) and a layering guard
script, so the backend side is well-covered; the frontend is not.

**Consequence for the Task 4 mandate "add regression tests for affected
consumers":** adding a test runner to a project with none is a new
infrastructure decision, not an incremental fix. It needs the user's
explicit approval (see [Unresolved Questions](#unresolved-questions)).

## Docs vs. Code Disagreements

`docs/api/README.md:3-5` states the directory is "the contract the backend
**must** implement". The backend was built to a different contract. The
following are the disagreements between the frontend's spec docs and the
shipped backend — **all resolved in favour of the backend source**:

| # | `docs/api/` claims | Backend reality | Evidence |
|---|---|---|---|
| 1 | Auth = **httpOnly cookie** `glims_session` | **JWT Bearer only**; no cookies at all | `docs/api/README.md:9,170` vs `app/core/deps.py:33` |
| 2 | **CSRF required** on writes (`X-CSRF-Token`) | **No CSRF at all** | `docs/api/README.md:202-216` vs 0 hits in `app/` |
| 3 | "**No refresh endpoint** in v1"; single 24h JWT | `POST /auth/refresh` exists; access **15 min**, refresh **7 days**, **rotates** | `docs/api/README.md:220-222` vs `app/domains/auth/router.py:46-54`, `app/domains/auth/service.py:160-163` |
| 4 | Login body `{username,password}` **or** `{email,password}` | **email only** | `docs/api/README.md:164-167` vs `app/domains/auth/schemas.py:11-13` |
| 5 | Login returns `{data:{user, expiresAt}}`; no token | Returns `access_token` + `refresh_token` + `token_type` + `user`; **no `expiresAt`** | `docs/api/README.md:171-177` vs `app/domains/auth/schemas.py:64-68` |
| 6 | `POST /auth/superadmin/login` | **`POST /api/superadmin/auth/login`** | `docs/api/endpoints.md:27` vs `app/api/v1/superadmin.py:17` |
| 7 | `POST /auth/register` | **Route does not exist** | `docs/api/endpoints.md:31` vs 0 hits |
| 8 | `POST /auth/password/forgot` | **`POST /auth/forgot-password`** | `docs/api/endpoints.md:32` vs `app/domains/auth/router.py:67` |
| 9 | `POST /auth/otp/verify` | **`POST /auth/otp-verify`** (hyphen) | `docs/api/endpoints.md:33` vs `app/domains/auth/router.py:86` |
| 10 | `POST /auth/otp/resend` | **Route does not exist** | `docs/api/endpoints.md:34` vs 0 hits |
| 11 | Error `code` enum = 7 values, incl. `internal` | **22+ real codes**; `internal` is actually `internal_error` | `docs/api/README.md:104-105` vs `app/domains/shared/errors.py:21-161` |
| 12 | Request id lives **inside `error`** | Under `enveloped` it lives in **`meta.request_id`** | `docs/api/README.md:99` vs `app/main.py:297-307` |
| 13 | Success envelope `{data}` with **no `meta`** | `enveloped` always adds `meta` | `docs/api/README.md:71-73` vs `app/api/envelope.py:110,145-146` |
| 14 | Pagination `{page,pageSize,total,totalPages}` at **top level** | `meta.pagination` = `{limit,offset,total}`; **no `totalPages`** | `docs/api/README.md:77-87` vs `app/domains/shared/common.py:55-64` |
| 15 | Query params `?page=1&pageSize=25` | **Mixed** — `limit`/`offset` on most routes; `page`/`page_size` on admin + superadmin; `pageSize` only where `legacy_choices` is used | `docs/api/README.md:110-111` vs `app/domains/users/router_admin.py:87-88` |
| 16 | Field casing = **camelCase throughout** | Backend is **snake_case** for `modern`/`enveloped`; camelCase only under `legacy` | `docs/api/README.md:126-129` vs `app/api/negotiation.py:5-10` |
| 17 | `GET /ready`, `GET /version` | **`/api/v1/health`** and **`/api/v1/health/db`** | `docs/api/README.md:242-243` vs `app/domains/health/router.py:31,41-42` |
| 18 | `X-RateLimit-*` headers on every response | **Not implemented** | `docs/api/README.md:226-235` vs 0 hits |
| 19 | Superadmin is a **role**, not a path scope | Superadmin is a **separate mounted prefix** with its own token family | `docs/api/README.md:34-43` vs `app/api/v1/superadmin.py:17` |
| 20 | `Role` enum has 7 roles incl. `superadmin` | Backend has its own `UserRole` enum — **not verified** in this audit | — |

**The authoritative backend documentation** is
`F:/Project/lims_backend/docs/api_rollout.md` and
`F:/Project/lims_backend/adr/0008-standard-response-envelope.md`, not
`docs/api/`.

**Where the frontend docs and the backend agree:** the `/api/v1` base path,
`POST /auth/login`, `GET /auth/me`, ISO-8601 timestamps, and server-minted
IDs. The frontend's `docs/api/endpoints.md` file:line pointers to SPA
consumers are **stale** (they predate the layered refactor and point at
`src/mock-data/`, `src/lib/`, `src/components/` paths that no longer exist).

## API Version Negotiation (backend capability, for reference)

**Verified.** The backend supports three contracts via `X-LIMS-API-Version`
(`app/api/negotiation.py:43`), all genuinely implemented:

| Header value | Success body | Error body |
|---|---|---|
| *(omitted)* | raw handler output (snake_case) | `{"error":{...}}` |
| `modern` | raw handler output (snake_case) — **no `data`/`meta`** | `{"error":{code,message,details,request_id}}` — **no `meta`** |
| `enveloped` | `{"data":...,"meta":{...}}` | `{"error":{...},"meta":{request_id}}` |
| `legacy` | camelCase body | `{"detail": ...}` |

- The header is case-insensitive and whitespace-trimmed
  (`app/api/negotiation.py:60-74`).
- An **unrecognised value falls back to the default** rather than 400-ing
  (`app/api/negotiation.py:63-68`).
- Default when the header is absent: **`modern`** (`app/api/negotiation.py:122`).
  This is a module constant, deliberately **not** an env var
  (`app/api/negotiation.py:111-121` documents the `git bisect` rationale).
- The frontend's table in `response.ts:7-12` matches the backend's own table
  (`app/api/negotiation.py:5-10`) except that it does not note that `modern`
  puts the request id inside `error` rather than `meta` (see F9).

## Verification

### Frontend — all commands executed on 2026-10-27

| Purpose | Command | Result |
|---|---|---|
| Type-check | `npm run typecheck` (`tsc --noEmit -p tsconfig.json`) | **PASS** — exit 0, 0 diagnostics |
| Layering guard | `npm run lint:layers` (`node scripts/check-layering.mjs`) | **PASS** — exit 0, `✔ Layering guard: 0 violations` |
| Production build | `npm run build` (`tsc --noEmit` + `vite build`) | **PASS** — exit 0, 3118 modules, built in 2m 18s |
| Dev server | `npm run dev` | Not run (no interactive verification needed) |
| Unit tests | — | **No test runner exists** (see F12) |
| Lint (ESLint) | — | **No ESLint config or script** in `package.json`; only the custom layering guard |

Other verification scripts present in `scripts/` (all Node, no framework):
`check-bundle-css.mjs`, `check-layering.mjs`, `verify-pagination-runtime.mjs`,
`verify-pdf-export.mjs`, `verify-quotation-pagination.mjs`.

> The `build` script bundles `tsc --noEmit` ahead of `vite build`, so a
> type-check regression fails the build. Good — this is the de facto CI gate
> for the frontend.

> The build emits a chunk-size warning: `dist/assets/index-*.js` is
> **2,361 kB** (662 kB gzipped). Not a Task 4 concern, but worth recording.

### Backend — commands (not executed by this audit except where noted)

| Purpose | Command |
|---|---|
| Run server | `make run` → `uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload` (`Makefile:82-85`) |
| Run tests | `make test` → `APP_ENV=test DATABASE_URL=... python -m pytest` (`Makefile:183-189`) |
| Run tests (fast) | `make test-fast` (skips `slow`) (`Makefile:191-193`) |
| Run tests (coverage) | `make test-cov` (`Makefile:195-197`) |
| Single file | `make test-one file=tests/test_x.py` (`Makefile:199-202`) |
| Direct pytest | `APP_ENV=test DATABASE_URL=sqlite+aiosqlite:///./gl_lims_test.db pytest` (`pytest.ini:13-14`) |
| Lint | `make lint` → `ruff check app tests` (`Makefile:215-218`) |
| Type-check | `make typecheck` → `mypy` (`Makefile:227-228`) |
| DB migrations | `make db-upgrade` (alembic) / `make db-seed` (`Makefile:98-112`) |

- `APP_ENV=test` **and** a throwaway SQLite (or a `test`-named Postgres) DB
  are **mandatory** — `tests/conftest.py::pytest_sessionstart` aborts
  collection otherwise (`pytest.ini:8-11`).
- Backend test count: **284 collected** across 22 files in `tests/`. The
  contract-relevant ones are `test_response_contract.py` (23 tests) and
  `test_api_negotiation.py` (11) — **both pass (34/34)**.
- CI: `.github/workflows/ci.yml` — Python 3.13, `ruff`, schema bootstrap
  (`python -m app.db.init_db && python -m app.db.seed`), `pytest -q --tb=short`,
  plus regression gates `scripts/check_phase_b.py` and
  `scripts/check_doc_links.py`. CI runs against SQLite deliberately.
- **Stale:** backend `README.md:228` claims `make test # 244 passed, 4 known
  failures`. Actual collection is **284**. A known-failure baseline is
  recorded at `docs/phase_b_baseline_failures.txt`.

## Unresolved Questions

### Requires user decision before implementation

1. **Base URL for the superadmin surface.** F1 and F2 share a root cause:
   there is one `getBaseUrl()`, but the backend has two prefixes. Options:
   (a) introduce a second base for `/api/superadmin`; (b) make the base URL
   configurable per client; (c) derive the superadmin base by string
   substitution from the tenant base. **Recommendation: (c)** — it keeps
   production configurable from a single env var while defaulting correctly
   in dev.
2. **Should `VITE_API_BASE_URL` include the prefix, or should
   `getBaseUrl()` append it?** The env var is currently treated as
   "origin + prefix" by `api.ts` (returned verbatim), but `.env.example:10`
   sets it to a bare origin and `.env.example:8` says "leave EMPTY to use the
   Vite /api proxy". The active `.env.local:9` has it commented out, so dev
   works today — but the template invites a broken setup. **Recommendation:
   normalise inside `getBaseUrl()`** so both `http://localhost:8000` and
   `http://localhost:8000/api/v1` work, and correct `.env.example` to match
   its own comment. This removes the entire class of F1-style
   misconfiguration.
3. **Endpoints that do not exist in the backend (F6).** `/auth/register` and
   `/auth/otp/resend` have no backend route. Should the frontend (a) hide
   those UI affordances, (b) keep them and treat 404 as "not available", or
   (c) is a backend route planned? **The register and OTP-resend flows in the
   UI are currently dead ends.**
4. **Login identifier field (F3).** The backend accepts **email only**; the
   frontend's login form takes a single "identifier" field and routes it by
   `@`. Should the frontend (a) require an email and drop `buildLoginPayload`'s
   username branch, or (b) keep the username branch for a future backend
   change? **Recommendation: (a)** — the `username` branch provably cannot
   succeed against the current backend.
5. **`localStorage` token storage.** Already the implementation; the backend's
   Bearer-only model rules out httpOnly cookies without a backend change.
   Confirm this stays as-is, or raise a backend ticket for cookie support.
6. **Frontend test framework (F12).** The Task 4 mandate requires regression
   tests, but the frontend has no test runner. Adding Vitest is new
   infrastructure. **Recommendation: add Vitest** (minimal, Vite-native) with
   `apiFetch` unit tests covering the error-envelope matrix, the 204 path, and
   the base-URL resolution. Needs approval.
7. **Scope of `docs/api/`.** It is a 20-point-mismatched pre-implementation
   spec. Should it be (a) retired and superseded by a pointer to the
   backend's `docs/api_rollout.md` + ADR 0008, (b) rewritten to match the
   shipped backend, or (c) left as a historical artifact? **Recommendation:
   (b) for the parts the frontend still relies on, (a) for the rest** — but
   note that this is a documentation task outside Task 4's code scope.
8. **`PUKU.md` staleness (F11).** It describes a layout that no longer exists
   and will misdirect any future agent. Recommend a separate update.

### Verified gaps (no decision needed — recorded for the record)

- **Cancellation:** no `AbortSignal` support anywhere in the API client. The
  `ApiFetchInit` type extends `RequestInit`, so a caller *can* pass
  `signal`, and TanStack Query passes one automatically for cancelled
  queries — but no client wraps it, and the queryFn signatures do not forward
  it explicitly. **Behaviour is acceptable** (React Query aborts the fetch),
  but there is no explicit cancellation API.
- **Retries:** only via TanStack Query's `retry` (1 attempt for most hooks;
  401 excluded for `useMe`). **No client-level retry.** This correctly avoids
  retrying unsafe mutations.
- **Concurrency safety:** the auth adapter's generation counter is the one
  real concurrency-safety mechanism, and it is well designed. No other
  consumer needs one today.
- **No `any` types** in the API client layer — the client uses `unknown`
  throughout with type guards (`response.ts:69-92`). This is good practice and
  consistent with the profile's rules.
- **No hardcoded API URLs** in application code — the only literal is the
  `/api/v1` default in `getBaseUrl()` (`api.ts:44`) and the debug probe in
  `login.tsx:321-325`.
- **No duplicate toast logic** — all error presentation routes through
  `errors.ts`.
- **No new state-management library** was introduced.
- **Backend rate limiting is not implemented**, so the frontend's
  `rate_limited` message (`errors.ts:34`) has no live trigger.
- **`docs/api/openapi.yaml` is hand-authored**, not generated, and does not
  match the backend. It should not be treated as a type source.

### Explicitly UNKNOWN

- The backend's exact `UserRole` enum values (not read —
  `app/domains/shared/enums.py`).
- The **field-level** divergence between the frontend's `User` type
  (`usersApi.ts:32-47`, which includes `username`, `clientId`, `status`,
  `fullName`, `lastLoginAt`) and the backend's `UserOut` (which has
  `id`, `email`, `full_name`, `role`, `is_active`, `created_at` — and no
  `username`, no `client_id`, no `status`). The casing gap is bridged by
  `normalizeUser`, but the **missing** fields cannot be bridged and are
  silently defaulted. This needs a decision.
- Whether a field-level audit was done for the other 95 operations.
- Whether the backend's live `/api/v1/openapi.json` is intended to become
  the frontend's type source.
- The intended outcome of Tasks 1–3 (no task statements exist in the repo).
- Whether `/admin/users` supports the `confirm` query parameter the frontend
  sends (`usersApi.ts:288`) — the route was not read in detail for that
  specific parameter.
- Whether the `If-Match` header the frontend sends for optimistic concurrency
  (`usersApi.ts:281,321,331`) is honoured by the backend — not verified.

## Files Inspected

### Frontend — `F:/Project/Lims` (read in full unless noted)

| File | Purpose |
|---|---|
| `src/infrastructure/api/api.ts` | The `apiFetch` primitive, `ApiError`, base-URL resolution |
| `src/infrastructure/api/response.ts` | Envelope types, type guards, unwrap helpers |
| `src/infrastructure/api/errors.ts` | Bilingual error-code map, `describeApiError` |
| `src/infrastructure/api/auth.ts` | Token storage, auth endpoints, JWT expiry decoding |
| `src/infrastructure/api/tanstack-queries.ts` | 20+ query/mutation hooks |
| `src/infrastructure/api/repositories/authSession.ts` | HTTP `AuthSession` adapter, race guard |
| `src/infrastructure/api/clients/usersApi.ts` | Users CRUD + menu overrides |
| `src/infrastructure/api/clients/rolesApi.ts` | Roles CRUD + menu permissions + menu keys |
| `src/infrastructure/api/clients/testParametersApi.ts` | Test parameter catalogue |
| `src/infrastructure/api/clients/testListApi.ts` | Test list catalogue (grep-verified) |
| `src/infrastructure/di/container.ts` | Composition root / adapter selection |
| `src/presentation/providers/AuthContext.tsx` | Auth state machine, port consumption |
| `src/presentation/pages/login.tsx` (partial) | Login form + the one raw `fetch` |
| `src/presentation/pages/superadmin-login.tsx` (grep) | Superadmin login call site |
| `src/presentation/pages/otp-verify.tsx` (grep) | OTP call site |
| `package.json`, `vite.config.ts`, `.env.example`, `.env.local` | Scripts, proxy, env config |
| `docs/api/README.md` (partial) | Pre-implementation contract's self-description |

### Backend — `F:/Project/lims_backend` (verified via targeted inspection)

| File | What was confirmed |
|---|---|
| `app/main.py` | Middleware, envelope/error building, prefixes, CORS, mounts |
| `app/api/negotiation.py` | `X-LIMS-API-Version` handling, default contract |
| `app/api/envelope.py` | `data`/`meta` construction, pagination conversion |
| `app/api/v1/__init__.py` | `/api/v1` prefix |
| `app/api/v1/superadmin.py` | `/api/superadmin` prefix |
| `app/domains/auth/router.py` | Auth route paths |
| `app/domains/auth/schemas.py` | `LoginRequest`, `OtpVerifyRequest`, `UserOut`, `Token` |
| `app/domains/auth/service.py` | Refresh-token rotation |
| `app/domains/superadmin/router_auth.py` | Superadmin route paths |
| `app/domains/superadmin/service_auth.py` | Superadmin refresh rotation |
| `app/domains/shared/common.py` | `PaginationInfo`, `ResponseMeta`, `ErrorBody` |
| `app/domains/shared/errors.py` | Full domain error-code set |
| `app/core/deps.py` | `OAuth2PasswordBearer` (Bearer-only) |
| `app/core/security.py` | Token issuance, lifetimes, type isolation |
| `app/core/config.py` | Token expiries, CORS origins, DB URLs |
| `app/core/pagination.py` | `total_pages` dropped; page → limit/offset conversion |
| `app/domains/users/router_admin.py` | `/admin/users` prefix and `page`/`page_size` params |
| `app/domains/roles/` | `/admin` prefix, roles + menu-keys routes |
| `app/domains/tests/` | `/test-list`, `/test-parameters` routes |
| `app/domains/health/router.py` | `/health`, `/health/db` |
| `Makefile`, `pytest.ini`, `requirements.txt` | Test/lint/typecheck commands, dependencies |
| `tests/test_response_contract.py`, `tests/test_api_negotiation.py` | 34/34 passing — the contract's own regression suite |

### Not inspected

- `.backup_artifacts/`, `.backup_lib/`, `.backup_scripts/` — historical
  artifacts, excluded by project rule.
- `src/infrastructure/mock/**` beyond `authSession.ts` (imported by the DI
  container).
- `src/presentation/pages/**` other than the three auth-related pages.
- `src/domain/**` — read only via the port interfaces.
- The backend's `app/domains/` sub-trees for clients, samples, accounting, and
  quotations.
