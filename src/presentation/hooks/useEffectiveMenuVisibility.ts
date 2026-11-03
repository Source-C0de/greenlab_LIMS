import { isApiEnabled } from "@/infrastructure/api/api";
import { useMyMenus } from "@/infrastructure/api/tanstack-queries";
import { type MenuKey } from "@/infrastructure/mock/data/menuPermissions";
import { type Role } from "@/shared/lib/types";
import { useMenuPermissions } from "@/presentation/hooks/useMenuPermissions";
import { useRoleMenuMatrix } from "@/presentation/hooks/useRoleMenuMatrix";
import { useUserMenuOverrides } from "@/presentation/hooks/useUserMenuOverrides";
import { resolveVisibility } from "@/presentation/hooks/menuVisibility";

/**
 * Compose the permission layers for a single (user, menu) decision.
 *
 * ── Two modes, two authorities ────────────────────────────────────────────
 *
 * **API mode** (`VITE_USE_API=true`) — the SERVER decides.
 *
 * The server resolves the whole chain (role matrix + per-user overrides +
 * the unconfigured-role default) and returns a flat, already-decided list
 * from `GET /auth/me/menus`. This hook then applies only the global
 * kill-switch on top of that answer:
 *
 *     visible  ⇔  kill-switch ON  ∧  server says enabled
 *
 * The per-user override layer is deliberately **not** applied client-side in
 * API mode. The server already applied it, and re-applying it would let a
 * stale `localStorage` grant resurrect a menu the server denied — the
 * opposite of what the admin's "Deny" button promises.
 *
 * **Mock mode** — the LOCAL layers decide, exactly as before.
 *
 *     visible  ⇔  kill-switch ON ∧ role-matrix cell ∧ per-user override
 *
 * This is the three-layer composition in `menuVisibility.ts`, unchanged.
 *
 * ── Fallback rule ─────────────────────────────────────────────────────────
 * In API mode, when the server read is still pending or has failed, the
 * local mirror is consulted instead, and then the seed. That keeps the
 * sidebar usable while the server is unreachable. But once the server HAS
 * decided a key, the local store is never consulted for it.
 *
 * This is what resolves the old contradiction: `useRoleMenuMatrixApi` used
 * to treat the server as fully authoritative on one code path and merge the
 * server cells over the seed on another, so a role the server had never
 * configured produced an empty sidebar instead of the seeded defaults.
 *
 * ── The `role` argument ───────────────────────────────────────────────────
 * The role being rendered for. In API mode it is only used for the
 * superadmin short-circuit and for deciding whether a server answer applies
 * to this caller — the server has already resolved the role matrix, so the
 * client does not need the matrix itself.
 */
export function useEffectiveMenuVisibility(role?: Role) {
  const menuPerms = useMenuPermissions();
  const roleMatrix = useRoleMenuMatrix();
  const userOverrides = useUserMenuOverrides();

  // `useMyMenus` is always called (hooks cannot be conditional); the query
  // itself is gated on `isApiEnabled()` inside the hook.
  const apiEnabled = isApiEnabled();
  const myMenus = useMyMenus();

  // The server's resolved answer, as a key→enabled map.
  //
  // `undefined` means "the server has not decided yet" (pending, failed, or
  // API mode off). `null` means "the server has decided" — and then the
  // local store is not consulted for any key.
  const serverResolved = apiEnabled
    ? myMenus.data
      ? new Map(myMenus.data.menus.map((m) => [m.menuKey, m.enabled]))
      : null
    : undefined;

  return {
    /**
     * Effective visibility for a (user, menu) pair.
     * If `userId` is omitted, only the role + global layers are checked
     * (useful for sidebar rendering where the "current user" is implicit).
     */
    isEnabled: (key: MenuKey, forRole: Role, userId?: string): boolean => {
      // The global kill-switch is SPA-owned and stays first in the chain in
      // BOTH modes — it is a platform-wide "hide this menu everywhere", and
      // it wins over every other layer.
      const globalEnabled = menuPerms.isEnabled(key);

      // ── API mode ────────────────────────────────────────────────────────
      if (serverResolved !== undefined) {
        // Superadmins see everything; they are the platform operators who
        // configure the other roles.
        if (forRole === "superadmin") return globalEnabled;

        if (serverResolved !== null) {
          // The server has decided. Its answer is final — the local mirror
          // is NOT consulted, so a stale local grant cannot resurrect a
          // server-denied menu.
          //
          // A key the server never mentioned is treated as denied: the
          // server's resolved set is exhaustive (it intersects with the
          // catalogue), so an absent key means "not granted to this user".
          return globalEnabled && serverResolved.get(key) === true;
        }

        // The server read is pending or failed — fall back to the local
        // mirror so the sidebar stays usable offline.
        const roleEnabled = roleMatrix.isRoleEnabled(forRole, key);
        return resolveVisibility({
          role: forRole,
          globalEnabled,
          roleEnabled,
          override: userId ? userOverrides.getOverride(userId, key) : null,
        });
      }

      // ── Mock mode ───────────────────────────────────────────────────────
      const roleEnabled = roleMatrix.isRoleEnabled(forRole, key);
      return resolveVisibility({
        role: forRole,
        globalEnabled,
        roleEnabled,
        override: userId ? userOverrides.getOverride(userId, key) : null,
      });
    },

    /** Read-only access to the three underlying stores for UI use. */
    menuPerms,
    roleMatrix,
    userOverrides,
  };
}
