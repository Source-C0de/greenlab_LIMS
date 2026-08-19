import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { ParameterTable } from "./ParameterTable";
import { useAppContext } from "@/context/AppContext";
import { Beaker, Calendar, User, Save, CheckCircle, Send } from "lucide-react";
import { useSubmitTest } from "@/hooks/test-approvals/useSubmitTest";
import { approvalLabels } from "@/hooks/test-approvals/labels";

interface TestDrawerProps {
  test: any;
  isOpen: boolean;
  onClose: () => void;
}

export function TestDrawer({ test, isOpen, onClose }: TestDrawerProps) {
  const { language } = useAppContext();
  const isRtl = language === "ar";
  const labels = approvalLabels(isRtl ? "ar" : "en");
  const submit = useSubmitTest();
  const [submitting, setSubmitting] = useState(false);

  if (!test) return null;

  const reviewStatus: string | undefined = test.reviewStatus ?? test.status;
  const canSubmit =
    reviewStatus === "in_progress" || reviewStatus === "changes_requested";

  const handleSubmit = async () => {
    if (!test?.id) return;
    setSubmitting(true);
    try {
      const { test: updated } = await submit({ testId: test.id });
      if (updated) {
        onClose();
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent
        side={isRtl ? "left" : "right"}
        className="w-full sm:max-w-xl overflow-y-auto"
      >
        <SheetHeader className="mb-6 border-b pb-4">
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="outline" className="font-mono text-xs">{test.id}</Badge>
            <StatusBadge status={reviewStatus ?? "pending"} />
          </div>
          <SheetTitle className="text-2xl">{test.name}</SheetTitle>
          <SheetDescription>
            {isRtl ? "تفاصيل الاختبار ومعلمات النتائج" : "Detailed test specifications and result parameters."}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-8">
          {/* Metadata Section */}
          <div className="grid grid-cols-2 gap-4 bg-muted/30 p-4 rounded-lg border">
            <div className="space-y-1">
              <span className="text-[10px] uppercase text-muted-foreground font-semibold flex items-center gap-1">
                <Beaker className="w-3 h-3" /> {isRtl ? "المئة" : "Category"}
              </span>
              <p className="text-sm font-medium">{test.category}</p>
            </div>
            <div className="space-y-1">
              <span className="text-[10px] uppercase text-muted-foreground font-semibold flex items-center gap-1">
                <Calendar className="w-3 h-3" /> {isRtl ? "الطريقة" : "Method"}
              </span>
              <p className="text-sm font-medium">{test.method}</p>
            </div>
            <div className="space-y-1">
              <span className="text-[10px] uppercase text-muted-foreground font-semibold flex items-center gap-1">
                <User className="w-3 h-3" /> {isRtl ? "المحلل" : "Assigned To"}
              </span>
              <p className="text-sm font-medium">{test.assignedTo || "Unassigned"}</p>
            </div>
          </div>

          {/* Parameters Section */}
          <div className="space-y-4">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-primary" />
              {isRtl ? "معلمات الاختبار" : "Test Parameters"}
            </h3>
            <ParameterTable 
              parameters={test.parameters} 
              onUpdate={() => {}} 
            />
          </div>

          {/* Observations */}
          <div className="space-y-2">
            <label className="text-sm font-semibold">{isRtl ? "الملاحظات" : "Observations"}</label>
            <textarea 
              className="w-full min-h-[100px] rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              placeholder={isRtl ? "أدخل أي ملاحظات إضافية هنا..." : "Enter any additional analytical observations..."}
            />
          </div>
        </div>

        <SheetFooter className="mt-8 border-t pt-4">
          <div className="flex gap-2 w-full justify-end">
            <Button variant="outline" onClick={onClose} className="flex-1 sm:flex-none">
              {isRtl ? "إلغاء" : "Cancel"}
            </Button>
            {canSubmit && (
              <Button
                variant="secondary"
                onClick={handleSubmit}
                disabled={submitting}
                className="flex-1 sm:flex-none gap-2"
              >
                <Send className="w-4 h-4" />
                {submitting
                  ? isRtl
                    ? "جاري الإرسال..."
                    : "Submitting..."
                  : labels.submit}
              </Button>
            )}
            <Button className="flex-1 sm:flex-none gap-2">
              <Save className="w-4 h-4" />
              {isRtl ? "حفظ النتائج" : "Save Results"}
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
