import { useTheme } from "next-themes";
import {
  Moon,
  Sun,
  Bell,
  Search,
  Globe,
  Menu,
  Loader2,
  CheckCircle2,
  XCircle,
  LogOut,
} from "lucide-react";
import { useLocation } from "wouter";
import { useAppContext } from "@/presentation/providers/AppContext";
import { useAuth } from "@/presentation/providers/AuthContext";
import { Button } from "@/shared/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";
import { Input } from "@/shared/ui/input";
import { Badge } from "@/shared/ui/badge";
import { RoleAvatar } from "@/presentation/components/auth/RoleAvatar";
import { NotificationBell } from "./NotificationBell";
import { isApiEnabled, ApiError } from "@/infrastructure/api/api";
import { useHealth } from "@/infrastructure/api/tanstack-queries";

interface HeaderProps {
  toggleSidebar: () => void;
}

/**
 * Tiny status pill that surfaces the dev/backend API connection.
 * Renders nothing when VITE_USE_API is unset — zero visual impact by default.
 */
function ApiStatusBadge() {
  const { language } = useAppContext();
  const isRtl = language === "ar";
  const t = (en: string, ar: string) => (isRtl ? ar : en);

  if (!isApiEnabled()) return null;

  const { isLoading, isError, error, data } = useHealth();

  const labelEn = "API";
  const labelAr = "API";

  let content: JSX.Element;
  if (isLoading) {
    content = (
      <>
        <Loader2 className="h-3 w-3 me-1 animate-spin" />
        <span>{t(`${labelEn}: …`, `${labelAr}: …`)}</span>
      </>
    );
  } else if (isError) {
    const status = error instanceof ApiError ? error.status : "?";
    content = (
      <>
        <XCircle className="h-3 w-3 me-1" />
        <span>{t(`${labelEn}: ${status}`, `${labelAr}: ${status}`)}</span>
      </>
    );
  } else {
    const status = data?.status ?? "ok";
    content = (
      <>
        <CheckCircle2 className="h-3 w-3 me-1" />
        <span>{t(`${labelEn}: ${status}`, `${labelAr}: ${status}`)}</span>
      </>
    );
  }

  const variant = isError ? "destructive" : isLoading ? "secondary" : "default";

  return (
    <Badge
      variant={variant}
      className="font-mono text-[10px] uppercase tracking-wide"
      title={isRtl ? "حالة الاتصال بالخادم" : "Backend connection status"}
    >
      {content}
    </Badge>
  );
}

export function Header({ toggleSidebar }: HeaderProps) {
  const { theme, setTheme } = useTheme();
  const { language, setLanguage, currentRole } = useAppContext();
  const { user, logout } = useAuth();
  // The header only needs to *navigate*, never to read the current path.
  const [, setLocation] = useLocation();

  const isRtl = language === "ar";

  /**
   * Sign out and return to the login screen.
   *
   * Moved here from `Sidebar.tsx` — logout belongs with the other global
   * actions (language, theme, notifications), all of which live in the
   * header. The sandbox-key cleanup below is deliberate and must not be
   * dropped: it stops the next user from inheriting the previous user's
   * permission toggles.
   */
  const handleLogout = async () => {
    try {
      window.localStorage.removeItem("glims_role_permissions_v1");
      window.localStorage.removeItem("glims_menu_permissions_v1");
      window.localStorage.removeItem("glims_role_menu_matrix_v1");
      window.localStorage.removeItem("glims_user_menu_overrides_v1");
    } catch {
      // ignore — localStorage may be unavailable
    }
    await logout();
    setLocation("/login");
  };

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
        <ApiStatusBadge />

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

        {user ? (
          <DropdownMenu>
            {/* `asChild` so the avatar itself becomes the button — Radix
                merges its trigger props onto it instead of nesting a
                <button> inside a <button>, which is invalid HTML and
                breaks keyboard activation. */}
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="ms-2 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label={isRtl ? "قائمة الحساب" : "Account menu"}
              >
                <RoleAvatar user={user} size="sm" showRole={false} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              {/* Profile header. Reuses `RoleAvatar` so the bilingual
                  name + role logic stays in exactly one place rather than
                  being duplicated here. */}
              <DropdownMenuLabel className="font-normal">
                <RoleAvatar user={user} showRole />
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onSelect={(e) => {
                  // Radix closes the menu on select; prevent that so the
                  // menu doesn't snap shut mid-redirect. The sign-out and
                  // navigation to /login unmount this header anyway.
                  e.preventDefault();
                  void handleLogout();
                }}
                className="text-destructive focus:text-destructive"
              >
                <LogOut className="h-4 w-4" />
                {isRtl ? "تسجيل الخروج" : "Logout"}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          // No session → no logout to offer. A plain role-initial circle,
          // not a menu trigger.
          <div className="h-8 w-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-medium text-sm ms-2">
            {currentRole.charAt(0).toUpperCase()}
          </div>
        )}
      </div>
    </header>
  );
}
