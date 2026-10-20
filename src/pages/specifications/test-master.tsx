import { useMemo, useState } from "react";
import {
  testMasterData,
  TestMaster,
  TestParameterRow,
  TestLimitType,
  mockSpecifications,
} from "@/mock-data/specifications";
import { DataTable } from "@/components/shared/DataTable";
import { isApiEnabled } from "@/lib/api";
import {
  useTestList,
  useDeleteTestListItem,
  useCreateTestListItem,
  useUpdateTestListItem,
} from "@/lib/queries";
import { getTestListErrorDetail } from "@/lib/testListApi";
import { Button } from "@/components/ui/button";
import {
  Plus,
  Download,
  Loader2,
  Eye,
  Pencil,
  Trash2,
} from "lucide-react";
import { useAppContext } from "@/context/AppContext";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

/** Flat, single-record form state.
 *
 *  Mirrors the backend's `/api/v1/test-list` row, which is FLAT — one record is
 *  one parameter measurement. There is deliberately no nested "parameters"
 *  collection: MU / Reference / LIMIT are top-level fields, not sub-rows. */
type FormState = {
  testCode: string;        // → code
  testName: string;        // → parameter
  specificationId: string; // → spec
  mu: string;              // → mu
  methodReference: string; // → reference
  limitRange: string;      // → limit_value
};

const emptyForm: FormState = {
  testCode: "",
  testName: "",
  specificationId: "",
  mu: "",
  methodReference: "",
  limitRange: "",
};

/** Parse the legacy/mock `parameterDetails` JSON blob.
 *
 *  Only mock seed records still carry this — API rows are already flat and never
 *  store it. Mock mode keeps synthesizing a 1-element array on write so mock
 *  records stay structurally identical to the seeds (see `handleSubmit`). */
function safeParseRows(raw?: string | null): TestParameterRow[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed
        .filter((r) => r && typeof r === 'object' && typeof r.name === 'string')
        .map((r) => ({
          id: r.id || "",
          name: r.name,
          methodReference: r.methodReference || '',
          limitRange: r.limitRange || '',
          limitType: (r.limitType as TestLimitType) || 'Range',
          method: r.method,
          unit: r.unit,
          mu: r.mu,
          category: r.category,
          isCustom: !!r.isCustom,
        }));
    }
  } catch {
    /* ignore malformed */
  }
  return [];
}

/** Read the first row of a mock-mode test's `parameterDetails` JSON blob. */
const firstRow = (t: TestMaster): TestParameterRow | undefined =>
  safeParseRows(t.parameterDetails)[0];

// Generate the next sequential test code based on existing tests.
//
// The seeded codes look like `TC-MB-001` / `TC-CH-003`, so the scan must match
// that `TC-XX-NNN` shape — an earlier `/GL-TM-(\d+)/` regex never matched
// anything and silently produced `GL-TM-1` for every new test.
function generateNextTestCode(existing: TestMaster[]): string {
  const max = existing.reduce((acc, t) => {
    const m = /TC-[A-Z]+-(\d+)/i.exec(t.testCode);
    return m ? Math.max(acc, parseInt(m[1], 10)) : acc;
  }, 0);
  return `TC-TM-${String(max + 1).padStart(3, "0")}`;
}

/** One display row per test.
 *
 *  Mirrors the backend's flat `/api/v1/test-list` record: the table shows
 *  `ID · Specifications · Test Name · MU · Reference · LIMIT`, which are the
 *  record's own fields rather than anything nested. */
type TestRow = {
  id: string;
  specifications: string;
  testName: string;
  mu: string;
  reference: string;
  limit: string;
  /** Back-reference so the actions column can call the existing handlers
   *  with the original `TestMaster` shape they already expect.
   *
   *  In API mode the backend's row is flat, so we carry a minimally-hydrated
   *  shim. Fields the API has no column for come back blank. */
  source: TestMaster;
};

