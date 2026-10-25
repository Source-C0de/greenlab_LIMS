/**
 * Read-only render of a Quotation — used inside the wizard's preview step,
 * the detail page, and as the printable / PDF region.
 *
 * The layout follows the Green Lab quotation template:
 *
 *   header lockups → title + number → customer ǀ quotation details
 *   → items table → totals → terms & conditions → signature → footer
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
  DEFAULT_PAYMENT_TERMS_AR,
  DEFAULT_PAYMENT_TERMS_EN,
  QUOTATION_TERM_CLAUSES,
} from "@/infrastructure/domain-support/quotation-utils";
import type { Quotation } from "@/infrastructure/mock/data/quotations";

interface QuotationPreviewProps {
  quotation: Quotation;
}

type Label = { en: string; ar: string };

/**
 * Every label carries both languages, and the printed document shows BOTH
 * regardless of the app's language toggle — a Saudi quotation is issued to
 * Arabic- and English-speaking audiences alike, so the PDF must not depend on
 * which locale the BDM happened to be in.
 *
 * `pick` is therefore only used for values that genuinely differ by language
 * (the terms boilerplate, the status wording); static labels always render
 * their Arabic + English pair.
 */
const LABELS = {
  docTitle:          { en: "Quotation",                 ar: "عرض سعر" } as Label,
  quotationNumber:   { en: "Quotation number",          ar: "رقم عرض السعر" } as Label,

  // ---- The two-column info block: customer ǀ quotation details ----
  customerHeading:   { en: "Customer",                  ar: "العميل" } as Label,
  quotationHeading:  { en: "Quotation details",         ar: "بيانات عرض السعر" } as Label,
  customerName:      { en: "Customer Name",             ar: "اسم العميل" } as Label,
  mobile:            { en: "Mobile",                   ar: "رقم الجوال" } as Label,
  building:          { en: "Building",                  ar: "المبنى" } as Label,
  address:           { en: "Address",                   ar: "العنوان" } as Label,
  city:              { en: "City",                      ar: "المدينة" } as Label,
  area:              { en: "Area",                      ar: "المنطقة" } as Label,
  postalCode:        { en: "Post code",                 ar: "الرمز البريدي" } as Label,
  country:           { en: "Country",                   ar: "الدولة" } as Label,
  vatRef:            { en: "VAT Ref.",                  ar: "الرقم الضريبي للعميل" } as Label,
  quotationNo:       { en: "Quot. No.",                 ar: "رقم عرض السعر" } as Label,
  quotationDate:     { en: "Quot. date",                ar: "تاريخ عرض السعر" } as Label,
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
  productCode:       { en: "Product Code",              ar: "رمز المنتج" } as Label,
  productName:       { en: "Product Name",              ar: "اسم المنتج" } as Label,
  description:       { en: "Description",               ar: "الوصف" } as Label,
  amount:            { en: "QTY",                       ar: "الكمية" } as Label,
  unitPrice:         { en: "Unit Price",                ar: "السعر" } as Label,
  discountPct:       { en: "Disc",                      ar: "الخصم %" } as Label,
  lineTotal:         { en: "Total",                     ar: "الإجمالي" } as Label,
  vatPct:            { en: "VAT %",                     ar: "ضريبة %" } as Label,
  vatAmount:         { en: "VAT",                       ar: "الضريبة" } as Label,
  vatTotal:          { en: "Total (VAT)",               ar: "الإجمالي بالضريبة" } as Label,
  noItems:           { en: "No line items",             ar: "لا توجد بنود" } as Label,
  subtotal:          { en: "Subtotal",                  ar: "الإجمالي الفرعي" } as Label,
  discount:          { en: "Discount",                  ar: "الخصم" } as Label,
  vat:               { en: `VAT (${Math.round(VAT_RATE * 100)}%)`, ar: `ضريبة القيمة المضافة (${Math.round(VAT_RATE * 100)}٪)` } as Label,
  total:             { en: "Total",                     ar: "الإجمالي" } as Label,
  terms:             { en: "Terms and conditions",      ar: "الشروط والأحكام" } as Label,
  authorizedSig:     { en: "Authorized signature",      ar: "التوقيع المعتمد" } as Label,
  authorizedSigName: { en: "Authorized signature name", ar: "اسم الموقّع" } as Label,
  footerCr:          { en: "Tax No. 300012345600003 — GreenLab • www.greenlab.com.sa", ar: "الرقم الضريبي ٣٠٠٠١٢٣٤٥٦٠٠٠٠٣ — جرين لاب • www.greenlab.com.sa" } as Label,
} as const;

