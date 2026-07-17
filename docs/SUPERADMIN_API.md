# Superadmin API — Quick Reference

> **Full OpenAPI 3.1 spec:** [`../.backup_lib/api-spec/superadmin.openapi.yaml`](../.backup_lib/api-spec/superadmin.openapi.yaml)
> **Base path (production):** `https://api.greenlablims.example.com`
> **Base path (dev):** `http://localhost:4000`
> **Auth:** JWT bearer (`Authorization: Bearer <token>`) on every route except `Public`.

All responses are JSON. List endpoints return a `Paginated<T>` envelope. Errors return a unified `Error` envelope.

---

## Common envelopes

```ts
// Paginated<T>
{
  data: T[];
  pagination: { page: number; pageSize: number; total: number; totalPages: number; };
}

// Error
{
  error: {
    code: "unauthorized" | "forbidden" | "not_found" | "validation" | "conflict" | "rate_limited" | "internal";
    message: string;
    details?: Record<string, unknown>;
    requestId?: string;
  };
}
```

---

## A. Auth & session

| Method | Path | Auth | Purpose |
|---|---|---|---|
| `POST` | `/api/superadmin/auth/login` | Public | Email/password login → access + refresh tokens |
| `POST` | `/api/superadmin/auth/refresh` | Public (refresh token) | Exchange refresh token for new access token |
| `POST` | `/api/superadmin/auth/logout` | Bearer | Invalidate the given refresh token |
| `GET` | `/api/superadmin/auth/me` | Bearer | Current superadmin profile |
| `PATCH` | `/api/superadmin/auth/me/password` | Bearer | Change own password |
| `POST` | `/api/superadmin/auth/forgot-password` | Public | Request password reset email (no enumeration) |
| `POST` | `/api/superadmin/auth/reset-password` | Public | Submit new password with reset token |

**Login request:**
```json
{ "email": "ops@greenlablims.example.com", "password": "string" }
```
**Login response:**
```json
{
  "accessToken": "eyJ...",
  "refreshToken": "rt_01...",
  "expiresIn": 86400,
  "user": { "id": "...", "email": "...", "fullName": "...", "role": "superadmin", "status": "active" }
}
```

---

## B. Superadmin users

| Method | Path | Auth | Purpose |
|---|---|---|---|
| `GET` | `/api/superadmin/users` | Bearer | List users (filters: `q`, `status`, `role`) |
| `POST` | `/api/superadmin/users` | Bearer | Invite a new user |
| `GET` | `/api/superadmin/users/:id` | Bearer | Get one user |
| `PUT` | `/api/superadmin/users/:id` | Bearer | Update name / role / MFA |
| `PATCH` | `/api/superadmin/users/:id/status` | Bearer | Activate / suspend / disable |
| `POST` | `/api/superadmin/users/:id/reset-password` | Bearer | Force a password reset email |
| `DELETE` | `/api/superadmin/users/:id` | Bearer | Soft-delete |

**User shape:**
```ts
{
  id: string;
  email: string;
  fullName: string;
  fullNameAr?: string;
  role: "superadmin" | "platform_support" | "platform_billing" | "platform_readonly";
  status: "active" | "suspended" | "disabled";
  mfaEnabled: boolean;
  lastLoginAt?: string;   // ISO datetime
  createdAt: string;
  updatedAt: string;
}
```

---

## C. Tenants

| Method | Path | Auth | Purpose |
|---|---|---|---|
| `GET` | `/api/superadmin/tenants` | Bearer | List tenants (filters: `q`, `status`, `plan`, `region`, `includeDeleted`) |
| `GET` | `/api/superadmin/tenants/export` | Bearer | CSV/JSON export (`?format=csv\|json`) |
| `POST` | `/api/superadmin/tenants` | Bearer | Create new tenant |
| `GET` | `/api/superadmin/tenants/:id` | Bearer | Get one tenant (includes adminContact + usage counters) |
| `PUT` | `/api/superadmin/tenants/:id` | Bearer | Update tenant fields |
| `PATCH` | `/api/superadmin/tenants/:id/status` | Bearer | Lifecycle: active / trial / suspended / cancelled |
| `PATCH` | `/api/superadmin/tenants/:id/plan` | Bearer | Change plan (optionally prorated) |
| `POST` | `/api/superadmin/tenants/:id/suspend` | Bearer | Suspend (sets status + reason) |
| `POST` | `/api/superadmin/tenants/:id/activate` | Bearer | Activate (clears suspension) |
| `DELETE` | `/api/superadmin/tenants/:id` | Bearer | Soft-delete |
| `POST` | `/api/superadmin/tenants/:id/restore` | Bearer | Restore soft-deleted tenant |

