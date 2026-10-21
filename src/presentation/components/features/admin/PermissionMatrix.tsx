import {
  Card,
  CardContent,
} from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { Label } from "@/shared/ui/label";
import {
  MENU_REGISTRY,
  MENU_GROUP_LABELS,
  type MenuKey,
  type MenuGroup,
} from "@/infrastructure/mock/data/menuPermissions";
import { useAppContext } from "@/presentation/providers/AppContext";

const GROUP_ORDER: MenuGroup[] = ["lab", "client", "accounting", "admin"];

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
