/**
 * Render of a Quotation — used inside the wizard's preview step, the detail
 * page, and as the printable / PDF region.
 *
 * The layout follows the Green Lab quotation template:
 *
 *   header lockups → title + number → customer ǀ quotation details
 *   → items table → totals → approval & lab stamp → terms & conditions
 *   → client requirements → footer
 *
 * The document is paginated DYNAMICALLY. The body is a list of measurable
 * sections; after layout we measure each one and assign it to a page. A
 * section that does not fit in the remaining space moves WHOLE to the next
 * page — it is never cut in half. The masthead appears on the first page
 * only; the footer (accreditation line + "Page N of M") appears on every
 * page, so no sheet is left without the lab's details.
 *
 * Each page is wrapped in a `data-pdf-page` element, so the PDF builder
 * gives it exactly one A4 sheet. Because the SAME wrappers drive the screen
 * preview, the browser print and the PDF capture, the three are identical by
 * construction.
 *
 * The customer and quotation blocks are `table-fixed` tables with a fixed
 * label column, so both value columns start at the same offset — that is what
 * keeps the two blocks aligned once html2canvas rasterises them into the PDF.
 *
 * The wrapping div carries a `data-printable` attribute so the page-level
 * `no-print` CSS can target everything except this node at print time.
 *
 * The component is READ-ONLY by default. The wizard's preview step passes
 * `editable` + `onChange` so the BDM can set the last few fields directly on
 * the document — the value sits exactly where it prints, so what they see is
 * what the client receives. The detail page passes neither and stays a plain
 * rendering of an issued quotation.
 */

import {
  forwardRef,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useAppContext } from "@/presentation/providers/AppContext";
import {
  SAR,
  addDays,
  computeLineTotals,
  computeTotals,
  formatNumber,
  VAT_RATE,
  SELLER_VAT_NO,
  SELLER_BANK_NAME,
  SELLER_IBAN,
  PAYMENT_INSTRUCTIONS_EN,
  PAYMENT_INSTRUCTIONS_AR,
  DEFAULT_PAYMENT_TERMS_AR,
  DEFAULT_PAYMENT_TERMS_EN,
  DEFAULT_VALIDITY_DAYS,
  QUOTATION_TERM_CLAUSES,
} from "@/infrastructure/domain-support/quotation-utils";
import type { Quotation } from "@/infrastructure/mock/data/quotations";
import { mockBdms } from "@/infrastructure/mock/data";
import type { PdfSection } from "@/shared/lib/pdf-report";

interface QuotationPreviewProps {
  quotation: Quotation;
  /**
   * Receives the next quotation whenever an editable field changes. Omitted on
   * the issued-quotation detail page, which leaves the component read-only.
   */
  onChange?: (next: Quotation) => void;
  /**
   * Turns the document's editable fields into live controls. Separate from
   * `onChange` so the wizard's save step can render the finished document
   * read-only while the preview step renders it editable — both use identical
   * markup, so the preview is a faithful preview of the printout.
   */
  editable?: boolean;
}

type Label = { en: string; ar: string };

/**
 * Collect the document's page sections for the PDF builder.
 *
 * The pages are marked with `data-pdf-page` in the markup, so the caller can
 * find them without the component having to hand out a second set of refs.
 * `buildAndDownloadPdf` takes one section per PDF page, so each marked node
 * becomes exactly one A4 sheet.
 */
export function quotationPageSections(
  root: HTMLElement | null,
): PdfSection[] {
  if (!root) return [];
  const nodes = Array.from(root.querySelectorAll<HTMLDivElement>("[data-pdf-page]"));
  return nodes.map((node, i) => ({
    label: `Quotation page ${i + 1}`,
    ref: { current: node },
  }));
}

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
  docTitle:          { en: "Price Quotation",                 ar: "عرض سعر" } as Label,
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
  approvedBy:        { en: "Approved by",              ar: "اعتمده" } as Label,
  bdmPosition:       { en: "Business Development Manager", ar: "مدير تجاري" } as Label,
  labStamp:          { en: "Green Lab stamp",          ar: "ختم جرين لاب" } as Label,
  paymentInstructions: { en: "Payment Instructions",     ar: "تعليمات السداد" } as Label,
  bankDetails:         { en: "Bank Details",             ar: "بيانات البنك" } as Label,
  authorizedSig:     { en: "Authorized signature",      ar: "التوقيع المعتمد" } as Label,
  authorizedSigName: { en: "Authorized signature name", ar: "اسم الموقّع" } as Label,
  footerCr:          { en: "Tax No. 300012345600003 — GreenLab • www.greenlab.com.sa", ar: "الرقم الضريبي ٣٠٠٠١٢٣٤٥٦٠٠٠٠٣ — جرين لاب • www.greenlab.com.sa" } as Label,
} as const;

/* ===========================================================================
 * Dynamic pagination
 *
 * The document's page count is NOT fixed. It is derived from the measured
 * height of each body section:
 *
 *   1. RENDER   — every section is laid out once, inside a hidden measuring
 *                 column, so the browser can tell us how tall it is.
 *   2. MEASURE — read each section's `offsetHeight`.
 *   3. ASSIGN  — greedily fill pages: a section that fits in the remaining
 *                 space joins the current page, otherwise it starts the next
 *                 one WHOLE (it is never split).
 *   4. RENDER  — the real pages are rendered from that assignment.
 *
 * The measuring pass and the real render share the SAME markup, so a
 * measurement is the true height of the section as it will print.
 * =========================================================================== */

