import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  MENU_REGISTRY,
  MENU_GROUP_LABELS,
  type MenuKey,
  type MenuGroup,
} from "@/mock-data/menuPermissions";
import { useAppContext } from "@/context/AppContext";
import { useRoleRegistry } from "@/hooks/useRoleRegistry";
import type { AdminMenuKey, AdminMenuKeyGroup } from "@/lib/adminMenuKeys";

const GROUP_ORDER: MenuGroup[] = ["lab", "client", "accounting", "admin"];

interface RoleMatrixProps {
  /** Role slugs to render as columns. The caller passes the live list
   * (from `useRoleAdmin().list()`) so custom roles appear too. */
  roles: string[];
  /** Map: role → is this menu enabled for the role? */
  isRoleEnabled: (role: string, key: MenuKey) => boolean;
  /** Toggle a single cell. */
  toggle: (role: string, key: MenuKey) => void;
  /** Reset all roles to seed defaults. */
  resetAll: () => void;
  /**
   * Optional list of API-side admin menu keys. When provided (typically
   * from `useAdminMenuKeys()`), the matrix renders these 10 keys instead
   * of the SPA's 32-key `MENU_REGISTRY`. Defaults to the 32-key registry
   * (mock mode).
   */
  menuKeys?: AdminMenuKey[];
}

/**
 * The menu-keys × N-role matrix editor. Used by `/admin/roles`.
 *
 * In mock mode, rows are the SPA's 32-key `MENU_REGISTRY` grouped by
 * `MenuGroup`. In API mode, rows are the 10 admin menu keys fetched from
 * `GET /admin/menu-keys`. Columns are the role slugs passed in by the
 * caller — initially the 6 toggleable roles, plus any custom roles.
 * Cells are `<Switch>` bound to the underlying role × menu store.
 */