export const QuotationPreview = forwardRef<HTMLDivElement, QuotationPreviewProps>(
  function QuotationPreview({ quotation }, ref) {
    const { language } = useAppContext();
    const isRtl = language === "ar";
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
    const reference = quotation.id ?? quotation.draftId ?? "";

    // Payment terms fall back to the module default when the BDM hasn't
    // overridden them on the save step.
    const defaultPaymentTerms = isRtl
      ? DEFAULT_PAYMENT_TERMS_AR
      : DEFAULT_PAYMENT_TERMS_EN;

    // Every QuotationStatus gets its own word — mapping every non-draft status
    // to "Issued" would mislabel expired and superseded quotations. Both
    // languages are shown, like every other label on the printed document.
    const statusLabel = (() => {
      switch (quotation.status) {
        case "draft":
          return LABELS.draft;
        case "issued":
          return LABELS.issued;
        case "expired":
          return LABELS.expired;
        case "superseded":
          return LABELS.superseded;
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

        <div className="px-4 md:px-5 py-8 space-y-5">
          {/*
            2 — Title. Centred under the header lockup: the subject line is
            the first thing a reader looks for on a Saudi quotation, so it
            sits on the page's centre line rather than tucked into the start
            corner. `text-center` is direction-agnostic — the title stays
            centred in both EN and AR mode, and the Arabic sub-line keeps its
            own `dir="rtl"` so the letters and ligatures render correctly.
          */}
          <div className="border-b-2 border-black/80 pb-3 text-center">
            <h1 className="text-3xl font-bold tracking-tight uppercase">
              {LABELS.docTitle.en}
              <span dir="rtl" className="block text-xl font-bold tracking-normal normal-case">
                {LABELS.docTitle.ar}
              </span>
            </h1>
          </div>

          {/* 3 — Customer information ǀ Quotation details */}
          {/*
            NOTE: grid column order follows DOM order, not writing direction.
            The customer block is first in the DOM, so it renders on the LEFT in
            English and on the RIGHT in Arabic — the customer-facing side in
            both languages. Do not reorder the DOM to "fix" this.
          */}
          <div className="grid md:grid-cols-2 gap-8 -mt-2">
            {/* ---- Customer ---- */}
            <section className="border border-black/25">
              <header className="border-b border-black/25 bg-black/[0.03] px-4 py-2">
                <h2 className="flex items-center justify-between gap-4 text-sm">
                  <span dir="ltr" className="text-left">
                    Customer
                  </span>

                  <span dir="rtl" className="text-right">
                    العميل
                  </span>
                </h2>
              </header>

              <div className="px-4 py-3">
                {/*
                  The customer name is the block's anchor, not a label/value
                  row. Both languages sit on one line, matching the inline
                  labels below — a Saudi quotation goes to Arabic- and
                  English-speaking recipients alike, so the printed document
                  must not depend on the BDM's language toggle.
                */}
                {/* <p className="text-base font-bold leading-snug">
                  <span dir="rtl">{client.nameAr || client.nameEn || "—"}</span>
                  {client.nameAr && client.nameEn && client.nameAr !== client.nameEn && (
                    <span dir="ltr" className="ms-2 text-sm font-medium text-black/70">
                      {client.nameEn}
                    </span>
                  )}
                </p> */}

                {/*
                  `dir="ltr"` pins the column order to English-left / value-centre
                  / Arabic-right in BOTH language modes — the document root
                  flips to RTL in Arabic, but a table's column order follows DOM
                  order, so the table-level override wins. See `InfoRow`.
                */}
                <table className="mt-0 w-full table-fixed text-sm" dir="ltr">
                  <colgroup>
                    <col style={{ width: "24%" }} />
                    <col style={{ width: "52%" }} />
                    <col style={{ width: "24%" }} />
                  </colgroup>
                  <tbody>
                    <InfoRow
                      label={LABELS.customerName}
                      value={client.nameEn}
                      valueAr={client.nameAr}
                    />
                    <InfoRow label={LABELS.mobile} value={client.mobile} mono />
                    <InfoRow label={LABELS.building} value={client.building} />
                    <InfoRow label={LABELS.address} value={client.address} />
                    <InfoRow label={LABELS.city} value={client.city} />
                    <InfoRow label={LABELS.area} value={client.area} />
                    <InfoRow
                      label={LABELS.postalCode}
                      value={client.postalCode}
                      mono
                    />
                    <InfoRow label={LABELS.country} value={client.country} />
                    <InfoRow label={LABELS.vatRef} value={client.vatNo} mono />
                  </tbody>
                </table>
              </div>
            </section>

            {/* ---- Quotation details ---- */}
            <section className="border border-black/25">
              {/* <header className="border-b border-black/25 bg-black/[0.03] px-4 py-2">
                <h2 className="text-sm">
                  <BiInline label={LABELS.quotationHeading} />
                </h2>
              </header> */}
              <header className="border-b border-black/25 bg-black/[0.03] px-4 py-2">
                <h2 className="flex items-center justify-between gap-4 text-sm">
                  <span dir="ltr" className="text-left">
                    Quotation Details
                  </span>

                  <span dir="rtl" className="text-right">
                    تفاصيل عرض السعر
                  </span>
                </h2>
              </header>

              <div className="px-4 py-3">
                <table className="w-full table-fixed text-sm" dir="ltr">
                  <colgroup>
                    <col style={{ width: "24%" }} />
                    <col style={{ width: "52%" }} />
                    <col style={{ width: "24%" }} />
                  </colgroup>
                  <tbody>
                    <InfoRow label={LABELS.quotationNo} value={reference} mono />
                    <InfoRow
                      label={LABELS.quotationDate}
                      value={quotation.issueDate}
                      mono
                    />
                    <InfoRow
                      label={LABELS.paymentTerms}
                      value={quotation.paymentTerms?.trim() || defaultPaymentTerms}
                      valueAr={quotation.paymentTerms?.trim() ? undefined : DEFAULT_PAYMENT_TERMS_AR}
                    />
                    <InfoRow
                      label={LABELS.validity}
                      value={quotation.validUntil}
                      mono
                    />
                    <InfoRow label={LABELS.vatNo} value={SELLER_VAT_NO} mono />
                    <InfoRow
                      label={LABELS.description}
                      value={quotation.subject?.trim() || quotation.notes?.trim()}
                    />
                    <InfoRow
                      label={LABELS.preparedBy}
                      value={quotation.createdBy}
                      mono
                    />
                    <InfoRow
                      label={LABELS.status}
                      value={statusLabel.en}
                      valueAr={statusLabel.ar}
                    />
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
            <h2 className="border-b border-black/30 pb-1 mb-2">
              <BiHeading_inline label={LABELS.itemsHdr} />
            </h2>
            <table className="w-full text-[11px] table-fixed border-collapse">
              <colgroup>
                <col style={{ width: "3%" }} />
                <col style={{ width: "11%" }} />
                <col style={{ width: "16%" }} />
                <col style={{ width: "10%" }} />
                <col style={{ width: "5%" }} />
                <col style={{ width: "10%" }} />
                <col style={{ width: "6%" }} />
                <col style={{ width: "9%" }} />
                <col style={{ width: "6%" }} />
                <col style={{ width: "9%" }} />
                <col style={{ width: "15%" }} />
              </colgroup>
                <thead>
                  <tr className="border-t border-b border-black/40">
                  <th className="border-x border-black/20 text-center py-1.5 px-1.5">
                    {LABELS.itemNo.en}
                  </th>
                  <th className="border-x border-black/20 text-center py-1.5 px-1.5">
                    <BiHeading_center label={LABELS.productCode} />
                  </th>
                  <th className="border-x border-black/20 text-center py-1.5 px-1.5">
                    <BiHeading_center label={LABELS.productName} />
                  </th>
                  <th className="border-x border-black/20 text-center py-1.5 px-1.5">
                    <BiHeading_center label={LABELS.description} />
                  </th>
                  <th className="border-x border-black/20 text-center py-1.5 px-1.5">
                    <BiHeading_center label={LABELS.amount} />
                  </th>
                  <th className="border-x border-black/20 text-center py-1.5 px-1.5">
                    <BiHeading_center label={LABELS.unitPrice} />
                  </th>
                  <th className="border-x border-black/20 text-center py-1.5 px-1.5">
                    <BiHeading_center label={LABELS.discountPct} />
                  </th>
                 <th className="border-x border-black/20 text-center py-1.5 px-1.5">
                    <BiHeading_center label={LABELS.lineTotal} />
                  </th>
                 <th className="border-x border-black/20 text-center py-1.5 px-1.5">
                    <BiHeading_center label={LABELS.vatPct} />
                  </th>
                  <th className="border-x border-black/20 text-center py-1.5 px-1.5">
                    <BiHeading_center label={LABELS.vatAmount} />
                  </th>
                  <th className="border-x border-black/20 text-center py-1.5 px-1.5">
                    <BiHeading_center label={LABELS.vatTotal} />
                  </th>
                </tr>
              </thead>
              <tbody>
                {quotation.lineItems.length === 0 ? (
                  <tr>
                    <td
                      colSpan={11}
                      className="py-6 text-center text-black/50 text-xs"
                    >
                      {LABELS.noItems.en}
                      <span dir="rtl" className="block">{LABELS.noItems.ar}</span>
                    </td>
                  </tr>
                ) : (
                  quotation.lineItems.map((li, idx) => {
                    const row = lineTotals[idx];
                    return (
                      <tr key={li.id} className="border-b border-black/10">
                        {/* <td className="py-1.5 pe-1.5 text-black/60">{idx + 1}</td> */}
                        <td className="border-l border-black/20 py-1.5 px-1.5 text-center text-black/60">
                          {idx + 1}
                        </td>
                        {/* <td className="py-1.5 pe-1.5 font-mono text-[10px]"> */}
                        <td className="border-x border-black/20 py-1.5 px-1.5 font-mono text-[10px]">
                          {li.specCode || "—"}
                        </td>
                        {/* <td className="py-1.5 pe-1.5 font-medium"> */}
                        <td className="border-x border-black/20 py-1.5 px-1.5 font-medium text-[10px]">
                          {li.productName || li.name || "—"}
                        </td>
                        {/* <td className="py-1.5 pe-1.5 text-black/70"> */}
                        <td className="border-x border-black/20 py-1.5 px-1.5 font-medium text-[10px]">
                          {li.description || "—"}
                        </td>
                        {/* <td className="text-end py-1.5 px-1 font-mono"> */}
                        <td className="border-x border-black/20 py-1.5 px-1 font-mono text-end">
                          {formatNumber(li.quantity)}
                        </td>
                        {/* <td className="text-end py-1.5 px-1 font-mono"> */}
                        <td className="border-x border-black/20 py-1.5 px-1 font-mono text-end">
                          {formatNumber(li.unitPrice)}
                        </td>
                        {/* <td className="text-end py-1.5 px-1 font-mono"> */}
                        <td className="border-x border-black/20 py-1.5 px-1 font-mono text-end">
                          {discountPctLabel}
                        </td>
                        <td className="border-x border-black/20 py-1.5 px-1 font-mono text-end">
                          {formatNumber(row.gross)}
                        </td>
                        {/* <td className="text-end py-1.5 px-1 font-mono"> */}
                        <td className="border-x border-black/20 py-1.5 px-1 font-mono text-end">
                          {vatPctLabel}
                        </td>
                        {/* <td className="text-end py-1.5 px-1 font-mono"> */}
                        <td className="border-x border-black/20 py-1.5 px-1 font-mono text-end">
                          {formatNumber(row.vatAmount)}
                        </td>
                        {/* <td className="text-end py-1.5 ps-1.5 font-mono font-semibold"> */}
                        <td className="border-x border-black/20 py-1.5 px-1 font-mono text-end">
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
                <span>
                  <BiHeading_center label={LABELS.subtotal} />
                </span>
                <span className="font-mono">{SAR(totals.subtotal)}</span>
              </div>
              {totals.discountAmount > 0 && (
                <div className="flex justify-between gap-4 text-black/70">
                  <span>
                    - <BiInline label={LABELS.discount} />
                    {quotation.discountType === "percent" && quotation.discountValue > 0
                      ? ` (${quotation.discountValue}%)`
                      : ""}
                  </span>
                  <span className="font-mono">{SAR(totals.discountAmount)}</span>
                </div>
              )}
              <div className="flex justify-between gap-4">
                <span>
                  <BiHeading_center label={LABELS.vat} />
                </span>
                <span className="font-mono">{SAR(totals.vatAmount)}</span>
              </div>
              <div className="flex justify-between gap-4 border-t-2 border-black/70 pt-2 mt-2 text-base font-bold">
                <span>
                  <BiHeading_center label={LABELS.total} />
                </span>
                <span className="font-mono">{SAR(totals.total)}</span>
              </div>
            </div>
          </div>

          {/*
            6 — Terms & Conditions.

            Two columns: English on the left, Arabic on the right. The five
            standing clauses (Transportation, Sampling, Disposing, OOS,
            Outsource) are the whole block — there is no boilerplate paragraph
            above them.

            The clauses are separated by rules so each one reads as its own
            item rather than running together as a wall of text.
          */}
          <div className="pt-4 border-t border-black/20">
            <h2 className="border-b border-black/30 pb-1 mb-2">
              <BiHeading_inline label={LABELS.terms} />
            </h2>

            <div className="grid md:grid-cols-2 gap-8">
              {/* ---- English ---- */}
              <div>
                {QUOTATION_TERM_CLAUSES.map((clause, idx) => (
                  <div
                    key={clause.titleEn}
                    className={
                      idx > 0 ? "border-t border-black/15 pt-2 mt-2" : undefined
                    }
                  >
                    <p dir="ltr" className="text-xs font-semibold">
                      {idx + 1}. {clause.titleEn}
                    </p>
                    <p dir="ltr" className="text-xs leading-relaxed">
                      {clause.bodyEn}
                    </p>
                  </div>
                ))}
              </div>

              {/* ---- Arabic ---- */}
              <div>
                {QUOTATION_TERM_CLAUSES.map((clause, idx) => (
                  <div
                    key={clause.titleAr}
                    className={
                      idx > 0 ? "border-t border-black/15 pt-2 mt-2" : undefined
                    }
                  >
                    <p dir="rtl" className="text-xs font-semibold text-start">
                      {idx + 1}. {clause.titleAr}
                    </p>
                    <p dir="rtl" className="text-xs leading-relaxed text-start">
                      {clause.bodyAr}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 7 — Signature */}
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 pt-6">
            <div className="h-24 w-24 border border-dashed border-black/40 flex items-center justify-center text-[10px] text-black/40 text-center px-2">
              <BiInline label={LABELS.authorizedSig} />
            </div>
            <div className="text-start sm:text-end">
              <div className="w-56 border-t border-black/60 pt-1">
                <p className="text-xs font-semibold">
                  <BiInline label={LABELS.authorizedSig} />
                </p>
                <p className="text-xs text-black/60">
                  <BiInline label={LABELS.authorizedSigName} />
                </p>
              </div>
            </div>
          </div>

          {/* 8 — Footer */}
          <div className="text-center text-[10px] text-black/60 border-t border-black/20 pt-3">
            <span dir="ltr" className="block">{LABELS.footerCr.en}</span>
            <span dir="rtl" className="block">{LABELS.footerCr.ar}</span>
          </div>
        </div>
      </div>
    );
  },
);

/**
 * A column header carrying BOTH languages: Arabic on the first line, English
 * on the second.
 *
 * Each line gets its own `dir` so the Arabic word renders in its natural
 * right-to-left shape regardless of the document's writing direction — mixing
 * an Arabic run into an LTR paragraph reverses the word's letters and breaks
 * the ligatures. The block itself stays aligned to the column's text-align, so
 * a right-aligned numeric column has both of its lines right-aligned.
 */
function BiHeader({ label }: { label: Label }) {
  return (
    <span className="block leading-tight">
      <span dir="rtl" className="block font-semibold">
        {label.ar}
      </span>
      <span dir="ltr" className="block text-[9px] font-normal uppercase tracking-wide text-black/55">
        {label.en}
      </span>
    </span>
  );
}

/**
 * One field row inside a customer- or quotation-info table.
 *
 * Three cells, reading across the row:
 *
 *     English label  │  Value (centred)  │  Arabic label
 *
 * Each label carries its own closing colon; the value carries none — the
 * punctuation belongs to the labels, not to the value.
 *
 * The English label is the more prominent of the two (11px semibold, black);
 * the Arabic label is present but secondary (10px semibold, 70% black) so the
 * two don't compete.
 *
 * The English label is pinned to the *left* in both language modes — a printed
 * Saudi form must not flip with the app's language toggle. That is enforced by
 * `dir="ltr"` on the parent `<table>`: a table's column order follows DOM
 * order, not writing direction, so the table-level override wins over the
 * document root's `dir="rtl"`. Each cell still declares its own `dir` so the
 * Arabic word keeps its natural letter order and ligatures.
 *
 * Renders nothing when the value is empty — the two blocks have different field
 * sets, so an empty row would leave a dangling label and a gap in the grid.
 */
function InfoRow({
  label,
  value,
  valueAr,
  mono = false,
}: {
  label: Label;
  value?: string | null;
  /**
   * Arabic counterpart of `value`, shown as a second line under the value when
   * the value has a built-in Arabic form (payment terms, status). Free-text
   * values have no Arabic equivalent, so this stays undefined for them.
   */
  valueAr?: string;
  /** Render the value in the monospace face (VAT no., dates, refs). */
  mono?: boolean;
}) {
  if (!value || !value.trim()) return null;
  return (
    <tr>
      {/*
        English label + its closing colon. The colon is `font-normal` so it
        reads as punctuation rather than as part of the bold label.
      */}
      <th
        scope="row"
        dir="ltr"
        className="align-top py-1 pe-2 text-start text-[11px] font-semibold whitespace-nowrap"
      >
        {label.en}
        <span className="font-normal">:</span>
      </th>

      {/*
        The value, centred. No colon here — the punctuation belongs to the
        labels, not to the value.
      */}
      <td
        className={`align-top py-1 text-center text-[13px] leading-snug ${
          mono ? "font-mono" : "font-medium"
        }`}
      >
        {value}
        {valueAr && (
          <span dir="rtl" className="block text-[11px] font-normal text-black/70">
            {valueAr}
          </span>
        )}
      </td>

      {/*
        Arabic label, right-indented within its own column, closed by its own
        colon.

        The CELL is `dir="ltr"` so `text-right` resolves against the column's
        box — that is what pushes the word to the column's right edge. The
        INNER span is `dir="rtl"` so the Arabic keeps its natural letter order
        and ligatures. The two are independent; flipping only the cell would
        reverse the Arabic, and flipping only the span would leave the word
        hugging the column's left edge.
      */}
      <th
        scope="row"
        dir="ltr"
        className="align-top py-1 ps-2 text-right text-[10px] font-semibold text-black/70"
      >
        <span dir="rtl">{label.ar}</span>
        <span className="font-normal">:</span>
      </th>
    </tr>
  );
}

/**
 * A bilingual label rendered inline — Arabic and English side by side on one
 * line. Used where a two-line stacked block would be too tall or would break
 * the value alignment (the customer / quotation-details rows, the Totals
 * rows, the signature block).
 *
 * The Arabic and English are separate `dir` runs so each keeps its natural
 * letter order, and a literal separator sits between them rather than a
 * margin — a margin would land on the wrong side once the parent flips to
 * RTL.
 */
function BiInline({ label }: { label: Label }) {
  return (
    <span className="inline-block leading-tight">
      <span dir="rtl" className="font-semibold">
        {label.ar}
      </span>
      <span dir="ltr" className="text-[9px] font-normal uppercase tracking-wide text-black/55 ms-1">
        {label.en}
      </span>
    </span>
  );
}

/**
 * A bilingual section heading — Arabic on top, English below, with a rule
 * under both.
 */
function BiHeading({ label }: { label: Label }) {
  return (
    <span className="block leading-tight">
      <span dir="rtl" className="block text-[11px] font-bold">
        {label.ar}
      </span>
      <span dir="ltr" className="block text-[9px] font-semibold uppercase tracking-wide text-black/55">
        {label.en}
      </span>
    </span>
  );
}
function BiHeading_center({ label }: { label: Label }) {
  return (
    <span className="block text-center leading-tight">
      <span dir="rtl" className="block text-center text-[11px] font-bold">
        {label.ar}
      </span>
      <span
        dir="ltr"
        className="block text-center text-[9px] font-semibold uppercase tracking-wide text-black/55"
      >
        {label.en}
      </span>
    </span>
  );
}

function BiHeading_inline({ label }: { label: Label }) {
  return (
    <span className="flex w-full items-center justify-between gap-2 leading-tight">
      <span
        dir="ltr"
        className="text-left text-[9px] font-semibold uppercase tracking-wide text-black/55"
      >
        {label.en}
      </span>
      <span
        dir="rtl"
        className="text-right text-[11px] font-bold"
      >
        {label.ar}
      </span>
    </span>
  );
}
