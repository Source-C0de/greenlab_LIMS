# Task 4 — Frontend API Client Audit Report

> **Mode:** AUDIT-ONLY (original pass). No application code was modified. No
> dependencies changed. Authentication was not touched.
>
> **Date:** 2026-10-27
>
> **Scope:** Audit the React frontend's API client layer against the shipped
> FastAPI backend; record evidence, existing correct functionality, confirmed
> gaps, risks, and a prioritized minimal implementation plan.
>
> **Implementation:** §11 records what was subsequently implemented after
> approval. The rest of this document is the original audit, unmodified.

---

## 1. Repositories

Two separate Git repositories:

| Role | Path | Branch | HEAD | Remote |
|---|---|---|---|---|
| **Frontend** | `F:/Project/Lims` | `feature/frontend-api-client` | `5730fca` | `https://github.com/Source-C0de/greenlab_LIMS.git` |
| **Backend** | `F:/Project/lims_backend` | `development` | `60bbaf1` | `https://github.com/Source-C0de/lims-backend.git` |

### 1.1 Frontend Git status

```
 M puku.md
?? docs/API_CLIENT_HANDOFF.md
```

- `puku.md` — modified (lowercase). This is the working-tree copy of `PUKU.md`;
  see **F11**, it is materially stale.
- `docs/API_CLIENT_HANDOFF.md` — untracked. A prior audit handoff, also untracked.
- No application source files are dirty.

### 1.2 Backend Git status

```
D  .env.docker.example
 M .gitignore
 M Makefile
 M README.md
 M app/core/config.py
 M app/core/storage.py
 M app/entrypoint.py
 M docker-compose.yaml
 M docs/dev-prod.md
 M requirements.lock
 M requirements.txt
?? .env.compose.example
?? app/tasks/
?? app/worker/
?? deploy/
?? docker-compose.override.dev.yaml
?? docs/dev-stack-runbook.md
```

- The backend working tree has **substantial uncommitted work** (Docker/compose,
  Celery worker, task queue, storage/config, requirements). None of it touches
  the audited API-contract surface (`app/api/`, `app/domains/`, `app/main.py`),
  so the contract audit below is unaffected.
- **Risk:** any backend change made during implementation would land on top of
  this uncommitted work. Do not modify the backend — none of the findings
  require it.
- Note: `app/tasks/` and `app/worker/` are **new, untracked** directories. They
  were not part of the audited surface.

---

## 2. Architecture (verified)

### 2.1 Frontend

| Property | Value | Evidence |
|---|---|---|
| Framework | React 18 + TypeScript | `package.json` |
| Build | Vite 6.4.2 (dev port 3000) | `vite.config.ts:19` |
| Routing | **Wouter** (not React Router) | `package.json` |
| Server state | TanStack Query 5 | `package.json`, `src/App.tsx` |
| Layout | `domain/` · `infrastructure/` · `presentation/` · `shared/` | `src/` tree |
| HTTP | Hand-rolled `fetch` wrapper (no axios) | `src/infrastructure/api/api.ts:120` |
| i18n | Hand-rolled `AppContext.language` | `src/presentation/providers/AppContext.tsx` |

> **Correction to `PUKU.md`.** `PUKU.md` describes a flat layout (`src/lib/api.ts`,
> `src/lib/queries.ts`, `src/mock-data/`, `src/components/`). **None of those
> paths exist.** The repo has been restructured into the four-layer tree and the
> API client lives at `src/infrastructure/api/`. `PUKU.md` also states "No
> backend" and "no `fetch`" — both are now false. See **F11**.

### 2.2 Backend

| Property | Value | Evidence |
|---|---|---|
| Framework | FastAPI (Python) | `app/main.py` |
| ORM | SQLAlchemy 2.x async | `app/db/session.py`, `app/core/deps.py` |
| Migrations | Alembic | `requirements.txt` |
| Engines | PostgreSQL (prod) / SQLite (dev, test) | `app/core/config.py` |
| Tests | pytest + pytest-asyncio (`asyncio_mode = auto`) | `pytest.ini:2` |
| Lint/types | `ruff` / `mypy` | `Makefile:215-228` |

### 2.3 Two API prefixes — the single most important structural fact

| Surface | Prefix | Evidence |
|---|---|---|
| Tenant API | **`/api/v1`** | `app/api/v1/__init__.py:26` |
| Superadmin API | **`/api/superadmin`** | `app/api/v1/superadmin.py:17` |

Both mounted at `app/main.py:459-460`. The frontend has **one** `getBaseUrl()`
(`api.ts:41-45`) — it cannot address both. This is the root cause of **F1** and
**F2**.

---

## 3. Response-contract understanding — correct and verified

The frontend's model of the envelope is **accurate**. This is the strongest
part of the client and should be preserved.

### 3.1 Success envelope

The client always sends `X-LIMS-API-Version: enveloped` as a **default**
(`api.ts:130-132`, overridable per request). The backend then returns:

```jsonc
{ "data": <object|array>, "meta": { "request_id": "...", "pagination": {...}? } }
```

- Built by middleware (`app/main.py:154-254`) → `app/api/envelope.py:87-146`.
- `meta` is always present (`app/api/envelope.py:110`).
- `meta.pagination` only on paginated list endpoints (`app/api/envelope.py:116,123`).

**Verified exception — the envelope is not universal.** The middleware passes
through **raw** any route with no declared `response_model`
(`app/main.py:236-243`), and skips the envelope for 204/205/304
(`app/main.py:193-194`) and for file downloads / `Content-Disposition`
(`app/main.py:202-203`).

Frontend handling:
- `apiFetch` returns `undefined` for 204 (`api.ts:163`) — correct.
- `unwrapPage` **throws** when `meta.pagination` is missing (`response.ts:110-115`) — correct, loud failure.
- `unwrapData` has **no** such guard (`response.ts:99-101`) — it returns
  `b.data` blindly. Its docstring claims it is "strict on purpose", but the
  implementation is not. See **F8**.

### 3.2 Error envelope

The client's `ErrorEnvelope` (`response.ts:56-59`) matches the backend's
`enveloped` error shape exactly:

```jsonc
{ "error": { "code": "...", "message": "...", "details": {...}? }, "meta": { "request_id": "..." } }
```

- Built by `app/main.py:266-322`; `enveloped` branch at `app/main.py:297-307`.
- `error.details` is omitted when null (`exclude_none=True`, `app/main.py:305`).
- Exception handlers (`app/main.py:336-451`): `HTTPException` → status-map code;
  `RequestValidationError` → **422**, `code="validation_error"`,
  `details={"errors":[{loc,msg,type}]}`; unmatched 404/405 → `not_found` /
  `bad_request`; `DomainError` → its own code; unhandled → **500**,
  `code="internal_error"`, generic message.

### 3.3 Error-code map — complete

`CODE_MESSAGES` (`errors.ts:17-42`) covers all 21 user-relevant backend codes:

