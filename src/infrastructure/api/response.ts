/**
 * The single shared vocabulary for the backend's response contract.
 *
 * The backend exposes three wire contracts via the `X-LIMS-API-Version`
 * header:
 *
 *  | header value  | success body                    | error body                          |
 *  |---------------|---------------------------------|-------------------------------------|
 *  | (omitted)     | today's shapes (snake_case)     | `{"error": {...}}`                  |
 *  | `modern`      | today's shapes (snake_case)     | `{"error": {...}}`                  |
 *  | `enveloped`   | `{"data": ..., "meta": {...}}`  | `{"error": {...}, "meta": {...}}`    |
 *  | `legacy`      | today's shapes (camelCase)      | `{"detail": ...}`                   |
 *
 * The frontend sends `enveloped` (see `api.ts`), so every response it
 * receives follows the shapes declared here. This module owns the types and
 * the parsing primitives; each API client declares what its endpoints return
 * and unwraps explicitly at the call site — there is no hidden global unwrap,
 * because a call site that knows it wants a list must say so.
 */

/** Cross-cutting facts about a response. */
export interface ApiMeta {
  /** The request id, mirroring the `X-Request-ID` response header. */
  request_id?: string;
  /** Present only on paginated list endpoints. */
  pagination?: Pagination;
}

/**
 * The pagination window.
 *
 * `limit`/`offset` rather than `page`/`page_size`: it is the strictly more
 * expressive model, it matches the majority of the backend's routes, and
 * `total_pages` is derivable (`ceil(total / limit)`) so it is not carried.
 */
export interface Pagination {
  limit: number;
  offset: number;
  total: number;
}

/** The canonical success envelope. */
export interface SuccessEnvelope<T> {
  data: T;
  meta: ApiMeta;
}

/** The error payload. */
export interface ApiErrorBody {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  /**
   * Present under the `modern` contract (`app/main.py:309-316`); under
   * `enveloped` the id is at `meta.request_id` instead.
   */
  request_id?: string;
}

/** The canonical error envelope. */
export interface ErrorEnvelope {
  error: ApiErrorBody;
  meta?: { request_id?: string };
}

/** One entry from FastAPI's validation-error list. */
export interface ValidationIssue {
  loc?: (string | number)[];
  msg?: string;
  type?: string;
}

/** Type guard for the canonical success envelope. */
export function isSuccessEnvelope(b: unknown): b is SuccessEnvelope<unknown> {
  return (
    typeof b === "object" &&
    b !== null &&
    "data" in b &&
    "meta" in b &&
    typeof (b as { meta?: unknown }).meta === "object" &&
    (b as { meta?: unknown }).meta !== null
  );
}

/**
 * Read the request id out of an error body.
 *
 * `meta.request_id` is the `enveloped` location; `error.request_id` is the
 * `modern` one (`app/main.py:309-316`). Both are read, in that order.
 */
export function readBodyRequestId(body: unknown): string | null {
  if (!body || typeof body !== "object") return null;
  const b = body as {
    meta?: { request_id?: unknown };
    error?: { request_id?: unknown };
  };

  const fromMeta = b.meta?.request_id;
  if (typeof fromMeta === "string" && fromMeta.length > 0) return fromMeta;

  const fromError = b.error?.request_id;
  if (typeof fromError === "string" && fromError.length > 0) return fromError;

  return null;
}

/** Type guard for the canonical error envelope. */
export function isErrorEnvelope(b: unknown): b is ErrorEnvelope {
  return (
    typeof b === "object" &&
    b !== null &&
    "error" in b &&
    typeof (b as { error?: unknown }).error === "object" &&
    (b as { error?: unknown }).error !== null
  );
}

/**
 * Unwrap a single-resource envelope.
 *
 * Strict on purpose: a body that is not an envelope is a contract violation,
 * and silently returning `undefined` would hide it. `T` may itself be `null`
 * (e.g. a delete that returns `{"data": null}`) — that is a *typed* null, not
 * a missing payload.
 *
 * The backend passes through **raw** any route with no declared
 * `response_model` (`app/main.py:236-243`), and skips the envelope for 204
 * and for file downloads. A caller that hits one of those would otherwise get
 * `undefined` with no indication of why, so this throws instead.
 */
export function unwrapData<T>(b: SuccessEnvelope<T>): T {
  if (!isSuccessEnvelope(b)) {
    throw new Error(
      "Expected a success envelope ({ data, meta }). " +
        "The response was not enveloped — is the endpoint a file download, " +
        "a 204, or a route without a declared response_model? " +
        "Is the X-LIMS-API-Version header set to 'enveloped'?",
    );
  }
  return b.data;
}

/**
 * Unwrap a paginated envelope into its items and its window.
 *
 * Strict for the same reason as `unwrapData`: a raw body throws rather than
 * yielding `undefined` items.
 */
export function unwrapPage<T>(
  b: SuccessEnvelope<T[]>,
): { items: T[]; pagination: Pagination } {
  if (!isSuccessEnvelope(b)) {
    throw new Error(
      "Expected a paginated envelope ({ data, meta }). " +
        "The response was not enveloped — is the X-LIMS-API-Version header set to 'enveloped'?",
    );
  }
  const pagination = b.meta.pagination;
  if (!pagination) {
    throw new Error(
      "Expected a paginated envelope (meta.pagination missing). " +
        "Is the endpoint paginated, and is the X-LIMS-API-Version header set to 'enveloped'?",
    );
  }
  return { items: b.data, pagination };
}

/**
 * Extract the validation issue list from an error body.
 *
 * Handles the canonical `error.details.errors` shape, and falls back to
 * FastAPI's own `detail: [...]` list for the legacy contract.
 */
export function extractValidationIssues(b: unknown): ValidationIssue[] {
  if (!b || typeof b !== "object") return [];

  // Canonical: { error: { details: { errors: [...] } } }
  if (isErrorEnvelope(b)) {
    const details = b.error.details;
    if (details && typeof details === "object") {
      const errors = (details as { errors?: unknown }).errors;
      if (Array.isArray(errors)) return errors as ValidationIssue[];
    }
    return [];
  }

  // Legacy: { detail: [...] }
  const detail = (b as { detail?: unknown }).detail;
  if (Array.isArray(detail)) return detail as ValidationIssue[];

  return [];
}

/**
 * Read the machine-readable error code from a failed request's body.
 *
 * Handles the canonical `error.code` shape and the legacy `detail` string.
 */
export function getApiErrorCode(err: unknown): string | null {
  if (!err || typeof err !== "object") return null;

  const body = (err as { body?: unknown }).body;
  if (!body || typeof body !== "object") return null;

  if (isErrorEnvelope(body)) return body.error.code ?? null;

  // Legacy `{"detail": "..."}` — there is no code, only a message.
  return null;
}

/**
 * Read the request id from a failed request's body.
 *
 * The `X-Request-ID` header is canonical (it also covers 204s and file
 * downloads, which have no body); the in-body copies are read as fallbacks.
 */
export function getApiErrorRequestId(err: unknown): string | null {
  if (!err || typeof err !== "object") return null;

  const body = (err as { body?: unknown }).body;
  if (!body || typeof body !== "object") return null;

  return readBodyRequestId(body);
}
