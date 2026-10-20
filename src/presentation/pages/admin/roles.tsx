import { useState, useMemo } from "react";
import { useAppContext } from "@/presentation/providers/AppContext";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import { Pencil, Archive, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { RolePermissionMatrix } from "@/presentation/components/features/admin/PermissionMatrix";
import { useRoleMenuMatrix } from "@/presentation/hooks/useRoleMenuMatrix";
import { useRoleAdmin, SLUG_PATTERN, type CreateRoleError } from "@/presentation/hooks/useRoleAdmin";
import {
  useRoleRegistry,
  ICON_PICKER,
} from "@/presentation/hooks/useRoleRegistry";
import { type ToggleableRole } from "@/infrastructure/mock/data/rolePermissions";
import { isApiEnabled } from "@/infrastructure/api/api";
import {
  useRoles,
  useUpdateRole,
  useSetRoleStatus,
  useCreateRole,
  useDeleteRole,
  useAdminMenuKeys,
  usePutRoleMenuPermissions,
} from "@/infrastructure/api/tanstack-queries";
import { describeApiError } from "@/infrastructure/api/errors";
import { SEED_ADMIN_MENU_KEYS, type AdminMenuKey } from "@/shared/lib/adminMenuKeys";
import type { Role as ApiRole, RoleIconName } from "@/infrastructure/api/clients/rolesApi";

interface EditForm {
  labelEn: string;
  labelAr: string;
  descriptionEn: string;
  descriptionAr: string;
  iconName: string;
}

const EMPTY_EDIT: EditForm = {
  labelEn: "",
  labelAr: "",
  descriptionEn: "",
  descriptionAr: "",
  iconName: "ShieldCheck",
};

const EMPTY_ADD: EditForm & { slug: string } = {
  slug: "",
  labelEn: "",
  labelAr: "",
  descriptionEn: "",
  descriptionAr: "",
  iconName: "ShieldCheck",
};

const ERROR_MESSAGES_EN: Record<CreateRoleError, string> = {
  "slug-required": "Slug is required",
  "slug-invalid": "Use snake_case, 2–32 chars, start with a letter",
  "slug-collision-fixed": "This slug is reserved by a built-in role",
  "slug-collision-existing": "A role with this slug already exists",
  "label-required": "Required",
  "label-ar-required": "Required (Arabic)",
  "description-required": "Required",
  "description-ar-required": "Required (Arabic)",
  "icon-required": "Required",
};

const ERROR_MESSAGES_AR: Record<CreateRoleError, string> = {
  "slug-required": "المعرّف مطلوب",
  "slug-invalid": "استخدم snake_case، من 2 إلى 32 حرفًا، يبدأ بحرف",
  "slug-collision-fixed": "هذا المعرّف محجوز لدور مدمج",
  "slug-collision-existing": "يوجد دور بهذا المعرّف بالفعل",
  "label-required": "مطلوب",
  "label-ar-required": "مطلوب (عربي)",
  "description-required": "مطلوب",
  "description-ar-required": "مطلوب (عربي)",
  "icon-required": "مطلوب",
};

export default function RolesAdmin() {
  const { language } = useAppContext();
  const isRtl = language === "ar";
  const t = (en: string, ar: string) => (isRtl ? ar : en);

  const api = isApiEnabled();

  // ---------------------------------------------------------------------
  // Data layer.
  // ---------------------------------------------------------------------
  const localMatrix = useRoleMenuMatrix();
  const localRoleAdmin = useRoleAdmin();
  const localRegistry = useRoleRegistry();
  const rolesQuery = useRoles();
  const updateMut = useUpdateRole();
  const setStatusMut = useSetRoleStatus();
  const createMut = useCreateRole();
  const deleteMut = useDeleteRole();
  const menuKeysQuery = useAdminMenuKeys();
  const putMatrixMut = usePutRoleMenuPermissions();

  // The list of roles to render. In API mode the server is the source of
  // truth. In mock mode, the registry's seed + custom list.
  const apiRoles: ApiRole[] = rolesQuery.data ?? [];
  const mockRoleList = localRoleAdmin.list();

  // Snapshot of the role being edited (for the If-Match header).
  const [editingUpdatedAt, setEditingUpdatedAt] = useState<string | null>(null);

  // ---------------------------------------------------------------------
  // Resolved view-model — one shape regardless of mode.
  // ---------------------------------------------------------------------
  interface RoleVM {
    slug: string;
    labelEn: string;
    labelAr: string;
    descriptionEn: string;
    descriptionAr: string;
    iconName: string;
    isActive: boolean;
    isCustom: boolean;
    updatedAt: string;
  }

  const roleList: RoleVM[] = api
    ? apiRoles.map((r) => ({
        slug: r.role,
        labelEn: r.labelEn,
        labelAr: r.labelAr,
        descriptionEn: r.descriptionEn,
        descriptionAr: r.descriptionAr,
        iconName: r.iconName,
        isActive: r.isActive,
        isCustom: r.isCustom,
        updatedAt: r.updatedAt,
      }))
    : mockRoleList.map((r) => ({
        slug: r.slug,
        labelEn: r.labelEn,
        labelAr: r.labelAr,
        descriptionEn: r.descriptionEn,
        descriptionAr: r.descriptionAr,
        iconName: r.iconName,
        isActive: !localRoleAdmin.isArchived(r.slug),
        isCustom: !localRoleAdmin.isFixed(r.slug),
        // No real updatedAt in mock mode; supply a stable value for parity.
        updatedAt: "mock",
      }));

  function getRole(slug: string): RoleVM | undefined {
    return roleList.find((r) => r.slug === slug);
  }

  function isFixed(slug: string): boolean {
    if (api) {
      const r = apiRoles.find((x) => x.role === slug);
      return r ? !r.isCustom : false;
    }
    return localRoleAdmin.isFixed(slug);
  }

  function isArchived(slug: string): boolean {
    const r = getRole(slug);
    return r ? !r.isActive : false;
  }

  // The matrix needs an `isRoleEnabled` predicate. In API mode the answer
  // is fetched per-role; in mock mode it comes from the local store.
  const matrixKeys: AdminMenuKey[] = api
    ? (menuKeysQuery.data?.map((k) => ({
        key: k.key,
        labelEn: k.labelEn,
        labelAr: k.labelAr,
        group: k.group,
        href: k.href,
        displayOrder: k.displayOrder,
      })) ?? SEED_ADMIN_MENU_KEYS)
    : SEED_ADMIN_MENU_KEYS;

  const matrixRoles = useMemo(() => roleList.map((r) => r.slug), [roleList]);

  // ---------------------------------------------------------------------
  // Dialog state.
  // ---------------------------------------------------------------------
  const [editingRole, setEditingRole] = useState<ToggleableRole | null>(null);
  const [editForm, setEditForm] = useState<EditForm>(EMPTY_EDIT);
  const [editErrors, setEditErrors] = useState<Partial<Record<keyof EditForm, string>>>({});

  const [archiveRole, setArchiveRole] = useState<ToggleableRole | null>(null);
  const [archiveConfirm, setArchiveConfirm] = useState("");

  const [addOpen, setAddOpen] = useState(false);
  const [addForm, setAddForm] = useState(EMPTY_ADD);
  const [addError, setAddError] = useState<CreateRoleError | null>(null);
  const [addSlugTouched, setAddSlugTouched] = useState(false);

  const [deleteRole, setDeleteRole] = useState<ToggleableRole | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState("");

  // ---------------------------------------------------------------------
  // Handlers.
  // ---------------------------------------------------------------------

  function openEdit(role: ToggleableRole) {
    const meta = getRole(role);
    if (!meta) return;
    setEditingRole(role);
    setEditForm({
      labelEn: meta.labelEn,
      labelAr: meta.labelAr,
      descriptionEn: meta.descriptionEn,
      descriptionAr: meta.descriptionAr,
      iconName: meta.iconName,
    });
    setEditingUpdatedAt(meta.updatedAt);
    setEditErrors({});
  }

  function closeEdit() {
    setEditingRole(null);
    setEditForm(EMPTY_EDIT);
    setEditingUpdatedAt(null);
    setEditErrors({});
  }

  function validateEdit(form: EditForm): Partial<Record<keyof EditForm, string>> {
    const errs: Partial<Record<keyof EditForm, string>> = {};
    if (form.labelEn.trim().length < 2) errs.labelEn = "Required";
    if (form.labelAr.trim().length < 2) errs.labelAr = "Required";
    if (form.descriptionEn.trim().length < 4) errs.descriptionEn = "Required";
    if (form.descriptionAr.trim().length < 4) errs.descriptionAr = "Required";
    if (!ICON_PICKER.some((i) => i.name === form.iconName)) errs.iconName = "Invalid icon";
    return errs;
  }

  function handleEditSave() {
    if (!editingRole) return;
    const errs = validateEdit(editForm);
    if (Object.keys(errs).length > 0) {
      setEditErrors(errs);
      return;
    }
    if (api) {
      updateMut.mutate(
        {
          slug: editingRole,
          body: {
            labelEn: editForm.labelEn,
            labelAr: editForm.labelAr,
            descriptionEn: editForm.descriptionEn,
            descriptionAr: editForm.descriptionAr,
            iconName: editForm.iconName as RoleIconName,
          },
          updatedAt: editingUpdatedAt ?? undefined,
        },
        {
          onSuccess: () => {
            toast.success(t("Role updated", "تم تحديث الدور"));
            closeEdit();
          },
          onError: (e) => {
            const m = describeApiError(e, isRtl ? "ar" : "en");
            toast.error(isRtl ? m.ar : m.en);
          },
        },
      );
    } else {
      localRegistry.updateMeta(editingRole, editForm);
      toast.success(t("Role updated", "تم تحديث الدور"));
      closeEdit();
    }
  }

  function openArchive(role: ToggleableRole) {
    setArchiveRole(role);
    setArchiveConfirm("");
  }

  function closeArchive() {
    setArchiveRole(null);
    setArchiveConfirm("");
  }

  function handleArchiveConfirm() {
    if (!archiveRole) return;
    const meta = getRole(archiveRole);
    if (!meta) return;
    const expected = isRtl ? meta.labelAr : meta.labelEn;
    if (archiveConfirm.trim() !== expected) return;
    if (api) {
      setStatusMut.mutate(
        { slug: archiveRole, body: { isActive: false } },
        {
          onSuccess: () => {
            toast.success(t("Role archived", "تم أرشفة الدور") + `: ${expected}`);
            closeArchive();
          },
          onError: (e) => {
            const m = describeApiError(e, isRtl ? "ar" : "en");
            toast.error(isRtl ? m.ar : m.en);
          },
        },
      );
    } else {
      localRoleAdmin.archive(archiveRole);
      toast.success(t("Role archived", "تم أرشفة الدور") + `: ${expected}`);
      closeArchive();
    }
  }

  function handleRestore(role: ToggleableRole) {
    const meta = getRole(role);
    if (!meta) return;
    const label = isRtl ? meta.labelAr : meta.labelEn;
    if (api) {
      setStatusMut.mutate(
        { slug: role, body: { isActive: true } },
        {
          onSuccess: () => {
            toast.success(t("Role restored", "تمت استعادة الدور") + `: ${label}`);
          },
          onError: (e) => {
            const m = describeApiError(e, isRtl ? "ar" : "en");
            toast.error(isRtl ? m.ar : m.en);
          },
        },
      );
    } else {
      localRoleAdmin.restore(role);
      toast.success(t("Role restored", "تمت استعادة الدور") + `: ${label}`);
    }
  }

  // --- Add Role handlers ---
  function openAdd() {
    setAddForm(EMPTY_ADD);
    setAddError(null);
    setAddSlugTouched(false);
    setAddOpen(true);
  }

  function closeAdd() {
    setAddOpen(false);
    setAddForm(EMPTY_ADD);
    setAddError(null);
    setAddSlugTouched(false);
  }

  function liveSlugError(slug: string): CreateRoleError | null {
    if (slug.length === 0) return null;
    if (!SLUG_PATTERN.test(slug)) return "slug-invalid";
    if (getRole(slug)) return "slug-collision-existing";
    return null;
  }

  function handleAddSubmit() {
    setAddSlugTouched(true);
    const err = localRoleAdmin.validateCreate(addForm);
    if (err) {
      setAddError(err);
      return;
    }
    if (api) {
      createMut.mutate(
        {
          slug: addForm.slug,
          labelEn: addForm.labelEn,
          labelAr: addForm.labelAr,
          descriptionEn: addForm.descriptionEn,
          descriptionAr: addForm.descriptionAr,
          iconName: addForm.iconName as RoleIconName,
        },
        {
          onSuccess: (row) => {
            const label = isRtl ? row.labelAr : row.labelEn;
            toast.success(t("Role created", "تم إنشاء الدور") + `: ${label}`);
            closeAdd();
          },
          onError: (e) => {
            const m = describeApiError(e, isRtl ? "ar" : "en");
            // Translate known spec codes to the form's typed errors when
            // possible so the live validation UX is consistent.
            const code = (e as { body?: { error?: { code?: string } } })?.body?.error?.code;
            if (code === "slug_reserved") setAddError("slug-collision-fixed");
            else if (code === "duplicate_slug") setAddError("slug-collision-existing");
            else if (code === "validation") {
              // Backend says the body failed validation; the local form
              // validator should have caught it, so we just toast the
              // server message and keep the form open.
              setAddError(null);
              toast.error(isRtl ? m.ar : m.en);
            } else {
              setAddError(null);
              toast.error(isRtl ? m.ar : m.en);
            }
          },
        },
      );
    } else {
      try {
        const created = localRoleAdmin.create(addForm);
        const createdMeta = localRegistry.getMeta(created.slug);
        const label = createdMeta
          ? isRtl
            ? createdMeta.labelAr
            : createdMeta.labelEn
          : created.slug;
        toast.success(t("Role created", "تم إنشاء الدور") + `: ${label}`);
        closeAdd();
      } catch (e) {
        const msg = e instanceof Error ? e.message : "unknown";
        setAddError(msg as CreateRoleError);
      }
    }
  }

  // --- Delete handlers (custom roles only) ---
  function openDelete(role: ToggleableRole) {
    setDeleteRole(role);
    setDeleteConfirm("");
  }

  function closeDelete() {
    setDeleteRole(null);
    setDeleteConfirm("");
  }

  function handleDeleteConfirm() {
    if (!deleteRole) return;
    if (isFixed(deleteRole)) return;
    const meta = getRole(deleteRole);
    if (!meta) return;
    const expected = isRtl ? meta.labelAr : meta.labelEn;
    if (deleteConfirm.trim() !== expected) return;
    const slug = deleteRole;
    if (api) {
      deleteMut.mutate(slug, {
        onSuccess: () => {
          toast.success(t("Role deleted", "تم حذف الدور") + `: ${expected}`);
          closeDelete();
        },
        onError: (e) => {
          const m = describeApiError(e, isRtl ? "ar" : "en");
          toast.error(isRtl ? m.ar : m.en);
        },
      });
    } else {
      try {
        localRoleAdmin.hardDelete(slug);
        toast.success(t("Role deleted", "تم حذف الدور") + `: ${expected}`);
        closeDelete();
      } catch {
        toast.error(t("Could not delete role", "تعذّر حذف الدور"));
      }
    }
  }

  // For the matrix, in API mode we keep the local store as a UI buffer
  // and PUT the full matrix for that role on every cell toggle. In mock
  // mode we use the existing local matrix hook directly.
  function isRoleEnabledForMatrix(role: string, key: string): boolean {
    return localMatrix.isRoleEnabled(
      role,
      key as Parameters<typeof localMatrix.isRoleEnabled>[1],
    );
  }
  function toggleMatrixCell(role: string, key: string) {
    const current = localMatrix.getRoleKeys(role);
    // `getRoleKeys(role: string): MenuKey[]` — MenuKey is the *return* element
    // type, not a parameter, so it comes from `ReturnType<...>[number]`.
    const typedKey = key as ReturnType<typeof localMatrix.getRoleKeys>[number];
    const next = current.includes(typedKey)
      ? current.filter((k) => k !== typedKey)
      : [...current, typedKey];
    if (api) {
      // Mirror locally so the UI updates immediately, then PUT the
      // full new matrix. Cells are sent as a complete replace per spec.
      localMatrix.setRole(role, next);
      putMatrixMut.mutate(
        { slug: role, body: { cells: next.map((k) => ({ menuKey: k, enabled: true })) } },
        {
          onError: (e) => {
            const m = describeApiError(e, isRtl ? "ar" : "en");
            toast.error(isRtl ? m.ar : m.en);
            // Revert on failure.
            localMatrix.setRole(role, current);
          },
        },
      );
    } else {
      localMatrix.toggle(role, typedKey);
    }
  }

  const errorText = (code: CreateRoleError) =>
    isRtl ? ERROR_MESSAGES_AR[code] : ERROR_MESSAGES_EN[code];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {t("Role Permissions", "إدارة الأدوار")}
          </h1>
          <p className="text-muted-foreground mt-1">
            {t(
              "Edit role labels and descriptions, archive unused roles, and configure which menu items each role sees by default. Per-user overrides can be applied on top of these defaults.",
              "عدِّل تسميات الأدوار وأوصافها، وأرشف الأدوات غير المستخدمة، واضبط عناصر القائمة الافتراضية لكل دور.",
            )}
          </p>
        </div>
        <Button onClick={openAdd} className="gap-2">
          <Plus className="h-4 w-4" />
          {t("Add Role", "إضافة دور")}
        </Button>
      </div>

      {/* Role cards — seeds + custom roles with bilingual labels + icons. */}
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {roleList.map((entry) => {
          const Icon = localRegistry.getIcon(entry.slug as ToggleableRole);
          const archived = !entry.isActive;
          const isCustom = entry.isCustom;
          const cardLabel = isRtl ? entry.labelAr : entry.labelEn;
          return (
            <Card
              key={entry.slug}
              data-testid={`role-card-${entry.slug}`}
              className={archived ? "opacity-60" : undefined}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-md bg-primary/10 flex items-center justify-center text-primary shrink-0">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <CardTitle className="text-base flex items-center gap-2 flex-wrap">
                      <span>{cardLabel}</span>
                      {isCustom && (
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                          {t("Custom", "مخصص")}
                        </span>
                      )}
                      {archived && (
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                          {t("Archived", "مؤرشف")}
                        </span>
                      )}
                    </CardTitle>
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                      {isRtl ? entry.descriptionAr : entry.descriptionEn}
                    </p>
                    <p className="text-[10px] text-muted-foreground font-mono mt-1">
                      {entry.slug}
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openEdit(entry.slug)}
                  className="gap-2"
                >
                  <Pencil className="h-3.5 w-3.5" />
                  {t("Edit", "تعديل")}
                </Button>
                {archived ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleRestore(entry.slug)}
                  >
                    {t("Restore", "استعادة")}
                  </Button>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openArchive(entry.slug)}
                    className="gap-2 text-destructive hover:text-destructive"
                  >
                    <Archive className="h-3.5 w-3.5" />
                    {t("Archive", "أرشفة")}
                  </Button>
                )}
                {isCustom && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openDelete(entry.slug)}
                    className="gap-2 text-destructive hover:text-destructive ms-auto"
                    data-testid={`role-delete-${entry.slug}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    {t("Delete", "حذف")}
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            {t("Menu Permission Matrix", "مصفوفة صلاحيات القائمة")}
          </CardTitle>
          <CardDescription>
            {t(
              `${roleList.length} roles × ${matrixKeys.length} menu items. Changes save automatically to the browser.`,
              `${roleList.length} أدوار × ${matrixKeys.length} عنصر قائمة. تُحفظ التغييرات تلقائيًا في المتصفح.`,
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RolePermissionMatrix
            roles={matrixRoles}
            isRoleEnabled={isRoleEnabledForMatrix}
            toggle={toggleMatrixCell}
            resetAll={localMatrix.resetAll}
            menuKeys={matrixKeys}
          />
        </CardContent>
      </Card>

      {/* Edit dialog */}
      <Dialog
        open={editingRole !== null}
        onOpenChange={(open) => {
          if (!open) closeEdit();
        }}
      >
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>
              {t("Edit Role", "تعديل الدور")}
            </DialogTitle>
            <DialogDescription>
              {t(
                "Update the role's display label, description, and icon. The slug is immutable.",
                "حدِّث تسمية الدور ووصفه وأيقونته. المعرّف (slug) غير قابل للتغيير.",
              )}
            </DialogDescription>
          </DialogHeader>

          {editingRole && (
            <div className="grid gap-4 py-2">
              <div className="grid gap-1.5">
                <Label className="text-sm font-medium">
                  {t("Slug (read-only)", "المعرّف (للقراءة فقط)")}
                </Label>
                <Input value={editingRole} readOnly disabled dir="ltr" />
              </div>

              <EditField
                id="labelEn"
                label={t("Label (English)", "التسمية (إنجليزي)")}
                error={editErrors.labelEn}
                isRtl={isRtl}
              >
                <Input
                  id="labelEn"
                  value={editForm.labelEn}
                  onChange={(e) =>
                    setEditForm((f) => ({ ...f, labelEn: e.target.value }))
                  }
                />
              </EditField>
              <EditField
                id="labelAr"
                label={t("Label (Arabic)", "التسمية (عربي)")}
                error={editErrors.labelAr}
                isRtl={isRtl}
              >
                <Input
                  id="labelAr"
                  value={editForm.labelAr}
                  onChange={(e) =>
                    setEditForm((f) => ({ ...f, labelAr: e.target.value }))
                  }
                  dir="rtl"
                />
              </EditField>
              <EditField
                id="descriptionEn"
                label={t("Description (English)", "الوصف (إنجليزي)")}
                error={editErrors.descriptionEn}
                isRtl={isRtl}
              >
                <Input
                  id="descriptionEn"
                  value={editForm.descriptionEn}
                  onChange={(e) =>
                    setEditForm((f) => ({
                      ...f,
                      descriptionEn: e.target.value,
                    }))
                  }
                />
              </EditField>
              <EditField
                id="descriptionAr"
                label={t("Description (Arabic)", "الوصف (عربي)")}
                error={editErrors.descriptionAr}
                isRtl={isRtl}
              >
                <Input
                  id="descriptionAr"
                  value={editForm.descriptionAr}
                  onChange={(e) =>
                    setEditForm((f) => ({
                      ...f,
                      descriptionAr: e.target.value,
                    }))
                  }
                  dir="rtl"
                />
              </EditField>

              <div className="grid gap-1.5">
                <Label className="text-sm font-medium">
                  {t("Icon", "الأيقونة")}
                </Label>
                <Select
                  value={editForm.iconName}
                  onValueChange={(v) =>
                    setEditForm((f) => ({ ...f, iconName: v }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ICON_PICKER.map((p) => {
                      const PickerIcon = p.icon;
                      return (
                        <SelectItem key={p.name} value={p.name}>
                          <span className="flex items-center gap-2">
                            <PickerIcon className="h-4 w-4" />
                            <span>
                              {isRtl ? p.labelAr : p.labelEn}
                            </span>
                          </span>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => {
                if (!editingRole) return;
                if (!api) localRegistry.resetMeta(editingRole);
                closeEdit();
              }}
              disabled={!editingRole}
            >
              {t("Reset", "إعادة تعيين")}
            </Button>
            <Button variant="outline" onClick={closeEdit}>
              {t("Cancel", "إلغاء")}
            </Button>
            <Button
              onClick={handleEditSave}
              disabled={api && updateMut.isPending}
            >
              {t("Save", "حفظ")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Archive dialog — destructive, typed-confirm */}
      <Dialog
        open={archiveRole !== null}
        onOpenChange={(open) => {
          if (!open) closeArchive();
        }}
      >
        <DialogContent className="sm:max-w-[460px]">
          <DialogHeader>
            <DialogTitle className="text-destructive">
              {t("Archive role?", "أرشفة الدور؟")}
            </DialogTitle>
            <DialogDescription>
              {archiveRole && (
                <>
                  {t(
                    `Archiving hides the role from the login page and the role-switcher dropdown. Existing users with this role will see a forced-logout banner on next request. The role row is preserved and can be restored later.`,
                    `ستخفي الأرشفة الدور من صفحة تسجيل الدخول ومن قائمة تبديل الدور. سترى حسابات المستخدمين الحاليين بهذا الدور رسالة إجبار على تسجيل الخروج في الطلب التالي. يُحفظ صف الدور ويمكن استعادته لاحقًا.`,
                  )}
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          {archiveRole && (
            <div className="grid gap-2 py-2">
              <Label htmlFor="archiveConfirm" className="text-sm font-medium">
                {(() => {
                  const meta = getRole(archiveRole);
                  if (!meta) return null;
                  const label = isRtl ? meta.labelAr : meta.labelEn;
                  return t(
                    `Type "${label}" to confirm:`,
                    `اكتب "${label}" للتأكيد:`,
                  );
                })()}
              </Label>
              <Input
                id="archiveConfirm"
                value={archiveConfirm}
                onChange={(e) => setArchiveConfirm(e.target.value)}
                autoComplete="off"
                dir={isRtl ? "rtl" : "ltr"}
              />
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={closeArchive}>
              {t("Cancel", "إلغاء")}
            </Button>
            <Button
              variant="destructive"
              onClick={handleArchiveConfirm}
              disabled={(() => {
                if (!archiveRole) return true;
                const meta = getRole(archiveRole);
                if (!meta) return true;
                const expected = isRtl ? meta.labelAr : meta.labelEn;
                return archiveConfirm.trim() !== expected;
              })()}
            >
              {t("Archive role", "أرشفة الدور")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Role dialog — create a new custom role. */}
      <Dialog
        open={addOpen}
        onOpenChange={(open) => {
          if (!open) closeAdd();
        }}
      >
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>{t("Add Role", "إضافة دور")}</DialogTitle>
            <DialogDescription>
              {t(
                "Create a new role. Pick a unique snake_case slug — it cannot be changed after creation.",
                "أنشئ دورًا جديدًا. اختر معرّفًا فريدًا بصيغة snake_case — لا يمكن تغييره بعد الإنشاء.",
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <EditField
              id="addSlug"
              label={t("Slug (snake_case)", "المعرّف (snake_case)")}
              error={
                addSlugTouched || addError
                  ? (() => {
                      const live = liveSlugError(addForm.slug);
                      if (live) return errorText(live);
                      if (addError && addError.startsWith("slug-"))
                        return errorText(addError);
                      return undefined;
                    })()
                  : undefined
              }
              isRtl={isRtl}
            >
              <Input
                id="addSlug"
                value={addForm.slug}
                onChange={(e) => {
                  setAddForm((f) => ({ ...f, slug: e.target.value }));
                  if (!addSlugTouched) setAddSlugTouched(true);
                  if (addError) setAddError(null);
                }}
                dir="ltr"
                placeholder="qa_supervisor"
                autoComplete="off"
                spellCheck={false}
              />
            </EditField>

            <EditField
              id="addLabelEn"
              label={t("Label (English)", "التسمية (إنجليزي)")}
              error={
                addError === "label-required" ? errorText(addError) : undefined
              }
              isRtl={isRtl}
            >
              <Input
                id="addLabelEn"
                value={addForm.labelEn}
                onChange={(e) => {
                  setAddForm((f) => ({ ...f, labelEn: e.target.value }));
                  if (addError) setAddError(null);
                }}
                placeholder="QA Supervisor"
              />
            </EditField>
            <EditField
              id="addLabelAr"
              label={t("Label (Arabic)", "التسمية (عربي)")}
              error={
                addError === "label-ar-required"
                  ? errorText(addError)
                  : undefined
              }
              isRtl={isRtl}
            >
              <Input
                id="addLabelAr"
                value={addForm.labelAr}
                onChange={(e) => {
                  setAddForm((f) => ({ ...f, labelAr: e.target.value }));
                  if (addError) setAddError(null);
                }}
                dir="rtl"
                placeholder="مشرف الجودة"
              />
            </EditField>
            <EditField
              id="addDescriptionEn"
              label={t("Description (English)", "الوصف (إنجليزي)")}
              error={
                addError === "description-required"
                  ? errorText(addError)
                  : undefined
              }
              isRtl={isRtl}
            >
              <Input
                id="addDescriptionEn"
                value={addForm.descriptionEn}
                onChange={(e) => {
                  setAddForm((f) => ({
                    ...f,
                    descriptionEn: e.target.value,
                  }));
                  if (addError) setAddError(null);
                }}
                placeholder="Reviews quality control reports and approves releases."
              />
            </EditField>
            <EditField
              id="addDescriptionAr"
              label={t("Description (Arabic)", "الوصف (عربي)")}
              error={
                addError === "description-ar-required"
                  ? errorText(addError)
                  : undefined
              }
              isRtl={isRtl}
            >
              <Input
                id="addDescriptionAr"
                value={addForm.descriptionAr}
                onChange={(e) => {
                  setAddForm((f) => ({
                    ...f,
                    descriptionAr: e.target.value,
                  }));
                  if (addError) setAddError(null);
                }}
                dir="rtl"
                placeholder="يراجع تقارير ضبط الجودة ويعتمد الإصدارات."
              />
            </EditField>

            <div className="grid gap-1.5">
              <Label className="text-sm font-medium">
                {t("Icon", "الأيقونة")}
              </Label>
              <Select
                value={addForm.iconName}
                onValueChange={(v) => {
                  setAddForm((f) => ({ ...f, iconName: v }));
                  if (addError) setAddError(null);
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ICON_PICKER.map((p) => {
                    const PickerIcon = p.icon;
                    return (
                      <SelectItem key={p.name} value={p.name}>
                        <span className="flex items-center gap-2">
                          <PickerIcon className="h-4 w-4" />
                          <span>{isRtl ? p.labelAr : p.labelEn}</span>
                        </span>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeAdd}>
              {t("Cancel", "إلغاء")}
            </Button>
            <Button
              onClick={handleAddSubmit}
              disabled={api && createMut.isPending}
            >
              {t("Create", "إنشاء")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete dialog — destructive, typed-confirm. Custom roles only. */}
      <Dialog
        open={deleteRole !== null}
        onOpenChange={(open) => {
          if (!open) closeDelete();
        }}
      >
        <DialogContent className="sm:max-w-[460px]">
          <DialogHeader>
            <DialogTitle className="text-destructive">
              {t("Delete role permanently?", "حذف الدور نهائيًا؟")}
            </DialogTitle>
            <DialogDescription>
              {deleteRole && (
                <>
                  {t(
                    `This removes "${deleteRole}" from the role registry. Users assigned to it will lose all matrix-based menu access. The action cannot be undone.`,
                    `سيؤدي ذلك إلى إزالة "${deleteRole}" من سجل الأدوار. سيفقد المستخدمون المُسنَد إليهم هذا الدور جميع صلاحيات القائمة. لا يمكن التراجع.`,
                  )}
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          {deleteRole && (
            <div className="grid gap-2 py-2">
              <Label htmlFor="deleteConfirm" className="text-sm font-medium">
                {(() => {
                  const meta = getRole(deleteRole);
                  if (!meta) return null;
                  const label = isRtl ? meta.labelAr : meta.labelEn;
                  return t(
                    `Type "${label}" to confirm:`,
                    `اكتب "${label}" للتأكيد:`,
                  );
                })()}
              </Label>
              <Input
                id="deleteConfirm"
                value={deleteConfirm}
                onChange={(e) => setDeleteConfirm(e.target.value)}
                autoComplete="off"
                dir={isRtl ? "rtl" : "ltr"}
              />
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={closeDelete}>
              {t("Cancel", "إلغاء")}
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={(() => {
                if (!deleteRole) return true;
                const meta = getRole(deleteRole);
                if (!meta) return true;
                const expected = isRtl ? meta.labelAr : meta.labelEn;
                return deleteConfirm.trim() !== expected;
              })()}
            >
              {t("Delete permanently", "حذف نهائي")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/**
 * Local hook for the matrix PUT. Lives here so we can call
 * `usePutRoleMenuPermissions` only inside the `RolesAdmin` body, not in
 * the `toggleMatrixCell` helper (rules of hooks).
 */
function EditField({
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