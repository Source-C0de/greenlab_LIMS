// =========================================================================
// TestRowEditor — modal dialog for editing a single WorkOrderTestRow.
// =========================================================================
// Used by both /client-requests/[id] and /technical-evaluation/[id]. Pre-
// fills all 9 fields from the supplied row; on Save calls onSave(draft).
//
// The dialog is controlled — the parent owns the open state. The parent
// also owns the actual persistence (calling useWorkOrderRows().addRow /
// updateRow) so we don't pull role logic in here twice.

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { WorkOrderTestRow } from "@/mock-data/workOrders";
import type { WorkOrderRowDraft } from "@/hooks/work-orders/types";

const STATUS_OPTIONS: WorkOrderTestRow["status"][] = [
  "Applicable",
  "Not Applicable",
  "Applicable (need samples)",
  "Outsource",
];

const EMPTY_DRAFT: WorkOrderRowDraft = {
  testRequired: "",
  techniqueInstrument: "",
  status: "Applicable",
  reference: "",
  numberOfSamples: "",
  column: "Not needed",
  std: "Not needed",
  chemicalReagent: "Not needed",
  timeFrame: "1 days",
};

interface TestRowEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Undefined means "Add new row" mode. Defined means "Edit row" mode. */
  row?: WorkOrderTestRow;
  onSave: (draft: WorkOrderRowDraft) => void;
  isRtl: boolean;
  /** Optional override of dialog title when in edit mode. */
  editTitle?: string;
  addTitle?: string;
}

export function TestRowEditor({
  open,
  onOpenChange,
  row,
  onSave,
  isRtl,
  editTitle,
  addTitle,
}: TestRowEditorProps) {
  const [draft, setDraft] = useState<WorkOrderRowDraft>(EMPTY_DRAFT);

  // Sync draft whenever the dialog opens or the target row changes.
  useEffect(() => {
    if (!open) return;
    if (row) {
      setDraft({
        testRequired: row.testRequired,
        techniqueInstrument: row.techniqueInstrument,
        status: row.status,
        reference: row.reference,
        numberOfSamples: row.numberOfSamples,
        column: row.column,
        std: row.std,
        chemicalReagent: row.chemicalReagent,
        timeFrame: row.timeFrame,
      });
    } else {
      setDraft(EMPTY_DRAFT);
    }
  }, [open, row]);

  const title = row
    ? editTitle ?? (isRtl ? "تعديل صف" : "Edit row")
    : addTitle ?? (isRtl ? "إضافة صف" : "Add row");

  const handleSave = () => {
    if (!draft.testRequired.trim()) {
      // Validation: test name is required.
      // The parent surfaces this through its own toast onSave result; here we
      // just no-op so the user sees the field stays empty.
      return;
    }
    onSave(draft);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {isRtl
              ? "عدّل جميع الحقول التسعة ثم اضغط حفظ."
              : "Update all 9 fields and press Save."}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label>{isRtl ? "الاختبار" : "Test required"}</Label>
            <Input
              value={draft.testRequired}
              onChange={(e) =>
                setDraft({ ...draft, testRequired: e.target.value })
              }
              placeholder={isRtl ? "مثال: رطوبة" : "e.g. Moisture"}
            />
          </div>

          <div className="space-y-1">
            <Label>{isRtl ? "الجهاز" : "Technique / Instrument"}</Label>
            <Input
              value={draft.techniqueInstrument}
              onChange={(e) =>
                setDraft({ ...draft, techniqueInstrument: e.target.value })
              }
              placeholder={isRtl ? "مثال: Soxhlet" : "e.g. Soxhlet Extraction"}
            />
          </div>

          <div className="space-y-1">
            <Label>{isRtl ? "الحالة" : "Status"}</Label>
            <Select
              value={draft.status}
              onValueChange={(v) =>
                setDraft({ ...draft, status: v as WorkOrderTestRow["status"] })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label>{isRtl ? "المرجع" : "Reference"}</Label>
            <Input
              value={draft.reference}
              onChange={(e) =>
                setDraft({ ...draft, reference: e.target.value })
              }
              placeholder={isRtl ? "مثال: GSO 1322:2002" : "e.g. GSO 1322:2002"}
            />
          </div>

          <div className="space-y-1">
            <Label>{isRtl ? "عدد العينات" : "No. of Samples"}</Label>
            <Input
              value={draft.numberOfSamples}
              onChange={(e) =>
                setDraft({ ...draft, numberOfSamples: e.target.value })
              }
              placeholder={isRtl ? "مثال: 5 gm" : "e.g. 5 gm"}
            />
          </div>

          <div className="space-y-1">
            <Label>{isRtl ? "العمود" : "Column"}</Label>
            <Input
              value={draft.column}
              onChange={(e) =>
                setDraft({ ...draft, column: e.target.value })
              }
              placeholder={isRtl ? "مثال: غير مطلوب" : "e.g. Not needed"}
            />
          </div>

          <div className="space-y-1">
            <Label>STD</Label>
            <Input
              value={draft.std}
              onChange={(e) => setDraft({ ...draft, std: e.target.value })}
              placeholder={isRtl ? "مثال: غير مطلوب" : "e.g. Not needed"}
            />
          </div>

          <div className="space-y-1">
            <Label>{isRtl ? "الكواشف" : "Chemical / Reagent"}</Label>
            <Textarea
              rows={2}
              value={draft.chemicalReagent}
              onChange={(e) =>
                setDraft({ ...draft, chemicalReagent: e.target.value })
              }
              placeholder={
                isRtl
                  ? "مثال: Sodium oxalate, Tannic acid"
                  : "e.g. Sodium oxalate, Tannic acid"
              }
            />
          </div>

          <div className="space-y-1 md:col-span-2">
            <Label>{isRtl ? "المدة" : "Time frame"}</Label>
            <Input
              value={draft.timeFrame}
              onChange={(e) =>
                setDraft({ ...draft, timeFrame: e.target.value })
              }
              placeholder={isRtl ? "مثال: 1 أيام" : "e.g. 1 days"}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {isRtl ? "إلغاء" : "Cancel"}
          </Button>
          <Button onClick={handleSave}>
            {isRtl ? "حفظ" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}