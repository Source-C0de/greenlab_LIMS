import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

import {
  clearSuperadminToken,
  clearToken,
  getSuperadminRefreshToken,
  getSuperadminToken,
  getRefreshToken,
  getToken,
  setSuperadminRefreshToken,
  setSuperadminToken,
  setRefreshToken,
  setToken,
  superadminLogin,
  superadminLogout,
  superadminMe,
  superadminRefresh,
} from "@/infrastructure/api/auth";
import {
  installLocalStorage,
  jsonResponse,
  lastCall,
} from "@/infrastructure/api/__tests__/helpers";
import { httpSuperadminSession } from "@/infrastructure/api/repositories/authSession";

/**
 * Regression tests for the **superadmin login flow**.
 *
 * ── The bug these pin ────────────────────────────────────────────────────
 *
 * `superadmin-login.tsx` used to call the raw `superadminLogin()` HTTP
 * helper and discard the response:
 *
 *     await superadminLoginRequest(buildLoginPayload(email, password));
 *     setLocation("/admin");
 *
 * Three defects compounded, and the visible symptom was only the last one:
 *
 *   1. **The access token was discarded.** Nothing called `setToken()`, so
 *      `localStorage` held no credential and every later request went out
 *      unauthenticated.
 *   2. **AuthContext was never updated.** Its state stayed `anonymous`, so
 *      `ProtectedRoute` redirected the user straight back to `/login`. The
 *      backend reported success; the SPA never advanced. No error surfaced
 *      anywhere, which is what made this so hard to see from the outside.
 *   3. **Reload probed the wrong identity endpoint.** `restore()` asked the
 *      TENANT `/auth/me`, which resolves the token subject against the `User`
 *      table (`app/core/deps.py:74-83`) — but a superadmin's id lives in
 *      `SuperadminUser`, so it always answered "not found or inactive".
 *
 * There is a fourth, latent defect these tests also pin: the backend mints a
 * **separate token family** for the superadmin surface
 * (`app/core/security.py:54-58`). `get_current_user` accepts `ACCESS` only
 * and `get_current_superadmin` accepts `SUPERADMIN_ACCESS` only, so the two
 * surfaces cannot share one storage slot.
 *
 * The token-family story is documented once, in `infrastructure/api/auth.ts`.
 */

/**
 * The Vitest environment is `node` (`vitest.config.ts`), so there is no
 * `window` and no `localStorage`. The auth module guards every storage access
 * with `typeof window === "undefined"`, which means without a shim it would
 * silently store NOTHING — and the storage tests below would pass vacuously.
 *
 * The shim itself lives in `__tests__/helpers.ts`.
 */

/** The superadmin login body shape (`SuperadminTokenResponse`). */
const SUPERADMIN_ENVELOPE = {
  data: {
    access_token: "sa-access-token",
    refresh_token: "sa-refresh-token",
    expires_in: 86400,
    user: {
      id: "67506c3a-6892-418a-a963-7e5ff73d78b3",
      email: "ops@greenlab.com",
      full_name: "Initial Superadmin",
      full_name_ar: null,
      role: "superadmin",
      status: "active",
      mfa_enabled: false,
      last_login_at: "2026-11-01T10:23:02.145946Z",
      created_at: "2026-10-26T12:52:17.338320Z",
      updated_at: "2026-11-01T10:23:01.579265Z",
    },
  },
  meta: {},
};

beforeEach(() => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => jsonResponse(SUPERADMIN_ENVELOPE)),
  );
  installLocalStorage();
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("superadmin token family", () => {
  it("stores the superadmin token in its OWN slot, not the tenant one", () => {
    // The two families are mutually exclusive server-side
    // (`app/core/deps.py:53,142-149`), so they must not share storage.
    setToken("tenant-access");
    setSuperadminToken("sa-access");

    expect(getToken()).toBe("tenant-access");
    expect(getSuperadminToken()).toBe("sa-access");
  });

  it("stores the superadmin refresh token separately from the tenant one", () => {
    setRefreshToken("tenant-refresh");
    setSuperadminRefreshToken("sa-refresh");

    expect(getRefreshToken()).toBe("tenant-refresh");
    expect(getSuperadminRefreshToken()).toBe("sa-refresh");
  });

  it("clears only the superadmin slot when the superadmin signs out", () => {
    setToken("tenant-access");
    setRefreshToken("tenant-refresh");
    setSuperadminToken("sa-access");
    setSuperadminRefreshToken("sa-refresh");

    clearSuperadminToken();

    expect(getSuperadminToken()).toBeNull();
    expect(getSuperadminRefreshToken()).toBeNull();
    // The tenant session must survive — the two are independent identities.
    expect(getToken()).toBe("tenant-access");
    expect(getRefreshToken()).toBe("tenant-refresh");
  });

  it("clears only the tenant slot when the tenant signs out", () => {
    setToken("tenant-access");
    setSuperadminToken("sa-access");

    clearToken();

    expect(getToken()).toBeNull();
    expect(getSuperadminToken()).toBe("sa-access");
  });
});

