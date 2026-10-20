/**
 * Test List API — typed client for `GET/POST/PATCH/DELETE /api/v1/test-list`.
 *
 * All calls flow through `apiFetch` (Bearer auth, JSON envelopes, structured
 * ApiError). Activated via `VITE_USE_API=true`; the consuming page branches
 * on `isApiEnabled()` so the rest of the app stays mock-only.
 *
 * Row shape mirrors the backend's `TestListOut` — a FLAT row where each record
 * is one parameter measurement (unlike the mock `TestMaster`, which nests N
 * parameters inside a test via `parameterDetails`).
 */

import { apiFetch } from "@/infrastructure/api/api";

// ---------------------------------------------------------------------------
// Types — mirror the backend's TestListOut / TestListCreate / TestListUpdate
// ---------------------------------------------------------------------------

/** `GET /test-list` → 200. */
export interface TestListItem {
  /** UUID — used in GET/PATCH/DELETE URLs. */
  id: string;
  /** Natural key, e.g. `GL-TL-001`. Rendered as the "ID" column. */
  code: string;
  /** Free-text spec tag, e.g. `FOOD`, `WATER`. Nullable. */
  spec: string | null;
  /** The parameter being measured, e.g. `pH`, `E.coli`. */
  parameter: string;
  /** Measurement uncertainty, e.g. `±0.05`. Nullable. */
  mu: string | null;
  /** Method / standard reference, e.g. `ISO 6579-1`. Nullable. */
  reference: string | null;
  /** The acceptance limit, e.g. `6.5 - 8.5`, `Absent`. Nullable. */
  limit_value: string | null;
  /** Soft-disable flag. `false` rows are hidden from active views. */
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/** `GET /test-list` → 200. Backend uses limit/offset, not page/pageSize. */
export interface Paginated<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
}

/** `POST /test-list` body. `code` + `parameter` are required. */
export interface TestListCreate {
  code: string;
  parameter: string;
  spec?: string | null;
  mu?: string | null;
  reference?: string | null;
  limit_value?: string | null;
}

/** `PATCH /test-list/{id}` body. Every field optional (true partial patch). */
export interface TestListUpdate {
  code?: string;
  parameter?: string;
  spec?: string | null;
  mu?: string | null;
  reference?: string | null;
  limit_value?: string | null;
  is_active?: boolean;
}

/** `GET /test-list` query params. */
export interface TestListFilters {
  /** Case-insensitive substring over `code`, `parameter`, and `spec`. */
  search?: string;
  /** Exact match on `spec`. */
  spec?: string;
  is_active?: boolean;
  /** 1–200. Backend default 50. */
  limit?: number;
  offset?: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Tolerate the `{ data: T }` envelope (same dual-shape pattern as
 *  `@/lib/auth` and `@/lib/testParametersApi`). */
interface Envelope<T> {
  data: T;
}

async function unwrap<T>(
  path: string,
  init?: Parameters<typeof apiFetch>[1],
): Promise<T> {
  const env = await apiFetch<Envelope<T> | T>(path, init);
  if (env !== null && typeof env === "object" && "data" in env) {
    return (env as Envelope<T>).data;
  }
  return env as T;
}

function buildQuery(filters: TestListFilters): string {
  const params = new URLSearchParams();
  if (filters.search && filters.search.trim()) {
    params.set("search", filters.search.trim());
  }
  if (filters.spec) params.set("spec", filters.spec);
  if (typeof filters.is_active === "boolean") {
    params.set("is_active", String(filters.is_active));
  }
  if (typeof filters.limit === "number") params.set("limit", String(filters.limit));
  if (typeof filters.offset === "number") params.set("offset", String(filters.offset));
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

/**
 * Best-effort extract of the `{ detail: ... }` body of an ApiError. Mirrors
 * `getErrorDetail` in `@/lib/testParametersApi` so the page's error toast
 * behaves identically across both API-backed catalogues.
 */
export function getTestListErrorDetail(err: unknown): {
  status: number;
  message: string;
} {
  if (err && typeof err === "object" && "status" in err && "body" in err) {
    const e = err as { status: number; body: unknown; message: string };
    const body = e.body;
    if (body && typeof body === "object" && "detail" in body) {
      const detail = (body as { detail: unknown }).detail;
      if (typeof detail === "string") return { status: e.status, message: detail };
      if (Array.isArray(detail) && detail.length > 0) {
        const first = detail[0] as { loc?: unknown[]; msg?: string };
        const loc = Array.isArray(first.loc) ? first.loc.join(".") : "field";
        return { status: e.status, message: `${loc}: ${first.msg ?? "invalid"}` };
      }
    }
    return { status: e.status, message: e.message };
  }
  return {
    status: 0,
    message: err instanceof Error ? err.message : String(err),
  };
}

// ---------------------------------------------------------------------------
// Endpoints
// ---------------------------------------------------------------------------

/** GET /test-list — list with filters + limit/offset pagination. */
export function listTestList(
  filters: TestListFilters = {},
): Promise<Paginated<TestListItem>> {
  return unwrap<Paginated<TestListItem>>(`/test-list${buildQuery(filters)}`);
}

/** GET /test-list/{id} — fetch one. */
export function getTestListItem(id: string): Promise<TestListItem> {
  return unwrap<TestListItem>(`/test-list/${encodeURIComponent(id)}`);
}

/** POST /test-list — create (admin only). */
export function createTestListItem(
  body: TestListCreate,
): Promise<TestListItem> {
  return unwrap<TestListItem>("/test-list", { method: "POST", body });
}

/** PATCH /test-list/{id} — partial update (admin only). */
export function updateTestListItem(
  id: string,
  body: TestListUpdate,
): Promise<TestListItem> {
  return unwrap<TestListItem>(`/test-list/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body,
  });
}

/** DELETE /test-list/{id} — hard delete, 204 (admin only). */
export function deleteTestListItem(id: string): Promise<void> {
  return unwrap<void>(`/test-list/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}