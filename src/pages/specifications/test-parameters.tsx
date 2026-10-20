import { useEffect, useMemo, useState } from "react";
import {
  Plus,
  Download,
  Loader2,
  Pencil,
  Trash2,
  Eye,
  Search,
  ChevronLeft,
  ChevronRight,
  X as XIcon,
} from "lucide-react";
import { useAppContext } from "@/context/AppContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { isApiEnabled } from "@/lib/api";
import {
  type ListFilters,
  type TestParameter,
  type TestParameterCreate,
  type TestParameterUpdate,
  getErrorDetail,
} from "@/lib/testParametersApi";
import {
  useTestParameters,
  useCreateTestParameter,
  useUpdateTestParameter,
  useDeleteTestParameter,
} from "@/lib/queries";

type StatusFilter = "all" | "active" | "inactive";

const EMPTY_FORM: TestParameterCreate = {
  code: "",
  spec: "",
  test_name: "",
  parameter: "",
  reference: "",
  tests: "",
  mu: "",
  sop_code: "",
};

function truncateUuid(id: string): string {
  return id.slice(0, 8);
}

function describeApiError(
  err: unknown,
  fallback: string,
): { title: string; description?: string } {
  const { status, message, validation } = getErrorDetail(err);
  if (validation && validation.length > 0) {
    return {
      title: `${status} — ${validation.length} validation ${
        validation.length === 1 ? "issue" : "issues"
      }`,
      description: validation
        .map((v) => `${v.loc?.join(".") || "field"}: ${v.msg}`)
        .join("\n"),
    };
  }
  return { title: `${status || "Error"} — ${message || fallback}` };
}

