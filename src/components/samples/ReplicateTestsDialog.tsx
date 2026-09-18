import { useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Beaker, Check, Copy, Search } from "lucide-react";
import { useAppContext } from "@/context/AppContext";
import { mockSamples, type MockSample, type Test } from "@/mock-data/samples";
import { findSample, notifyStoreChanged } from "@/hooks/test-approvals/store";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

interface ReplicateTestsDialogProps {
  /** Source sample whose tests will be duplicated. */
  sourceSample: MockSample;
  isOpen: boolean;
  onClose: () => void;
}

const newTestId = (sampleId: string) =>
  `T-${sampleId}-${Date.now().toString(36)}-${Math.floor(Math.random() * 1000)
    .toString(36)
    .padStart(2, "0")}`;

const newParamId = () =>
  `P-${Date.now().toString(36)}-${Math.floor(Math.random() * 1000)
    .toString(36)
    .padStart(2, "0")}`;

/**
 * Build a deep, standalone copy of the source sample's tests so they can be
 * appended into each target sample. New IDs are minted so cross-sample
 * navigation never collides, and every parameter is reset to "pending" so
 * the analyst fills results in fresh (no leaked approval state from the source).
 */
function cloneTests(source: MockSample, targetSampleId: string): Test[] {
  return source.tests.map((t) => ({
    ...t,
    id: newTestId(targetSampleId),
    sampleId: targetSampleId,
    assignedTo: null,
    reviewStatus: "pending",
    reviewHistory: t.reviewHistory ? t.reviewHistory.map((h) => ({ ...h })) : [],
    approvals: {
      lab_supervisor: null,
      tech_manager: null,
      qa: null,
    },
    submittedAt: undefined,
    qaApprovedAt: undefined,
    parameters: t.parameters.map((p) => ({
      ...p,
      id: newParamId(),
      value: "",
      result: undefined,
      status: "pending",
    })),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }));
}

