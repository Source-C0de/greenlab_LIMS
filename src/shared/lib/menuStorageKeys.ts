/**
 * The `localStorage` keys the menu-permission layers use.
 *
 * ── Why this file exists ───────────────────────────────────────────────────
 * These key strings were duplicated in three places — the three hooks that
 * own them, plus `Header.tsx`'s logout cleanup. The duplication had already
 * produced a live bug: the logout cleanup removed
 * `glims_role_menu_matrix_v1`, but the live key is
 * `glims_role_menu_matrix_v2` (`useRoleMenuMatrix.ts`), so the mirror
 * survived logout and the next user on the same browser saw the previous
 * user's role assignment.
 *
 * Extracting the constants fixes that structurally: there is now exactly one
 * spelling of each key, and the cleanup cannot drift from the writer.
 *
 * ── What these are (and are not) ──────────────────────────────────────────
 * These are an **offline / error fallback mirror** of the server state, not
 * the source of truth. In API mode the server resolves the menu set
 * (`GET /auth/me/menus`) and this store is only consulted when the server
 * read is pending or failed. A stale local grant must never resurrect a
 * menu the server denied — see `useEffectiveMenuVisibility`.
 */

/** The global per-key kill-switch (the platform-wide "hide this menu"). */
export const MENU_PERMISSIONS_STORAGE_KEY = "glims_menu_permissions_v1";

/**
 * The role × menu matrix mirror.
 *
 * `_v2` is the live key. `_v1` is the superseded spelling, kept here so the
 * logout cleanup can remove it too (a browser that ran the older build may
 * still hold it).
 */
export const ROLE_MENU_MATRIX_STORAGE_KEY = "glims_role_menu_matrix_v2";

/** @deprecated Superseded by {@link ROLE_MENU_MATRIX_STORAGE_KEY}. */
export const LEGACY_ROLE_MENU_MATRIX_STORAGE_KEY = "glims_role_menu_matrix_v1";

/** The per-user override mirror. */
export const USER_MENU_OVERRIDES_STORAGE_KEY = "glims_user_menu_overrides_v1";

/**
 * Every menu-permission key, for a blanket logout cleanup.
 *
 * `LEGACY_ROLE_MENU_MATRIX_STORAGE_KEY` is included on purpose: a browser
 * that ran an older build may still hold the `_v1` rows, and leaving them
 * behind is exactly the cross-user leak this module exists to prevent.
 */
export const ALL_MENU_STORAGE_KEYS: readonly string[] = [
  MENU_PERMISSIONS_STORAGE_KEY,
  ROLE_MENU_MATRIX_STORAGE_KEY,
  LEGACY_ROLE_MENU_MATRIX_STORAGE_KEY,
  USER_MENU_OVERRIDES_STORAGE_KEY,
];