**Tenant shape:**
```ts
{
  id: string;
  name: string;
  nameAr: string;
  slug: string;                  // ^[a-z0-9-]+$
  planCode: "starter" | "professional" | "enterprise";
  status: "active" | "trial" | "suspended" | "cancelled";
  contactEmail: string;
  contactPhone?: string;
  crNumber?: string;             // Saudi Commercial Registration
  vatNumber?: string;            // ZATCA VAT number
  city?: string;
  region?: "Riyadh" | "Makkah" | "Madinah" | "Eastern" | "Asir" | "Tabuk" | "Hail" | "Jouf" | "Najran" | "Bahah" | "Jazan" | "Northern";
  billingCycle: "monthly" | "yearly";
  activeUsers: number;           // computed
  activeSamples: number;         // current month
  monthlyRevenue: number;        // SAR
  suspensionReason?: string;
  trialEndsAt?: string;          // ISO datetime
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}
```

**Create tenant request:**
```json
{
  "name": "GreenLabLIMS Riyadh Central",
  "nameAr": "جرين لاب ليمز - الرياض المركزية",
  "slug": "riyadh-central",
  "planCode": "professional",
  "contactEmail": "admin@riyadh-greenlab.example",
  "contactPhone": "+966 11 234 5678",
  "crNumber": "1010123456",
  "vatNumber": "300000000000003",
  "city": "Riyadh",
  "region": "Riyadh",
  "billingCycle": "monthly"
}
```

---

## D. Metrics

| Method | Path | Auth | Purpose |
|---|---|---|---|
| `GET` | `/api/superadmin/metrics/overview` | Bearer | Top-of-dashboard KPIs |
| `GET` | `/api/superadmin/metrics/tenants` | Bearer | Time series (params: `from`, `to`, `granularity`) |
| `GET` | `/api/superadmin/metrics/usage` | Bearer | Aggregate usage (params: `from`, `to`) |
| `GET` | `/api/superadmin/metrics/geo` | Bearer | Tenant distribution by region |

**Overview response:**
```ts
{
  mrr: number;                       // SAR
  arr: number;
  totalTenants: number;
  activeTenants: number;
  trialTenants: number;
  suspendedTenants: number;
  cancelledTenants: number;
  totalActiveUsers: number;
  totalSamplesThisMonth: number;
  newSignupsLast30Days: number;
  churnLast30Days: number;
  generatedAt: string;               // ISO datetime
}
```

---

## E. Audit log

| Method | Path | Auth | Purpose |
|---|---|---|---|
| `GET` | `/api/superadmin/audit-log` | Bearer | List events (filters: `actor`, `action`, `category`, `tenantId`, `from`, `to`, `sortBy`, `sortOrder`) |
| `GET` | `/api/superadmin/audit-log/:id` | Bearer | Get one event |
| `GET` | `/api/superadmin/audit-log/export` | Bearer | CSV/JSON export |

Append-only — no create/update/delete endpoints.

**Audit event shape:**
```ts
{
  id: string;
  actorId: string;
  actorEmail: string;
  action: string;                    // e.g. "tenant.create", "user.suspend"
  category: "auth" | "tenant" | "user" | "plan" | "feature_flag" | "impersonation" | "billing";
  targetType?: "tenant" | "user" | "plan" | "feature_flag";
  targetId?: string;
  tenantId?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}
```

---

## F. Impersonation

| Method | Path | Auth | Purpose |
|---|---|---|---|
| `POST` | `/api/superadmin/tenants/:id/impersonate` | Bearer | Issue 1h impersonation token (params: `reason`, `asUserId?`) |
| `POST` | `/api/superadmin/impersonation/end` | Bearer (impersonation token) | End active session |
| `GET` | `/api/superadmin/impersonation/active` | Bearer | List active sessions |

**Impersonate response:**
```json
{
  "sessionId": "imp_01...",
  "impersonationToken": "eyJ...",
  "expiresAt": "2026-07-17T15:00:00Z",
  "tenantName": "GreenLabLIMS Riyadh Central",
  "actingAs": { "userId": "u_01...", "fullName": "...", "email": "..." }
}
```

---

## G. Roles (the role registry — backend-owned)

The role registry is what makes a role name like `lab_manager` exist at all. Today these are hardcoded in the frontend; in the backend they become rows the superadmin can edit (display name, description) and create new ones.

| Method | Path | Auth | Purpose |
|---|---|---|---|
| `GET` | `/api/superadmin/roles` | Bearer | List all roles |
| `POST` | `/api/superadmin/roles` | Bearer | Create a new role |
| `GET` | `/api/superadmin/roles/:code` | Bearer | Get one role by code |
| `PUT` | `/api/superadmin/roles/:code` | Bearer | Update display names / description |
| `DELETE` | `/api/superadmin/roles/:code` | Bearer | Delete (only if non-system AND no users assigned) |

**Role shape:**
```ts
{
  code: string;               // "lab_manager"
  nameEn: string;             // "Lab Manager"
  nameAr: string;             // "مدير المختبر"
  descriptionEn?: string;
  descriptionAr?: string;
  isSystem: boolean;          // true = cannot be deleted
  createdAt: string;
  updatedAt: string;
}
```

---

## H. Menu items (the navigation registry — backend-owned)

Sidebar nav items live in the backend as a navigable tree. Each item has a stable `key`, an `href`, bilingual labels, an icon, a section it belongs to, and a sort order.

