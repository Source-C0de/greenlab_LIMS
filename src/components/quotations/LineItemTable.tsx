/**
 * Editable line-item grid for the Quotation wizard.
 *
 * Lines come from two sources:
 *   - catalog: picked from `mockSpecifications` (uses defaultPrice if present)
 *   - custom: typed ad-hoc by the BDM
 *
 * Below the grid: a discount row + live totals panel. Pure presentational;
 * the parent owns the Quotation state and passes it in.
 */

import { useMemo, useState } from "react";
import { Plus, Trash2, BookOpen, FilePlus2, Percent, Coins } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useAppContext } from "@/context/AppContext";
import {
  computeTotals,
  formatNumber,
  localUid,
  SAR,
  VAT_RATE,
  type QuotationTotals,
} from "@/lib/quotation-utils";
import type { Quotation, QuotationLineItem } from "@/mock-data/quotations";
import type { Specification } from "@/mock-data/specifications";

interface LineItemTableProps {
  quotation: Quotation;
  catalog: Specification[];
  onChange: (next: Quotation) => void;
}

type Label = { en: string; ar: string };

const LABELS = {
  title:         { en: "Tests & line items",       ar: "الاختبارات وبنود العرض" } as Label,
  colName:       { en: "Item",                     ar: "البند" } as Label,
  colSource:     { en: "Source",                   ar: "المصدر" } as Label,
  colQty:        { en: "Qty",                      ar: "الكمية" } as Label,
  colUnit:       { en: "Unit price",               ar: "سعر الوحدة" } as Label,
  colTotal:      { en: "Line total",               ar: "إجمالي البند" } as Label,
  colActions:    { en: "",                         ar: "" } as Label,
  empty:         { en: "No line items yet. Add one from the catalog or as a custom line.",
                   ar: "لا توجد بنود بعد. أضف من الكتالوج أو كبند مخصص." } as Label,
  addCatalog:    { en: "Add from catalog",         ar: "إضافة من الكتالوج" } as Label,
  addCustom:     { en: "Add custom line",          ar: "إضافة بند مخصص" } as Label,
  remove:        { en: "Remove",                   ar: "إزالة" } as Label,
  sourceCatalog: { en: "Catalog",                  ar: "كتالوج" } as Label,
  sourceCustom:  { en: "Custom",                   ar: "مخصص" } as Label,
  // Catalog picker
  catalogTitle:  { en: "Pick from specifications", ar: "اختر من المواصفات" } as Label,
  catalogPh:     { en: "Search specifications…",   ar: "البحث في المواصفات…" } as Label,
  catalogEmpty:  { en: "No specifications available.", ar: "لا توجد مواصفات متاحة." } as Label,
  catalogAdd:    { en: "Add to quotation",         ar: "إضافة للعرض" } as Label,
  catalogClose:  { en: "Close",                    ar: "إغلاق" } as Label,
  // Discount / totals
  discount:      { en: "Discount",                 ar: "الخصم" } as Label,
  discountType:  { en: "Type",                     ar: "النوع" } as Label,
  percent:       { en: "Percent (%)",              ar: "نسبة مئوية (٪)" } as Label,
  fixed:         { en: "Fixed (SAR)",              ar: "مبلغ ثابت (ر.س)" } as Label,
  discountVal:   { en: "Value",                    ar: "القيمة" } as Label,
  subtotal:      { en: "Subtotal",                 ar: "الإجمالي الفرعي" } as Label,
  discountLine:  { en: "Discount",                 ar: "الخصم" } as Label,
  vat:           { en: `VAT (${Math.round(VAT_RATE * 100)}%)`, ar: `ضريبة القيمة المضافة (${Math.round(VAT_RATE * 100)}٪)` } as Label,
  total:         { en: "Total",                    ar: "الإجمالي" } as Label,
} as const;

function lineTotal(li: QuotationLineItem): number {
  const q = Number.isFinite(li.quantity) ? li.quantity : 0;
  const p = Number.isFinite(li.unitPrice) ? li.unitPrice : 0;
  return Math.round(q * p * 100) / 100;
}

function withRecalc(items: QuotationLineItem[]): QuotationLineItem[] {
  return items.map((li) => ({ ...li, lineTotal: lineTotal(li) }));
}

