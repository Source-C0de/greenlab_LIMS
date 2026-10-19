import { useEffect, useState } from "react";
import { type MenuKey } from "@/mock-data/menuPermissions";
import {
  mockRoleMenuPermissions,
  ALL_MENU_KEYS,
} from "@/mock-data/role-menu-permissions";

const STORAGE_KEY = "glims_role_menu_matrix_v1";

/**
 * Map: role → Set of menu keys that role is allowed to see by default.
 *
 * Keys are open-ended strings — admin can create new role slugs at
 * runtime via `useRoleAdmin`. The matrix is keyed by the same slug
 * the user-management flows use.
 */
type MatrixMap = Record<string, Set<MenuKey>>;

/** Build the seed from `mockRoleMenuPermissions` (sparse, enabled cells only). */
function buildDefaultMap(): MatrixMap {
  const map: MatrixMap = {};
  for (const cell of mockRoleMenuPermissions) {
    if (cell.enabled) {
      if (!map[cell.role]) map[cell.role] = new Set<MenuKey>();
      map[cell.role].add(cell.menuKey);
    }
  }
  return map;
}

/** Serialize/deserialize as `Record<role, MenuKey[]>` — JSON-friendly. */
type Serialized = Record<string, MenuKey[]>;

function loadFromStorage(): MatrixMap {
  if (typeof window === "undefined") return buildDefaultMap();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const defaults = buildDefaultMap();
    if (!raw) return defaults;
    const parsed = JSON.parse(raw) as Serialized;
    // Merge: persisted edits win for any role present in storage.
    // Custom roles (not in the seed) are preserved as-is.
    for (const role of Object.keys(parsed)) {
      const keys = parsed[role];
      if (Array.isArray(keys)) defaults[role] = new Set(keys);
    }
    return defaults;
  } catch {
    return buildDefaultMap();
  }
}

// Module-level singleton — shared across every consumer of useRoleMenuMatrix.
let state: MatrixMap = loadFromStorage();
const listeners = new Set<() => void>();

function emit(): void {
  for (const listener of listeners) listener();
}

export function useRoleMenuMatrix() {
  const [, force] = useState(0);

  useEffect(() => {
    // Re-read storage on mount in case another tab updated it.
    state = loadFromStorage();
    force((n) => n + 1);

    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) {
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

  const persist = (next: MatrixMap): void => {
    state = next;
    try {
      const serializable: Serialized = {};
      for (const role of Object.keys(state)) {
        serializable[role] = Array.from(state[role]);
      }
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(serializable));
    } catch {
      // localStorage may be unavailable (private mode, quota); keep in-memory state.
    }
    emit();
  };

  return {
    isRoleEnabled: (role: string, key: MenuKey): boolean =>
      state[role]?.has(key) ?? false,

    toggle: (role: string, key: MenuKey): void => {
      const next: MatrixMap = { ...state, [role]: new Set(state[role] ?? []) };
      if (next[role].has(key)) next[role].delete(key);
      else next[role].add(key);
      persist(next);
    },

    setRole: (role: string, keys: MenuKey[]): void => {
      const next: MatrixMap = { ...state, [role]: new Set(keys) };
      persist(next);
    },

    resetRole: (role: string): void => {
      const fresh = buildDefaultMap();
      const next: MatrixMap = { ...state };
      if (fresh[role]) {
        next[role] = fresh[role];
      } else {
        delete next[role];
      }
      persist(next);
    },

    resetAll: (): void => persist(buildDefaultMap()),

    /** All 32 menu keys in declaration order — convenience for the matrix UI. */
    allMenuKeys: (): MenuKey[] => [...ALL_MENU_KEYS],

    /** Read-only snapshot of one role's enable set (for the matrix UI). */
    getRoleKeys: (role: string): MenuKey[] => Array.from(state[role] ?? []),

    /** All role slugs that have a row in the matrix (custom + seed). */
    listRoles: (): string[] => Object.keys(state),
  };
}
