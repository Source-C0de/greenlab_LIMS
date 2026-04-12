import { createContext, useContext, useState, useEffect, ReactNode } from "react";

export type Role = "admin" | "lab_manager" | "analyst" | "client" | "accountant";
export type Language = "en" | "ar";
export type Theme = "light" | "dark";

interface AppContextType {
  currentRole: Role;
  setCurrentRole: (role: Role) => void;
  language: Language;
  setLanguage: (lang: Language) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [currentRole, setCurrentRole] = useState<Role>("admin");
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