/** Resolve a specificationId to "CODE · Name", or a graceful fallback. */
function specLabel(specificationId?: string): string {
  if (!specificationId) return "—";
  const spec = mockSpecifications.find((s) => s.id === specificationId);
  if (!spec) return specificationId;
  return `${spec.code} · ${spec.name}`;
}

export default function TestMasterPage() {
  const { language } = useAppContext();
  const isRtl = language === 'ar';
  const apiMode = isApiEnabled();

  // API mode: real rows from `GET /api/v1/test-list` (flat parameter
  // measurements, one row per record). Mock mode: the local `TestMaster[]`
  // collection below.
  const testListQuery = useTestList({ limit: 200, offset: 0 });
  const createTestListItemMutation = useCreateTestListItem();
  const updateTestListItemMutation = useUpdateTestListItem();
  const deleteTestListItemMutation = useDeleteTestListItem();

  const [tests, setTests] = useState<TestMaster[]>(testMasterData);
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [selectedTest, setSelectedTest] = useState<TestMaster | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const [formData, setFormData] = useState<FormState>(emptyForm);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.testName) {
      toast.error(isRtl ? "يرجى ملء الحقول المطلوبة" : "Please fill in required fields");
      return;
    }

    setIsSubmitting(true);

    // -----------------------------------------------------------
    // API mode: one flat row in, one round-trip out.
    // `editingId` doubles as the backend uuid in API mode (the table hydrates
    // `source.id = it.id`), so PATCH addresses the row directly.
    // -----------------------------------------------------------
    if (apiMode) {
      const finish = (msg: string) => {
        setIsSubmitting(false);
        setOpen(false);
        setEditingId(null);
        setFormData(emptyForm);
        toast.success(msg);
      };
      const fail = (err: unknown) => {
        setIsSubmitting(false);
        const d = getTestListErrorDetail(err);
        toast.error(
          isRtl
            ? `فشل الحفظ (${d.status}): ${d.message}`
            : `Save failed (${d.status}): ${d.message}`
        );
      };

      const body = {
        code: formData.testCode,
        parameter: formData.testName,
        spec: formData.specificationId || undefined,
        mu: formData.mu || undefined,
        reference: formData.methodReference || undefined,
        limit_value: formData.limitRange || undefined,
      };

      const run = async () => {
        try {
          if (editingId) {
            await updateTestListItemMutation.mutateAsync({ id: editingId, body });
          } else {
            await createTestListItemMutation.mutateAsync(body);
          }
          finish(
            editingId
              ? isRtl
                ? "تم تحديث الاختبار بنجاح"
                : "Test updated successfully"
              : isRtl
              ? "تم إضافة الاختبار بنجاح"
              : "Test added successfully"
          );
        } catch (err) {
          fail(err);
        }
      };

      run();
      return;
    }

    // Mock mode: keep writing a 1-element `parameterDetails` array so mock
    // records stay structurally identical to the seed data (cheap insurance
    // for `AddTestToSampleDialog` and any future export).
    setTimeout(() => {
      const parameterDetails = JSON.stringify([
        {
          name: formData.testName,
          methodReference: formData.methodReference,
          limitRange: formData.limitRange,
          limitType: "Range",
          mu: formData.mu,
        },
      ]);

      if (editingId) {
        // Update existing test
        setTests(prev =>
          prev.map(t =>
            t.id === editingId
              ? {
                  ...t,
                  testCode: formData.testCode || t.testCode,
                  testName: formData.testName,
                  testParameter: formData.testName,
                  methodReference: formData.methodReference,
                  specificationId: formData.specificationId || undefined,
                  parameterDetails,
                }
              : t
          )
        );
        toast.success(isRtl ? "تم تحديث الاختبار بنجاح" : "Test updated successfully");
      } else {
        const newTest: TestMaster = {
          id: `TM-${String(tests.length + 1).padStart(3, "0")}`,
          testCode: formData.testCode || generateNextTestCode(tests),
          testName: formData.testName,
          testParameter: formData.testName,
          // Fields the flat test-list model has no column for. Still required
          // by the legacy `TestMaster` type, so they stay empty — nothing in
          // this page writes them any more.
          methodType: "",
          methodReference: formData.methodReference,
          sampleType: "",
          referenceNo: "",
          sopCode: "",
          warehouseItems: "",
          specificationId: formData.specificationId || undefined,
          parameterDetails,
        };
        setTests([newTest, ...tests]);
        toast.success(isRtl ? "تم إضافة الاختبار بنجاح" : "Test added successfully");
      }
      setIsSubmitting(false);
      setOpen(false);
      setEditingId(null);
      setFormData(emptyForm);
    }, 600);
  };

  const handleView = (test: TestMaster) => {
    setSelectedTest(test);
    setViewOpen(true);
  };

  const handleEdit = (test: TestMaster) => {
    const p = firstRow(test);
    setEditingId(test.id);
    setFormData({
      testCode: test.testCode,
      testName: test.testName,
      specificationId: test.specificationId ?? "",
      mu: p?.mu || "",
      methodReference: p?.methodReference || test.methodReference || "",
      limitRange: p?.limitRange || "",
    });
    setOpen(true);
  };

  const handleAddNew = () => {
    setEditingId(null);
    setFormData({ ...emptyForm, testCode: generateNextTestCode(tests) });
    setOpen(true);
  };

  const confirmDelete = () => {
    if (!deleteId) return;

    if (apiMode) {
      deleteTestListItemMutation.mutate(deleteId, {
        onSuccess: () =>
          toast.success(isRtl ? "تم حذف الاختبار بنجاح" : "Test deleted successfully"),
        onError: (err) => {
          const detail = getTestListErrorDetail(err);
          toast.error(
            isRtl
              ? `فشل الحذف (${detail.status})`
              : `Delete failed (${detail.status}): ${detail.message}`
          );
        },
      });
      setDeleteId(null);
      return;
    }

    setTests(prev => prev.filter(t => t.id !== deleteId));
    toast.success(isRtl ? "تم حذف الاختبار بنجاح" : "Test deleted successfully");
    setDeleteId(null);
  };

  // Build the flat display rows for the table.
  //
  // API mode: server rows are already flat; we just translate field names.
  // Mock mode: MU / Reference / LIMIT live in a 1-element `parameterDetails`
  // blob, normalised by `flatFields`.
  const apiItems = testListQuery.data?.items;
  const apiLoading = testListQuery.isLoading || testListQuery.isFetching;
  const apiError = testListQuery.error;

  const rows = useMemo<TestRow[]>(() => {
    if (apiMode) {
      if (!apiItems) return [];
      return apiItems.map((it) => ({
        id: it.code,
        specifications: it.spec ?? "—",
        testName: it.parameter,
        mu: it.mu ?? "—",
        reference: it.reference ?? "—",
        limit: it.limit_value ?? "—",
        // Hydrate a minimal `TestMaster` shim so the View / Edit / Delete
        // handlers don't have to branch. The fields below aren't emitted by
        // the backend's flat row.
        source: {
          id: it.id,
          testCode: it.code,
          testName: it.parameter,
          testParameter: it.parameter,
          methodType: "",
          methodReference: it.reference ?? "",
          sampleType: "",
          referenceNo: "",
          sopCode: "",
          warehouseItems: "",
          specificationId: it.spec ?? undefined,
          parameterDetails: JSON.stringify([
            {
              name: it.parameter,
              methodReference: it.reference ?? "",
              limitRange: it.limit_value ?? "",
              limitType: "Range",
              mu: it.mu ?? "",
            },
          ]),
        },
      }));
    }

    return tests.map((t) => {
      const p = firstRow(t);
      return {
        id: t.testCode,
        specifications: specLabel(t.specificationId),
        testName: t.testName,
        mu: p?.mu || "—",
        reference: p?.methodReference || t.methodReference || "—",
        limit: p?.limitRange || "—",
        source: t,
      };
    });
  }, [apiMode, apiItems, tests]);

  const columns = useMemo(
    () => [
      {
        key: "id",
        header: isRtl ? "المعرف" : "ID",
        render: (row: TestRow) => (
          <span className="font-mono text-xs">{row.id}</span>
        ),
      },
      {
        key: "specifications",
        header: isRtl ? "المواصفات" : "Specifications",
        render: (row: TestRow) => (
          <span className="text-sm">{row.specifications}</span>
        ),
      },
      {
        key: "testName",
        header: isRtl ? "اسم الاختبار" : "Test Name",
        render: (row: TestRow) => (
          <span className="font-medium text-primary">{row.testName}</span>
        ),
      },
      {
        key: "mu",
        header: isRtl ? "عدم اليقين" : "MU",
        render: (row: TestRow) => (
          <span className="font-mono text-muted-foreground">{row.mu}</span>
        ),
      },
      {
        key: "reference",
        header: isRtl ? "المرجع" : "Reference",
        render: (row: TestRow) => (
          <span className="font-mono text-muted-foreground">{row.reference}</span>
        ),
      },
      {
        key: "limit",
        header: isRtl ? "الحد" : "LIMIT",
        render: (row: TestRow) => (
          <span className="font-mono">{row.limit}</span>
        ),
      },
      {
        key: "actions",
        header: "",
        render: (row: TestRow) => (
          <div className="flex gap-2 justify-end">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-primary hover:bg-primary/10"
              onClick={() => handleView(row.source)}
              title={isRtl ? "عرض" : "View"}
            >
              <Eye className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-primary hover:bg-primary/10"
              onClick={() => handleEdit(row.source)}
              title={isRtl ? "تعديل" : "Edit"}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive hover:bg-destructive/10"
              onClick={() => setDeleteId(row.source.id)}
              title={isRtl ? "حذف" : "Delete"}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ),
      },
    ],
    [isRtl]
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {isRtl ? "معلمات الاختبار" : "Test Methods"}
          </h1>
          <p className="text-muted-foreground mt-1">
            {isRtl
              ? "إدارة قائمة الاختبارات المعتمدة في المختبر"
              : "Manage the list of tests approved for the lab"}
          </p>
        </div>

        <div className="flex gap-2">
          <Dialog open={open} onOpenChange={(v) => {
            setOpen(v);
            if (!v) {
              setEditingId(null);
              setFormData(emptyForm);
            }
          }}>
            <DialogTrigger asChild>
              <Button onClick={handleAddNew}>
                <Plus className="mr-2 h-4 w-4" /> {isRtl ? "إضافة اختبار" : "Add Test"}
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[720px]">
              <DialogHeader>
                <DialogTitle>
                  {editingId
                    ? isRtl
                      ? "تعديل الاختبار"
                      : "Edit Test"
                    : isRtl
                    ? "إضافة اختبار جديد"
                    : "Add New Test"}
                </DialogTitle>
                <DialogDescription>
                  {editingId
                    ? isRtl
                      ? "قم بتحديث تفاصيل الاختبار."
                      : "Update the test details."
                    : isRtl
                    ? "أدخل رمز الاختبار واسمه، ثم أكمل المواصفة وعدم اليقين والمرجع والحد."
                    : "Enter the test code and name, then fill in the specification, MU, reference and limit."}
                </DialogDescription>
              </DialogHeader>

              <ScrollArea className="max-h-[70vh] px-1">
                <form id="test-form" onSubmit={handleSubmit} className="space-y-4 py-4 pr-3">
                  {/* Test Code + Test Name */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="testCode">
                        {isRtl ? "كود الاختبار" : "Test Code"}
                      </Label>
                      <Input
                        id="testCode"
                        value={formData.testCode}
                        onChange={(e) =>
                          setFormData({ ...formData, testCode: e.target.value })
                        }
                        placeholder="TC-TM-006"
                        className="font-mono"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="testName">
                        {isRtl ? "اسم الاختبار" : "Test Name"} <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="testName"
                        value={formData.testName}
                        onChange={(e) => setFormData({ ...formData, testName: e.target.value })}
                        placeholder="e.g. Salmonella Detection"
                      />
                    </div>
                  </div>

                  {/* Linked Specification (single select) */}
                  <div className="grid gap-2">
                    <Label>
                      {isRtl ? "المواصفة" : "Specification"}
                    </Label>
                    <Select
                      value={formData.specificationId || "none"}
                      onValueChange={(val) =>
                        setFormData({
                          ...formData,
                          specificationId: val === "none" ? "" : val,
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue
                          placeholder={
                            isRtl ? "اختر المواصفة..." : "Select a specification..."
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">
                          <span className="text-muted-foreground">
                            {isRtl ? "— لا شيء —" : "— None —"}
                          </span>
                        </SelectItem>
                        {mockSpecifications.map(spec => (
                          <SelectItem key={spec.id} value={spec.id}>
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs">{spec.code}</span>
                              <span className="text-muted-foreground">·</span>
                              <span>{spec.name}</span>
                              <span className="text-[10px] text-muted-foreground">({spec.category})</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-[10px] text-muted-foreground">
                      {isRtl
                        ? "اختر مواصفة واحدة لربط هذا الاختبار بها."
                        : "Select one specification to link this test to."}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="mu">
                        {isRtl ? "عدم اليقين (MU)" : "MU (Measurement Uncertainty)"}
                      </Label>
                      <Input
                        id="mu"
                        value={formData.mu}
                        onChange={(e) => setFormData({ ...formData, mu: e.target.value })}
                        placeholder="±0.05"
                        className="font-mono"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="methodReference">
                        {isRtl ? "المرجع" : "Reference"}
                      </Label>
                      <Input
                        id="methodReference"
                        value={formData.methodReference}
                        onChange={(e) => setFormData({ ...formData, methodReference: e.target.value })}
                        placeholder="e.g. ISO 6579-1"
                        className="font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="limitRange">
                      {isRtl ? "الحد" : "LIMIT"}
                    </Label>
                    <Input
                      id="limitRange"
                      value={formData.limitRange}
                      onChange={(e) => setFormData({ ...formData, limitRange: e.target.value })}
                      placeholder={isRtl ? 'غيابي أو 6.5 - 8.5' : "e.g. Absent / 6.5 - 8.5"}
                      className="font-mono"
                    />
                  </div>
                </form>
              </ScrollArea>

              <DialogFooter className="pt-4 border-t">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  {isRtl ? "إلغاء" : "Cancel"}
                </Button>
                <Button type="submit" form="test-form" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {editingId
                        ? isRtl
                          ? "جاري التحديث..."
                          : "Updating..."
                        : isRtl
                        ? "جاري الإضافة..."
                        : "Adding..."}
                    </>
                  ) : editingId ? (
                    isRtl ? "حفظ التغييرات" : "Save Changes"
                  ) : (
                    isRtl ? "إضافة معلمة اختبار" : "Add Test Parameter"
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" /> {isRtl ? "تصدير" : "Export"}
          </Button>
        </div>
      </div>

      <DataTable
        data={rows}
        columns={columns as any}
        searchKey="testName"
        searchPlaceholder={isRtl ? "البحث في الاختبارات..." : "Search tests..."}
      />

      {/* API-mode status banner — surfaces 401/no-session/load errors so the
          developer can tell mock-data from a real backend roundtrip. */}
      {apiMode && (
        <div className="flex items-center justify-between gap-3 px-3 py-2 rounded-md border bg-muted/30 text-xs">
          <div className="flex items-center gap-2">
            {apiLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {apiError ? (
              <span className="text-destructive">
                {(() => {
                  const d = getTestListErrorDetail(apiError);
                  return isRtl
                    ? `تعذر تحميل القائمة (${d.status}): ${d.message}`
                    : `Failed to load list (${d.status}): ${d.message}`;
                })()}
              </span>
            ) : (
              <>
                <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
                <span className="text-muted-foreground">
                  {isRtl
                    ? `متصل بالـ API — إجمالي ${testListQuery.data?.total ?? rows.length} سجل`
                    : `Live API — ${testListQuery.data?.total ?? rows.length} record(s) from DB`}
                </span>
              </>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-7"
            onClick={() => testListQuery.refetch()}
            disabled={apiLoading}
          >
            {isRtl ? "إعادة التحميل" : "Refresh"}
          </Button>
        </div>
      )}

      {/* View Dialog */}
      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle>
              {isRtl ? "تفاصيل الاختبار" : "Test Details"}
            </DialogTitle>
          </DialogHeader>

          {selectedTest &&
            (() => {
              const p = firstRow(selectedTest);
              const cells: Array<{
                label: string;
                value: string;
                mono?: boolean;
                wide?: boolean;
              }> = [
                {
                  label: isRtl ? "المواصفة" : "Specification",
                  value: specLabel(selectedTest.specificationId),
                },
                {
                  label: isRtl ? "عدم اليقين (MU)" : "MU",
                  value: p?.mu || "—",
                  mono: true,
                },
                {
                  label: isRtl ? "المرجع" : "Reference",
                  value: p?.methodReference || selectedTest.methodReference || "—",
                  mono: true,
                },
                {
                  label: isRtl ? "الحد" : "LIMIT",
                  value: p?.limitRange || "—",
                  mono: true,
                },
              ];
              return (
                <div className="grid grid-cols-2 gap-y-4 py-4 text-sm">
                  <div className="space-y-1">
                    <p className="text-muted-foreground font-medium">
                      {isRtl ? "كود الاختبار" : "Test Code"}
                    </p>
                    <p className="font-mono font-semibold text-lg">
                      {selectedTest.testCode}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-muted-foreground font-medium">
                      {isRtl ? "اسم الاختبار" : "Test Name"}
                    </p>
                    <p className="font-semibold text-lg text-primary">
                      {selectedTest.testName}
                    </p>
                  </div>
                  {cells.map((c) => (
                    <div
                      key={c.label}
                      className={`space-y-1${c.wide ? " col-span-2" : ""}`}
                    >
                      <p className="text-muted-foreground font-medium">{c.label}</p>
                      <p className={c.mono ? "font-mono" : undefined}>{c.value}</p>
                    </div>
                  ))}
                </div>
              );
            })()}

          <DialogFooter className="gap-2">
            <Button
              variant="destructive"
              onClick={() => {
                if (selectedTest) setDeleteId(selectedTest.id);
                setViewOpen(false);
              }}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              {isRtl ? "حذف" : "Delete"}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                if (selectedTest) handleEdit(selectedTest);
                setViewOpen(false);
              }}
            >
              <Pencil className="mr-2 h-4 w-4" />
              {isRtl ? "تعديل" : "Edit"}
            </Button>
            <Button onClick={() => setViewOpen(false)}>{isRtl ? "إغلاق" : "Close"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteId} onOpenChange={(v) => { if (!v) setDeleteId(null); }}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>
              {isRtl ? "تأكيد الحذف" : "Confirm Deletion"}
            </DialogTitle>
            <DialogDescription>
              {isRtl
                ? "هل أنت متأكد من حذف هذا الاختبار؟ لا يمكن التراجع عن هذا الإجراء."
                : "Are you sure you want to delete this test? This action cannot be undone."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteId(null)}>
              {isRtl ? "إلغاء" : "Cancel"}
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              <Trash2 className="mr-2 h-4 w-4" />
              {isRtl ? "حذف" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
