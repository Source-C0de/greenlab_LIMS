/**
 * Single source of truth for HTTP calls to the backend.
 *
 * Default behaviour: app reads mock data from `@/mock-data` — no calls here.
 * When `VITE_USE_API=true`, callers can opt-in via `useApi`-flagged hooks
 * (see `@/lib/queries`).
 */

import { getToken } from "@/infrastructure/api/auth";

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
 * Returns the base URL the browser should hit.
 * - Dev:   "/api/v1" — the Vite dev-server proxy forwards this to localhost:8000.
 * - Prod:  whatever VITE_API_BASE_URL says (absolute origin + path).
 */
export function getBaseUrl(): string {
  const explicit = import.meta.env.VITE_API_BASE_URL?.trim();
  if (explicit && explicit.length > 0) return explicit.replace(/\/$/, "");
  return "/api/v1";
}

// One-time dev warning when the runtime token store is empty but the env
// var has a value — i.e. the backend is using Bearer auth but the login
// flow hasn't populated the store yet (likely because the spec doesn't
// currently include a `token` field in /auth/login responses).
let envTokenWarned = false;
function warnEnvTokenOnce(): void {
  if (envTokenWarned) return;
  envTokenWarned = true;
  // eslint-disable-next-line no-console
  console.warn(
    "[greenlablims] No runtime auth token — falling back to VITE_API_TOKEN env var. " +
      "If /auth/login is supposed to return a token field, the backend is missing it. " +
      "Cookie auth (per the spec) also works; tokens are auto-included via credentials: 'include'.",
  );
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

/**
 * Read the request id out of an error body.
 *
 * The `X-Request-ID` header is canonical — it is the only channel that also
 * covers 204 responses and file downloads, which have no body. `meta.request_id`
 * is the in-body copy under the `enveloped` contract, used as a fallback.
 */
function readErrorRequestId(body: unknown): string | null {
  if (!body || typeof body !== "object") return null;
  const meta = (body as { meta?: { request_id?: unknown } }).meta;
  if (meta && typeof meta.request_id === "string") return meta.request_id;
  return null;
}

/**
 * Typed fetch against the backend. Adds:
 *  - base URL prefix
 *  - Bearer auth from VITE_API_TOKEN (unless caller opts out)
 *  - JSON Content-Type for body-bearing requests
 *  - structured ApiError on non-2xx
 */
export async function apiFetch<T>(path: string, init: ApiFetchInit = {}): Promise<T> {
  const { body, skipAuth, headers: rawHeaders, ...rest } = init;
  const url = `${getBaseUrl()}${path.startsWith("/") ? path : `/${path}`}`;

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
    credentials: rest.credentials ?? "include",
  });

  // 204 No Content — nothing to parse.
  if (response.status === 204) return undefined as T;

  const contentType = response.headers.get("Content-Type") ?? "";
  const isJson = contentType.includes("application/json");
  const parsed: unknown = isJson ? await response.json() : await response.text();

  if (!response.ok) {
    const requestId =
      response.headers.get("X-Request-ID") ?? readErrorRequestId(parsed);
    throw new ApiError(response.status, readErrorMessage(parsed, response.status), parsed, requestId);
  }

  return parsed as T;
}
