import { useEffect, useState } from "react";
import { MENU_REGISTRY, type MenuKey } from "@/mock-data/menuPermissions";

const STORAGE_KEY = "glims_menu_permissions_v1";

type PermissionsMap = Record<MenuKey, boolean>;

const ALL_KEYS = Object.keys(MENU_REGISTRY) as MenuKey[];

function buildDefaultMap(): PermissionsMap {
  const map = {} as PermissionsMap;
  for (const key of ALL_KEYS) {
    map[key] = true;
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

// Module-level singleton — shared across every consumer of useMenuPermissions.
let state: PermissionsMap = loadFromStorage();
const listeners = new Set<() => void>();

function emit(): void {
  for (const listener of listeners) listener();
}

export function useMenuPermissions() {
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
    isEnabled: (key: MenuKey): boolean => state[key] !== false,
    toggle: (key: MenuKey): void =>
      persist({ ...state, [key]: !state[key] }),
    setAll: (value: boolean): void => {
      const next = {} as PermissionsMap;
      for (const key of ALL_KEYS) next[key] = value;
      persist(next);
    },
    reset: (): void => persist(buildDefaultMap()),
    isAllEnabled: (): boolean => ALL_KEYS.every((k) => state[k] !== false),
    isAllDisabled: (): boolean => ALL_KEYS.every((k) => state[k] === false),
  };
}