`duplicate_email`, `duplicate_username`, `confirm_mismatch`, `self_demotion`,
`last_admin`, `unauthorized`, `forbidden`, `not_found`, `stale_write`,
`locked`, `validation`, `validation_error`, `bad_request`, `conflict`, `gone`,
`rate_limited`, `internal_error`, `slug_reserved`, `duplicate_slug`,
`role_in_use`, `fixed_role_immutable`.

Backend source set: `app/domains/shared/errors.py` + `app/main.py:79-90`.
The only backend code not in the map is `http_error` (the fallback at
`app/main.py:353`), which correctly falls through to the server's own message
(`errors.ts:73-78`). **The frontend declares no code the backend does not emit.**

Note: two distinct validation codes coexist and both are mapped —
`validation` (domain `ValidationFailure`, `errors.py:48`) and `validation_error`
(FastAPI 422, `app/main.py:397`). The client maps both to the same bilingual
string. Correct.

### 3.4 Request ID

- Header `X-Request-ID`, exact casing (`app/main.py:140-146`).
- Client-supplied IDs are **echoed, not replaced** (pinned by
  `tests/test_response_contract.py:321-328`).
- Present on every response, including 204s and downloads.
- In-body location under `enveloped` = `meta.request_id` (`app/main.py:300`).
- Frontend reads the header first, then falls back to `meta.request_id`
  (`api.ts:170-171`, `response.ts:169-178`). **Correct** for the contract it
  always requests.

### 3.5 Pagination — response shape matches exactly

`meta.pagination` = `{ limit, offset, total }` — all three required
(`app/domains/shared/common.py:55-64`, `app/api/envelope.py:60-66`). Pinned by
`tests/test_response_contract.py:70-82`. `total_pages` is deliberately dropped
from the wire (`app/core/pagination.py:12-16`). The client's `Pagination` type
(`response.ts:36-40`) matches. **Correct.**

The **query-parameter** style is not uniform — see **F7**.

### 3.6 Authentication strategy

**Bearer-only.** `OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")`
(`app/core/deps.py:33`). Grep for `set_cookie` / `csrf` / `xsrf` / `SameSite`
across `app/` → **zero hits**. No cookies are ever set.

- Tenant access token: **15 min** (`app/core/config.py:78`).
- Tenant refresh token: **7 days**, **opaque** (not JWT) —
  `token_urlsafe(48)` + SHA-256 hash lookup (`app/core/security.py:90-101`).
- Superadmin access token: **24 h** (`app/core/config.py:108`,
  `app/core/security.py:108`).
- Superadmin refresh token: **7 days**, opaque, `"srt_"-prefixed`.
- Token types are isolated: `access`, `refresh`, `superadmin_access`,
  `superadmin_refresh`, `impersonation` (`app/core/security.py:54-58`);
  `decode_token` enforces exact type match (`app/core/security.py:195-202`).
- **Refresh tokens rotate** on both families
  (`app/domains/auth/service.py:160-163`; `app/domains/superadmin/service_auth.py:200`).
- No CSRF (coherent with Bearer-only). No rate limiting implemented
  (`rate_limited` exists only as a 429 status-map entry at `app/main.py:89`).
- Superadmin lockout: 5 attempts / 15 min (`app/core/config.py:90-91`).
  Tenant login has no lockout.

---

## 4. Existing correct functionality — preserve these

These are verified working and should **not** be rewritten.

| # | Capability | Evidence |
|---|---|---|
| C1 | Single HTTP primitive; only `fetch` in `src/infrastructure/` | `api.ts:120`; grep confirms |
| C2 | Envelope unwrapping is **explicit per call site**, not global | `response.ts:99-117`; each client calls `unwrapData` / `unwrapPage` |
| C3 | Bilingual error map, 21/21 codes, unknown codes fall back to server message | `errors.ts:17-78` |
| C4 | Separate toast vs inline error helpers | `describeApiError` (`errors.ts:46`) / `describeApiErrorDetailed` (`errors.ts:88`) |
| C5 | Ports-and-adapters DI; adapter chosen **once** at module load, not branched at call sites | `src/infrastructure/di/container.ts:72-78` |
| C6 | One-way layering enforced by a script | `scripts/check-layering.mjs` — **PASS, 0 violations** |
| C7 | Race-free auth session via monotonic generation counter | `repositories/authSession.ts:61-66` |
| C8 | Only a real 401 clears the token (500/network/CORS/HMR do not) | `repositories/authSession.ts:249` |
| C9 | Proactive token renewal with 30 s skew | `repositories/authSession.ts:136,181-186` |
| C10 | Refresh-token rotation honoured — both new values persisted | `repositories/authSession.ts:156-157` |
| C11 | `signIn` sends the correct `{ email, password }` body | `repositories/authSession.ts:293-296` |
| C12 | `useMe` does not retry on 401 (401 = no session, not transient) | `tanstack-queries.ts:118-122` |
| C13 | Every query hook gated by `enabled: isApiEnabled()` — app stays mock-first | `tanstack-queries.ts` (12 sites) |
| C14 | Snake→camel response normalisers for users / roles / menu keys | `usersApi.ts:244-261`, `rolesApi.ts:109-121,150-159` |
| C15 | 204 handled without parsing | `api.ts:163` |
| C16 | No `any` in the API client layer — `unknown` + type guards throughout | `response.ts:69-92` |
| C17 | No axios, no XMLHttpRequest anywhere in `src/` | grep: 0 hits |
| C18 | No hardcoded API URLs in app code (only the `/api/v1` default) | `api.ts:44` |

---

## 5. Confirmed gaps

Ordered by severity. Every item is a **verified defect** with file:line evidence
on both sides. Severity reflects runtime impact in API mode.

### F1 — `VITE_API_BASE_URL` silently drops the `/api/v1` prefix — **HIGH (latent)**

`getBaseUrl()` returns the env var **verbatim** (`api.ts:42-44`); `apiFetch`
concatenates it with the path (`api.ts:122`). The backend serves the tenant API
at `/api/v1`, so an origin-only env value yields 404 on every call:

```
http://localhost:8000 + /auth/login  →  http://localhost:8000/auth/login   ✗
http://localhost:8000/api/v1 + /auth/login → .../api/v1/auth/login          ✓
```

The `/api/v1` default (`api.ts:44`) is reached only when the env var is empty.

**Current state — latent, not actively broken:**
- `.env.local:9` has `VITE_API_BASE_URL` **commented out** → the default `/api/v1`
  applies → the Vite proxy (`vite.config.ts:32-38`) forwards to
  `http://localhost:8000`. **Correct.**
- `.env.example:10` has it **uncommented** as `http://localhost:8000` — i.e. the
  template a new developer copies contains the broken value, while
  `.env.example:8` says *"Dev: leave EMPTY to use the Vite /api proxy"*. **The
  comment and the value contradict each other.**

So the trap: a developer who uncomments the line (as the file's own comment
invites them to consider) silently loses the prefix and **every** tenant call
404s, with no error at configuration time.

