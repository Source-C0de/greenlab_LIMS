// =========================================================================
// RejectTestDialog — required-reason modal for rejecting a test
// =========================================================================

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useAppContext } from "@/context/AppContext";
import { useRejectTest } from "@/hooks/test-approvals/useRejectTest";
import { approvalLabels } from "@/hooks/test-approvals/labels";

interface RejectTestDialogProps {
  testId: string | null;
  testName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRejected?: () => void;
}

export function RejectTestDialog({
  testId,
  testName,
  open,
  onOpenChange,
  onRejected,
}: RejectTestDialogProps) {
  const { language } = useAppContext();
  const isRtl = language === "ar";
  const labels = approvalLabels(isRtl ? "ar" : "en");

  const [reason, setReason] = useState("");
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reject = useRejectTest();

  const reset = () => {
    setReason("");
    setComment("");
    setError(null);
    setSubmitting(false);
  };

  const handleSubmit = async () => {
    if (!testId) return;
    if (reason.trim().length < 5) {
      setError(labels.reasonMinLength);
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await reject({ testId, reason: reason.trim(), comment: comment.trim() || undefined });
      reset();
      onOpenChange(false);
      onRejected?.();
    } catch {
      // toast already shown by the hook
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{labels.reject}</DialogTitle>
          <DialogDescription>
            {testName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid gap-2">
            <Label htmlFor="reject-reason">{labels.reasonLabel}</Label>
            <Textarea
              id="reject-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={labels.reasonPlaceholder}
              rows={4}
              aria-invalid={!!error}
            />
            {error && <p className="text-xs text-destructive">{error}</p>}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="reject-comment">{labels.commentLabel}</Label>
            <Textarea
              id="reject-comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder={labels.commentPlaceholder}
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => handleOpenChange(false)}>
            {isRtl ? "إلغاء" : "Cancel"}
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleSubmit}
            disabled={submitting}
          >
            {submitting ? (isRtl ? "جاري الرفض..." : "Rejecting...") : labels.reject}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}