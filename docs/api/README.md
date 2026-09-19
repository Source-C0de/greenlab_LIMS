# GreenLabLIMS KSA — Backend API Contract

> **Status:** Documentation-only deliverable. The frontend SPA is still
> 100% mock-data; this directory is the **contract** the backend must
> implement so the SPA can be wired to it incrementally.
>
> **Base path (production):** `https://<your-domain>/api/v1`
> **Base path (dev):**       `http://localhost:8000/api/v1`
> **Auth:**                   JWT in an **httpOnly cookie** (see [Auth](#auth))
> **Content-Type:**           `application/json; charset=utf-8` (request & response)

## What's in this directory

| File | Purpose | Read first? |
|---|---|---|
| [`README.md`](./README.md) | Conventions, auth, error envelope, pagination, integration overview | **Yes** |
| [`openapi.yaml`](./openapi.yaml) | OpenAPI 3.1 spec — machine-readable contract for tooling | yes |
| [`endpoints.md`](./endpoints.md) | Flat numbered list of all 95 endpoints with SPA file:line references | yes |
| [`data-model.md`](./data-model.md) | Canonical entity field-by-field mapping to `src/mock-data/*.ts` | yes |
| [`integration-guide.md`](./integration-guide.md) | 7-phase step-by-step for wiring the frontend to this API | yes |
| [`gaps.md`](./gaps.md) | Open questions for the backend team before implementation starts | no |

## Lineage & precedence

Two older planning artifacts live in this repo and **disagree** with each
other. This contract explicitly aligns with one of them.

- **[`../../backend.md`](../../backend.md)** — single-tenant Python/FastAPI
  BFF plan. **This is the design baseline.** Paths, table inventory,
  pagination, role gating, and the deployment plan all track `backend.md`.
  The only deliberate divergence is auth delivery (httpOnly cookie here
  vs. `Authorization: Bearer` in `backend.md` §5) — see [`gaps.md`](./gaps.md)
  for the rationale.
- **[`../SUPERADMIN_API.md`](../SUPERADMIN_API.md)** +
  **[`.backup_lib/api-spec/superadmin.openapi.yaml`](../../.backup_lib/api-spec/superadmin.openapi.yaml)`
  — multi-tenant superadmin-scope design with `/api/superadmin/...` paths.
  **Out of scope for this contract.** `superadmin` becomes a *role* (one
  of seven in the `Role` enum), not a path scope. The legacy YAML stays
  in `.backup_lib/` as a historical artifact; do not modify or import it.

If you find yourself wanting `/api/superadmin/...` paths or
`tenant_id` columns, you have re-entered the multi-tenant design — stop
and decide which plan is actually in scope.

## Conventions

### Versioning

All paths are under `/api/v1/`. Breaking changes require a new prefix
(`/api/v2/`); non-breaking additions (new optional fields, new endpoints)
ship on `v1`.

### HTTP verbs

| Verb   | Meaning                          | Idempotent? |
|--------|----------------------------------|-------------|
| GET    | Read one or many                 | yes         |
| POST   | Create a new resource            | no          |
| PUT    | Replace a resource (full update) | yes         |
| PATCH  | Partial update                   | no          |
| DELETE | Soft-delete by default           | yes         |

Soft-delete is preferred: deleted rows get `deletedAt: ISO8601` and are
excluded from default list queries. A `?includeDeleted=true` query flag
re-includes them. Hard-delete is reserved for admin-cleanup endpoints.

### Response envelopes

**Success (single resource):**

```json
{ "data": { /* the resource */ } }
```

**Success (collection):**

```json
{
  "data": [ /* resources */ ],
  "pagination": {
    "page": 1,
    "pageSize": 25,
    "total": 137,
    "totalPages": 6
  }
}
```

**Success (no body):** `204 No Content` with no body. Not wrapped.

**Error (uniform across all endpoints):**

```json
{
  "error": {
    "code": "validation",
    "message": "human-readable summary",
    "details": { "field": ["specific issue"] },
    "requestId": "req_01HX..."
  }
}
```

The `code` enum is fixed: `"unauthorized" | "forbidden" | "not_found" |
"validation" | "conflict" | "rate_limited" | "internal"`. The frontend
maps these to UI states (login redirect, toast, inline form error, etc.).

### Pagination

All collection endpoints accept `?page=1&pageSize=25`. Defaults:
`page=1`, `pageSize=25`, max `pageSize=200`. Cursor pagination is **not**
used — the SPA's `DataTable` component already speaks page+pageSize
(`src/components/shared/DataTable.tsx:40-49`).

### Filtering & sorting

- Search-style filters use `?q=...` and match a precomputed search field
  (concat of name + nameAr + ID where applicable).
- Exact-match filters are explicit: `?status=approved&clientId=C007`.
- Range filters use `?from=ISO8601&to=ISO8601`.
- Sort is `?sortBy=<field>&sortOrder=asc|desc`. Allowed `sortBy` values
  are documented per-endpoint in [`openapi.yaml`](./openapi.yaml).

### Field naming

JSON field names match the existing TypeScript types in
`src/mock-data/*.ts` exactly. Backend should mirror the casing:
**camelCase** throughout (the SPA never uses snake_case). ISO-8601
timestamps everywhere (e.g. `"2026-09-19T10:30:00Z"`).

### Bilingual fields

Entities with user-visible names carry paired fields:

```ts
{ "nameEn": "Lab Manager", "nameAr": "مدير المختبر" }
```

Follow the pattern used in `src/mock-data/rolePermissions.ts:25-32`:
`nameEn`/`nameAr`, `labelEn`/`labelAr`, etc. Never localize status codes
or enum values (`status: "approved"` stays `"approved"` in both
languages).

### IDs

- All resource IDs are server-minted strings (ULID or UUIDv4). The SPA
  does not generate IDs.
- **Exception: `Sample.id`** is the legacy `<PREFIX>/<YYYY>/<NNNN>`
  format (`src/lib/sample-id.ts:18`) and **must** be minted by the
  backend in the same shape. The frontend today generates these in
  `samples/receiving.tsx:88-100`; the backend replaces that logic.
- Because sample IDs contain `/`, the SPA's wouter route uses a splat
  (`App.tsx:82-87`). Backend URLs should accept percent-encoded IDs
  (`/samples/FD%2F2024%2F0001`).

## Auth

### Login

```
POST /api/v1/auth/login
Content-Type: application/json

{ "username": "admin", "password": "admin123" }

→ 200 OK
Set-Cookie: glims_session=<JWT>; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=86400
{
  "data": {
    "user": { "id": "u_01...", "username": "admin", "fullName": "Aisha Al-Saud",
              "role": "admin", "isActive": true },
    "expiresAt": "2026-09-20T10:30:00Z"
  }
}
```

### Logout

```
POST /api/v1/auth/logout
→ 204 No Content
Set-Cookie: glims_session=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0
```

### `me`

The frontend calls this on app mount (replacing today's
`currentRole` `useState` default) and after any auth event.

```
GET /api/v1/auth/me
→ 200 OK
{ "data": { "id": "u_01...", "username": "admin", "fullName": "...", "role": "admin", "isActive": true } }

→ 401 Unauthorized (cookie missing or expired)
{ "error": { "code": "unauthorized", "message": "Session expired.", "requestId": "..." } }
```

### CSRF

Because auth is cookie-based, **state-changing requests
(POST/PUT/PATCH/DELETE) require a CSRF token**. Two acceptable
strategies; pick one and stick with it:

1. **Double-submit cookie:** the login response sets a non-HttpOnly
   `glims_csrf` cookie in addition to the HttpOnly session cookie.
   The frontend reads `glims_csrf` and echoes it in an
   `X-CSRF-Token` header on every state-changing request.
2. **Origin check:** the backend rejects state-changing requests whose
   `Origin` header does not match an allowlist.

The `openapi.yaml` marks CSRF-required endpoints with an `x-csrf: true`
vendor extension.

### Token refresh

Single-token model (24h JWT in cookie). No refresh endpoint in v1.
Clients re-login on 401. If product decides 24h is too short, add
`POST /api/v1/auth/refresh` later — no breaking change.

## Rate limiting

Standard headers on every response:

```
X-RateLimit-Limit: 600
X-RateLimit-Remaining: 587
X-RateLimit-Reset: 1695110400
```

429 responses use the standard error envelope with
`code: "rate_limited"` and add `Retry-After: <seconds>`.

## Health & meta

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/v1/health` | Liveness probe (200 always) |
| GET | `/api/v1/ready` | Readiness probe (DB + Redis reachable) |
| GET | `/api/v1/version` | Backend build version + commit |

## Integration overview (frontend)

The high-level sequence for the frontend team is documented in
detail in [`integration-guide.md`](./integration-guide.md). TL;DR:

1. Auth (login → cookie → `/me`).
2. Reference data (clients, analysts, sample types, chart of accounts).
3. Samples (list + receive + detail).
4. Tests & approval workflow.
5. Reports & invoices (with ZATCA).
6. Accounting (journals, ledger, reports).
7. Admin (tenants, plans, permissions matrix).

Each phase swaps one mock-data read at a time — the rest of the SPA
keeps working against in-memory data.

## Open questions

See [`gaps.md`](./gaps.md) for decisions the backend team needs to
resolve before starting implementation.