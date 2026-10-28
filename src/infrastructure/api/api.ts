/**
 * Single source of truth for HTTP calls to the backend.
 *
 * Default behaviour: app reads mock data from `@/mock-data` — no calls here.
 * When `VITE_USE_API=true`, callers can opt-in via `useApi`-flagged hooks
 * (see `@/lib/queries`).
 */

import { getToken } from "@/infrastructure/api/auth";
import { readBodyRequestId } from "@/infrastructure/api/response";

export class ApiError extends Error {
  readonly status: number;
  readonly body: unknown;
  /** `X-Request-ID` response header, if the server set one. */
  readonly requestId: string | null;

  constructor(
    status: number,
    message: string,
    body: unknown,
    requestId: string | null = null,
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
    this.requestId = requestId;
  }
}

/** Returns true when the user has opted in to API mode via env. */
export function isApiEnabled(): boolean {
  return import.meta.env.VITE_USE_API === "true";
}

/**
 * The two API surfaces. They are **sibling** routers with separate token
 * families — the superadmin surface is NOT under the tenant one
 * (`app/api/v1/__init__.py:26`, `app/api/v1/superadmin.py:17`).
 */
const TENANT_API_PREFIX = "/api/v1";
const SUPERADMIN_API_PREFIX = "/api/superadmin";

/**
 * The configured origin, or `""` when the env var is unset (dev proxy mode).
 * Trailing slashes are stripped.
 */
function configuredOrigin(): string {
  return import.meta.env.VITE_API_BASE_URL?.trim().replace(/\/+$/, "") ?? "";
}

/**
 * Base URL for the **tenant** API.
 *
 * The env var is commonly a bare origin (`http://localhost:8000`), which would
 * 404 on every call. The `/api/v1` prefix is appended if absent, so both
 * spellings work.
 */
export function getBaseUrl(): string {
  const origin = configuredOrigin();
  if (!origin) return TENANT_API_PREFIX;
  return origin.endsWith(TENANT_API_PREFIX)
    ? origin
    : `${origin}${TENANT_API_PREFIX}`;
}

/**
 * Base URL for the **superadmin** API — the tenant prefix swapped out, so a
 * single env var covers both surfaces.
 */
export function getSuperadminBaseUrl(): string {
  const origin = configuredOrigin();
  if (!origin) return SUPERADMIN_API_PREFIX;
  const bare = origin.endsWith(TENANT_API_PREFIX)
    ? origin.slice(0, -TENANT_API_PREFIX.length)
    : origin;
  return `${bare}${SUPERADMIN_API_PREFIX}`;
}

// `object` (not `Record<string, unknown>`) so that named interfaces such as
// `LoginRequest` are assignable — interfaces have no implicit index signature,
// which `Record<string, unknown>` demands. `unknown` covers the same ground
// without that restriction.
type Json = object | unknown[] | string | number | boolean | null;

interface ApiFetchInit extends Omit<RequestInit, "body"> {
  body?: Json;
  /** Set to false to skip the default Bearer-token injection for this call. */
  skipAuth?: boolean;
  /**
   * Override the base URL for this call.
   *
   * Needed because the backend mounts two sibling API surfaces: the tenant API
   * at `/api/v1` and the superadmin API at `/api/superadmin`. Pass
   * `getSuperadminBaseUrl()` for superadmin routes.
   */
  baseUrl?: string;
}

/**
 * Read the human-readable message out of an error body.
 *
 * The canonical contract nests it at `error.message`; the legacy contract
 * puts a bare string at `detail`. Reading only a *top-level* `message` (as
 * this used to) meant every error surfaced as the literal "HTTP 404".
 */
function readErrorMessage(body: unknown, status: number): string {
  if (body && typeof body === "object") {
    const b = body as Record<string, unknown>;

    const error = b.error;
    if (error && typeof error === "object") {
      const message = (error as { message?: unknown }).message;
      if (typeof message === "string" && message.length > 0) return message;
    }

    if (typeof b.message === "string" && b.message.length > 0) return b.message;

    if (typeof b.detail === "string" && b.detail.length > 0) return b.detail;
  }
  return `HTTP ${status}`;
}

// One-time dev warning when the runtime token store is empty but the env
// var has a value. The backend is Bearer-only (no cookies), so an empty
// runtime store means the login flow has not run in this browser session.
let envTokenWarned = false;
function warnEnvTokenOnce(): void {
  if (envTokenWarned) return;
  envTokenWarned = true;
  // eslint-disable-next-line no-console
  console.warn(
    "[greenlablims] No runtime auth token — falling back to VITE_API_TOKEN env var. " +
      "The backend is Bearer-only (no cookies); log in through the app to populate " +
      "the token store.",
  );
}

/**
 * Typed fetch against the backend. Adds:
 *  - base URL prefix
 *  - Bearer auth from VITE_API_TOKEN (unless caller opts out)
 *  - JSON Content-Type for body-bearing requests
 *  - structured ApiError on non-2xx
 */
export async function apiFetch<T>(path: string, init: ApiFetchInit = {}): Promise<T> {
  const { body, skipAuth, baseUrl, headers: rawHeaders, ...rest } = init;
  const base = baseUrl ?? getBaseUrl();
  const url = `${base}${path.startsWith("/") ? path : `/${path}`}`;

  const headers = new Headers(rawHeaders);
  if (!headers.has("Accept")) headers.set("Accept", "application/json");

  // Opt into the canonical response contract. Set as a *default* so a caller
  // can still negotiate `legacy` (or `modern`) per request by setting the
  // header itself.
  if (!headers.has("X-LIMS-API-Version")) {
    headers.set("X-LIMS-API-Version", "enveloped");
  }

  // Bearer token: prefer the runtime value (set on login), fall back to the
  // build-time env var for dev convenience. Reading on every call means
  // logout takes effect immediately.
  const runtimeToken = skipAuth ? null : getToken();
  const envToken = skipAuth ? null : import.meta.env.VITE_API_TOKEN?.trim();
  const token = runtimeToken ?? envToken;
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  if (runtimeToken === null && envToken && !skipAuth) {
    // Dev-only convenience: nothing persisted yet but env var exists.
    // Flag once per call site is too noisy; warn once per module load is enough.
    warnEnvTokenOnce();
  }

  let serializedBody: BodyInit | undefined;
  if (body !== undefined && body !== null) {
    if (!headers.has("Content-Type")) headers.set("Content-Type", "application/json");
    serializedBody = JSON.stringify(body);
  }

  const response = await fetch(url, {
    ...rest,
    headers,
    body: serializedBody,
    // The backend is Bearer-only and sets no cookies (no `set_cookie` anywhere
    // in app/), so this is not load-bearing — it is kept as `same-origin`
    // so the browser stops attaching ambient cookies to a cross-origin
    // API call. Callers may still override it.
    credentials: rest.credentials ?? "same-origin",
  });

  // 204 No Content — nothing to parse.
  if (response.status === 204) return undefined as T;

  const contentType = response.headers.get("Content-Type") ?? "";
  const isJson = contentType.includes("application/json");
  const parsed: unknown = isJson ? await response.json() : await response.text();

  if (!response.ok) {
    const requestId =
      response.headers.get("X-Request-ID") ?? readBodyRequestId(parsed);
    throw new ApiError(response.status, readErrorMessage(parsed, response.status), parsed, requestId);
  }

  return parsed as T;
}
