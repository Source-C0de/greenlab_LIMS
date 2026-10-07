// =========================================================================
// Client Requests — Detail page (catalog-driven, read-only rows)
// =========================================================================
// Per product decision: tests on the Client Request are derived from the
// technical-specification catalog — they are NOT free-form rows. The detail
// page displays the current rows read-only and, when in `csr_drafting` or
// `te_rejected`, exposes a "Sync tests from catalog" panel so CSR / lab
// manager can re-derive the row set from the catalog.

import { useMemo, useState, useSyncExternalStore } from "react";
import { Link as WLink, useParams, useLocation } from "wouter";
import {
  workOrdersStore,
  subscribeWorkOrders,
  getWorkOrdersSnapshot,
  findWorkOrder,
} from "@/mock-data/workOrderStore";
import { testMasterData } from "@/mock-data/specifications";
import { useAppContext } from "@/context/AppContext";
import { useAdvanceWorkOrder } from "@/hooks/work-orders/useAdvanceWorkOrder";
import { useWorkOrderTestsFromCatalog } from "@/hooks/work-orders/useWorkOrderTestsFromCatalog";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowRight, ClipboardList, RefreshCcw, FlaskConical } from "lucide-react";
import { toast } from "sonner";
import type { WorkOrderStage } from "@/mock-data/workOrders";
import { TestCatalogPicker } from "@/components/work-orders/TestCatalogPicker";

const ALLOWED_ROLES = new Set(["admin", "lab_manager", "receptionist"]);

const STAGE_LABEL_EN: Record<WorkOrderStage, string> = {
  client_requested: "Client Requested",
  csr_drafting: "CSR Drafting TE",
  te_pending: "TE Pending Approval",
  te_approved: "TE Approved",
  te_rejected: "TE Rejected",
  quotation_drafting: "Quotation Drafting",
  sales_order_pending: "Sales Order Pending",
  sales_order_confirmed: "Sales Order Confirmed",
  ready_for_receiving: "Ready for Receiving",
};

const STAGE_LABEL_AR: Record<WorkOrderStage, string> = {
  client_requested: "طلب العميل",
  csr_drafting: "مسودة فنية من خدمة العملاء",
  te_pending: "بانتظار الموافقة الفنية",
  te_approved: "اعتمدت التقييم الفني",
  te_rejected: "رفض التقييم الفني",
  quotation_drafting: "مسودة عرض السعر",
  sales_order_pending: "بانتظار أمر البيع",
  sales_order_confirmed: "تأكيد أمر البيع",
  ready_for_receiving: "جاهز للاستلام",
};