**Also stale:** the comment at `api.ts:47-61` (`warnEnvTokenOnce`) asserts the
backend "doesn't currently include a `token` field in /auth/login responses" and
that "Cookie auth (per the spec) also works". Both are **wrong** — the backend
returns `access_token` + `refresh_token` (`app/domains/auth/schemas.py:64-68`),
and the backend sets no cookies at all. The warning fires on every cold start
in dev and points developers at a non-existent defect.

---

### F2 — Superadmin auth endpoints use the wrong URL prefix — **HIGH**

`src/infrastructure/api/auth.ts:156-161,177-180` calls
`POST /auth/superadmin/login` and `POST /auth/superadmin/logout`. With base
`/api/v1` these resolve to `/api/v1/auth/superadmin/login`.

**Verified backend paths:**
- `app/api/v1/superadmin.py:17` → `APIRouter(prefix="/api/superadmin")`
- `app/domains/superadmin/router_auth.py:43` → `APIRouter(prefix="/auth")`
- `app/domains/superadmin/router_auth.py:55` → `@router.post("/login")`
- `app/domains/superadmin/router_auth.py:92` → `@router.post("/logout", status_code=204)`

⇒ **`POST /api/superadmin/auth/login`** and **`POST /api/superadmin/auth/logout`**.

The superadmin surface is a **separate mounted prefix with its own token
family** — not a sub-path of the tenant API. `getBaseUrl()` returns a single
base (`api.ts:41-45`), so the superadmin client needs its own base URL. Same
root cause as **F1**.

**Live impact:** `src/presentation/pages/superadmin-login.tsx:24` calls
`superadminLoginRequest(...)` → **the superadmin login is currently broken.**

Note the backend superadmin `Token` response also includes `expires_in`
(`app/domains/superadmin/schemas_auth.py:36`), which the tenant `Token` does
not (`app/domains/auth/schemas.py:64-68`). The client's `LoginResponse`
(`auth.ts:112-123`) has no `expires_in` field — harmless, but worth noting.

---

### F3 — Login request body sends `username`; the backend accepts only `email` — **HIGH**

`buildLoginPayload` (`auth.ts:102-110`) routes a non-`@` identifier to
`{ username, password }`.

**Verified backend schema** (`app/domains/auth/schemas.py:11-13`):

```python
class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1)
```

There is **no `username` field**. FastAPI/Pydantic ignores unknown fields, so a
`{username, password}` body is rejected for the **missing required `email`** →
**422**.

**Consequences:**
- `auth.ts:87-93` (`LoginRequest` with optional `username`) and
  `auth.ts:102-110` encode a contract the backend does not implement.
- `repositories/authSession.ts:293-296` (`signIn`) sends `{ email, password }`
  directly — **correct**, and this is the path used by the main login form
  (`AuthContext.tsx:216-219`). The main tenant login works.
- `superadmin-login.tsx:24` uses `buildLoginPayload(email, password)` — the
  variable is named `email`, so if it contains `@` it is fine; **but** the
  superadmin path is independently broken by **F2**.
- The OTP flow (`otp-verify.tsx:51`) also routes through the same pattern.

**Related — `AuthUser` field drift.** `auth.ts:73-85` declares `username`,
`clientId`, `lastLoginAt`, `updatedAt`, `fullName`. The backend's auth
`UserOut` (`app/domains/auth/schemas.py:53-61`) has only `id`, `email`,
`full_name`, `role`, `is_active`, `created_at` — **no `username`, no
`client_id`, no `last_login_at`, no `updated_at`**. `normaliseUser`
(`repositories/authSession.ts:87-103`) defaults them, so nothing crashes, but
`username` and `clientId` are **permanently empty** in API mode.

> **Note:** the backend has **two different** `UserOut` schemas. The auth one
> (6 fields, above) differs from the admin one
> (`app/domains/users/schemas.py:93-115`), which adds `username`,
> `full_name_ar`, `status`, `client_id`, `last_login_at`, `updated_at`,
> `temp_password`. The client's `RawUser` (`usersApi.ts:52-58`) correctly targets
> the **admin** shape. The `AuthUser` interface targets a **third** shape that
> matches neither.

---

### F4 — `forgot-password` and `otp-verify` paths are wrong — **MEDIUM**

| Frontend call | Frontend source | Actual backend path | Backend source |
|---|---|---|---|
| `POST /auth/password/forgot` | `auth.ts:252-257` | **`POST /auth/forgot-password`** | `app/domains/auth/router.py:67` |
| `POST /auth/otp/verify` | `auth.ts:259-264` | **`POST /auth/otp-verify`** | `app/domains/auth/router.py:86` |

Both are **404** today.

---

### F5 — OTP body field is `otp`; the backend expects `code` — **MEDIUM**

`verifyOtp({ email, otp })` (`auth.ts:259-264`), and the caller
`src/presentation/pages/otp-verify.tsx:51` sends `{ email, otp: value }`.

**Verified backend schema** (`app/domains/auth/schemas.py:28-30`):

```python
class OtpVerifyRequest(BaseModel):
    email: EmailStr
    code: str = Field(min_length=4, max_length=12)
```

The field is **`code`**, not `otp` → **422** even after the path is fixed.

---

### F6 — `/auth/register` and OTP resend have no backend route — **MEDIUM**

- `requestRegister` → `POST /auth/register` (`auth.ts:249-250`).
- `resendOtp` → `POST /auth/otp/resend` (`auth.ts:266-271`).

Grep for `register` / `resend` across `app/` returns **only comments and
unrelated identifiers** (`app/db/seed.py:123`, `app/db/session.py:49`,
`app/main.py:408`, `app/models/__init__.py:17`). **No route exists.** The
backend has tenant creation under `/api/superadmin/tenants` instead.

Both are called from the frontend: `src/presentation/pages/register.tsx` and the
resend button at `src/presentation/pages/otp-verify.tsx:158`. Both are **404s**.

---

### F7 — `pageSize` is sent to `/admin/users`, which only accepts `page_size` — **MEDIUM (silent)**

`usersApi.buildListQuery` sends `pageSize` (`usersApi.ts:196-198`).
The backend route declares `page_size` with **no camelCase alias**
(`app/domains/users/router_admin.py:87-88`):

```python
page: int = Query(default=1, ge=1),
page_size: int = Query(default=25, ge=1, le=100),
```

FastAPI **silently ignores** unknown query parameters. This is therefore not a
422 — it is a **silent failure**: the request succeeds, the server applies its
own default `page_size=25`, and the SPA's requested page size is **discarded
with no visible error**. This is the most dangerous class of defect in the list.

Corroborating evidence: `page_size` appears **0 times** anywhere in
`src/infrastructure/`. The client's `Pagination` type is `{limit, offset, total}`
(`response.ts:36-40`) — the canonical shape — so the request side is the only
place the legacy `page`/`pageSize` style leaks through.

