// =========================================================================
// TestRowExpandable — single test row inside TestTable. The summary row
// shows the status + a compact 3-stage chain so the user can see where
// the test is in the pipeline at a glance. Expanding the row reveals
// the parameters table and the recent decision history — it is read-only;
// all approval / rejection actions live in the single TestReviewDrawer
// opened from the sample header's "Review" button.
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
import { currentStage, roleForStage } from "@/mock-data/samples";
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
  onView: (id: string) => void;
  analystPickerOpen?: boolean;
  onAnalystPickerOpenChange?: (open: boolean) => void;
  analystSearch?: string;
  onAnalystSearchChange?: (s: string) => void;
  filteredAnalysts?: any[];
  onAssignAnalyst?: (analyst: any | null) => void;
  canEditAnalyst?: boolean;
}

export function TestRowExpandable({
  test,
  onView,
}: TestRowExpandableProps) {
  const { language, currentRole } = useAppContext();
  const isRtl = language === "ar";
  const labels = approvalLabels(isRtl ? "ar" : "en");

  const [expanded, setExpanded] = useState(false);

  const stage = currentStage(test);
  const canActOnStage =
    !!stage && (currentRole === roleForStage(stage) || currentRole === "superadmin");

  return (
    <>
      {/* Summary row */}
      <TableRow
        className={cn(
          "cursor-pointer hover:bg-muted/30 transition-colors",
          canActOnStage && "bg-amber-500/5 hover:bg-amber-500/10",
        )}
        onClick={() => setExpanded((v) => !v)}
      >
        <TableCell onClick={(e) => e.stopPropagation()} className="w-10">
          <Checkbox />
        </TableCell>
        <TableCell className="w-[250px]">
          <div className="flex items-center gap-2">
            <ChevronRight
              className={cn(
                "h-4 w-4 text-muted-foreground transition-transform",
                expanded && (isRtl ? "-rotate-90" : "rotate-90"),
              )}
            />
            <div className="flex flex-col">
              <span className="font-medium">{test.name}</span>
              {/* Compact 3-stage chain lives right under the test name */}
              <div className="mt-1">
                <ApprovalChainPanel
                  approvals={test.approvals}
                  reviewStatus={test.reviewStatus}
                  variant="compact"
                />
              </div>
            </div>
          </div>
        </TableCell>
        <TableCell className="text-sm text-muted-foreground">
          {test.category}
        </TableCell>
        <TableCell>
          <Badge variant="outline" className="font-mono text-xs">
            {test.method}
          </Badge>
        </TableCell>
        <TableCell className="text-sm">
          {test.assignedAnalyst ?? "—"}
        </TableCell>
        <TableCell>
          <StatusBadge status={test.reviewStatus} />
        </TableCell>
        <TableCell className="text-right w-20">
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
          <TableCell colSpan={7} className="p-0">
            <div className="px-6 py-4 space-y-4">
              {/* Parameters */}
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                  {labels.parametersTitle}
                </h4>
                <div className="rounded-md border overflow-hidden bg-background">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/30">
                      <tr>
                        <th className="px-3 py-2 text-start font-medium">
                          {labels.testLabel}
                        </th>
                        <th className="px-3 py-2 text-start font-medium">Value</th>
                        <th className="px-3 py-2 text-start font-medium">Range</th>
                        <th className="px-3 py-2 text-start font-medium">
                          {labels.statusLabel}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {test.parameters.map((p) => (
                        <tr key={p.id} className="border-t">
                          <td className="px-3 py-2">{p.name}</td>
                          <td className="px-3 py-2 font-mono">
                            {p.value || "—"}
                            {p.unit && (
                              <span className="text-muted-foreground ms-1">
                                {p.unit}
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-xs text-muted-foreground">
                            {p.min ?? "—"} / {p.max ?? "—"}
                          </td>
                          <td className="px-3 py-2">
                            <StatusBadge status={p.status} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
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