describe("superadmin endpoint paths", () => {
  it("logs in against the superadmin prefix", async () => {
    await superadminLogin({ email: "a@b.com", password: "pw" });
    expect(lastCall().url).toBe("/api/superadmin/auth/login");
  });

  it("refreshes against the superadmin prefix", async () => {
    // `app/domains/superadmin/router_auth.py:78` — a sibling route, NOT
    // the tenant `/api/v1/auth/refresh`.
    await superadminRefresh({ refresh_token: "sa-refresh" });
    expect(lastCall().url).toBe("/api/superadmin/auth/refresh");
  });

  it("sends the superadmin refresh token in the refresh body", async () => {
    await superadminRefresh({ refresh_token: "sa-refresh" });
    expect(lastCall().init.body).toEqual({ refresh_token: "sa-refresh" });
  });

  it("reads identity from the superadmin /me, not the tenant one", async () => {
    // The tenant `/auth/me` resolves against the `User` table
    // (`app/core/deps.py:74-83`) and cannot resolve a superadmin id.
    await superadminMe();
    expect(lastCall().url).toBe("/api/superadmin/auth/me");
  });

  it("logs out against the superadmin prefix", async () => {
    await superadminLogout();
    expect(lastCall().url).toBe("/api/superadmin/auth/logout");
  });

  it("presents the SUPERADMIN token on superadmin calls", async () => {
    // The tenant token would be rejected with 401 "Wrong token type".
    setToken("tenant-access");
    setSuperadminToken("sa-access");

    await superadminMe();

    const headers = lastCall().init.headers as Headers;
    expect(headers.get("Authorization")).toBe("Bearer sa-access");
  });
});

describe("httpSuperadminSession.signIn", () => {
  it("PERSISTS the access token — the line the old page was missing", async () => {
    // The old `superadmin-login.tsx` awaited `superadminLogin()` and threw
    // the response away, so nothing was ever stored and every later request
    // went out unauthenticated.
    const session = await httpSuperadminSession.signIn({
      email: "ops@greenlab.com",
      password: "pw",
    });

    expect(getSuperadminToken()).toBe("sa-access-token");
    expect(getSuperadminRefreshToken()).toBe("sa-refresh-token");
    expect(session.token).toBe("sa-access-token");
  });

  it("does NOT write the superadmin token into the tenant slot", async () => {
    await httpSuperadminSession.signIn({
      email: "ops@greenlab.com",
      password: "pw",
    });

    expect(getToken()).toBeNull();
  });

  it("maps the superadmin role onto the domain role", async () => {
    const session = await httpSuperadminSession.signIn({
      email: "ops@greenlab.com",
      password: "pw",
    });

    expect(session.user.role).toBe("superadmin");
    expect(session.user.email).toBe("ops@greenlab.com");
    expect(session.user.fullName).toBe("Initial Superadmin");
  });

  it("treats a non-active superadmin account as inactive", async () => {
    // The backend refuses a suspended/disabled superadmin at the dependency
    // layer with 403 (`app/core/deps.py:175-182`); the SPA must not render
    // the admin console for one.
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse({
        ...SUPERADMIN_ENVELOPE,
        data: {
          ...SUPERADMIN_ENVELOPE.data,
          user: { ...SUPERADMIN_ENVELOPE.data.user, status: "suspended" },
        },
      }),
    );

    const session = await httpSuperadminSession.signIn({
      email: "ops@greenlab.com",
      password: "pw",
    });

    expect(session.user.isActive).toBe(false);
  });

  it("publishes the session so subscribers see the login", async () => {
    const seen: Array<unknown> = [];
    const unsubscribe = httpSuperadminSession.subscribe((s) => seen.push(s));

    await httpSuperadminSession.signIn({
      email: "ops@greenlab.com",
      password: "pw",
    });
    unsubscribe();

    expect(seen.length).toBeGreaterThan(0);
    expect((seen.at(-1) as { token: string }).token).toBe("sa-access-token");
  });

  it("re-throws a 401 so the page can say 'invalid credentials'", async () => {
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse({ error: { code: "unauthorized", message: "nope" } }, 401),
    );

    await expect(
      httpSuperadminSession.signIn({ email: "a@b.com", password: "bad" }),
    ).rejects.toMatchObject({ status: 401 });
  });
});

describe("httpSuperadminSession.restore", () => {
  it("probes the SUPERADMIN /me", async () => {
    // The old bootstrap asked the tenant `/auth/me`, which cannot resolve a
    // superadmin identity — so a superadmin session died on every reload.
    setSuperadminToken("sa-access");

    await httpSuperadminSession.restore();

    expect(lastCall().url).toBe("/api/superadmin/auth/me");
  });

  it("returns null and clears the token when there is nothing stored", async () => {
    const session = await httpSuperadminSession.restore();

    expect(session).toBeNull();
    // No token → no request at all.
    expect(fetch).not.toHaveBeenCalled();
  });

  it("clears the token on a genuine 401", async () => {
    setSuperadminToken("sa-access");
    setSuperadminRefreshToken("sa-refresh");
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse({ error: { code: "unauthorized", message: "expired" } }, 401),
    );

    const session = await httpSuperadminSession.restore();

    expect(session).toBeNull();
    expect(getSuperadminToken()).toBeNull();
  });

  it("KEEPS the token on a transient failure (500), so a hiccup does not sign the user out", async () => {
    // The tenant adapter learned this the hard way: a bare `catch` called
    // `clearToken()` on any error, so a 500 or a CORS blip permanently
    // destroyed a valid session. A 500 means "we could not find out", which
    // is not the same as "no".
    setSuperadminToken("sa-access");
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse({ error: { code: "server_error", message: "boom" } }, 500),
    );

    await httpSuperadminSession.restore();

    expect(getSuperadminToken()).toBe("sa-access");
  });
});
