/**
 * Identity & access domain model.
 *
 * The current implementation joins FOUR separate tables ad-hoc at every read
 * site (`menuPermissions`, `rolePermissions`, `role-menu-permissions`,
 * `user-menu-overrides`), which is how per-role menu visibility drifts.
 * Declaring the join result as a domain concept — a resolved permission set —
 * is what makes the rule testable and the tables swappable.
 *
 * KNOWN ISSUE, recorded not fixed: `menuPermissions.ts` imports `lucide-react`
 * icon components into what should be pure permission DATA. Icons are a
 * presentation concern and belong in `presentation/`. The `MenuEntry` below
 * models this correctly (`iconName: string`, not a component); migrating the
 * registry is Phase 6 work.
 */
import type { Role } from "@/shared/lib/types";

export type UserStatus = "active" | "trial" | "suspended" | "disabled";

export interface User {
  readonly id: string;
  readonly email: string;
  readonly username: string;
  readonly fullNameEn: string;
  readonly fullNameAr: string;
  readonly role: Role;
  readonly status: UserStatus;
  readonly lastLoginAt?: string;
  readonly createdAt: string;
}

// ---------------------------------------------------------------------------
// Menu + permissions
// ---------------------------------------------------------------------------

/** Stable identifier for a nav item, e.g. "samples" | "invoices". */
export type MenuKey = string;

export type MenuGroup = "lab" | "client" | "accounting" | "admin";

export interface LocalisedText {
  readonly en: string;
  readonly ar: string;
}

/**
 * A navigable item.
 *
 * `iconName` is a STRING, deliberately — not a React component. The current
 * registry holds real components, which is the layering violation noted above.
 */
export interface MenuEntry {
  readonly key: MenuKey;
  readonly group: MenuGroup;
  readonly label: LocalisedText;
  readonly path: string;
  readonly iconName: string;
  /** Roles permitted to see this item at all, before per-user overrides. */
  readonly allowedRoles: readonly Role[];
}

/** Per-user override of a role default. `null` means "inherit the role". */
export type OverrideEffect = "grant" | "deny";

export type UserOverrides = Readonly<Partial<Record<MenuKey, OverrideEffect>>>;

export interface RoleEntry {
  readonly slug: string;
  readonly label: LocalisedText;
  readonly isFixed: boolean;
  /** Menu keys enabled for this role by default. */
  readonly enabledKeys: readonly MenuKey[];
}

// ---------------------------------------------------------------------------
// Resolved permissions — the joined result, computed once
// ---------------------------------------------------------------------------

/**
 * The effective menu set for one user, after joining role defaults with
 * per-user overrides. Computing this in the domain (rather than ad-hoc at each
 * call site) is the point of the identity domain.
 */
export interface ResolvedPermissions {
  readonly userId: string;
  readonly role: Role;
  readonly visibleKeys: ReadonlySet<MenuKey>;
  /** Keys the user explicitly overrides — useful for the admin "override" UI. */
  readonly overriddenKeys: ReadonlySet<MenuKey>;
}

/**
 * Resolve a user's effective menu keys.
 *
 * Precedence: user override wins, then role default, then denied.
 * An explicit `deny` beats a role-level grant.
 */
export function resolvePermissions(
  roleEntry: Pick<RoleEntry, "enabledKeys">,
  overrides: UserOverrides = {},
): { visibleKeys: Set<MenuKey>; overriddenKeys: Set<MenuKey> } {
  const visibleKeys = new Set<MenuKey>(roleEntry.enabledKeys);
  const overriddenKeys = new Set<MenuKey>();

  for (const [key, effect] of Object.entries(overrides)) {
    if (effect === undefined) continue;
    overriddenKeys.add(key);
    if (effect === "grant") visibleKeys.add(key);
    else visibleKeys.delete(key);
  }

  return { visibleKeys, overriddenKeys };
}