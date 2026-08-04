// =========================================================================
// TestReviewDrawer — primary action surface for approve/reject on a test
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
import { useAppContext } from "@/context/AppContext";
import { useTest } from "@/hooks/test-approvals/useTest";
import { useTestHistory } from "@/hooks/test-approvals/useTestHistory";
import { useApproveTest } from "@/hooks/test-approvals/useApproveTest";
import { approvalLabels } from "@/hooks/test-approvals/labels";
import { RejectTestDialog } from "./RejectTestDialog";
import { CheckCircle2, XCircle, History, FlaskConical } from "lucide-react";
import { format } from "date-fns";

interface TestReviewDrawerProps {
  testId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDecision?: () => void; // refresh parent
}

export function TestReviewDrawer({
  testId,
  open,
  onOpenChange,
  onDecision,
}: TestReviewDrawerProps) {
  const { language } = useAppContext();
  const isRtl = language === "ar";
  const labels = approvalLabels(isRtl ? "ar" : "en");

  const { test, sample } = useTest(open ? testId : null);
  const history = useTestHistory(open ? testId : null);
  const approve = useApproveTest();

  const [busy, setBusy] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);

  const handleApprove = async () => {
    if (!testId) return;
    setBusy(true);
    try {
      await approve({ testId });
      onDecision?.();
      onOpenChange(false);
    } catch {
      // hook surfaces the error
    } finally {
      setBusy(false);
    }
  };

  const isApproveable = test?.reviewStatus === "submitted_for_review";

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto" side={isRtl ? "left" : "right"}>
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
                {test.approvedAt && (
                  <div>
                    <p className="text-muted-foreground">{labels.approvedAt}</p>
                    <p className="text-xs">{format(new Date(test.approvedAt), "yyyy-MM-dd HH:mm")}</p>
                  </div>
                )}
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
                            {p.value || (isRtl ? "—" : "—")}
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
                    {history.map((h) => (
                      <li key={h.id} className="rounded-md border p-3 text-sm">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className="font-medium">
                            {h.decision === "approved" ? labels.approvedWord : labels.rejectedWord}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(h.createdAt), "yyyy-MM-dd HH:mm")}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">{h.reviewerEmail}</p>
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
                    ))}
                  </ol>
                )}
              </div>
            </div>
          ) : (
            <div className="py-12 text-center text-sm text-muted-foreground">
              {labels.notFound}
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
                {busy ? (isRtl ? "جاري الاعتماد..." : "Approving...") : labels.approve}
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