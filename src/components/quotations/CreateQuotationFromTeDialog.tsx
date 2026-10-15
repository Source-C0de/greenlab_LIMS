// =========================================================================
// CreateQuotationFromTeDialog — pick an approved Technical Evaluation
// (stage === "te_approved") to seed a new Quotation from. Two-step UX:
//   1. Searchable TE list, filtered to te_approved.
//   2. Preview of the TE's testRequired values with their matched prices.
//   3. Confirm emits the picked WorkOrder via onPick(wo) so the parent
//      can navigate to /quotations/new?fromTe=<id> for wizard seeding.
//
// Pure: emits the picked WorkOrder to the parent; no store mutation here.
// Mirrors AddTestFromTeDialog's structure (searchable list -> preview
// -> confirm) and reuses lookupSpecPrice for price display.
// =========================================================================

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { StatusBadge } from "@/components/shared/StatusBadge";
import {
  workOrdersStore,
  subscribeWorkOrders,
  getWorkOrdersSnapshot,
} from "@/mock-data/workOrderStore";
import type { WorkOrder } from "@/mock-data/workOrders";
import { useAppContext } from "@/context/AppContext";
import { lookupSpecPrice, SAR } from "@/lib/quotation-utils";
import { toast } from "sonner";
import {
  Search,
  ClipboardList,
  ArrowLeft,
  Check,
  Coins,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface CreateQuotationFromTeDialogProps {
  isOpen: boolean;
  onClose: () => void;
  /** Emits the picked TE. The parent navigates to the wizard. */
  onPick: (wo: WorkOrder) => void;
}

const ALLOWED_ROLES = new Set(["admin", "lab_manager"]);

export function CreateQuotationFromTeDialog({
  isOpen,
  onClose,
  onPick,
}: CreateQuotationFromTeDialogProps) {
  const { language, currentRole } = useAppContext();
  const isRtl = language === "ar";

  // Step 1: search & pick a TE.
  const [search, setSearch] = useState("");
  const [selectedTe, setSelectedTe] = useState<WorkOrder | null>(null);

  // Live store sync so newly-approved TEs appear without a refresh.
  useSyncExternalStore(
    subscribeWorkOrders,
    getWorkOrdersSnapshot,
    getWorkOrdersSnapshot,
  );

  // Reset on every open.
  useEffect(() => {
    if (isOpen) {
      setSearch("");
      setSelectedTe(null);
    }
  }, [isOpen]);

  // Only approved TEs are pickable.
  const approvedTes = useMemo(
    () => workOrdersStore.filter((w) => w.stage === "te_approved"),
    // Re-derive when the store ticks; useSyncExternalStore already
    // re-renders on mutation, so the dep here is only search.
    [search],
  );

  const filteredTes = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = [...approvedTes].sort((a, b) =>
      a.requestedAt < b.requestedAt ? 1 : -1,
    );
    if (!q) return list;
    return list.filter((w) => w.id.toLowerCase().includes(q));
  }, [approvedTes, search]);

  // Non-empty testRequired values from the selected TE.
  const testNames = useMemo(() => {
    if (!selectedTe) return [];
    return selectedTe.testRows
      .map((r) => r.testRequired?.trim() ?? "")
      .filter(Boolean);
  }, [selectedTe]);

  const roleAllowed = ALLOWED_ROLES.has(currentRole);

  const handleConfirm = () => {
    if (!selectedTe) return;
    if (!roleAllowed) {
      toast.error(isRtl ? "غير مصرح" : "Not authorized");
      return;
    }
    if (testNames.length === 0) {
      toast.error(
        isRtl
          ? "لا توجد أسماء اختبارات في هذا التقييم"
          : "No test names in this TE.",
      );
      return;
    }
    onPick(selectedTe);
    onClose();
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardList className="h-4 w-4 text-primary" />
            {isRtl
              ? "إنشاء عرض سعر من تقييم فني"
              : "Create Quotation from Technical Evaluation"}
          </DialogTitle>
          <DialogDescription>
            {isRtl
              ? "اختر تقييمًا فنيًا معتمدًا لإنشاء عرض سعر منه."
              : "Pick an approved Technical Evaluation to seed a new quotation."}
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
                      ? "لا توجد تقييمات معتمدة."
                      : "No approved TEs found."}
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
          // ===== Step 2: preview with prices =====
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
                  ? `الاختبارات للإضافة (${testNames.length})`
                  : `Tests to add (${testNames.length})`}
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
                    testNames.map((name, idx) => {
                      const price = lookupSpecPrice(name);
                      return (
                        <div
                          key={`${selectedTe.id}-${idx}-${name}`}
                          className="flex items-center justify-between gap-2 rounded-md p-2 border bg-background"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-primary/10 text-primary shrink-0">
                              <ClipboardList className="h-3.5 w-3.5" />
                            </span>
                            <span className="text-sm font-medium truncate">
                              {name}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 text-xs font-mono text-muted-foreground shrink-0">
                            <Coins className="h-3 w-3" />
                            {price > 0 ? SAR(price) : "—"}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </ScrollArea>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2 pt-2 border-t">
          {selectedTe ? (
            <>
              <Button variant="outline" onClick={() => setSelectedTe(null)}>
                <ArrowLeft className="me-2 h-4 w-4" />
                {isRtl ? "رجوع" : "Back"}
              </Button>
              <Button variant="outline" onClick={onClose}>
                {isRtl ? "إلغاء" : "Cancel"}
              </Button>
              <Button
                onClick={handleConfirm}
                disabled={!roleAllowed || testNames.length === 0}
              >
                <Check className="me-2 h-4 w-4" />
                {isRtl ? "تأكيد وإنشاء" : "Confirm & Create"}
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
