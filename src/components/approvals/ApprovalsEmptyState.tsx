// =========================================================================
// ApprovalsEmptyState — empty state for the queue / my-submissions pages
// =========================================================================

import { ClipboardCheck } from "lucide-react";

interface ApprovalsEmptyStateProps {
  message: string;
  description?: string;
}

export function ApprovalsEmptyState({ message, description }: ApprovalsEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-md border border-dashed py-16 text-center">
      <ClipboardCheck className="h-10 w-10 text-muted-foreground mb-3" />
      <p className="text-sm font-medium">{message}</p>
      {description && (
        <p className="text-xs text-muted-foreground mt-1 max-w-sm">{description}</p>
      )}
    </div>
  );
}