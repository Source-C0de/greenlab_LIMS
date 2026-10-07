// =========================================================================
// Technical Evaluation — list page
// =========================================================================
// Shows work orders in TE stages (te_pending, te_approved, te_rejected).
// Role-gated: admin, lab_manager.

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
import { ClipboardCheck, Search, Eye } from "lucide-react";
import type { WorkOrder, WorkOrderStage } from "@/mock-data/workOrders";

const ALLOWED_ROLES = new Set(["admin", "lab_manager"]);

export default function TechnicalEvaluationList() {
  const { currentRole, language } = useAppContext();
  const isRtl = language === "ar";

  useSyncExternalStore(
    subscribeWorkOrders,
    getWorkOrdersSnapshot,
    getWorkOrdersSnapshot,
  );

  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState<"all" | WorkOrderStage>("all");

  if (!ALLOWED_ROLES.has(currentRole)) {
    return (
      <div className="p-6 text-sm text-muted-foreground">
        {isRtl ? "غير مصرح" : "Not authorized."}
      </div>
    );
  }

  const filtered = useMemo(() => {
    const teStages: WorkOrderStage[] = [
      "te_pending",
      "te_approved",
      "te_rejected",
    ];
    return workOrdersStore
      .filter((w) => teStages.includes(w.stage))
      .filter((w) => (stageFilter === "all" ? true : w.stage === stageFilter))
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

  const submittedAt = (w: WorkOrder) => {
    const e = [...w.stageHistory]
      .reverse()
      .find((h) => h.stage === "te_pending");
    return e ? e.at.split("T")[0] : w.requestedAt;
  };

  return (
    <div className="space-y-4 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
          <ClipboardCheck className="h-6 w-6 text-primary" />
          {isRtl ? "التقييم الفني" : "Technical Evaluation"}
        </h1>
        <p className="text-sm text-muted-foreground">
          {isRtl
            ? "مراجعة المسودات الفنية واعتمادها أو رفضها"
            : "Review and approve / reject technical evaluation drafts."}
        </p>
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
            <SelectItem value="te_pending">
              {isRtl ? "بانتظار الموافقة" : "Pending"}
            </SelectItem>
            <SelectItem value="te_approved">
              {isRtl ? "معتمد" : "Approved"}
            </SelectItem>
            <SelectItem value="te_rejected">
              {isRtl ? "مرفوض" : "Rejected"}
            </SelectItem>
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
              <TableHead>{isRtl ? "المرحلة" : "Stage"}</TableHead>
              <TableHead>
                {isRtl ? "وصلت في" : "Submitted"}
              </TableHead>
              <TableHead className="text-end">
                {isRtl ? "إجراءات" : "Actions"}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="text-center text-sm text-muted-foreground py-6"
                >
                  {isRtl ? "لا توجد تقييمات" : "No technical evaluations."}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((wo) => (
                <TableRow key={wo.id}>
                  <TableCell className="font-mono font-medium text-primary whitespace-nowrap">
                    <Link to={`/technical-evaluation/${wo.id}`}>{wo.id}</Link>
                  </TableCell>
                  <TableCell>{wo.clientName}</TableCell>
                  <TableCell>{wo.sampleName}</TableCell>
                  <TableCell>
                    <StatusBadge status={wo.stage} />
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {submittedAt(wo)}
                  </TableCell>
                  <TableCell className="text-end">
                    <Button asChild variant="outline" size="icon">
                      <Link to={`/technical-evaluation/${wo.id}`}>
                        <Eye className="h-3.5 w-3.5" />
                      </Link>
                    </Button>
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