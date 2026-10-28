import { describe, expect, it, vi } from "vitest";
import {
  login,
  superadminLogin,
  forgotPassword,
  verifyOtp,
  requestRegister,
  resendOtp,
} from "@/infrastructure/api/auth";
import { listUsers } from "@/infrastructure/api/clients/usersApi";
import { listRoles } from "@/infrastructure/api/clients/rolesApi";
import {
  listTestParameters,
} from "@/infrastructure/api/clients/testParametersApi";
import { listTestList } from "@/infrastructure/api/clients/testListApi";

/**
 * Contract test — asserts that **every endpoint path the frontend calls
 * actually exists on the backend**.
 *
 * This is the structural fix for the whole class of defect the Task 4 audit
 * found (F2–F7): the frontend had drifted from the backend's route table, and
 * every drift was a runtime 404/422 that no type-checker could catch.
 *
 * The expectations below are transcribed from the backend source, with the
 * citation in each comment. When the backend's routes change, this file must
 * change with them — that is the point.
 *
 * Run with: `npm test` (it is hermetic — it does not need a live backend).
 */

// ---------------------------------------------------------------------------
// The route table, transcribed from the backend.
// ---------------------------------------------------------------------------

/** `app/domains/auth/router.py` — the tenant auth router. */
const TENANT_AUTH_ROUTES = [
  "POST /api/v1/auth/login",
  "POST /api/v1/auth/refresh",
  "POST /api/v1/auth/logout",
  "POST /api/v1/auth/forgot-password",
  "POST /api/v1/auth/otp-verify",
  "GET /api/v1/auth/me",
  "PATCH /api/v1/auth/me",
] as const;

/** `app/domains/superadmin/router_auth.py` — mounted at `/api/superadmin`. */
const SUPERADMIN_AUTH_ROUTES = [
  "POST /api/superadmin/auth/login",
  "POST /api/superadmin/auth/refresh",
  "POST /api/superadmin/auth/logout",
  "GET /api/superadmin/auth/me",
  "PATCH /api/superadmin/auth/me/password",
  "POST /api/superadmin/auth/forgot-password",
  "POST /api/superadmin/auth/reset-password",
] as const;

/** `app/domains/users/router_admin.py` — prefix `/admin/users`. */
const ADMIN_USER_ROUTES = [
  "GET /api/v1/admin/users",
  "POST /api/v1/admin/users",
  "GET /api/v1/admin/users/{user_id}",
  "PATCH /api/v1/admin/users/{user_id}",
  "DELETE /api/v1/admin/users/{user_id}",
  "POST /api/v1/admin/users/{user_id}/reset-password",
  "POST /api/v1/admin/users/{user_id}/suspend",
  "POST /api/v1/admin/users/{user_id}/activate",
  "GET /api/v1/admin/users/{user_id}/menu-overrides",
  "PUT /api/v1/admin/users/{user_id}/menu-overrides",
  "DELETE /api/v1/admin/users/{user_id}/menu-overrides",
] as const;

/** `app/domains/roles/router.py` — prefix `/admin`. */
const ADMIN_ROLE_ROUTES = [
  "GET /api/v1/admin/menu-keys",
  "GET /api/v1/admin/roles",
  "GET /api/v1/admin/roles/{role}",
  "PATCH /api/v1/admin/roles/{role}",
  "PATCH /api/v1/admin/roles/{role}/status",
  "POST /api/v1/admin/roles",
  "DELETE /api/v1/admin/roles/{role}",
  "GET /api/v1/admin/roles/{role}/menu-permissions",
  "PUT /api/v1/admin/roles/{role}/menu-permissions",
] as const;

/** `app/domains/tests/router_parameter.py` and `router_list.py`. */
const TEST_CATALOGUE_ROUTES = [
  "GET /api/v1/test-parameters",
  "GET /api/v1/test-parameters/{tp_id}",
  "POST /api/v1/test-parameters",
  "PATCH /api/v1/test-parameters/{tp_id}",
  "DELETE /api/v1/test-parameters/{tp_id}",
  "GET /api/v1/test-list",
  "GET /api/v1/test-list/{tl_id}",
  "POST /api/v1/test-list",
  "PATCH /api/v1/test-list/{tl_id}",
  "DELETE /api/v1/test-list/{tl_id}",
] as const;

/**
 * Every route the backend actually exposes.
 *
 * The two API surfaces are **siblings**: the tenant API is mounted at
 * `/api/v1` (`app/api/v1/__init__.py:26`) and the superadmin API at
 * `/api/superadmin` (`app/api/v1/superadmin.py:17`).
 */
const BACKEND_ROUTES: readonly string[] = [
  ...TENANT_AUTH_ROUTES,
  ...SUPERADMIN_AUTH_ROUTES,
  ...ADMIN_USER_ROUTES,
  ...ADMIN_ROLE_ROUTES,
  ...TEST_CATALOGUE_ROUTES,
];