export function LineItemTable({ quotation, catalog, onChange }: LineItemTableProps) {
  const { language } = useAppContext();
  const isRtl = language === "ar";
  const pick = (l: Label) => (isRtl ? l.ar : l.en);

  const updateLine = (id: string, patch: Partial<QuotationLineItem>) => {
    onChange({
      ...quotation,
      lineItems: withRecalc(
        quotation.lineItems.map((li) => (li.id === id ? { ...li, ...patch } : li)),
      ),
    });
  };

  const removeLine = (id: string) => {
    onChange({ ...quotation, lineItems: quotation.lineItems.filter((li) => li.id !== id) });
  };

  const addFromCatalog = (spec: Specification) => {
    const next: QuotationLineItem = {
      id: localUid(),
      source: "catalog",
      specificationId: spec.id,
      name: spec.name,
      description: spec.code,
      quantity: 1,
      unitPrice: spec.defaultPrice ?? 0,
      lineTotal: spec.defaultPrice ?? 0,
    };
    onChange({ ...quotation, lineItems: [...quotation.lineItems, next] });
  };

  const addCustom = () => {
    const next: QuotationLineItem = {
      id: localUid(),
      source: "custom",
      specificationId: null,
      name: "",
      description: "",
      quantity: 1,
      unitPrice: 0,
      lineTotal: 0,
    };
    onChange({ ...quotation, lineItems: [...quotation.lineItems, next] });
  };

  const setDiscount = (patch: Partial<Pick<Quotation, "discountType" | "discountValue">>) => {
    onChange({ ...quotation, ...patch });
  };

  const totals: QuotationTotals = computeTotals(
    quotation.lineItems,
    quotation.discountType,
    quotation.discountValue,
    quotation.vatRate,
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
        <h3 className="text-lg font-semibold">{pick(LABELS.title)}</h3>
        <div className="flex gap-2">
          <CatalogPickerDialog catalog={catalog} onPick={addFromCatalog} />
          <Button variant="outline" size="sm" onClick={addCustom}>
            <FilePlus2 className="h-4 w-4 me-2" />
            {pick(LABELS.addCustom)}
          </Button>
        </div>
      </div>

      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-[200px]">{pick(LABELS.colName)}</TableHead>
              <TableHead className="w-24">{pick(LABELS.colSource)}</TableHead>
              <TableHead className="w-20">{pick(LABELS.colQty)}</TableHead>
              <TableHead className="w-32">{pick(LABELS.colUnit)}</TableHead>
              <TableHead className="w-32 text-end">{pick(LABELS.colTotal)}</TableHead>
              <TableHead className="w-12">{pick(LABELS.colActions)}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {quotation.lineItems.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-8">
                  {pick(LABELS.empty)}
                </TableCell>
              </TableRow>
            ) : (
              quotation.lineItems.map((li) => (
                <TableRow key={li.id}>
                  <TableCell className="space-y-1">
                    <Input
                      value={li.name}
                      onChange={(e) => updateLine(li.id, { name: e.target.value })}
                      placeholder="Test name"
                      disabled={li.source === "catalog"}
                      className="h-8"
                    />
                    <Input
                      value={li.description ?? ""}
                      onChange={(e) => updateLine(li.id, { description: e.target.value })}
                      placeholder={isRtl ? "الوصف / الكود" : "Description / code"}
                      className="h-7 text-xs"
                    />
                  </TableCell>
                  <TableCell>
                    <Badge variant={li.source === "catalog" ? "secondary" : "outline"}>
                      {li.source === "catalog" ? pick(LABELS.sourceCatalog) : pick(LABELS.sourceCustom)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      min={1}
                      step={1}
                      value={li.quantity}
                      onChange={(e) =>
                        updateLine(li.id, { quantity: Math.max(1, Number(e.target.value) || 1) })
                      }
                      className="h-8 text-end"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      min={0}
                      step={0.01}
                      value={li.unitPrice}
                      onChange={(e) =>
                        updateLine(li.id, { unitPrice: Math.max(0, Number(e.target.value) || 0) })
                      }
                      className="h-8 text-end"
                    />
                  </TableCell>
                  <TableCell className="text-end font-mono">
                    {formatNumber(li.lineTotal)}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeLine(li.id)}
                      aria-label={pick(LABELS.remove)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Discount row + totals */}
      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-md border p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Coins className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">{pick(LABELS.discount)}</span>
          </div>
          <div className="grid grid-cols-3 gap-2 items-end">
            <div className="grid gap-1.5 col-span-1">
              <Label htmlFor="discount-type">{pick(LABELS.discountType)}</Label>
              <Select
                value={quotation.discountType}
                onValueChange={(v) =>
                  setDiscount({ discountType: v as Quotation["discountType"] })
                }
              >
                <SelectTrigger id="discount-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percent">
                    <span className="inline-flex items-center gap-1">
                      <Percent className="h-3 w-3" /> {pick(LABELS.percent)}
                    </span>
                  </SelectItem>
                  <SelectItem value="fixed">{pick(LABELS.fixed)}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5 col-span-2">
              <Label htmlFor="discount-value">{pick(LABELS.discountVal)}</Label>
              <Input
                id="discount-value"
                type="number"
                min={0}
                step={quotation.discountType === "percent" ? 0.5 : 0.01}
                value={quotation.discountValue}
                onChange={(e) =>
                  setDiscount({ discountValue: Math.max(0, Number(e.target.value) || 0) })
                }
                className="text-end"
              />
            </div>
          </div>
        </div>

        <div className="rounded-md border bg-muted/30 p-4 space-y-2 text-sm">
          <TotalsRow label={pick(LABELS.subtotal)} value={SAR(totals.subtotal)} />
          {totals.discountAmount > 0 && (
            <TotalsRow
              label={`- ${pick(LABELS.discountLine)}`}
              value={SAR(totals.discountAmount)}
              muted
            />
          )}
          <TotalsRow label={pick(LABELS.vat)} value={SAR(totals.vatAmount)} />
          <div className="border-t pt-2 mt-2">
            <TotalsRow label={pick(LABELS.total)} value={SAR(totals.total)} bold large />
          </div>
        </div>
      </div>
    </div>
  );
}

function TotalsRow({
  label,
  value,
  muted,
  bold,
  large,
}: {
  label: string;
  value: string;
  muted?: boolean;
  bold?: boolean;
  large?: boolean;
}) {
  return (
    <div
      className={`flex justify-between items-baseline ${
        muted ? "text-muted-foreground" : ""
      } ${bold ? "font-semibold" : ""} ${large ? "text-base" : ""}`}
    >
      <span>{label}</span>
      <span className="font-mono">{value}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Catalog picker dialog
// ---------------------------------------------------------------------------

interface CatalogPickerDialogProps {
  catalog: Specification[];
  onPick: (spec: Specification) => void;
}

function CatalogPickerDialog({ catalog, onPick }: CatalogPickerDialogProps) {
  const { language } = useAppContext();
  const isRtl = language === "ar";
  const pick = (l: Label) => (isRtl ? l.ar : l.en);

  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const t = search.trim().toLowerCase();
    if (!t) return catalog;
    return catalog.filter(
      (s) =>
        s.name.toLowerCase().includes(t) ||
        s.code.toLowerCase().includes(t) ||
        s.category.toLowerCase().includes(t),
    );
  }, [catalog, search]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <BookOpen className="h-4 w-4 me-2" />
          {pick(LABELS.addCatalog)}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{pick(LABELS.catalogTitle)}</DialogTitle>
        </DialogHeader>

        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={pick(LABELS.catalogPh)}
        />

        <div className="max-h-80 overflow-y-auto rounded-md border divide-y">
          {filtered.length === 0 ? (
            <div className="p-4 text-sm text-muted-foreground">
              {pick(LABELS.catalogEmpty)}
            </div>
          ) : (
            filtered.map((spec) => (
              <button
                key={spec.id}
                type="button"
                onClick={() => {
                  onPick(spec);
                  setOpen(false);
                  setSearch("");
                }}
                className="w-full text-start px-4 py-3 hover:bg-muted/50 transition-colors flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <div className="font-medium truncate">{spec.name}</div>
                  <div className="text-xs text-muted-foreground truncate">
                    {spec.code} · {spec.category} · {spec.parameters.length} params
                  </div>
                </div>
                <div className="text-end shrink-0">
                  <div className="font-mono text-sm">
                    {spec.defaultPrice !== undefined ? SAR(spec.defaultPrice) : "—"}
                  </div>
                  <Button size="sm" variant="ghost" className="h-7 mt-1">
                    <Plus className="h-3 w-3 me-1" />
                    {pick(LABELS.catalogAdd)}
                  </Button>
                </div>
              </button>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
