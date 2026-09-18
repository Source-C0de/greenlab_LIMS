import { useEffect, useState } from "react";
import {
  ALL_TOGGLEABLE_ROLES,
  type ToggleableRole,
} from "@/mock-data/rolePermissions";

const STORAGE_KEY = "glims_role_permissions_v1";

type PermissionsMap = Record<ToggleableRole, boolean>;

function buildDefaultMap(): PermissionsMap {
  const map = {} as PermissionsMap;
  for (const role of ALL_TOGGLEABLE_ROLES) {
    map[role] = true;
  }
  return map;
}

function loadFromStorage(): PermissionsMap {
  if (typeof window === "undefined") return buildDefaultMap();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return buildDefaultMap();
    const parsed = JSON.parse(raw) as Partial<PermissionsMap>;
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
    isEnabled: (role: ToggleableRole): boolean => state[role] !== false,
    toggle: (role: ToggleableRole): void =>
      persist({ ...state, [role]: !state[role] }),
    setAll: (value: boolean): void => {
      const next = {} as PermissionsMap;
      for (const role of ALL_TOGGLEABLE_ROLES) next[role] = value;
      persist(next);
    },
    reset: (): void => persist(buildDefaultMap()),
    isAllEnabled: (): boolean =>
      ALL_TOGGLEABLE_ROLES.every((r) => state[r] !== false),
    isAllDisabled: (): boolean =>
      ALL_TOGGLEABLE_ROLES.every((r) => state[r] === false),
  };
}