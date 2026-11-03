import { useEffect, useState } from "react";
import {
  MENU_KEY_LIST,
  isMenuKey,
  type MenuKey,
} from "@/infrastructure/mock/data/menuPermissions";
import {
  SEED_BY_ROLE,
  mockRoleMenuPermissions,
} from "@/infrastructure/mock/data/role-menu-permissions";
import { ROLE_MENU_MATRIX_STORAGE_KEY } from "@/shared/lib/menuStorageKeys";

/**
 * Storage key version 2.
 *
 * v1 stored whatever the "Assign Menus" modal was rendering at the time —
 * the 10-key admin catalogue (`accounting`, `invoices`, `users`, `roles`,
 * `test_parameters`) — which is NOT the vocabulary the sidebar reads. Those
 * rows are not reinterpretable: `accounting` and `accounting_dashboard` are
 * different menus. So the key is bumped and v1 is left on disk, unread.
 * A fresh v2 starts from the seed.
 */
const STORAGE_KEY = ROLE_MENU_MATRIX_STORAGE_KEY;

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

/**
 * Drop any key that is not part of the current registry.
 *
 * Guards against a persisted row written by an older build (or hand-edited
 * in DevTools) carrying keys the sidebar will never ask about.
 */
function keepKnownKeys(keys: string[]): MenuKey[] {
  return keys.filter(isMenuKey);
}

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
      if (!Array.isArray(keys)) continue;
      const known = keepKnownKeys(keys);
      // A row whose keys are all unknown is stale garbage (e.g. a v1-era
      // 10-key admin row). Fall back to the seed rather than blanking the
      // role's sidebar.
      if (known.length === 0 && keys.length > 0) {
        const seed = SEED_BY_ROLE[role];
        if (seed) defaults[role] = new Set(seed);
        continue;
      }
      defaults[role] = new Set(known);
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
    /**
     * Is this key enabled for this role?
     *
     * A role with no persisted row falls back to its seed set, so a
     * newly-created custom role is usable before the admin has opened
     * "Assign Menus" for it. A role with a persisted but EMPTY row is
     * honoured as-is — that is the "assign no menus" case, and it must
     * stay empty rather than silently reverting to the seed.
     */
    isRoleEnabled: (role: string, key: MenuKey): boolean => {
      const row = state[role];
      if (row) return row.has(key);
      const seed = SEED_BY_ROLE[role];
      return seed ? seed.includes(key) : false;
    },

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

    /** All menu keys in declaration order — convenience for the matrix UI. */
    allMenuKeys: (): MenuKey[] => [...MENU_KEY_LIST],

    /** Read-only snapshot of one role's enable set (for the matrix UI). */
    getRoleKeys: (role: string): MenuKey[] => {
      const row = state[role];
      if (row) return Array.from(row);
      const seed = SEED_BY_ROLE[role];
      return seed ? [...seed] : [];
    },

    /** All role slugs that have a row in the matrix (custom + seed). */
    listRoles: (): string[] => Object.keys(state),
  };
}