export default function ClientRequestDetail() {
  const params = useParams<{ "*": string }>();
  const id = (params["*"] ?? "").replace(/\/$/, "");
  const { currentRole, language } = useAppContext();
  const isRtl = language === "ar";
  const [, setLocation] = useLocation();

  useSyncExternalStore(
    subscribeWorkOrders,
    getWorkOrdersSnapshot,
    getWorkOrdersSnapshot,
  );

  const { advance } = useAdvanceWorkOrder();
  const { syncFromCatalog } = useWorkOrderTestsFromCatalog();

  const wo = useMemo(() => findWorkOrder(id ?? ""), [id, workOrdersStore.length]);

  if (!ALLOWED_ROLES.has(currentRole)) {
    return (
      <div className="p-6 text-sm text-muted-foreground">
        {isRtl ? "غير مصرح" : "Not authorized."}
      </div>
    );
  }
  if (!wo) {
    return (
      <div className="p-6 text-sm text-muted-foreground">
        {isRtl ? "أمر العمل غير موجود" : "Work order not found."}
      </div>
    );
  }

  const stageLabel = (s: WorkOrderStage) =>
    isRtl ? STAGE_LABEL_AR[s] : STAGE_LABEL_EN[s];

  const canSyncCatalog =
    wo.stage === "csr_drafting" || wo.stage === "te_rejected";
  const canSendToTe = wo.stage === "csr_drafting";

  // Catalog sync state.
  const [syncOpen, setSyncOpen] = useState(false);
  // Pre-check: TestMaster ids whose testName already matches an existing
  // row's testRequired (best-effort back-link to the catalog).
  const [selectedTestIds, setSelectedTestIds] = useState<string[]>(() => {
    const names = new Set(wo.testRows.map((r) => r.testRequired));
    return testMasterData
      .filter((t) => names.has(t.testName))
      .map((t) => t.id);
  });

  const handleSyncSave = () => {
    const picked = testMasterData.filter((t) => selectedTestIds.includes(t.id));
    const result = syncFromCatalog(wo.id, picked);
    if (result.ok) {
      toast.success(
        isRtl
          ? `تمت مزامنة ${result.rows.length} اختبار من الكتالوج`
          : `Synced ${result.rows.length} tests from catalog.`,
      );
      setSyncOpen(false);
    } else {
      toast.error(isRtl ? "فشلت المزامنة" : "Sync failed.");
    }
  };

  const handleAdvance = (toStage: WorkOrderStage, note?: string) => {
    const result = advance({ workOrderId: wo.id, toStage, note });
    if (result) {
      if (toStage === "te_pending") {
        toast.success(
          isRtl ? "تم إرسال الطلب للتقييم الفني" : "Sent to TE for review.",
        );
        setLocation("/technical-evaluation");
      } else {
        toast.success(isRtl ? "تم تحديث المرحلة" : "Stage advanced.");
      }
    }
  };

  return (
    <div className="space-y-4 p-4 md:p-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-primary" />
            <h1 className="text-2xl font-semibold tracking-tight font-mono">
              {wo.id}
            </h1>
            <StatusBadge status={wo.stage} />
          </div>
          <p className="text-sm text-muted-foreground">
            {wo.clientName} • {wo.sampleName}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {wo.stage === "client_requested" && (
            <Button
              variant="outline"
              onClick={() => handleAdvance("csr_drafting")}
            >
              <ArrowRight className="h-4 w-4 me-1" />
              {isRtl ? "بدء المسودة الفنية" : "Start TE draft"}
            </Button>
          )}
          {canSendToTe && (
            <Button onClick={() => handleAdvance("te_pending")}>
              <ArrowRight className="h-4 w-4 me-1" />
              {isRtl ? "إرسال للتقييم الفني" : "Send to TE"}
            </Button>
          )}
        </div>
      </div>

      {wo.rejectionReason && (
        <div className="rounded-md border border-red-200 bg-red-50 text-red-900 dark:bg-red-950/30 dark:text-red-200 dark:border-red-800 px-4 py-2 text-sm">
          <strong>{isRtl ? "سبب الرفض:" : "Rejection reason:"}</strong>{" "}
          {wo.rejectionReason}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="md:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
            <CardTitle className="text-base">
              <span className="inline-flex items-center gap-2">
                <FlaskConical className="h-4 w-4 text-primary" />
                {isRtl ? "الاختبارات (من المواصفات)" : "Tests (from specifications)"}
              </span>
            </CardTitle>
            {canSyncCatalog && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSyncOpen((s) => !s)}
              >
                <RefreshCcw className="h-4 w-4 me-1" />
                {syncOpen
                  ? isRtl
                    ? "إخفاء"
                    : "Hide"
                  : isRtl
                    ? "مزامنة من الكتالوج"
                    : "Sync from catalog"}
              </Button>
            )}
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>{isRtl ? "الاختبار" : "Test"}</TableHead>
                    <TableHead>
                      {isRtl ? "الجهاز" : "Technique"}
                    </TableHead>
                    <TableHead>{isRtl ? "الحالة" : "Status"}</TableHead>
                    <TableHead>{isRtl ? "المرجع" : "Ref"}</TableHead>
                    <TableHead>
                      {isRtl ? "عدد" : "# Samples"}
                    </TableHead>
                    <TableHead>{isRtl ? "العمود" : "Column"}</TableHead>
                    <TableHead>STD</TableHead>
                    <TableHead>{isRtl ? "الكواشف" : "Reagent"}</TableHead>
                    <TableHead>{isRtl ? "المدة" : "Time"}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {wo.testRows.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={10}
                        className="text-center text-sm text-muted-foreground py-6"
                      >
                        {isRtl
                          ? "لا توجد اختبارات بعد. استخدم زر «مزامنة من الكتالوج» لإضافة اختبارات من المواصفات."
                          : 'No tests yet. Use "Sync from catalog" to add tests from the specifications.'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    wo.testRows.map((r, idx) => (
                      <TableRow key={r.id}>
                        <TableCell className="text-xs text-muted-foreground">
                          {idx + 1}
                        </TableCell>
                        <TableCell className="font-medium">
                          {r.testRequired}
                        </TableCell>
                        <TableCell>{r.techniqueInstrument}</TableCell>
                        <TableCell>{r.status}</TableCell>
                        <TableCell className="text-xs font-mono">
                          {r.reference}
                        </TableCell>
                        <TableCell>{r.numberOfSamples}</TableCell>
                        <TableCell>{r.column}</TableCell>
                        <TableCell>{r.std}</TableCell>
                        <TableCell>{r.chemicalReagent}</TableCell>
                        <TableCell>{r.timeFrame}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {canSyncCatalog && syncOpen && (
              <div className="mt-4 rounded-md border border-dashed p-3 space-y-3">
                <div className="text-sm font-medium">
                  {isRtl
                    ? "مزامنة الاختبارات من الكتالوج"
                    : "Sync tests from the catalog"}
                </div>
                <p className="text-xs text-muted-foreground">
                  {isRtl
                    ? "سيتم استبدال قائمة الاختبارات الحالية بالكامل بناءً على اختيارك من الكتالوج."
                    : "The current test list will be fully replaced based on your catalog selection."}
                </p>
                <TestCatalogPicker
                  sampleType={wo.sampleType}
                  selectedIds={selectedTestIds}
                  onChange={setSelectedTestIds}
                  isRtl={isRtl}
                />
                <div className="flex justify-end">
                  <Button onClick={handleSyncSave}>
                    <RefreshCcw className="h-4 w-4 me-1" />
                    {isRtl ? "تطبيق المزامنة" : "Apply sync"}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {isRtl ? "معلومات الطلب" : "Request info"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Row label={isRtl ? "العميل" : "Client"} value={wo.clientName} />
            <Row label={isRtl ? "نوع العينة" : "Sample type"} value={wo.sampleType} />
            <Row label={isRtl ? "اسم العينة" : "Sample name"} value={wo.sampleName} />
            <Row label={isRtl ? "الوصف" : "Description"} value={wo.description || "—"} />
            <Row label={isRtl ? "طالبة الاختبار" : "Requested by"} value={wo.requestedBy || "—"} />
            <Row label={isRtl ? "رقم AOF" : "AOF No."} value={wo.aofNumber} />
            <Row label={isRtl ? "طريقة الاستلام" : "Received via"} value={wo.receivedVia} />
            <Row label={isRtl ? "تاريخ الطلب" : "Requested at"} value={wo.requestedAt} />
            <div className="pt-2 border-t mt-2">
              <div className="text-xs text-muted-foreground">
                {isRtl ? "أعد بواسطة" : "Prepared by"}
              </div>
              <div>
                {wo.preparedByName} • {wo.preparedByPosition}
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">
                {isRtl ? "راجع بواسطة" : "Checked by"}
              </div>
              <div>
                {wo.checkedByName} • {wo.checkedByPosition}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {isRtl ? "سجل المراحل" : "Stage history"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="space-y-3 ms-4 border-s ps-4">
            {wo.stageHistory.map((h, idx) => (
              <li key={idx} className="relative">
                <span className="absolute -start-[26px] top-1 h-2 w-2 rounded-full bg-primary" />
                <div className="text-sm">
                  <span className="font-medium">{stageLabel(h.stage)}</span>{" "}
                  <span className="text-muted-foreground">
                    {isRtl ? "بواسطة" : "by"} {h.byUserName} ({h.byUserRole}) •{" "}
                    {h.at.split("T")[0]}
                  </span>
                </div>
                {h.note && (
                  <div className="text-xs text-muted-foreground">{h.note}</div>
                )}
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>

      <div className="text-xs text-muted-foreground">
        {isRtl ? "ملاحظة:" : "Note:"}{" "}
        {isRtl
          ? "بمجرد الاعتماد من التقييم الفني، تتابع CSR لإنشاء عرض السعر."
          : "Once TE approves, CSR proceeds to build the quotation."}{" "}
        <WLink to="/technical-evaluation" className="underline">
          {isRtl ? "اذهب إلى التقييم الفني" : "Go to Technical Evaluation →"}
        </WLink>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2 border-b border-dashed pb-1">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-end">{value}</span>
    </div>
  );
}