import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import type { Role, Language, Theme } from "@/shared/lib/types";
import {
  currentMockRole,
  setMockRole,
} from "@/infrastructure/mock/repositories/authSession";

// Re-exported for the existing `from "@/presentation/providers/AppContext"`
// call sites. The canonical home is `@/shared/lib/types` — non-presentation
// layers must not reach into `presentation/` just to name a type.
export type { Role, Language, Theme };

interface AppContextType {
  currentRole: Role;
  setCurrentRole: (role: Role) => void;
  language: Language;
  setLanguage: (lang: Language) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

/**
 * Local role override — survives a refresh in mock-only dev so the sandbox
 * permissions panel (superadmin tooling) can change roles without losing them.
 * In API mode the AuthProvider drives `setCurrentRole` directly and the
 * override is bypassed.
 *
 * PHASE 4: the localStorage key and its read/write helpers moved to
 * `infrastructure/mock/repositories/authSession.ts`, which owns the mock auth
 * session and needs the same key. Both modules touching
 * `glims_role_override` independently would let them drift — the login screen
 * would resolve one role while the sidebar rendered another. This provider now
 * reuses the adapter's functions rather than re-implementing them.
 */
export function AppProvider({ children }: { children: ReactNode }) {
  // In API mode: default to "admin" until AuthProvider hydrates the real role.
  // In mock mode: prefer the persisted override so dev role changes survive refresh.
  const [currentRole, setCurrentRoleState] = useState<Role>(() => {
    return currentMockRole();
  });
  const [language, setLanguage] = useState<Language>("en");

  useEffect(() => {
    const root = document.documentElement;
    if (language === "ar") {
      root.setAttribute("dir", "rtl");
      root.classList.add("rtl");
    } else {
      root.setAttribute("dir", "ltr");
      root.classList.remove("rtl");
    }
  }, [language]);

  const setCurrentRole = (role: Role) => {
    setCurrentRoleState(role);
    // Persisted through the mock adapter so the sidebar and the active
    // session stay in lockstep. In API mode the session's role is the
    // source of truth, but the local override keeps the sidebar readable
    // when a session is anonymous.
    setMockRole(role);
  };

  return (
    <AppContext.Provider
      value={{
        currentRole,
        setCurrentRole,
        language,
        setLanguage,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error("useAppContext must be used within an AppProvider");
  }
  return context;
}