**Backend pagination styles (verified):**

| Style | Params | Routes | Camel alias? |
|---|---|---|---|
| `limit`/`offset` | `limit` (1–200, d50), `offset` (≥0) | `/clients`, `/samples`, `/test-parameters`, `/test-list` | n/a (single words) |
| `page`/`page_size` | `page` (≥1, d1), `page_size` (1–100, d25) | `/admin/users` | **No** |
| `page`/`page_size` | `page` (d1), `page_size` (d50) | `/api/superadmin/audit-log`, `/api/superadmin/tenants` | **Yes** — `legacy_choices("page_size")` (`app/domains/shared/naming.py:49-62`) |

So `pageSize` works on the two superadmin routes but is silently dropped on
`/admin/users`.

---

### F8 — `unwrapData` cannot detect a non-enveloped success body — **LOW**

`unwrapData` (`response.ts:99-101`) returns `b.data` with no guard, despite its
docstring claiming it is "strict on purpose". The backend passes through **raw**
any route with no declared `response_model` (`app/main.py:236-243`):

- `GET /api/v1/tests/{test_id}/attachments/{attachment_id}` (`app/domains/tests/router.py:109`)
- `GET /api/superadmin/audit-log/export` (`app/domains/superadmin/router_audit.py:62`)
- `GET /api/superadmin/tenants/export` (`app/domains/superadmin/router_tenant.py:64`)
- `GET /` (`app/main.py:454`)

A caller hitting one of these gets a bare object; `unwrapData` then yields
`undefined` instead of a loud contract error. `unwrapPage` correctly throws
(`response.ts:110-115`) — `unwrapData` has no equivalent.

---

### F9 — `error.request_id` is never read — **LOW (latent)**

Under the `modern` contract the request id lives at `error.request_id`
(`app/main.py:309-316`), not `meta.request_id`. The frontend reads only the
`meta` location (`response.ts:175`, `api.ts:106-111`). Harmless while the client
always requests `enveloped`; a latent gap if the contract is ever switched.
`usersApi.ts:159-165` already declares a `requestId` field on its local
`ApiErrorBody` for this case — but nothing reads it.

---

### F10 — `credentials: "include"` and the CSRF/cookie model never existed — **LOW**

`api.ts:159` sends cookies on every request, and the comments at `api.ts:47-61`
and `auth.ts:1-9` describe a cookie-auth + CSRF model. The backend is
**Bearer-only** and sets no cookies (`set_cookie` → 0 hits). Harmless at
runtime — but the comments actively mislead, and the frontend's `docs/api/`
spec was written against that non-existent model (see **F11**).

---

### F11 — `PUKU.md` and `docs/api/` are stale relative to the shipped code — **LOW (doc-only)**

**`PUKU.md`** describes a flat layout (`src/lib/api.ts`, `src/lib/queries.ts`,
`src/mock-data/`, `src/components/`), states "**No backend**", and states
"**Don't add `fetch`**". **None of that is true.** The client lives at
`src/infrastructure/api/`, the backend exists and is wired behind
`VITE_USE_API`, and `api.ts:155` calls `fetch`. A future agent following
`PUKU.md` would be actively misled. The file is already modified in the working
tree, so the drift is known but not yet corrected.

**`docs/api/`** is a **pre-implementation** contract that the backend was not
built to. `docs/api/README.md:3-5` says the directory is "the contract the
backend **must** implement". Disagreements (backend source is authoritative):

| # | `docs/api/` claims | Backend reality | Evidence |
|---|---|---|---|
| 1 | Auth = httpOnly cookie `glims_session` | **JWT Bearer only**; no cookies | `docs/api/README.md:170` vs `app/core/deps.py:33` |
| 2 | **CSRF required** on writes (`X-CSRF-Token`) | **No CSRF at all** | `docs/api/README.md:202-216` vs 0 hits |
| 3 | "No refresh endpoint"; single 24 h JWT | `POST /auth/refresh` exists; access **15 min**, refresh **7 days**, **rotates** | `docs/api/README.md:220-222` vs `app/domains/auth/router.py:46-54` |
| 4 | Login `{username,password}` or `{email,password}` | **email only** | `docs/api/README.md:164-167` vs `app/domains/auth/schemas.py:11-13` |
| 5 | Login returns `{data:{user, expiresAt}}`; no token | Returns `access_token` + `refresh_token` + `token_type` + `user`; **no `expiresAt`** | `docs/api/README.md:171-177` vs `app/domains/auth/schemas.py:64-68` |
| 6 | `POST /auth/superadmin/login` | **`POST /api/superadmin/auth/login`** | `docs/api/endpoints.md:27` vs `app/api/v1/superadmin.py:17` |
| 7 | `POST /auth/register` | **Route does not exist** | `docs/api/endpoints.md:31` vs 0 hits |
| 8 | `POST /auth/password/forgot` | **`POST /auth/forgot-password`** | `docs/api/endpoints.md:32` vs `app/domains/auth/router.py:67` |
| 9 | `POST /auth/otp/verify` | **`POST /auth/otp-verify`** (hyphen) | `docs/api/endpoints.md:33` vs `app/domains/auth/router.py:86` |
| 10 | `POST /auth/otp/resend` | **Route does not exist** | `docs/api/endpoints.md:34` vs 0 hits |
| 11 | Error `code` enum = 7 values, incl. `internal` | **21+ real codes**; it is `internal_error` | `docs/api/README.md:104-105` vs `app/domains/shared/errors.py` |
| 12 | Request id inside `error` | Under `enveloped` it is `meta.request_id` | `docs/api/README.md:99` vs `app/main.py:297-307` |
| 13 | Success envelope `{data}`, **no `meta`** | `enveloped` always adds `meta` | `docs/api/README.md:71-73` vs `app/api/envelope.py:110,145-146` |
| 14 | Pagination `{page,pageSize,total,totalPages}` at top level | `meta.pagination` = `{limit,offset,total}`; **no `totalPages`** | `docs/api/README.md:77-87` vs `app/domains/shared/common.py:55-64` |
| 15 | Query params `?page=1&pageSize=25` | **Mixed** — `limit`/`offset` on most; `page`/`page_size` on admin + superadmin | `docs/api/README.md:110-111` vs `app/domains/users/router_admin.py:87-88` |
| 16 | Field casing camelCase throughout | Backend is **snake_case**; camelCase only where `legacy_field`/`legacy_choices` opt in | `docs/api/README.md:126-129` vs `app/api/negotiation.py:5-10` |
| 17 | `GET /ready`, `GET /version` | **`/api/v1/health`**, **`/api/v1/health/db`** | `docs/api/README.md:242-243` vs `app/domains/health/router.py:31,41-42` |
| 18 | `X-RateLimit-*` headers on every response | **Not implemented** | `docs/api/README.md:226-235` vs 0 hits |
| 19 | Superadmin is a **role**, not a path scope | Superadmin is a **separate mounted prefix** with its own token family | `docs/api/README.md:34-43` vs `app/api/v1/superadmin.py:17` |

