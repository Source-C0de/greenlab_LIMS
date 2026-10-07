// =========================================================================
// Client Requests — list page
// =========================================================================
// Shows work orders in the early pipeline stages (client_requested, csr_drafting,
// te_pending, te_rejected). Role-gated: admin, lab_manager, receptionist.

import { useMemo, useState, useSyncExternalStore } from "react";
import { Link } from "wouter";
import {
  workOrdersStore,
  subscribeWorkOrders,
  getWorkOrdersSnapshot,
} from "@/mock-data/workOrderStore";
import { useAppContext } from "@/context/AppContext";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Plus, Search, ClipboardList, Eye } from "lucide-react";
import { toast } from "sonner";
import type { WorkOrder, WorkOrderStage } from "@/mock-data/workOrders";
import { useAdvanceWorkOrder } from "@/hooks/work-orders/useAdvanceWorkOrder";

const ALLOWED_ROLES = new Set(["admin", "lab_manager", "receptionist"]);

const STAGE_LABEL_EN: Record<WorkOrderStage, string> = {
  client_requested: "Client Requested",
  csr_drafting: "CSR Drafting TE",
  te_pending: "TE Pending",
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

export default function ClientRequestsList() {
  const { currentRole, language } = useAppContext();
  const isRtl = language === "ar";

  useSyncExternalStore(
    subscribeWorkOrders,
    getWorkOrdersSnapshot,
    getWorkOrdersSnapshot,
  );

  const { advance } = useAdvanceWorkOrder();
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState<"all" | WorkOrderStage>("all");

  if (!ALLOWED_ROLES.has(currentRole)) {
    return (
      <div className="p-6 text-sm text-muted-foreground">
        {isRtl ? "غير مصرح بالوصول" : "Not authorized to view this page."}
      </div>
    );
  }

  const filtered = useMemo(() => {
    const early: WorkOrderStage[] = [
      "client_requested",
      "csr_drafting",
      "te_pending",
      "te_rejected",
    ];
    return workOrdersStore
      .filter((w) => early.includes(w.stage))
      .filter((w) =>
        stageFilter === "all" ? true : w.stage === stageFilter,
      )
      .filter((w) => {
        if (!search.trim()) return true;
        const q = search.toLowerCase();
        return (
          w.id.toLowerCase().includes(q) ||
          w.clientName.toLowerCase().includes(q) ||
          w.sampleName.toLowerCase().includes(q) ||
          w.aofNumber.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => (a.requestedAt < b.requestedAt ? 1 : -1));
  }, [search, stageFilter]);

  const stageLabel = (s: WorkOrderStage) =>
    isRtl ? STAGE_LABEL_AR[s] : STAGE_LABEL_EN[s];

  const handleAdvanceToCsrDrafting = (wo: WorkOrder) => {
    const result = advance({
      workOrderId: wo.id,
      toStage: "csr_drafting",
      note: isRtl ? "بدء المسودة الفنية" : "Started TE draft",
    });
    if (result) {
      toast.success(
        isRtl
          ? `بدأت المسودة الفنية لـ ${wo.id}`
          : `TE draft started for ${wo.id}`,
      );
    }
  };

  return (
    <div className="space-y-4 p-4 md:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <ClipboardList className="h-6 w-6 text-primary" />
            {isRtl ? "طلبات العملاء" : "Client Requests"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {isRtl
              ? "إدارة طلبات العملاء قبل وصول العينة"
              : "Pre-sample client request pipeline."}
          </p>
        </div>
        <Button asChild>
          <Link to="/client-requests/new">
            <Plus className="h-4 w-4 me-1" />
            {isRtl ? "طلب جديد" : "New Client Request"}
          </Link>
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={
              isRtl
                ? "ابحث بالمعرّف أو العميل أو رقم AOF"
                : "Search by ID, client, AOF no."
            }
            className="ps-9"
          />
        </div>
        <Select
          value={stageFilter}
          onValueChange={(v) => setStageFilter(v as "all" | WorkOrderStage)}
        >
          <SelectTrigger className="w-full sm:w-56">
            <SelectValue placeholder={isRtl ? "كل المراحل" : "All stages"} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">
              {isRtl ? "كل المراحل" : "All stages"}
            </SelectItem>
            {(
              [
                "client_requested",
                "csr_drafting",
                "te_pending",
                "te_rejected",
              ] as WorkOrderStage[]
            ).map((s) => (
              <SelectItem key={s} value={s}>
                {stageLabel(s)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{isRtl ? "المعرّف" : "ID"}</TableHead>
              <TableHead>{isRtl ? "العميل" : "Client"}</TableHead>
              <TableHead>{isRtl ? "العينة" : "Sample"}</TableHead>
              <TableHead>{isRtl ? "AOF" : "AOF No."}</TableHead>
              <TableHead>{isRtl ? "المرحلة" : "Stage"}</TableHead>
              <TableHead>{isRtl ? "تاريخ الطلب" : "Requested"}</TableHead>
              <TableHead className="text-end">
                {isRtl ? "إجراءات" : "Actions"}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="text-center text-sm text-muted-foreground py-6"
                >
                  {isRtl ? "لا توجد طلبات" : "No client requests."}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((wo) => (
                <TableRow key={wo.id}>
                  <TableCell className="font-mono font-medium text-primary whitespace-nowrap">
                    <Link to={`/client-requests/${wo.id}`}>{wo.id}</Link>
                  </TableCell>
                  <TableCell>{wo.clientName}</TableCell>
                  <TableCell>{wo.sampleName}</TableCell>
                  <TableCell className="font-mono text-xs">
                    {wo.aofNumber}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={wo.stage} />
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {wo.requestedAt}
                  </TableCell>
                  <TableCell className="text-end">
                    <div className="flex justify-end gap-1">
                      <Button asChild variant="outline" size="icon">
                        <Link to={`/client-requests/${wo.id}`}>
                          <Eye className="h-3.5 w-3.5" />
                        </Link>
                      </Button>
                      {wo.stage === "client_requested" && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleAdvanceToCsrDrafting(wo)}
                        >
                          {isRtl ? "بدء المسودة" : "Start TE draft"}
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}