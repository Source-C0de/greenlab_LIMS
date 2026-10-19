import { type MenuKey } from "@/mock-data/menuPermissions";
import { type Role } from "@/context/AppContext";
import { useMenuPermissions } from "@/hooks/useMenuPermissions";
import { useRoleMenuMatrix } from "@/hooks/useRoleMenuMatrix";
import { useUserMenuOverrides } from "@/hooks/useUserMenuOverrides";

/**
 * Compose the three permission layers for a single (user, menu) decision:
 *
 *   effective = globalKill(key)        — flat kill-switch (superadmin)
 *            && roleEnabled(role, key) — default role × menu matrix
 *            && (override ?? true)     — per-user delta (grant / deny / inherit)
 *
 * Each of the three underlying hooks owns its own module-singleton +
 * `force`-rerender. Calling them in this composite makes us re-render
 * whenever any of them changes. No new context, no new listener set.
 */
export function useEffectiveMenuVisibility() {
  const menuPerms = useMenuPermissions();
  const roleMatrix = useRoleMenuMatrix();
  const userOverrides = useUserMenuOverrides();

  return {
    /**
     * Effective visibility for a (user, menu) pair.
     * If `userId` is omitted, only the role + global layers are checked
     * (useful for sidebar rendering where the "current user" is implicit).
     */
    isEnabled: (key: MenuKey, role: Role, userId?: string): boolean => {
      if (!menuPerms.isEnabled(key)) return false;
      // `superadmin` bypasses role + override checks — they see everything
      // (matches the Sidebar's existing early-return at line 84-89).
      if (role === "superadmin") return true;
      if (!roleMatrix.isRoleEnabled(role, key)) return false;
      if (userId) {
        const override = userOverrides.getOverride(userId, key);
        if (override === "deny") return false;
        // "grant" or absent: pass through
      }
      return true;
    },

    /** Read-only access to the three underlying stores for UI use. */
    menuPerms,
    roleMatrix,
    userOverrides,
  };
}
