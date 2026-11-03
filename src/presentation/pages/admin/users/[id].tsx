import { useParams, Link } from "wouter";
import { useAppContext } from "@/presentation/providers/AppContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { UserOverrideMatrix } from "@/presentation/components/features/admin/PermissionMatrix";
import { useUserMenuOverrides } from "@/presentation/hooks/useUserMenuOverrides";
import { useEffectiveMenuVisibility } from "@/presentation/hooks/useEffectiveMenuVisibility";
import { isApiEnabled } from "@/infrastructure/api/api";
import {
  useUser,
  useUserMenuOverridesApi,
  useReplaceUserMenuOverrides,
  useClearUserMenuOverrides,
} from "@/infrastructure/api/tanstack-queries";
import { describeApiError } from "@/infrastructure/api/errors";
import { toast } from "sonner";
import {
  mockUsers,
  type SaaSUser,
} from "@/infrastructure/mock/data/users";
import { useRoleLabelRecord } from "@/presentation/hooks/useRoleLabels";

export default function UserDetail() {
  const params = useParams<{ id: string }>();
  const { language } = useAppContext();
  const isRtl = language === "ar";
  const api = isApiEnabled();

  // Local (mock) overrides — used only when the API is disabled.
  const { getOverride, setOverride, clearForUser } = useUserMenuOverrides();
  // Reading the visibility hook here re-renders this page whenever any
  // of the three underlying stores change — useful for the summary banner.
  useEffectiveMenuVisibility();

  // In API mode the user record comes from the backend.
  const userQuery = useUser(api ? params.id : null);
  const overridesQuery = useUserMenuOverridesApi(api ? params.id : null);
  const replaceMut = useReplaceUserMenuOverrides();
  const clearMut = useClearUserMenuOverrides();

  // Resolve the user to a SaaSUser-shaped object regardless of mode.
  const user: SaaSUser | null = api
    ? userQuery.data
      ? {
          id: userQuery.data.id,
          email: userQuery.data.email,
          username: userQuery.data.username,
          fullNameEn: userQuery.data.fullName,
          fullNameAr: userQuery.data.fullNameAr ?? "",
          role: userQuery.data.role as SaaSUser["role"],
          status: userQuery.data.status,
          lastLoginAt: userQuery.data.lastLoginAt ?? undefined,
          createdAt: userQuery.data.createdAt,
        }
      : null
    : mockUsers.find((u) => u.id === params.id) ?? null;

  // The role registry — the source of the role's display label. Hooks must
  // be called unconditionally, so this is here (before the early returns
  // below), not next to the label computation.
  //
  // `user` may be null here, so an empty slug is passed; the record is
  // only *used* after the `!user` early return.
  const roleRecord = useRoleLabelRecord(user?.role ?? "");

  if (api && userQuery.isLoading) {
    return (
      <div className="space-y-4">
        <p className="text-muted-foreground">{isRtl ? "جاري التحميل…" : "Loading…"}</p>
      </div>
    );
  }

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

  // Resolve the role's display label from the SAME registry the Users
  // page dropdown uses.
  //
  // Before this, the label came from the mock registry with **no
  // fallback**: a user holding a custom role (a slug created on the
  // Roles page — ADR 0010) produced `undefined`, and the header
  // rendered **nothing**. `useRoleLabelRecord` degrades to the raw
  // slug, so the header always shows something.
  const roleLabel = user.role === "superadmin"
    ? (isRtl ? "مدير عام" : "Super Admin")
    : isRtl
      ? roleRecord.labelAr
      : roleRecord.labelEn;

  // Bridges the local override store (mock mode) and the API overrides
  // (api mode) to the prop shape the matrix component expects.
  function getOverrideApi(menuKey: string): "grant" | "deny" | null {
    if (api) {
      const cell = overridesQuery.data?.overrides.find(
        (c) => c.menuKey === menuKey,
      );
      return cell?.effect ?? null;
    }
    return getOverride(user!.id, menuKey as Parameters<typeof getOverride>[1]);
  }

  function setOverrideApi(
    _userId: string,
    menuKey: string,
    effect: "grant" | "deny" | null,
  ) {
    if (api) {
      const current = overridesQuery.data?.overrides ?? [];
      // The READ model is camelCase (`menuKey`); the WRITE model is
      // snake_case (`menu_key`) — the documented Phase-B wire format. The
      // backend also accepts `menuKey` during the rollout window, but
      // snake_case is what the contract says.
      const next = effect === null
        ? current
            .filter((c) => c.menuKey !== menuKey)
            .map((c) => ({ menu_key: c.menuKey, effect: c.effect }))
        : [
            ...current
              .filter((c) => c.menuKey !== menuKey)
              .map((c) => ({ menu_key: c.menuKey, effect: c.effect })),
            { menu_key: menuKey, effect },
          ];
      // Mirror into the local override store as well. In API mode the
      // sidebar's authority is the server's resolved set
      // (`GET /auth/me/menus`), so this mirror is the OFFLINE/ERROR
      // fallback — but it keeps the admin's own browser consistent with
      // the server, and it is what the mock-mode path uses.
      setOverride(user!.id, menuKey as Parameters<typeof setOverride>[1], effect);
      replaceMut.mutate(
        { id: user!.id, body: { overrides: next } },
        {
          onError: (e) => {
            const m = describeApiError(e, isRtl ? "ar" : "en");
            toast.error(isRtl ? m.ar : m.en);
          },
        },
      );
    } else {
      setOverride(user!.id, menuKey as Parameters<typeof setOverride>[1], effect);
    }
  }

  function clearAllApi() {
    if (api) {
      // Mirror the clear locally too — see the note in `setOverrideApi`.
      clearForUser(user!.id);
      clearMut.mutate(user!.id, {
        onError: (e) => {
          const m = describeApiError(e, isRtl ? "ar" : "en");
          toast.error(isRtl ? m.ar : m.en);
        },
      });
    } else {
      clearForUser(user!.id);
    }
  }

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
            getOverride={getOverrideApi}
            setOverride={setOverrideApi}
            clearForUser={clearAllApi}
          />
        </CardContent>
      </Card>
    </div>
  );
}