// =========================================================================
// TestReviewDrawer — primary action surface for stage-based approval/reject
// on a test. Shows the three-stage approval chain and (when the current
// user's role matches the current stage) exposes Approve / Reject actions.
// =========================================================================

import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { ApprovalChainPanel } from "./ApprovalChainPanel";
import { useAppContext } from "@/context/AppContext";
import { useTest } from "@/hooks/test-approvals/useTest";
import { useTestHistory } from "@/hooks/test-approvals/useTestHistory";
import { useApproveTest } from "@/hooks/test-approvals/useApproveTest";
import { currentStage, roleForStage } from "@/mock-data/samples";
import { approvalLabels } from "@/hooks/test-approvals/labels";
import { RejectTestDialog } from "./RejectTestDialog";
import { CheckCircle2, XCircle, History, FlaskConical, ShieldAlert } from "lucide-react";
import { format } from "date-fns";

interface TestReviewDrawerProps {
  testId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDecision?: () => void;
}

/**
 * Mock "current reviewer" identity — in a real build this comes from auth.
 * The role field is what gates the inline Approve/Reject actions.
 */
const MOCK_REVIEWER = {
  id: "RV-001",
  name: "Demo Reviewer",
  email: "reviewer@greenlablims.sa",
};

export function TestReviewDrawer({
  testId,
  open,
  onOpenChange,
  onDecision,
}: TestReviewDrawerProps) {
  const { language, currentRole } = useAppContext();
  const isRtl = language === "ar";
  const labels = approvalLabels(isRtl ? "ar" : "en");

  const { test, sample } = useTest(open ? testId : null);
  const history = useTestHistory(open ? testId : null);
  const approve = useApproveTest();

  const [busy, setBusy] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);

  const stage = test ? currentStage(test) : null;
  const isApproveable =
    !!stage && (currentRole === roleForStage(stage) || currentRole === "superadmin");

  const handleApprove = async () => {
    if (!testId) return;
    setBusy(true);
    try {
      await approve({
        testId,
        approverId: MOCK_REVIEWER.id,
        approverName: MOCK_REVIEWER.name,
        approverEmail: MOCK_REVIEWER.email,
        approverRole: stage ? roleForStage(stage) : currentRole,
      });
      onDecision?.();
      onOpenChange(false);
    } catch {
      // hook surfaces the error
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          className="w-full sm:max-w-xl overflow-y-auto"
          side={isRtl ? "left" : "right"}
        >
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <FlaskConical className="h-5 w-5" />
              {test?.name ?? labels.notFound}
            </SheetTitle>
            <SheetDescription>
              {sample ? (
                <span className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className="font-mono">{sample.id}</Badge>
                  <span>•</span>
                  <span>{sample.clientName}</span>
                  <span>•</span>
                  <span>{sample.sampleType}</span>
                </span>
              ) : null}
            </SheetDescription>
          </SheetHeader>

          {test && sample ? (
            <div className="space-y-6 py-4 px-6">
              {/* Status */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{labels.statusLabel}</span>
                <StatusBadge status={test.reviewStatus} />
              </div>

              {/* Meta */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground">{labels.testLabel}</p>
                  <p className="font-medium">{test.name}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">{labels.priorityLabel}</p>
                  <p className="font-medium">{sample.priority}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-muted-foreground">Method</p>
                  <p className="font-mono text-xs">{test.method}</p>
                </div>
                {test.submittedAt && (
                  <div>
                    <p className="text-muted-foreground">{labels.submittedAt}</p>
                    <p className="text-xs">{format(new Date(test.submittedAt), "yyyy-MM-dd HH:mm")}</p>
                  </div>
                )}
                {test.qaApprovedAt && (
                  <div>
                    <p className="text-muted-foreground">{labels.qaApprovedAt}</p>
                    <p className="text-xs">{format(new Date(test.qaApprovedAt), "yyyy-MM-dd HH:mm")}</p>
                  </div>
                )}
              </div>

              <Separator />

              {/* Approval chain */}
              <div>
                <h3 className="text-sm font-semibold mb-1">{labels.approvalChainTitle}</h3>
                <p className="text-xs text-muted-foreground mb-3">
                  {labels.approvalChainSubtitle}
                </p>
                <ApprovalChainPanel
                  approvals={test.approvals}
                  reviewStatus={test.reviewStatus}
                />
              </div>

              <Separator />

              {/* Parameters */}
              <div>
                <h3 className="text-sm font-semibold mb-3">{labels.parametersTitle}</h3>
                <div className="rounded-md border">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/40">
                      <tr>
                        <th className="px-3 py-2 text-start font-medium">{labels.testLabel}</th>
                        <th className="px-3 py-2 text-start font-medium">Value</th>
                        <th className="px-3 py-2 text-start font-medium">Range</th>
                        <th className="px-3 py-2 text-start font-medium">{labels.statusLabel}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {test.parameters.map((p) => (
                        <tr key={p.id} className="border-t">
                          <td className="px-3 py-2">{p.name}</td>
                          <td className="px-3 py-2 font-mono">
                            {p.value || "—"}
                            {p.unit && <span className="text-muted-foreground ms-1">{p.unit}</span>}
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

              <Separator />

              {/* History */}
              <div>
                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <History className="h-4 w-4" />
                  {labels.historyTitle}
                </h3>
                {history.length === 0 ? (
                  <p className="text-xs text-muted-foreground">—</p>
                ) : (
                  <ol className="space-y-3">
                    {history.map((h) => {
                      const stageLabel =
                        h.stage === "lab_supervisor"
                          ? labels.stageLabSupervisor
                          : h.stage === "tech_manager"
                          ? labels.stageTechManager
                          : h.stage === "qa"
                          ? labels.stageQa
                          : null;
                      return (
                        <li key={h.id} className="rounded-md border p-3 text-sm">
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <span className="font-medium">
                              {h.decision === "approved"
                                ? labels.approvedWord
                                : labels.rejectedWord}
                              {stageLabel && (
                                <span className="text-xs text-muted-foreground ms-2">
                                  • {stageLabel}
                                </span>
                              )}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(h.createdAt), "yyyy-MM-dd HH:mm")}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {h.reviewerName ?? h.reviewerEmail}
                          </p>
                          {h.reason && (
                            <p className="text-sm mt-2">
                              <span className="font-medium">{labels.reasonLabel}: </span>
                              {h.reason}
                            </p>
                          )}
                          {h.comment && (
                            <p className="text-sm text-muted-foreground mt-1">
                              <span className="font-medium">{labels.commentLabel}: </span>
                              {h.comment}
                            </p>
                          )}
                        </li>
                      );
                    })}
                  </ol>
                )}
              </div>
            </div>
          ) : (
            <div className="py-12 text-center text-sm text-muted-foreground">
              {labels.notFound}
            </div>
          )}

          {stage && !isApproveable && (
            <div className="mx-6 my-2 flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/5 p-3 text-xs">
              <ShieldAlert className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">{labels.notYourStage}</p>
                <p className="text-muted-foreground">
                  {labels.awaitingYou}{" "}
                  {stage === "lab_supervisor"
                    ? labels.stageLabSupervisor
                    : stage === "tech_manager"
                    ? labels.stageTechManager
                    : labels.stageQa}
                </p>
              </div>
            </div>
          )}

          {isApproveable && (
            <SheetFooter className="border-t pt-4 gap-2">
              <Button
                variant="destructive"
                onClick={() => setRejectOpen(true)}
                disabled={busy}
              >
                <XCircle className="me-2 h-4 w-4" />
                {labels.reject}
              </Button>
              <Button onClick={handleApprove} disabled={busy}>
                <CheckCircle2 className="me-2 h-4 w-4" />
                {busy
                  ? isRtl
                    ? "جاري الاعتماد..."
                    : "Approving..."
                  : labels.approveCurrentStage}
              </Button>
            </SheetFooter>
          )}
        </SheetContent>
      </Sheet>

      <RejectTestDialog
        testId={open ? testId : null}
        testName={test?.name ?? ""}
        open={rejectOpen}
        onOpenChange={setRejectOpen}
        onRejected={() => {
          setRejectOpen(false);
          onDecision?.();
          onOpenChange(false);
        }}
      />
    </>
  );
}