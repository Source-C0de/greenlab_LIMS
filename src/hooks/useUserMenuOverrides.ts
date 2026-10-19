import { useEffect, useState } from "react";
import { type MenuKey } from "@/mock-data/menuPermissions";
import {
  mockUserMenuOverrides,
  type OverrideEffect,
} from "@/mock-data/user-menu-overrides";

const STORAGE_KEY = "glims_user_menu_overrides_v1";

/** Per-user override map. Absent keys = inherit from role default. */
type OverridesMap = Record<string, Partial<Record<MenuKey, OverrideEffect>>>;

/** Build the seed from `mockUserMenuOverrides`. */
function buildDefaultMap(): OverridesMap {
  const map: OverridesMap = {};
  for (const row of mockUserMenuOverrides) {
    if (!map[row.userId]) map[row.userId] = {};
    map[row.userId][row.menuKey] = row.effect;
  }
  return map;
}

type Serialized = Record<string, Record<string, OverrideEffect>>;

function loadFromStorage(): OverridesMap {
  if (typeof window === "undefined") return buildDefaultMap();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return buildDefaultMap();
    return JSON.parse(raw) as OverridesMap;
  } catch {
    return buildDefaultMap();
  }
}

// Module-level singleton.
let state: OverridesMap = loadFromStorage();
const listeners = new Set<() => void>();

function emit(): void {
  for (const listener of listeners) listener();
}

export function useUserMenuOverrides() {
  const [, force] = useState(0);

  useEffect(() => {
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

  const persist = (next: OverridesMap): void => {
    state = next;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // localStorage may be unavailable; keep in-memory state.
    }
    emit();
  };

  return {
    /** Returns `"grant" | "deny"` for an explicit override, or `null` to inherit. */
    getOverride: (userId: string, key: MenuKey): OverrideEffect | null => {
      return state[userId]?.[key] ?? null;
    },

    /**
     * Set an explicit override (`"grant" | "deny"`) or clear it back to
     * the role default by passing `null`.
     */
    setOverride: (
      userId: string,
      key: MenuKey,
      effect: OverrideEffect | null,
    ): void => {
      const next: OverridesMap = { ...state, [userId]: { ...(state[userId] ?? {}) } };
      if (effect === null) {
        delete next[userId][key];
        if (Object.keys(next[userId]).length === 0) delete next[userId];
      } else {
        next[userId][key] = effect;
      }
      persist(next);
    },

    /** Reset every override for one user back to the role default. */
    clearForUser: (userId: string): void => {
      const next: OverridesMap = { ...state };
      delete next[userId];
      persist(next);
    },

    /** Read-only snapshot of all overrides for one user. */
    getUserOverrides: (
      userId: string,
    ): Partial<Record<MenuKey, OverrideEffect>> => {
      return { ...(state[userId] ?? {}) };
    },
  };
}