`X-LIMS-API-Version` — the header the client actually depends on — appears
**0 times** across all seven files in `docs/api/`.

**Where the frontend docs and the backend agree:** the `/api/v1` base path,
`POST /auth/login`, `GET /auth/me`, ISO-8601 timestamps, and server-minted IDs.

The `docs/api/endpoints.md` file:line pointers to SPA consumers are **also
stale** — they point at `src/pages/…`, `src/hooks/…`, `src/mock-data/` paths
that predate the layered refactor.

The **authoritative** backend documentation is
`F:/Project/lims_backend/docs/api_rollout.md` and
`F:/Project/lims_backend/adr/0008-standard-response-envelope.md`.

---

### F12 — No frontend test infrastructure — **MEDIUM (blocks regression testing)**

There is **no** test framework on the frontend:

- No `vitest.config.*`, no `jest.config.*`.
- **0** tracked `*.test.*` / `*.spec.*` files (verified via `git ls-files`).
- No `test` script in `package.json` (`scripts` = `dev`, `build`, `serve`,
  `typecheck`, `lint:layers`).
- No `vitest`/`jest` in `dependencies` or `devDependencies`.

`scripts/` contains five standalone Node verification scripts (not a test
runner): `check-bundle-css.mjs`, `check-layering.mjs`,
`verify-pagination-runtime.mjs`, `verify-pdf-export.mjs`,
`verify-quotation-pagination.mjs`.

The backend **does** have a real suite — **284 tests** across 22 files, all
collecting and the contract subset passing (see §8).

**Consequence:** the Task 4 mandate "add regression tests for affected
consumers" cannot be met without adding a test runner. That is new
infrastructure, not an incremental fix, and needs explicit approval.

---

## 6. Request-body field casing — investigated, **not** a defect

This was a candidate defect and was checked closely, because the client mixes
casings within a single resource. It resolves as **mostly safe** thanks to a
backend dual-case mechanism.

The backend's `legacy_field` helper (`app/domains/shared/naming.py:63-80`)
returns `Field(default, validation_alias=legacy_choices(snake_name))`, and
`legacy_choices` (`naming.py:49-62`) returns
`AliasChoices(snake_name, camelCaseName)`. So fields declared via
`legacy_field` accept **both** spellings on input while serializing as
snake_case.

| Frontend body | Field | Backend declaration | Accepted? |
|---|---|---|---|
| `UserCreate.fullName` | `full_name` | `legacy_field("full_name")` — `users/schemas.py:39` | ✅ both |
| `UserCreate.fullNameAr` | `full_name_ar` | `legacy_field("full_name_ar")` — `users/schemas.py:40` | ✅ both |
| `UserCreate.isActive` | `is_active` | `legacy_field("is_active")` — `users/schemas.py:44` | ✅ both |
| `UserUpdate.status` | `status` | plain — `users/schemas.py:76` | ✅ same |
| `UserCreate.username/email/role` | — | plain — `users/schemas.py:37-43` | ✅ single-word |
| `RoleCreate.labelEn` etc. | `label_en` | `legacy_field("label_en")` — `roles/schemas.py:157-165` | ✅ both |
| `RoleStatusUpdate.isActive` | `is_active` | `legacy_field("is_active")` — `roles/schemas.py:203` | ✅ both |
| `UserOverrideCell.menuKey` | `menu_key` | `legacy_field("menu_key")` — `roles/schemas.py:129` | ✅ both |
| `new_password` (reset) | `new_password` | plain — `users/schemas.py:134` | ✅ same |

**Conclusion:** the request bodies are accepted. The only genuinely
mis-cased request body is `RegisterRequest` (`auth.ts:125-132`, camelCase
`labName`/`contactName`/…) — but that endpoint **does not exist** (F6), so it
is subsumed.

**However**, two residual issues are worth noting:

- `ResetPasswordResponse` is typed with camelCase `resetLink` / `expiresAt`
  (`usersApi.ts:128-133`) with **no normaliser**, while the backend's
  `ResetPasswordResult` (`users/schemas.py:148-166`) is `ok` + `message` only
  (plus `mode` variants) — the client expects fields the server does not send.
- `AuthUser` (`auth.ts:73-85`) targets a user shape that matches neither
  backend `UserOut` — see **F3**.

---

## 7. Other verified observations (no action proposed)

- **Cancellation:** no explicit `AbortSignal` API. `ApiFetchInit` extends
  `RequestInit`, so `signal` can be passed, and TanStack Query aborts cancelled
  queries. Behaviour is acceptable; there is simply no first-class cancellation
  API.
- **Retries:** only via TanStack Query (`retry: 1` for most hooks; 401 excluded
  for `useMe`). **No client-level retry.** Correct — avoids retrying unsafe
  mutations.
- **Concurrency safety:** the auth adapter's generation counter is the one real
  mechanism, and it is well designed.
- **One raw `fetch` outside the client:** `src/presentation/pages/login.tsx:327`
  — the `TestBackendButton` connectivity probe. It builds its own URL from
  `VITE_API_BASE_URL`, posts `{}` to `/auth/login`, does **not** set
  `X-LIMS-API-Version`, does not normalise errors, and duplicates base-URL logic.
  It is a debug affordance, not a data path — but it is where the **F1** base-URL
  bug surfaces in the UI.
- **No hardcoded API URLs** in application code beyond the `/api/v1` default.
- **No duplicate toast logic** — all error presentation routes through
  `errors.ts`.
- **No new state-management library** was introduced.
- **Backend rate limiting is not implemented**, so the `rate_limited` message
  (`errors.ts:34`) has no live trigger.
- **`useTestParameter(id)` does not call `GET /test-parameters/{id}`.** It
  fetches `limit: 200` and scans the list (`tanstack-queries.ts:178-186`).
  The by-id endpoint is implemented (`testParametersApi.ts:180`) but unused.
  Behaviour is correct but wasteful — noted, not a defect.
- **`docs/api/openapi.yaml` is hand-authored**, not generated, and does not
  match the backend. It must not be treated as a type source.
- **Backend `/api/v1/users`, `/api/v1/sample-types`, `/api/v1/workflow-stages`
  return bare JSON arrays** with no pagination. Not consumed by the current
  client.
- **`DELETE /admin/roles/{role}` returns 204 with no `response_model`**
  (`roles/router.py:197`) — enveloped-exempt. The client sends `If-Match` on
  role PATCH (`rolesApi.ts:192`) and user PATCH/suspend/activate
  (`usersApi.ts:281,321,332`); whether the backend honours `If-Match` was **not
  verified**.

---

## 8. Tests and exact commands

### 8.1 Frontend — **no test runner exists**

