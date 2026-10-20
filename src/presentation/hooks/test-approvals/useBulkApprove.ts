// =========================================================================
// useBulkApprove — multi-test approval used by the queue page's bulk action.
// Note: bulk approve only advances each test by one stage, matching what the
// per-row action does. If the current role doesn't own the stage a row sits
// in, that row is reported as a failure rather than silently advanced.
// =========================================================================

import { useCallback } from "react";
import { useApproveTest } from "./useApproveTest";
import type { BulkApproveInput, BulkApproveResult } from "./types";
import { toast } from "sonner";
import { approvalLabels } from "./labels";

export function useBulkApprove(): (input: BulkApproveInput) => Promise<BulkApproveResult> {
  const approve = useApproveTest();

  return useCallback(
    async (input: BulkApproveInput) => {
      const lang = document.documentElement.lang === "ar" ? "ar" : "en";
      const labels = approvalLabels(lang);

      const result: BulkApproveResult = { approved: [], failed: [] };

      for (const testId of input.testIds) {
        try {
          const r = await approve({
            testId,
            comment: input.comment,
            approverId: input.approverId,
            approverName: input.approverName,
            approverEmail: input.approverEmail,
            approverRole: input.approverRole,
          });
          if (r.test) {
            result.approved.push(r.test);
          } else {
            result.failed.push({ testId, reason: labels.cannotApprove });
          }
        } catch (err) {
          result.failed.push({
            testId,
            reason: err instanceof Error ? err.message : "unknown error",
          });
        }
      }

      if (result.approved.length > 0) {
        toast.success(labels.bulkApprove(result.approved.length), {
          description:
            result.failed.length === 0 ? undefined : `${result.failed.length} failed`,
        });
      }
      if (result.failed.length > 0 && result.approved.length === 0) {
        toast.error(labels.cannotApprove);
      }

      return result;
    },
    [approve],
  );
}