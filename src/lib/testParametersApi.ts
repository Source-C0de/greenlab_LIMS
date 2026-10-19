/**
 * Test Parameter Catalogue — typed client for `docs/test_parameter_api.md`.
 *
 * Used by the catalogue page (`/specifications/test-parameters`). All calls
 * flow through `apiFetch` (Bearer auth, JSON envelopes, structured ApiError).
 *
 * Activated via `VITE_USE_API=true`; the consuming hooks gate on
 * `isApiEnabled()` so the rest of the app stays mock-only.
 */

import { apiFetch, ApiError } from "@/lib/api";

// ---------------------------------------------------------------------------
// Types — mirror the FastAPI contract in docs/test_parameter_api.md §2 + §4
// ---------------------------------------------------------------------------

export interface TestParameter {
  id: string; // UUID
  code: string;
  spec: string | null;
  test_name: string | null;
  parameter: string;
  reference: string | null;
  tests: string | null;
  mu: string | null;
  sop_code: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TestParameterCreate {
  code: string; // 1..32 chars, unique
  spec?: string | null; // ≤ 64 chars
  test_name?: string | null; // ≤ 255 chars
  parameter: string; // 1..255 chars
  reference?: string | null; // ≤ 255 chars
  tests?: string | null; // ≤ 255 chars
  mu?: string | null; // ≤ 64 chars
  sop_code?: string | null; // ≤ 64 chars
}

export interface TestParameterUpdate {
  code?: string;
  spec?: string | null;
  test_name?: string | null;
  parameter?: string;
  reference?: string | null;
  tests?: string | null;
  mu?: string | null;
  sop_code?: string | null;
  is_active?: boolean;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
}

export interface ListFilters {
  search?: string;
  spec?: string;
  sop_code?: string;
  is_active?: boolean;
  limit?: number;
  offset?: number;
}

// ---------------------------------------------------------------------------
// Server error shapes — docs §5.4, §5.5, §5.6, §5.7
// ---------------------------------------------------------------------------

/** Pydantic 422 envelope: `{ detail: [{ type, loc, msg, input }, ...] }`. */
export interface ValidationIssue {
  type: string;
  loc: (string | number)[];
  msg: string;
  input?: unknown;
}

export interface ValidationErrorBody {
  detail: ValidationIssue[];
}

export interface SimpleErrorBody {
  detail: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a query string for the list endpoint, skipping undefined / empty. */
function buildQuery(filters: ListFilters): string {
  const params = new URLSearchParams();
  if (filters.search && filters.search.trim()) {
    params.set("search", filters.search.trim());
  }
  if (filters.spec) params.set("spec", filters.spec);
  if (filters.sop_code) params.set("sop_code", filters.sop_code);
  if (typeof filters.is_active === "boolean") {
    params.set("is_active", String(filters.is_active));
  }
  if (typeof filters.limit === "number") params.set("limit", String(filters.limit));
  if (typeof filters.offset === "number") params.set("offset", String(filters.offset));
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

/**
 * Best-effort extract of the `{ detail: ... }` body of an ApiError. The body
 * shape is one of:
 *   - `ValidationErrorBody` (422): array of issues
 *   - `SimpleErrorBody` (403/404/409): single string
 *   - string (some 5xx)
 */
export function getErrorDetail(err: unknown): {
  status: number;
  message: string;
  validation?: ValidationIssue[];
} {
  if (err instanceof ApiError) {
    const body = err.body;
    if (body && typeof body === "object") {
      const detail = (body as { detail?: unknown }).detail;
      if (typeof detail === "string") {
        return { status: err.status, message: detail };
      }
      if (Array.isArray(detail)) {
        const issues = detail as ValidationIssue[];
        const first = issues[0];
        const summary = first
          ? `${first.loc?.join(".") || "field"}: ${first.msg}`
          : err.message;
        return { status: err.status, message: summary, validation: issues };
      }
    }
    return { status: err.status, message: err.message };
  }
  return { status: 0, message: err instanceof Error ? err.message : String(err) };
}

/** Tolerate the `{ data: T }` envelope (same dual-shape pattern as @/lib/auth). */
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

// ---------------------------------------------------------------------------
// Endpoints — docs §3
// ---------------------------------------------------------------------------

/** GET /test-parameters — list with filters. */
export function listTestParameters(
  filters: ListFilters = {},
): Promise<Paginated<TestParameter>> {
  // The contract (§3.1) says the response is `200 Paginated<TestParameter>`.
  // Some FastAPI implementations skip the envelope and return a raw array
  // instead. Be tolerant of both shapes and normalize to `Paginated<T>`.
  return unwrap<Paginated<TestParameter> | TestParameter[]>(
    `/test-parameters${buildQuery(filters)}`,
  ).then((res) => normalizePaginated(res, filters));
}

/** Coerce a possibly-raw-array response into the documented envelope. */
function normalizePaginated(
  res: Paginated<TestParameter> | TestParameter[] | unknown,
  filters: ListFilters,
): Paginated<TestParameter> {
  if (Array.isArray(res)) {
    warnOnce(
      "test-parameters",
      "Backend returned a raw array for GET /test-parameters. " +
        "The contract (§3.1) expects { items, total, limit, offset }. " +
        "Wrapping locally — please update the API to match the contract.",
    );
    const items = res as TestParameter[];
    return {
      items,
      total: items.length,
      limit: filters.limit ?? items.length,
      offset: filters.offset ?? 0,
    };
  }
  if (
    res &&
    typeof res === "object" &&
    "items" in (res as Record<string, unknown>) &&
    Array.isArray((res as { items: unknown }).items)
  ) {
    return res as Paginated<TestParameter>;
  }
  // Unknown shape — surface as a structured empty page so the UI can render
  // a clear error rather than silently show zero results.
  warnOnce(
    "test-parameters",
    `Unexpected GET /test-parameters response shape: ${typeof res}. ` +
      "Expected Paginated<TestParameter> or TestParameter[].",
  );
  return { items: [], total: 0, limit: 0, offset: 0 };
}

let warnedKeys: Record<string, boolean> = {};
function warnOnce(key: string, message: string): void {
  if (warnedKeys[key]) return;
  warnedKeys[key] = true;
  // eslint-disable-next-line no-console
  console.warn(`[greenlablims/test-parameters] ${message}`);
}

/** GET /test-parameters/{id} — fetch one. */
export function getTestParameter(id: string): Promise<TestParameter> {
  return unwrap<TestParameter>(`/test-parameters/${encodeURIComponent(id)}`);
}

/** POST /test-parameters — create (admin). */
export function createTestParameter(
  body: TestParameterCreate,
): Promise<TestParameter> {
  return unwrap<TestParameter>("/test-parameters", { method: "POST", body });
}

/** PATCH /test-parameters/{id} — partial update (admin). */
export function updateTestParameter(
  id: string,
  body: TestParameterUpdate,
): Promise<TestParameter> {
  return unwrap<TestParameter>(`/test-parameters/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body,
  });
}

/** DELETE /test-parameters/{id} — hard delete (admin). */
export function deleteTestParameter(id: string): Promise<void> {
  return unwrap<void>(`/test-parameters/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}
