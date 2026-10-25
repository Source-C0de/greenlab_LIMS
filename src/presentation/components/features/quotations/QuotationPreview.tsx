/**
 * Read-only render of a Quotation — used inside the wizard's preview step,
 * the detail page, and as the printable / PDF region.
 *
 * The layout follows the Green Lab quotation template:
 *
 *   header lockups → title + number → customer ǀ quotation details
 *   → items table → totals → terms (EN + AR) → signature → footer
 *
 * The customer and quotation blocks are `table-fixed` tables with a fixed
 * label column, so both value columns start at the same offset — that is what
 * keeps the two blocks aligned once html2canvas rasterises them into the PDF.
 *
 * The wrapping div carries a `data-printable` attribute so the page-level
 * `no-print` CSS can target everything except this node at print time.
 */

import { forwardRef } from "react";
import { useAppContext } from "@/presentation/providers/AppContext";
import {
  SAR,
  computeLineTotals,
  computeTotals,
  formatNumber,
  VAT_RATE,
  SELLER_VAT_NO,
  DEFAULT_TERMS_AR,
  DEFAULT_TERMS_EN,
  DEFAULT_PAYMENT_TERMS_AR,
  DEFAULT_PAYMENT_TERMS_EN,
} from "@/infrastructure/domain-support/quotation-utils";
import type { Quotation } from "@/infrastructure/mock/data/quotations";

interface QuotationPreviewProps {
  quotation: Quotation;
}

type Label = { en: string; ar: string };

const LABELS = {
  docTitle:          { en: "Quotation",                 ar: "عرض سعر" } as Label,
  quotationNumber:   { en: "Quotation number",          ar: "رقم عرض السعر" } as Label,

  // ---- The two-column info block: customer ǀ quotation details ----
  customerHeading:   { en: "Customer",                  ar: "العميل" } as Label,
  quotationHeading:  { en: "Quotation details",         ar: "بيانات عرض السعر" } as Label,
  mobile:            { en: "Mobile no.",                ar: "رقم الجوال" } as Label,
  building:          { en: "Building",                  ar: "المبنى" } as Label,
  address:           { en: "Address",                   ar: "العنوان" } as Label,
  city:              { en: "City",                      ar: "المدينة" } as Label,
  area:              { en: "Area",                      ar: "المنطقة" } as Label,
  postalCode:        { en: "Postal code",               ar: "الرمز البريدي" } as Label,
  country:           { en: "Country",                   ar: "الدولة" } as Label,
  vatRef:            { en: "VAT Ref.",                  ar: "الرقم الضريبي للعميل" } as Label,
  quotationNo:       { en: "Quotation No.",             ar: "رقم عرض السعر" } as Label,
  quotationDate:     { en: "Quotation date",            ar: "تاريخ عرض السعر" } as Label,
  paymentTerms:      { en: "Payment terms",             ar: "شروط الدفع" } as Label,
  validity:          { en: "Validity",                  ar: "مدة الصلاحية" } as Label,
  vatNo:             { en: "VAT No.",                   ar: "الرقم الضريبي" } as Label,
  preparedBy:        { en: "Prepared by",               ar: "أعد بواسطة" } as Label,
  status:            { en: "Status",                    ar: "الحالة" } as Label,
  draft:             { en: "Draft",                     ar: "مسودة" } as Label,
  issued:            { en: "Issued",                    ar: "صادر" } as Label,
  expired:           { en: "Expired",                   ar: "منتهي الصلاحية" } as Label,
  superseded:        { en: "Superseded",                ar: "مستبدل" } as Label,

  itemsHdr:          { en: "Items",                     ar: "العناصر" } as Label,
  itemNo:            { en: "#",                         ar: "#" } as Label,
  productCode:       { en: "Product code",              ar: "رمز المنتج" } as Label,
  productName:       { en: "Product Name",              ar: "اسم المنتج" } as Label,
  description:       { en: "Description",               ar: "الوصف" } as Label,
  amount:            { en: "Qty",                       ar: "الكمية" } as Label,
  unitPrice:         { en: "Unit Price",                ar: "سعر الوحدة" } as Label,
  discountPct:       { en: "Disc %",                    ar: "نسبة الخصم" } as Label,
  lineTotal:         { en: "Total",                     ar: "الإجمالي" } as Label,
  vatPct:            { en: "VAT %",                     ar: "نسبة الضريبة" } as Label,
  vatAmount:         { en: "VAT Amount",                ar: "قيمة الضريبة" } as Label,
  vatTotal:          { en: "VAT Total",                 ar: "الإجمالي مع الضريبة" } as Label,
  noItems:           { en: "No line items",             ar: "لا توجد بنود" } as Label,
  subtotal:          { en: "Subtotal",                  ar: "الإجمالي الفرعي" } as Label,
  discount:          { en: "Discount",                  ar: "الخصم" } as Label,
  vat:               { en: `VAT (${Math.round(VAT_RATE * 100)}%)`, ar: `ضريبة القيمة المضافة (${Math.round(VAT_RATE * 100)}٪)` } as Label,
  total:             { en: "Total",                     ar: "الإجمالي" } as Label,
  terms:             { en: "Terms and conditions",      ar: "الشروط والأحكام" } as Label,
  importantInfo:     { en: "Important information",      ar: "معلومات هامة" } as Label,
  authorizedSig:     { en: "Authorized signature",      ar: "التوقيع المعتمد" } as Label,
  authorizedSigName: { en: "Authorized signature name", ar: "اسم الموقّع" } as Label,
  footerCr:          { en: "Tax No. 300012345600003 — GreenLab • www.greenlab.com.sa", ar: "الرقم الضريبي ٣٠٠٠١٢٣٤٥٦٠٠٠٠٣ — جرين لاب • www.greenlab.com.sa" } as Label,
} as const;

