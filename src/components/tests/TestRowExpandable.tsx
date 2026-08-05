// =========================================================================
// TestRowExpandable — single parameter row inside the sample test table.
// The parent TestTable now flattens every test's parameters into one row
// each, so this component renders the analytical columns
// (Test/Parameter / Limit / Result / Unit / MU / Reference) plus Status and
// a View action. Expanding the row reveals the parameter detail and recent
// review decision history. Read-only — approval / rejection actions live in
// the single TestReviewDrawer opened from the sample header's "Review" button.
// =========================================================================

import { useState } from "react";
import {
  TableCell,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { ApprovalChainPanel } from "@/components/approvals/ApprovalChainPanel";
import { useAppContext } from "@/context/AppContext";
import {
  currentStage,
  roleForStage,
  type ParameterValue,
} from "@/mock-data/samples";
import { approvalLabels } from "@/hooks/test-approvals/labels";
import {
  ChevronRight,
  Eye,
  History,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

// Re-export the Test type so consumers (TestTable) can keep using
// TestTableTest as an alias for the domain Test.
export type TestTableTest = import("@/mock-data/samples").Test;

interface TestRowExpandableProps {
  test: TestTableTest;
  parameter: ParameterValue;
  onView: (id: string) => void;
  analystPickerOpen?: boolean;
  onAnalystPickerOpenChange?: (open: boolean) => void;
  analystSearch?: string;
  onAnalystSearchChange?: (s: string) => void;
  filteredAnalysts?: any[];
  onAssignAnalyst?: (analyst: any | null) => void;
  canEditAnalyst?: boolean;
}

// Format the Limit column to show "<min> – <max> <unit>". When only one side
// of the range is defined we render a half-open style (≥ min or ≤ max).
function formatLimit(p: ParameterValue): string {
  if (p.min == null && p.max == null) return "—";
  if (p.min != null && p.max != null) {
    const l = Number.isInteger(p.min) ? p.min.toString() : p.min.toFixed(2);
    const r = Number.isInteger(p.max) ? p.max.toString() : p.max.toFixed(2);
    return `${l} – ${r}${p.unit ? ` ${p.unit}` : ""}`;
  }
  if (p.min != null) return `≥ ${p.min}${p.unit ? ` ${p.unit}` : ""}`;
  return `≤ ${p.max}${p.unit ? ` ${p.unit}` : ""}`;
}

function formatResult(p: ParameterValue): string {
  return p.value?.toString().trim() || "—";
}

export function TestRowExpandable({
  test,
  parameter,
  onView,
}: TestRowExpandableProps) {
  const { language, currentRole } = useAppContext();
  const isRtl = language === "ar";
  const labels = approvalLabels(isRtl ? "ar" : "en");

  const [expanded, setExpanded] = useState(false);

  const stage = currentStage(test);
  const canActOnStage =
    !!stage &&
    (currentRole === roleForStage(stage) || currentRole === "superadmin");

  // Row highlight is driven by the *parameter* status (pass / warn / fail),
  // not the test-level review status, so lab staff can spot bad readings fast.
  const parameterRowTone =
    parameter.status === "fail"
      ? "bg-red-500/5 hover:bg-red-500/10"
      : parameter.status === "warn"
      ? "bg-amber-500/5 hover:bg-amber-500/10"
      : canActOnStage
      ? "bg-amber-500/5 hover:bg-amber-500/10"
      : "";

  return (
    <>
      {/* Summary row */}
      <TableRow
        className={cn(
          "cursor-pointer hover:bg-muted/30 transition-colors",
          parameterRowTone,
        )}
        onClick={() => setExpanded((v) => !v)}
      >
        <TableCell onClick={(e) => e.stopPropagation()} className="w-10">
          <Checkbox />
        </TableCell>
        <TableCell className="w-[260px]">
          <div className="flex items-center gap-2">
            <ChevronRight
              className={cn(
                "h-4 w-4 text-muted-foreground transition-transform shrink-0",
                expanded && (isRtl ? "-rotate-90" : "rotate-90"),
              )}
            />
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-medium truncate">{test.name}</span>
                <span className="text-muted-foreground text-xs">/</span>
                <span className="font-medium truncate text-primary">
                  {parameter.name}
                </span>
              </div>
              {/* Compact 3-stage chain lives right under the test name */}
              <div className="mt-1">
                <ApprovalChainPanel
                  approvals={test.approvals}
                  reviewStatus={test.reviewStatus}
                  variant="compact"
                />
              </div>
              <div className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground">
                <Badge variant="outline" className="font-mono text-[10px]">
                  {test.method}
                </Badge>
                <span className="truncate">
                  {test.assignedAnalyst ?? "—"}
                </span>
              </div>
            </div>
          </div>
        </TableCell>
        <TableCell className="text-xs font-mono whitespace-nowrap">
          {formatLimit(parameter)}
        </TableCell>
        <TableCell
          className={cn(
            "text-sm font-mono whitespace-nowrap",
            parameter.status === "fail" && "text-red-600",
            parameter.status === "warn" && "text-amber-600",
          )}
        >
          {formatResult(parameter)}
        </TableCell>
        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
          {parameter.unit || "—"}
        </TableCell>
        <TableCell className="text-xs font-mono text-muted-foreground whitespace-nowrap">
          {parameter.mu || "—"}
        </TableCell>
        <TableCell
          className="text-xs font-mono text-muted-foreground max-w-[180px] truncate"
          title={parameter.reference}
        >
          {parameter.reference || "—"}
        </TableCell>
        <TableCell>
          <StatusBadge status={parameter.status} />
        </TableCell>
        <TableCell className="text-right w-16">
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              // The single TestDrawer lives in the parent (SampleDetail); we
              // just notify it which test to show. Opening a second drawer
              // here used to render two stacked Sheet overlays (black blobs).
              onView(test.id);
            }}
          >
            <Eye className="h-4 w-4" />
          </Button>
        </TableCell>
      </TableRow>

      {/* Expanded panel */}
      {expanded && (
        <TableRow className="bg-muted/10 hover:bg-muted/10">
          <TableCell colSpan={9} className="p-0">
            <div className="px-6 py-4 space-y-4">
              {/* Parameter detail */}
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                  {parameter.name} — {labels.parametersTitle}
                </h4>
                <div className="rounded-md border overflow-hidden bg-background">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/30">
                      <tr>
                        <th className="px-3 py-2 text-start font-medium">Limit</th>
                        <th className="px-3 py-2 text-start font-medium">Result</th>
                        <th className="px-3 py-2 text-start font-medium">Unit</th>
                        <th className="px-3 py-2 text-start font-medium">MU</th>
                        <th className="px-3 py-2 text-start font-medium">Reference</th>
                        <th className="px-3 py-2 text-start font-medium">
                          {labels.statusLabel}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-t">
                        <td className="px-3 py-2 font-mono text-xs">
                          {formatLimit(parameter)}
                        </td>
                        <td className="px-3 py-2 font-mono">
                          {formatResult(parameter)}
                        </td>
                        <td className="px-3 py-2 text-xs text-muted-foreground">
                          {parameter.unit || "—"}
                        </td>
                        <td className="px-3 py-2 text-xs font-mono text-muted-foreground">
                          {parameter.mu || "—"}
                        </td>
                        <td className="px-3 py-2 text-xs font-mono text-muted-foreground">
                          {parameter.reference || "—"}
                        </td>
                        <td className="px-3 py-2">
                          <StatusBadge status={parameter.status} />
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                {parameter.note && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">Note:</span>{" "}
                    {parameter.note}
                  </p>
                )}
              </div>

              {/* History */}
              {test.reviewHistory && test.reviewHistory.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2 flex items-center gap-1">
                    <History className="h-3 w-3" />
                    {labels.historyTitle}
                  </h4>
                  <ol className="space-y-2">
                    {test.reviewHistory.map((h) => {
                      const stageLabel =
                        h.stage === "lab_supervisor"
                          ? labels.stageLabSupervisor
                          : h.stage === "tech_manager"
                          ? labels.stageTechManager
                          : h.stage === "qa"
                          ? labels.stageQa
                          : null;
                      return (
                        <li
                          key={h.id}
                          className="rounded-md border bg-background p-2 text-xs"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-medium">
                              {h.decision === "approved"
                                ? labels.approvedWord
                                : labels.rejectedWord}
                              {stageLabel && (
                                <span className="text-muted-foreground ms-2">
                                  • {stageLabel}
                                </span>
                              )}
                            </span>
                            <span className="text-muted-foreground">
                              {format(new Date(h.createdAt), "yyyy-MM-dd HH:mm")}
                            </span>
                          </div>
                          <div className="text-muted-foreground mt-0.5">
                            {h.reviewerName ?? h.reviewerEmail}
                          </div>
                          {(h.reason || h.comment) && (
                            <div className="mt-1 text-foreground">
                              {h.reason}
                              {h.comment && (
                                <span className="text-muted-foreground">
                                  {" "}
                                  — {h.comment}
                                </span>
                              )}
                            </div>
                          )}
                        </li>
                      );
                    })}
                  </ol>
                </div>
              )}
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}
