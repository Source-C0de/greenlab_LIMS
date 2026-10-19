/**
 * Users & Roles API — typed client for `docs/api_frontend/users.md`.
 *
 * All calls flow through `apiFetch` (Bearer auth, JSON envelopes,
 * structured ApiError). Activated via `VITE_USE_API=true`; the consuming
 * hooks gate on `isApiEnabled()` so the rest of the app stays mock-only.
 */

import { apiFetch } from "@/lib/api";

// ---------------------------------------------------------------------------
// Types — mirror docs/api_frontend/users.md §5
// ---------------------------------------------------------------------------

export type UserRole =
  | "admin"
  | "lab_manager"
  | "analyst"
  | "client"
  | "accountant"
  | "receptionist";

export type UserStatus = "active" | "trial" | "suspended" | "disabled";

export interface User {
  id: string; // UUID
  email: string;
  username: string;
  fullName: string;
  fullNameAr: string | null;
  role: UserRole;
  isActive: boolean;
  status: UserStatus;
  clientId: string | null;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
  /** Only present on POST 201 (one-time password). */
  tempPassword?: string | null;
}

/** Snake-case shape that FastAPI actually emits for `User`.
 *  `normalizeUser` (below) promotes it to the camelCase `User` above. */
export interface RawUser extends Partial<User> {
  full_name?: string;
  full_name_ar?: string | null;
  is_active?: boolean;
  client_id?: string | null;
  last_login_at?: string | null;
  created_at?: string;
  updated_at?: string;
  temp_password?: string | null;
}

export interface UserCreate {
  email: string;
  username: string;
  fullName: string;
  fullNameAr?: string | null;
  role: UserRole;
  isActive?: boolean;
}

export interface UserUpdate {
  email?: string;
  username?: string;
  fullName?: string;
  fullNameAr?: string | null;
  role?: UserRole;
  isActive?: boolean;
  status?: UserStatus;
}

export interface ListUsersFilters {
  q?: string;
  role?: UserRole;
  status?: UserStatus;
  page?: number;
  pageSize?: number;
}

export interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface Page<T> {
  data: T[];
  pagination: Pagination;
}

export interface Envelope<T> {
  data: T;
}

/**
 * Response shape for `POST /admin/users/:id/reset-password`.
 *
 * The endpoint serves two flows:
 *  - **Admin sets a password** (body `{ new_password: "..." }`): server
 *    returns `{ ok: true, mode: "set", message: "..." }`. The SPA
 *    surfaces the typed password in the copy-to-clipboard dialog.
 *  - **Server mints a link** (no body, legacy): server returns
 *    `{ ok: true, mode: "link", resetLink, expiresAt }`. The SPA shows
 *    the link instead.
 *
 * Failures use standard FastAPI 4xx codes (422 weak password, 404 user
 * not found, 403 self-reset, etc.) with the standard error envelope —
 * the SPA's existing `apiFetch` + `ApiError` path handles those.
 */
export interface ResetPasswordSetResponse {
  ok: true;
  mode: "set";
  /** Localizable success message — server may translate via Accept-Language. */
  message: string;
}

export interface ResetPasswordLinkResponse {
  ok: true;
  mode: "link";
  resetLink: string;
  expiresAt: string;
}

export type ResetPasswordResponse =
  | ResetPasswordSetResponse
  | ResetPasswordLinkResponse;

export type MenuEffect = "grant" | "deny";

export interface UserOverrideCell {
  menuKey: string;
  effect: MenuEffect;
}

export interface UserOverridesResponse {
  userId: string;
  overrides: UserOverrideCell[];
}

export interface UserOverridesReplace {
  overrides: UserOverrideCell[];
}

// ---------------------------------------------------------------------------
// Error body shape — spec §"Error codes"
// ---------------------------------------------------------------------------

export interface ApiErrorBody {
  code: string;
  message: string;
  details?: unknown;
  requestId?: string;
}

