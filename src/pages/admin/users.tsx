import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import { useAppContext, type Role } from "@/context/AppContext";
import { DataTable } from "@/components/shared/DataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Pencil, KeyRound, Ban, CheckCircle2, Trash2, Copy, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import {
  mockUsers,
  type SaaSUser,
  type UserStatus,
} from "@/mock-data/users";
import {
  getRoleEntry,
  type ToggleableRole,
} from "@/mock-data/rolePermissions";
import { useRoleAdmin } from "@/hooks/useRoleAdmin";
import { isApiEnabled } from "@/lib/api";
import {
  useUsers,
  useCreateUser,
  useUpdateUser,
  useDeleteUser,
  useResetUserPassword,
  useSuspendUser,
  useActivateUser,
} from "@/lib/queries";
import { describeApiError } from "@/lib/apiErrors";
import type { User, UserRole } from "@/lib/usersApi";

const STATUS_VALUES: UserStatus[] = ["active", "trial", "suspended", "disabled"];

/** Normalize a backend `User` to the row shape the table expects. */
function apiUserToRow(u: User): SaaSUser {
  return {
    id: u.id,
    email: u.email,
    username: u.username,
    fullNameEn: u.fullName,
    fullNameAr: u.fullNameAr ?? "",
    role: u.role as Role,
    status: u.status,
    lastLoginAt: u.lastLoginAt ?? undefined,
    createdAt: u.createdAt,
  };
}

