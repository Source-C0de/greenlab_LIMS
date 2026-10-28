import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import {
  ApiError,
  apiFetch,
  getBaseUrl,
  getSuperadminBaseUrl,
} from "@/infrastructure/api/api";

/**
 * Regression tests for the `apiFetch` primitive.
 *
 * These pin the behaviour the Task 4 audit found to be load-bearing:
 *  - base-URL resolution (the `/api/v1` prefix normalisation, F1)
 *  - the two-prefix model (tenant `/api/v1` vs superadmin `/api/superadmin`, F2)
 *  - the `enveloped` contract header
 *  - the 204 path
 *  - the error-envelope matrix
 */

const ORIGINAL_ENV = { ...import.meta.env };

/**
 * Set (or clear) an env var for the duration of a test.
 *
 * `vi.stubEnv` is the supported way to do this under Vitest — mutating
 * `import.meta.env` directly does not work reliably, because an assigned
 * `undefined` is coerced to the string `"undefined"`.
 */
function setEnv(value: string | undefined) {
  vi.stubEnv("VITE_API_BASE_URL", value);
}

beforeEach(() => {
  setEnv(undefined);
  vi.stubGlobal("fetch", vi.fn());
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function mockResponse(init: {
  status?: number;
  body?: unknown;
  contentType?: string;
  headers?: Record<string, string>;
}) {
  const status = init.status ?? 200;
  const contentType = init.contentType ?? "application/json";
  const json = vi.fn(async () => init.body);
  const text = vi.fn(async () => (typeof init.body === "string" ? init.body : ""));
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: {
      get: (name: string) => {
        const lower = name.toLowerCase();
        if (lower === "content-type") return contentType;
        const headers = init.headers ?? {};
        return headers[lower] ?? headers[name] ?? null;
      },
    },
    json,
    text,
  } as unknown as Response;
}

describe("getBaseUrl", () => {
  it("defaults to the tenant prefix when the env var is unset", () => {
    expect(getBaseUrl()).toBe("/api/v1");
  });

  it("defaults to the tenant prefix when the env var is empty", () => {
    setEnv("");
    expect(getBaseUrl()).toBe("/api/v1");
  });

  it("appends the tenant prefix to a bare origin", () => {
    setEnv("http://localhost:8000");
    expect(getBaseUrl()).toBe("http://localhost:8000/api/v1");
  });

  it("does not double-append the prefix when it is already present", () => {
    setEnv("http://localhost:8000/api/v1");
    expect(getBaseUrl()).toBe("http://localhost:8000/api/v1");
  });

  it("strips a trailing slash", () => {
    setEnv("http://localhost:8000/");
    expect(getBaseUrl()).toBe("http://localhost:8000/api/v1");
  });

  it("trims surrounding whitespace", () => {
    setEnv("  http://localhost:8000  ");
    expect(getBaseUrl()).toBe("http://localhost:8000/api/v1");
  });
});

describe("getSuperadminBaseUrl", () => {
  it("defaults to the superadmin prefix when the env var is unset", () => {
    expect(getSuperadminBaseUrl()).toBe("/api/superadmin");
  });

  it("derives the superadmin prefix from a bare origin", () => {
    setEnv("http://localhost:8000");
    expect(getSuperadminBaseUrl()).toBe("http://localhost:8000/api/superadmin");
  });

  it("swaps the tenant prefix for the superadmin one", () => {
    setEnv("http://localhost:8000/api/v1");
    expect(getSuperadminBaseUrl()).toBe("http://localhost:8000/api/superadmin");
  });
});

/** Run `apiFetch` and return the `ApiError` it threw. */
async function captureApiError(fn: () => Promise<unknown>): Promise<ApiError> {
  try {
    await fn();
  } catch (err) {
    if (err instanceof ApiError) return err;
    throw err;
  }
  throw new Error("expected apiFetch to throw an ApiError");
}

describe("apiFetch", () => {
  it("requests the enveloped contract by default", async () => {
    vi.mocked(fetch).mockResolvedValue(mockResponse({ body: { data: 1, meta: {} } }));

    await apiFetch("/auth/login", { method: "POST", body: {} });

    const init = vi.mocked(fetch).mock.calls[0][1] as RequestInit;
    const headers = new Headers(init.headers);
    expect(headers.get("X-LIMS-API-Version")).toBe("enveloped");
  });

  it("lets a caller override the contract header", async () => {
    vi.mocked(fetch).mockResolvedValue(mockResponse({ body: {} }));

    await apiFetch("/x", { headers: { "X-LIMS-API-Version": "modern" } });

    const init = vi.mocked(fetch).mock.calls[0][1] as RequestInit;
    const headers = new Headers(init.headers);
    expect(headers.get("X-LIMS-API-Version")).toBe("modern");
  });

  it("uses the tenant base by default", async () => {
    setEnv("http://localhost:8000");
    vi.mocked(fetch).mockResolvedValue(mockResponse({ body: { data: 1, meta: {} } }));

    await apiFetch("/auth/login", { method: "POST", body: {} });

    expect(vi.mocked(fetch).mock.calls[0][0]).toBe(
      "http://localhost:8000/api/v1/auth/login",
    );
  });

  it("honours an explicit baseUrl override", async () => {
    setEnv("http://localhost:8000");
    vi.mocked(fetch).mockResolvedValue(mockResponse({ body: { data: 1, meta: {} } }));

    await apiFetch("/auth/login", {
      method: "POST",
      body: {},
      baseUrl: getSuperadminBaseUrl(),
    });

    expect(vi.mocked(fetch).mock.calls[0][0]).toBe(
      "http://localhost:8000/api/superadmin/auth/login",
    );
  });

  it("serialises a JSON body and sets Content-Type", async () => {
    vi.mocked(fetch).mockResolvedValue(mockResponse({ body: { data: 1, meta: {} } }));

    await apiFetch("/x", { method: "POST", body: { email: "a@b.c" } });

    const init = vi.mocked(fetch).mock.calls[0][1] as RequestInit;
    expect(init.body).toBe(JSON.stringify({ email: "a@b.c" }));
    expect(new Headers(init.headers).get("Content-Type")).toBe("application/json");
  });

  it("omits Content-Type when there is no body", async () => {
    vi.mocked(fetch).mockResolvedValue(mockResponse({ body: { data: 1, meta: {} } }));

    await apiFetch("/x");

    const init = vi.mocked(fetch).mock.calls[0][1] as RequestInit;
    expect(init.body).toBeUndefined();
    expect(new Headers(init.headers).get("Content-Type")).toBeNull();
  });

  it("returns undefined for 204 without parsing", async () => {
    const res = mockResponse({ status: 204, body: undefined });
    vi.mocked(fetch).mockResolvedValue(res);

    const result = await apiFetch("/x");

    expect(result).toBeUndefined();
    expect(res.json).not.toHaveBeenCalled();
  });

  it("returns the parsed body on success", async () => {
    vi.mocked(fetch).mockResolvedValue(
      mockResponse({ body: { data: { id: "1" }, meta: { request_id: "r" } } }),
    );

    const result = await apiFetch<{ data: { id: string } }>("/x");

    expect(result).toEqual({ data: { id: "1" }, meta: { request_id: "r" } });
  });

  it("throws an ApiError carrying the status and body", async () => {
    vi.mocked(fetch).mockResolvedValue(
      mockResponse({
        status: 404,
        body: { error: { code: "not_found", message: "Gone" }, meta: {} },
      }),
    );

    await expect(apiFetch("/x")).rejects.toBeInstanceOf(ApiError);
  });

  it("reads the message from error.message", async () => {
    vi.mocked(fetch).mockResolvedValue(
      mockResponse({
        status: 400,
        body: { error: { code: "bad_request", message: "Bad thing" }, meta: {} },
      }),
    );

    await expect(apiFetch("/x")).rejects.toThrow("Bad thing");
  });

  it("prefers the X-Request-ID header over the body", async () => {
    vi.mocked(fetch).mockResolvedValue(
      mockResponse({
        status: 500,
        body: { error: { code: "internal_error", message: "x" }, meta: { request_id: "body-id" } },
        headers: { "X-Request-ID": "header-id" },
      }),
    );

    const err = await captureApiError(() => apiFetch("/x"));
    expect(err.requestId).toBe("header-id");
  });

  it("falls back to meta.request_id when the header is absent", async () => {
    vi.mocked(fetch).mockResolvedValue(
      mockResponse({
        status: 500,
        body: { error: { code: "internal_error", message: "x" }, meta: { request_id: "body-id" } },
      }),
    );

    const err = await captureApiError(() => apiFetch("/x"));
    expect(err.requestId).toBe("body-id");
  });

  it("falls back to error.request_id under the modern contract", async () => {
    vi.mocked(fetch).mockResolvedValue(
      mockResponse({
        status: 500,
        body: { error: { code: "internal_error", message: "x", request_id: "modern-id" } },
      }),
    );

    const err = await captureApiError(() => apiFetch("/x"));
    expect(err.requestId).toBe("modern-id");
  });

  it("falls back to a generic HTTP message when no body message exists", async () => {
    vi.mocked(fetch).mockResolvedValue(mockResponse({ status: 503, body: {} }));

    await expect(apiFetch("/x")).rejects.toThrow("HTTP 503");
  });
});
