import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

import {
  clearSuperadminToken,
  clearToken,
  setSuperadminToken,
  setToken,
} from "@/infrastructure/api/auth";
import {
  authHeader,
  envelope,
  installLocalStorage,
  jsonResponse,
  lastCall,
} from "@/infrastructure/api/__tests__/helpers";
import { getMyMenus } from "@/infrastructure/api/clients/myMenusApi";

/**
 * Tests for `GET /auth/me/menus` — the tenant-facing endpoint that returns
 * the signed-in user's RESOLVED menu set.
 *
 * ── Why the token family is the headline assertion ────────────────────────
 *
 * This route is guarded by `get_current_user`, which accepts **only** the
 * tenant `access` token (`backend/app/core/deps.py:196-222`). The two token
 * families are mutually exclusive: presenting the wrong one yields 401
 * "Wrong token type".
 *
 * The sidebar's previous read path — `GET /admin/roles/:role/menu-permissions`
 * — is guarded by `require_superadmin_role`, so a tenant user calling it got
 * 401, the query data stayed `undefined`, and the sidebar silently fell back
 * to its `localStorage` seed. That is why an admin's assignment never reached
 * the affected user's sidebar.
 *
 * This client must therefore send the **tenant** token and MUST NOT use the
 * superadmin-first `authToken()` helper from `rolesApi.ts` — that helper
 * prefers the superadmin token, which would trade one "Wrong token type" 401
 * for another.
 */

describe("myMenusApi — GET /auth/me/menus", () => {
  beforeEach(() => {
    installLocalStorage();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse(envelope({ role: "analyst", menus: [], version: "sha256:x" }))),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    clearToken();
    clearSuperadminToken();
  });

  it("requests exactly /auth/me/menus", async () => {
    await getMyMenus();

    expect(lastCall().url).toBe("/api/v1/auth/me/menus");
  });

  it("sends the TENANT token, not the superadmin token", async () => {
    // Both tokens exist — this is the situation the superadmin-first
    // `authToken()` helper in `rolesApi.ts` gets wrong. A tenant user may
    // hold a superadmin token at the same time; sending that one here
    // would be rejected by `get_current_user`.
    setToken("tenant-access-token");
    setSuperadminToken("superadmin-access-token");

    await getMyMenus();

    expect(authHeader()).toBe("Bearer tenant-access-token");
  });

  it("normalizes menu_key → menuKey", async () => {
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse(
        envelope({
          role: "analyst",
          menus: [
            { menu_key: "dashboard", enabled: true, source: "role" },
            { menu_key: "samples", enabled: false, source: "override" },
          ],
          version: "sha256:abc",
        }),
      ),
    );

    const result = await getMyMenus();

    expect(result.role).toBe("analyst");
    expect(result.version).toBe("sha256:abc");
    expect(result.menus).toEqual([
      { menuKey: "dashboard", enabled: true, source: "role" },
      { menuKey: "samples", enabled: false, source: "override" },
    ]);
  });

  it("carries the resolved `source` for each menu", async () => {
    // The server records which layer decided. The frontend reports it but
    // does NOT re-implement the precedence — that lives on the server.
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse(
        envelope({
          role: "analyst",
          menus: [
            { menu_key: "dashboard", enabled: true, source: "role" },
            { menu_key: "quotations", enabled: true, source: "override" },
          ],
          version: "sha256:abc",
        }),
      ),
    );

    const result = await getMyMenus();

    expect(result.menus.map((m) => m.source)).toEqual(["role", "override"]);
  });

  it("asks for the enveloped contract", async () => {
    await getMyMenus();

    const headers = lastCall().init.headers as Headers;
    expect(headers.get("X-LIMS-API-Version")).toBe("enveloped");
  });
});
