import type { OverrideEffect } from "@/infrastructure/mock/data/user-menu-overrides";
import type { Role } from "@/shared/lib/types";

/**
 * The effective-visibility decision, extracted from React so it can be
 * unit-tested without a DOM.
 *
 * Precedence, highest first:
 *
 *   1. global kill-switch off    → false  (a platform-wide "hide this
 *                                           menu everywhere" wins over
 *                                           every other layer)
 *   2. role === "superadmin"     → true   (superadmins see everything;
 *                                           they are the platform
 *                                           operators who configure the
 *                                           other roles)
 *   3. per-user override "deny"  → false  (an explicit per-user hide)
 *   4. per-user override "grant" → true   (an explicit per-user show —
 *                                           this RESCUES a menu the role
 *                                           matrix denies, which is what
 *                                           the "Grant" button promises)
 *   5. role matrix enabled       → true   (the role's default)
 *   6. otherwise                 → false  (deny by default)
 *
 * The old implementation honoured only "deny" at step 3 and let "grant"
 * fall through to the role check, which made the per-user Grant button a
 * no-op whenever the role matrix denied the key. The seed rows in
 * `infrastructure/mock/data/user-menu-overrides.ts` depend on the correct
 * behaviour — `U003` (lab_manager) is granted `accounting_dashboard`, a key
 * that is absent from lab_manager's role seed, so only a working "grant"
 * makes it visible.
 */
export interface VisibilityInput {
  /** The role the decision is being made for. */
  role: Role;
  /** The platform-wide kill-switch state for this key. */
  globalEnabled: boolean;
  /** Whether the role × menu matrix enables this key for this role. */
  roleEnabled: boolean;
  /** The per-user override, or `null` to inherit from the role default. */
  override: OverrideEffect | null;
}

export function resolveVisibility({
  role,
  globalEnabled,
  roleEnabled,
  override,
}: VisibilityInput): boolean {
  if (!globalEnabled) return false;
  if (role === "superadmin") return true;
  if (override === "deny") return false;
  if (override === "grant") return true;
  return roleEnabled;
}