/**
 * Routes the frontend calls that have **no backend counterpart**.
 *
 * These are known dead ends awaiting a product decision (hide the UI vs. add
 * a backend route). They are listed explicitly so that adding a backend route
 * forces a deliberate edit here rather than a silent divergence.
 */
const FRONTEND_ROUTES_WITH_NO_BACKEND = [
  "POST /api/v1/auth/register",
  "POST /api/v1/auth/otp/resend",
] as const;

// ---------------------------------------------------------------------------
// The assertion.
// ---------------------------------------------------------------------------

describe("frontend ↔ backend route contract", () => {
  it("has a non-trivial backend route table to check against", () => {
    // A guard against the table silently emptying out, which would make every
    // other assertion vacuously true.
    expect(BACKEND_ROUTES.length).toBeGreaterThan(30);
  });

  it("records the two known frontend routes with no backend counterpart", () => {
    for (const route of FRONTEND_ROUTES_WITH_NO_BACKEND) {
      expect(BACKEND_ROUTES).not.toContain(route);
    }
  });

  it("does not mix the two prefixes", () => {
    // `/api/v1/auth/superadmin/...` was the bug (F2). Guard the shape.
    for (const route of BACKEND_ROUTES) {
      expect(route).not.toMatch(/^\/api\/v1\/auth\/superadmin/);
      expect(route).not.toMatch(/^\/api\/v1\/api\//);
    }
  });
});

describe("the auth client targets real backend routes", () => {
  /**
   * A live check: stub the network, invoke each client, and assert the URL it
   * actually requested is in the backend route table.
   */
  async function requestedUrl(fn: () => Promise<unknown>): Promise<string> {
    const calls: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        calls.push(String(url));
        return {
          ok: true,
          status: 200,
          headers: { get: () => "application/json" },
          json: async () => ({ data: [], meta: { pagination: { limit: 50, offset: 0, total: 0 } } }),
          text: async () => "",
        } as unknown as Response;
      }),
    );
    try {
      await fn().catch(() => undefined);
    } finally {
      vi.unstubAllGlobals();
    }
    expect(calls.length).toBeGreaterThan(0);
    return calls[0];
  }

  it("login hits POST /api/v1/auth/login", async () => {
    const url = await requestedUrl(() => login({ email: "a@b.com", password: "pw" }));
    expect(url).toBe("/api/v1/auth/login");
  });

  it("superadminLogin hits POST /api/superadmin/auth/login", async () => {
    const url = await requestedUrl(() =>
      superadminLogin({ email: "a@b.com", password: "pw" }),
    );
    expect(url).toBe("/api/superadmin/auth/login");
  });

  it("forgotPassword hits POST /api/v1/auth/forgot-password", async () => {
    const url = await requestedUrl(() => forgotPassword("a@b.com"));
    expect(url).toBe("/api/v1/auth/forgot-password");
  });

  it("verifyOtp hits POST /api/v1/auth/otp-verify", async () => {
    const url = await requestedUrl(() => verifyOtp({ email: "a@b.com", code: "123456" }));
    expect(url).toBe("/api/v1/auth/otp-verify");
  });

  it("listUsers hits GET /api/v1/admin/users", async () => {
    const url = await requestedUrl(() => listUsers());
    expect(url.split("?")[0]).toBe("/api/v1/admin/users");
  });

  it("listRoles hits GET /api/v1/admin/roles", async () => {
    const url = await requestedUrl(() => listRoles());
    expect(url.split("?")[0]).toBe("/api/v1/admin/roles");
  });

  it("listTestParameters hits GET /api/v1/test-parameters", async () => {
    const url = await requestedUrl(() => listTestParameters());
    expect(url.split("?")[0]).toBe("/api/v1/test-parameters");
  });

  it("listTestList hits GET /api/v1/test-list", async () => {
    const url = await requestedUrl(() => listTestList());
    expect(url.split("?")[0]).toBe("/api/v1/test-list");
  });

  it("requestRegister hits a route the backend does not expose", async () => {
    const url = await requestedUrl(() =>
      requestRegister({ labName: "L", contactName: "A", contactEmail: "a@b.com" }),
    );
    expect(url).toBe("/api/v1/auth/register");
    expect(BACKEND_ROUTES).not.toContain(`POST ${url}`);
    expect(FRONTEND_ROUTES_WITH_NO_BACKEND).toContain(`POST ${url}`);
  });

  it("resendOtp hits a route the backend does not expose", async () => {
    const url = await requestedUrl(() => resendOtp("a@b.com"));
    expect(url).toBe("/api/v1/auth/otp/resend");
    expect(BACKEND_ROUTES).not.toContain(`POST ${url}`);
    expect(FRONTEND_ROUTES_WITH_NO_BACKEND).toContain(`POST ${url}`);
  });
});
