// =========================================================================
// ApprovalChainPanel — is the test waiting on me, who is next, and is
// any prior stage already signed? Renders in two modes:
//   - compact: a 3-step horizontal pipeline used inline in the test row
//   - detailed: full card with comments for expanded view
// =========================================================================

import { useAppContext } from "@/context/AppContext";
import { approvalLabels } from "@/hooks/test-approvals/labels";
import {
  CheckCircle2,
  Circle,
  Clock,
  type LucideIcon,
} from "lucide-react";
import { format } from "date-fns";
import type { StageApproval, TestReviewStatus } from "@/mock-data/samples";
import { cn } from "@/lib/utils";

interface ApprovalChainPanelProps {
  /** All three slots — null when the stage hasn't been signed yet. */
  approvals: {
    lab_supervisor: StageApproval | null;
    tech_manager: StageApproval | null;
    qa: StageApproval | null;
  };
  /** Current review status — drives the "in progress" highlight. */
  reviewStatus: TestReviewStatus;
  /** Default mode is "compact" — small inline stepper. */
  variant?: "compact" | "detailed";
  /** Optional click handler for a "view chain" affordance. */
  onExpand?: () => void;
}

type StageKey = keyof ApprovalChainPanelProps["approvals"];

const STAGE_ORDER: StageKey[] = ["lab_supervisor", "tech_manager", "qa"];

export function ApprovalChainPanel({
  approvals,
  reviewStatus,
  variant = "compact",
  onExpand,
}: ApprovalChainPanelProps) {
  const { language } = useAppContext();
  const isRtl = language === "ar";
  const labels = approvalLabels(isRtl ? "ar" : "en");

  const stageMeta: Record<StageKey, { label: string; short: string }> = {
    lab_supervisor: { label: labels.stageLabSupervisor, short: "LS" },
    tech_manager: { label: labels.stageTechManager, short: "TM" },
    qa: { label: labels.stageQa, short: "QA" },
  };

  const currentStageKey: StageKey | null =
    reviewStatus === "awaiting_lab_supervisor"
      ? "lab_supervisor"
      : reviewStatus === "awaiting_tech_manager"
      ? "tech_manager"
      : reviewStatus === "awaiting_qa"
      ? "qa"
      : reviewStatus === "qa_approved"
      ? null
      : null;

  if (variant === "detailed") {
    return (
      <DetailedChain
        approvals={approvals}
        currentStageKey={currentStageKey}
        stageMeta={stageMeta}
        labels={labels}
        isRtl={isRtl}
      />
    );
  }

  return (
    <CompactChain
      approvals={approvals}
      currentStageKey={currentStageKey}
      stageMeta={stageMeta}
      labels={labels}
      onExpand={onExpand}
    />
  );
}

// -------------------------------------------------------------------------
// Compact chain — three pill steps in a row, click opens the detailed view
// -------------------------------------------------------------------------
function CompactChain({
  approvals,
  currentStageKey,
  stageMeta,
  labels,
  onExpand,
}: {
  approvals: ApprovalChainPanelProps["approvals"];
  currentStageKey: StageKey | null;
  stageMeta: Record<StageKey, { label: string; short: string }>;
  labels: ReturnType<typeof approvalLabels>;
  onExpand?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onExpand?.();
      }}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border bg-muted/30 px-2 py-1",
        "text-xs hover:bg-muted/60 transition-colors",
      )}
      title={labels.approvalChainTitle}
    >
      {STAGE_ORDER.map((key, idx) => {
        const slot = approvals[key];
        const isDone = !!slot;
        const isCurrent = currentStageKey === key;
        const isPending = !isDone && !isCurrent;
        const meta = stageMeta[key];

        return (
          <div key={key} className="flex items-center gap-1.5">
            <span
              className={cn(
                "flex items-center gap-1 rounded-full px-1.5 py-0.5",
                isDone && "bg-green-500/15 text-green-700 dark:text-green-400",
                isCurrent && "bg-amber-500/15 text-amber-700 dark:text-amber-400",
                isPending && "text-muted-foreground/70",
              )}
            >
              {isDone ? (
                <CheckCircle2 className="h-3 w-3" />
              ) : isCurrent ? (
                <Clock className="h-3 w-3" />
              ) : (
                <Circle className="h-3 w-3" />
              )}
              <span className="font-medium">{meta.short}</span>
            </span>
            {idx < STAGE_ORDER.length - 1 && (
              <span className="text-muted-foreground/40">→</span>
            )}
          </div>
        );
      })}
    </button>
  );
}

// -------------------------------------------------------------------------
// Detailed chain — shown when the user explicitly expands the chain view
// -------------------------------------------------------------------------
function DetailedChain({
  approvals,
  currentStageKey,
  stageMeta,
  labels,
  isRtl,
}: {
  approvals: ApprovalChainPanelProps["approvals"];
  currentStageKey: StageKey | null;
  stageMeta: Record<StageKey, { label: string; short: string }>;
  labels: ReturnType<typeof approvalLabels>;
  isRtl: boolean;
}) {
  return (
    <div className="grid gap-3" dir={isRtl ? "rtl" : "ltr"}>
      {STAGE_ORDER.map((key) => {
        const slot = approvals[key];
        const meta = stageMeta[key];
        const isCurrent = currentStageKey === key;
        const isDone = !!slot;

        let Icon: LucideIcon = Circle;
        let stateClass = "border-dashed border-border bg-muted/20";
        let iconClass = "text-muted-foreground";

        if (isDone) {
          Icon = CheckCircle2;
          iconClass = "text-green-600 dark:text-green-400";
          stateClass = "border-green-500/30 bg-green-500/5";
        } else if (isCurrent) {
          Icon = Clock;
          iconClass = "text-amber-600 dark:text-amber-400";
          stateClass = "border-amber-500/40 bg-amber-500/5 ring-1 ring-amber-500/20";
        } else {
          Icon = Circle;
          iconClass = "text-muted-foreground/60";
        }

        return (
          <div
            key={key}
            className={cn(
              "flex items-start gap-3 rounded-md border p-3 transition-colors",
              stateClass,
            )}
          >
            <Icon className={cn("h-5 w-5 mt-0.5 shrink-0", iconClass)} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold">{meta.label}</p>
                {isCurrent && !isDone && (
                  <span className="text-[10px] uppercase tracking-wider font-bold text-amber-700 dark:text-amber-300">
                    {labels.currentStageLabel}
                  </span>
                )}
                {isDone && (
                  <span className="text-[10px] uppercase tracking-wider font-bold text-green-700 dark:text-green-300">
                    {labels.stageDone}
                  </span>
                )}
                {!isDone && !isCurrent && (
                  <span className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">
                    {labels.stageNotStarted}
                  </span>
                )}
              </div>
              {slot ? (
                <div className="mt-1 text-xs text-muted-foreground space-y-0.5">
                  <p>
                    <span className="font-medium text-foreground">{slot.approverName}</span>
                    <span className="mx-1">•</span>
                    <span className="font-mono">
                      {format(new Date(slot.approvedAt), "yyyy-MM-dd HH:mm")}
                    </span>
                  </p>
                  {slot.comment && (
                    <p className="text-foreground/90 italic mt-1">&ldquo;{slot.comment}&rdquo;</p>
                  )}
                </div>
              ) : isCurrent ? (
                <p className="text-xs text-muted-foreground mt-1">{labels.awaitingYou}</p>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}
