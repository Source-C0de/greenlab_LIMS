// =========================================================================
// Technical Evaluation — Detail / Review page
// =========================================================================
// Renders the TE form (matching the user's image 1 layout) for review by
// lab_manager / admin. Approve / Reject / Send-back actions.

import { useMemo, useState, useSyncExternalStore } from "react";
import { useParams, useLocation } from "wouter";
import {
  subscribeWorkOrders,
  getWorkOrdersSnapshot,
  findWorkOrder,
} from "@/mock-data/workOrderStore";
import { useAppContext } from "@/context/AppContext";
import { useAdvanceWorkOrder } from "@/hooks/work-orders/useAdvanceWorkOrder";
import { useWorkOrderRows } from "@/hooks/work-orders/useWorkOrderRows";
import { useAddTestsFromCatalog } from "@/hooks/work-orders/useAddTestsFromCatalog";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  CheckCircle2,
  ClipboardCheck,
  Pencil,
  Plus,
  Printer,
  RotateCcw,
  Search,
  Trash2,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import type { WorkOrder, WorkOrderTestRow } from "@/mock-data/workOrders";
import { testMasterData, type TestMaster } from "@/mock-data/specifications";
import { TestRowEditor } from "@/components/work-orders/TestRowEditor";
import type { WorkOrderRowDraft } from "@/hooks/work-orders/types";
import { cn } from "@/lib/utils";

const APPROVER_ROLES = new Set(["admin", "lab_manager"]);