function formatLastLogin(iso: string | undefined, isRtl: boolean): string {
  if (!iso) return isRtl ? "—" : "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  // Lightweight relative formatter — no extra dep.
  const diffMs = Date.now() - date.getTime();
  const min = Math.floor(diffMs / 60000);
  if (min < 1) return isRtl ? "الآن" : "just now";
  if (min < 60) return isRtl ? `قبل ${min} دقيقة` : `${min} min ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return isRtl ? `قبل ${hr} ساعة` : `${hr} hr ago`;
  const day = Math.floor(hr / 24);
  if (day < 30) return isRtl ? `قبل ${day} يوم` : `${day} day${day === 1 ? "" : "s"} ago`;
  return date.toISOString().slice(0, 10);
}

interface FormState {
  email: string;
  username: string;
  fullNameEn: string;
  fullNameAr: string;
  role: Role;
  status: UserStatus;
}

const EMPTY_FORM: FormState = {
  email: "",
  username: "",
  fullNameEn: "",
  fullNameAr: "",
  role: "analyst",
  status: "active",
};

function validate(form: FormState): Partial<Record<keyof FormState, string>> {
  const errors: Partial<Record<keyof FormState, string>> = {};
  if (!form.email.includes("@")) errors.email = "Invalid email";
  if (form.username.length < 3) errors.username = "Min 3 characters";
  if (form.fullNameEn.length < 2) errors.fullNameEn = "Required";
  // fullNameAr is optional — the backend's `UserCreate.fullNameAr` is
  // nullable per docs/api/users.md §1.2.
  return errors;
}

export default function UsersAdmin() {
  const { language } = useAppContext();
  const isRtl = language === "ar";
  const [, setLocation] = useLocation();
  const roleAdmin = useRoleAdmin();
  const t = (en: string, ar: string) => (isRtl ? ar : en);

  // ---------------------------------------------------------------------
  // Data layer — API or mock, depending on VITE_USE_API.
  // ---------------------------------------------------------------------
  const api = isApiEnabled();
  const usersQuery = useUsers();
  const createMut = useCreateUser();
  const updateMut = useUpdateUser();
  const deleteMut = useDeleteUser();
  const resetMut = useResetUserPassword();
  const suspendMut = useSuspendUser();
  const activateMut = useActivateUser();

  // Local (mock) state — used only when the API is disabled.
  const [mockList, setMockList] = useState<SaaSUser[]>(mockUsers);

  // In API mode the source of truth is the server.
  const users: SaaSUser[] = api
    ? (usersQuery.data?.data ?? []).map(apiUserToRow)
    : mockList;

  // Dialog + form state (shared by both modes).
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingUpdatedAt, setEditingUpdatedAt] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState<
    Partial<Record<keyof FormState, string>>
  >({});

  // Delete confirmation state — typed username confirmation is required.
  const [deleteTarget, setDeleteTarget] = useState<SaaSUser | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState("");

  // One-time tempPassword dialog (POST 201 surfaces a generated password).
  // Also reused to show the admin's typed password after a successful
  // "Reset password" action so they can copy it for the user.
  const [tempPassword, setTempPassword] = useState<{
    username: string;
    password: string;
  } | null>(null);

  // "Set new password" dialog state (admin-side reset flow).
  const [resetTarget, setResetTarget] = useState<SaaSUser | null>(null);
  const [resetPassword, setResetPassword] = useState("");
  const [resetConfirm, setResetConfirm] = useState("");
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [resetTouched, setResetTouched] = useState({
    password: false,
    confirm: false,
  });

  // Refetch after a successful mutation so the table reflects the server.
  useEffect(() => {
    if (!api) return;
  }, [api]);

  // ---------------------------------------------------------------------
  // Table columns.
  // ---------------------------------------------------------------------
  const columns = useMemo(
    () => [
      {
        key: "name",
        header: t("Full Name", "الاسم الكامل"),
        render: (u: SaaSUser) => (
          <Link
            href={`/admin/users/${u.id}`}
            className="font-medium text-primary hover:underline"
          >
            {isRtl ? u.fullNameAr : u.fullNameEn}
          </Link>
        ),
      },
      {
        key: "email",
        header: t("Email", "البريد الإلكتروني"),
        render: (u: SaaSUser) => (
          <span className="text-sm text-muted-foreground">{u.email}</span>
        ),
      },
      {
        key: "role",
        header: t("Role", "الدور"),
        render: (u: SaaSUser) => {
          if (u.role === "superadmin") {
            return (
              <span className="text-sm font-medium">
                {isRtl ? "مدير عام" : "Super Admin"}
              </span>
            );
          }
          const entry = getRoleEntry(u.role as ToggleableRole);
          return (
            <span className="text-sm">
              {entry ? (isRtl ? entry.labelAr : entry.labelEn) : u.role}
            </span>
          );
        },
      },
      {
        key: "status",
        header: t("Status", "الحالة"),
        render: (u: SaaSUser) => <StatusBadge status={u.status} />,
      },
      {
        key: "lastLogin",
        header: t("Last Login", "آخر دخول"),
        render: (u: SaaSUser) => (
          <span className="text-sm text-muted-foreground">
            {formatLastLogin(u.lastLoginAt, isRtl)}
          </span>
        ),
      },
      {
        key: "actions",
        header: t("Actions", "الإجراءات"),
        render: (u: SaaSUser) => (
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                openEdit(u);
              }}
              title={t("Edit", "تعديل")}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                openResetPassword(u);
              }}
              title={t("Reset password", "إعادة تعيين كلمة المرور")}
            >
              <KeyRound className="h-4 w-4" />
            </Button>
            {u.status === "suspended" || u.status === "disabled" ? (
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  handleStatus(u, "active");
                }}
                title={t("Activate", "تفعيل")}
              >
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  handleStatus(u, "suspended");
                }}
                title={t("Suspend", "تعليق")}
              >
                <Ban className="h-4 w-4 text-destructive" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                openDelete(u);
              }}
              title={t("Delete", "حذف")}
              disabled={u.role === "superadmin"}
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isRtl, api],
  );

  // ---------------------------------------------------------------------
  // Action handlers.
  // ---------------------------------------------------------------------

  function openCreate() {
    setEditingId(null);
    setEditingUpdatedAt(null);
    setForm(EMPTY_FORM);
    setFormErrors({});
    setDialogOpen(true);
  }

  function openEdit(u: SaaSUser) {
    setEditingId(u.id);
    setForm({
      email: u.email,
      username: u.username,
      fullNameEn: u.fullNameEn,
      fullNameAr: u.fullNameAr,
      role: u.role,
      status: u.status,
    });
    setFormErrors({});
    // Capture updatedAt for If-Match when in API mode.
    const serverRow = usersQuery.data?.data.find((r) => r.id === u.id);
    setEditingUpdatedAt(serverRow?.updatedAt ?? null);
    setDialogOpen(true);
  }

  function handleSubmit() {
    const errors = validate(form);
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    if (editingId) {
      if (api) {
        updateMut.mutate(
          {
            id: editingId,
            body: {
              email: form.email,
              username: form.username,
              fullName: form.fullNameEn,
              fullNameAr: form.fullNameAr || null,
              role: form.role as UserRole,
              status: form.status,
            },
            updatedAt: editingUpdatedAt ?? undefined,
          },
          {
            onSuccess: () => {
              toast.success(t("User updated", "تم تحديث المستخدم"));
              setDialogOpen(false);
            },
            onError: (e) => {
              const m = describeApiError(e, isRtl ? "ar" : "en");
              toast.error(isRtl ? m.ar : m.en);
            },
          },
        );
      } else {
        setMockList((prev) =>
          prev.map((u) =>
            u.id === editingId
              ? {
                  ...u,
                  email: form.email,
                  username: form.username,
                  fullNameEn: form.fullNameEn,
                  fullNameAr: form.fullNameAr,
                  role: form.role,
                  status: form.status,
                }
              : u,
          ),
        );
        toast.success(t("User updated", "تم تحديث المستخدم"));
        setDialogOpen(false);
      }
    } else {
      if (api) {
        createMut.mutate(
          {
            email: form.email,
            username: form.username,
            fullName: form.fullNameEn,
            fullNameAr: form.fullNameAr || null,
            role: form.role as UserRole,
            isActive: true,
          },
          {
            onSuccess: (row) => {
              toast.success(t("User created", "تم إنشاء المستخدم"));
              if (row.tempPassword) {
                setTempPassword({
                  username: row.username,
                  password: row.tempPassword,
                });
              }
              setDialogOpen(false);
            },
            onError: (e) => {
              const m = describeApiError(e, isRtl ? "ar" : "en");
              toast.error(isRtl ? m.ar : m.en);
            },
          },
        );
      } else {
        const nextId = `U${String(mockList.length + 1).padStart(3, "0")}`;
        const newUser: SaaSUser = {
          id: nextId,
          email: form.email,
          username: form.username,
          fullNameEn: form.fullNameEn,
          fullNameAr: form.fullNameAr,
          role: form.role,
          status: form.status,
          createdAt: new Date().toISOString(),
        };
        setMockList((prev) => [newUser, ...prev]);
        toast.success(t("User created", "تم إنشاء المستخدم"));
        setDialogOpen(false);
      }
    }
  }

  function openResetPassword(u: SaaSUser) {
    setResetTarget(u);
    setResetPassword("");
    setResetConfirm("");
    setShowResetPassword(false);
    setResetTouched({ password: false, confirm: false });
  }

  function closeResetPassword() {
    setResetTarget(null);
    setResetPassword("");
    setResetConfirm("");
    setResetTouched({ password: false, confirm: false });
  }

  /** Validate the typed new password. Returns a bilingual error map. */
  function validateReset(): Partial<Record<"password" | "confirm", string>> {
    const errors: Partial<Record<"password" | "confirm", string>> = {};
    if (resetPassword.length < 8) errors.password = "Min 8 characters";
    else if (!/[A-Za-z]/.test(resetPassword))
      errors.password = "Must contain a letter";
    else if (!/\d/.test(resetPassword))
      errors.password = "Must contain a digit";
    if (resetConfirm !== resetPassword) errors.confirm = "Passwords do not match";
    return errors;
  }

  function submitResetPassword() {
    const errors = validateReset();
    if (Object.keys(errors).length > 0) {
      // Mark both fields touched so the inline errors become visible.
      setResetTouched({ password: true, confirm: true });
      return;
    }
    if (!resetTarget) return;
    const typedPassword = resetPassword;
    const target = resetTarget;

    if (api) {
      resetMut.mutate(
        { id: target.id, newPassword: typedPassword },
        {
          onSuccess: (resp) => {
            // Discriminate on the server's success shape:
            //   - mode: "set"  → admin typed the password → show it in the
            //                    copy-to-clipboard dialog.
            //   - mode: "link" → server minted a link (legacy, no body)
            //                    → show the link instead.
            if (resp.mode === "set") {
              setTempPassword({
                username: target.username,
                password: typedPassword,
              });
              toast.success(resp.message || t("Password updated", "تم تحديث كلمة المرور"));
            } else {
              setTempPassword({
                username: target.username,
                password: resp.resetLink,
              });
              toast.success(
                t("Reset link generated", "تم إنشاء رابط إعادة التعيين"),
              );
            }
            closeResetPassword();
          },
          onError: (e) => {
            const m = describeApiError(e, isRtl ? "ar" : "en");
            toast.error(isRtl ? m.ar : m.en);
          },
        },
      );
    } else {
      // Mock mode — no real call. Match the legacy toast copy.
      toast.success(
        t(
          `Password reset link sent to ${target.email}`,
          `تم إرسال رابط إعادة التعيين إلى ${target.email}`,
        ),
      );
      closeResetPassword();
    }
  }

  function handleStatus(u: SaaSUser, target: UserStatus) {
    if (api) {
      const serverRow = usersQuery.data?.data.find((r) => r.id === u.id);
      const vars = { id: u.id, updatedAt: serverRow?.updatedAt };
      const mut = target === "active" ? activateMut : suspendMut;
      mut.mutate(vars, {
        onSuccess: () => {
          toast.success(
            target === "active"
              ? t(`${u.username} activated`, `تم تفعيل ${u.username}`)
              : t(`${u.username} suspended`, `تم تعليق ${u.username}`),
          );
        },
        onError: (e) => {
          const m = describeApiError(e, isRtl ? "ar" : "en");
          toast.error(isRtl ? m.ar : m.en);
        },
      });
    } else {
      setMockList((prev) =>
        prev.map((x) => (x.id === u.id ? { ...x, status: target } : x)),
      );
      toast.success(
        target === "active"
          ? t(`${u.username} activated`, `تم تفعيل ${u.username}`)
          : t(`${u.username} suspended`, `تم تعليق ${u.username}`),
      );
    }
  }

  function openDelete(u: SaaSUser) {
    setDeleteTarget(u);
    setDeleteConfirm("");
  }

  function closeDelete() {
    setDeleteTarget(null);
    setDeleteConfirm("");
  }

  function handleDelete() {
    if (!deleteTarget) return;
    if (deleteConfirm !== deleteTarget.username) return;

    if (api) {
      deleteMut.mutate(
        { id: deleteTarget.id, confirm: deleteConfirm },
        {
          onSuccess: () => {
            toast.success(
              t(
                `User ${deleteTarget.username} deleted`,
                `تم حذف المستخدم ${deleteTarget.username}`,
              ),
            );
            closeDelete();
          },
          onError: (e) => {
            const m = describeApiError(e, isRtl ? "ar" : "en");
            toast.error(isRtl ? m.ar : m.en);
          },
        },
      );
    } else {
      const target = deleteTarget;
      setMockList((prev) => prev.filter((x) => x.id !== target.id));
      toast.success(
        t(`User ${target.username} deleted`, `تم حذف المستخدم ${target.username}`),
      );
      closeDelete();
    }
  }

  function copyToClipboard(text: string) {
    try {
      navigator.clipboard?.writeText(text);
      toast.success(t("Copied to clipboard", "تم النسخ إلى الحافظة"));
    } catch {
      toast.error(t("Copy failed", "فشل النسخ"));
    }
  }

  const loading = api && usersQuery.isLoading;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {t("Users", "المستخدمون")}
          </h1>
          <p className="text-muted-foreground mt-1">
            {t(
              "Create users, assign roles, and manage per-user menu access.",
              "أنشئ المستخدمين وعيّن الأدوار وأدِر وصول القوائم لكل مستخدم.",
            )}
          </p>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="h-4 w-4" />
          {t("Add User", "إضافة مستخدم")}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            {t("All Users", "كل المستخدمين")}{" "}
            <span className="text-muted-foreground text-base font-normal">
              ({loading ? "…" : users.length})
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {api && usersQuery.isError ? (
            <div className="text-sm text-destructive py-4">
              {(() => {
                const m = describeApiError(usersQuery.error, isRtl ? "ar" : "en");
                return isRtl ? m.ar : m.en;
              })()}
            </div>
          ) : (
            <DataTable<SaaSUser>
              data={users}
              columns={columns}
              searchKey="fullNameEn"
              searchPlaceholder={t("Search by name…", "ابحث بالاسم…")}
            />
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {editingId ? t("Edit User", "تعديل مستخدم") : t("Add User", "إضافة مستخدم")}
            </DialogTitle>
            <DialogDescription>
              {editingId
                ? t(
                    "Update the user's details and role.",
                    "حدِّث بيانات المستخدم ودوره.",
                  )
                : t(
                    "Create a new user. A temporary password will be generated and emailed.",
                    "أنشئ مستخدمًا جديدًا. ستُولَّد كلمة مرور مؤقتة وتُرسَل بالبريد.",
                  )}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <Field
              id="fullNameEn"
              label={t("Full Name (English)", "الاسم الكامل (إنجليزي)")}
              error={formErrors.fullNameEn}
              isRtl={isRtl}
            >
              <Input
                id="fullNameEn"
                value={form.fullNameEn}
                onChange={(e) =>
                  setForm((f) => ({ ...f, fullNameEn: e.target.value }))
                }
              />
            </Field>
            <Field
              id="fullNameAr"
              label={t("Full Name (Arabic, optional)", "الاسم الكامل (عربي، اختياري)")}
              isRtl={isRtl}
            >
              <Input
                id="fullNameAr"
                value={form.fullNameAr}
                onChange={(e) =>
                  setForm((f) => ({ ...f, fullNameAr: e.target.value }))
                }
                dir="rtl"
              />
            </Field>
            <Field
              id="email"
              label={t("Email", "البريد الإلكتروني")}
              error={formErrors.email}
              isRtl={isRtl}
            >
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={(e) =>
                  setForm((f) => ({ ...f, email: e.target.value }))
                }
              />
            </Field>
            <Field
              id="username"
              label={t("Username", "اسم المستخدم")}
              error={formErrors.username}
              isRtl={isRtl}
            >
              <Input
                id="username"
                value={form.username}
                onChange={(e) =>
                  setForm((f) => ({ ...f, username: e.target.value }))
                }
              />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label className="text-sm font-medium">
                  {t("Role", "الدور")}
                </Label>
                <Select
                  value={form.role}
                  onValueChange={(v) =>
                    setForm((f) => ({ ...f, role: v as Role }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="superadmin">
                      {t("Super Admin", "مدير عام")}
                    </SelectItem>
                    {roleAdmin.list().map((r) => (
                      <SelectItem key={r.slug} value={r.slug}>
                        {isRtl ? r.labelAr : r.labelEn}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label className="text-sm font-medium">
                  {t("Status", "الحالة")}
                </Label>
                <Select
                  value={form.status}
                  onValueChange={(v) =>
                    setForm((f) => ({ ...f, status: v as UserStatus }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_VALUES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              {t("Cancel", "إلغاء")}
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={api && (createMut.isPending || updateMut.isPending)}
            >
              {editingId ? t("Save", "حفظ") : t("Create", "إنشاء")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* One-time credential dialog — surfaces the tempPassword (POST 201)
          or the reset link (POST .../reset-password) for copy-to-clipboard. */}
      <Dialog
        open={tempPassword !== null}
        onOpenChange={(open) => {
          if (!open) setTempPassword(null);
        }}
      >
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>
              {t("Save these credentials", "احفظ بيانات الاعتماد هذه")}
            </DialogTitle>
            <DialogDescription>
              {t(
                "This will only be shown once. Copy the value below and share it securely.",
                "ستظهر هذه القيمة مرة واحدة فقط. انسخها أدناه وشارِكها بأمان.",
              )}
            </DialogDescription>
          </DialogHeader>
          {tempPassword && (
            <div className="grid gap-3 py-2">
              <div className="text-sm text-muted-foreground">
                {t("Username", "اسم المستخدم")}: <span className="font-mono">{tempPassword.username}</span>
              </div>
              <div className="flex items-center gap-2">
                <code className="flex-1 break-all rounded border bg-muted/40 px-3 py-2 text-sm font-mono">
                  {tempPassword.password}
                </code>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => copyToClipboard(tempPassword.password)}
                  title={t("Copy", "نسخ")}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setTempPassword(null)}>
              {t("Done", "تم")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* "Set new password" dialog (admin-side reset flow).
          The admin types a new password for the target user, optionally
          revealing it via the eye toggle, and we POST it to the same
          /admin/users/:id/reset-password endpoint. */}
      <Dialog
        open={resetTarget !== null}
        onOpenChange={(open) => {
          if (!open) closeResetPassword();
        }}
      >
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>
              {t("Set new password", "عيّن كلمة مرور جديدة")}
            </DialogTitle>
            <DialogDescription>
              {resetTarget &&
                t(
                  `Set a new password for ${resetTarget.fullNameEn} (@${resetTarget.username}).`,
                  `عيّن كلمة مرور جديدة لـ ${resetTarget.fullNameAr || resetTarget.fullNameEn} (@${resetTarget.username}).`,
                )}
            </DialogDescription>
          </DialogHeader>

          {(() => {
            const errors = validateReset();
            const passwordError =
              resetTouched.password ? errors.password : undefined;
            const confirmError =
              resetTouched.confirm ? errors.confirm : undefined;
            const hasErrors = Object.keys(errors).length > 0;
            return (
              <div className="grid gap-4 py-2">
                <div className="grid gap-1.5">
                  <Label htmlFor="resetPassword" className="text-sm font-medium">
                    {t("New password", "كلمة المرور الجديدة")}
                  </Label>
                  <div className="relative">
                    <Input
                      id="resetPassword"
                      type={showResetPassword ? "text" : "password"}
                      value={resetPassword}
                      onChange={(e) => setResetPassword(e.target.value)}
                      onBlur={() =>
                        setResetTouched((t) => ({ ...t, password: true }))
                      }
                      autoComplete="new-password"
                      dir="ltr"
                      className="pe-9"
                    />
                    <button
                      type="button"
                      onClick={() => setShowResetPassword((v) => !v)}
                      className="absolute inset-y-0 end-0 flex items-center px-3 text-muted-foreground hover:text-foreground"
                      title={
                        showResetPassword
                          ? t("Hide password", "إخفاء كلمة المرور")
                          : t("Show password", "إظهار كلمة المرور")
                      }
                      tabIndex={-1}
                    >
                      {showResetPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                  {passwordError && (
                    <span className="text-xs text-destructive">
                      {isRtl ? "خطأ" : passwordError}
                    </span>
                  )}
                </div>

                <div className="grid gap-1.5">
                  <Label htmlFor="resetConfirm" className="text-sm font-medium">
                    {t("Confirm new password", "تأكيد كلمة المرور الجديدة")}
                  </Label>
                  <Input
                    id="resetConfirm"
                    type={showResetPassword ? "text" : "password"}
                    value={resetConfirm}
                    onChange={(e) => setResetConfirm(e.target.value)}
                    onBlur={() =>
                      setResetTouched((t) => ({ ...t, confirm: true }))
                    }
                    autoComplete="new-password"
                    dir="ltr"
                  />
                  {confirmError && (
                    <span className="text-xs text-destructive">
                      {isRtl ? "خطأ" : confirmError}
                    </span>
                  )}
                </div>

                <p className="text-xs text-muted-foreground">
                  {t(
                    "Min 8 characters, must contain a letter and a digit.",
                    "٨ أحرف على الأقل، يجب أن تحتوي على حرف ورقم.",
                  )}
                </p>
              </div>
            );
          })()}

          <DialogFooter>
            <Button variant="outline" onClick={closeResetPassword}>
              {t("Cancel", "إلغاء")}
            </Button>
            <Button
              onClick={submitResetPassword}
              disabled={(() => {
                const errors = validateReset();
                return (
                  (api && resetMut.isPending) ||
                  Object.keys(errors).length > 0
                );
              })()}
            >
              {t("Save", "حفظ")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Hard-delete confirmation — requires the caller to type the
          username. The backend enforces the same check via
          `?confirm=<username>` (spec §1.5). */}
      <Dialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) closeDelete();
        }}
      >
        <DialogContent className="sm:max-w-[460px]">
          <DialogHeader>
            <DialogTitle className="text-destructive">
              {t("Delete user permanently?", "حذف المستخدم نهائيًا؟")}
            </DialogTitle>
            <DialogDescription>
              {deleteTarget &&
                t(
                  `This will permanently remove ${deleteTarget.fullNameEn} (@${deleteTarget.username}) from the system. This action cannot be undone.`,
                  `سيؤدي ذلك إلى إزالة ${deleteTarget.fullNameAr} (@${deleteTarget.username}) من النظام نهائيًا. لا يمكن التراجع عن هذا الإجراء.`,
                )}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-2 py-2">
            <Label htmlFor="deleteConfirm" className="text-sm font-medium">
              {t(
                `Type "${deleteTarget?.username ?? ""}" to confirm:`,
                `اكتب "${deleteTarget?.username ?? ""}" للتأكيد:`,
              )}
            </Label>
            <Input
              id="deleteConfirm"
              value={deleteConfirm}
              onChange={(e) => setDeleteConfirm(e.target.value)}
              autoComplete="off"
              dir="ltr"
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeDelete}>
              {t("Cancel", "إلغاء")}
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={
                deleteConfirm !== deleteTarget?.username ||
                (api && deleteMut.isPending)
              }
            >
              {t("Delete permanently", "حذف نهائي")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Field({
  id,
  label,
  error,
  isRtl,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  isRtl: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id} className="text-sm font-medium">
        {label}
      </Label>
      {children}
      {error && (
        <span className="text-xs text-destructive">
          {isRtl ? "خطأ" : error}
        </span>
      )}
    </div>
  );
}