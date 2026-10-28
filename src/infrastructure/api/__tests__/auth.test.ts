import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import {
  buildLoginPayload,
  getTokenExpiry,
  forgotPassword,
  login,
  superadminLogin,
  superadminLogout,
  verifyOtp,
} from "@/infrastructure/api/auth";

/**
 * Regression tests for the auth surface.
 *
 * These pin the **exact paths and request bodies** the frontend sends, which
 * is where the Task 4 audit found the contract drift (F2–F6). The backend is
 * the authority — every expectation below cites the backend source.
 */

function lastCall(): { url: string; init: RequestInit & { body?: unknown } } {
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
  return { url: String(call[0]), init: { ...init, body } as RequestInit & { body?: unknown } };
}

function jsonResponse(body: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: () => (status === 204 ? null : "application/json") },
    json: async () => body,
    text: async () => JSON.stringify(body),
  } as unknown as Response;
}

/** A minimal enveloped success body. */
const ENVELOPE = { data: { access_token: "t", user: {} }, meta: {} };

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn(async () => jsonResponse(ENVELOPE)));
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("buildLoginPayload", () => {
  it("sends an email-shaped body", () => {
    expect(buildLoginPayload("a@b.com", "pw")).toEqual({
      email: "a@b.com",
      password: "pw",
    });
  });

  it("trims the identifier", () => {
    expect(buildLoginPayload("  a@b.com  ", "pw").email).toBe("a@b.com");
  });

  it("never sends a `username` field — the backend has none", () => {
    // `LoginRequest` declares `email` + `password` only
    // (`app/domains/auth/schemas.py:11-13`). A `{ username }` body is
    // rejected with 422 for the missing required `email`.
    const payload = buildLoginPayload("someuser", "pw");
    expect(payload).not.toHaveProperty("username");
    expect(payload.email).toBe("someuser");
  });
});

describe("auth endpoint paths", () => {
  it("logs in against the tenant prefix", async () => {
    await login({ email: "a@b.com", password: "pw" });
    expect(lastCall().url).toBe("/api/v1/auth/login");
  });

  it("logs the superadmin in against the SEPARATE superadmin prefix", async () => {
    // `app/api/v1/superadmin.py:17` + `app/domains/superadmin/router_auth.py:43,55`
    await superadminLogin({ email: "a@b.com", password: "pw" });
    expect(lastCall().url).toBe("/api/superadmin/auth/login");
  });

  it("logs the superadmin out against the superadmin prefix", async () => {
    await superadminLogout();
    expect(lastCall().url).toBe("/api/superadmin/auth/logout");
  });

  it("uses the hyphenated forgot-password path", async () => {
    // `app/domains/auth/router.py:67`
    await forgotPassword("a@b.com").catch(() => undefined);
    expect(lastCall().url).toBe("/api/v1/auth/forgot-password");
  });

  it("uses the hyphenated otp-verify path", async () => {
    // `app/domains/auth/router.py:86`
    await verifyOtp({ email: "a@b.com", code: "123456" }).catch(() => undefined);
    expect(lastCall().url).toBe("/api/v1/auth/otp-verify");
  });
});

describe("auth request bodies", () => {
  it("sends `code` (not `otp`) for OTP verification", async () => {
    // `OtpVerifyRequest` declares `email` + `code`
    // (`app/domains/auth/schemas.py:28-30`).
    await verifyOtp({ email: "a@b.com", code: "123456" }).catch(() => undefined);
    expect(lastCall().init.body).toEqual({ email: "a@b.com", code: "123456" });
  });

  it("sends `email` for forgot-password", async () => {
    await forgotPassword("a@b.com").catch(() => undefined);
    expect(lastCall().init.body).toEqual({ email: "a@b.com" });
  });
});

describe("getTokenExpiry", () => {
  function makeJwt(payload: Record<string, unknown>): string {
    const b64 = (obj: unknown) =>
      Buffer.from(JSON.stringify(obj))
        .toString("base64")
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "");
    return `${b64({ alg: "HS256" })}.${b64(payload)}.signature`;
  }

  it("reads the exp claim and returns epoch milliseconds", () => {
    const exp = 1_700_000_000;
    expect(getTokenExpiry(makeJwt({ exp }))).toBe(exp * 1000);
  });

  it("returns null for a non-JWT string", () => {
    expect(getTokenExpiry("not-a-jwt")).toBeNull();
  });

  it("returns null for null", () => {
    expect(getTokenExpiry(null)).toBeNull();
  });

  it("returns null when there is no numeric exp claim", () => {
    expect(getTokenExpiry(makeJwt({ sub: "u1" }))).toBeNull();
  });
});
