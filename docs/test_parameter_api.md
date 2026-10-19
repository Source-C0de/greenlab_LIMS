# Test Parameter Catalogue — Frontend API Contract

This is the single source of truth for the `Test Parameter` (a.k.a.
"specification test parameter") page in the frontend. It lists every
endpoint, every field, every error code, and includes copy-pasteable
`curl` and JavaScript examples.

> A machine-readable version of this contract is in
> [`openapi/test_parameter.openapi.json`](./openapi/test_parameter.openapi.json).
> Regenerate it with `python scripts/export_openapi.py` whenever a
> field or endpoint changes.

---

## 1. Base URL & authentication

- **Base URL** (dev): `http://localhost:8000/api/v1`
- **Base URL** (prod): `https://<your-host>/api/v1`
- **Auth**: every request must carry the access token issued by
  `POST /api/v1/auth/login`:

  ```http
  Authorization: Bearer <access_token>
  ```

  In the SPA: `fetch(url, { headers: { Authorization: 'Bearer ' + token } })`.
- **CORS**: the backend already allows the configured origins and
  sends `Access-Control-Allow-Credentials: true`, so
  `fetch(url, { credentials: 'include' })` is safe.
- **Content type**: `application/json; charset=utf-8` for all
  request bodies.
- **Date format**: ISO-8601 in UTC, e.g. `2026-10-18T09:42:11.123456+00:00`.

---

## 2. The 8 columns the frontend table must show

The list view shows exactly these 8 columns (matching the source
`Specifications _parameter_sheet.csv`). `id`, `is_active`, `created_at`,
and `updated_at` are lifecycle fields; expose them only on the
detail/edit panel.

| # | UI label     | JSON field  | Type           | Nullable | Notes                                   |
|---|--------------|-------------|----------------|----------|-----------------------------------------|
| 1 | ID           | `code`      | string (≤32)   | NO       | Unique, natural key (e.g. `GL-P-7`)     |
| 2 | Spec         | `spec`      | string (≤64)   | YES      | Free-text short tag (e.g. `FOOD`)       |
| 3 | Test Name    | `test_name` | string (≤255)  | YES      |                                         |
| 4 | Parameter    | `parameter` | string (≤255)  | NO       |                                         |
| 5 | Reference    | `reference` | string (≤255)  | YES      | e.g. `IH/FDA`, `US EPA 200.8/MEWA`      |
| 6 | Tests        | `tests`     | string (≤255)  | YES      | e.g. `NMT 10`, `6.5-8.5`                |
| 7 | MU           | `mu`        | string (≤64)   | YES      | Measurement uncertainty                 |
| 8 | SOP Code     | `sop_code`  | string (≤64)   | YES      | e.g. `GL/P-720/SOP/F-001`               |

**Lifecycle fields** (use on detail/edit only):

| JSON field    | Type    | Notes                                                    |
|---------------|---------|----------------------------------------------------------|
| `id`          | UUID    | Server-generated; use in URLs for GET/PATCH/DELETE.      |
| `is_active`   | boolean | `true` by default. Admins can soft-disable a row.        |
| `created_at`  | string  | ISO-8601 timestamp, set on insert.                       |
| `updated_at`  | string  | ISO-8601 timestamp, refreshed on every PATCH.            |

---

## 3. Endpoints

All paths are relative to `<BASE_URL>`. Every response uses the
envelopes described in §4.

| # | Method | Path                       | Auth        | Body                    | Success response                |
|---|--------|----------------------------|-------------|-------------------------|---------------------------------|
| 1 | GET    | `/test-parameters`         | any user    | — (query params below)  | `200 Paginated<TestParameterOut>` |
| 2 | GET    | `/test-parameters/{id}`    | any user    | —                       | `200 TestParameterOut`          |
| 3 | POST   | `/test-parameters`         | **admin**   | `TestParameterCreate`   | `201 TestParameterOut`          |
| 4 | PATCH  | `/test-parameters/{id}`    | **admin**   | `TestParameterUpdate`   | `200 TestParameterOut`          |
| 5 | DELETE | `/test-parameters/{id}`    | **admin**   | —                       | `204 No Content`                |

### 3.1 `GET /test-parameters` — list with filters

Query parameters (all optional):

| Param       | Type    | Default | Notes                                                                                              |
|-------------|---------|---------|----------------------------------------------------------------------------------------------------|
| `search`    | string  | —       | Case-insensitive substring on `code`, `parameter`, `test_name`, `sop_code`, `spec`.                 |
| `spec`      | string  | —       | Exact match (e.g. `FOOD`, `WATER`).                                                                |
| `sop_code`  | string  | —       | Exact match.                                                                                       |
| `is_active` | boolean | —       | `true` or `false`. Omit to return both.                                                            |
| `limit`     | integer | `50`    | `1..200`.                                                                                          |
| `offset`    | integer | `0`     | `≥ 0`.                                                                                             |

