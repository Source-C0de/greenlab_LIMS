/**
 * Invariants of the SPA's menu-key registry.
 *
 * ── Why this file exists ───────────────────────────────────────────────────
 *
 * The backend's `menu_keys.key` column is `String(32)`, and the same width
 * applies to `role_menu_permissions.menu_key` and
 * `user_menu_overrides.menu_key`. A key longer than that would overflow the
 * column at runtime — on Postgres, not in the test suite.
 *
 * The registry is also the SPA's *authoring* source: the backend's
 * `app/domains/roles/menu_catalogue.py` is generated from it by
 * `backend/scripts/sync_menu_catalogue.py`, and
 * `backend/tests/test_menu_catalogue_sync.py` asserts the two agree.
 * These tests pin the properties the backend relies on, on the SPA's side of
 * the contract.
 */

import { describe, expect, it } from "vitest";

import {
  MENU_GROUP_ORDER,
  MENU_KEY_LIST,
  MENU_REGISTRY,
  isMenuKey,
  type MenuKey,
} from "@/infrastructure/mock/data/menuPermissions";
import { SEED_BY_ROLE } from "@/infrastructure/mock/data/role-menu-permissions";

/** `menu_keys.key` is `String(32)` in the backend schema. */
const MAX_KEY_LENGTH = 32;

/** The key pattern the DB constraints and the backend catalogue assume. */
const KEY_PATTERN = /^[a-z][a-z0-9_]*$/;

describe("menu-key registry", () => {
  it("holds the 32 keys the backend catalogue serves", () => {
    // The backend's catalogue (`backend/app/domains/roles/menu_catalogue.py`)
    // is generated from this registry. If the count changes here, the
    // backend must be re-synced.
    expect(MENU_KEY_LIST).toHaveLength(32);
  });

  it("has unique keys", () => {
    expect(new Set(MENU_KEY_LIST).size).toBe(MENU_KEY_LIST.length);
  });

  it("keeps every key within the column width", () => {
    for (const key of MENU_KEY_LIST) {
      expect(
        key.length,
        `menu key "${key}" is ${key.length} chars; the column is ${MAX_KEY_LENGTH}`,
      ).toBeLessThanOrEqual(MAX_KEY_LENGTH);
    }
  });

  it("matches the expected key pattern", () => {
    for (const key of MENU_KEY_LIST) {
      expect(key, `menu key "${key}" does not match ${KEY_PATTERN.source}`).toMatch(
        KEY_PATTERN,
      );
    }
  });

  it("gives every key bilingual labels", () => {
    for (const key of MENU_KEY_LIST) {
      const entry = MENU_REGISTRY[key];
      expect(entry.labelEn.trim(), `${key} has no EN label`).not.toBe("");
      expect(entry.labelAr.trim(), `${key} has no AR label`).not.toBe("");
    }
  });

  it("gives every key a known group and a root-relative href", () => {
    for (const key of MENU_KEY_LIST) {
      const entry = MENU_REGISTRY[key];
      expect(MENU_GROUP_ORDER, `${key} has group ${entry.group}`).toContain(
        entry.group,
      );
      expect(entry.href, `${key} has a non-root href`).toMatch(/^\//);
    }
  });

  it("agrees with isMenuKey", () => {
    for (const key of MENU_KEY_LIST) {
      expect(isMenuKey(key)).toBe(true);
    }
    expect(isMenuKey("not_a_real_menu_key")).toBe(false);
  });

  it("only names registry keys in the default role seeds", () => {
    for (const [role, keys] of Object.entries(SEED_BY_ROLE)) {
      for (const key of keys) {
        expect(
          isMenuKey(key),
          `role "${role}" references unknown menu key "${key}"`,
        ).toBe(true);
      }
    }
  });

  it("names no legacy key in the default role seeds", () => {
    // The 10-key admin catalogue was replaced by these 32 keys. A legacy
    // key in a seed would silently never match a sidebar item — which is
    // exactly how "the assignment is inert" happened.
    const LEGACY = [
      "test_parameters",
      "accounting",
      "invoices",
      "users",
      "roles",
    ];
    for (const [role, keys] of Object.entries(SEED_BY_ROLE)) {
      for (const legacy of LEGACY) {
        expect(
          (keys as readonly string[]).includes(legacy),
          `role "${role}" still seeds the legacy key "${legacy}"`,
        ).toBe(false);
      }
    }
  });

  it("keeps the type union and the registry in step", () => {
    // A key present in the registry but missing from the `MenuKey` union
    // would be un-reachable by type-safe code.
    const unionKeys = Object.keys(MENU_REGISTRY) as MenuKey[];
    expect(unionKeys.sort()).toEqual([...MENU_KEY_LIST].sort());
  });
});
