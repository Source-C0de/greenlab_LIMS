import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/StatusBadge";
import {
  UserPlus,
  RefreshCw,
  ClipboardCheck,
} from "lucide-react";
import { useAppContext } from "@/context/AppContext";

interface SampleHeaderProps {
  sample: {
    id: string;
    clientName: string;
    sampleType: string;
    status: string;
    priority: string;
    receivedDate: string;
    receivedBy?: string;
  };
  /** Number of tests on this sample that are awaiting the current user's stage. */
  pendingForMe?: number;
  onAssignAnalyst?: () => void;
  onReview?: () => void;
}

export function SampleHeader({
  sample,
  pendingForMe = 0,
  onAssignAnalyst,
  onReview,
}: SampleHeaderProps) {
  const { language, currentRole } = useAppContext();
  const isRtl = language === "ar";

  const canReview =
    !!onReview &&
    (currentRole === "lab_manager" ||
      currentRole === "admin" ||
      currentRole === "superadmin");

  return (
    <div className="sticky top-0 z-20 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b pb-4 mb-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pt-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold tracking-tight font-mono">{sample.id}</h1>
            <StatusBadge status={sample.status} />
            <Badge
              variant="outline"
              className={
                sample.priority === "High" || sample.priority === "Urgent"
                  ? "text-red-600 border-red-200 bg-red-50"
                  : ""
              }
            >
              {sample.priority} {isRtl ? "أولوية" : "Priority"}
            </Badge>
            {canReview && pendingForMe > 0 && (
              <Badge
                variant="secondary"
                className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30 font-semibold"
              >
                {pendingForMe}{" "}
                {isRtl ? "بانتظار اعتمادك" : "awaiting your approval"}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-4 text-muted-foreground text-sm">
            <span>
              <strong>{isRtl ? "العميل:" : "Client:"}</strong> {sample.clientName}
            </span>
            <span className="h-1 w-1 rounded-full bg-muted-foreground/30"></span>
            <span>
              <strong>{isRtl ? "النوع:" : "Type:"}</strong> {sample.sampleType}
            </span>
            <span className="h-1 w-1 rounded-full bg-muted-foreground/30"></span>
            <span>
              <strong>{isRtl ? "تاريخ الاستلام:" : "Received:"}</strong> {sample.receivedDate}
            </span>
            <span className="h-1 w-1 rounded-full bg-muted-foreground/30"></span>
            <span>
              <strong>{isRtl ? "استلم بواسطة:" : "Received By:"}</strong>{" "}
              {sample.receivedBy ?? "—"}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {/* Primary review action — opens the same TestReviewDrawer used by /approvals. */}
          {canReview && (
            <Button
              size="sm"
              variant={pendingForMe > 0 ? "default" : "outline"}
              className={
                pendingForMe > 0
                  ? "bg-amber-500 hover:bg-amber-600 text-white border-amber-500"
                  : ""
              }
              onClick={onReview}
            >
              <ClipboardCheck className="mr-2 h-4 w-4" />
              {isRtl ? "مراجعة" : "Review"}
              {pendingForMe > 0 && (
                <Badge
                  variant="secondary"
                  className="ms-2 bg-white/20 text-white border-white/30"
                >
                  {pendingForMe}
                </Badge>
              )}
            </Button>
          )}

          {currentRole !== "client" && (
            <>
              <Button variant="outline" size="sm" onClick={onAssignAnalyst}>
                <UserPlus className="mr-2 h-4 w-4" />{" "}
                {isRtl ? "تعديل الفريق" : "Assign Technician"}
              </Button>
              <Button variant="outline" size="sm">
                <RefreshCw className="mr-2 h-4 w-4" />{" "}
                {isRtl ? "تغيير الحالة" : "Change Status"}
              </Button>
              <div className="h-8 w-px bg-border mx-1 hidden md:block"></div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
