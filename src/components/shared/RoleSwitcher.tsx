import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAppContext, type Role } from "@/context/AppContext";
import { useRolePermissions } from "@/hooks/useRolePermissions";
import type { ToggleableRole } from "@/mock-data/rolePermissions";

interface RoleOption {
  value: ToggleableRole;
  labelEn: string;
  labelAr: string;
}

const ROLE_OPTIONS: RoleOption[] = [
  { value: "admin", labelEn: "Admin", labelAr: "مدير النظام" },
  { value: "lab_manager", labelEn: "Lab Manager", labelAr: "مدير المختبر" },
  { value: "analyst", labelEn: "Analyst", labelAr: "محلل" },
  { value: "client", labelEn: "Client", labelAr: "عميل" },
  { value: "accountant", labelEn: "Accountant", labelAr: "محاسب" },
];

export function RoleSwitcher() {
  const { currentRole, setCurrentRole, language } = useAppContext();
  const rolePerms = useRolePermissions();
  const isRtl = language === "ar";

  const visibleOptions = ROLE_OPTIONS.filter((o) => rolePerms.isEnabled(o.value));
  const fallbackValue: Role = visibleOptions[0]?.value ?? "admin";

  // If the active role was disabled, the select still shows the fallback label
  // rather than the disabled value, so the dropdown remains usable.
  const selectedValue =
    currentRole === "superadmin" || visibleOptions.some((o) => o.value === currentRole)
      ? currentRole
      : fallbackValue;

  return (
    <Select value={selectedValue} onValueChange={(v) => setCurrentRole(v as Role)}>
      <SelectTrigger className="w-[140px] h-9">
        <SelectValue placeholder="Role" />
      </SelectTrigger>
      <SelectContent>
        {visibleOptions.length === 0 ? (
          <SelectItem value={fallbackValue}>
            {isRtl ? ROLE_OPTIONS[0].labelAr : ROLE_OPTIONS[0].labelEn}
          </SelectItem>
        ) : (
          visibleOptions.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {isRtl ? o.labelAr : o.labelEn}
            </SelectItem>
          ))
        )}
      </SelectContent>
    </Select>
  );
}