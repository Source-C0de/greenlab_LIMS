import { useMemo, useState, useSyncExternalStore } from "react";
import { useParams } from "wouter";
import { mockSamples } from "@/mock-data";
import { SampleHeader } from "@/components/samples/SampleHeader";
import { SampleTabs } from "@/components/samples/SampleTabs";
import { TestDrawer } from "@/components/tests/TestDrawer";
import { TestReviewDrawer } from "@/components/approvals/TestReviewDrawer";
import { AssignAnalystDialog } from "@/components/samples/AssignAnalystDialog";
import { useAppContext } from "@/context/AppContext";
import {
  findSample,
  getStoreSnapshot,
  notifyStoreChanged,
  subscribe,
} from "@/hooks/test-approvals/store";
import { currentStage, roleForStage } from "@/mock-data/samples";
import { toast } from "sonner";
import type { Test, MockSample } from "@/mock-data/samples";

export default function SampleDetail() {
  const { id } = useParams();
  const { language, currentRole } = useAppContext();
  const isRtl = language === "ar";

  // Keep this page in sync with the approval store so any decision made from
  // the TestReviewDrawer (or any other source) is reflected immediately.
  useSyncExternalStore(subscribe, getStoreSnapshot, getStoreSnapshot);

  const sample: MockSample = useMemo(
    () =>
      findSample(id ?? "") ??
      mockSamples.find((s) => s.id === id) ??
      mockSamples[0],
    [id],
  );

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

  const selectedTest: Test | undefined = sample.tests?.find(
    (t) => t.id === selectedTestId,
  );

  // Tests on THIS sample that are awaiting the current user's stage.
  const myPending = useMemo(() => {
    return (sample.tests ?? []).filter((t) => {
      const stage = currentStage(t);
      if (!stage) return false;
      return (
        currentRole === roleForStage(stage) || currentRole === "superadmin"
      );
    });
  }, [sample.tests, currentRole]);

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
  const handleAssignAnalyst = (analyst: any) => {
    const target = findSample(id ?? "");
    if (target) {
      target.assignedAnalyst = analyst.name;
      notifyStoreChanged();
    }
    setIsAssignOpen(false);
    toast.success(isRtl ? "تم تعيين المحلل" : "Analyst assigned", {
      description: `${isRtl ? "المحلل:" : "Assigned to:"} ${isRtl ? analyst.nameAr : analyst.name}`,
    });
  };

  // After a review decision, advance to the next pending test on this sample
  // still awaiting the user's stage. If none, close the drawer.
  const handleReviewDecision = () => {
    setTimeout(() => {
      const refreshed = findSample(id ?? "");
      if (!refreshed) {
        setReviewOpen(false);
        setReviewTestId(null);
        return;
      }
      const next = refreshed.tests.find((t) => {
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
    const target = findSample(id ?? "");
    if (!target) return;
    target.tests = [...target.tests, ...newTests];
    notifyStoreChanged();
  };

  const handleUpdateTest = (testId: string, patch: Partial<Test>) => {
    const target = findSample(id ?? "");
    if (!target) return;
    target.tests = target.tests.map((t) =>
      t.id === testId ? { ...t, ...patch } : t,
    );
    notifyStoreChanged();
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
    const target = findSample(id ?? "");
    if (!target) return;
    const before = target.tests.length;
    target.tests = target.tests.filter((t) => t.id !== testId);
    if (target.tests.length === before) return;
    notifyStoreChanged();
    toast.success(
      isRtl ? "تم حذف الاختبار" : "Test deleted",
      {
        description: testId,
      },
    );
  };

  return (
    <div className="flex flex-col h-full overflow-visible">
      <div className="md:px-2">
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
