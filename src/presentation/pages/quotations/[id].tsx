/**
 * Quotation detail page.
 *
 * Read-only render with action bar (Print / Download PDF / Edit / Delete).
 * Edit and Delete only appear for drafts (status === "draft").
 */

import { useRef } from "react";
import { useParams, useLocation, Link } from "wouter";
import { ArrowLeft, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { useAppContext } from "@/presentation/providers/AppContext";
import { useAuth } from "@/presentation/providers/AuthContext";
import { QuotationPreview } from "@/presentation/components/features/quotations/QuotationPreview";
import { QuotationActions } from "@/presentation/components/features/quotations/QuotationActions";
import { useQuotationPdf } from "@/presentation/components/features/quotations/useQuotationPdf";
import { deleteDraft, loadDraft } from "@/infrastructure/domain-support/quotation-storage";
import { mockQuotations, type Quotation } from "@/infrastructure/mock/data";
import { toast } from "sonner";

const LABELS = {
  title:    { en: "Quotation",            ar: "عرض السعر" } as const,
  back:     { en: "Back to Quotations",   ar: "العودة لعروض الأسعار" } as const,
  edit:     { en: "Edit Draft",           ar: "تعديل المسودة" } as const,
  delete:   { en: "Delete Draft",         ar: "حذف المسودة" } as const,
  notFound: { en: "Quotation not found.", ar: "عرض السعر غير موجود." } as const,
  deleted:  { en: "Draft deleted.",       ar: "تم حذف المسودة." } as const,
};

export default function QuotationDetail() {
  const params = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { language } = useAppContext();
  const { user } = useAuth();
  const isRtl = language === "ar";
  const pick = <T extends { en: string; ar: string }>(l: T) => (isRtl ? l.ar : l.en);

  const id = params.id;

  // Try issued first, then drafts (in case the id is a draftId).
  const issued: Quotation | undefined =
    typeof id === "string" ? mockQuotations.find((q) => q.id === id) : undefined;
  const draft: Quotation | null =
    !issued && typeof id === "string" ? loadDraft(id) : null;
  const quotation: Quotation | null = issued ?? draft ?? null;

  const previewRef = useRef<HTMLDivElement>(null);
  // Hooks must run before the early return below, so the identity is taken
  // from whichever source resolved.
  const { downloadPdf, downloading } = useQuotationPdf({
    id: quotation?.id,
    draftId: quotation?.draftId,
  });

  if (!quotation) {
    return (
      <div className="max-w-4xl mx-auto py-12 text-center">
        <p className="text-muted-foreground">{pick(LABELS.notFound)}</p>
        <Button asChild variant="link" className="mt-4">
          <Link href="/quotations">{pick(LABELS.back)}</Link>
        </Button>
      </div>
    );
  }

  const isDraft = quotation.status === "draft";

  const handlePrint = () => window.print();

  const handlePdf = () => downloadPdf(previewRef.current);

  const handleDelete = () => {
    if (!isDraft || !quotation.draftId) return;
    deleteDraft(quotation.draftId);
    toast.success(pick(LABELS.deleted));
    navigate("/quotations");
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      <div className="flex justify-between items-center no-print">
        <Link href="/quotations">
          <Button variant="ghost">
            <ArrowLeft className={`h-4 w-4 ${isRtl ? "ml-2 rotate-180" : "mr-2"}`} />
            {pick(LABELS.back)}
          </Button>
        </Link>
        <div className="flex gap-2">
          <QuotationActions
            onPrint={handlePrint}
            onDownload={handlePdf}
            downloading={downloading}
          />
          {isDraft && quotation.draftId && (
            <>
              <Button variant="outline" onClick={() => navigate(`/quotations/new?draft=${quotation.draftId}`)}>
                <Pencil className="h-4 w-4 me-2" />
                {pick(LABELS.edit)}
              </Button>
              <Button variant="destructive" onClick={handleDelete}>
                <Trash2 className="h-4 w-4 me-2" />
                {pick(LABELS.delete)}
              </Button>
            </>
          )}
        </div>
      </div>

      <QuotationPreview ref={previewRef} quotation={quotation} />
    </div>
  );
}