/**
 * The height of an A4 portrait sheet, in CSS px at 96dpi.
 *
 * 297mm at 96dpi = 1122px. The page budget is derived from this and the
 * measured footer/body padding, so nothing about the sheet is hard-coded
 * twice.
 */
const A4_HEIGHT_PX = 1122;

/**
 * The body sections, in document order. The key is what identifies a section
 * in the page assignment and in the DOM (`data-section-key`).
 */
const SECTION_KEYS = [
  "title",
  "customer",
  "items",
  "payment",
  "approval",
  "terms",
  "requirements",
] as const;

type SectionKey = (typeof SECTION_KEYS)[number];

/** One page's worth of the assignment. */
interface PageAssignment {
  /** The sections that land on this page, in order. */
  sections: SectionKey[];
  /** True when a single section was too tall for one page on its own. */
  oversized: boolean;
}

/**
 * Assign the measured sections to pages.
 *
 * Greedy and deliberately simple: a section joins the current page when it
 * fits, otherwise it starts a fresh page. A section taller than a whole page
 * is never split — it gets a page to itself and that page is flagged
 * `oversized`, so the PDF builder scales it down to fit instead of cutting it.
 *
 * @param heights   Each section's measured height, gap included.
 * @param contentPx The room the sections have on a page, in CSS px.
 * @param headerPx  The masthead's height — it eats into the FIRST page only.
 */
function assignPages(
  heights: Record<SectionKey, number>,
  contentPx: number,
  headerPx: number,
): PageAssignment[] {
  const pages: PageAssignment[] = [];
  let current: PageAssignment = { sections: [], oversized: false };
  let used = 0;

  for (const key of SECTION_KEYS) {
    const h = heights[key] ?? 0;
    // Page 1 carries the masthead, so it has less room for the body.
    const budget = pages.length === 0 ? contentPx - headerPx : contentPx;

    if (current.sections.length === 0) {
      // First section on a fresh page — it goes here regardless of its height.
      current.sections.push(key);
      current.oversized = h > budget;
      used = h;
      continue;
    }

    if (used + h <= budget) {
      current.sections.push(key);
      used += h;
    } else {
      pages.push(current);
      // The next section starts a fresh page, which has the FULL budget.
      current = { sections: [key], oversized: h > contentPx };
      used = h;
    }
  }

  pages.push(current);
  return pages;
}

/** Are two assignments the same? Compared by section keys + the oversized flag. */
function sameAssignment(
  a: PageAssignment[],
  b: PageAssignment[],
): boolean {
  if (a.length !== b.length) return false;
  return a.every((page, i) =>
    page.sections.length === b[i].sections.length &&
    page.sections.every((key, j) => key === b[i].sections[j]) &&
    page.oversized === b[i].oversized,
  );
}

