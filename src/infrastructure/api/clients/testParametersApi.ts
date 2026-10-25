/**
 * Test Parameter Catalogue — typed client for `docs/test_parameter_api.md`.
 *
 * Used by the catalogue page (`/specifications/test-parameters`). All calls
 * flow through `apiFetch` (Bearer auth, JSON envelopes, structured ApiError).
 *
 * Activated via `VITE_USE_API=true`; the consuming hooks gate on
 * `isApiEnabled()` so the rest of the app stays mock-only.
 */

import { apiFetch, ApiError } from "@/infrastructure/api/api";
import {
  extractValidationIssues,
  unwrapData,
  unwrapPage,
  type Pagination,
  type SuccessEnvelope,
} from "@/infrastructure/api/response";

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

/**
 * A page of catalogue rows plus the window they came from.
 *
 * The window is `{limit, offset, total}` — the shared wire type. On the wire
 * the rows live in `data` and the window in `meta.pagination`.
 */
export interface Paginated<T> {
  items: T[];
  pagination: Pagination;
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

/**
 * One entry from the server's validation-issue list.
 *
 * The canonical contract carries these at `error.details.errors`; the legacy
 * contract carried them at `detail`. `extractValidationIssues` reads both.
 */
export type ValidationIssue = import("@/infrastructure/api/response").ValidationIssue;

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

    // A validation failure carries a list of issues — canonical location is
    // `error.details.errors`, legacy location is a top-level `detail` array.
    const issues = extractValidationIssues(body);
    if (issues.length > 0) {
      const first = issues[0];
      const summary = first
        ? `${first.loc?.join(".") || "field"}: ${first.msg}`
        : err.message;
      return { status: err.status, message: summary, validation: issues };
    }

    return { status: err.status, message: err.message };
  }
  return { status: 0, message: err instanceof Error ? err.message : String(err) };
}

/** Fetch and unwrap the canonical envelope. */
async function unwrap<T>(
  path: string,
  init?: Parameters<typeof apiFetch>[1],
): Promise<T> {
  const env = await apiFetch<SuccessEnvelope<T>>(path, init);
  return unwrapData(env);
}

// ---------------------------------------------------------------------------
// Endpoints — docs §3
// ---------------------------------------------------------------------------

/** GET /test-parameters — list with filters. */
export async function listTestParameters(
  filters: ListFilters = {},
): Promise<Paginated<TestParameter>> {
  const env = await apiFetch<SuccessEnvelope<TestParameter[]>>(
    `/test-parameters${buildQuery(filters)}`,
  );
  const { items, pagination } = unwrapPage(env);
  return { items, pagination };
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
