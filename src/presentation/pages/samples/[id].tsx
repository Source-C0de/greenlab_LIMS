import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { Link, useParams } from "wouter";
import { Info } from "lucide-react";
import { SampleHeader } from "@/presentation/components/features/samples/SampleHeader";
import { SampleTabs } from "@/presentation/components/features/samples/SampleTabs";
import { TestDrawer } from "@/presentation/components/features/tests/TestDrawer";
import { TestReviewDrawer } from "@/presentation/components/features/approvals/TestReviewDrawer";
import { AssignAnalystDialog } from "@/presentation/components/features/samples/AssignAnalystDialog";
import { useAppContext } from "@/presentation/providers/AppContext";
import {
  getStoreSnapshot,
  subscribe,
} from "@/infrastructure/mock/repositories/sampleStore";
import { container } from "@/infrastructure/di/container";
import { currentStage, roleForStage } from "@/infrastructure/mock/data/samples";
import { toast } from "sonner";
import type { Test } from "@/infrastructure/mock/data/samples";
import type { Sample } from "@/domain/sample/model";

export default function SampleDetail() {
  // Sample IDs contain slashes (e.g. "FD/2024/0001"), so wouter's `:id`
  // would not match. The route is registered as `/samples/*`, and the
  // splat is exposed under the literal key `"*"` by wouter/regexparam.
  const params = useParams<{ "*": string }>();
  const id = (params["*"] ?? "").replace(/\/$/, "");
  const { language, currentRole } = useAppContext();
  const isRtl = language === "ar";

  // Reissue lineage: if the current id ends in -R\d+, this sample is a
  // reissued copy of `<base>`. Expose the base so the banner can link
  // back to the source. Handles ids containing `/` (e.g. FD/2024/0001-R1).
  const reissueMatch = /^(.+)-R(\d+)$/.exec(id ?? "");
  const sourceId = reissueMatch?.[1];

  // Supplementary lineage: parallel to reissue but with -S\d+ suffix.
  // The new sample's status is "Supplementary" and the user is expected
  // to add additional tests/parameters via the existing "Add Test" flow.
  const supplementaryMatch = /^(.+)-S(\d+)$/.exec(id ?? "");
  const supplementarySourceId = supplementaryMatch?.[1];

  // Keep this page in sync with the approval store so any decision made from
  // the TestReviewDrawer (or any other source) is reflected immediately.
  const storeTick = useSyncExternalStore(subscribe, getStoreSnapshot, getStoreSnapshot);

  // Load through the `SampleRepository` port. `get()` is async, so the sample
  // lands in state and is re-fetched whenever the store tick changes — which
  // is what makes an approval decided in the drawer appear here immediately.
  //
  // NOTE ON THE OLD FALLBACK: this used to end in `?? mockSamples[0]`, so a
  // typo'd or stale sample id rendered the *first* sample in the corpus with
  // no indication anything was wrong. It now renders an explicit
  // "not found" state instead — silently showing unrelated laboratory data is
  // worse than showing an error.
  const [sample, setSample] = useState<Sample | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void container.samples.get(id ?? "").then((result) => {
      if (cancelled) return;
      if (result.ok) {
        setSample(result.value);
        setNotFound(false);
      } else {
        setSample(null);
        setNotFound(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [id, storeTick]);

  // Dialog States
  const [selectedTestId, setSelectedTestId] = useState<string | null>(null);
  const [isAssignOpen, setIsAssignOpen] = useState(false);

  // Review drawer state — opened from the SampleHeader "Review" button.
  // After a decision the drawer advances to the next test awaiting the
  // user's stage on this sample (same UX as the /approvals page).
  const [reviewTestId, setReviewTestId] = useState<string | null>(null);
  const [reviewOpen, setReviewOpen] = useState(false);

  const isDrawerOpen = selectedTestId !== null;

  const handleViewTest = (testId: string) => {
    setSelectedTestId(testId);
  };

  const handleCloseDrawer = () => {
    setSelectedTestId(null);
  };

  // The sample may be null while the port call is in flight (and permanently,
  // for an unknown id) — the not-found / loading returns below handle both.
  // These derivations run before that guard, so they tolerate null here.
  const sampleTests: Test[] = sample?.tests ?? [];

  const selectedTest: Test | undefined = sampleTests.find(
    (t) => t.id === selectedTestId,
  );

  // Tests on THIS sample that are awaiting the current user's stage.
  const myPending = useMemo(() => {
    return sampleTests.filter((t) => {
      const stage = currentStage(t);
      if (!stage) return false;
      return (
        currentRole === roleForStage(stage) || currentRole === "superadmin"
      );
    });
  }, [sampleTests, currentRole]);

  const openReview = () => {
    if (myPending.length === 0) {
      toast.info(
        isRtl
          ? "لا توجد اختبارات بانتظار اعتمادك على هذه العينة"
          : "No tests on this sample are awaiting your approval",
      );
      return;
    }
    setReviewTestId(myPending[0].id);
    setReviewOpen(true);
  };

  // Action Handlers
  //
  // Writes go through `container.samples.update()` rather than reaching into
  // the store directly. `update()` patches the live object in place (callers
  // hold references to it) and fires `notifyStoreChanged()`, so the semantics
  // are identical to the code these replaced — but the page now depends on the
  // port, not on the mock's storage layout.

  const handleAssignAnalyst = (analyst: any) => {
    void container.samples.update(id ?? "", { assignedAnalyst: analyst.name });
    setIsAssignOpen(false);
    toast.success(isRtl ? "تم تعيين المحلل" : "Analyst assigned", {
      description: `${isRtl ? "المحلل:" : "Assigned to:"} ${isRtl ? analyst.nameAr : analyst.name}`,
    });
  };

  // After a review decision, advance to the next pending test on this sample
  // still awaiting the user's stage. If none, close the drawer.
  const handleReviewDecision = () => {
    setTimeout(() => {
      const refreshed = sample;
      if (!refreshed) {
        setReviewOpen(false);
        setReviewTestId(null);
        return;
      }
      const next = refreshed.tests.find((t: Test) => {
        const stage = currentStage(t);
        if (!stage) return false;
        return (
          currentRole === roleForStage(stage) || currentRole === "superadmin"
        );
      });
      if (next) {
        setReviewTestId(next.id);
      } else {
        setReviewOpen(false);
        setReviewTestId(null);
      }
    }, 50);
  };

  const handleAddTest = (newTests: Test[]) => {
    if (!sample) return;
    void container.samples.update(id ?? "", {
      tests: [...sample.tests, ...newTests],
    });
  };

  const handleUpdateTest = (testId: string, patch: Partial<Test>) => {
    if (!sample) return;
    void container.samples.update(id ?? "", {
      tests: sample.tests.map((t) =>
        t.id === testId ? { ...t, ...patch } : t,
      ),
    });
  };

  const handleEditTest = (testId: string) => {
    // For now we open the existing TestDrawer for the selected test so the
    // editor lands in the same place the View action leads. Once the
    // dedicated EditTestDialog is wired up this becomes a `setEditTestId`.
    setSelectedTestId(testId);
    toast.info(
      isRtl ? "تحرير الاختبار" : "Edit test",
      {
        description: isRtl
          ? `افتح ${testId} في المحرر`
          : `Open ${testId} in the editor`,
      },
    );
  };

  const handleDeleteTest = (testId: string) => {
    if (!sample) return;
    const before = sample.tests.length;
    const remaining = sample.tests.filter((t) => t.id !== testId);
    if (remaining.length === before) return;
    void container.samples.update(id ?? "", { tests: remaining });
    toast.success(
      isRtl ? "تم حذف الاختبار" : "Test deleted",
      {
        description: testId,
      },
    );
  };

  if (notFound) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 p-8 text-center">
        <p className="text-base font-medium">
          {isRtl ? "لم يتم العثور على العينة" : "Sample not found"}
        </p>
        <p className="text-sm text-muted-foreground">{id}</p>
        <Link
          to="/samples"
          className="mt-2 text-sm underline underline-offset-2 hover:no-underline"
        >
          {isRtl ? "→ العودة إلى قائمة العينات" : "Back to samples →"}
        </Link>
      </div>
    );
  }

  if (!sample) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <p className="text-sm text-muted-foreground">
          {isRtl ? "جارٍ التحميل…" : "Loading…"}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-visible">
      <div className="md:px-2">
        {sourceId && (
          <div
            role="note"
            data-testid="reissued-from-banner"
            className="mb-3 rounded-md border border-blue-200 bg-blue-50 text-blue-900 dark:bg-blue-950/30 dark:text-blue-200 dark:border-blue-800 px-4 py-2 flex items-center gap-2 text-sm"
          >
            <Info className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="flex-1">
              {isRtl
                ? `أُعيد إصداره من ${sourceId}`
                : `Reissued from ${sourceId}`}
            </span>
            <Link
              to={`/samples/${sourceId}`}
              className="underline underline-offset-2 hover:no-underline font-medium"
            >
              {isRtl ? "عرض المصدر ←" : "View source →"}
            </Link>
          </div>
        )}
        {supplementarySourceId && (
          <div
            role="note"
            data-testid="supplementary-to-banner"
            className="mb-3 rounded-md border border-sky-200 bg-sky-50 text-sky-900 dark:bg-sky-950/30 dark:text-sky-200 dark:border-sky-800 px-4 py-2 flex items-center gap-2 text-sm"
          >
            <Info className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="flex-1">
              {isRtl
                ? `عينة تكميلية لـ ${supplementarySourceId}`
                : `Supplementary to ${supplementarySourceId}`}
            </span>
            <Link
              to={`/samples/${supplementarySourceId}`}
              className="underline underline-offset-2 hover:no-underline font-medium"
            >
              {isRtl ? "عرض المصدر ←" : "View source →"}
            </Link>
          </div>
        )}
        <SampleHeader
          sample={{
            id: sample.id,
            clientName: sample.clientName,
            sampleType: sample.sampleType,
            status: sample.status,
            priority: sample.priority,
            receivedDate: sample.receivedDate,
            receivedBy: sample.assignedAnalyst ?? undefined,
          }}
          pendingForMe={myPending.length}
          onAssignAnalyst={() => setIsAssignOpen(true)}
          onReview={openReview}
        />

        <div className="flex-1">
          <SampleTabs
            sample={sample}
            onViewTest={handleViewTest}
            onAddTest={handleAddTest}
            onUpdateTest={handleUpdateTest}
            onEditTest={handleEditTest}
            onDeleteTest={handleDeleteTest}
          />
        </div>
      </div>

      <TestDrawer
        test={selectedTest}
        isOpen={isDrawerOpen}
        onClose={handleCloseDrawer}
      />

      {/* Same TestReviewDrawer used by /approvals — just scoped to this sample. */}
      <TestReviewDrawer
        testId={reviewOpen ? reviewTestId : null}
        open={reviewOpen}
        onOpenChange={(o) => {
          setReviewOpen(o);
          if (!o) setReviewTestId(null);
        }}
        onDecision={handleReviewDecision}
      />

      <AssignAnalystDialog
        isOpen={isAssignOpen}
        onClose={() => setIsAssignOpen(false)}
        onAssign={handleAssignAnalyst}
        currentAnalyst={sample.assignedAnalyst}
      />
    </div>
  );
}