| Method | Path | Auth | Purpose |
|---|---|---|---|
| `GET` | `/api/superadmin/menu-items` | Bearer | List full menu tree (filter: `section`, `includeDisabled`) |
| `POST` | `/api/superadmin/menu-items` | Bearer | Create a new menu item |
| `GET` | `/api/superadmin/menu-items/:id` | Bearer | Get one menu item |
| `PUT` | `/api/superadmin/menu-items/:id` | Bearer | Update a menu item |
| `DELETE` | `/api/superadmin/menu-items/:id` | Bearer | Delete (only if non-system) |
| `POST` | `/api/superadmin/menu-items/reorder` | Bearer | Bulk reorder items per section |

**Menu item shape:**
```ts
{
  id: string;
  key: string;                // "samples", "samples_receiving", "billing"…
  href: string;               // "/samples"
  parentKey?: string;         // set for nested children
  icon?: string;              // Lucide icon name
  labelEn: string;
  labelAr: string;
  section: "main" | "accounting" | "specifications" | "client_portal" | "settings";
  sortOrder: number;
  isEnabled: boolean;         // master kill-switch; if false, no role sees it
  isSystem: boolean;
  createdAt: string;
  updatedAt: string;
}
```

---

## I. Permission matrix (role × menu-item — the toggle)

**This is the core "enable/disable menu per role" surface.** The superadmin uses it to make a role see (or not see) a menu item.

| Method | Path | Auth | Purpose |
|---|---|---|---|
| `GET` | `/api/superadmin/permissions/matrix` | Bearer | Get the full role × menu-item matrix |
| `PUT` | `/api/superadmin/permissions/menu-items/:menuItemId` | Bearer | Replace which roles see this item (atomic) |
| `POST` | `/api/superadmin/permissions/bulk` | Bearer | Bulk toggle many cells in one transaction |

### How it works

- **`GET /api/superadmin/permissions/matrix`** returns all roles, all menu items, and a sparse `cells[]` of explicit grants. The UI renders this as a grid; absent cells are implicitly denied.
- **`PUT /api/superadmin/permissions/menu-items/:menuItemId`** body:
  ```json
  { "roleCodes": ["admin", "lab_manager", "analyst"], "applyToChildren": false }
  ```
  This is what the superadmin invokes when they click "save" on the role list for a given menu item. The backend atomically replaces the role list (roles not listed lose access).
- **`POST /api/superadmin/permissions/bulk`** body:
  ```json
  {
    "changes": [
      { "menuItemId": "mi_01...", "roleCode": "lab_manager", "enabled": true },
      { "menuItemId": "mi_01...", "roleCode": "receptionist", "enabled": false }
    ]
  }
  ```
  Used by the matrix-grid UI for in-place cell toggles. Applied in a single transaction.

**Matrix response:**
```ts
{
  roles: Role[];
  menuItems: MenuItem[];
  cells: Array<{
    roleCode: string;       // "lab_manager"
    menuItemKey: string;    // "samples"
    enabled: boolean;
  }>;
}
```

---

## J. Resolved permissions (consumed by the frontend)

The frontend calls this on login and on permission change to render the sidebar.

| Method | Path | Auth | Purpose |
|---|---|---|---|
| `GET` | `/api/superadmin/me/permissions` | Bearer | Get the menu tree visible to the current user, already filtered by the matrix |

**Response:**
```ts
{
  sections: Array<{
    section: "main" | "accounting" | "specifications" | "client_portal" | "settings";
    items: MenuItem[];   // already filtered by current user's role + isEnabled
  }>;
}
```

This replaces the hardcoded `roles: Role[]` arrays currently baked into `src/components/layout/Sidebar.tsx:38-150`.

---

## JWT token model

**Access token (24h):**
```json
{ "sub": "<user-id>", "email": "...", "role": "superadmin", "iat": ..., "exp": ... }
```

**Impersonation token (1h):**
```json
{ "sub": "<user-id>", "email": "...", "role": "superadmin", "tenant_id": "<tenant-id>", "imp_session": "<session-id>", "iat": ..., "exp": ... }
```

Impersonation tokens are scoped — the backend filters tenant-scoped queries using `tenant_id`. Calling a superadmin-only route with an impersonation token returns 403.

---

## Out of scope (deferred)

- Plans & feature flags CRUD
- Tenant user management (belongs to tenant-scoped API)
- Billing provider webhooks (Stripe / Moyasar / Tap)
- File uploads (CR documents etc.)
- Platform API key management

---

## How a typical superadmin flow uses these APIs

```
1. POST /api/superadmin/auth/login
2. GET  /api/superadmin/me/permissions                  → render the sidebar
3. GET  /api/superadmin/metrics/overview                → render the dashboard
4. GET  /api/superadmin/permissions/matrix              → render the "Permissions" tab
5. PUT  /api/superadmin/permissions/menu-items/:id      → save a role list
       └─ GET /api/superadmin/me/permissions            → sidebar updates
6. POST /api/superadmin/tenants                         → onboard a new lab
7. POST /api/superadmin/tenants/:id/impersonate         → log in as that lab
       └─ POST /api/superadmin/impersonation/end        → come back
```