import { useEffect, useState } from "react";
import {
  ShieldCheck,
  Users,
  FlaskConical,
  Briefcase,
  Calculator,
  ClipboardList,
  type LucideIcon,
} from "lucide-react";
import {
  ROLE_REGISTRY,
  type ToggleableRole,
  type RoleEntry,
} from "@/infrastructure/mock/data/rolePermissions";

const STORAGE_KEY = "glims_role_registry_v1";
const CUSTOM_STORAGE_KEY = "glims_custom_roles_v1";

/** Editable role metadata. Slug is the key; everything else is editable. */
export interface RoleMeta {
  slug: string;
  labelEn: string;
  labelAr: string;
  descriptionEn: string;
  descriptionAr: string;
  iconName: string;
}

/**
 * Icon picker — admin can swap the icon shown next to a role in the
 * sidebar and on role cards. The lucide component reference is mapped
 * to a string for JSON-serializable localStorage, then resolved on read.
 */
export const ICON_PICKER: { name: string; labelEn: string; labelAr: string; icon: LucideIcon }[] = [
  { name: "ShieldCheck", labelEn: "Shield", labelAr: "درع", icon: ShieldCheck },
  { name: "Users", labelEn: "Users", labelAr: "مستخدمون", icon: Users },
  { name: "FlaskConical", labelEn: "Flask", labelAr: "قارورة", icon: FlaskConical },
  { name: "Briefcase", labelEn: "Briefcase", labelAr: "حقيبة", icon: Briefcase },
  { name: "Calculator", labelEn: "Calculator", labelAr: "آلة حاسبة", icon: Calculator },
  { name: "ClipboardList", labelEn: "Clipboard", labelAr: "قائمة", icon: ClipboardList },
];

const ICON_BY_NAME: Record<string, LucideIcon> = ICON_PICKER.reduce(
  (acc, entry) => {
    acc[entry.name] = entry.icon;
    return acc;
  },
  {} as Record<string, LucideIcon>,
);

/** Read the seed from the module-level `ROLE_REGISTRY` map. */
function buildDefaultMap(): Record<string, RoleMeta> {
  const map: Record<string, RoleMeta> = {};
  for (const [slug, entry] of ROLE_REGISTRY.entries()) {
    map[slug] = {
      slug,
      labelEn: entry.labelEn,
      labelAr: entry.labelAr,
      descriptionEn: entry.descriptionEn,
      descriptionAr: entry.descriptionAr,
      iconName: entry.iconName,
    };
  }
  return map;
}

/** Custom roles persisted in `glims_custom_roles_v1`. */
type CustomRoles = Record<string, RoleEntry>;

function loadCustomRoles(): CustomRoles {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(CUSTOM_STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as CustomRoles;
  } catch {
    return {};
  }
}

function persistCustomRoles(next: CustomRoles): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(CUSTOM_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // localStorage may be unavailable.
  }
}

type Serialized = Record<string, RoleMeta>;

function loadFromStorage(): Record<string, RoleMeta> {
  // The 6 seeds always come from ROLE_REGISTRY (rebuilt every time).
  const defaults = buildDefaultMap();
  // Custom roles layer — slug → entry, defaults to enabled.
  const customs = loadCustomRoles();
  for (const [slug, entry] of Object.entries(customs)) {
    defaults[slug] = {
      slug,
      labelEn: entry.labelEn,
      labelAr: entry.labelAr,
      descriptionEn: entry.descriptionEn,
      descriptionAr: entry.descriptionAr,
      iconName: entry.iconName,
    };
  }
  if (typeof window === "undefined") return defaults;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw) as Serialized;
    // Persisted edits win, but new fields get default values when a new
    // role is added in a future release.
    for (const role of Object.keys(parsed)) {
      if (parsed[role]) {
        defaults[role] = { ...defaults[role], ...parsed[role] };
      }
    }
    return defaults;
  } catch {
    return defaults;
  }
}

// Module-level singleton.
let state: Record<string, RoleMeta> = loadFromStorage();
const listeners = new Set<() => void>();

function emit(): void {
  for (const listener of listeners) listener();
}

export function useRoleRegistry() {
  const [, force] = useState(0);

  useEffect(() => {
    state = loadFromStorage();
    force((n) => n + 1);

    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY || e.key === CUSTOM_STORAGE_KEY) {
        state = loadFromStorage();
        emit();
      }
    };
    window.addEventListener("storage", onStorage);

    const cb = () => force((n) => n + 1);
    listeners.add(cb);
    return () => {
      listeners.delete(cb);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  const persist = (next: Record<string, RoleMeta>): void => {
    state = next;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // localStorage may be unavailable; keep in-memory state.
    }
    emit();
  };

  return {
    /** Read-only snapshot of one role's metadata. */
    getMeta: (role: ToggleableRole): RoleMeta | undefined =>
      state[role] ? { ...state[role] } : undefined,

    /** Resolve the icon component for a role (string → component). */
    getIcon: (role: ToggleableRole): LucideIcon =>
      ICON_BY_NAME[state[role]?.iconName ?? "ShieldCheck"] ?? ShieldCheck,

    /** All roles (seeds first, then custom — insertion order). */
    listAll: (): RoleMeta[] => Object.values(state),

    /** Update one role's editable fields. The slug is the key, never changes. */
    updateMeta: (role: ToggleableRole, patch: Partial<RoleMeta>): void => {
      if (!state[role]) return;
      persist({ ...state, [role]: { ...state[role], ...patch } });
    },

    /** Reset one role back to the seed. */
    resetMeta: (role: ToggleableRole): void => {
      const fresh = buildDefaultMap();
      persist({ ...state, [role]: fresh[role] });
    },

    /** Reset all roles to their seed values. */
    resetAll: (): void => persist(buildDefaultMap()),

    /**
     * Add a new custom role. Persists to `glims_custom_roles_v1` and
     * adds an entry to the registry. Throws on slug collision.
     */
    addRole: (entry: RoleEntry): void => {
      if (state[entry.slug]) {
        throw new Error(`Role already exists: ${entry.slug}`);
      }
      const customs = loadCustomRoles();
      customs[entry.slug] = entry;
      persistCustomRoles(customs);
      persist({ ...state, [entry.slug]: { ...entry } });
    },

    /** Hard-delete a custom role (removes from `glims_custom_roles_v1` + registry). */
    deleteRole: (slug: string): void => {
      const customs = loadCustomRoles();
      if (customs[slug]) {
        delete customs[slug];
        persistCustomRoles(customs);
      }
      const next = { ...state };
      delete next[slug];
      persist(next);
    },
  };
}
