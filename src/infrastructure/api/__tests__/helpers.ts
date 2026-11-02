/**
 * Shared test helpers for the API-client suites.
 *
 * These were duplicated verbatim between `rolesApi.test.ts` and
 * `superadminAuth.test.ts`. They live here so a fix to the fetch shim (or to
 * the localStorage shim) lands in one place rather than in N copies that
 * quietly drift apart.
 */

import { vi } from "vitest";

/**
 * Install a minimal, honest `window.localStorage`.
 *
 * The Vitest environment is `node`, so there is no `window` and no
 * `localStorage`. The auth module guards every storage access with
 * `typeof window === "undefined"`, so without this shim it would store
 * NOTHING — and any assertion about a stored token would pass vacuously.
 */
export function installLocalStorage(): void {
  const store = new Map<string, string>();
  const shim = {
    getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
    clear: () => store.clear(),
    key: (i: number) => Array.from(store.keys())[i] ?? null,
    get length() {
      return store.size;
    },
  };
  vi.stubGlobal("window", { localStorage: shim });
}

/** The URL and init of the most recent `fetch` call. */
export function lastCall(): { url: string; init: RequestInit & { body?: unknown } } {
  const call = vi.mocked(fetch).mock.calls.at(-1);
  if (!call) throw new Error("fetch was not called");
  const init = (call[1] ?? {}) as RequestInit & { body?: unknown };
  let body: unknown = init.body;
  if (typeof init.body === "string") {
    try {
      body = JSON.parse(init.body);
    } catch {
      body = init.body;
    }
  }
  return {
    url: String(call[0]),
    init: { ...init, body } as RequestInit & { body?: unknown },
  };
}

/** The `Authorization` header value the last call actually sent. */
export function authHeader(): string | null {
  const headers = lastCall().init.headers;
  if (!headers) return null;
  const h = headers as Headers;
  if (typeof h.get === "function") return h.get("Authorization");
  return null;
}

/** A minimal `Response` stand-in with the given JSON body and status. */
export function jsonResponse(body: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: () => (status === 204 ? null : "application/json") },
    json: async () => body,
    text: async () => JSON.stringify(body),
  } as unknown as Response;
}

/** A minimal enveloped success body. */
export function envelope(data: unknown) {
  return { data, meta: {} };
}
