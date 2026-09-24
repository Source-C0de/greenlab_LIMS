/**
 * Quotation creation wizard.
 *
 * 4 steps: Client → Tests → Preview → Save/Print
 *
 * State is held in a single useState<Quotation>. From step 1 onward every
 * change is debounced 400ms into localStorage as a draft. "Issue Quotation"
 * finalizes: generates a reference number, freezes a client snapshot, and
 * pushes into `mockQuotations`.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronRight,
  FileText,
  Printer,
  Download,
  Save,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ClientPicker, snapshotOf, type ClientLike } from "@/components/quotations/ClientPicker";
import { LineItemTable } from "@/components/quotations/LineItemTable";
import { QuotationPreview } from "@/components/quotations/QuotationPreview";
import { useAppContext } from "@/context/AppContext";
import { useAuth } from "@/context/AuthContext";
import {
  addDays,
  DEFAULT_TERMS_AR,
  DEFAULT_TERMS_EN,
  DEFAULT_VALIDITY_DAYS,
  localUid,
  nextReferenceNumber,
  computeTotals,
  todayIso,
  VAT_RATE,
} from "@/lib/quotation-utils";
import { loadDraft, saveDraft, deleteDraft } from "@/lib/quotation-storage";
import { buildAndDownloadPdf } from "@/lib/pdf-report";
import {
  mockClients,
  mockQuotations,
  mockSpecifications,
  type Quotation,
} from "@/mock-data";

// Mutable local copy of mockClients so inline-added clients persist within
// the session (consistent with how other pages treat mock-data as mutable).
const sessionClients: ClientLike[] = [...mockClients];

const STEPS = [
  { key: "client",  en: "Client",  ar: "العميل" },
  { key: "tests",   en: "Tests",   ar: "الاختبارات" },
  { key: "preview", en: "Preview", ar: "المعاينة" },
  { key: "save",    en: "Save",    ar: "الحفظ" },
] as const;
type StepKey = (typeof STEPS)[number]["key"];

const LABELS = {
  title:        { en: "New Quotation",          ar: "عرض سعر جديد" } as const,
  back:         { en: "Back to Quotations",    ar: "العودة لعروض الأسعار" } as const,
  next:         { en: "Next",                   ar: "التالي" } as const,
  back2:        { en: "Back",                   ar: "السابق" } as const,
  issue:        { en: "Issue Quotation",        ar: "إصدار عرض السعر" } as const,
  saveDraft:    { en: "Save Draft",             ar: "حفظ كمسودة" } as const,
  print:        { en: "Print",                  ar: "طباعة" } as const,
  pdf:          { en: "Download PDF",           ar: "تحميل PDF" } as const,
  notes:        { en: "Notes (optional)",       ar: "ملاحظات (اختياري)" } as const,
  terms:        { en: "Terms & conditions",     ar: "الشروط والأحكام" } as const,
  validity:     { en: "Validity (days)",        ar: "مدة الصلاحية (أيام)" } as const,
  issued:       { en: "Quotation issued.",      ar: "تم إصدار عرض السعر." } as const,
  draftSaved:   { en: "Draft saved.",           ar: "تم حفظ المسودة." } as const,
  errNoClient:  { en: "Pick a client first.",   ar: "اختر عميلاً أولاً." } as const,
  errNoLines:   { en: "Add at least one line item.",
                  ar: "أضف بندًا واحدًا على الأقل." } as const,
  errIssued:    { en: "This quotation has been issued and cannot be edited.",
                  ar: "تم إصدار هذا العرض ولا يمكن تعديله." } as const,
};

function blankQuotation(createdBy: string): Quotation {
  const today = todayIso();
  return {
    draftId: localUid(),
    clientId: "",
    clientSnapshot: { nameEn: "", nameAr: "" },
    lineItems: [],
    subtotal: 0,
    discountType: "percent",
    discountValue: 0,
    discountAmount: 0,
    vatRate: VAT_RATE,
    vatAmount: 0,
    total: 0,
    notes: "",
    terms: DEFAULT_TERMS_EN,
    status: "draft",
    issueDate: today,
    validUntil: addDays(today, DEFAULT_VALIDITY_DAYS),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy,
  };
}

function recalc(q: Quotation): Quotation {
  const totals = computeTotals(q.lineItems, q.discountType, q.discountValue, q.vatRate);
  return {
    ...q,
    subtotal: totals.subtotal,
    discountAmount: totals.discountAmount,
    vatAmount: totals.vatAmount,
    total: totals.total,
    updatedAt: new Date().toISOString(),
  };
}

export default function NewQuotation() {
  const [, navigate] = useLocation();
  const { language, currentRole } = useAppContext();
  const { user } = useAuth();
  const isRtl = language === "ar";
  const pick = <T extends { en: string; ar: string }>(l: T) => (isRtl ? l.ar : l.en);

  const createdBy = user?.username ?? currentRole;

  const [step, setStep] = useState<StepKey>("client");
  const [q, setQ] = useState<Quotation>(() => blankQuotation(createdBy));
  const [issued, setIssued] = useState(false);

  // Resume from ?draft=<id> if present.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const draftId = params.get("draft");
    if (!draftId) return;
    const loaded = loadDraft(draftId);
    if (loaded) {
      setQ(recalc(loaded));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-save debounced. Only persists once the user has picked a client.
  const saveTimer = useRef<number | null>(null);
  useEffect(() => {
    if (!q.clientId || !q.draftId || issued) return;
    if (saveTimer.current !== null) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => {
      saveDraft(q);
    }, 400);
    return () => {
      if (saveTimer.current !== null) window.clearTimeout(saveTimer.current);
    };
  }, [q, issued]);

  // Update terms language defaults when the user switches language mid-edit
  // and hasn't typed anything custom yet.
  useEffect(() => {
    if (q.terms === DEFAULT_TERMS_EN || q.terms === DEFAULT_TERMS_AR || !q.terms) {
      setQ((prev) => ({ ...prev, terms: isRtl ? DEFAULT_TERMS_AR : DEFAULT_TERMS_EN }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRtl]);

  const canAdvance = useMemo(() => {
    if (step === "client") return q.clientId.length > 0;
    if (step === "tests") return q.lineItems.length > 0;
    return true;
  }, [step, q]);

  const goNext = () => {
    const order: StepKey[] = ["client", "tests", "preview", "save"];
    const idx = order.indexOf(step);
    if (idx >= 0 && idx < order.length - 1) setStep(order[idx + 1]);
  };
  const goBack = () => {
    const order: StepKey[] = ["client", "tests", "preview", "save"];
    const idx = order.indexOf(step);
    if (idx > 0) setStep(order[idx - 1]);
  };

  const pickClient = (client: ClientLike) => {
    setQ((prev) => ({
      ...prev,
      clientId: client.id,
      clientSnapshot: snapshotOf(client),
    }));
  };

  const createClient = (client: ClientLike) => {
    if (!sessionClients.find((c) => c.id === client.id)) {
      sessionClients.push(client);
    }
  };

  const updateField = <K extends keyof Quotation>(key: K, value: Quotation[K]) => {
    setQ((prev) => recalc({ ...prev, [key]: value }));
  };

  const handleIssue = () => {
    if (!q.clientId) {
      toast.error(pick(LABELS.errNoClient));
      setStep("client");
      return;
    }
    if (q.lineItems.length === 0) {
      toast.error(pick(LABELS.errNoLines));
      setStep("tests");
      return;
    }
    const next = recalc(q);
    const id = nextReferenceNumber(mockQuotations);
    const finalized: Quotation = {
      ...next,
      id,
      status: "issued",
      updatedAt: new Date().toISOString(),
    };
    mockQuotations.unshift(finalized);
    if (finalized.draftId) deleteDraft(finalized.draftId);
    setIssued(true);
    toast.success(pick(LABELS.issued));
    navigate(`/quotations/${id}`);
  };

  const handleSaveDraft = () => {
    saveDraft(recalc(q));
    toast.success(pick(LABELS.draftSaved));
  };

  // --- PDF / Print ---
  const previewRef = useRef<HTMLDivElement>(null);
  const handlePrint = () => {
    window.print();
  };
  const handlePdf = async () => {
    if (!previewRef.current) return;
    try {
      await buildAndDownloadPdf({
        sections: [{ label: "Quotation", ref: previewRef }],
        meta: {
          reportId: q.id ?? q.draftId ?? "draft",
          title: `Quotation — ${q.id ?? q.draftId ?? "draft"}`,
          author: "Green Lab KSA",
          subject: "Laboratory Quotation",
        },
        filename: `Quotation_${q.id ?? q.draftId ?? "draft"}.pdf`,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(msg);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div className="flex justify-between items-center no-print">
        <Button variant="ghost" onClick={() => navigate("/quotations")}>
          <ArrowLeft className={`h-4 w-4 ${isRtl ? "ml-2 rotate-180" : "mr-2"}`} />
          {pick(LABELS.back)}
        </Button>
        <div className="flex gap-2">
          {(step === "preview" || step === "save") && (
            <>
              <Button variant="outline" onClick={handlePrint}>
                <Printer className="h-4 w-4 me-2" />
                {pick(LABELS.print)}
              </Button>
              <Button variant="outline" onClick={handlePdf}>
                <Download className="h-4 w-4 me-2" />
                {pick(LABELS.pdf)}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Stepper */}
      <div className="no-print">
        <Card>
          <CardContent className="p-4">
            <ol className="flex items-center justify-between gap-2 text-sm">
              {STEPS.map((s, i) => {
                const order: StepKey[] = ["client", "tests", "preview", "save"];
                const idx = order.indexOf(step);
                const here = order.indexOf(s.key);
                const done = here < idx;
                const active = here === idx;
                return (
                  <li key={s.key} className="flex-1 flex items-center">
                    <button
                      type="button"
                      onClick={() => setStep(s.key)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-md transition-colors w-full ${
                        active
                          ? "bg-primary text-primary-foreground"
                          : done
                          ? "bg-primary/10 text-primary"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      <span className="font-mono text-xs">{i + 1}</span>
                      <span className="font-medium">{isRtl ? s.ar : s.en}</span>
                      {done && <Check className="h-3.5 w-3.5 ms-auto" />}
                    </button>
                    {i < STEPS.length - 1 && (
                      <ChevronRight className="h-4 w-4 text-muted-foreground mx-1 shrink-0" />
                    )}
                  </li>
                );
              })}
            </ol>
          </CardContent>
        </Card>
      </div>

      {/* Step content */}
      <div className={step === "preview" || step === "save" ? "" : "no-print"}>
        {step === "client" && (
          <Card>
            <CardContent className="p-6">
              <ClientPicker
                clients={sessionClients}
                selectedId={q.clientId || null}
                onSelect={pickClient}
                onCreateClient={createClient}
              />
            </CardContent>
          </Card>
        )}

        {step === "tests" && (
          <Card>
            <CardContent className="p-6">
              <LineItemTable
                quotation={q}
                catalog={mockSpecifications}
                onChange={(next) => setQ(recalc(next))}
              />
            </CardContent>
          </Card>
        )}

        {(step === "preview" || step === "save") && (
          <QuotationPreview ref={previewRef} quotation={q} />
        )}

        {step === "save" && (
          <Card className="no-print mt-4">
            <CardContent className="p-6 space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="grid gap-1.5">
                  <Label htmlFor="validity">{pick(LABELS.validity)}</Label>
                  <Input
                    id="validity"
                    type="number"
                    min={1}
                    value={
                      Math.max(
                        1,
                        Math.round(
                          (new Date(q.validUntil).getTime() -
                            new Date(q.issueDate).getTime()) /
                            (24 * 60 * 60 * 1000),
                        ),
                      ) || DEFAULT_VALIDITY_DAYS
                    }
                    onChange={(e) => {
                      const days = Math.max(1, Number(e.target.value) || 1);
                      updateField("validUntil", addDays(q.issueDate, days));
                    }}
                  />
                </div>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="notes">{pick(LABELS.notes)}</Label>
                <Input
                  id="notes"
                  value={q.notes ?? ""}
                  onChange={(e) => updateField("notes", e.target.value)}
                  placeholder={isRtl ? "أي ملاحظات إضافية تظهر على العرض" : "Any extra notes shown on the printout"}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="terms">{pick(LABELS.terms)}</Label>
                <textarea
                  id="terms"
                  rows={4}
                  value={q.terms ?? ""}
                  onChange={(e) => updateField("terms", e.target.value)}
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                />
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Footer nav */}
      <div className="flex justify-between no-print">
        <Button variant="ghost" onClick={goBack} disabled={step === "client"}>
          <ArrowLeft className={`h-4 w-4 ${isRtl ? "ml-2 rotate-180" : "mr-2"}`} />
          {pick(LABELS.back2)}
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleSaveDraft} disabled={issued}>
            <Save className="h-4 w-4 me-2" />
            {pick(LABELS.saveDraft)}
          </Button>
          {step !== "save" ? (
            <Button onClick={goNext} disabled={!canAdvance}>
              {pick(LABELS.next)}
              <ArrowRight className={`h-4 w-4 ${isRtl ? "me-2 rotate-180" : "ms-2"}`} />
            </Button>
          ) : (
            <Button onClick={handleIssue} disabled={issued}>
              <FileText className="h-4 w-4 me-2" />
              {pick(LABELS.issue)}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
