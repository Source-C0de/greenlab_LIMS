# Users & Role Permissions API

> **Lineage.** This document extends the single-tenant contract declared in
> [`README.md`](./README.md) (and materialised in
> [`data-model.md`](./data-model.md) §2 — `users` table). It does **not**
> extend [`../SUPERADMIN_API.md`](../SUPERADMIN_API.md) — that document is
> the multi-tenant design that this contract explicitly retires (see
> [`README.md` §"Lineage & precedence"](./README.md#lineage--precedence)).
>
> The user-management pages in the SPA — `/admin/users`, `/admin/roles`,
> `/admin/users/:id` — currently run on local mock data (see
> `src/pages/admin/users.tsx`, `src/pages/admin/roles.tsx`,
> `src/pages/admin/users/[id].tsx`). This document is the **hand-off spec**
> the backend team must implement so those pages can be wired to real
> data per the integration phases in
> [`integration-guide.md`](./integration-guide.md).

## 1. Conventions (inherited from `README.md`)

- **Base path:** `/api/v1`
- **Auth:** httpOnly cookie `glims_session` (see [`README.md` §Auth](./README.md#auth)).
- **CSRF:** state-changing routes require `X-CSRF-Token` header.
- **Success envelope (single):** `{ "data": <resource> }`.
- **Success envelope (collection):** `{ "data": [...], "pagination": { "page", "pageSize", "total", "totalPages" } }`.
- **Error envelope:** `{ "error": { "code": "string", "message": "string", "details"?: any, "requestId"?: string } }`.
- **All IDs:** ULID (matches `data-model.md` §2).
- **All times:** UTC ISO 8601 with `Z` suffix.
- **PATCH semantics:** partial update. `null` is **not** used to clear a
  field — omit the field instead (same convention as
  [`test_parameter_api.md`](../test_parameter_api.md)).
- **Hard-delete:** `DELETE /admin/users/:id` is a **permanent** removal.
  There is no `deletedAt` for users. The endpoint requires a
  `?confirm=<username>` query param to prevent mis-click / automation
  errors. Use `PATCH .../status` (or `POST /suspend`) when the goal is
  to revoke access without losing history.

## 2. Permission matrix

> The server is the source of truth for authorisation. UI gating in
> `<ProtectedRoute roles={[…]}>` is **UX only** (CLAUDE.md §16).

| Caller role | Can list users | Can create user | Can edit user | Can suspend / activate | Can delete user | Can edit role × menu matrix | Can edit per-user menu overrides |
|-------------|----------------|-----------------|---------------|------------------------|-----------------|-----------------------------|----------------------------------|
| `superadmin` | yes (all) | yes (any role) | yes (any user) | yes | yes | yes | yes (any user) |
| `admin`      | yes (all non-`superadmin`, non-`admin`) | yes (only `lab_manager`, `analyst`, `accountant`, `receptionist`, `client`) | yes (only non-`superadmin`, non-`admin`) | yes (non-`superadmin`, non-`admin`) | **no** | **no** | yes (non-`superadmin`, non-`admin`) |
| all others   | **403** | **403** | **403** | **403** | **403** | **403** | **403** |

`admin` cannot escalate any user to `superadmin` or `admin` (a
`superadmin` must do it). The same caller can never edit their own
account's role to lock themselves out — the server returns `403` on
self-demotion.

**Delete-specific guards (apply to both `admin` and `superadmin` callers):**

- `DELETE` on a `superadmin` user is forbidden (returns `403`). Promote a
  new `superadmin` first, then delete the old one. This is the same rule
  the UI enforces via the disabled Trash button.
- The server must also refuse the `DELETE` if it would leave the system
  with **zero** `superadmin` users (returns `403 last_superadmin`). This
  protects the platform from being permanently locked out.
- A successful `DELETE` returns `200 { "data": null }`. Any audit log
  rows referencing the user should be retained (with `userId` set to
  the now-deleted id, and an optional `usernameSnapshot` column for
  forensics) — the SPA's `audit_log` history list will surface these
  after the user is gone.

## 3. Endpoints

### 3.1 User CRUD

| #  | Method | Path | Auth | Purpose | SPA location |
|----|--------|------|------|---------|---------------|
| 96 | GET    | `/admin/users` | 🔒 | List users | `src/pages/admin/users.tsx` |
| 97 | POST   | `/admin/users` | 🔒🛡️ | Create user | `src/pages/admin/users.tsx` Add dialog |
| 98 | GET    | `/admin/users/:id` | 🔒 | Get one user | `src/pages/admin/users/[id].tsx` |
| 99 | PATCH  | `/admin/users/:id` | 🔒🛡️ | Update user | `src/pages/admin/users.tsx` Edit dialog |
| 100| DELETE | `/admin/users/:id` | 🔒🛡️ | **Permanent** delete user (requires `?confirm=<username>`) | `src/pages/admin/users.tsx` Trash button |
| 101| POST   | `/admin/users/:id/reset-password` | 🔒🛡️ | Send reset link | `src/pages/admin/users.tsx` row action |
| 102| POST   | `/admin/users/:id/suspend` | 🔒🛡️ | Set `status: "suspended"` | `src/pages/admin/users.tsx` row action |
| 103| POST   | `/admin/users/:id/activate` | 🔒🛡️ | Set `status: "active"` | `src/pages/admin/users.tsx` row action |

#### Query parameters — `GET /admin/users`

| Name | Type | Notes |
|------|------|-------|
| `q`            | string  | Case-insensitive match against `fullName`, `fullNameAr`, `email`, `username`. |
| `role`         | string  | One of the 7-role enum. Repeat for OR. |
| `status`       | string  | `active` \| `trial` \| `suspended` \| `disabled`. Repeat for OR. |
| `page`         | int     | Default `1`. |
| `pageSize`     | int     | Default `25`, max `100`. |

#### Query parameters — `DELETE /admin/users/:id`

| Name | Type | Notes |
|------|------|-------|
| `confirm` | string | Must equal the target user's `username`. Returns `409 confirm_mismatch` otherwise. Required. |

#### Status codes

| Status | When |
|--------|------|
| `200`  | OK (DELETE returns `{ "data": null }` on success) |
| `401`  | No session cookie |
| `403`  | Caller's role fails the matrix in §2, OR `admin` is attempting to delete another `admin`/`superadmin` user, OR the caller is the **last remaining `superadmin`** |
| `404`  | User not found (single-resource endpoints only) |
| `409`  | Duplicate `email` or `username` on create; `confirm_mismatch` on delete |
| `422`  | Invalid payload (Pydantic validation); missing `confirm` on delete |

### 3.2 Role × menu matrix

> The "matrix" in `endpoints.md:21-23` exposes the global kill-switch
> (`useMenuPermissions`) as a flat `Record<MenuKey, bool>`. The endpoints
> below add a **per-role** layer: the default menu set each role sees.
> Per-user overrides sit on top of both — see §3.3.

| #  | Method | Path | Auth | Purpose | SPA location |
|----|--------|------|------|---------|---------------|
| 104| GET    | `/admin/roles/:role/menu-permissions` | 🔒🛡️ | Read one role's default menu set | `src/pages/admin/roles.tsx` |
| 105| PUT    | `/admin/roles/:role/menu-permissions` | 🔒🛡️ | Replace one role's default menu set | `src/pages/admin/roles.tsx` |
| 106| GET    | `/admin/menu-keys` | 🔒 | List the 32 `MenuKey` values + bilingual labels (one row per key, ordered) | `src/components/admin/PermissionMatrix.tsx` |

Only `superadmin` may call #104–105. `admin` receives `403` (matches §2).

### 3.3 Per-user menu overrides

| #  | Method | Path | Auth | Purpose | SPA location |
|----|--------|------|------|---------|---------------|
| 107| GET    | `/admin/users/:id/menu-overrides` | 🔒 | Read user's override set | `src/pages/admin/users/[id].tsx` |
| 108| PUT    | `/admin/users/:id/menu-overrides` | 🔒🛡️ | Atomic replace | `src/pages/admin/users/[id].tsx` |
| 109| DELETE | `/admin/users/:id/menu-overrides` | 🔒🛡️ | Clear all (back to role default) | `src/pages/admin/users/[id].tsx` "Reset All" button |

`admin` may call these only for users with `role ∉ { superadmin, admin }`.

### 3.4 Role lifecycle (edit metadata + archive)

> The **6 toggleable role slugs** are seeded and shipped with the
> application — admin can change their **display metadata** (label,
> description, icon) and the **active** flag (archive / restore).
> Archived roles hide from the login page and the role-switcher
> dropdown, and existing users holding an archived role see a
> forced-logout banner on next request. **For creating new custom
> role slugs** (`qa_supervisor`, `shift_lead`, etc.) see §3.5.

| #  | Method | Path | Auth | Purpose | SPA location |
|----|--------|------|------|---------|---------------|
| 110| GET    | `/admin/roles` | 🔒 | List all roles (6 seeds + custom) + editable metadata + `isActive` | `src/pages/admin/roles.tsx` |
| 111| GET    | `/admin/roles/:role` | 🔒 | Get one role's metadata + `isActive` | `src/pages/admin/roles.tsx` |
| 112| PATCH  | `/admin/roles/:role` | 🔒🛡️ | Edit label/description/icon (slug immutable) | `src/pages/admin/roles.tsx` Edit dialog |
| 113| PATCH  | `/admin/roles/:role/status` | 🔒🛡️ | Toggle `isActive` (archive / restore) | `src/pages/admin/roles.tsx` Archive + Restore buttons |

Only `superadmin` may call #112–113. `admin` receives `403`.

#### `PATCH /admin/roles/:role` body

```jsonc
{
  "labelEn":       "Lab Manager",
  "labelAr":       "مدير المختبر",
  "descriptionEn": "Manages samples, workflows, clients, reports, specifications.",
  "descriptionAr": "يدير العينات وسير العمل والعملاء والتقارير والمواصفات.",
  "iconName":      "ClipboardList"
}
```

All fields are optional. Omit a field to leave it unchanged. The slug
(URL param `:role`) is **immutable** — attempting to change it via a
`slug` field in the body is silently ignored by the server. The
`iconName` must be one of the values listed in the
[`ICON_PICKER`](../../src/hooks/useRoleRegistry.ts) export
(`ShieldCheck`, `Users`, `FlaskConical`, `Briefcase`, `Calculator`,
`ClipboardList`); an invalid value returns `422`.

#### `PATCH /admin/roles/:role/status` body

```jsonc
{ "isActive": false }   // archive
{ "isActive": true  }   // restore
```

**Archive-specific guards:**

- The `superadmin` role cannot be archived (returns `403
  superadmin_immutable`). This is what protects the platform from
  being locked out.
- The server must refuse the archive if any user is currently assigned
  the role **and** archiving it would make the system unable to log
  in (a future improvement; not enforced in v1).

> **Idempotency / concurrency** for #112 follows the same
> `If-Match: <updatedAt>` convention as `PATCH /admin/users/:id` (§5).
> #113 is idempotent (last-write-wins is acceptable — `isActive` is a
> boolean, the only "conflict" is the superadmin-immutability check).

### 3.5 Custom role lifecycle (create + hard-delete)

> The **6 fixed toggleable slugs** (admin, lab_manager, analyst,
> client, accountant, receptionist) ship with the build and cannot be
> hard-deleted — only archived. **Custom roles** with arbitrary
> `snake_case` slugs (e.g. `qa_supervisor`, `shift_lead`) are created
> by `superadmin` via `POST /admin/roles`, edited and archived via the
> same endpoints as the seeds (#112–113), and **hard-deleted** via
> `DELETE /admin/roles/:role` when no longer needed.
>
> The 7-role union in `Role = Literal[...]` (§4 `schemas/user.py`) is
> the **user-assignment enum** — a user can only be assigned one of
> those 7 fixed slugs. Custom roles exist in the role registry but are
> not assignable as a user's *primary* role in v1 (the SPA's "Add
> User" dialog **does** offer them — see §A.6 in the implementation
> plan; the backend can either match this UX or reject `role` values
> not in the literal — both are valid). If you do allow custom roles
> as a user assignment, also update `Role = Literal[…]` to accept
> `str` matching the `SLUG_PATTERN`.

| #   | Method | Path | Auth | Purpose | SPA location |
|-----|--------|------|------|---------|---------------|
| 114 | POST   | `/admin/roles` | 🔒🛡️ | Create a custom role (slug + metadata) | `src/pages/admin/roles.tsx` "Add Role" dialog |
| 115 | DELETE | `/admin/roles/:role` | 🔒🛡️ | Hard-delete a custom role (seeds return 403) | `src/pages/admin/roles.tsx` Delete button on custom-role card |

Only `superadmin` may call #114–115. `admin` receives `403`.

#### `POST /admin/roles` body

```jsonc
{
  "slug":         "qa_supervisor",
  "labelEn":      "QA Supervisor",
  "labelAr":      "مشرف الجودة",
  "descriptionEn": "Reviews quality control reports and approves releases.",
  "descriptionAr": "يراجع تقارير ضبط الجودة ويعتمد الإصدارات.",
  "iconName":     "ShieldCheck"
}
```

**Validation** (server-side; mirrors `useRoleAdmin.validateCreate()` in the SPA):

| Rule | Failure | Code |
|------|---------|------|
| `slug` required, trimmed | empty | `422 validation_error` |
| `slug` matches `^[a-z][a-z0-9_]{1,31}$` (snake_case, 2–32 chars) | bad pattern | `422 validation_error` |
| `slug` not in `FIXED_ROLE_SLUGS` (the 6 seeds + `superadmin`) | reserved | `409 slug_reserved` |
| `slug` not already in the role table | duplicate | `409 duplicate_slug` |
| `labelEn` ≥ 2 chars, `labelAr` ≥ 2 chars | too short | `422 validation_error` |
| `descriptionEn` ≥ 4 chars, `descriptionAr` ≥ 4 chars | too short | `422 validation_error` |
| `iconName` is one of the `RoleIconName` literals | invalid icon | `422 validation_error` |

The created role is enabled by default (`isActive: true`) and ships
with an **empty menu-permissions matrix** (the admin then edits it via
#110's list view or `PUT /admin/roles/:role/menu-permissions`).

#### `DELETE /admin/roles/:role` body

None — the slug is in the URL. The body is irrelevant.

**Behavior**:

- `slug ∈ FIXED_ROLE_SLUGS` (the 6 seeds) → `403 fixed_role_immutable`.
  Use `PATCH /admin/roles/:role/status` to archive instead.
- `slug` is in use by one or more users → `409 role_in_use`. The admin
  must first reassign those users to a different role via
  `PATCH /admin/users/:id { role: "..." }` before retrying.
- Otherwise → `204 No Content`. The role is removed from the
  `roles` table; the `role_menu_permissions` rows for that slug are
  cascade-deleted; rows in `user_menu_overrides` keyed by that slug
  are orphaned and become no-ops (the matrix layer will skip them).

The SPA's `RolesAdmin` page mirrors this with a typed-confirm
`Dialog` — the admin types the role's display label back in
(`src/pages/admin/roles.tsx` `handleDeleteConfirm`).

> **Idempotency**: `DELETE` is not idempotent — the second call
> returns `404 role_not_found`. The SPA's UI clears local state on
> success, so a double-click is harmless in practice.

## 4. Pydantic schemas

```python
# schemas/user.py
from pydantic import BaseModel, EmailStr, Field
from typing import Literal, Optional
from datetime import datetime

Role = Literal["superadmin", "admin", "lab_manager", "analyst",
               "client", "accountant", "receptionist"]
# If the backend allows user assignment to custom roles (see §3.5),
# widen this to `Role = str` and add `field_validator` against
# `SLUG_PATTERN` (defined in `schemas/role.py`). The SPA's "Add User"
# dialog currently offers every role in the registry — including
# customs — so the contract should match the UX.
UserStatus = Literal["active", "trial", "suspended", "disabled"]


class UserCreate(BaseModel):
    email: EmailStr
    username: str = Field(min_length=3, max_length=64, pattern=r"^[a-z0-9._-]+$")
    fullName: str = Field(min_length=2, max_length=120)
    fullNameAr: Optional[str] = Field(default=None, max_length=120)
    role: Role


class UserUpdate(BaseModel):
    # All optional. Omit a field to leave it unchanged.
    # `null` is NOT used to clear — see "PATCH semantics" in §1.
    email: Optional[EmailStr] = None
    username: Optional[str] = Field(default=None, min_length=3, max_length=64)
    fullName: Optional[str] = Field(default=None, min_length=2, max_length=120)
    fullNameAr: Optional[str] = Field(default=None, max_length=120)
    role: Optional[Role] = None
    isActive: Optional[bool] = None


class UserOut(BaseModel):
    id: str                # ULID
    email: EmailStr
    username: str
    fullName: str
    fullNameAr: Optional[str]
    role: Role
    isActive: bool
    clientId: Optional[str] = None
    lastLoginAt: Optional[datetime] = None
    createdAt: datetime
    updatedAt: datetime
    deletedAt: Optional[datetime] = None   # soft-delete tombstone


class PasswordResetResponse(BaseModel):
    resetLink: str         # one-time URL; expires in 24h
    expiresAt: datetime


class RoleMenuCell(BaseModel):
    menuKey: str           # one of the 32 MenuKey values
    enabled: bool


class RoleMenuPermissionsPut(BaseModel):
    cells: list[RoleMenuCell] = Field(min_length=0, max_length=32)


class UserOverrideCell(BaseModel):
    menuKey: str
    effect: Literal["grant", "deny"]


class UserOverridesPut(BaseModel):
    overrides: list[UserOverrideCell] = Field(min_length=0, max_length=32)


class MenuKeyOut(BaseModel):
    key: str
    labelEn: str
    labelAr: str
    group: Literal["lab", "client", "accounting", "admin"]
    href: str
```

```python
# schemas/role.py
from pydantic import BaseModel, Field, field_validator
from typing import Annotated, Literal, Optional, Union
import re

# The 6 fixed toggleable role slugs (no superadmin — it's not toggleable).
FIXED_ROLE_SLUGS = ("admin", "lab_manager", "analyst",
                    "client", "accountant", "receptionist")

# A toggleable role: one of the 6 seeds, OR any snake_case custom slug.
# The `(str & {})` trick preserves autocomplete on the literals while
# allowing any other string at runtime — see §3.5 and §A.3 of the
# implementation plan.
ToggleableRole = Annotated[
    Union[Literal[
        "admin", "lab_manager", "analyst",
        "client", "accountant", "receptionist",
    ],],
    # Allow any snake_case string for runtime custom roles:
    # the second union member below widens it. (Some Pydantic versions
    # require a non-Literal member; the cleanest pattern is to accept
    # `str` and validate via `field_validator` below.)
]
ToggleableRole = str  # widened — validate via the validators below

SLUG_PATTERN = re.compile(r"^[a-z][a-z0-9_]{1,31}$")

# Must match the ICON_PICKER list in src/hooks/useRoleRegistry.ts.
RoleIconName = Literal[
    "ShieldCheck", "Users", "FlaskConical",
    "Briefcase", "Calculator", "ClipboardList",
]


class RoleOut(BaseModel):
    role: ToggleableRole           # the slug — also the primary key
    labelEn: str
    labelAr: str
    descriptionEn: str
    descriptionAr: str
    iconName: RoleIconName
    isActive: bool = True
    isCustom: bool = False         # true for admin-created roles (not in FIXED_ROLE_SLUGS)
    updatedAt: str   # ISO datetime


class RoleCreate(BaseModel):
    slug: str = Field(pattern=SLUG_PATTERN.pattern)
    labelEn: str = Field(min_length=2, max_length=64)
    labelAr: str = Field(min_length=2, max_length=64)
    descriptionEn: str = Field(min_length=4, max_length=500)
    descriptionAr: str = Field(min_length=4, max_length=500)
    iconName: RoleIconName

    @field_validator("slug")
    @classmethod
    def slug_must_not_be_reserved(cls, v: str) -> str:
        if v in FIXED_ROLE_SLUGS or v == "superadmin":
            raise ValueError("slug is reserved by a built-in role")
        return v


class RoleUpdate(BaseModel):
    # All optional. Slug is the URL param and is never accepted in the body.
    labelEn: Optional[str] = Field(default=None, min_length=2, max_length=64)
    labelAr: Optional[str] = Field(default=None, min_length=2, max_length=64)
    descriptionEn: Optional[str] = Field(default=None, min_length=4, max_length=500)
    descriptionAr: Optional[str] = Field(default=None, min_length=4, max_length=500)
    iconName: Optional[RoleIconName] = None


class RoleStatusUpdate(BaseModel):
    isActive: bool
```

> **422 example** — invalid `role` on `POST /admin/users`:
>
> ```json
> {
>   "error": {
>     "code": "validation_error",
>     "message": "Request validation failed",
>     "details": [
>       { "loc": ["body", "role"], "msg": "Input should be 'superadmin','admin','lab_manager','analyst','client','accountant' or 'receptionist'", "type": "enum" }
>     ]
>   }
> }
> ```
>
> **409 example** — duplicate `email` on create:
>
> ```json
> { "error": { "code": "duplicate_email", "message": "A user with this email already exists." } }
> ```
>
> **422 example** — invalid `slug` on `POST /admin/roles`:
>
> ```json
> {
>   "error": {
>     "code": "validation_error",
>     "message": "Request validation failed",
>     "details": [
>       { "loc": ["body", "slug"], "msg": "String should match pattern '^[a-z][a-z0-9_]{1,31}$'", "type": "string_pattern_mismatch" }
>     ]
>   }
> }
> ```
>
> **409 example** — reserved slug on `POST /admin/roles`:
>
> ```json
> { "error": { "code": "slug_reserved", "message": "\"admin\" is a built-in role slug and cannot be reused." } }
> ```

## 5. Idempotency & concurrency

| Endpoint | Idempotent? | Concurrency model |
|----------|-------------|---------------------|
| `GET` endpoints | yes | none |
| `POST /admin/users` | **no** — duplicates return 409 | last-write-wins |
| `PATCH /admin/users/:id` | no | optimistic concurrency via `If-Match: <updatedAt>` header (return `412 Precondition Failed` on stale write) |
| `DELETE /admin/users/:id` | **no** — requires `?confirm=<username>` matching the row; returns `409` on mismatch. The endpoint is **not** soft-delete. | none |
| `POST /reset-password` | no (each call mints a new link) | none |
| `POST /suspend`, `/activate` | **yes** (idempotent status transitions) | none |
| `PUT /admin/roles/:role/menu-permissions` | yes (atomic replace) | last-write-wins; recommend `If-Match` for v2 |
| `PUT /admin/users/:id/menu-overrides` | yes (atomic replace) | last-write-wins; recommend `If-Match` for v2 |
| `DELETE /admin/users/:id/menu-overrides` | yes (idempotent clear) | none |
| `POST /admin/roles` (#114) | **no** — duplicates return 409 | last-write-wins |
| `DELETE /admin/roles/:role` (#115) | **no** — second call returns 404; fixed slugs return 403 | none |

`If-Match` is **optional** in v1. The server should accept requests
without it and apply last-write-wins. Clients that need strict
optimistic locking should send the `updatedAt` they last read.

## 6. Example flows (curl, copy-pasteable)

> Replace `$BASE` and `$COOKIE` with your dev values:
> ```sh
> export BASE=http://localhost:8000/api/v1
> export COOKIE='glims_session=eyJ...; glims_csrf=...'
> export CSRF='X-CSRF-Token: ...'
> ```

### 6.1 Onboard a new lab_manager

```sh
curl -X POST "$BASE/admin/users" \
  -H "Cookie: $COOKIE" -H "$CSRF" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "majed.new@greenlablims.sa",
    "username": "majed.new",
    "fullName": "Majed Al-Dosari",
    "fullNameAr": "ماجد الدوسري",
    "role": "lab_manager"
  }'
# → 201 { "data": { "id": "01HF...", "username": "majed.new", ..., "tempPassword": "Vn8x-..." } }
#   (tempPassword is shown ONCE on create. The SPA's `useCreateUser` hook
#    surfaces it in a copy-to-clipboard dialog.)
```

### 6.2 Change role from `analyst` to `lab_manager`

```sh
curl -X PATCH "$BASE/admin/users/U004" \
  -H "Cookie: $COOKIE" -H "$CSRF" \
  -H "Content-Type: application/json" \
  -d '{ "role": "lab_manager" }'
# → 200 { "data": { "id": "U004", "role": "lab_manager", ... } }
```

### 6.3 Grant a one-off menu override (analyst gets `client_portal`)

```sh
curl -X PUT "$BASE/admin/users/U002/menu-overrides" \
  -H "Cookie: $COOKIE" -H "$CSRF" \
  -H "Content-Type: application/json" \
  -d '{
    "overrides": [
      { "menuKey": "client_portal", "effect": "grant" }
    ]
  }'
# → 200 { "data": { "userId": "U002", "overrides": [...] } }
```

> **Effective visibility for `(U002, client_portal)`** is then:
> `globalKill("client_portal") && roleEnabled("analyst", "client_portal") && override("grant") = true`.
>
> The same hook — `useEffectiveMenuVisibility` in
> `src/hooks/useEffectiveMenuVisibility.ts` — is used by the Sidebar to
> filter the nav and by the `/admin/users/:id` page to preview the
> result. So this single PUT immediately re-renders the sidebar when
> the SPA is wired to the real backend.

### 6.4 Permanent-delete a user (requires `?confirm=<username>`)

```sh
curl -X DELETE "$BASE/admin/users/U008?confirm=majed.admin" \
  -H "Cookie: $COOKIE" -H "$CSRF"
# → 200 { "data": null }
#
# On mismatch (e.g. typo, stale username):
# → 409 { "error": { "code": "confirm_mismatch", "message": "..." } }
#
# If U008 is the last superadmin:
# → 403 { "error": { "code": "last_superadmin", "message": "..." } }
```

> The SPA's `UsersAdmin` page sends this exact call only after the
> admin types the username back into the destructive `Dialog`
> confirmation (`src/pages/admin/users.tsx`). The button stays
> disabled until the typed text matches.

### 6.5 Edit a role's display label

```sh
curl -X PATCH "$BASE/admin/roles/receptionist" \
  -H "Cookie: $COOKIE" -H "$CSRF" \
  -H "Content-Type: application/json" \
  -d '{
    "labelEn": "Front Desk",
    "labelAr": "الاستقبال",
    "descriptionEn": "Receives samples, registers clients, manages inventory.",
    "iconName": "Users"
  }'
# → 200 { "data": { "role": "receptionist", "labelEn": "Front Desk", ... } }
#   (slug stays "receptionist" — never changes)
```

### 6.6 Archive a role (hide from login + role picker)

```sh
curl -X PATCH "$BASE/admin/roles/receptionist/status" \
  -H "Cookie: $COOKIE" -H "$CSRF" \
  -H "Content-Type: application/json" \
  -d '{ "isActive": false }'
# → 200 { "data": { "role": "receptionist", "isActive": false, ... } }
#
# Restoring is the same call with "isActive": true.
#
# If you try to archive the superadmin role:
# → 403 { "error": { "code": "superadmin_immutable", "message": "..." } }
```

> The SPA's `RolesAdmin` page sends these calls from the **Edit** and
> **Archive** buttons on each role card
> (`src/pages/admin/roles.tsx`). Archive requires the admin to type
> the role's display label back into the destructive `Dialog`,
> mirroring the user-delete typed-confirm pattern from §6.4.

### 6.7 Custom role full lifecycle (create → assign menu → archive → delete)

```sh
# 1. Create a new custom role.
curl -X POST "$BASE/admin/roles" \
  -H "Cookie: $COOKIE" -H "$CSRF" \
  -H "Content-Type: application/json" \
  -d '{
    "slug":         "qa_supervisor",
    "labelEn":      "QA Supervisor",
    "labelAr":      "مشرف الجودة",
    "descriptionEn": "Reviews quality control reports and approves releases.",
    "descriptionAr": "يراجع تقارير ضبط الجودة ويعتمد الإصدارات.",
    "iconName":     "ShieldCheck"
  }'
# → 201 { "data": { "role": "qa_supervisor", "isActive": true, "isCustom": true, ... } }

# 2. Grant three menu items to it.
curl -X PUT "$BASE/admin/roles/qa_supervisor/menu-permissions" \
  -H "Cookie: $COOKIE" -H "$CSRF" \
  -H "Content-Type: application/json" \
  -d '{
    "cells": [
      { "menuKey": "dashboard",    "enabled": true },
      { "menuKey": "samples",      "enabled": true },
      { "menuKey": "test_approvals", "enabled": true }
    ]
  }'
# → 200 { "data": { "role": "qa_supervisor", "cells": [...] } }

# 3. Archive (hides from login role-picker; reversible).
curl -X PATCH "$BASE/admin/roles/qa_supervisor/status" \
  -H "Cookie: $COOKIE" -H "$CSRF" \
  -H "Content-Type: application/json" \
  -d '{ "isActive": false }'
# → 200 { "data": { "role": "qa_supervisor", "isActive": false, ... } }

# 4. Hard-delete (only works for custom roles; seeds return 403).
curl -X DELETE "$BASE/admin/roles/qa_supervisor" \
  -H "Cookie: $COOKIE" -H "$CSRF"
# → 204 No Content
#
# If a user is still assigned to qa_supervisor:
# → 409 { "error": { "code": "role_in_use", "message": "..." } }
#   Fix: PATCH those users to a different role first.

# 5. Re-create (proves the slug is now free again).
curl -X POST "$BASE/admin/roles" \
  -H "Cookie: $COOKIE" -H "$CSRF" \
  -H "Content-Type: application/json" \
  -d '{ "slug": "qa_supervisor", "labelEn": "QA Lead", "labelAr": "مسؤول الجودة",
        "descriptionEn": "Quality lead.", "descriptionAr": "مسؤول الجودة.",
        "iconName": "ShieldCheck" }'
# → 201 { "data": { "role": "qa_supervisor", ... } }
```

> The SPA's `RolesAdmin` page wires each of these calls to a button
> or dialog action: "Add Role" → step 1; the matrix Switch on the
> new column → step 2; "Archive" on the role card → step 3;
> "Delete" → step 4 (typed-confirm required); the dialog re-opens
> fresh for step 5.

## 7. Out of scope for this iteration

- **Multi-tenant scoping** on `users` — the contract is single-tenant
  (one logical tenant, `superadmin` is a role not a path scope). See
  [`data-model.md` §2](./data-model.md) and the lineage note at the top
  of this file.
- **ETag / `If-Match` enforcement** — recommended in v2, not required
  in v1.
- **Email delivery** — `POST /reset-password` returns the link; the
  backend is responsible for sending the email (template not in scope
  of this contract).
- **Audit log** — every state change should be auditable, but the
  schema for `user_audit_log` is left to the backend team to design.
- **2FA / SSO** — single password is sufficient for v1.
- **Bulk import / CSV export** — covered by the existing
  `GET /admin/users/export` (endpoint #11) but not users-specific. If
  user-specific export is needed, add it in a follow-up.
