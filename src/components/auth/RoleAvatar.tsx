import { useAppContext } from "@/context/AppContext";
import { cn } from "@/lib/utils";
import type { AuthUser } from "@/lib/auth";
import type { Role } from "@/context/AppContext";

interface RoleAvatarProps {
  user: Pick<AuthUser, "fullName" | "fullNameAr" | "username" | "role">;
  size?: "sm" | "md";
  showRole?: boolean;
  className?: string;
}

const ROLE_LABEL: Record<Role, { en: string; ar: string }> = {
  superadmin:   { en: "Superadmin",          ar: "المشرف العام" },
  admin:        { en: "Administrator",       ar: "مدير النظام" },
  lab_manager:  { en: "Lab Manager",         ar: "مدير المختبر" },
  analyst:      { en: "Analyst",             ar: "محلل" },
  client:       { en: "Client",              ar: "عميل" },
  accountant:   { en: "Accountant",          ar: "محاسب" },
  receptionist: { en: "Receptionist",        ar: "موظف استقبال" },
};

function initialsOf(name: string, fallback: string): string {
  const trimmed = name?.trim();
  if (!trimmed) return fallback.slice(0, 1).toUpperCase();
  // Use the first letter of the first whitespace-separated word.
  return trimmed.split(/\s+/)[0].slice(0, 1).toUpperCase();
}

/**
 * Compact avatar + name + role display. Used in Header and Sidebar.
 * Bilingual: shows the language-appropriate name; falls back to username.
 */
export function RoleAvatar({ user, size = "md", showRole = true, className }: RoleAvatarProps) {
  const { language } = useAppContext();
  const isRtl = language === "ar";
  const t = (en: string, ar: string) => (isRtl ? ar : en);

  const displayName = isRtl && user.fullNameAr ? user.fullNameAr : user.fullName || user.username;
  const roleLabel = ROLE_LABEL[user.role] ?? { en: user.role, ar: user.role };
  const initial = initialsOf(displayName, user.username);

  const circle =
    size === "sm"
      ? "h-8 w-8 text-sm"
      : "h-10 w-10 text-base";

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div
        className={cn(
          circle,
          "rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold shrink-0",
        )}
        aria-hidden="true"
      >
        {initial}
      </div>
      {(showRole || displayName) && (
        <div className="flex flex-col min-w-0">
          {displayName && (
            <span className="text-sm font-medium truncate">{displayName}</span>
          )}
          {showRole && (
            <span className="text-xs text-muted-foreground truncate">
              {t(roleLabel.en, roleLabel.ar)}
            </span>
          )}
        </div>
      )}
    </div>
  );
}