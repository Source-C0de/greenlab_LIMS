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
import {
  createRole,
  deleteRole,
  getRole,
  getRoleMenuPermissions,
  listMenuKeys,
  listRoles,
  putRoleMenuPermissions,
  setRoleStatus,
  updateRole,
  type RoleCreate,
} from "@/infrastructure/api/clients/rolesApi";

/**
 * Regression tests for the **Roles admin page**.
 *
 * ── The bug these pin ────────────────────────────────────────────────────
 *
 * The Roles page (`pages/admin/roles.tsx`) is mounted behind
 * `<ProtectedRoute platformOnly>`, so the caller is a superadmin — who holds
 * a **superadmin** token and normally has **no tenant token at all**.
 *
 * `rolesApi.ts` never overrode the token, so `apiFetch` injected the default
 * **tenant** token on every call. The backend guards the roles routes with
 * TWO different token families, split by operation — see `authToken()` in
 * `rolesApi.ts` for the table. The families are mutually exclusive, so in a
 * superadmin-only session every request went out with **no** Authorization
 * header at all and came back 401 — the role table rendered with headers and
 * no rows, and no role could be created.
 *
 * Two more defects sat behind it: the backend answers menu cells as
 * `{"menu_key": ...}` (snake_case) but the client read `c.menuKey`, so every
 * cell read back as `undefined`; and `DELETE` answers **204 No Content** with
 * no envelope, which `unwrapData(undefined)` turns into a thrown error.
 *
 * The superadmin token-family story is documented once, in
 * `infrastructure/api/auth.ts`.
 */

/**
 * The Vitest environment is `node` (`vitest.config.ts`), so there is no
 * `window` and no `localStorage`. The auth module guards every storage access
 * with `typeof window === "undefined"`, so without a shim it would store
 * NOTHING — and the token assertions below would pass vacuously. The shim
 * itself lives in `__tests__/helpers.ts`.
 */

const RAW_ROLE = {
  role: "analyst",
  label_en: "Analyst",
  label_ar: "محلل",
  description_en: "Runs laboratory analyses.",
  description_ar: "يُجري التحاليل المخبرية.",
  icon_name: "FlaskConical",
  is_active: true,
  is_custom: false,
  updated_at: "2026-11-01T10:00:00Z",
};

const CREATE_BODY: RoleCreate = {
  slug: "qa_supervisor",
  labelEn: "QA Supervisor",
  labelAr: "مشرف الجودة",
  descriptionEn: "Reviews quality control reports.",
  descriptionAr: "يراجع تقارير ضبط الجودة.",
  iconName: "ShieldCheck",
};

beforeEach(() => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => jsonResponse(envelope([RAW_ROLE]))),
  );
  installLocalStorage();
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("rolesApi token family", () => {
  it("sends the SUPERADMIN token on the reads (they accept either family)", async () => {
    // The platform console holds ONLY a superadmin token, so the reads must
    // present it. The backend's read guard is dual-family
    // (`get_current_user_or_superadmin`) precisely because the Roles page
    // is behind `<ProtectedRoute platformOnly>`.
    setToken("tenant-access");
    setSuperadminToken("sa-access");

    await listRoles();

    expect(authHeader()).toBe("Bearer sa-access");
  });

  it("falls back to the TENANT token on the reads when no superadmin session exists", async () => {
    clearSuperadminToken();
    setToken("tenant-access");

    await listRoles();

    expect(authHeader()).toBe("Bearer tenant-access");
  });

  it("uses the superadmin token on the reads when ONLY a superadmin session exists", async () => {
    clearToken();
    setSuperadminToken("sa-access");

    await listMenuKeys();

    expect(authHeader()).toBe("Bearer sa-access");
  });

  it("sends the SUPERADMIN token when creating a role", async () => {
    setToken("tenant-access");
    setSuperadminToken("sa-access");

    await createRole(CREATE_BODY);

    expect(authHeader()).toBe("Bearer sa-access");
  });

  it("sends the SUPERADMIN token when updating a role", async () => {
    setToken("tenant-access");
    setSuperadminToken("sa-access");

    await updateRole("analyst", { labelEn: "Lab Analyst" });

    expect(authHeader()).toBe("Bearer sa-access");
  });

  it("sends the SUPERADMIN token when archiving a role", async () => {
    setToken("tenant-access");
    setSuperadminToken("sa-access");

    await setRoleStatus("analyst", { isActive: false });

    expect(authHeader()).toBe("Bearer sa-access");
  });

  it("sends the SUPERADMIN token on the menu-permissions GET", async () => {
    setToken("tenant-access");
    setSuperadminToken("sa-access");
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse(envelope({ role: "analyst", cells: [] })),
    );

    await getRoleMenuPermissions("analyst");

    expect(authHeader()).toBe("Bearer sa-access");
  });

  it("sends the SUPERADMIN token on the menu-permissions PUT", async () => {
    setToken("tenant-access");
    setSuperadminToken("sa-access");
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse(envelope({ role: "analyst", cells: [] })),
    );

    await putRoleMenuPermissions("analyst", { cells: [] });

    expect(authHeader()).toBe("Bearer sa-access");
  });

  it("falls back to the TENANT token when no superadmin session exists", async () => {
    // A tenant admin with no platform session: the write endpoints will
    // still reject it server-side, but the client must not send a STALE or
    // empty credential — it must send the one it actually holds.
    clearSuperadminToken();
    setToken("tenant-access");

    await createRole(CREATE_BODY);

    expect(authHeader()).toBe("Bearer tenant-access");
  });

  it("uses the superadmin token when ONLY a superadmin session exists", async () => {
    // This is the scenario that broke the page: a superadmin-only session
    // has no tenant token, so the old client sent no Authorization header at
    // all and the backend answered 401 "Not authenticated".
    clearToken();
    setSuperadminToken("sa-access");

    await createRole(CREATE_BODY);

    expect(authHeader()).toBe("Bearer sa-access");
  });
});