Sort order: numeric on the integer tail of `code` (so `GL-P-7` →
`GL-P-8` → … → `GL-P-10`, not lexical `GL-P-10` before `GL-P-2`).

```bash
curl -s -G "http://localhost:8000/api/v1/test-parameters" \
  -H "Authorization: Bearer $TOKEN" \
  --data-urlencode "search=Vitamin" \
  --data-urlencode "spec=FOOD" \
  --data-urlencode "limit=20" | jq
```

### 3.2 `GET /test-parameters/{id}` — fetch one

```bash
curl -s "http://localhost:8000/api/v1/test-parameters/$ID" \
  -H "Authorization: Bearer $TOKEN" | jq
```

### 3.3 `POST /test-parameters` — create (admin)

Body uses `TestParameterCreate` (all 8 CSV fields, no lifecycle
fields — `is_active` is forced to `true` on insert and `id` /
`created_at` / `updated_at` are server-generated).

```bash
curl -s -X POST "http://localhost:8000/api/v1/test-parameters" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "code": "GL-P-999",
    "spec": "FOOD",
    "test_name": "Demo Test",
    "parameter": "Demo Parameter",
    "reference": "ISO 1234",
    "tests": "NMT 1",
    "mu": "0.5",
    "sop_code": "GL/P-720/SOP/F-999"
  }' | jq
```

### 3.4 `PATCH /test-parameters/{id}` — partial update (admin)

Every field is optional. Only the keys present in the body are
applied; `null` is **not** a valid value (omitted instead). The
`is_active` flag is the only field on top of the 8 CSV columns.

```bash
curl -s -X PATCH "http://localhost:8000/api/v1/test-parameters/$ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{ "parameter": "Demo (updated)", "is_active": false }' | jq
```

### 3.5 `DELETE /test-parameters/{id}` — hard delete (admin)

Returns `204 No Content` with an empty body. The next `GET /{id}`
returns `404`.

```bash
curl -i -X DELETE "http://localhost:8000/api/v1/test-parameters/$ID" \
  -H "Authorization: Bearer $TOKEN"
```

---

## 4. Schemas (TypeScript-style)

```ts
// ---------- request bodies ----------

export interface TestParameterCreate {
  code: string;            // 1..32 chars, unique
  spec?: string | null;    // ≤ 64 chars
  test_name?: string | null; // ≤ 255 chars
  parameter: string;       // 1..255 chars
  reference?: string | null; // ≤ 255 chars
  tests?: string | null;   // ≤ 255 chars
  mu?: string | null;      // ≤ 64 chars
  sop_code?: string | null; // ≤ 64 chars
}

export interface TestParameterUpdate {
  code?: string;           // 1..32 chars
  spec?: string | null;
  test_name?: string | null;
  parameter?: string;      // 1..255 chars
  reference?: string | null;
  tests?: string | null;
  mu?: string | null;
  sop_code?: string | null;
  is_active?: boolean;
}

// ---------- response ----------

export interface TestParameterOut {
  id: string;              // UUID
  code: string;
  spec: string | null;
  test_name: string | null;
  parameter: string;
  reference: string | null;
  tests: string | null;
  mu: string | null;
  sop_code: string | null;
  is_active: boolean;
  created_at: string;      // ISO-8601
  updated_at: string;      // ISO-8601
}

// ---------- paginated envelope (reused across the API) ----------

export interface Paginated<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
}
```

---

## 5. Example responses

### 5.1 List — `GET /test-parameters?spec=FOOD&limit=2`

```json
{
  "items": [
    {
      "id": "8a3c1e1f-4b6d-4a23-9d4d-2e9d4f8b6c11",
      "code": "GL-P-7",
      "spec": "FOOD",
      "test_name": "Analysis of Ascorbic acid in Juices",
      "parameter": "Vitamin C",
      "reference": "IH/FDA",
      "tests": "10-19%",
      "mu": null,
      "sop_code": "GL/P-720/SOP/F-001",
      "is_active": true,
      "created_at": "2026-09-22T13:00:00+00:00",
      "updated_at": "2026-09-22T13:00:00+00:00"
    },
    {
      "id": "5b6d3c91-9a02-4b16-9a1c-4c2b0b3a5d77",
      "code": "GL-P-8",
      "spec": "FOOD",
      "test_name": "Analysis of Hydroxy-methyl-furfural (HMF) in Honey",
      "parameter": "HMF",
      "reference": "IHC 2009/GSO Standard",
      "tests": "NMT 60",
      "mu": null,
      "sop_code": "GL/P-720/SOP/F-002",
      "is_active": true,
      "created_at": "2026-09-22T13:00:00+00:00",
      "updated_at": "2026-09-22T13:00:00+00:00"
    }
  ],
  "total": 23,
  "limit": 2,
  "offset": 0
}
```

