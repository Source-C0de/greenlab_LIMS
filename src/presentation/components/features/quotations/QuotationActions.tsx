/**
 * The print + download actions for a quotation document.
 *
 * Shared by the wizard's Preview and Save steps and by the issued-quotation
 * detail page, so all three offer exactly the same two actions with the same
 * behaviour.
 */

import { Download, Loader2, Printer } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { useAppContext } from "@/presentation/providers/AppContext";

const LABELS = {
  print: { en: "Print", ar: "طباعة" } as const,
  pdf: { en: "Download PDF", ar: "تحميل PDF" } as const,
};

export function QuotationActions({
  onPrint,
  onDownload,
  downloading = false,
}: {
  onPrint: () => void;
  onDownload: () => void;
  downloading?: boolean;
}) {
  const { language } = useAppContext();
  const isRtl = language === "ar";
  const pick = <T extends { en: string; ar: string }>(l: T) => (isRtl ? l.ar : l.en);

  return (
    <div className="flex gap-2">
      <Button variant="outline" onClick={onPrint} disabled={downloading}>
        <Printer className="h-4 w-4 me-2" />
        {pick(LABELS.print)}
      </Button>
      <Button variant="outline" onClick={onDownload} disabled={downloading}>
        {downloading ? (
          <Loader2 className="h-4 w-4 me-2 animate-spin" />
        ) : (
          <Download className="h-4 w-4 me-2" />
        )}
        {pick(LABELS.pdf)}
      </Button>
    </div>
  );
}