| Purpose | Command | Result |
|---|---|---|
| Type-check | `npm run typecheck` | ✅ **PASS** — exit 0, 0 diagnostics |
| Layering guard | `npm run lint:layers` | ✅ **PASS** — exit 0, `✔ Layering guard: 0 violations` |
| Production build | `npm run build` | ✅ **PASS** — exit 0, 3118 modules, built in 30.74 s |
| Dev server | `npm run dev` | not run |
| **Unit tests** | — | ❌ **no runner, no test script, 0 test files** |
| **ESLint** | — | ❌ no ESLint config or script |

> `npm run build` runs `tsc --noEmit` before `vite build`, so a type regression
> fails the build. This is the de facto frontend CI gate.

Build emits a chunk-size warning: `dist/assets/index-AYWDWxZM.js` is
**2,361 kB** (662.89 kB gzipped). Not a Task 4 concern; recorded for the record.

### 8.2 Backend — real suite, **284 tests collected**

Test files under `F:/Project/lims_backend/tests/` (22 files + `conftest.py`,
`conftest_helpers.py`, `factories.py`):

| File | Tests | File | Tests |
|---|---|---|---|
| `test_auth.py` | 30 | `test_samples.py` | 25 |
| `test_clients.py` | 26 | `test_test_results.py` | 22 |
| `test_response_contract.py` | 21 | `test_test_list.py` | 18 |
| `test_test_parameters.py` | 18 | `test_users.py` | 17 |
| `test_admin_users.py` | 16 | `test_admin_roles.py` | 13 |
| `test_api_negotiation.py` | 11 | `test_tenants.py` | 9 |
| `test_superadmin_auth.py` | 9 | `test_openapi_contract.py` | 9 |
| `test_architecture.py` | 7 | `test_audit.py` | 6 |
| `test_sample_types.py` | 7 | `test_impersonation.py` | 4 |
| `test_metrics.py` | 4 | `test_admin_schemas.py` | 3 |
| `test_migrations.py` | 1 | | |

**Commands** (from `Makefile:187-228`, `pytest.ini`):

| Purpose | Command |
|---|---|
| Run all tests | `make test` |
| Run all, skip slow | `make test-fast` |
| Run with coverage | `make test-cov` |
| Run one file | `make test-one file=tests/test_auth.py` |
| Direct pytest | `APP_ENV=test DATABASE_URL="sqlite+aiosqlite:///./gl_lims_test.db" python -m pytest` |
| Lint | `make lint` → `ruff check app tests` |
| Type-check | `make typecheck` → `mypy app` |
| Build + seed throwaway DB | `make setup-test` |

**Mandatory environment.** `tests/conftest.py::pytest_sessionstart`
(`:102-116`) **aborts collection** unless `APP_ENV=test` and the resolved
`DATABASE_URL` is SQLite or a DB whose name contains `test`. Escape hatch:
`ALLOW_DESTRUCTIVE_TESTS=1` (do not use). `tests/conftest.py:50-57` sets both
defaults if unset, but setting them explicitly is safer.

`ruff` and `mypy` require `pip install -r requirements-dev.txt`.

### 8.3 Verification executed during this audit

| Command | Working dir | Result |
|---|---|---|
| `npm run typecheck` | `F:/Project/Lims` | ✅ PASS — 0 diagnostics |
| `npm run lint:layers` | `F:/Project/Lims` | ✅ PASS — 0 violations |
| `npm run build` | `F:/Project/Lims` | ✅ PASS — 3118 modules, 30.74 s |
| `pytest tests/test_response_contract.py tests/test_api_negotiation.py -q` | `F:/Project/lims_backend` | ✅ **34 passed** |
| `pytest --collect-only` | `F:/Project/lims_backend` | ✅ **284 collected**, 0 errors |

The **34 contract tests** are the backend's own regression suite for exactly the
contract this frontend depends on — envelope shape, pagination fields, error
codes, request-id echo, and version negotiation. They are the right place to
extend if any backend-side behaviour changes.

---

## 9. Risks

| # | Risk | Severity | Detail |
|---|---|---|---|
| R1 | Superadmin login is **completely broken** in API mode | High | F2 — wrong prefix. `superadmin-login.tsx:24` |
| R2 | Password reset + OTP verify are **dead ends** | High | F4 + F5 — wrong path *and* wrong field |
| R3 | Register + OTP resend hit **non-existent routes** | Medium | F6 — 404; needs a product decision, not just a code fix |
| R4 | Admin user list **silently ignores** the requested page size | Medium | F7 — no error, wrong page size; worst failure mode |
| R5 | `.env.example` ships a **broken base URL** | Medium | F1 — a new developer's first setup 404s on every call |
| R6 | Username login sends **422** to the backend | Medium | F3 — the `username` branch cannot succeed against the current backend |
| R7 | Stale comments direct developers at **non-existent backend defects** | Medium | F1/F10 — `api.ts:47-61` and `auth.ts:1-9` describe a cookie+CSRF backend that never existed |
| R8 | `PUKU.md` will **mislead every future agent** in this repo | Medium | F11 — flat layout, "no backend", "no fetch" — all false |
| R9 | `docs/api/` is a **20-point-mismatched** spec that reads as authoritative | Medium | F11 — `README.md:3-5` says the backend "must" implement it |
| R10 | **No frontend test safety net** | Medium | F12 — fixes to F1–F7 cannot be regression-tested |
| R11 | Backend working tree has **uncommitted work** (Docker, worker, tasks) | Medium | §1.2 — do not modify the backend; stack changes would conflict |
| R12 | `AuthUser` shape matches **neither** backend `UserOut` | Low | F3 — `username`/`clientId` permanently empty in API mode |
| R13 | `ResetPasswordResponse` expects fields the server **does not send** | Low | §6 — `resetLink`/`expiresAt` |
| R14 | `unwrapData` fails **silently** on a non-enveloped body | Low | F8 |
| R15 | `If-Match` optimistic-concurrency semantics **unverified** | Low | §7 — not read on the backend side |
| R16 | `dist/` is committed to git; `dist/signatures/*.png` is a PII concern | Low | pre-existing project rule |

---

## 10. Prioritized minimal implementation plan

> **NOT APPLIED.** Awaiting explicit approval. All items are frontend-only and
> require **no backend change**.

### Phase 1 — Correctness blockers (fix first; each is a small, surgical diff)

| # | Change | File(s) | Fixes |
|---|---|---|---|
| P1.1 | Introduce a **superadmin base URL** and route superadmin calls to it — e.g. derive `/api/superadmin` from the tenant base, or add `VITE_API_SUPERADMIN_BASE_URL` | `api.ts`, `auth.ts` | F1, F2, R1 |
| P1.2 | Normalise `getBaseUrl()` so a bare origin **and** an origin+prefix both resolve correctly; strip a trailing `/api/v1` from the env var and re-append it | `api.ts:41-45` | F1, R5 |
| P1.3 | Fix the four auth paths: `forgot-password`, `otp-verify`, and the superadmin pair | `auth.ts:156-161,177-180,252-264` | F2, F4, R1, R2 |
| P1.4 | Rename the OTP body field `otp` → `code`; update the caller | `auth.ts:259-264`, `pages/otp-verify.tsx:51` | F5, R2 |
| P1.5 | Send `page_size` (not `pageSize`) to `/admin/users` | `usersApi.ts:196-198` | F7, R4 |
| P1.6 | Correct the stale `api.ts:47-61` warning and the cookie/CSRF comments | `api.ts:47-61`, `auth.ts:1-9` | F1, F10, R7 |