describe("rolesApi menu-cell normalization", () => {
  it("maps the backend's snake_case menu_key to camelCase menuKey", async () => {
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse(
        envelope({
          role: "analyst",
          cells: [
            { menu_key: "samples", enabled: true },
            { menu_key: "reports", enabled: true },
            { menu_key: "dashboard", enabled: false },
          ],
        }),
      ),
    );

    const result = await getRoleMenuPermissions("analyst");

    expect(result.cells).toEqual([
      { menuKey: "samples", enabled: true },
      { menuKey: "reports", enabled: true },
      { menuKey: "dashboard", enabled: false },
    ]);
  });

  it("normalizes the cells the PUT response returns too", async () => {
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse(
        envelope({
          role: "analyst",
          cells: [{ menu_key: "samples", enabled: true }],
        }),
      ),
    );

    const result = await putRoleMenuPermissions("analyst", {
      cells: [{ menu_key: "samples", enabled: true }],
    });

    expect(result.cells[0]?.menuKey).toBe("samples");
  });
});

describe("rolesApi DELETE", () => {
  it("resolves on a 204 No Content instead of throwing", async () => {
    // The backend answers DELETE with 204 and no envelope
    // (`backend/app/domains/roles/router.py:197-211`). Running
    // `unwrapData(undefined)` on it throws "Expected a success envelope",
    // which surfaced as a bogus error toast and left the row on screen.
    vi.mocked(fetch).mockResolvedValue(jsonResponse(undefined, 204));

    await expect(deleteRole("qa_supervisor")).resolves.toBeUndefined();
  });

  it("sends the SUPERADMIN token", async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse(undefined, 204));
    setToken("tenant-access");
    setSuperadminToken("sa-access");

    await deleteRole("qa_supervisor");

    expect(authHeader()).toBe("Bearer sa-access");
  });
});

describe("rolesApi if_match", () => {
  it("sends if_match as a query param, which is how the backend reads it", async () => {
    // The backend declares `if_match: str | None = None` with NO
    // `Header(...)` annotation (`backend/app/domains/roles/router.py:124`),
    // so FastAPI binds it as a QUERY parameter. The header the client used
    // to send never reached the handler.
    setSuperadminToken("sa-access");

    await updateRole("analyst", { labelEn: "Lab Analyst" }, "2026-11-01T10:00:00Z");

    expect(lastCall().url).toContain("if_match=2026-11-01T10%3A00%3A00Z");
  });
});

describe("rolesApi read shapes", () => {
  it("maps a single role's snake_case fields to camelCase", async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse(envelope(RAW_ROLE)));

    const role = await getRole("analyst");

    expect(role.labelEn).toBe("Analyst");
    expect(role.labelAr).toBe("محلل");
    expect(role.iconName).toBe("FlaskConical");
    expect(role.isActive).toBe(true);
  });

  it("maps the menu-key catalogue to camelCase", async () => {
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse(
        envelope([
          {
            key: "dashboard",
            label_en: "Dashboard",
            label_ar: "لوحة التحكم",
            group: "lab",
            href: "/",
            display_order: 10,
          },
        ]),
      ),
    );

    const keys = await listMenuKeys();

    expect(keys[0]?.labelEn).toBe("Dashboard");
    expect(keys[0]?.displayOrder).toBe(10);
  });
});
