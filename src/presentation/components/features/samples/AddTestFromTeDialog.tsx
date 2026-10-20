// =========================================================================
// AddTestFromTeDialog — pull test names from a Technical Evaluation and
// append them to a sample as new Test rows.
//
// Two-step UX:
//   1. Searchable TE list (filter by id). Click a row to pick it.
//   2. Preview of that TE's `testRequired` values only — no other fields.
//   3. Confirm appends them to the sample (existing tests untouched).
//
// Pure: emits the new Test[] to the parent via onAdd. The parent (sample
// detail page) is responsible for mutating samplesStore + notifying.
// Mirrors the structure of AddTestToSampleDialog and the row-action
// patterns in the TE list.
// =========================================================================

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { ScrollArea } from "@/shared/ui/scroll-area";
import { StatusBadge } from "@/presentation/components/shared/StatusBadge";
import {
  workOrdersStore,
  subscribeWorkOrders,
  getWorkOrdersSnapshot,
} from "@/infrastructure/mock/data/workOrderStore";
import type { WorkOrder } from "@/infrastructure/mock/data/workOrders";
import type { Test } from "@/infrastructure/mock/data/samples";
import { useAppContext } from "@/presentation/providers/AppContext";
import { toast } from "sonner";
import { Search, ClipboardList, ArrowLeft, Check } from "lucide-react";
import { cn } from "@/shared/lib/utils";

interface AddTestFromTeDialogProps {
  isOpen: boolean;
  onClose: () => void;
  /** Receives the newly-built tests to be appended to the sample. */
  onAdd: (tests: Test[]) => void;
  /** Used to mint unique test/parameter ids for the new rows. */
  sampleId: string;
}

const ALLOWED_ROLES = new Set(["admin", "lab_manager"]);

// Random-suffix id scheme — same as AddTestToSampleDialog and
// ReplicateTestsDialog. Sequential T-NNN ids are reserved for
// useReissueSample/useSupplementarySample clones.
const newTestId = (sampleId: string) =>
  `T-${sampleId.replace(/[^\w]/g, "") || "S"}-${Date.now().toString(36)}-${Math.floor(Math.random() * 1000)
    .toString(36)
    .padStart(2, "0")}`;

function buildTestFromTeName(
  sampleId: string,
  name: string,
  now: string,
): Test {
  return {
    id: newTestId(sampleId),
    sampleId,
    name,
    category: "From TE",
    method: "",
    assignedTo: null,
    reviewStatus: "draft",
    parameters: [],
    reviewHistory: [],
    approvals: { lab_supervisor: null, tech_manager: null, qa: null },
    createdAt: now,
    updatedAt: now,
  };
}

