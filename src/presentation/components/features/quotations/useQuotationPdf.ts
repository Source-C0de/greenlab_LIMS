/**
 * Download the quotation document as a multi-page PDF.
 *
 * Shared by the wizard (Preview + Save steps) and the issued-quotation detail
 * page so all three export exactly the same document: the same pages, the same
 * PDF metadata, the same error handling.
 *
 * The document is split into `data-pdf-page` sections and the builder gives
 * each section one A4 sheet, so the export keeps the on-screen design instead
 * of squeezing both pages onto one.
 */

import { useCallback, useState } from "react";
import { toast } from "sonner";
import { buildAndDownloadPdf } from "@/shared/lib/pdf-report";
import { quotationPageSections } from "@/presentation/components/features/quotations/QuotationPreview";

/** The bits of a quotation that identify the document in the PDF. */
export interface QuotationPdfIdentity {
  id?: string;
  draftId?: string;
}

export function useQuotationPdf(quotation: QuotationPdfIdentity) {
  const [downloading, setDownloading] = useState(false);

  const reportId = quotation.id ?? quotation.draftId ?? "draft";

  const downloadPdf = useCallback(
    async (root: HTMLElement | null) => {
      if (!root) return;
      const sections = quotationPageSections(root);
      if (sections.length === 0) return;
      try {
        setDownloading(true);
        await buildAndDownloadPdf({
          sections,
          meta: {
            reportId,
            title: `Quotation — ${reportId}`,
            author: "Green Lab KSA",
            subject: "Laboratory Quotation",
          },
          // The document is text-heavy with thin rules and small mono numerals —
          // scale 3 keeps them crisp in the rasterised PDF.
          scale: 3,
          filename: `Quotation_${reportId}.pdf`,
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        toast.error(msg);
      } finally {
        setDownloading(false);
      }
    },
    [reportId],
  );

  return { downloadPdf, downloading };
}