### Phase 2 — Dead-end flows (need a **product decision**, not just a code fix)

| # | Item | Options |
|---|---|---|
| P2.1 | `/auth/register` (F6) | (a) hide the UI affordance; (b) keep it and surface a friendly "not available"; (c) backend route is planned — **requires backend work** |
| P2.2 | `/auth/otp/resend` (F6) | same options as P2.1 |
| P2.3 | Username login (F3) | (a) require email and drop the `username` branch — **recommended**, the branch provably cannot succeed; (b) keep for a future backend change |
| P2.4 | `localStorage` token storage | Confirm it stays. The backend is Bearer-only, so httpOnly cookies need a backend change. **No action recommended.** |

### Phase 3 — Type-safety hardening (small, low-risk)

| # | Change | File(s) | Fixes |
|---|---|---|---|
| P3.1 | Give `unwrapData` the same loud guard `unwrapPage` has | `response.ts:99-101` | F8, R14 |
| P3.2 | Read `error.request_id` as a fallback alongside `meta.request_id` | `response.ts:169-178`, `api.ts:106-111` | F9 |
| P3.3 | Reconcile `AuthUser` with the backend's auth `UserOut`; align `ResetPasswordResponse` | `auth.ts:73-85`, `usersApi.ts:128-133` | R12, R13 |
| P3.4 | Route the `login.tsx` connectivity probe through `apiFetch` (or a shared base-URL helper) | `pages/login.tsx:315-340` | F1 surface, C18 |

### Phase 4 — Test infrastructure (**requires approval — new dependency**)

| # | Change | Fixes |
|---|---|---|
| P4.1 | Add **Vitest** (Vite-native, minimal) with `apiFetch` unit tests: base-URL resolution, the 204 path, the error-envelope matrix, and `unwrapData`/`unwrapPage` guards | F12, R10 |
| P4.2 | Add a **contract test** that asserts every frontend endpoint path against the backend's live `/api/v1/openapi.json` — this is the structural fix for the whole class of F2/F4/F6/F7 defects | F2, F4, F6, F7 |
| P4.3 | Add tests for `buildLoginPayload`, `getTokenExpiry`, and the auth session race guard | F3, C7 |

### Phase 5 — Documentation (separate, doc-only)

| # | Change | Fixes |
|---|---|---|
| P5.1 | Rewrite `PUKU.md` to match the layered tree and the real API-client location; correct "No backend" and the `fetch` rule | F11, R8 |
| P5.2 | Retire or rewrite `docs/api/` to match the shipped backend — point to `lims_backend/docs/api_rollout.md` + ADR 0008; at minimum correct the auth/CSRF/pagination/envelope sections | F11, R9 |
| P5.3 | Document the two-prefix model (`/api/v1` vs `/api/superadmin`) prominently | F2 |

### Suggested sequencing

```
P1.1 → P1.2 → P1.3 → P1.4 → P1.5 → P1.6      (Phase 1: ship together)
        ↓
P4.1 → P4.2                                   (test net, before Phase 3)
        ↓
P3.1 → P3.2 → P3.3 → P3.4                     (Phase 3)
        ↓
P2.1 – P2.4 await decisions                    (Phase 2)
        ↓
P5.1 → P5.2 → P5.3                             (Phase 5)
```

**Dependencies:** P1.1 and P1.2 share a root cause and should be designed
together. P4.2 depends on P1.1–P1.5 being in place so the contract test
asserts the *corrected* paths.

**Estimated scope:** Phase 1 ≈ 6 files; Phase 3 ≈ 4 files; Phase 4 adds
Vitest as a devDependency plus ~2 test files. No backend change is required
for any of Phases 1, 3, 4, or 5.

---

## 11. Implementation status (added after approval)

> The audit above is the original read-only assessment. This section records
> what was subsequently **implemented** in the frontend repo on 2026-10-27.
> No backend files were modified.

### Phase 1 — correctness fixes ✅

| # | Change | Files |
|---|---|---|
| P1.1 | Two-prefix model: `getBaseUrl()` normalizes `VITE_API_BASE_URL` to end in `/api/v1`; new `getSuperadminBaseUrl()` derives `/api/superadmin` from the same origin. `apiFetch` accepts a per-call `baseUrl` override. | `src/infrastructure/api/api.ts` |
| P1.2 | Superadmin login now targets `/api/superadmin/auth/login` instead of `/api/v1/auth/login`. | `src/infrastructure/api/auth.ts` |
| P1.3 | Auth paths corrected: `forgot-password`, `otp-verify` with `{email, code}` body. `register` / `otp-resend` retained but documented as backend-absent. | `src/infrastructure/api/auth.ts` |
| P1.4 | `buildLoginPayload` always sends `{email, password}`; the username branch was removed from `AuthContext`. | `src/infrastructure/api/auth.ts`, `src/presentation/providers/AuthContext.tsx` |
| P1.5 | `AuthUser` wire type replaced with the backend's real 6-field shape; `RawAuthUser` accepts the untyped role string. | `src/infrastructure/api/auth.ts`, `src/infrastructure/api/repositories/authSession.ts` |
| P1.6 | `credentials: "include"` → `"same-origin"` (backend is Bearer-only, no cookies). Misleading `warnEnvTokenOnce` text removed. | `src/infrastructure/api/api.ts` |

Also fixed in the same files: `unwrapData` throws a diagnostic error instead of
returning `undefined` for a non-enveloped body; `buildListQuery` sends
`page_size` (not `pageSize`); `ResetPasswordResponse` reduced to `{ok, message}`;
the login connectivity probe now uses `apiFetch` (a 4xx counts as reachable);
`RoleAvatar` switched to the **domain** `AuthUser` type; the admin
reset-password UI no longer branches on a phantom `resp.mode === "set"`.

### Phase 3 — type-safety hardening ✅

`RawAuthUser` is no longer `extends Partial<AuthUser>` (TS2430 — `role` was
`Role` vs `string`).

### Phase 4 — regression test net ✅

Vitest 2.1.9 added as a devDependency; `vitest.config.ts` created (node
environment, `@` alias, `src/**/*.test.ts`).

| File | Tests | Covers |
|---|---|---|
| `src/infrastructure/api/__tests__/api.test.ts` | 23 | Base-URL normalization, two-prefix model, enveloped header, 204 path, error-envelope matrix, request-id fallbacks |
| `src/infrastructure/api/__tests__/response.test.ts` | 22 | Envelope guards, `unwrapData`/`unwrapPage`, validation issues, error code, request id |
| `src/infrastructure/api/__tests__/auth.test.ts` | 14 | Pins every auth endpoint path and body field; `getTokenExpiry` |
| `src/infrastructure/api/__tests__/contract.test.ts` | 13 | **Structural fix** — transcribes the backend route table with citations and live-checks each client function hits a real route |

