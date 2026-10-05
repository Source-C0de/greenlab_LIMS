/**
 * Read-only render of a Quotation — used inside the wizard's preview step,
 * the detail page, and as the printable / PDF region.
 *
 * The wrapping div carries a `data-printable` attribute so the page-level
 * `no-print` CSS can target everything except this node at print time.
 */

import { forwardRef } from "react";
import { useAppContext } from "@/context/AppContext";
import {
  SAR,
  computeTotals,
  formatNumber,
  VAT_RATE,
} from "@/lib/quotation-utils";
import type { Quotation } from "@/mock-data/quotations";

interface QuotationPreviewProps {
  quotation: Quotation;
}

type Label = { en: string; ar: string };

const LABELS = {
  brand:        { en: "GreenLabLIMS",   ar: "جرين لاب LIMS" } as Label,
  brandAccent:  { en: "KSA",            ar: "السعودية" } as Label,
  tagline:      { en: "Laboratory & Diagnostic Centers", ar: "مراكز المختبرات والتشخيص" } as Label,
  docTitle:     { en: "Quotation",      ar: "عرض سعر" } as Label,
  reference:    { en: "Reference",      ar: "الرقم المرجعي" } as Label,
  draft:        { en: "Draft",          ar: "مسودة" } as Label,
  issueDate:    { en: "Issue date",     ar: "تاريخ الإصدار" } as Label,
  validUntil:   { en: "Valid until",    ar: "صالح حتى" } as Label,
  billTo:       { en: "Bill to",        ar: "فاتورة إلى" } as Label,
  vatNo:        { en: "VAT No.",        ar: "الرقم الضريبي" } as Label,
  contact:      { en: "Contact",        ar: "جهة الاتصال" } as Label,
  email:        { en: "Email",          ar: "البريد" } as Label,
  phone:        { en: "Phone",          ar: "الهاتف" } as Label,
  itemsHdr:     { en: "Items",          ar: "العناصر" } as Label,
  itemName:     { en: "Item",           ar: "البند" } as Label,
  qty:          { en: "Qty",            ar: "الكمية" } as Label,
  unitPrice:    { en: "Unit price",     ar: "سعر الوحدة" } as Label,
  lineTotal:    { en: "Line total",     ar: "الإجمالي" } as Label,
  subtotal:     { en: "Subtotal",       ar: "الإجمالي الفرعي" } as Label,
  discount:     { en: "Discount",       ar: "الخصم" } as Label,
  vat:          { en: `VAT (${Math.round(VAT_RATE * 100)}%)`, ar: `ضريبة القيمة المضافة (${Math.round(VAT_RATE * 100)}٪)` } as Label,
  total:        { en: "Total",          ar: "الإجمالي" } as Label,
  notes:        { en: "Notes",          ar: "ملاحظات" } as Label,
  terms:        { en: "Terms & conditions", ar: "الشروط والأحكام" } as Label,
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

    const client = quotation.clientSnapshot;

    return (
      <div
        ref={ref}
        data-printable
        dir={isRtl ? "rtl" : "ltr"}
        className="bg-card text-card-foreground rounded-md border overflow-hidden"
      >
        {/* Header stripe */}
        <div className="bg-primary h-2 w-full" />

        <div className="p-8 md:p-10 space-y-8">
          {/* Brand + doc title */}
          <div className="flex flex-col md:flex-row justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="bg-primary text-primary-foreground p-2 rounded-lg font-bold text-xl">
                  GL
                </div>
                <div>
                  <h1 className="text-2xl font-bold tracking-tighter">
                    {pick(LABELS.brand)}{" "}
                    <span className="font-light">{pick(LABELS.brandAccent)}</span>
                  </h1>
                  <p className="text-xs text-muted-foreground uppercase font-bold tracking-widest">
                    {pick(LABELS.tagline)}
                  </p>
                </div>
              </div>
              <div className="text-sm space-y-0.5 text-muted-foreground pt-2">
                <p>{pick({ en: "Kingdom of Saudi Arabia", ar: "المملكة العربية السعودية" } as Label)}</p>
                <p>
                  {pick({ en: "Tax Number", ar: "الرقم الضريبي" } as Label)}:{" "}
                  <span className="font-mono font-bold">300012345600003</span>
                </p>
              </div>
            </div>

            <div className="text-end space-y-1">
              <h2 className="text-3xl font-black text-primary/10 uppercase tracking-tighter select-none">
                {pick(LABELS.docTitle)}
              </h2>
              <div>
                <p className="text-xs uppercase tracking-widest text-muted-foreground">
                  {pick(LABELS.reference)}
                </p>
                <p className="text-xl font-mono font-bold">
                  {quotation.id ?? pick(LABELS.draft)}
                </p>
              </div>
              <div className="text-sm text-muted-foreground">
                <p>
                  {pick(LABELS.issueDate)}:{" "}
                  <span className="font-mono">{quotation.issueDate}</span>
                </p>
                <p>
                  {pick(LABELS.validUntil)}:{" "}
                  <span className="font-mono">{quotation.validUntil}</span>
                </p>
              </div>
            </div>
          </div>

          {/* Client block */}
          <div className="grid md:grid-cols-2 gap-8 pt-6 border-t border-dashed">
            <div>
              <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">
                {pick(LABELS.billTo)}
              </p>
              <p className="text-lg font-bold">
                {isRtl && client.nameAr ? client.nameAr : client.nameEn}
              </p>
              <div className="text-sm space-y-0.5 mt-1">
                {client.vatNo && (
                  <p>
                    {pick(LABELS.vatNo)}:{" "}
                    <span className="font-mono">{client.vatNo}</span>
                  </p>
                )}
                {client.contactPerson && <p>{pick(LABELS.contact)}: {client.contactPerson}</p>}
                {client.email && <p>{pick(LABELS.email)}: {client.email}</p>}
                {client.phone && <p>{pick(LABELS.phone)}: {client.phone}</p>}
              </div>
            </div>
            <div className="text-end text-xs text-muted-foreground">
              <p>
                {pick({
                  en: "Prepared by",
                  ar: "أعد بواسطة",
                } as Label)}
                : <span className="font-mono">{quotation.createdBy}</span>
              </p>
              <p className="mt-1">
                {quotation.status === "draft"
                  ? pick(LABELS.draft)
                  : pick({ en: "Issued", ar: "صادر" } as Label)}
              </p>
            </div>
          </div>

          {/* Line items table */}
          <div>
            <h3 className="font-semibold mb-3">{pick(LABELS.itemsHdr)}</h3>
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b-2 border-foreground/20">
                  <th className="text-start py-2 pe-2">{pick(LABELS.itemName)}</th>
                  <th className="text-end py-2 px-2 w-16">{pick(LABELS.qty)}</th>
                  <th className="text-end py-2 px-2 w-28">{pick(LABELS.unitPrice)}</th>
                  <th className="text-end py-2 ps-2 w-32">{pick(LABELS.lineTotal)}</th>
                </tr>
              </thead>
              <tbody>
                {quotation.lineItems.length === 0 ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="py-6 text-center text-muted-foreground text-xs"
                    >
                      {isRtl ? "لا توجد بنود" : "No line items"}
                    </td>
                  </tr>
                ) : (
                  quotation.lineItems.map((li) => (
                    <tr key={li.id} className="border-b border-foreground/10">
                      <td className="py-2 pe-2">
                        <div className="font-medium">{li.name || "—"}</div>
                        {li.description && (
                          <div className="text-xs text-muted-foreground">{li.description}</div>
                        )}
                      </td>
                      <td className="text-end py-2 px-2 font-mono">{li.quantity}</td>
                      <td className="text-end py-2 px-2 font-mono">
                        {formatNumber(li.unitPrice)}
                      </td>
                      <td className="text-end py-2 ps-2 font-mono">
                        {formatNumber(li.lineTotal)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="flex justify-end">
            <div className="w-full max-w-xs space-y-1 text-sm">
              <div className="flex justify-between">
                <span>{pick(LABELS.subtotal)}</span>
                <span className="font-mono">{SAR(totals.subtotal)}</span>
              </div>
              {totals.discountAmount > 0 && (
                <div className="flex justify-between text-muted-foreground">
                  <span>
                    - {pick(LABELS.discount)}
                    {quotation.discountType === "percent" && quotation.discountValue > 0
                      ? ` (${quotation.discountValue}%)`
                      : ""}
                  </span>
                  <span className="font-mono">{SAR(totals.discountAmount)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>{pick(LABELS.vat)}</span>
                <span className="font-mono">{SAR(totals.vatAmount)}</span>
              </div>
              <div className="flex justify-between border-t-2 border-foreground/30 pt-2 mt-2 text-base font-bold">
                <span>{pick(LABELS.total)}</span>
                <span className="font-mono">{SAR(totals.total)}</span>
              </div>
            </div>
          </div>

          {/* Notes + terms */}
          {(quotation.notes || quotation.terms) && (
            <div className="grid md:grid-cols-2 gap-6 pt-6 border-t border-dashed text-sm">
              {quotation.notes && (
                <div>
                  <p className="font-semibold mb-1">{pick(LABELS.notes)}</p>
                  <p className="whitespace-pre-wrap text-muted-foreground">{quotation.notes}</p>
                </div>
              )}
              {quotation.terms && (
                <div>
                  <p className="font-semibold mb-1">{pick(LABELS.terms)}</p>
                  <p className="whitespace-pre-wrap text-muted-foreground">{quotation.terms}</p>
                </div>
              )}
            </div>
          )}

          <div className="text-center text-xs text-muted-foreground pt-6 border-t">
            {pick({
              en: "Thank you for your business.",
              ar: "شكرًا لتعاملكم معنا.",
            } as Label)}
          </div>
        </div>
      </div>
    );
  },
);
