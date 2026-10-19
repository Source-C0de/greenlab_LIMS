import { useEffect, useState } from "react";

const STORAGE_KEY = "glims_role_permissions_v1";

/**
 * Role → enabled? map. Keys are open-ended strings — the 6 fixed
 * toggleable roles are seeded; custom roles created via `useRoleAdmin`
 * are added on the fly.
 */
type PermissionsMap = Record<string, boolean>;

/** Slugs that should be enabled by default — mirrors the 6 fixed toggleable roles. */
const SEED_SLUGS = [
  "admin",
  "lab_manager",
  "analyst",
  "client",
  "accountant",
  "receptionist",
];

function buildDefaultMap(): PermissionsMap {
  const map: PermissionsMap = {};
  for (const slug of SEED_SLUGS) map[slug] = true;
  return map;
}

function loadFromStorage(): PermissionsMap {
  if (typeof window === "undefined") return buildDefaultMap();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return buildDefaultMap();
    const parsed = JSON.parse(raw) as PermissionsMap;
    return { ...buildDefaultMap(), ...parsed };
  } catch {
    return buildDefaultMap();
  }
}

// Module-level singleton — shared across every consumer.
let state: PermissionsMap = loadFromStorage();
const listeners = new Set<() => void>();

function emit(): void {
  for (const listener of listeners) listener();
}

export function useRolePermissions() {
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

  const persist = (next: PermissionsMap): void => {
    state = next;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // localStorage may be unavailable (private mode, quota); keep in-memory state.
    }
    emit();
  };

  return {
    isEnabled: (role: string): boolean => state[role] !== false,
    toggle: (role: string): void =>
      persist({ ...state, [role]: !state[role] }),
    setAll: (value: boolean): void => {
      const next: PermissionsMap = {};
      for (const role of Object.keys(state)) next[role] = value;
      persist(next);
    },
    reset: (): void => persist(buildDefaultMap()),
    isAllEnabled: (): boolean =>
      Object.values(state).every((v) => v !== false),
    isAllDisabled: (): boolean =>
      Object.values(state).every((v) => v === false),

    /** Add a new role to the map (called by `useRoleAdmin.create`). */
    addRole: (role: string, enabled: boolean = true): void =>
      persist({ ...state, [role]: enabled }),

    /** Remove a role entirely (called by `useRoleAdmin.archive/hardDelete`). */
    removeRole: (role: string): void => {
      const next: PermissionsMap = { ...state };
      delete next[role];
      persist(next);
    },

    /** All slugs currently in the map. */
    listRoles: (): string[] => Object.keys(state),
  };
}