export const QuotationPreview = forwardRef<HTMLDivElement, QuotationPreviewProps>(
  function QuotationPreview({ quotation, onChange, editable = false }, ref) {
    const { language } = useAppContext();
    const isRtl = language === "ar";

    // Editing is on only when the parent supplied a handler — the detail page
    // renders the same component without one and must stay a plain document.
    const canEdit = editable && !!onChange;

    /**
     * Applies a patch to the quotation and hands the result up. No-ops when
     * the document is read-only, so the editable controls can be rendered
     * unconditionally and simply do nothing in print-only contexts.
     */
    const patch = (changes: Partial<Quotation>) => {
      if (!canEdit || !onChange) return;
      onChange({ ...quotation, ...changes });
    };

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

    // ---- Editable fields -------------------------------------------------
    // Validity is stored as a DATE on the quotation; the BDM edits it as a
    // number of DAYS, so the day count is derived from the date pair and the
    // write-back converts days back into a date. No extra field is stored.
    const validityDays = Math.max(
      1,
      Math.round(
        (new Date(quotation.validUntil).getTime() -
          new Date(quotation.issueDate).getTime()) /
          (24 * 60 * 60 * 1000),
      ),
    ) || DEFAULT_VALIDITY_DAYS;

    const setValidityDays = (days: number) => {
      const safe = Math.max(1, Math.min(3650, Math.round(days) || 1));
      patch({ validUntil: addDays(quotation.issueDate, safe) });
    };

    const setPaymentTerms = (value: string) => patch({ paymentTerms: value });

    /* ---------------------------------------------------------------------
     * Pagination
     *
     * The page assignment is state, computed from the measured heights of
     * the body sections. The measuring pass renders the sections once, off
     * the page flow, so the browser lays them out and we can read their
     * heights; the real pages are then rendered from the assignment.
     * ------------------------------------------------------------------- */
    const measureRef = useRef<HTMLDivElement>(null);
    const [pages, setPages] = useState<PageAssignment[]>(() =>
      assignPages({} as Record<SectionKey, number>, A4_HEIGHT_PX, 0),
    );

    /**
     * Measure the sections and recompute the page assignment.
     *
     * Runs after layout, so `offsetHeight` is the real rendered height of
     * the printable section — including the editable controls, whose chrome
     * is stripped so the measured height equals the printed height.
     */
    useLayoutEffect(() => {
      const host = measureRef.current;
      if (!host) return;

      // The measuring copy holds the same editable controls as the real
      // document, so it must be out of the tab order and the accessibility
      // tree. React 18's types don't know `inert`, but the DOM does — and
      // `inert` also suppresses the controls' focus, which is what we want.
      host.setAttribute("inert", "");

      const heights = {} as Record<SectionKey, number>;
      const els = SECTION_KEYS.map((key) =>
        host.querySelector<HTMLElement>(`[data-section-key="${key}"]`),
      );

      /*
        Measure each section's height INCLUDING the gap that precedes it.

        The body is laid out with `space-y-5`, so the gap between two
        sections is not part of either section's `offsetHeight` — it is
        margin on the second one. Measuring the distance from one
        section's top to the next one's top captures the gap exactly, with
        no hard-coded value to drift out of sync with the stylesheet.

        The FIRST section carries the gap too (`space-y-5` applies to every
        child, not just the ones after the first), and it sits below the
        body's own top padding, so its gap is measured the same way.
      */
      for (let i = 0; i < SECTION_KEYS.length; i++) {
        const el = els[i];
        if (!el) {
          heights[SECTION_KEYS[i]] = 0;
          continue;
        }
        const next = els[i + 1];
        const h = next
          ? next.getBoundingClientRect().top - el.getBoundingClientRect().top
          : el.offsetHeight;
        heights[SECTION_KEYS[i]] = h;
      }

      /*
        The page budget, derived from the real DOM rather than guessed:

          A4 height (1122px)
            − the body's own vertical padding (read off the body element)
            − the footer's real height (read off the footer probe)
            = the room the sections get.

        The masthead is subtracted from the FIRST page only, and its height
        is read off the masthead probe — so a taller logo or a wider footer
        string both move the pages correctly without a code change.
      */
      const bodyEl = host.querySelector<HTMLElement>("[data-measure-body]")!;
      const footerEl = host.querySelector<HTMLElement>("[data-measure-footer]")!;
      const headerEl = host.querySelector<HTMLElement>("[data-measure-header]")!;

      const bodyStyle = getComputedStyle(bodyEl);
      const bodyPad =
        parseFloat(bodyStyle.paddingTop) + parseFloat(bodyStyle.paddingBottom);

      const footerH = footerEl.offsetHeight;
      const headerH = headerEl.offsetHeight;

      const contentPx = Math.max(200, A4_HEIGHT_PX - bodyPad - footerH);

      const next = assignPages(heights, contentPx, headerH);
      // Only set state when the assignment actually changed — otherwise the
      // effect would re-run forever (measure → setState → re-measure).
      setPages((prev) => (sameAssignment(prev, next) ? prev : next));
    }, [
      quotation.lineItems.length,
      quotation.clientSnapshot,
      quotation.terms,
      quotation.paymentTerms,
      quotation.approvedBy,
      quotation.discountValue,
      quotation.discountType,
      quotation.vatRate,
      quotation.issueDate,
      quotation.validUntil,
      quotation.createdBy,
      isRtl,
    ]);

    /*
      1 — Business-card lockups: logo on the start side, company text on the
      end. Rendered on the FIRST page only, and measured by the paginator so
      a change to the lockup's height moves the pages correctly.
    */
    const renderMasthead = () => (
      <div className="flex items-center gap-6 border-b border-black/20 px-4 py-4 md:px-5">
        <img
          src="/images/GL LOGO_Business Card 1.svg"
          alt="GreenLab"
          crossOrigin="anonymous"
          className="h-16 w-auto shrink-0"
        />

        <div className="flex min-w-0 flex-1 justify-end">
          <img
            src="/images/TEXT_Business Card 1.svg"
            alt="GreenLab — Food, Drug, Beauty laboratory services"
            crossOrigin="anonymous"
            className="h-auto max-h-16 w-full object-contain object-right"
          />
        </div>
      </div>
    );

    /*
      9 — Footer.

      Rendered on EVERY page, not just the last one: a sheet without the
      lab's accreditation line and contact details is not a valid standalone
      page. The page number is dynamic so the design stays truthful.
    */
    const renderFooter = (pageNumber: number, total: number) => (
      <div className="w-full border-t border-black/70 pt-2 text-black">
        {/* Row 1: Certification and page number */}
        <div className="flex items-center justify-between gap-4 px-3 text-[11px] font-bold leading-tight">
          <span dir="ltr" className="truncate text-left">
            ISO/IEC 17025:2017: Quality Management System
          </span>

          <span className="shrink-0 text-center">
            Page {pageNumber} of {total}
          </span>
        </div>

        {/* Divider */}
        <div className="mt-1 border-t border-black/70" />

        {/* Row 2: Contact information */}
        <div className="flex items-center justify-between gap-4 px-1 pt-1 text-[11px] font-bold leading-tight">
          <span dir="ltr" className="whitespace-nowrap">
            29, New Industrial Area, Riyadh 14334 Saudi Arabia
          </span>

          <span dir="ltr" className="whitespace-nowrap">
            +966 (11) 257 9379
          </span>

          <span dir="ltr" className="whitespace-nowrap">
            bdm@greenlab.com.sa
          </span>

          <span dir="ltr" className="whitespace-nowrap">
            www.greenlab.com.sa
          </span>
        </div>
      </div>
    );

    /**
     * The body section for a key. The JSX is unchanged from the original
     * document — only its location moved, from a flat list inside one page
     * to a per-section node the paginator can measure and place.
     */
    const renderSection = (key: SectionKey): ReactNode => {
      switch (key) {
        /* ---------------------------------------------------------------
          2 — Title. Centred under the header lockup: the subject line is
          the first thing a reader looks for on a Saudi quotation, so it
          sits on the page's centre line rather than tucked into the start
          corner. `text-center` is direction-agnostic — the title stays
          centred in both EN and AR mode, and the Arabic sub-line keeps its
          own `dir="rtl"` so the letters and ligatures render correctly.
         * --------------------------------------------------------------- */
        case "title":
          return (
            <div className="border-b-2 border-black/80 pb-3 text-center">
              <h1 className="flex items-center justify-center gap-2 text-xl font-bold tracking-tight">
                <span dir="ltr" className="uppercase">
                  {LABELS.docTitle.en}
                </span>

                <span>-</span>

                <span dir="rtl" className="normal-case tracking-normal">
                  {LABELS.docTitle.ar}
                </span>
              </h1>
            </div>
          );

        /* ---------------------------------------------------------------
          3 — Customer information ǀ Quotation details

          NOTE: grid column order follows DOM order, not writing direction.
          The customer block is first in the DOM, so it renders on the LEFT in
          English and on the RIGHT in Arabic — the customer-facing side in
          both languages. Do not reorder the DOM to "fix" this.
         * --------------------------------------------------------------- */
        case "customer":
          return (
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
                    The customer name is the block's anchor — it sits above the
                    table as a prominent line, not as one label/value row among
                    the rest. Both languages appear, because a Saudi quotation
                    goes to Arabic- and English-speaking recipients alike and
                    the printed document must not depend on the BDM's language
                    toggle.
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
                    {/*
                      Every client field always renders, with an em-dash where
                      the value is blank. A client record with, say, no building
                      recorded must still show the "Building" line — otherwise the
                      client sees fields missing from the quotation and assumes
                      the lab left them out.
                    */}
                    <tbody>
                      <InfoRow
                        label={LABELS.customerName}
                        value={client.nameEn}
                        valueAr={client.nameAr}
                        alwaysShow
                      />
                      <InfoRow label={LABELS.mobile} value={client.mobile} mono alwaysShow />
                      <InfoRow label={LABELS.building} value={client.building} alwaysShow />
                      <InfoRow label={LABELS.address} value={client.address} alwaysShow />
                      <InfoRow label={LABELS.city} value={client.city} alwaysShow />
                      <InfoRow label={LABELS.area} value={client.area} alwaysShow />
                      <InfoRow
                        label={LABELS.postalCode}
                        value={client.postalCode}
                        mono
                        alwaysShow
                      />
                      <InfoRow label={LABELS.country} value={client.country} alwaysShow />
                      <InfoRow label={LABELS.vatRef} value={client.vatNo} mono alwaysShow />
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

                      {/*
                        Payment terms — editable on the document. The fallback to
                        the module default only applies while the field is empty
                        and the document is read-only; once the BDM types, their
                        text is what prints.
                      */}
                      <InfoRow
                        label={LABELS.paymentTerms}
                        value={quotation.paymentTerms?.trim() || defaultPaymentTerms}
                        valueAr={quotation.paymentTerms?.trim() ? undefined : DEFAULT_PAYMENT_TERMS_AR}
                        render={
                          <EditableValue
                            value={quotation.paymentTerms ?? ""}
                            onChange={setPaymentTerms}
                            editable={canEdit}
                            ariaLabel={LABELS.paymentTerms.en}
                          />
                        }
                      />

                      {/*
                        Validity — the document prints the date it is valid
                        UNTIL. The field the BDM edits is the day count, so the
                        editable control IS the day count and the date is what
                        the read-only document shows. One row, one value — the
                        row carries no extra element.
                      */}
                      <InfoRow
                        label={LABELS.validity}
                        value={quotation.validUntil}
                        mono
                        render={
                          <EditableValue
                            type="number"
                            value={String(validityDays)}
                            readOnlyValue={quotation.validUntil}
                            onChange={(v) => setValidityDays(Number(v))}
                            editable={canEdit}
                            ariaLabel={LABELS.validity.en}
                            mono
                            min={1}
                            max={3650}
                            className="w-12 text-center"
                          />
                        }
                      />

                      <InfoRow label={LABELS.vatNo} value={SELLER_VAT_NO} mono />

                      <InfoRow
                        label={LABELS.preparedBy}
                        value={quotation.createdBy}
                        mono
                      />
                    </tbody>
                  </table>
                </div>
              </section>
            </div>
          );

        /* ---------------------------------------------------------------
          4 — Line items table

          `table-fixed` + a percentage <colgroup> makes the declared widths
          authoritative, so every column lands on exactly the same boundary on
          every row and every page — which is what "aligned with the page
          size" needs. Percentages let the table scale between the wizard's
          `max-w-6xl` and the detail page's `max-w-4xl` container while the
          proportions stay identical.
         * --------------------------------------------------------------- */
        case "items":
          return (
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
          );

        /* ---------------------------------------------------------------
          5 — Payment instructions & bank details ǀ Totals.

          Two columns on one row: the payment instructions and bank details
          fill the left side, the Totals stay on the right.

          Grid column order follows DOM order, not writing direction — the
          payment block is first in the DOM, so it renders on the LEFT in
          English and on the RIGHT in Arabic. The Totals follow it.
         * --------------------------------------------------------------- */
        case "payment":
          return (
            <div className="grid grid-cols-1 items-start gap-4 md:grid-cols-[3fr_2fr]">
              {/* ---- Payment instructions & bank details ---- */}
              <div className="min-w-0 border border-black/25 p-4">
                <h3 className="mb-2 border-b border-black/30 pb-1">
                  <BiHeading_inline label={LABELS.paymentInstructions} />
                </h3>

                <BiRow
                  className="text-xs leading-relaxed"
                  en={
                    <p dir="ltr" className="text-start">
                      {PAYMENT_INSTRUCTIONS_EN}
                    </p>
                  }
                  ar={
                    <p dir="rtl"  className="m-0 w-full text-right leading-relaxed"
                      style={{
                        paddingRight: 0,
                        paddingLeft: 0,
                        textIndent: 0,
                        marginRight: 0,
                        marginLeft: 0,
                      }}>
                      {PAYMENT_INSTRUCTIONS_AR}
                    </p>
                  }
                />

                <h3 className="mb-2 mt-4 border-b border-black/30 pb-1">
                  <BiHeading_inline label={LABELS.bankDetails} />
                </h3>

                <p dir="ltr" className="text-center text-xs leading-relaxed">
                  <span className="font-semibold">{SELLER_BANK_NAME}</span>
                  <span className="block font-mono text-[20px]">{SELLER_IBAN}</span>
                </p>
              </div>

              {/* ---- Totals ---- */}
              <div className="w-full min-w-0 text-sm">
                <table className="w-full table-fixed border-collapse border border-black/25">
                  <colgroup>
                    <col style={{ width: "60%" }} />
                    <col style={{ width: "40%" }} />
                  </colgroup>

                  <tbody>
                    <tr>
                      <td className="border border-black/25 px-3 py-2">
                        <BiHeading_center label={LABELS.subtotal} />
                      </td>
                      <td className="border border-black/25 px-3 py-2 text-end font-mono">
                        {SAR(totals.subtotal)}
                      </td>
                    </tr>

                    {totals.discountAmount > 0 && (
                      <tr>
                        <td className="border border-black/25 px-3 py-2 text-black/70">
                          <BiInline label={LABELS.discount} />
                          {quotation.discountType === "percent" &&
                          quotation.discountValue > 0
                            ? ` (${quotation.discountValue}%)`
                            : ""}
                        </td>
                        <td className="border border-black/25 px-3 py-2 text-end font-mono text-black/70">
                          - {SAR(totals.discountAmount)}
                        </td>
                      </tr>
                    )}

                    <tr>
                      <td className="border border-black/25 px-3 py-2">
                        <BiHeading_center label={LABELS.vat} />
                      </td>
                      <td className="border border-black/25 px-3 py-2 text-end font-mono">
                        {SAR(totals.vatAmount)}
                      </td>
                    </tr>

                    <tr className="bg-black/[0.04] font-bold">
                      <td className="border border-black/40 px-3 py-2">
                        <BiHeading_center label={LABELS.total} />
                      </td>
                      <td className="border border-black/40 px-3 py-2 text-end font-mono text-base">
                        {SAR(totals.total)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          );

        /* ---------------------------------------------------------------
          6 — Approval & lab stamp.

          The stamp sits on the LEFT and the approval on the RIGHT, and
          that ordering is fixed regardless of the app's language. The
          container is direction-pinned with `dir="ltr"` because the
          document root flips to `dir="rtl"` in Arabic — without the pin,
          flexbox would put the first DOM child (the stamp) on the RIGHT
          in Arabic and the layout would mirror itself.
         * --------------------------------------------------------------- */
        case "approval":
          return (
            <div
              dir="ltr"
              className="flex items-start justify-between gap-8 pt-4 border-t border-black/20"
            >
              {/* ---- Left: the Green Lab stamp ---- */}
              {/*
                The stamp sits on a plain white block so it reads as part of the
                page rather than as a transparent PNG floating over the
                document's own background. No shadow and no rounding — the block
                is the paper, not a card.
              */}
              <div className="shrink-0 bg-white p-2">
                <img
                  src="/branding/stamp-greenlab.svg"
                  alt={LABELS.labStamp.en}
                  className="h-40 w-40 object-contain"
                />
              </div>

              {/* ---- Right: who approved it ---- */}
              <div className="text-end">
                <h1 className="border-b border-black/30 pb-1 mb-3 text-base font-bold">
                  <BiHeading_center label={LABELS.approvedBy} />
                </h1>
                <ApproverSelect
                  value={quotation.approvedBy ?? ""}
                  onChange={(v) => patch({ approvedBy: v || undefined })}
                  editable={canEdit}
                />
              </div>
            </div>
          );

        /* ---------------------------------------------------------------
          7 — Terms & Conditions.

          The block has two parts: an editable boilerplate paragraph that is
          specific to this quotation, and the five standing clauses
          (Transportation, Sampling, Disposing, OOS, Outsource) that every
          Green Lab quotation carries unchanged.

          The clauses are separated by rules so each one reads as its own
          item rather than running together as a wall of text.
         * --------------------------------------------------------------- */
        case "terms":
          return (
            <div className="pt-4 border-t border-black/20">
              <h2 className="border-b border-black/30 pb-1 mb-2">
                <BiHeading_inline label={LABELS.terms} />
              </h2>

              {/*
                7a — The per-quotation boilerplate paragraph, editable.

                Full width, sitting above the clause grid. It is a
                `contentEditable` div rather than a `<textarea>` — html2canvas
                draws a textarea's value as a single clipped line, while a
                contentEditable div renders as ordinary text and wraps
                correctly in the PDF raster.
              */}
              {/* <EditableText
                value={quotation.terms ?? ""}
                onChange={setTerms}
                editable={canEdit}
                ariaLabel={LABELS.terms.en}
                className="text-xs leading-relaxed"
              /> */}

              {/* 7b — the five standing clauses */}
              <div className="mt-4 w-full border-t border-l border-black/25">
                {QUOTATION_TERM_CLAUSES.map((clause, idx) => (
                  <div
                    key={clause.titleEn}
                    className="grid grid-cols-2 border-b border-r border-black/25"
                  >
                    {/* English — left column */}
                    <div dir="ltr" className="border-r border-black/25 px-3 py-2">
                      <p className="text-xs font-semibold">
                        {idx + 1}. {clause.titleEn}
                      </p>
                      <p className="mt-1 text-xs leading-relaxed">
                        {clause.bodyEn}
                      </p>
                    </div>

                    {/* Arabic — right column */}
                    <div dir="rtl" lang="ar" className="px-3 py-2 text-right">
                      <p className="text-xs font-semibold">
                        {idx + 1}. {clause.titleAr}
                      </p>
                      <p className="mt-1 text-xs leading-relaxed">
                        {clause.bodyAr}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );

        /* ---------------------------------------------------------------
          8 — Customer Requirements
         * --------------------------------------------------------------- */
        case "requirements":
          return (
            <div className="mt-4 w-full border border-black/30">
              {/* Centered bilingual heading */}
              <div className="border-b border-black/30 bg-black/[0.04] px-3 py-3 text-center">
                <h3 className="flex flex-wrap items-center justify-center gap-2 text-sm font-bold">
                  <span dir="ltr">Client Requirements</span>
                  <span className="text-black/50">-</span>
                  <span dir="rtl" lang="ar">متطلبات العميل</span>
                </h3>

                <div className="mt-1 flex flex-wrap items-center justify-center gap-2 text-xs text-black/70">
                  <span dir="ltr">
                    The customer must provide the requirements listed below.
                  </span>
                  <span>-</span>
                  <span dir="rtl" lang="ar">
                    يجب على العميل توفير المتطلبات المذكورة أدناه.
                  </span>
                </div>
              </div>

              {/* Writing area with horizontal lines */}
              <div className="px-3 py-2">
                {Array.from({ length: 5 }, (_, idx) => (
                  <div
                    key={idx}
                    className="h-8 border-b border-dotted border-black/30"
                  />
                ))}
              </div>
            </div>
          );
      }
    };

    return (
      <div
        ref={ref}
        data-printable
        dir={isRtl ? "rtl" : "ltr"}
        style={{ backgroundColor: "#ffffff", color: "#000000" }}
        className="w-full overflow-hidden"
      >
        {/*
          ---- The measuring pass ----
          The body sections are rendered once, off the page flow, purely so
          the browser can lay them out and we can read their heights. The
          masthead, the body and the footer are probed alongside them, so
          the page budget comes from the real DOM rather than a guess.

          It is `inert` and `no-print`: off the tab order, out of the
          accessibility tree, and never on the paper. The PDF builder only
          captures `[data-pdf-page]` nodes, so it is not in the PDF either.
        */}
        <div
          ref={measureRef}
          aria-hidden="true"
          className="no-print pointer-events-none absolute -left-[9999px] top-0 w-[210mm] opacity-0"
        >
          <div data-measure-header>{renderMasthead()}</div>

          <div data-measure-body className="px-4 md:px-5 py-8 space-y-5">
            {SECTION_KEYS.map((key) => (
              <div key={key} data-section-key={key}>
                {renderSection(key)}
              </div>
            ))}
          </div>

          <div data-measure-footer>{renderFooter(1, 1)}</div>
        </div>

        {/*
          ---- The real pages ----
          Rendered FROM the computed assignment, so the screen preview, the
          browser print and the PDF capture are the same pages by
          construction.

            - the masthead is on the first page only;
            - every page carries the footer with its own "Page N of M";
            - a section that does not fit moved WHOLE to the next page.
        */}
        {pages.map((page, i) => (
          <div
            key={i}
            data-pdf-page={i + 1}
            data-page-oversized={page.oversized ? "true" : undefined}
            className={`print-a4-page ${i > 0 ? "print-break-before-page" : ""}`}
          >
            {i === 0 && renderMasthead()}

            <div className="px-4 md:px-5 py-8 space-y-5">
              {page.sections.map((key) => (
                <div key={key} data-section-key={key}>
                  {renderSection(key)}
                </div>
              ))}
            </div>

            {renderFooter(i + 1, pages.length)}
          </div>
        ))}
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
 * The styling shared by every editable control on the document.
 *
 * The PDF is a rasterisation of the DOM, and html2canvas paints an `<input>`
 * from its own computed styles — border, background, shadow and all. The
 * shadcn `Input` would therefore show up in the PDF as a white box with a
 * grey border and a 16px value, while the surrounding document is 11-13px
 * type with no chrome. These classes strip the chrome and match the
 * document's own type so the raster looks like the page rather than a form.
 *
 * `placeholder` is deliberately absent: html2canvas falls back to the
 * placeholder when an input is empty, which would print the hint text onto
 * the client's quotation. Every editable control uses `aria-label` instead.
 *
 * `appearance-none` strips the browser's native widget chrome. It matters for
 * the `<select>` used by the approver picker: without it the platform's
 * dropdown arrow paints into the PDF as a form artefact. A custom caret is
 * deliberately NOT added — a CSS-drawn arrow would rasterise as a foreign
 * object, which html2canvas does not reproduce.
 */
const EDITABLE_CLASS =
  "w-full bg-transparent border-0 shadow-none rounded-none appearance-none " +
  "px-1 py-0.5 text-[13px] font-medium text-black outline-none " +
  "focus-visible:ring-1 focus-visible:ring-black/40 " +
  "disabled:cursor-default disabled:opacity-100";

/**
 * A single-line editable document value.
 *
 * Renders a plain `<input>` styled to match the document. When `editable` is
 * false it falls back to the same text the read-only document shows, so the
 * markup and the printed result are identical either way.
 */
function EditableValue({
  value,
  readOnlyValue,
  onChange,
  editable,
  ariaLabel,
  mono = false,
  type = "text",
  className = "",
  ...rest
}: {
  value: string;
  /**
   * What the read-only document shows, when it differs from `value`. The
   * Validity row is the case: the BDM edits a day count, but the printed
   * document states the date the quotation is valid until.
   */
  readOnlyValue?: string;
  onChange: (next: string) => void;
  editable: boolean;
  ariaLabel: string;
  /** Render in the monospace face — dates, day counts, references. */
  mono?: boolean;
  type?: "text" | "number";
  className?: string;
  min?: number;
  max?: number;
}) {
  if (!editable) {
    return (
      <span
        className={`inline-block ${mono ? "font-mono" : ""} ${className}`}
        aria-label={ariaLabel}
      >
        {readOnlyValue ?? value}
      </span>
    );
  }

  return (
    <input
      type={type}
      value={value}
      aria-label={ariaLabel}
      onChange={(e) => onChange(e.target.value)}
      className={`${EDITABLE_CLASS} ${mono ? "font-mono" : ""} ${className}`}
      {...rest}
    />
  );
}

/**
 * A multi-line editable document value — the terms boilerplate paragraph.
 *
 * This is a `contentEditable` div, NOT a `<textarea>`, and the distinction is
 * not cosmetic:
 *
 *   - html2canvas draws a `<textarea>`'s value as a SINGLE clipped line —
 *     `renderTextWithLetterSpacing(new TextBounds(container.value, …))` is
 *     one `fillText` call with no wrapping — so a long paragraph would be
 *     truncated to its first line in the PDF.
 *   - html2canvas has no special handling for `contentEditable` at all, so
 *     the div's text renders through the ordinary text path, which uses the
 *     browser's real layout (`getClientRects`) to produce one line box per
 *     visual line. The paragraph wraps correctly.
 *
 * React cannot control a `contentEditable` child's text without clobbering
 * the caret on every keystroke, so the div is left uncontrolled after mount:
 * the text is injected once, edits are read back with `innerText`, and the
 * DOM is re-synced only when the incoming value no longer matches what the
 * DOM shows — which covers the language-switch default and a reloaded draft.
 */
function EditableText({
  value,
  onChange,
  editable,
  ariaLabel,
  className = "",
}: {
  value: string;
  onChange: (next: string) => void;
  editable: boolean;
  ariaLabel: string;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // Nothing to do when the DOM already shows the incoming value. This is
    // the common case while typing: the user edited the DOM, we pushed that
    // text up, and the prop came back unchanged.
    if (el.innerText === value) return;
    // The DOM holds something the prop doesn't — the parent changed the
    // value from the outside (the language-switch default, or a reloaded
    // draft). Re-inject so the DOM catches up with the prop.
    //
    // Note this must NOT be guarded on "the DOM matches what we last
    // emitted": the language switch replaces the prop's value while the DOM
    // still holds the previous default, and skipping there would leave the
    // document showing the wrong language's boilerplate.
    el.innerText = value;
  }, [value]);

  const handleInput = () => {
    const el = ref.current;
    if (!el) return;
    onChange(el.innerText);
  };

  if (!editable) {
    return (
      <p dir="ltr" className={`whitespace-pre-wrap ${className}`}>
        {value}
      </p>
    );
  }

  return (
    <div
      ref={ref}
      role="textbox"
      aria-label={ariaLabel}
      aria-multiline="true"
      contentEditable
      suppressContentEditableWarning
      onInput={handleInput}
      onBlur={handleInput}
      className={`min-h-[3rem] whitespace-pre-wrap outline-none focus-visible:ring-1 focus-visible:ring-black/40 ${className}`}
    />
  );
}

/**
 * The approver picker on the quotation document.
 *
 * A NATIVE `<select>`, deliberately. The shadcn `Select` renders its listbox
 * into a portal on `document.body` — outside the `[data-printable]` node — so
 * html2canvas would capture only the closed trigger and never the option
 * list. A native select paints its selected option as ordinary text, which
 * rasterises correctly.
 *
 * The picked person's name is ALSO printed as plain text beneath the control.
 * A closed native select renders its value inconsistently across engines in
 * the raster, so the explicit text is what guarantees the approver's name
 * reaches the client's PDF.
 *
 * The printed block reads in three steps — the signature, then the name, then
 * the position — mirroring how a signed approval is actually presented.
 *
 * When the document is read-only (the detail page, the save step) the whole
 * control degrades to a plain text block — exactly like `EditableValue` does,
 * so the markup and the printed result are identical either way.
 */
function ApproverSelect({
  value,
  onChange,
  editable,
}: {
  value: string;
  onChange: (next: string) => void;
  editable: boolean;
}) {
  const approver = mockBdms.find((b) => b.id === value);

  const nameBlock = approver ? (
    <>
      {/*
        1 — The signature. A hand-written PNG when the BDM has one on file;
        otherwise the name in a script face stands in for it.
      */}
      {approver.signatureUrl ? (
        <img
          src={approver.signatureUrl}
          alt={approver.name}
          className="h-16 max-w-[220px] object-contain ms-auto"
        />
      ) : (
        <span dir="ltr" className="block font-serif italic text-2xl text-black/80">
          {approver.name}
        </span>
      )}

      {/* 2 — The name, in both languages. */}
      <span dir="ltr" className="mt-2 block text-center text-sm font-semibold text-black">
        {approver.name}
      </span>
      {/* <span dir="rtl" className="block text-xs font-normal text-black/70">
        {approver.nameAr}
      </span> */}

      {/* 3 — The position. The same title for every approver. */}
     <span dir="ltr" className="mt-1 block text-center text-xs font-medium text-black/60">
        {LABELS.bdmPosition.en}
      </span>
      {/* <span dir="rtl" className="block text-[11px] font-normal text-black/55">
        {LABELS.bdmPosition.ar}
      </span> */}
    </>
  ) : null;

  if (!editable) {
    return (
      <div className="inline-block" aria-label={LABELS.approvedBy.en}>
        {nameBlock ?? <span className="text-black/40">—</span>}
      </div>
    );
  }

  return (
    <>
      <select
        value={value}
        aria-label={LABELS.approvedBy.en}
        onChange={(e) => onChange(e.target.value)}
        className={`${EDITABLE_CLASS} text-end cursor-pointer`}
      >
        <option value="">—</option>
        {mockBdms.map((b) => (
          <option key={b.id} value={b.id}>
            {b.name}
          </option>
        ))}
      </select>
      {approver && <span className="mt-1 block">{nameBlock}</span>}
    </>
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
 * Renders nothing when the value is empty, unless `alwaysShow` is set — the two
 * blocks have different field sets, so an empty row would leave a dangling
 * label and a gap in the grid. The CUSTOMER block opts into `alwaysShow` so no
 * client field can silently drop off the document.
 */
function InfoRow({
  label,
  value,
  valueAr,
  mono = false,
  render,
  alwaysShow = false,
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
  /**
   * Replaces the plain text value with a control — used for the fields the
   * BDM can set directly on the document. When supplied, the row renders even
   * when `value` is empty, so an empty field still has something to click.
   */
  render?: ReactNode;
  /**
   * Always render the row, even when the value is empty — showing an em-dash
   * instead. The CUSTOMER block uses this so that no client field can ever
   * silently drop off the document: a quotation issued to a client with, say,
   * no building recorded must still show the "Building" line, or the client
   * sees a section with fields missing and assumes the lab omitted them.
   */
  alwaysShow?: boolean;
}) {
  if (!render && !alwaysShow && (!value || !value.trim())) return null;
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
        {render ?? (
          <>
            {value?.trim() || (alwaysShow ? "—" : value)}
            {valueAr && (
              <span dir="rtl" className="block text-[11px] font-normal text-black/70">
                {valueAr}
              </span>
            )}
          </>
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
 * A bilingual pair laid out as one row — English on the left, Arabic on the
 * right — with both halves carrying the same visual weight.
 *
 * `BiInline` is the opposite order (Arabic first) and suits short labels;
 * this is for the payment-instruction paragraphs, where the English leads
 * and the Arabic follows across the row.
 *
 * Each half is its own `dir` run so the Arabic keeps its natural letter order
 * and ligatures. Both halves are `flex-1`, so the row splits evenly and the
 * Arabic hugs the end edge of its own half.
 */
function BiRow({
  en,
  ar,
  className = "",
}: {
  en: ReactNode;
  ar: ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex items-start gap-6 ${className}`}>
      <div dir="ltr" className="flex-1 text-start">
        {en}
      </div>
      <div dir="rtl" className="flex-1 text-end">
        {ar}
      </div>
    </div>
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