export function ReplicateTestsDialog({
  sourceSample,
  isOpen,
  onClose,
}: ReplicateTestsDialogProps) {
  const { language } = useAppContext();
  const isRtl = language === "ar";

  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Other samples are the targets (the source itself is excluded).
  const targets = useMemo(() => {
    const q = search.trim().toLowerCase();
    return mockSamples
      .filter((s) => s.id !== sourceSample.id)
      .filter((s) =>
        q
          ? s.id.toLowerCase().includes(q) ||
            s.clientName.toLowerCase().includes(q) ||
            s.sampleType.toLowerCase().includes(q)
          : true,
      );
  }, [search, sourceSample.id]);

  const sourceHasTests = (sourceSample.tests?.length ?? 0) > 0;

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllVisible = () => {
    setSelected(new Set(targets.map((t) => t.id)));
  };

  const clearSelection = () => setSelected(new Set());

  const handleReplicate = () => {
    if (selected.size === 0 || !sourceHasTests) return;
    let updated = 0;
    for (const targetId of selected) {
      const target = findSample(targetId);
      if (!target) continue;
      const cloned = cloneTests(sourceSample, target.id);
      target.tests = [...target.tests, ...cloned];
      updated += 1;
    }
    notifyStoreChanged();
    toast.success(
      isRtl
        ? `تم تكرار ${sourceSample.tests.length} اختبار إلى ${updated} عينة`
        : `Replicated ${sourceSample.tests.length} test${sourceSample.tests.length === 1 ? "" : "s"} to ${updated} sample${updated === 1 ? "" : "s"}`,
      {
        description: isRtl
          ? `المصدر: ${sourceSample.id}`
          : `Source: ${sourceSample.id}`,
      },
    );
    clearSelection();
    setSearch("");
    onClose();
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(o) => {
        if (!o) {
          clearSelection();
          setSearch("");
        }
        onClose();
      }}
    >
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Copy className="h-4 w-4 text-primary" />
            {isRtl
              ? "تكرار الاختبارات في عينات أخرى"
              : "Replicate Tests to Other Samples"}
          </DialogTitle>
          <DialogDescription>
            {isRtl ? (
              <>
                ستتم إضافة كل الاختبارات والمعلمات من{" "}
                <span className="font-mono font-semibold">{sourceSample.id}</span>{" "}
                إلى العينات المختارة. سيتم تعيين الحالة إلى "قيد الانتظار".
              </>
            ) : (
              <>
                Every test and parameter from{" "}
                <span className="font-mono font-semibold">{sourceSample.id}</span>{" "}
                will be appended to the selected samples. Parameter values
                stay empty and statuses reset to <em>pending</em>.
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        {!sourceHasTests ? (
          <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
            {isRtl
              ? "لا توجد اختبارات في هذه العينة لتكرارها."
              : "This sample has no tests to replicate."}
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2 rounded-md border bg-muted/30 px-3">
              <Beaker className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">
                {isRtl ? "المصدر" : "Source"}
              </span>
              <Badge variant="secondary" className="font-mono">
                {sourceSample.id}
              </Badge>
              <span className="ms-auto text-xs text-muted-foreground">
                {sourceSample.tests.length}{" "}
                {isRtl ? "اختبار" : `test${sourceSample.tests.length === 1 ? "" : "s"}`}
              </span>
            </div>

            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={
                  isRtl ? "ابحث عن عينة أو عميل..." : "Search sample or client..."
                }
                className="pl-8"
              />
            </div>

            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>
                {isRtl ? "العينة المستهدفة" : "Target samples"}
                {selected.size > 0 && (
                  <span className="ms-2 text-primary font-medium">
                    ({selected.size} {isRtl ? "محدد" : "selected"})
                  </span>
                )}
              </span>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={selectAllVisible}
                  disabled={targets.length === 0}
                >
                  {isRtl ? "تحديد الكل" : "Select all"}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={clearSelection}
                  disabled={selected.size === 0}
                >
                  {isRtl ? "مسح" : "Clear"}
                </Button>
              </div>
            </div>

            <ScrollArea className="h-[260px] border rounded-md">
              <div className="p-2 space-y-1">
                {targets.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-6">
                    {isRtl ? "لا توجد عينات مطابقة" : "No matching samples"}
                  </p>
                ) : (
                  targets.map((s) => {
                    const checked = selected.has(s.id);
                    return (
                      <label
                        key={s.id}
                        className={`flex items-center gap-3 px-2 py-2 rounded-md cursor-pointer hover:bg-muted transition-colors ${
                          checked ? "bg-primary/5 border border-primary/20" : ""
                        }`}
                      >
                        <Checkbox
                          checked={checked}
                          onCheckedChange={() => toggle(s.id)}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-sm font-medium">
                              {s.id}
                            </span>
                            <Badge
                              variant="outline"
                              className="text-[10px] h-4 px-1"
                            >
                              {s.sampleType}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground truncate">
                            {s.clientName} · {s.tests?.length ?? 0}{" "}
                            {isRtl ? "اختبار" : "tests"}
                          </p>
                        </div>
                        {checked && (
                          <Check className="h-4 w-4 text-primary shrink-0" />
                        )}
                      </label>
                    );
                  })
                )}
              </div>
            </ScrollArea>
          </>
        )}

        <DialogFooter className="gap-2 pt-2 border-t">
          <Button variant="outline" onClick={onClose}>
            {isRtl ? "إلغاء" : "Cancel"}
          </Button>
          <Button
            onClick={handleReplicate}
            disabled={!sourceHasTests || selected.size === 0}
          >
            <Copy className="mr-2 h-4 w-4" />
            {isRtl
              ? `تكرار إلى ${selected.size || ""} عينة`.trim()
              : `Replicate to ${selected.size || ""} sample${selected.size === 1 ? "" : "s"}`.trim()}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