export default function TestParameterCatalogue() {
  const { language, currentRole } = useAppContext();
  const isRtl = language === "ar";
  const isAdmin = currentRole === "admin";
  const apiOn = isApiEnabled();

  // --- Filters / search state ---
  const [search, setSearch] = useState("");
  const [specFilter, setSpecFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // --- Pagination state ---
  const PAGE_SIZES = [25, 50, 100] as const;
  const [pageSize, setPageSize] = useState<number>(50);
  const [pageIndex, setPageIndex] = useState(0);

  // Debounce the free-text search so we don't fire a request on every keystroke.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  // Build the filter object that the API expects.
  const filters = useMemo<ListFilters>(() => {
    const f: ListFilters = { limit: pageSize, offset: pageIndex * pageSize };
    if (debouncedSearch.trim()) f.search = debouncedSearch.trim();
    if (specFilter !== "all") f.spec = specFilter;
    if (statusFilter === "active") f.is_active = true;
    if (statusFilter === "inactive") f.is_active = false;
    return f;
  }, [debouncedSearch, specFilter, statusFilter, pageSize, pageIndex]);

  // Any filter change must snap back to the first page — otherwise the user
  // can land on page 7 of a result set that only has 1 page.
  useEffect(() => {
    setPageIndex(0);
  }, [debouncedSearch, specFilter, statusFilter, pageSize]);

  // --- Data hook (only fires when API mode is on) ---
  const {
    data: page,
    isLoading,
    isError,
    error,
    refetch,
  } = useTestParameters(filters);

  // In mock mode the page is empty; surface a friendly notice rather than
  // pretend the catalogue is silently broken.
  useEffect(() => {
    if (isError) {
      const d = describeApiError(error, "Failed to load test parameters");
      toast.error(d.title, { description: d.description });
    }
  }, [isError, error]);

  const rows = useMemo<TestParameter[]>(() => {
    const items = page?.items ?? [];
    // The API already sorts numerically on `code`, but the mock fallback
    // (and any defensive cases) sort here too.
    return [...items].sort((a, b) => {
      const re = /^(.*?)(\d+)$/;
      const ma = a.code.match(re);
      const mb = b.code.match(re);
      if (ma && mb && ma[1] === mb[1]) return Number(ma[2]) - Number(mb[2]);
      return a.code.localeCompare(b.code);
    });
  }, [page]);

  // Distinct spec values for the filter dropdown.
  //
  // `rows` is now only the *current page*, so it can't be the source here —
  // deriving specs from it would hide every spec that isn't on the visible
  // page. Fetch a separate unfiltered, high-limit list purely for the
  // dropdown options.
  const specOptionsQuery = useTestParameters({ limit: 500, offset: 0 });
  const allSpecs = useMemo<string[]>(() => {
    const set = new Set<string>();
    for (const r of specOptionsQuery.data?.items ?? []) {
      if (r.spec) set.add(r.spec);
    }
    return Array.from(set).sort();
  }, [specOptionsQuery.data]);

  // --- Mutations ---
  const createMut = useCreateTestParameter();
  const updateMut = useUpdateTestParameter();
  const deleteMut = useDeleteTestParameter();
  const togglingId = updateMut.isPending ? updateMut.variables?.id ?? null : null;

  // --- Dialog state ---
  const [addOpen, setAddOpen] = useState(false);
  const [viewTarget, setViewTarget] = useState<TestParameter | null>(null);
  const [editTarget, setEditTarget] = useState<TestParameter | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<TestParameter | null>(null);

  const [form, setForm] = useState<TestParameterCreate>(EMPTY_FORM);
  const [editForm, setEditForm] = useState<TestParameterUpdate>({});

  // --- Handlers ---

  const resetAdd = () => {
    setForm(EMPTY_FORM);
    setAddOpen(false);
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload: TestParameterCreate = {
      code: form.code.trim(),
      parameter: form.parameter.trim(),
      spec: form.spec?.trim() || null,
      test_name: form.test_name?.trim() || null,
      reference: form.reference?.trim() || null,
      tests: form.tests?.trim() || null,
      mu: form.mu?.trim() || null,
      sop_code: form.sop_code?.trim() || null,
    };
    try {
      const created = await createMut.mutateAsync(payload);
      toast.success(
        isRtl
          ? `تم إنشاء المعلمة ${created.code}`
          : `Test parameter ${created.code} created`,
      );
      resetAdd();
    } catch (err) {
      const d = describeApiError(err, "Failed to create test parameter");
      toast.error(d.title, { description: d.description });
    }
  };

  const openEdit = (row: TestParameter) => {
    setEditTarget(row);
    setEditForm({
      code: row.code,
      spec: row.spec,
      test_name: row.test_name,
      parameter: row.parameter,
      reference: row.reference,
      tests: row.tests,
      mu: row.mu,
      sop_code: row.sop_code,
      is_active: row.is_active,
    });
  };

  const handleEditSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTarget) return;
    const blankToNull = (v: string | null | undefined) =>
      v === undefined ? undefined : v === "" ? null : v;
    const patch: TestParameterUpdate = {
      code: editForm.code?.trim(),
      parameter: editForm.parameter?.trim(),
      spec: blankToNull(editForm.spec),
      test_name: blankToNull(editForm.test_name),
      reference: blankToNull(editForm.reference),
      tests: blankToNull(editForm.tests),
      mu: blankToNull(editForm.mu),
      sop_code: blankToNull(editForm.sop_code),
      is_active: editForm.is_active,
    };
    try {
      const updated = await updateMut.mutateAsync({
        id: editTarget.id,
        body: patch,
      });
      toast.success(
        isRtl
          ? `تم حفظ التغييرات على ${updated.code}`
          : `Test parameter ${updated.code} updated`,
      );
      setEditTarget(null);
    } catch (err) {
      const d = describeApiError(err, "Failed to save changes");
      toast.error(d.title, { description: d.description });
    }
  };

  const handleToggleActive = async (row: TestParameter) => {
    try {
      await updateMut.mutateAsync({
        id: row.id,
        body: { is_active: !row.is_active },
      });
      toast.success(
        isRtl
          ? row.is_active
            ? `تم إلغاء تنشيط ${row.code}`
            : `تم تنشيط ${row.code}`
          : row.is_active
          ? `Deactivated ${row.code}`
          : `Activated ${row.code}`,
      );
    } catch (err) {
      toast.error(
        isRtl ? "فشل تغيير الحالة" : "Failed to change status",
        { description: describeApiError(err, "").title },
      );
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteMut.mutateAsync(deleteTarget.id);
      toast.success(
        isRtl
          ? `تم حذف المعلمة ${deleteTarget.code}`
          : `Test parameter ${deleteTarget.code} deleted`,
      );
      setDeleteTarget(null);
    } catch (err) {
      toast.error(isRtl ? "فشل الحذف" : "Delete failed", {
        description: describeApiError(err, "").title,
      });
    }
  };

  // --- KPI counts ---
  //
  // `rows` is only the current page now, so the KPI cards must read the
  // server-reported totals (`page.total`) rather than counting rows locally.
  // Active/inactive splits aren't available from the server, so those two
  // cards stay scoped to the visible page and are labelled as such.
  const grandTotal = page?.total ?? 0;
  const totalActive = rows.filter((r) => r.is_active).length;
  const totalInactive = rows.length - totalActive;

  // --- Pagination math ---
  const totalPages = Math.max(1, Math.ceil(grandTotal / pageSize));
  const fromRow = grandTotal === 0 ? 0 : pageIndex * pageSize + 1;
  const toRow = Math.min(grandTotal, pageIndex * pageSize + rows.length);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {isRtl ? "كتالوج معلمات الاختبار" : "Test Parameter Catalogue"}
          </h1>
          <p className="text-muted-foreground mt-1">
            {isRtl
              ? "قاعدة بيانات مركزية لجميع معلمات الاختبار والمعايير المرجعية للمختبر"
              : "Central database of all test parameters and reference standards for the laboratory"}
          </p>
        </div>

        <div className="flex gap-2">
          <Button variant="outline">
            <Download className="me-2 h-4 w-4" /> {isRtl ? "تصدير" : "Export"}
          </Button>
          {isAdmin && (
            <Button onClick={() => setAddOpen(true)} disabled={!apiOn}>
              <Plus className="me-2 h-4 w-4" />
              {isRtl ? "إضافة معلمة" : "Add Parameter"}
            </Button>
          )}
        </div>
      </div>

      {!apiOn && (
        <div className="rounded-md border border-amber-300 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-800 p-3 text-sm text-amber-900 dark:text-amber-200">
          <p className="font-medium">
            {isRtl
              ? "وضع البيانات الوهمية مفعّل"
              : "Mock data mode is active"}
          </p>
          <p className="text-xs mt-1">
            {isRtl
              ? "هذا القسم يستدعي واجهة برمجية حقيقية. شغّل التطبيق مع VITE_USE_API=true واتصل بالخادم للحصول على البيانات."
              : "This module calls the real backend. Set VITE_USE_API=true in .env.local and connect to the server to load data."}
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card p-4 rounded-xl border shadow-sm">
          <p className="text-sm text-muted-foreground">
            {isRtl ? "إجمالي المعلمات" : "Total Parameters"}
          </p>
          <p className="text-2xl font-bold">{grandTotal}</p>
        </div>
        <div className="bg-card p-4 rounded-xl border shadow-sm">
          <p className="text-sm text-muted-foreground">
            {isRtl ? "نشطة (هذه الصفحة)" : "Active (this page)"}
          </p>
          <p className="text-2xl font-bold text-emerald-600">{totalActive}</p>
        </div>
        <div className="bg-card p-4 rounded-xl border shadow-sm">
          <p className="text-sm text-muted-foreground">
            {isRtl ? "غير نشطة (هذه الصفحة)" : "Inactive (this page)"}
          </p>
          <p className="text-2xl font-bold text-muted-foreground">{totalInactive}</p>
        </div>
      </div>

      {/* Filter chips + search bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-sm">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={
              isRtl
                ? "البحث في الكود أو المعلمة أو الاختبار أو SOP…"
                : "Search by code, parameter, test name, or SOP…"
            }
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="ps-9"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Select value={specFilter} onValueChange={setSpecFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder={isRtl ? "المواصفة" : "Spec"} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">
                {isRtl ? "كل المواصفات" : "All specs"}
              </SelectItem>
              {allSpecs.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex items-center gap-1 border rounded-md p-0.5">
            {(["all", "active", "inactive"] as StatusFilter[]).map((opt) => {
              const active = statusFilter === opt;
              const label =
                opt === "all"
                  ? isRtl
                    ? "الكل"
                    : "All"
                  : opt === "active"
                  ? isRtl
                    ? "نشطة"
                    : "Active"
                  : isRtl
                  ? "غير نشطة"
                  : "Inactive";
              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setStatusFilter(opt)}
                  className={`text-xs px-3 py-1 rounded ${
                    active
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {(specFilter !== "all" || statusFilter !== "all" || search) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearch("");
                setSpecFilter("all");
                setStatusFilter("all");
              }}
            >
              <XIcon className="me-1 h-3 w-3" />
              {isRtl ? "مسح" : "Clear"}
            </Button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-md border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{isRtl ? "الكود" : "Code"}</TableHead>
              <TableHead>{isRtl ? "المواصفة" : "Spec"}</TableHead>
              <TableHead>{isRtl ? "اسم الاختبار" : "Test Name"}</TableHead>
              <TableHead>{isRtl ? "المعلمة" : "Parameter"}</TableHead>
              <TableHead>{isRtl ? "المرجع" : "Reference"}</TableHead>
              <TableHead>{isRtl ? "الاختبارات" : "Tests"}</TableHead>
              <TableHead>{isRtl ? "MU" : "MU"}</TableHead>
              <TableHead>{isRtl ? "كود SOP" : "SOP Code"}</TableHead>
              <TableHead>{isRtl ? "الحالة" : "Status"}</TableHead>
              <TableHead className="text-end">
                {isRtl ? "إجراءات" : "Actions"}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={`skel-${i}`}>
                  {Array.from({ length: 10 }).map((__, j) => (
                    <TableCell key={`cell-${i}-${j}`}>
                      <div className="h-3 w-16 bg-muted rounded animate-pulse" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : isError ? (
              <TableRow>
                <TableCell
                  colSpan={10}
                  className="h-24 text-center text-muted-foreground"
                >
                  <div className="space-y-2">
                    <p className="text-destructive font-medium">
                      {isRtl ? "فشل تحميل الكتالوج" : "Failed to load catalogue"}
                    </p>
                    <p className="text-xs">
                      {describeApiError(error, "Network error").title}
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => refetch()}
                    >
                      {isRtl ? "إعادة المحاولة" : "Retry"}
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={10}
                  className="h-24 text-center text-muted-foreground"
                >
                  {isRtl ? "لا توجد نتائج" : "No results found."}
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow
                  key={row.id}
                  className={!row.is_active ? "opacity-60" : ""}
                >
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-mono font-medium">{row.code}</span>
                      <span
                        className="text-[10px] text-muted-foreground font-mono"
                        title={row.id}
                      >
                        {truncateUuid(row.id)}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {row.spec ? (
                      <Badge variant="outline">{row.spec}</Badge>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>{row.test_name || "—"}</TableCell>
                  <TableCell className="font-medium">{row.parameter}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {row.reference || "—"}
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {row.tests || "—"}
                  </TableCell>
                  <TableCell className="text-xs">
                    {row.mu || <span className="text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {row.sop_code || (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {isAdmin ? (
                      <button
                        type="button"
                        onClick={() => handleToggleActive(row)}
                        disabled={togglingId === row.id || updateMut.isPending}
                        className="inline-flex items-center gap-1 focus:outline-none"
                        title={
                          row.is_active
                            ? isRtl
                              ? "انقر لإلغاء التنشيط"
                              : "Click to deactivate"
                            : isRtl
                            ? "انقر للتنشيط"
                            : "Click to activate"
                        }
                      >
                        {togglingId === row.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : row.is_active ? (
                          <Badge variant="default" className="bg-emerald-600 hover:bg-emerald-700">
                            {isRtl ? "نشطة" : "Active"}
                          </Badge>
                        ) : (
                          <Badge variant="secondary">
                            {isRtl ? "غير نشطة" : "Inactive"}
                          </Badge>
                        )}
                      </button>
                    ) : row.is_active ? (
                      <Badge variant="default" className="bg-emerald-600">
                        {isRtl ? "نشطة" : "Active"}
                      </Badge>
                    ) : (
                      <Badge variant="secondary">
                        {isRtl ? "غير نشطة" : "Inactive"}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setViewTarget(row)}
                        title={isRtl ? "عرض" : "View"}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      {isAdmin && (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-primary hover:bg-primary/10"
                            onClick={() => openEdit(row)}
                            title={isRtl ? "تعديل" : "Edit"}
                            disabled={!apiOn}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:bg-destructive/10"
                            onClick={() => setDeleteTarget(row)}
                            title={isRtl ? "حذف" : "Delete"}
                            disabled={!apiOn}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination footer — server-side paging driven by
          `page.total` / `page.limit` / `page.offset` from
          GET /test-parameters. */}
      {apiOn && grandTotal > 0 && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            {isRtl
              ? `عرض ${fromRow}–${toRow} من ${grandTotal}`
              : `Showing ${fromRow}–${toRow} of ${grandTotal}`}
          </p>

          <div className="flex items-center gap-2">
            {/* Page-size selector */}
            <Select
              value={String(pageSize)}
              onValueChange={(v) => setPageSize(Number(v))}
            >
              <SelectTrigger className="h-8 w-[110px]" aria-label={isRtl ? "حجم الصفحة" : "Rows per page"}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAGE_SIZES.map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    {isRtl ? `${n} لكل صفحة` : `${n} / page`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Prev / page indicator / Next */}
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => setPageIndex((p) => Math.max(0, p - 1))}
                disabled={pageIndex === 0 || isLoading}
                title={isRtl ? "السابق" : "Previous page"}
              >
                <ChevronLeft className="h-4 w-4 rtl:rotate-0" />
                <span className="sr-only">{isRtl ? "السابق" : "Previous"}</span>
              </Button>

              <span className="min-w-[7rem] text-center text-sm text-muted-foreground">
                {isRtl
                  ? `صفحة ${pageIndex + 1} من ${totalPages}`
                  : `Page ${pageIndex + 1} of ${totalPages}`}
              </span>

              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => setPageIndex((p) => Math.min(totalPages - 1, p + 1))}
                disabled={pageIndex >= totalPages - 1 || isLoading}
                title={isRtl ? "التالي" : "Next page"}
              >
                <ChevronRight className="h-4 w-4" />
                <span className="sr-only">{isRtl ? "التالي" : "Next"}</span>
              </Button>
            </div>
          </div>
        </div>
      )}

      {!isAdmin && (
        <p className="text-xs text-muted-foreground italic">
          {isRtl
            ? "الإضافة والتعديل والحذف متاحة فقط لحساب المسؤول."
            : "Add, edit, and delete are available for admin only."}
        </p>
      )}

      {/* Add dialog */}
      <Dialog
        open={addOpen}
        onOpenChange={(o) => {
          if (!o) resetAdd();
          else setAddOpen(true);
        }}
      >
        <DialogContent className="sm:max-w-[640px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {isRtl ? "إضافة معلمة اختبار" : "Add Test Parameter"}
            </DialogTitle>
            <DialogDescription>
              {isRtl
                ? "أدخل الحقول الثمانية لإضافة معلمة جديدة إلى الكتالوج."
                : "Fill in the 8 fields to add a new parameter to the catalogue."}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAdd} className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="add-code">
                  {isRtl ? "الكود" : "Code"} <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="add-code"
                  placeholder="GL-P-19"
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="add-spec">{isRtl ? "المواصفة" : "Spec"}</Label>
                <Input
                  id="add-spec"
                  placeholder="FOOD"
                  value={form.spec ?? ""}
                  onChange={(e) => setForm({ ...form, spec: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="add-test-name">
                {isRtl ? "اسم الاختبار" : "Test Name"}
              </Label>
              <Input
                id="add-test-name"
                placeholder={isRtl ? "اختبار فيتامين C" : "Vitamin C analysis"}
                value={form.test_name ?? ""}
                onChange={(e) =>
                  setForm({ ...form, test_name: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="add-parameter">
                {isRtl ? "المعلمة" : "Parameter"}{" "}
                <span className="text-destructive">*</span>
              </Label>
              <Input
                id="add-parameter"
                placeholder={isRtl ? "فيتامين C" : "Vitamin C"}
                value={form.parameter}
                onChange={(e) =>
                  setForm({ ...form, parameter: e.target.value })
                }
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="add-reference">
                  {isRtl ? "المرجع" : "Reference"}
                </Label>
                <Input
                  id="add-reference"
                  placeholder="IH/FDA"
                  value={form.reference ?? ""}
                  onChange={(e) =>
                    setForm({ ...form, reference: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="add-tests">
                  {isRtl ? "الاختبارات" : "Tests"}
                </Label>
                <Input
                  id="add-tests"
                  placeholder="NMT 10"
                  value={form.tests ?? ""}
                  onChange={(e) => setForm({ ...form, tests: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="add-mu">
                  {isRtl ? "عدم اليقين (MU)" : "MU"}
                </Label>
                <Input
                  id="add-mu"
                  placeholder="±0.5"
                  value={form.mu ?? ""}
                  onChange={(e) => setForm({ ...form, mu: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="add-sop">
                  {isRtl ? "كود SOP" : "SOP Code"}
                </Label>
                <Input
                  id="add-sop"
                  placeholder="GL/P-720/SOP/F-001"
                  value={form.sop_code ?? ""}
                  onChange={(e) =>
                    setForm({ ...form, sop_code: e.target.value })
                  }
                />
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={resetAdd}>
                {isRtl ? "إلغاء" : "Cancel"}
              </Button>
              <Button type="submit" disabled={createMut.isPending}>
                {createMut.isPending ? (
                  <>
                    <Loader2 className="me-2 h-4 w-4 animate-spin" />
                    {isRtl ? "جاري الإضافة…" : "Adding…"}
                  </>
                ) : (
                  <>
                    <Plus className="me-2 h-4 w-4" />
                    {isRtl ? "إضافة المعلمة" : "Add Parameter"}
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* View dialog */}
      <Dialog
        open={!!viewTarget}
        onOpenChange={(o) => !o && setViewTarget(null)}
      >
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle className="font-mono">{viewTarget?.code}</DialogTitle>
            <DialogDescription>
              {viewTarget?.test_name ?? viewTarget?.parameter}
            </DialogDescription>
          </DialogHeader>
          {viewTarget && (
            <div className="space-y-3 text-sm">
              <DetailRow
                label={isRtl ? "المعلمة" : "Parameter"}
                value={viewTarget.parameter}
              />
              <DetailRow
                label={isRtl ? "المواصفة" : "Spec"}
                value={viewTarget.spec ?? "—"}
              />
              <DetailRow
                label={isRtl ? "اسم الاختبار" : "Test Name"}
                value={viewTarget.test_name ?? "—"}
              />
              <DetailRow
                label={isRtl ? "المرجع" : "Reference"}
                value={viewTarget.reference ?? "—"}
              />
              <DetailRow
                label={isRtl ? "الاختبارات" : "Tests"}
                value={viewTarget.tests ?? "—"}
                mono
              />
              <DetailRow
                label={isRtl ? "MU" : "MU"}
                value={viewTarget.mu ?? "—"}
              />
              <DetailRow
                label={isRtl ? "كود SOP" : "SOP Code"}
                value={viewTarget.sop_code ?? "—"}
                mono
              />
              <DetailRow
                label={isRtl ? "الحالة" : "Status"}
                value={
                  viewTarget.is_active
                    ? isRtl
                      ? "نشطة"
                      : "Active"
                    : isRtl
                    ? "غير نشطة"
                    : "Inactive"
                }
              />
              <DetailRow
                label={isRtl ? "المعرّف" : "UUID"}
                value={viewTarget.id}
                mono
              />
              <DetailRow
                label={isRtl ? "تاريخ الإنشاء" : "Created"}
                value={new Date(viewTarget.created_at).toLocaleString()}
              />
              <DetailRow
                label={isRtl ? "آخر تحديث" : "Updated"}
                value={new Date(viewTarget.updated_at).toLocaleString()}
              />
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewTarget(null)}>
              {isRtl ? "إغلاق" : "Close"}
            </Button>
            {isAdmin && viewTarget && (
              <Button
                onClick={() => {
                  const t = viewTarget;
                  setViewTarget(null);
                  openEdit(t);
                }}
                disabled={!apiOn}
              >
                <Pencil className="me-2 h-4 w-4" />
                {isRtl ? "تعديل" : "Edit"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog
        open={!!editTarget}
        onOpenChange={(o) => !o && setEditTarget(null)}
      >
        <DialogContent className="sm:max-w-[640px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {isRtl ? "تعديل معلمة" : "Edit Test Parameter"}
            </DialogTitle>
            <DialogDescription className="font-mono text-xs">
              {editTarget?.code} · {editTarget?.id.slice(0, 8)}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleEditSave} className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-code">
                  {isRtl ? "الكود" : "Code"}
                </Label>
                <Input
                  id="edit-code"
                  value={editForm.code ?? ""}
                  onChange={(e) =>
                    setEditForm({ ...editForm, code: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-spec">{isRtl ? "المواصفة" : "Spec"}</Label>
                <Input
                  id="edit-spec"
                  value={editForm.spec ?? ""}
                  onChange={(e) =>
                    setEditForm({ ...editForm, spec: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-test-name">
                {isRtl ? "اسم الاختبار" : "Test Name"}
              </Label>
              <Input
                id="edit-test-name"
                value={editForm.test_name ?? ""}
                onChange={(e) =>
                  setEditForm({ ...editForm, test_name: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-parameter">
                {isRtl ? "المعلمة" : "Parameter"}
              </Label>
              <Input
                id="edit-parameter"
                value={editForm.parameter ?? ""}
                onChange={(e) =>
                  setEditForm({ ...editForm, parameter: e.target.value })
                }
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-reference">
                  {isRtl ? "المرجع" : "Reference"}
                </Label>
                <Input
                  id="edit-reference"
                  value={editForm.reference ?? ""}
                  onChange={(e) =>
                    setEditForm({ ...editForm, reference: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-tests">
                  {isRtl ? "الاختبارات" : "Tests"}
                </Label>
                <Input
                  id="edit-tests"
                  value={editForm.tests ?? ""}
                  onChange={(e) =>
                    setEditForm({ ...editForm, tests: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-mu">{isRtl ? "MU" : "MU"}</Label>
                <Input
                  id="edit-mu"
                  value={editForm.mu ?? ""}
                  onChange={(e) =>
                    setEditForm({ ...editForm, mu: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-sop">
                  {isRtl ? "كود SOP" : "SOP Code"}
                </Label>
                <Input
                  id="edit-sop"
                  value={editForm.sop_code ?? ""}
                  onChange={(e) =>
                    setEditForm({ ...editForm, sop_code: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <input
                id="edit-active"
                type="checkbox"
                checked={!!editForm.is_active}
                onChange={(e) =>
                  setEditForm({ ...editForm, is_active: e.target.checked })
                }
                className="h-4 w-4"
              />
              <Label htmlFor="edit-active" className="cursor-pointer">
                {isRtl ? "نشطة" : "Active"}
              </Label>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditTarget(null)}
              >
                {isRtl ? "إلغاء" : "Cancel"}
              </Button>
              <Button type="submit" disabled={updateMut.isPending}>
                {updateMut.isPending ? (
                  <>
                    <Loader2 className="me-2 h-4 w-4 animate-spin" />
                    {isRtl ? "جاري الحفظ…" : "Saving…"}
                  </>
                ) : (
                  isRtl ? "حفظ التغييرات" : "Save Changes"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <Dialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
      >
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>{isRtl ? "تأكيد الحذف" : "Confirm Delete"}</DialogTitle>
            <DialogDescription>
              {isRtl
                ? `هل تريد حذف المعلمة ${deleteTarget?.code} نهائيًا؟ لا يمكن التراجع.`
                : `Permanently delete test parameter ${deleteTarget?.code}? This cannot be undone.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              {isRtl ? "إلغاء" : "Cancel"}
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteMut.isPending}
            >
              {deleteMut.isPending ? (
                <Loader2 className="me-2 h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="me-2 h-4 w-4" />
              )}
              {isRtl ? "حذف" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DetailRow({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="grid grid-cols-3 gap-3 py-1">
      <span className="text-xs uppercase text-muted-foreground tracking-wide">
        {label}
      </span>
      <span
        className={`col-span-2 ${mono ? "font-mono text-xs" : ""} break-words`}
      >
        {value}
      </span>
    </div>
  );
}
