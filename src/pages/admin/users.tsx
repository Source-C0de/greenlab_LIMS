import { useMemo, useState } from "react";
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
import { Plus, Pencil, KeyRound, Ban, CheckCircle2, Trash2 } from "lucide-react";
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

const STATUS_VALUES: UserStatus[] = ["active", "trial", "suspended", "disabled"];

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
  if (form.fullNameAr.length < 2) errors.fullNameAr = "Required";
  return errors;
}

export default function UsersAdmin() {
  const { language } = useAppContext();
  const isRtl = language === "ar";
  const [, setLocation] = useLocation();
  const roleAdmin = useRoleAdmin();

  const [users, setUsers] = useState<SaaSUser[]>(mockUsers);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState<
    Partial<Record<keyof FormState, string>>
  >({});

  // Delete confirmation state — typed username confirmation is required.
  const [deleteTarget, setDeleteTarget] = useState<SaaSUser | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState("");

  const t = (en: string, ar: string) => (isRtl ? ar : en);

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
          // superadmin isn't in the toggleable registry.
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
                handleResetPassword(u);
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
    [isRtl],
  );

  function openCreate() {
    setEditingId(null);
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
    setDialogOpen(true);
  }

  function handleSubmit() {
    const errors = validate(form);
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }
    if (editingId) {
      setUsers((prev) =>
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
    } else {
      const nextId = `U${String(users.length + 1).padStart(3, "0")}`;
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
      setUsers((prev) => [newUser, ...prev]);
      toast.success(t("User created", "تم إنشاء المستخدم"));
    }
    setDialogOpen(false);
  }

  function handleResetPassword(u: SaaSUser) {
    // Stub: in real API mode, this would call POST /admin/users/{id}/reset-password.
    toast.success(
      t(
        `Password reset link sent to ${u.email}`,
        `تم إرسال رابط إعادة التعيين إلى ${u.email}`,
      ),
    );
  }

  function handleStatus(u: SaaSUser, target: UserStatus) {
    setUsers((prev) =>
      prev.map((x) => (x.id === u.id ? { ...x, status: target } : x)),
    );
    toast.success(
      target === "active"
        ? t(`${u.username} activated`, `تم تفعيل ${u.username}`)
        : t(`${u.username} suspended`, `تم تعليق ${u.username}`),
    );
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
    // Typed-confirmation guard — UI mirror of the backend's
    // hard-delete endpoint. Backend must also enforce the
    // `?confirm=<username>` query param to prevent accidental
    // deletes from mis-clicks or automation.
    if (deleteConfirm !== deleteTarget.username) return;
    const target = deleteTarget;
    setUsers((prev) => prev.filter((x) => x.id !== target.id));
    toast.success(
      t(`User ${target.username} deleted`, `تم حذف المستخدم ${target.username}`),
    );
    closeDelete();
  }

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
              ({users.length})
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable<SaaSUser>
            data={users}
            columns={columns}
            searchKey="fullNameEn"
            searchPlaceholder={t("Search by name…", "ابحث بالاسم…")}
          />
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
              label={t("Full Name (Arabic)", "الاسم الكامل (عربي)")}
              error={formErrors.fullNameAr}
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
            <Button onClick={handleSubmit}>
              {editingId ? t("Save", "حفظ") : t("Create", "إنشاء")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Hard-delete confirmation — requires the caller to type the
          username. The backend enforces the same check via a
          `?confirm=<username>` query param (see docs/api/users.md §3.1). */}
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
              disabled={deleteConfirm !== deleteTarget?.username}
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