export default function TechnicalEvaluationDetail() {
  const params = useParams<{ "*": string }>();
  const id = (params["*"] ?? "").replace(/\/$/, "");
  const { currentRole, language } = useAppContext();
  const isRtl = language === "ar";
  const [, setLocation] = useLocation();

  const workOrdersTick = useSyncExternalStore(
    subscribeWorkOrders,
    getWorkOrdersSnapshot,
    getWorkOrdersSnapshot,
  );

  const { advance } = useAdvanceWorkOrder();
  const { addRow, updateRow, deleteRow } = useWorkOrderRows();
  const { addFromCatalog } = useAddTestsFromCatalog();

  const wo = useMemo(() => findWorkOrder(id ?? ""), [id, workOrdersTick]);
  if (!wo) {
    return (
      <div className="p-6 text-sm text-muted-foreground">
        {isRtl ? "غير موجود" : "Work order not found."}
      </div>
    );
  }

  const canAct = APPROVER_ROLES.has(currentRole) && wo.stage === "te_pending";
  const canRevise = APPROVER_ROLES.has(currentRole) && wo.stage === "te_approved";
  // Per spec: lab_manager + admin can edit rows in ANY TE stage
  // (te_pending, te_approved, te_rejected). Header fields stay read-only.
  const canEditRows = APPROVER_ROLES.has(currentRole);

  // TestRowEditor dialog state
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingRow, setEditingRow] = useState<WorkOrderTestRow | undefined>(
    undefined,
  );

  // Catalog search panel state (lab_manager / admin in any TE stage).
  const [catalogPanelOpen, setCatalogPanelOpen] = useState(false);
  const [catalogQuery, setCatalogQuery] = useState("");

  const openAddRow = () => {
    setEditingRow(undefined);
    setEditorOpen(true);
  };
  const openEditRow = (row: WorkOrderTestRow) => {
    setEditingRow(row);
    setEditorOpen(true);
  };

  const handleAddFromCatalog = (m: TestMaster) => {
    const result = addFromCatalog(wo.id, [m]);
    if (!result.ok) {
      toast.error(isRtl ? "فشل الإضافة" : "Could not add test.");
      return;
    }
    if (result.addedCount > 0) {
      toast.success(
        isRtl
          ? `تمت إضافة «${m.testName}» من الكتالوج`
          : `Added "${m.testName}" from catalog.`,
      );
    } else {
      toast.info(
        isRtl
          ? `«${m.testName}» موجود بالفعل في القائمة`
          : `"${m.testName}" is already on the list.`,
      );
    }
  };

  const handleDeleteRow = (row: WorkOrderTestRow) => {
    const ok = deleteRow({ workOrderId: wo.id, rowId: row.id });
    if (ok) {
      toast.success(
        isRtl
          ? `تم حذف «${row.testRequired}»`
          : `Deleted "${row.testRequired}".`,
      );
    } else {
      toast.error(isRtl ? "فشل الحذف" : "Could not delete row.");
    }
  };

  const handleSaveRow = (draft: WorkOrderRowDraft) => {
    if (!draft.testRequired.trim()) {
      toast.error(
        isRtl ? "يرجى إدخال اسم الاختبار" : "Please enter the test name.",
      );
      return;
    }
    if (editingRow) {
      const updated = updateRow({
        workOrderId: wo.id,
        rowId: editingRow.id,
        row: draft,
      });
      if (updated) {
        toast.success(isRtl ? "تم تحديث الصف" : "Row updated.");
        setEditorOpen(false);
      }
    } else {
      const row = addRow({ workOrderId: wo.id, row: draft });
      if (row) {
        toast.success(isRtl ? "تمت إضافة الصف" : "Row added.");
        setEditorOpen(false);
      }
    }
  };

  // Reject dialog
  const [rejectOpen, setRejectOpen] = useState(false);
  const [reason, setReason] = useState("");

  const handleApprove = () => {
    const result = advance({
      workOrderId: wo.id,
      toStage: "te_approved",
      note: isRtl ? "اعتمد التقييم الفني" : "TE approved",
    });
    if (result) {
      toast.success(isRtl ? "تم اعتماد التقييم الفني" : "TE approved.");
      setLocation("/technical-evaluation");
    }
  };

  const handleReject = () => {
    if (!reason.trim()) {
      toast.error(isRtl ? "يرجى إدخال سبب الرفض" : "Please provide a reason.");
      return;
    }
    const result = advance({
      workOrderId: wo.id,
      toStage: "te_rejected",
      rejectionReason: reason,
      note: isRtl ? "رفض التقييم الفني" : "TE rejected",
    });
    if (result) {
      toast.success(isRtl ? "تم رفض التقييم" : "TE rejected.");
      setRejectOpen(false);
      setLocation("/technical-evaluation");
    }
  };

  const handleSendBackForRevision = () => {
    const result = advance({
      workOrderId: wo.id,
      toStage: "csr_drafting",
      note: isRtl
        ? "إعادة المسودة الفنية للتعديل"
        : "Returned to CSR for revision",
    });
    if (result) {
      toast.success(
        isRtl ? "تم إرجاع الطلب لخدمة العملاء" : "Returned to CSR for revision.",
      );
      setLocation("/client-requests");
    }
  };

  const handlePrint = () => window.print();

  return (
    <div className="space-y-4 p-4 md:p-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 print:hidden">
        <div>
          <div className="flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5 text-primary" />
            <h1 className="text-2xl font-semibold tracking-tight font-mono">
              {wo.id}
            </h1>
            <StatusBadge status={wo.stage} />
          </div>
          <p className="text-sm text-muted-foreground">
            {isRtl
              ? "نموذج التقييم الفني"
              : "Technical Evaluation Form"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={handlePrint}>
            <Printer className="h-4 w-4 me-1" />
            {isRtl ? "طباعة" : "Print"}
          </Button>
          {canEditRows && (
            <>
              <Button
                variant="outline"
                onClick={() => setCatalogPanelOpen((s) => !s)}
              >
                <Search className="h-4 w-4 me-1" />
                {catalogPanelOpen
                  ? isRtl
                    ? "إخفاء البحث"
                    : "Hide search"
                  : isRtl
                    ? "بحث في الاختبارات"
                    : "Search tests"}
              </Button>
              <Button variant="outline" onClick={openAddRow}>
                <Plus className="h-4 w-4 me-1" />
                {isRtl ? "إضافة صف" : "Add row"}
              </Button>
            </>
          )}
          {canAct && (
            <>
              <Button variant="outline" onClick={handleSendBackForRevision}>
                <RotateCcw className="h-4 w-4 me-1" />
                {isRtl ? "إعادة للمسودة" : "Send back"}
              </Button>
              <Button
                variant="outline"
                onClick={() => setRejectOpen(true)}
                className="text-red-700 border-red-200"
              >
                <XCircle className="h-4 w-4 me-1" />
                {isRtl ? "رفض" : "Reject"}
              </Button>
              <Button onClick={handleApprove}>
                <CheckCircle2 className="h-4 w-4 me-1" />
                {isRtl ? "اعتماد" : "Approve"}
              </Button>
            </>
          )}
          {canRevise && (
            <Button variant="outline" onClick={handleSendBackForRevision}>
              <RotateCcw className="h-4 w-4 me-1" />
              {isRtl ? "إعادة للمسودة" : "Send back for revision"}
            </Button>
          )}
        </div>
      </div>

      {wo.rejectionReason && (
        <div className="rounded-md border border-red-200 bg-red-50 text-red-900 dark:bg-red-950/30 dark:text-red-200 dark:border-red-800 px-4 py-2 text-sm print:hidden">
          <strong>{isRtl ? "سبب الرفض:" : "Rejection reason:"}</strong>{" "}
          {wo.rejectionReason}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {isRtl ? "نموذج التقييم الفني" : "Technical Evaluation Form"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Header table with ISO/IEC / AOF / Client fields */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm border-b pb-3">
            <HeaderField
              label={isRtl ? "اسم العينة" : "Sample Name"}
              value={wo.sampleName}
            />
            <HeaderField
              label={isRtl ? "اسم العميل" : "Customer Name"}
              value={wo.clientName}
            />
            <HeaderField
              label={isRtl ? "رقم AOF" : "AOF No."}
              value={wo.aofNumber}
            />
            <HeaderField
              label={isRtl ? "طريقة الاستلام" : "Received via"}
              value={wo.receivedVia}
            />
          </div>

          {/* Catalog search panel — only when canEditRows AND toggled open.
              This is the lab_manager's way to add a test the CSR didn't pick,
              without editing rows by hand. */}
          {canEditRows && catalogPanelOpen && (
            <div className="rounded-md border border-dashed p-3 space-y-3 print:hidden">
              <div className="text-sm font-medium">
                {isRtl
                  ? "إضافة اختبار من قائمة الاختبارات"
                  : "Add test from the test list"}
              </div>
              <p className="text-xs text-muted-foreground">
                {isRtl
                  ? "ابحث في كتالوج الاختبارات، ثم اضغط «إضافة» لإلحاق الاختبار بقائمة هذا الطلب. الاختبارات الموجودة مسبقاً تظهر بعلامة «مضاف»."
                  : 'Search the test catalog, then press "Add" to append it to this work order. Tests already on the list are shown as "Added".'}
              </p>
              <div className="relative">
                <Search
                  className={cn(
                    "h-4 w-4 absolute top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none",
                    isRtl ? "right-2" : "left-2",
                  )}
                />
                <Input
                  value={catalogQuery}
                  onChange={(e) => setCatalogQuery(e.target.value)}
                  placeholder={
                    isRtl
                      ? "ابحث بالاسم أو الكود أو المرجع..."
                      : "Search by name, code, or reference..."
                  }
                  className={isRtl ? "pr-8" : "pl-8"}
                />
              </div>
              <ul className="divide-y rounded-md border bg-card max-h-72 overflow-y-auto">
                {(() => {
                  const q = catalogQuery.trim().toLowerCase();
                  const matches = testMasterData.filter((t) => {
                    if (!q) return true;
                    return (
                      t.testName.toLowerCase().includes(q) ||
                      t.testCode.toLowerCase().includes(q) ||
                      t.testParameter.toLowerCase().includes(q) ||
                      t.methodReference.toLowerCase().includes(q) ||
                      t.sampleType.toLowerCase().includes(q)
                    );
                  });
                  if (matches.length === 0) {
                    return (
                      <li className="px-3 py-4 text-center text-sm text-muted-foreground">
                        {isRtl ? "لا توجد نتائج" : "No matches."}
                      </li>
                    );
                  }
                  const alreadyAdded = new Set(
                    wo.testRows.map((r) => r.testRequired),
                  );
                  return matches.map((m) => {
                    const added = alreadyAdded.has(m.testName);
                    return (
                      <li
                        key={m.id}
                        className="flex items-center gap-3 px-3 py-2 hover:bg-muted/30"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-sm">
                              {m.testName}
                            </span>
                            <Badge
                              variant="outline"
                              className="text-[10px] font-mono"
                            >
                              {m.testCode}
                            </Badge>
                            <Badge
                              variant="secondary"
                              className="text-[10px]"
                            >
                              {m.sampleType}
                            </Badge>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {m.testParameter} • {m.methodType} •{" "}
                            {m.methodReference}
                          </div>
                        </div>
                        {added ? (
                          <Badge
                            variant="secondary"
                            className="shrink-0 text-[10px] bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/30"
                          >
                            {isRtl ? "مضاف" : "Added"}
                          </Badge>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleAddFromCatalog(m)}
                          >
                            <Plus className="h-3.5 w-3.5 me-1" />
                            {isRtl ? "إضافة" : "Add"}
                          </Button>
                        )}
                      </li>
                    );
                  });
                })()}
              </ul>
            </div>
          )}

          {/* Main test table — row #, test name, then 8 detail fields + actions. */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-muted text-xs uppercase">
                  <th className="border px-2 py-1.5 text-start w-12">
                    {isRtl ? "م" : "#"}
                  </th>
                  <th className="border px-2 py-1.5 text-start">
                    {isRtl ? "الاختبار" : "Test required"}
                  </th>
                  <th className="border px-2 py-1.5 text-start">
                    {isRtl ? "الجهاز" : "Technique/Instrument"}
                  </th>
                  <th className="border px-2 py-1.5 text-start">
                    {isRtl ? "الحالة" : "Status"}
                  </th>
                  <th className="border px-2 py-1.5 text-start">
                    {isRtl ? "المرجع" : "Reference"}
                  </th>
                  <th className="border px-2 py-1.5 text-start">
                    {isRtl ? "عدد العينات" : "No. of Samples"}
                  </th>
                  <th className="border px-2 py-1.5 text-start">
                    {isRtl ? "العمود" : "Column"}
                  </th>
                  <th className="border px-2 py-1.5 text-start">STD</th>
                  <th className="border px-2 py-1.5 text-start">
                    {isRtl ? "الكواشف" : "Chemical/Reagent"}
                  </th>
                  <th className="border px-2 py-1.5 text-start">
                    {isRtl ? "المدة" : "Time frame"}
                  </th>
                  {canEditRows && (
                    <th className="border px-2 py-1.5 text-start print:hidden w-24">
                      {isRtl ? "إجراءات" : "Actions"}
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {wo.testRows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={canEditRows ? 11 : 10}
                      className="border px-2 py-3 text-center text-muted-foreground"
                    >
                      {isRtl ? "لا توجد صفوف" : "No test rows."}
                    </td>
                  </tr>
                ) : (
                  wo.testRows.map((r, idx) => (
                    <tr key={r.id}>
                      <td className="border px-2 py-1.5 text-xs text-muted-foreground">
                        {idx + 1}
                      </td>
                      <td className="border px-2 py-1.5 font-medium">
                        {r.testRequired}
                      </td>
                      <td className="border px-2 py-1.5">
                        {r.techniqueInstrument}
                      </td>
                      <td className="border px-2 py-1.5">{r.status}</td>
                      <td className="border px-2 py-1.5 text-xs font-mono">
                        {r.reference}
                      </td>
                      <td className="border px-2 py-1.5">{r.numberOfSamples}</td>
                      <td className="border px-2 py-1.5">{r.column}</td>
                      <td className="border px-2 py-1.5">{r.std}</td>
                      <td className="border px-2 py-1.5">{r.chemicalReagent}</td>
                      <td className="border px-2 py-1.5">{r.timeFrame}</td>
                      {canEditRows && (
                        <td className="border px-2 py-1.5 print:hidden">
                          <div className="flex items-center gap-1">
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => openEditRow(r)}
                              title={isRtl ? "تعديل الصف" : "Edit row"}
                              aria-label={
                                isRtl
                                  ? `تعديل ${r.testRequired}`
                                  : `Edit ${r.testRequired}`
                              }
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => handleDeleteRow(r)}
                              title={isRtl ? "حذف الصف" : "Delete row"}
                              aria-label={
                                isRtl
                                  ? `حذف ${r.testRequired}`
                                  : `Delete ${r.testRequired}`
                              }
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Footer signatures */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div className="border-t pt-2">
              <div className="text-xs text-muted-foreground">
                {isRtl ? "أعد بواسطة" : "Prepared by"}
              </div>
              <div className="font-medium">{wo.preparedByName}</div>
              <div className="text-xs">{wo.preparedByPosition}</div>
              <div className="text-xs text-muted-foreground mt-2">
                {isRtl ? "التوقيع:" : "Signature:"}{" "}
                <span className="italic font-mono">_____</span>
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {isRtl ? "التاريخ:" : "Date:"} {wo.requestedAt}
              </div>
            </div>
            <div className="border-t pt-2">
              <div className="text-xs text-muted-foreground">
                {isRtl ? "راجع بواسطة" : "Checked By"}
              </div>
              <div className="font-medium">{wo.checkedByName}</div>
              <div className="text-xs">{wo.checkedByPosition}</div>
              <div className="text-xs text-muted-foreground mt-2">
                {isRtl ? "التوقيع:" : "Signature:"}{" "}
                <span className="italic font-mono">_____</span>
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {isRtl ? "التاريخ:" : "Date:"} {wo.requestedAt}
              </div>
            </div>
          </div>

          <div className="text-center text-xs text-muted-foreground pt-2">
            ISO/IEC 17025:2017 • Quality Management System •{" "}
            {isRtl ? "صفحة ١ من ١" : "Page 1 of 1"}
          </div>
        </CardContent>
      </Card>

      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {isRtl ? "رفض التقييم الفني" : "Reject Technical Evaluation"}
            </DialogTitle>
            <DialogDescription>
              {isRtl
                ? "يرجى ذكر سبب الرفض — سيراه فريق CSR."
                : "Please provide a reason — the CSR team will see this."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>{isRtl ? "السبب" : "Reason"}</Label>
            <Textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={
                isRtl
                  ? "مثلاً: اختبار غير قابل للتطبيق في المختبر"
                  : " "
              }
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectOpen(false)}>
              {isRtl ? "إلغاء" : "Cancel"}
            </Button>
            <Button variant="destructive" onClick={handleReject}>
              {isRtl ? "تأكيد الرفض" : "Confirm rejection"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <TestRowEditor
        open={editorOpen}
        onOpenChange={setEditorOpen}
        row={editingRow}
        onSave={handleSaveRow}
        isRtl={isRtl}
      />
    </div>
  );
}

function HeaderField({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-b border-dashed pb-1">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-medium">{value}</div>
    </div>
  );
}