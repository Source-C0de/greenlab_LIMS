// =========================================================================
// AwaitingYourApprovalBanner — surfaces tests on the current sample that
// are waiting on the active user's stage, with a direct one-click approve
// action. Keeps the per-test approval flow obvious inside the sample page.
// =========================================================================

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, ChevronDown, ShieldAlert, XCircle } from "lucide-react";
import { useAppContext } from "@/context/AppContext";
import {
  currentStage,
  roleForStage,
  type Test,
} from "@/mock-data/samples";
import { useApproveTest } from "@/hooks/test-approvals/useApproveTest";
import { RejectTestDialog } from "@/components/approvals/RejectTestDialog";
import { approvalLabels } from "@/hooks/test-approvals/labels";
import { cn } from "@/lib/utils";

interface AwaitingYourApprovalBannerProps {
  tests: Test[];
  sampleId: string;
}

const MOCK_REVIEWER = {
  id: "RV-001",
  name: "Demo Reviewer",
  email: "reviewer@greenlablims.sa",
};

export function AwaitingYourApprovalBanner({
  tests,
  sampleId,
}: AwaitingYourApprovalBannerProps) {
  const { language, currentRole } = useAppContext();
  const isRtl = language === "ar";
  const labels = approvalLabels(isRtl ? "ar" : "en");
  const approve = useApproveTest();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rejectFor, setRejectFor] = useState<Test | null>(null);

  const myApprovals = useMemo(
    () =>
      tests.filter((t) => {
        const stage = currentStage(t);
        if (!stage) return false;
        return currentRole === roleForStage(stage) || currentRole === "superadmin";
      }),
    [tests, currentRole],
  );

  if (myApprovals.length === 0) return null;

  const handleApprove = async (testId: string) => {
    const test = myApprovals.find((t) => t.id === testId);
    if (!test) return;
    const stage = currentStage(test);
    setBusyId(testId);
    try {
      await approve({
        testId,
        approverId: MOCK_REVIEWER.id,
        approverName: MOCK_REVIEWER.name,
        approverEmail: MOCK_REVIEWER.email,
        approverRole: stage ? roleForStage(stage) : currentRole,
      });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div
      dir={isRtl ? "rtl" : "ltr"}
      className={cn(
        "rounded-lg border-2 border-amber-500/40 bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent",
        "shadow-sm overflow-hidden",
      )}
    >
      <div className="flex items-center gap-2 px-4 py-3 border-b border-amber-500/20 bg-amber-500/5">
        <ShieldAlert className="h-5 w-5 text-amber-600 dark:text-amber-400" />
        <div className="flex-1">
          <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
            {labels.awaitingYou}
          </p>
          <p className="text-xs text-amber-700/80 dark:text-amber-300/80">
            {myApprovals.length === 1
              ? isRtl
                ? "اختبار واحد بانتظار اعتمادك في هذه العينة"
                : "1 test on this sample awaits your approval"
              : isRtl
              ? `${myApprovals.length} اختبارات بانتظار اعتمادك في هذه العينة`
              : `${myApprovals.length} tests on this sample await your approval`}
          </p>
        </div>
        <Badge variant="secondary" className="bg-amber-500/20 text-amber-800 dark:text-amber-300 border-amber-500/30">
          {sampleId}
        </Badge>
      </div>
      <ul className="divide-y divide-amber-500/10">
        {myApprovals.map((t) => {
          const stage = currentStage(t);
          const stageLabel =
            stage === "lab_supervisor"
              ? labels.stageLabSupervisor
              : stage === "tech_manager"
              ? labels.stageTechManager
              : labels.stageQa;
          return (
            <li
              key={t.id}
              className="flex items-center gap-3 px-4 py-3 bg-background/40"
            >
              <ChevronDown className="h-4 w-4 text-muted-foreground -rotate-90" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{t.name}</p>
                <p className="text-xs text-muted-foreground flex items-center gap-2">
                  <span className="font-mono">{t.method}</span>
                  <span>•</span>
                  <span>{stageLabel}</span>
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="border-destructive/40 text-destructive hover:bg-destructive/10"
                  onClick={() => setRejectFor(t)}
                  disabled={busyId === t.id}
                >
                  <XCircle className="me-1.5 h-3.5 w-3.5" />
                  {labels.reject}
                </Button>
                <Button
                  size="sm"
                  onClick={() => handleApprove(t.id)}
                  disabled={busyId === t.id}
                >
                  <CheckCircle2 className="me-1.5 h-3.5 w-3.5" />
                  {busyId === t.id
                    ? isRtl
                      ? "جاري..."
                      : "Approving..."
                    : labels.approve}
                </Button>
              </div>
            </li>
          );
        })}
      </ul>
      <RejectTestDialog
        testId={rejectFor?.id ?? null}
        testName={rejectFor?.name ?? ""}
        open={!!rejectFor}
        onOpenChange={(o) => !o && setRejectFor(null)}
        onRejected={() => setRejectFor(null)}
      />
    </div>
  );
}