export function RolePermissionMatrix({
  roles,
  isRoleEnabled,
  toggle,
  resetAll,
  menuKeys,
}: RoleMatrixProps) {
  const { language } = useAppContext();
  const isRtl = language === "ar";
  const registry = useRoleRegistry();

  // API mode: render the 10 admin menu keys (with their own group labels).
  if (menuKeys && menuKeys.length > 0) {
    return (
      <RoleMatrixFromApiKeys
        roles={roles}
        menuKeys={menuKeys}
        isRoleEnabled={isRoleEnabled}
        toggle={toggle}
        resetAll={resetAll}
        isRtl={isRtl}
      />
    );
  }

  const allKeys = Object.keys(MENU_REGISTRY) as MenuKey[];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Button variant="ghost" size="sm" onClick={resetAll}>
          {isRtl ? "إعادة التعيين للافتراضي" : "Reset to Defaults"}
        </Button>
      </div>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-start p-3 font-medium sticky start-0 bg-card z-10 min-w-[180px]">
                  {isRtl ? "عنصر القائمة" : "Menu Item"}
                </th>
                {roles.map((role) => {
                  const meta = registry.getMeta(role);
                  const Icon = registry.getIcon(role);
                  return (
                    <th
                      key={role}
                      className="text-center p-3 font-medium min-w-[100px]"
                    >
                      <div className="flex flex-col items-center gap-1">
                        <Icon className="h-4 w-4 text-muted-foreground" />
                        <span className="text-xs">
                          {isRtl ? meta?.labelAr : meta?.labelEn}
                        </span>
                        <span className="text-[9px] font-mono text-muted-foreground">
                          {role}
                        </span>
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {GROUP_ORDER.map((group) => {
                const groupKeys = allKeys.filter(
                  (k) => MENU_REGISTRY[k].group === group,
                );
                if (groupKeys.length === 0) return null;
                return (
                  <FragmentLike key={group}>
                    <tr className="bg-muted/30">
                      <td
                        colSpan={roles.length + 1}
                        className="p-2 ps-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide"
                      >
                        {isRtl
                          ? MENU_GROUP_LABELS[group].ar
                          : MENU_GROUP_LABELS[group].en}
                      </td>
                    </tr>
                    {groupKeys.map((key) => {
                      const entry = MENU_REGISTRY[key];
                      return (
                        <tr key={key} className="border-b last:border-b-0">
                          <td className="p-3 sticky start-0 bg-card z-10">
                            <div className="flex flex-col">
                              <Label className="text-sm font-medium">
                                {isRtl ? entry.labelAr : entry.labelEn}
                              </Label>
                              <span className="text-xs text-muted-foreground font-mono">
                                {key}
                              </span>
                            </div>
                          </td>
                          {roles.map((role) => (
                            <td key={role} className="text-center p-3">
                              <Switch
                                checked={isRoleEnabled(role, key)}
                                onCheckedChange={() => toggle(role, key)}
                                aria-label={`${role}-${key}`}
                              />
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                  </FragmentLike>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

// Lightweight wrapper so we can use the `key` prop inside `map` without
// pulling in `<Fragment>` everywhere.
function FragmentLike({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

interface UserMatrixProps {
  /** The user being edited. */
  userId: string;
  /** Read the current override (`grant` / `deny`) or `null` for inherit. */
  getOverride: (userId: string, key: MenuKey) => "grant" | "deny" | null;
  /** Set the override (or pass `null` to clear back to inherit). */
  setOverride: (
    userId: string,
    key: MenuKey,
    effect: "grant" | "deny" | null,
  ) => void;
  /** Reset every override for this user. */
  clearForUser: (userId: string) => void;
}

/**
 * Per-user override matrix. Used by `/admin/users/:id`.
 *
 * Each row is a single MenuKey. Each row has three buttons:
 * `Inherit` (clear), `Grant` (force-on), `Deny` (force-off). The current
 * override is highlighted. No multi-role columns here — the user has a
 * fixed role from `mockUsers.ts`, the role's default cells are the
 * starting point.
 */
export function UserOverrideMatrix({
  userId,
  getOverride,
  setOverride,
  clearForUser,
}: UserMatrixProps) {
  const { language } = useAppContext();
  const isRtl = language === "ar";

  const allKeys = Object.keys(MENU_REGISTRY) as MenuKey[];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Button variant="ghost" size="sm" onClick={() => clearForUser(userId)}>
          {isRtl ? "إعادة تعيين الكل" : "Reset All Overrides"}
        </Button>
      </div>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-start p-3 font-medium sticky start-0 bg-card z-10 min-w-[180px]">
                  {isRtl ? "عنصر القائمة" : "Menu Item"}
                </th>
                <th className="text-center p-3 font-medium">
                  {isRtl ? "الإعداد" : "Setting"}
                </th>
              </tr>
            </thead>
            <tbody>
              {GROUP_ORDER.map((group) => {
                const groupKeys = allKeys.filter(
                  (k) => MENU_REGISTRY[k].group === group,
                );
                if (groupKeys.length === 0) return null;
                return (
                  <FragmentLike key={group}>
                    <tr className="bg-muted/30">
                      <td
                        colSpan={2}
                        className="p-2 ps-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide"
                      >
                        {isRtl
                          ? MENU_GROUP_LABELS[group].ar
                          : MENU_GROUP_LABELS[group].en}
                      </td>
                    </tr>
                    {groupKeys.map((key) => {
                      const entry = MENU_REGISTRY[key];
                      const current = getOverride(userId, key);
                      return (
                        <tr key={key} className="border-b last:border-b-0">
                          <td className="p-3 sticky start-0 bg-card z-10">
                            <div className="flex flex-col">
                              <Label className="text-sm font-medium">
                                {isRtl ? entry.labelAr : entry.labelEn}
                              </Label>
                              <span className="text-xs text-muted-foreground font-mono">
                                {key}
                              </span>
                            </div>
                          </td>
                          <td className="text-center p-3">
                            <div className="inline-flex rounded-md border bg-muted/40 p-0.5">
                              <OverrideButton
                                active={current === null}
                                onClick={() => setOverride(userId, key, null)}
                                labelEn="Inherit"
                                labelAr="حسب الدور"
                                isRtl={isRtl}
                              />
                              <OverrideButton
                                active={current === "grant"}
                                onClick={() => setOverride(userId, key, "grant")}
                                labelEn="Grant"
                                labelAr="منح"
                                isRtl={isRtl}
                                tone="green"
                              />
                              <OverrideButton
                                active={current === "deny"}
                                onClick={() => setOverride(userId, key, "deny")}
                                labelEn="Deny"
                                labelAr="منع"
                                isRtl={isRtl}
                                tone="red"
                              />
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </FragmentLike>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

function OverrideButton({
  active,
  onClick,
  labelEn,
  labelAr,
  isRtl,
  tone,
}: {
  active: boolean;
  onClick: () => void;
  labelEn: string;
  labelAr: string;
  isRtl: boolean;
  tone?: "green" | "red";
}) {
  const activeClass =
    tone === "green"
      ? "bg-green-500/15 text-green-700 dark:text-green-400"
      : tone === "red"
        ? "bg-red-500/15 text-red-700 dark:text-red-400"
        : "bg-background text-foreground shadow-sm";
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1 text-xs font-medium rounded-sm transition-colors ${
        active ? activeClass : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {isRtl ? labelAr : labelEn}
    </button>
  );
}

const API_GROUP_ORDER: AdminMenuKeyGroup[] = ["lab", "client", "accounting", "admin"];
const API_GROUP_LABELS: Record<AdminMenuKeyGroup, { en: string; ar: string }> = {
  lab: { en: "Laboratory", ar: "المختبر" },
  client: { en: "Client Portal", ar: "بوابة العميل" },
  accounting: { en: "Accounting & Finance", ar: "المحاسبة والمالية" },
  admin: { en: "Administration", ar: "الإدارة" },
};

/**
 * API-mode matrix: 10 admin menu keys × N-roles. The cell toggle is
 * cast to `MenuKey` to satisfy the `RolePermissionMatrix` prop type —
 * the underlying string is the same as the admin menu-key.
 */
function RoleMatrixFromApiKeys({
  roles,
  menuKeys,
  isRoleEnabled,
  toggle,
  resetAll,
  isRtl,
}: {
  roles: string[];
  menuKeys: AdminMenuKey[];
  isRoleEnabled: (role: string, key: MenuKey) => boolean;
  toggle: (role: string, key: MenuKey) => void;
  resetAll: () => void;
  isRtl: boolean;
}) {
  const registry = useRoleRegistry();
  const sortedKeys = [...menuKeys].sort((a, b) => a.displayOrder - b.displayOrder);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Button variant="ghost" size="sm" onClick={resetAll}>
          {isRtl ? "إعادة التعيين للافتراضي" : "Reset to Defaults"}
        </Button>
      </div>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-start p-3 font-medium sticky start-0 bg-card z-10 min-w-[180px]">
                  {isRtl ? "عنصر القائمة" : "Menu Item"}
                </th>
                {roles.map((role) => {
                  const meta = registry.getMeta(role);
                  const Icon = registry.getIcon(role);
                  return (
                    <th
                      key={role}
                      className="text-center p-3 font-medium min-w-[100px]"
                    >
                      <div className="flex flex-col items-center gap-1">
                        <Icon className="h-4 w-4 text-muted-foreground" />
                        <span className="text-xs">
                          {isRtl ? meta?.labelAr : meta?.labelEn}
                        </span>
                        <span className="text-[9px] font-mono text-muted-foreground">
                          {role}
                        </span>
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {API_GROUP_ORDER.map((group) => {
                const groupKeys = sortedKeys.filter((k) => k.group === group);
                if (groupKeys.length === 0) return null;
                return (
                  <FragmentLike key={group}>
                    <tr className="bg-muted/30">
                      <td
                        colSpan={roles.length + 1}
                        className="p-2 ps-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide"
                      >
                        {isRtl ? API_GROUP_LABELS[group].ar : API_GROUP_LABELS[group].en}
                      </td>
                    </tr>
                    {groupKeys.map((k) => (
                      <tr key={k.key} className="border-b last:border-b-0">
                        <td className="p-3 sticky start-0 bg-card z-10">
                          <div className="flex flex-col">
                            <Label className="text-sm font-medium">
                              {isRtl ? k.labelAr : k.labelEn}
                            </Label>
                            <span className="text-xs text-muted-foreground font-mono">
                              {k.key}
                            </span>
                          </div>
                        </td>
                        {roles.map((role) => (
                          <td key={role} className="text-center p-3">
                            <Switch
                              checked={isRoleEnabled(role, k.key as MenuKey)}
                              onCheckedChange={() => toggle(role, k.key as MenuKey)}
                              aria-label={`${role}-${k.key}`}
                            />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </FragmentLike>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