export function AddTestFromTeDialog({
  isOpen,
  onClose,
  onAdd,
  sampleId,
}: AddTestFromTeDialogProps) {
  const { language, currentRole } = useAppContext();
  const isRtl = language === "ar";

  // Step 1: search & pick a TE.
  const [search, setSearch] = useState("");
  const [selectedTe, setSelectedTe] = useState<WorkOrder | null>(null);

  // Keep the TE list in sync with the store (e.g. after a Duplicate action
  // creates a new TE).
  useSyncExternalStore(
    subscribeWorkOrders,
    getWorkOrdersSnapshot,
    getWorkOrdersSnapshot,
  );

  // Reset every time the dialog re-opens.
  useEffect(() => {
    if (isOpen) {
      setSearch("");
      setSelectedTe(null);
    }
  }, [isOpen]);

  const filteredTes = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = [...workOrdersStore].sort((a, b) =>
      a.requestedAt < b.requestedAt ? 1 : -1,
    );
    if (!q) return list;
    return list.filter((w) => w.id.toLowerCase().includes(q));
  }, [search]);

  // Non-empty testRequired values from the selected TE. These are the
  // names that will become new Test rows on confirm.
  const testNames = useMemo(() => {
    if (!selectedTe) return [];
    return selectedTe.testRows
      .map((r) => r.testRequired?.trim() ?? "")
      .filter(Boolean);
  }, [selectedTe]);

  const roleAllowed = ALLOWED_ROLES.has(currentRole);

  const handleConfirm = () => {
    if (!selectedTe) return;
    if (testNames.length === 0) {
      toast.error(
        isRtl
          ? "لا توجد أسماء اختبارات في هذا التقييم"
          : "No test names in this TE.",
      );
      return;
    }
    if (!roleAllowed) {
      toast.error(isRtl ? "غير مصرح" : "Not authorized");
      return;
    }
    const now = new Date().toISOString();
    const newTests = testNames.map((n) =>
      buildTestFromTeName(sampleId, n, now),
    );
    onAdd(newTests);
    toast.success(
      isRtl
        ? `تم إضافة ${newTests.length} اختبار من ${selectedTe.id}`
        : `Added ${newTests.length} test${newTests.length === 1 ? "" : "s"} from ${selectedTe.id}`,
    );
    onClose();
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardList className="h-4 w-4 text-primary" />
            {isRtl
              ? "إضافة اختبار من تقييم فني"
              : "Add Test from Technical Evaluation"}
          </DialogTitle>
          <DialogDescription>
            {isRtl
              ? "اختر تقييمًا فنيًا لنسخ أسماء اختباراته إلى هذه العينة."
              : "Pick a Technical Evaluation to copy its test names onto this sample."}
          </DialogDescription>
        </DialogHeader>

        {!selectedTe ? (
          // ===== Step 1: searchable TE list =====
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={
                  isRtl ? "ابحث بمعرّف التقييم الفني" : "Search by TE ID"
                }
                className="ps-9"
                autoFocus
              />
            </div>

            <ScrollArea className="h-[320px] border rounded-md">
              <div className="p-2 space-y-1">
                {filteredTes.length === 0 ? (
                  <div className="text-center text-sm text-muted-foreground py-6">
                    {isRtl
                      ? "لا توجد تقييمات فنية."
                      : "No technical evaluations found."}
                  </div>
                ) : (
                  filteredTes.map((wo) => (
                    <button
                      key={wo.id}
                      type="button"
                      onClick={() => setSelectedTe(wo)}
                      className={cn(
                        "w-full text-start rounded-md p-3 border border-transparent hover:border-primary/30 hover:bg-muted/40 transition-colors",
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono font-medium text-primary">
                          {wo.id}
                        </span>
                        <StatusBadge status={wo.stage} />
                      </div>
                      <div className="mt-1 text-sm">
                        <span className="font-medium">{wo.clientName}</span>
                        <span className="text-muted-foreground">
                          {" "}
                          · {wo.sampleName}
                        </span>
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {isRtl ? "تاريخ الطلب:" : "Requested:"}{" "}
                        {wo.requestedAt.split("T")[0]}
                      </div>
                    </button>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>
        ) : (
          // ===== Step 2: preview of testRequired values =====
          <div className="space-y-3">
            <div className="rounded-md border bg-muted/30 p-3 text-sm">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs uppercase tracking-wide text-muted-foreground">
                  {isRtl ? "التقييم المحدد" : "Selected TE"}
                </span>
                <StatusBadge status={selectedTe.stage} />
              </div>
              <div className="mt-1 font-mono font-medium text-primary">
                {selectedTe.id}
              </div>
              <div className="mt-0.5">
                <span className="font-medium">{selectedTe.clientName}</span>
                <span className="text-muted-foreground">
                  {" "}
                  · {selectedTe.sampleName}
                </span>
              </div>
            </div>

            <div>
              <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1">
                {isRtl
                  ? `أسماء الاختبارات للإضافة (${testNames.length})`
                  : `Test names to add (${testNames.length})`}
              </div>
              <ScrollArea className="h-[260px] border rounded-md">
                <div className="p-2 space-y-1">
                  {testNames.length === 0 ? (
                    <div className="text-center text-sm text-muted-foreground py-6">
                      {isRtl
                        ? "لا توجد أسماء اختبارات في هذا التقييم."
                        : "No test names in this TE."}
                    </div>
                  ) : (
                    testNames.map((name, idx) => (
                      <div
                        key={`${selectedTe.id}-${idx}-${name}`}
                        className="flex items-center gap-2 rounded-md p-2 border bg-background"
                      >
                        <BeakerSmall />
                        <span className="text-sm font-medium">{name}</span>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2 pt-2 border-t">
          {selectedTe ? (
            <>
              <Button
                variant="outline"
                onClick={() => setSelectedTe(null)}
              >
                <ArrowLeft className="me-2 h-4 w-4" />
                {isRtl ? "رجوع" : "Back"}
              </Button>
              <Button
                variant="outline"
                onClick={onClose}
              >
                {isRtl ? "إلغاء" : "Cancel"}
              </Button>
              <Button
                onClick={handleConfirm}
                disabled={
                  !roleAllowed ||
                  testNames.length === 0
                }
              >
                <Check className="me-2 h-4 w-4" />
                {isRtl ? "تأكيد الإضافة" : "Confirm Add"}
              </Button>
            </>
          ) : (
            <Button variant="outline" onClick={onClose}>
              {isRtl ? "إلغاء" : "Cancel"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Tiny presentational icon to keep the preview row visually consistent
// with the existing TestTable rows.
function BeakerSmall() {
  return (
    <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-primary/10 text-primary">
      <ClipboardList className="h-3.5 w-3.5" />
    </span>
  );
}
