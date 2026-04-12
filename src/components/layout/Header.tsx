import { useTheme } from "next-themes";
import { Moon, Sun, Bell, Search, Globe, Menu } from "lucide-react";
import { useAppContext } from "@/context/AppContext";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { RoleSwitcher } from "@/components/shared/RoleSwitcher";
import { NotificationBell } from "./NotificationBell";

interface HeaderProps {
  toggleSidebar: () => void;
}

export function Header({ toggleSidebar }: HeaderProps) {
  const { theme, setTheme } = useTheme();
  const { language, setLanguage, currentRole } = useAppContext();

  const isRtl = language === "ar";

  return (
    <header className="h-16 border-b bg-card flex items-center justify-between px-4 sticky top-0 z-30">
      <div className="flex items-center gap-4 flex-1">
        <Button variant="ghost" size="icon" onClick={toggleSidebar} className="md:hidden">
          <Menu className="h-5 w-5" />
        </Button>
        <div className="relative w-full max-w-md hidden md:flex items-center">
          <Search className={`absolute h-4 w-4 text-muted-foreground ${isRtl ? 'right-3' : 'left-3'}`} />
          <Input 
            placeholder={isRtl ? "البحث في المختبر..." : "Search laboratory..."} 
            className={`bg-muted/50 ${isRtl ? 'pr-9' : 'pl-9'}`}
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <RoleSwitcher />

        <Button
          variant="ghost"
          size="icon"
          onClick={() => setLanguage(language === "en" ? "ar" : "en")}
          title={isRtl ? "Switch to English" : "التبديل للعربية"}
        >
          <Globe className="h-5 w-5" />
          <span className="sr-only">Toggle language</span>
        </Button>

        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(theme === "light" ? "dark" : "light")}
        >
          <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Toggle theme</span>
        </Button>

        <NotificationBell />

        <div className="h-8 w-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-medium text-sm ml-2">
          {currentRole.charAt(0).toUpperCase()}
        </div>
      </div>
    </header>
  );
}