export const QuotationPreview = forwardRef<HTMLDivElement, QuotationPreviewProps>(
  function QuotationPreview({ quotation }, ref) {
    const { language } = useAppContext();
    const isRtl = language === "ar";
    const pick = (l: Label) => (isRtl ? l.ar : l.en);

    const totals = computeTotals(
      quotation.lineItems,
      quotation.discountType,
      quotation.discountValue,
      quotation.vatRate,
    );

    // Per-line totals for the printed rows. Shares its allocation with
    // `computeTotals`, so the rows and the Totals block always agree.
    const lineTotals = computeLineTotals(
      quotation.lineItems,
      quotation.discountType,
      quotation.discountValue,
      quotation.vatRate,
    );

    // The discount rate is a quotation-level setting — every row shows it.
    const discountPctLabel =
      quotation.discountType === "percent"
        ? `${quotation.discountValue}%`
        : quotation.discountValue > 0
          ? "—"
          : "0%";

    const vatPctLabel = `${Math.round(quotation.vatRate * 100)}%`;

    const client = quotation.clientSnapshot;
    const clientName = isRtl && client.nameAr ? client.nameAr : client.nameEn;
    const reference = quotation.id ?? quotation.draftId ?? "";

    // The terms are shown twice — English and Arabic — like the template. A
    // user-authored `terms` value only exists as free text, so it fills the
    // English block and the Arabic block falls back to the default.
    const termsEn = quotation.terms?.trim() || DEFAULT_TERMS_EN;

    // Payment terms fall back to the module default when the BDM hasn't
    // overridden them on the save step.
    const defaultPaymentTerms = isRtl
      ? DEFAULT_PAYMENT_TERMS_AR
      : DEFAULT_PAYMENT_TERMS_EN;

    // Every QuotationStatus gets its own word — mapping every non-draft status
    // to "Issued" would mislabel expired and superseded quotations.
    const statusLabel = (() => {
      switch (quotation.status) {
        case "draft":
          return pick(LABELS.draft);
        case "issued":
          return pick(LABELS.issued);
        case "expired":
          return pick(LABELS.expired);
        case "superseded":
          return pick(LABELS.superseded);
      }
    })();

    return (
      <div
        ref={ref}
        data-printable
        dir={isRtl ? "rtl" : "ltr"}
        style={{ backgroundColor: "#ffffff", color: "#000000" }}
        className="w-full overflow-hidden"
      >
        {/* 1 — Business-card lockups: logo on the start side, company text on the end */}
        <div className="flex items-center justify-between gap-6 border-b border-black/20 px-4 md:px-5 py-4">
          <img
            src="/images/GL LOGO_Business Card 1.svg"
            alt="GreenLab"
            crossOrigin="anonymous"
            className="h-16 w-auto shrink-0"
          />
          <img
            src="/images/TEXT_Business Card 1.svg"
            alt="GreenLab — Food, Drug, Beauty laboratory services"
            crossOrigin="anonymous"
            className="h-10 w-auto shrink-0"
          />
        </div>

        <div className="px-4 md:px-5 py-8 space-y-7">
          {/* 2 — Title + quotation number */}
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 border-b-2 border-black/80 pb-3">
            <h1 className="text-3xl font-bold tracking-tight uppercase">
              {pick(LABELS.docTitle)}
            </h1>
            <div className="text-start md:text-end">
              <p className="text-xs uppercase tracking-widest text-black/60">
                {pick(LABELS.quotationNumber)}
              </p>
              <p className="text-xl font-mono font-bold">{reference}</p>
            </div>
          </div>

          {/* 3 — Customer information ǀ Quotation details */}
          {/*
            NOTE: grid column order follows DOM order, not writing direction.
            The customer block is first in the DOM, so it renders on the LEFT in
            English and on the RIGHT in Arabic — the customer-facing side in
            both languages. Do not reorder the DOM to "fix" this.
          */}
          <div className="grid md:grid-cols-2 gap-8">
            {/* ---- Customer ---- */}
            <section className="border border-black/25">
              <header className="border-b border-black/25 bg-black/[0.03] px-4 py-2">
                <h2 className="text-sm font-bold uppercase tracking-wide">
                  {pick(LABELS.customerHeading)}
                </h2>
              </header>

              <div className="px-4 py-3">
                {/* Customer name — the block's anchor, not a label/value row */}
                <p className="text-base font-bold leading-snug">{clientName || "—"}</p>
                {isRtl && client.nameAr && client.nameEn !== client.nameAr && (
                  <p className="text-xs text-black/60" dir="ltr">
                    {client.nameEn}
                  </p>
                )}
                {!isRtl && client.nameAr && (
                  <p className="text-xs text-black/60" dir="rtl">
                    {client.nameAr}
                  </p>
                )}

                <table className="mt-3 w-full table-fixed text-sm">
                  <colgroup>
                    <col style={{ width: "9.5rem" }} />
                    <col />
                  </colgroup>
                  <tbody>
                    <InfoRow label={pick(LABELS.mobile)} value={client.mobile} mono />
                    <InfoRow label={pick(LABELS.building)} value={client.building} />
                    <InfoRow label={pick(LABELS.address)} value={client.address} />
                    <InfoRow label={pick(LABELS.city)} value={client.city} />
                    <InfoRow label={pick(LABELS.area)} value={client.area} />
                    <InfoRow
                      label={pick(LABELS.postalCode)}
                      value={client.postalCode}
                      mono
                    />
                    <InfoRow label={pick(LABELS.country)} value={client.country} />
                    <InfoRow label={pick(LABELS.vatRef)} value={client.vatNo} mono />
                  </tbody>
                </table>
              </div>
            </section>

            {/* ---- Quotation details ---- */}
            <section className="border border-black/25">
              <header className="border-b border-black/25 bg-black/[0.03] px-4 py-2">
                <h2 className="text-sm font-bold uppercase tracking-wide">
                  {pick(LABELS.quotationHeading)}
                </h2>
              </header>

              <div className="px-4 py-3">
                <table className="w-full table-fixed text-sm">
                  <colgroup>
                    <col style={{ width: "9.5rem" }} />
                    <col />
                  </colgroup>
                  <tbody>
                    <InfoRow label={pick(LABELS.quotationNo)} value={reference} mono />
                    <InfoRow
                      label={pick(LABELS.quotationDate)}
                      value={quotation.issueDate}
                      mono
                    />
                    <InfoRow
                      label={pick(LABELS.paymentTerms)}
                      value={quotation.paymentTerms?.trim() || defaultPaymentTerms}
                    />
                    <InfoRow
                      label={pick(LABELS.validity)}
                      value={quotation.validUntil}
                      mono
                    />
                    <InfoRow label={pick(LABELS.vatNo)} value={SELLER_VAT_NO} mono />
                    <InfoRow
                      label={pick(LABELS.description)}
                      value={quotation.subject?.trim() || quotation.notes?.trim()}
                    />
                    <InfoRow
                      label={pick(LABELS.preparedBy)}
                      value={quotation.createdBy}
                      mono
                    />
                    <InfoRow label={pick(LABELS.status)} value={statusLabel} />
                  </tbody>
                </table>
              </div>
            </section>
          </div>

          {/* 4 — Line items table */}
          {/*
            `table-fixed` + a percentage <colgroup> makes the declared widths
            authoritative, so every column lands on exactly the same boundary on
            every row and every page — which is what "aligned with the page
            size" needs. Percentages let the table scale between the wizard's
            `max-w-6xl` and the detail page's `max-w-4xl` container while the
            proportions stay identical.
          */}
          <div>
            <h2 className="font-bold uppercase tracking-wide text-sm border-b border-black/30 pb-1 mb-2">
              {pick(LABELS.itemsHdr)}
            </h2>
            <table className="w-full text-[11px] table-fixed border-collapse">
              <colgroup>
                <col style={{ width: "3%" }} />
                <col style={{ width: "10%" }} />
                <col style={{ width: "19%" }} />
                <col style={{ width: "13%" }} />
                <col style={{ width: "4%" }} />
                <col style={{ width: "9%" }} />
                <col style={{ width: "5%" }} />
                <col style={{ width: "9%" }} />
                <col style={{ width: "5%" }} />
                <col style={{ width: "8%" }} />
                <col style={{ width: "10%" }} />
              </colgroup>
              <thead>
                <tr className="border-b border-black/40">
                  <th className="text-start py-1.5 pe-1.5">{pick(LABELS.itemNo)}</th>
                  <th className="text-start py-1.5 pe-1.5">{pick(LABELS.productCode)}</th>
                  <th className="text-start py-1.5 pe-1.5">{pick(LABELS.productName)}</th>
                  <th className="text-start py-1.5 pe-1.5">{pick(LABELS.description)}</th>
                  <th className="text-end py-1.5 px-1">{pick(LABELS.amount)}</th>
                  <th className="text-end py-1.5 px-1">{pick(LABELS.unitPrice)}</th>
                  <th className="text-end py-1.5 px-1">{pick(LABELS.discountPct)}</th>
                  <th className="text-end py-1.5 px-1">{pick(LABELS.lineTotal)}</th>
                  <th className="text-end py-1.5 px-1">{pick(LABELS.vatPct)}</th>
                  <th className="text-end py-1.5 px-1">{pick(LABELS.vatAmount)}</th>
                  <th className="text-end py-1.5 ps-1.5">{pick(LABELS.vatTotal)}</th>
                </tr>
              </thead>
              <tbody>
                {quotation.lineItems.length === 0 ? (
                  <tr>
                    <td
                      colSpan={11}
                      className="py-6 text-center text-black/50 text-xs"
                    >
                      {pick(LABELS.noItems)}
                    </td>
                  </tr>
                ) : (
                  quotation.lineItems.map((li, idx) => {
                    const row = lineTotals[idx];
                    return (
                      <tr key={li.id} className="border-b border-black/10">
                        <td className="py-1.5 pe-1.5 text-black/60">{idx + 1}</td>
                        <td className="py-1.5 pe-1.5 font-mono text-[10px]">
                          {li.specCode || "—"}
                        </td>
                        <td className="py-1.5 pe-1.5 font-medium">
                          {li.productName || li.name || "—"}
                        </td>
                        <td className="py-1.5 pe-1.5 text-black/70">
                          {li.description || "—"}
                        </td>
                        <td className="text-end py-1.5 px-1 font-mono">
                          {formatNumber(li.quantity)}
                        </td>
                        <td className="text-end py-1.5 px-1 font-mono">
                          {formatNumber(li.unitPrice)}
                        </td>
                        <td className="text-end py-1.5 px-1 font-mono">
                          {discountPctLabel}
                        </td>
                        <td className="text-end py-1.5 px-1 font-mono">
                          {formatNumber(row.gross)}
                        </td>
                        <td className="text-end py-1.5 px-1 font-mono">
                          {vatPctLabel}
                        </td>
                        <td className="text-end py-1.5 px-1 font-mono">
                          {formatNumber(row.vatAmount)}
                        </td>
                        <td className="text-end py-1.5 ps-1.5 font-mono font-semibold">
                          {formatNumber(row.vatTotal)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* 5 — Totals */}
          <div className="flex justify-end">
            <div className="w-full max-w-xs text-sm space-y-1">
              <div className="flex justify-between gap-4">
                <span>{pick(LABELS.subtotal)}</span>
                <span className="font-mono">{SAR(totals.subtotal)}</span>
              </div>
              {totals.discountAmount > 0 && (
                <div className="flex justify-between gap-4 text-black/70">
                  <span>
                    - {pick(LABELS.discount)}
                    {quotation.discountType === "percent" && quotation.discountValue > 0
                      ? ` (${quotation.discountValue}%)`
                      : ""}
                  </span>
                  <span className="font-mono">{SAR(totals.discountAmount)}</span>
                </div>
              )}
              <div className="flex justify-between gap-4">
                <span>{pick(LABELS.vat)}</span>
                <span className="font-mono">{SAR(totals.vatAmount)}</span>
              </div>
              <div className="flex justify-between gap-4 border-t-2 border-black/70 pt-2 mt-2 text-base font-bold">
                <span>{pick(LABELS.total)}</span>
                <span className="font-mono">{SAR(totals.total)}</span>
              </div>
            </div>
          </div>

          {/* 6 — Terms (EN + AR) */}
          <div className="grid md:grid-cols-2 gap-8 pt-4 border-t border-black/20">
            <div>
              <h2 className="font-bold uppercase tracking-wide text-sm border-b border-black/30 pb-1 mb-2">
                {pick(LABELS.terms)}
              </h2>
              <p className="text-xs leading-relaxed whitespace-pre-wrap">
                {termsEn}
              </p>
            </div>
            <div dir="rtl">
              <h2 className="font-bold uppercase tracking-wide text-sm border-b border-black/30 pb-1 mb-2">
                {pick(LABELS.importantInfo)}
              </h2>
              <p className="text-xs leading-relaxed whitespace-pre-wrap">
                {DEFAULT_TERMS_AR}
              </p>
            </div>
          </div>

          {/* 7 — Signature */}
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 pt-6">
            <div className="h-24 w-24 border border-dashed border-black/40 flex items-center justify-center text-[10px] text-black/40 text-center px-2">
              {pick(LABELS.authorizedSig)}
            </div>
            <div className="text-start sm:text-end">
              <div className="w-56 border-t border-black/60 pt-1">
                <p className="text-xs font-semibold">{pick(LABELS.authorizedSig)}</p>
                <p className="text-xs text-black/60">{pick(LABELS.authorizedSigName)}</p>
              </div>
            </div>
          </div>

          {/* 8 — Footer */}
          <div className="text-center text-[10px] text-black/60 border-t border-black/20 pt-3">
            {pick(LABELS.footerCr)}
          </div>
        </div>
      </div>
    );
  },
);

/**
 * One label/value row inside a customer- or quotation-info table.
 *
 * Renders nothing when the value is empty — the two blocks have different field
 * sets, so an empty row would leave a dangling label and a gap in the grid.
 */
function InfoRow({
  label,
  value,
  mono = false,
}: {
  label: string;
  value?: string | null;
  /** Render the value in the monospace face (VAT no., dates, refs). */
  mono?: boolean;
}) {
  if (!value || !value.trim()) return null;
  return (
    <tr>
      <th
        scope="row"
        className="align-top py-1 pe-3 text-start text-[10px] font-medium uppercase tracking-wide text-black/55"
      >
        {label}
      </th>
      <td
        className={`align-top py-1 text-start text-[13px] leading-snug ${
          mono ? "font-mono" : "font-medium"
        }`}
      >
        {value}
      </td>
    </tr>
  );
}
