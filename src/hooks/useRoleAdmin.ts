import { useRoleRegistry } from "@/hooks/useRoleRegistry";
import { useRolePermissions } from "@/hooks/useRolePermissions";
import { useRoleMenuMatrix } from "@/hooks/useRoleMenuMatrix";
import {
  FIXED_ROLE_SLUGS,
  type RoleEntry,
} from "@/mock-data/rolePermissions";

/** Slug validation: snake_case, [a-z0-9_]{2,32}. */
export const SLUG_PATTERN = /^[a-z][a-z0-9_]{1,31}$/;

/** Errors returned by `useRoleAdmin().validateCreate()`. */
export type CreateRoleError =
  | "slug-required"
  | "slug-invalid"
  | "slug-collision-fixed"
  | "slug-collision-existing"
  | "label-required"
  | "label-ar-required"
  | "description-required"
  | "description-ar-required"
  | "icon-required";

export interface CreateRoleInput {
  slug: string;
  labelEn: string;
  labelAr: string;
  descriptionEn: string;
  descriptionAr: string;
  iconName: string;
}

/**
 * Top-level admin operations for roles: create a custom role,
 * archive (soft-disable), hard-delete. Wraps the lower-level hooks
 * (`useRoleRegistry`, `useRolePermissions`, `useRoleMenuMatrix`).
 *
 * The 6 fixed roles can be archived (the `isActive` flip on
 * `useRolePermissions`) but cannot be hard-deleted and cannot be
 * edited back into a different slug — their slugs are immutable.
 */
export function useRoleAdmin() {
  const registry = useRoleRegistry();
  const rolePerms = useRolePermissions();
  const matrix = useRoleMenuMatrix();

  function isFixed(slug: string): boolean {
    return (FIXED_ROLE_SLUGS as readonly string[]).includes(slug);
  }

  /**
   * Static validation — does not throw. Returns the first error, or
   * `null` if the input passes. Used by the Add Role form for live
   * validation.
   */
  function validateCreate(input: CreateRoleInput): CreateRoleError | null {
    const slug = input.slug.trim();
    if (slug.length === 0) return "slug-required";
    if (!SLUG_PATTERN.test(slug)) return "slug-invalid";
    if ((FIXED_ROLE_SLUGS as readonly string[]).includes(slug))
      return "slug-collision-fixed";
    if (registry.getMeta(slug)) return "slug-collision-existing";
    if (input.labelEn.trim().length < 2) return "label-required";
    if (input.labelAr.trim().length < 2) return "label-ar-required";
    if (input.descriptionEn.trim().length < 4) return "description-required";
    if (input.descriptionAr.trim().length < 4) return "description-ar-required";
    if (!input.iconName) return "icon-required";
    return null;
  }

  /**
   * Validate and persist a new custom role. Returns the created entry
   * on success, or throws an `Error` whose `.message` is one of the
   * `CreateRoleError` codes.
   */
  function create(input: CreateRoleInput): RoleEntry {
    const err = validateCreate(input);
    if (err) throw new Error(err);
    const entry: RoleEntry = {
      slug: input.slug.trim(),
      labelEn: input.labelEn.trim(),
      labelAr: input.labelAr.trim(),
      descriptionEn: input.descriptionEn.trim(),
      descriptionAr: input.descriptionAr.trim(),
      iconName: input.iconName,
    };
    registry.addRole(entry);
    rolePerms.addRole(entry.slug, true);
    matrix.setRole(entry.slug, []);
    return entry;
  }

  /**
   * Archive a role (flip isActive). Works for both fixed and custom
   * roles — they all hide from the login role-picker and the role
   * switcher when archived.
   */
  function archive(slug: string): void {
    if (rolePerms.isEnabled(slug)) rolePerms.toggle(slug);
  }

  /** Restore an archived role. */
  function restore(slug: string): void {
    if (!rolePerms.isEnabled(slug)) rolePerms.toggle(slug);
  }

  /**
   * Hard-delete a custom role. Throws if `slug` is one of the 6
   * fixed roles — they can only be archived.
   */
  function hardDelete(slug: string): void {
    if (isFixed(slug)) {
      throw new Error("cannot-delete-fixed-role");
    }
    registry.deleteRole(slug);
    rolePerms.removeRole(slug);
    matrix.resetRole(slug);
  }

  return {
    /** Validate without throwing — for live form feedback. */
    validateCreate,

    /** Create a custom role. Throws `CreateRoleError` on failure. */
    create,

    /** Archive (isActive = false). Reversible via `restore`. */
    archive,

    /** Restore (isActive = true). */
    restore,

    /** Hard-delete a custom role. Throws on fixed-role slugs. */
    hardDelete,

    /** True if slug is one of the 6 fixed toggleable roles. */
    isFixed,

    /** All roles (seeds first, then custom). */
    list: (): RoleEntry[] => {
      // Re-derive from registry so labels/icons reflect edits too.
      return registry
        .listAll()
        .map((m) => ({
          slug: m.slug,
          labelEn: m.labelEn,
          labelAr: m.labelAr,
          descriptionEn: m.descriptionEn,
          descriptionAr: m.descriptionAr,
          iconName: m.iconName,
        }));
    },

    /** Whether a role is currently archived. */
    isArchived: (slug: string): boolean => !rolePerms.isEnabled(slug),
  };
}