### 5.2 Single — `GET /test-parameters/{id}`

```json
{
  "id": "8a3c1e1f-4b6d-4a23-9d4d-2e9d4f8b6c11",
  "code": "GL-P-7",
  "spec": "FOOD",
  "test_name": "Analysis of Ascorbic acid in Juices",
  "parameter": "Vitamin C",
  "reference": "IH/FDA",
  "tests": "10-19%",
  "mu": null,
  "sop_code": "GL/P-720/SOP/F-001",
  "is_active": true,
  "created_at": "2026-09-22T13:00:00+00:00",
  "updated_at": "2026-09-22T13:00:00+00:00"
}
```

### 5.3 Create — `POST /test-parameters` → `201`

```json
{
  "id": "f4e6a2b8-2c14-4d92-9b6d-1d8b3c8d2e44",
  "code": "GL-P-999",
  "spec": "FOOD",
  "test_name": "Demo Test",
  "parameter": "Demo Parameter",
  "reference": "ISO 1234",
  "tests": "NMT 1",
  "mu": "0.5",
  "sop_code": "GL/P-720/SOP/F-999",
  "is_active": true,
  "created_at": "2026-10-18T10:30:00+00:00",
  "updated_at": "2026-10-18T10:30:00+00:00"
}
```

### 5.4 Validation error — `422`

```json
{
  "detail": [
    {
      "type": "string_too_short",
      "loc": ["body", "parameter"],
      "msg": "String should have at least 1 character",
      "input": ""
    }
  ]
}
```

### 5.5 Conflict — duplicate `code` → `409`

```json
{ "detail": "A test parameter with code 'GL-P-7' already exists" }
```

### 5.6 Not found — `404`

```json
{ "detail": "Test parameter not found" }
```

### 5.7 Forbidden — non-admin tries to POST → `403`

```json
{ "detail": "You don't have permission to access this resource" }
```

---

## 6. Error codes summary

| Status | When                                                              | Shape                  |
|--------|-------------------------------------------------------------------|------------------------|
| 200    | Successful GET / PATCH.                                           | `TestParameterOut`     |
| 201    | Successful POST.                                                  | `TestParameterOut`     |
| 204    | Successful DELETE.                                                | empty body             |
| 401    | Missing / invalid / expired token.                                | `{ "detail": "..." }`  |
| 403    | Non-admin user tried to POST / PATCH / DELETE.                    | `{ "detail": "..." }`  |
| 404    | `GET / PATCH / DELETE` against an unknown id.                     | `{ "detail": "..." }`  |
| 409    | `POST` or `PATCH` with a `code` that already exists on another row.| `{ "detail": "..." }` |
| 422    | Pydantic validation failure (missing/too-long/empty required field).| `detail: [ ... ]`     |

---

## 7. Frontend implementation checklist

- [ ] **List view** — call `GET /test-parameters?spec=…&is_active=…&limit=50&offset=0`,
  render the **8 columns** from §2; show `id` (truncated) only in the
  row action menu. Default `limit=50`, infinite-scroll or "Load more"
  bumps `offset`.
- [ ] **Filter chips** — `spec` (e.g. `FOOD`, `WATER`), `is_active`
  (active / inactive / all). The `search` field is a free-text input
  bound to the `search` query param.
- [ ] **Add** — admin-only "Add" button opens a modal with the 8 fields
  from `TestParameterCreate`. POST on save; on success, prepend the
  returned row to the list.
- [ ] **Edit** — admin-only "Edit" opens a panel pre-filled with the
  selected row. PATCH only the changed fields. Refresh row on success.
- [ ] **Activate / Deactivate** — admin-only toggle. Send a PATCH with
  just `{ "is_active": <bool> }`.
- [ ] **Delete** — admin-only "Delete" with a confirm dialog; on
  success, remove the row from the list.
- [ ] **Permission gating** — non-admin users see the list and the
  "View" panel but no Add / Edit / Delete buttons. The backend
  enforces this with `403` if they POST/PATCH/DELETE anyway, so the
  UI gating is for UX, not security.
- [ ] **Loading & error states** — show a skeleton on list load,
  inline spinner on PATCH, toast on `409` / `422` / `403` errors.

---

## 8. Regenerating the OpenAPI artefact

The contract is generated from the live FastAPI app, not hand-edited.
To refresh `openapi/test_parameter.openapi.json` after any backend
change:

```bash
# Start the backend (any way you like), then:
python scripts/export_openapi.py --out docs/openapi/test_parameter.openapi.json
```

The script downloads `/api/v1/openapi.json`, keeps only the
`/test-parameters` paths and the `TestParameter*` / `Paginated_*`
schemas, and writes the result. The frontend can then feed the file
to `openapi-typescript`, `orval`, `swagger-codegen`, etc.
