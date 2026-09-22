import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { isApiEnabled } from "@/lib/api";

export type Role = "superadmin" | "admin" | "lab_manager" | "analyst" | "client" | "accountant" | "receptionist";
export type Language = "en" | "ar";
export type Theme = "light" | "dark";

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
 */
const ROLE_OVERRIDE_KEY = "glims_role_override";

function readRoleOverride(): Role | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(ROLE_OVERRIDE_KEY);
    if (!raw) return null;
    const valid: Role[] = ["superadmin", "admin", "lab_manager", "analyst", "client", "accountant", "receptionist"];
    return valid.includes(raw as Role) ? (raw as Role) : null;
  } catch {
    return null;
  }
}

function writeRoleOverride(role: Role | null): void {
  if (typeof window === "undefined") return;
  try {
    if (role === null) window.localStorage.removeItem(ROLE_OVERRIDE_KEY);
    else window.localStorage.setItem(ROLE_OVERRIDE_KEY, role);
  } catch {
    // ignore
  }
}

export function AppProvider({ children }: { children: ReactNode }) {
  // In API mode: default to "admin" until AuthProvider hydrates the real role.
  // In mock mode: prefer the persisted override so dev role changes survive refresh.
  const [currentRole, setCurrentRoleState] = useState<Role>(() => {
    return readRoleOverride() ?? "admin";
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
    if (isApiEnabled()) {
      // In API mode the role is owned by the backend. Logout+login to change it.
      // eslint-disable-next-line no-console
      console.warn(
        "[greenlablims] setCurrentRole is a no-op in API mode — log out and log in as a different user.",
      );
      return;
    }
    writeRoleOverride(role);
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
