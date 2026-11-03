/**
 * @vitest-environment jsdom
 *
 * Tests for the role × menu matrix store.
 *
 * ── Why these cases matter ────────────────────────────────────────────────
 *
 * The store's two subtle behaviours both matter for the "menu assignment
 * does not reach the user" bug:
 *
 *   1. **Seed fallback.** A role with no persisted row falls back to its
 *      seed set, so a newly-created custom role is usable before anyone
 *      opens "Assign Menus" for it. Without this, a fresh custom role
 *      would have a blank sidebar.
 *
 *   2. **An explicitly-empty row stays empty.** This is the "assign NO
 *      menus" case. It must NOT silently revert to the seed — that is
 *      precisely the symptom the user reported ("if i don't assign any
 *      menu ... it still remains same").
 *
 * The store is a module-level singleton, so each test resets it by
 * writing to localStorage and remounting the hook.
 */

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { cleanup, renderHook } from "@testing-library/react";

import { useRoleMenuMatrix } from "@/presentation/hooks/useRoleMenuMatrix";
import { SEED_BY_ROLE } from "@/infrastructure/mock/data/role-menu-permissions";
import type { MenuKey } from "@/infrastructure/mock/data/menuPermissions";

const STORAGE_KEY = "glims_role_menu_matrix_v2";

function writeMatrix(rows: Record<string, string[]>): void {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(rows));
}

/** Remount the hook so it re-reads localStorage. */
function mount() {
  return renderHook(() => useRoleMenuMatrix());
}

beforeEach(() => {
  window.localStorage.clear();
});

afterEach(() => {
  cleanup();
  window.localStorage.clear();
});

describe("useRoleMenuMatrix", () => {
  it("falls back to the seed for a role that has no persisted row", () => {
    const { result } = mount();
    // `analyst` is a seeded role with no row in an empty store.
    expect(result.current.isRoleEnabled("analyst", "samples")).toBe(true);
    expect(result.current.isRoleEnabled("analyst", "quotations")).toBe(false);
  });

  it("keeps an explicitly-empty row empty — the 'assign no menus' case", () => {
    writeMatrix({ analyst: [] });
    const { result } = mount();
    // The seed would have enabled `samples`. An explicit empty row must
    // NOT fall back to it.
    expect(result.current.isRoleEnabled("analyst", "samples")).toBe(false);
    expect(result.current.getRoleKeys("analyst")).toEqual([]);
  });

  it("honours a persisted row over the seed", () => {
    writeMatrix({ analyst: ["quotations"] });
    const { result } = mount();
    expect(result.current.isRoleEnabled("analyst", "quotations")).toBe(true);
    expect(result.current.isRoleEnabled("analyst", "samples")).toBe(false);
  });

  it("drops keys that are not part of the registry", () => {
    writeMatrix({ analyst: ["samples", "not_a_real_menu_key"] });
    const { result } = mount();
    expect(result.current.getRoleKeys("analyst")).toEqual(["samples"]);
  });

  it("falls back to the seed when a persisted row is entirely unknown keys", () => {
    // A v1-era row written in the 10-key admin vocabulary. Reinterpreting
    // it would blank the role's sidebar, so the seed is used instead.
    writeMatrix({ analyst: ["accounting", "invoices", "users", "roles"] });
    const { result } = mount();
    expect(result.current.isRoleEnabled("analyst", "samples")).toBe(true);
  });

  it("ignores the v1 storage key entirely", () => {
    window.localStorage.setItem(
      "glims_role_menu_matrix_v1",
      JSON.stringify({ analyst: [] }),
    );
    const { result } = mount();
    // v1 is not read, so the seed still applies.
    expect(result.current.isRoleEnabled("analyst", "samples")).toBe(true);
  });

  it("setRole replaces the whole row", () => {
    const { result } = mount();
    act_setRole(result.current.setRole, "analyst", ["quotations"]);
    expect(result.current.getRoleKeys("analyst")).toEqual(["quotations"]);
    expect(result.current.isRoleEnabled("analyst", "samples")).toBe(false);
  });

  it("persists setRole to the v2 storage key", () => {
    const { result } = mount();
    act_setRole(result.current.setRole, "analyst", ["quotations"]);
    const raw = window.localStorage.getItem(STORAGE_KEY);
    expect(raw).not.toBeNull();
    // The store persists the whole map, so the row for `analyst` is what
    // matters here — the seeded roles are written alongside it.
    const parsed = JSON.parse(raw!) as Record<string, string[]>;
    expect(parsed.analyst).toEqual(["quotations"]);
  });

  it("supports the full 32-key vocabulary", () => {
    const { result } = mount();
    const all: MenuKey[] = result.current.allMenuKeys();
    expect(all.length).toBe(32);
    act_setRole(result.current.setRole, "lab_manager", all);
    expect(result.current.getRoleKeys("lab_manager")).toHaveLength(32);
  });

  it("resetRole restores the seed for a seeded role", () => {
    writeMatrix({ analyst: ["quotations"] });
    const { result } = mount();
    act_resetRole(result.current.resetRole, "analyst");
    expect(result.current.isRoleEnabled("analyst", "samples")).toBe(true);
  });

  it("exposes the seed for every seeded role", () => {
    const { result } = mount();
    for (const role of Object.keys(SEED_BY_ROLE)) {
      expect(result.current.getRoleKeys(role).length).toBeGreaterThan(0);
    }
  });
});

// Small wrappers so the intent of each call is obvious at the call site.
function act_setRole(
  setRole: (role: string, keys: MenuKey[]) => void,
  role: string,
  keys: MenuKey[],
): void {
  setRole(role, keys);
}

function act_resetRole(
  resetRole: (role: string) => void,
  role: string,
): void {
  resetRole(role);
}
