import { ReactNode } from "react";
import { Loader2, ShieldX } from "lucide-react";
import { Redirect } from "wouter";
import { useAuth } from "@/context/AuthContext";
import { useAppContext } from "@/context/AppContext";
import { isApiEnabled } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import type { Role } from "@/context/AppContext";

interface ProtectedRouteProps {
  /** When omitted, any authenticated user may enter. */
  roles?: Role[];
  children: ReactNode;
}

/**
 * Route guard. Behaviour:
 *  - API mode + loading → centered spinner
 *  - API mode + anonymous → redirect to /login
 *  - API mode + wrong role → inline 403 page
 *  - Mock mode → render children immediately (everything is permitted)
 *
 * Reads role via `currentRole` from AppContext. In API mode the AuthProvider
 * keeps `currentRole` in sync with `user.role`; in mock mode it defaults to
 * "admin", which means the mock gate is effectively a no-op (matching today's
 * unguarded behaviour).
 */
export function ProtectedRoute({ roles, children }: ProtectedRouteProps) {
  const { state, isAuthenticated, isLoading } = useAuth();
  const { currentRole, language } = useAppContext();
  const isRtl = language === "ar";
  const t = (en: string, ar: string) => (isRtl ? ar : en);

  // Mock mode: render children unchanged.
  if (!isApiEnabled()) return <>{children}</>;

  // API mode: loading
  if (isLoading || state.status === "loading") {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="text-sm">{t("Loading…", "جارٍ التحميل…")}</span>
        </div>
      </div>
    );
  }

  // API mode: anonymous
  if (!isAuthenticated) {
    return <Redirect to="/login" />;
  }

  // API mode: authenticated but wrong role
  if (roles && roles.length > 0 && !roles.includes(currentRole)) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-background p-6">
        <div className="max-w-md w-full text-center space-y-6">
          <ShieldX className="h-14 w-14 mx-auto text-destructive" />
          <div className="space-y-2">
            <h1 className="text-2xl font-bold">{t("Access denied", "الوصول مرفوض")}</h1>
            <p className="text-muted-foreground">
              {t(
                "You don't have permission to view this page.",
                "ليس لديك صلاحية لعرض هذه الصفحة.",
              )}
            </p>
          </div>
          <Button asChild>
            <Link href="/dashboard">{t("Back to dashboard", "العودة للوحة التحكم")}</Link>
          </Button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}