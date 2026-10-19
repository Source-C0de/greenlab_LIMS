import { useParams, Link } from "wouter";
import { useAppContext } from "@/context/AppContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { UserOverrideMatrix } from "@/components/admin/PermissionMatrix";
import { useUserMenuOverrides } from "@/hooks/useUserMenuOverrides";
import { useEffectiveMenuVisibility } from "@/hooks/useEffectiveMenuVisibility";
import { mockUsers } from "@/mock-data/users";
import {
  getRoleEntry,
  type ToggleableRole,
} from "@/mock-data/rolePermissions";

export default function UserDetail() {
  const params = useParams<{ id: string }>();
  const { language } = useAppContext();
  const isRtl = language === "ar";

  const { getOverride, setOverride, clearForUser } = useUserMenuOverrides();
  // Reading the visibility hook here re-renders this page whenever any
  // of the three underlying stores change — useful for the summary banner.
  useEffectiveMenuVisibility();

  const user = mockUsers.find((u) => u.id === params.id);

  if (!user) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">
          {isRtl ? "لم يتم العثور على المستخدم" : "User not found"}
        </h1>
        <Link href="/admin/users" className="text-primary hover:underline text-sm">
          {isRtl ? "→ العودة إلى قائمة المستخدمين" : "← Back to users list"}
        </Link>
      </div>
    );
  }

  const roleEntry =
    user.role === "superadmin"
      ? null
      : getRoleEntry(user.role as ToggleableRole);
  const roleLabel = user.role === "superadmin"
    ? (isRtl ? "مدير عام" : "Super Admin")
    : isRtl
      ? roleEntry?.labelAr
      : roleEntry?.labelEn;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="icon">
          <Link href="/admin/users">
            {isRtl ? <ArrowRight className="h-4 w-4" /> : <ArrowLeft className="h-4 w-4" />}
          </Link>
        </Button>
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight truncate">
            {isRtl ? user.fullNameAr : user.fullNameEn}
          </h1>
          <p className="text-sm text-muted-foreground">
            {user.email} · {roleLabel} · @{user.username}
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            {isRtl ? "تجاوز صلاحيات القائمة" : "Menu Permission Overrides"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            {isRtl
              ? "اختر «حسب الدور» لاتباع الإعداد الافتراضي للدور، أو «منح» لإظهار عنصر قائمة لهذا المستخدم فقط، أو «منع» لإخفائه."
              : "Choose Inherit to follow the role's default, Grant to give this user a menu item, or Deny to hide it."}
          </p>
          <UserOverrideMatrix
            userId={user.id}
            getOverride={getOverride}
            setOverride={setOverride}
            clearForUser={clearForUser}
          />
        </CardContent>
      </Card>
    </div>
  );
}