export interface ApiErrorEnvelope {
  error: ApiErrorBody;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Tolerate the `{ data: T }` envelope (same dual-shape pattern as
 * `src/lib/auth.ts:unwrap`). The spec §"Response envelopes" mandates it for
 * success responses; for DELETE the server may return `{ data: null }`. */
async function unwrap<T>(
  path: string,
  init?: Parameters<typeof apiFetch>[1],
): Promise<T> {
  const env = await apiFetch<Envelope<T> | T | null>(path, init);
  if (env === null || env === undefined) return env as T;
  if (typeof env === "object" && "data" in env) {
    return (env as Envelope<T>).data;
  }
  return env as T;
}

function buildListQuery(filters: ListUsersFilters): string {
  const params = new URLSearchParams();
  if (filters.q && filters.q.trim()) params.set("q", filters.q.trim());
  if (filters.role) params.set("role", filters.role);
  if (filters.status) params.set("status", filters.status);
  if (typeof filters.page === "number") params.set("page", String(filters.page));
  if (typeof filters.pageSize === "number") {
    params.set("pageSize", String(filters.pageSize));
  }
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

/** Extract the error code string from a thrown ApiError, when present. */
export function getApiErrorCode(err: unknown): string | null {
  if (
    err &&
    typeof err === "object" &&
    "body" in err &&
    err.body &&
    typeof err.body === "object" &&
    "error" in (err.body as Record<string, unknown>)
  ) {
    const e = (err.body as ApiErrorEnvelope).error;
    if (e && typeof e === "object" && typeof e.code === "string") return e.code;
  }
  return null;
}

// ---------------------------------------------------------------------------
// User CRUD — spec §1
// ---------------------------------------------------------------------------

/** GET /admin/users — list with optional filters + pagination.
 *
 * The spec §1.1 mandates `{ data: User[], pagination: {...} }`. In practice
 * the backend sometimes returns alternative shapes (raw array, `{ items }`,
 * `{ users }`) — see the `*_api_response_shapes` regression on the
 * integration ticket. We normalize everything to `Page<User>` here so the
 * consumer (the page) can read `.data` and `.pagination` uniformly.
 *
 * Each user row is also passed through `normalizeUser` so the
 * snake_case fields the backend actually emits (`full_name`, `is_active`,
 * `created_at`, etc.) become the camelCase fields the SPA's `User` type
 * declares. Without this, the table cells render empty because
 * `u.fullName` is `undefined` even when the server sent `full_name`.
 */
export function listUsers(
  filters: ListUsersFilters = {},
): Promise<Page<User>> {
  return unwrap<Page<User> | User[] | Record<string, unknown>>(
    `/admin/users${buildListQuery(filters)}`,
  ).then((res) => {
    const page = normalizeUserPage(res);
    page.data = page.data.map(normalizeUser);
    return page;
  });
}

/** GET /admin/users/:id — fetch one. */
export function getUser(id: string): Promise<User> {
  return unwrap<RawUser | User>(
    `/admin/users/${encodeURIComponent(id)}`,
  ).then((u) => normalizeUser(u as RawUser));
}

/** Snake_case → camelCase adapter.
 *  The backend returns `{ full_name, full_name_ar, is_active, ... }` per
 *  FastAPI convention; the SPA's `User` type is camelCase. Tolerate both
 *  shapes — if the camelCase field is already present, keep it. */
export function normalizeUser(raw: RawUser): User {
  const now = new Date().toISOString();
  return {
    id: raw.id ?? "",
    email: raw.email ?? "",
    username: raw.username ?? "",
    fullName: raw.fullName ?? raw.full_name ?? "",
    fullNameAr: raw.fullNameAr ?? raw.full_name_ar ?? null,
    role: (raw.role ?? "admin") as UserRole,
    isActive: raw.isActive ?? raw.is_active ?? true,
    status: (raw.status ?? "active") as UserStatus,
    clientId: raw.clientId ?? raw.client_id ?? null,
    lastLoginAt: raw.lastLoginAt ?? raw.last_login_at ?? null,
    createdAt: raw.createdAt ?? raw.created_at ?? now,
    updatedAt: raw.updatedAt ?? raw.updated_at ?? now,
    tempPassword: raw.tempPassword ?? raw.temp_password ?? null,
  };
}

/** Reduce any plausible backend shape to `Page<User>`. */
function normalizeUserPage(
  res: Page<User> | User[] | Record<string, unknown> | null | undefined,
): Page<User> {
  if (res === null || res === undefined) {
    return { data: [], pagination: { page: 1, pageSize: 0, total: 0, totalPages: 0 } };
  }
  if (Array.isArray(res)) {
    return {
      data: res as User[],
      pagination: { page: 1, pageSize: res.length, total: res.length, totalPages: 1 },
    };
  }
  if (typeof res === "object") {
    const r = res as Record<string, unknown>;
    // Canonical: { data: User[], pagination: {...} }
    if (Array.isArray(r.data)) {
      return {
        data: r.data as User[],
        pagination:
          (r.pagination as Pagination | undefined) ??
          {
            page: 1,
            pageSize: (r.data as unknown[]).length,
            total: (r.data as unknown[]).length,
            totalPages: 1,
          },
      };
    }
    // Some endpoints return { items: User[] } (test-parameter convention)
    if (Array.isArray(r.items)) {
      return {
        data: r.items as User[],
        pagination: {
          page: 1,
          pageSize: (r.items as unknown[]).length,
          total: (r.items as unknown[]).length,
          totalPages: 1,
        },
      };
    }
    // Some return { users: User[] }
    if (Array.isArray(r.users)) {
      return {
        data: r.users as User[],
        pagination: {
          page: 1,
          pageSize: (r.users as unknown[]).length,
          total: (r.users as unknown[]).length,
          totalPages: 1,
        },
      };
    }
    // Some return { results: User[] } (Django REST convention)
    if (Array.isArray(r.results)) {
      return {
        data: r.results as User[],
        pagination: {
          page: 1,
          pageSize: (r.results as unknown[]).length,
          total: (r.results as unknown[]).length,
          totalPages: 1,
        },
      };
    }
  }
  return { data: [], pagination: { page: 1, pageSize: 0, total: 0, totalPages: 0 } };
}

/** POST /admin/users — create. Returns the new user + one-time tempPassword. */
export function createUser(body: UserCreate): Promise<User> {
  return unwrap<RawUser | User>("/admin/users", { method: "POST", body }).then(
    normalizeUser,
  );
}

/** PATCH /admin/users/:id — partial update. Pass `updatedAt` for `If-Match`. */
export function updateUser(
  id: string,
  body: UserUpdate,
  updatedAt?: string,
): Promise<User> {
  return unwrap<RawUser | User>(
    `/admin/users/${encodeURIComponent(id)}`,
    {
      method: "PATCH",
      body,
      headers: updatedAt ? { "If-Match": updatedAt } : undefined,
    },
  ).then(normalizeUser);
}

/** DELETE /admin/users/:id?confirm=<username> — hard delete. */
export function deleteUser(id: string, confirm: string): Promise<void> {
  const qs = new URLSearchParams({ confirm }).toString();
  return unwrap<void>(`/admin/users/${encodeURIComponent(id)}?${qs}`, {
    method: "DELETE",
  });
}

/** POST /admin/users/:id/reset-password.
 *
 *  - With body `{ new_password: "..." }`, the server sets the user's
 *    password directly and returns `{ ok: true, mode: "set", message }`.
 *  - With no body (or `{}`), the server mints a 24h reset link and
 *    returns `{ ok: true, mode: "link", resetLink, expiresAt }`.
 *
 *  An empty-object body is always sent (not `undefined`) so FastAPI's
 *  Pydantic body parser is happy regardless of which path the backend
 *  actually validates.
 */
export function resetUserPassword(
  id: string,
  body?: { new_password: string },
): Promise<ResetPasswordResponse> {
  return unwrap<ResetPasswordResponse>(
    `/admin/users/${encodeURIComponent(id)}/reset-password`,
    { method: "POST", body: body ?? {} },
  );
}

/** POST /admin/users/:id/suspend — set status=suspended. */
export function suspendUser(id: string, updatedAt?: string): Promise<User> {
  return unwrap<RawUser | User>(
    `/admin/users/${encodeURIComponent(id)}/suspend`,
    {
      method: "POST",
      headers: updatedAt ? { "If-Match": updatedAt } : undefined,
    },
  ).then(normalizeUser);
}

/** POST /admin/users/:id/activate — set status=active. */
export function activateUser(id: string, updatedAt?: string): Promise<User> {
  return unwrap<RawUser | User>(
    `/admin/users/${encodeURIComponent(id)}/activate`,
    {
      method: "POST",
      headers: updatedAt ? { "If-Match": updatedAt } : undefined,
    },
  ).then(normalizeUser);
}

/** GET /admin/users/:id/menu-overrides — read overrides. */
export function getUserMenuOverrides(
  id: string,
): Promise<UserOverridesResponse> {
  return unwrap<UserOverridesResponse>(
    `/admin/users/${encodeURIComponent(id)}/menu-overrides`,
  );
}

/** PUT /admin/users/:id/menu-overrides — atomic replace. */
export function replaceUserMenuOverrides(
  id: string,
  body: UserOverridesReplace,
): Promise<UserOverridesResponse> {
  return unwrap<UserOverridesResponse>(
    `/admin/users/${encodeURIComponent(id)}/menu-overrides`,
    { method: "PUT", body },
  );
}

/** DELETE /admin/users/:id/menu-overrides — clear all. */
export function clearUserMenuOverrides(id: string): Promise<void> {
  return unwrap<void>(
    `/admin/users/${encodeURIComponent(id)}/menu-overrides`,
    { method: "DELETE" },
  );
}