**Total: 72 tests, all passing.** The contract test makes the whole F2–F7
defect class structurally unable to recur silently.

### Phase 5 — documentation ✅

- `PUKU.md` rewritten to match the layered tree, the real API-client location,
  mock-first semantics, the two-prefix model, Bearer-only auth, and the new
  test commands.
- `CLAUDE.md` updated (§1, §2, §4, §6, §7, §8, §10, §11, §12, §13, §14).
- All 7 files in `docs/api/` marked **HISTORICAL — NOT the shipped contract**,
  with a mismatch table in `docs/api/README.md` pointing at the backend as
  authoritative.
- `.puku-cli/skills/{add-page,add-mock-data,bilingual-component,code-review}/SKILL.md`
  updated to the current layered paths; the `code-review` skill no longer
  references a non-existent `npm run lint` script.
- `.env.example` comment now matches its value and documents that `/api/v1` is
  appended automatically and superadmin is derived from the same origin.

### Verification (final sweep)

```
npm run typecheck    → PASS (no errors)
npm run lint:layers  → PASS (0 violations)
npm test             → PASS (72 tests, 4 files)
npm run build        → PASS
```

### Still open — requires a product decision ⚠️

**P2.1 / P2.2 — `POST /auth/register` and `POST /auth/otp/resend` have no
backend route.** The UI affordances remain live and will 404 in API mode.
Three options, none of which is a code-correctness issue:

1. **Hide the UI** in API mode.
2. **Surface a friendly "not available"** message instead of a raw 404.
3. **Add backend routes** (requires backend authorization — out of scope for
   this frontend repo).

Everything else in the plan is implemented. The backend repo was not modified.

---

## 12. Open questions for the user

1. **P2.1 / P2.2 — register and OTP resend.** No backend route exists. Hide the
   UI, surface a friendly error, or add backend routes? **Still open.**
2. **P2.3 — username login.** ~~Drop the `username` branch (recommended)?~~
   **Resolved — branch dropped.**
3. **P2.4 — `localStorage` token storage.** Confirm it stays as-is, or open a
   backend ticket for httpOnly-cookie support? **Left as-is.**
4. **P4 — add Vitest?** ~~The frontend has no runner.~~ **Resolved — Vitest
   2.1.9 added, 72 tests.**
5. **P5 — scope of `docs/api/`.** **Resolved — marked historical with a
   mismatch table; the backend is authoritative.**
6. **P5.1 — `PUKU.md`.** **Resolved — rewritten.**
7. **R15 — `If-Match`.** Should the backend's optimistic-concurrency support be
   verified and the header contract pinned, or should the frontend stop
   sending `If-Match` until the backend contract is explicit? **Still open.**

---

## 13. Files inspected

### Frontend — `F:/Project/Lims`

| File | Purpose |
|---|---|
| `src/infrastructure/api/api.ts` | `apiFetch`, `ApiError`, `getBaseUrl` |
| `src/infrastructure/api/response.ts` | Envelope types, guards, unwrap helpers |
| `src/infrastructure/api/errors.ts` | Bilingual error-code map |
| `src/infrastructure/api/auth.ts` | Token storage, auth endpoints, JWT expiry |
| `src/infrastructure/api/tanstack-queries.ts` | 20+ query/mutation hooks |
| `src/infrastructure/api/repositories/authSession.ts` | HTTP `AuthSession` adapter, race guard |
| `src/infrastructure/api/clients/usersApi.ts` | Users CRUD, menu overrides |
| `src/infrastructure/api/clients/rolesApi.ts` | Roles CRUD, menu permissions, menu keys |
| `src/infrastructure/api/clients/testParametersApi.ts` | Test parameter catalogue |
| `src/infrastructure/api/clients/testListApi.ts` | Test list catalogue |
| `src/infrastructure/di/container.ts` | Composition root |
| `src/presentation/providers/AuthContext.tsx` | Auth state machine |
| `src/presentation/pages/login.tsx` (partial) | Login form + the one raw `fetch` |
| `src/presentation/pages/superadmin-login.tsx` | Superadmin login call site |
| `src/presentation/pages/otp-verify.tsx` | OTP call site |
| `package.json`, `vite.config.ts`, `.env.example`, `.env.local` | Scripts, proxy, env |
| `docs/api/*` (7 files) | Pre-implementation contract |

### Backend — `F:/Project/lims_backend`

| File | What was confirmed |
|---|---|
| `app/main.py` | Middleware, envelope/error building, prefixes, CORS, mounts |
| `app/api/negotiation.py` | `X-LIMS-API-Version`, default contract |
| `app/api/envelope.py` | `data`/`meta` construction, pagination conversion |
| `app/api/v1/__init__.py` | `/api/v1` prefix, router includes |
| `app/api/v1/superadmin.py` | `/api/superadmin` prefix |
| `app/domains/auth/router.py`, `schemas.py` | Auth paths, `LoginRequest`, `OtpVerifyRequest`, `UserOut`, `Token` |
| `app/domains/auth/service.py` | Refresh rotation |
| `app/domains/superadmin/router_auth.py`, `service_auth.py`, `schemas_auth.py` | Superadmin paths, rotation, token shape |
| `app/domains/shared/common.py` | `PaginationInfo`, `ResponseMeta`, `ErrorBody` |
| `app/domains/shared/errors.py` | Full error-code set |
| `app/domains/shared/naming.py` | `legacy_field` / `legacy_choices` dual-case aliases |
| `app/domains/users/router_admin.py`, `schemas.py` | `/admin/users` paths, pagination params, body schemas |
| `app/domains/roles/router.py`, `schemas.py` | `/admin/roles` paths, body schemas |
| `app/domains/tests/router.py`, `router_parameter.py`, `router_list.py` | Test routes, pagination |
| `app/domains/health/router.py` | `/health`, `/health/db` |
| `app/core/deps.py`, `security.py`, `config.py`, `pagination.py` | OAuth2 scheme, token types/lifetimes, CORS, pagination |
| `Makefile`, `pytest.ini`, `requirements.txt`, `tests/conftest.py` | Test/lint/typecheck commands, env requirements |

### Not inspected

- `.backup_artifacts/`, `.backup_lib/`, `.backup_scripts/` — excluded by project rule.
- Backend `app/tasks/` and `app/worker/` — new, untracked, outside the contract surface.
- Backend `app/domains/` sub-trees for samples, clients, accounting, quotations
  (routes enumerated; field-level schemas not audited).
- Frontend `src/presentation/pages/**` beyond the three auth-related pages.
- Frontend `src/domain/**` — read only via the port interfaces.
