import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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
import { StatusBadge } from "@/components/shared/StatusBadge";
import { useAppContext } from "@/context/AppContext";
import {
  mockClients,
  mockSamples,
  deriveMarketingRows,
  type MarketingSampleRow,
} from "@/mock-data";
import { Download, FileSpreadsheet, ChevronLeft, ChevronRight } from "lucide-react";

// ---------------------------------------------------------------------------
// i18n labels — kept inline like the rest of the dashboard. RTL flips them.
// ---------------------------------------------------------------------------
const L = {
  en: {
    title: "Marketing Reports",
    desc: "Manage & Generate Marketing Reports",
    from: "From",
    to: "To",
    client: "Client",
    issuance: "Report Issuance",
    status: "Status",
    type: "Type",
    search: "Search",
    searchPh: "Search by sample, client, parameter...",
    all: "All",
    allClients: "-- All Clients --",
    allTypes: "All Types",
    issued: "Issued",
    pending: "Pending",
    sample: "Sample#",
    clientCol: "Client Name",
    sampleType: "Sample Type",
    performed: "Performed Parameters",
    received: "Date Received",
    delivery: "Sample delivery to the LAB",
    due: "Due Date",
    now: "Now",
    days: "Days",
    progress: "Progress",
    actions: "",
    show: "Show",
    entries: "entries",
    of: "of",
    exportCsv: "CSV",
    exportExcel: "Excel",
    noRows: "No samples match the selected filters.",
  },
  ar: {
    title: "تقارير التسويق",
    desc: "إدارة وإنشاء تقارير التسويق",
    from: "من",
    to: "إلى",
    client: "العميل",
    issuance: "إصدار التقرير",
    status: "الحالة",
    type: "النوع",
    search: "بحث",
    searchPh: "ابحث برقم العينة أو العميل أو المعيار...",
    all: "الكل",
    allClients: "-- كل العملاء --",
    allTypes: "كل الأنواع",
    issued: "صادر",
    pending: "قيد الإصدار",
    sample: "رقم العينة",
    clientCol: "اسم العميل",
    sampleType: "نوع العينة",
    performed: "المعايير المنفذة",
    received: "تاريخ الاستلام",
    delivery: "تسليم العينة للمختبر",
    due: "تاريخ الاستحقاق",
    now: "الآن",
    days: "أيام",
    progress: "التقدم",
    actions: "",
    show: "عرض",
    entries: "سجل",
    of: "من",
    exportCsv: "CSV",
    exportExcel: "إكسل",
    noRows: "لا توجد عينات تطابق الفلاتر المحددة.",
  },
} as const;

type Lang = keyof typeof L;

// Today's date is fixed to the screenshot's anchor (2026-08-14) so the
// Days column stays stable across renders, matching the table on screen.
const ANCHOR_TODAY = "2026-08-14";

type IssuanceFilter = "all" | "issued" | "pending";

export default function MarketingReports() {
  const { language } = useAppContext();
  const lang: Lang = language === "ar" ? "ar" : "en";
  const t = L[lang];
  const isRtl = lang === "ar";

  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [clientFilter, setClientFilter] = useState("all");
  const [issuanceFilter, setIssuanceFilter] = useState<IssuanceFilter>("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Build dropdown option lists from the data itself.
  const statusOptions = useMemo(() => {
    const set = new Set<string>();
    mockSamples.forEach((s) => set.add(s.status));
    return Array.from(set).sort();
  }, []);

  const typeOptions = useMemo(() => {
    const set = new Set<string>();
    mockSamples.forEach((s) => set.add(s.sampleType));
    return Array.from(set).sort();
  }, []);

  const rows: MarketingSampleRow[] = useMemo(
    () => deriveMarketingRows(ANCHOR_TODAY),
    [],
  );

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (fromDate && r.sample.receivedDate < fromDate) return false;
      if (toDate && r.sample.receivedDate > toDate) return false;
      if (clientFilter !== "all" && r.sample.clientId !== clientFilter)
        return false;
      if (statusFilter !== "all" && r.sample.status !== statusFilter)
        return false;
      if (typeFilter !== "all" && r.sample.sampleType !== typeFilter)
        return false;
      if (issuanceFilter === "issued" && r.sample.status !== "Approved")
        return false;
      if (issuanceFilter === "pending" && r.sample.status === "Approved")
        return false;
      if (needle) {
        const hay = [
          r.sample.id,
          r.sample.clientName,
          r.sample.sampleType,
          r.performedParameters,
        ]
          .join(" ")
          .toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      return true;
    });
  }, [
    rows,
    fromDate,
    toDate,
    clientFilter,
    statusFilter,
    typeFilter,
    issuanceFilter,
    search,
  ]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const startIdx = (safePage - 1) * pageSize;
  const pageRows = filtered.slice(startIdx, startIdx + pageSize);

  // ---------------------------------------------------------------------
  // Export helpers — CSV uses native Blob; Excel uses an .xls HTML trick
  // so we don't need to add a dependency.
  // ---------------------------------------------------------------------
  function exportCsv() {
    const headers = [
      "Sample#",
      "Client",
      "Sample Type",
      "Performed Parameters",
      "Date Received",
      "Delivery to Lab",
      "Due Date",
      "Days",
      "Progress (%)",
      "Status",
    ];
    const escape = (v: string) =>
      `"${(v ?? "").toString().replace(/"/g, '""')}"`;
    const body = filtered.map((r) =>
      [
        r.sample.id,
        r.sample.clientName,
        r.sample.sampleType,
        r.performedParameters,
        r.sample.receivedDate,
        r.deliveryDate,
        r.dueDate,
        String(r.daysRemaining),
        String(r.progress),
        r.sample.status,
      ]
        .map(escape)
        .join(","),
    );
    const csv = [headers.map((h) => escape(h)).join(","), ...body].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    triggerDownload(blob, `marketing-reports-${ANCHOR_TODAY}.csv`);
  }

  function exportExcel() {
    const headers = [
      "Sample#",
      "Client",
      "Sample Type",
      "Performed Parameters",
      "Date Received",
      "Delivery to Lab",
      "Due Date",
      "Days",
      "Progress (%)",
      "Status",
    ];
    const escape = (v: string | number) =>
      `<td>${(v ?? "")
        .toString()
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")}</td>`;
    const rowsHtml = filtered
      .map(
        (r) => `<tr>${[
          r.sample.id,
          r.sample.clientName,
          r.sample.sampleType,
          r.performedParameters,
          r.sample.receivedDate,
          r.deliveryDate,
          r.dueDate,
          r.daysRemaining,
          r.progress,
          r.sample.status,
        ]
          .map(escape)
          .join("")}</tr>`,
      )
      .join("");
    const html = `<html><head><meta charset="utf-8"></head><body><table border="1"><thead><tr>${headers
      .map((h) => `<th>${h}</th>`)
      .join("")}</tr></thead><tbody>${rowsHtml}</tbody></table></body></html>`;
    const blob = new Blob([html], { type: "application/vnd.ms-excel" });
    triggerDownload(blob, `marketing-reports-${ANCHOR_TODAY}.xls`);
  }

  function triggerDownload(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function resetFilters() {
    setFromDate("");
    setToDate("");
    setClientFilter("all");
    setIssuanceFilter("all");
    setStatusFilter("all");
    setTypeFilter("all");
    setSearch("");
    setPage(1);
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b bg-muted/30">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-md bg-primary/10 text-primary flex items-center justify-center">
              <FileSpreadsheet className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-lg">{t.title}</CardTitle>
              <CardDescription>{t.desc}</CardDescription>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={exportCsv}>
              <Download className="h-4 w-4 mr-1" /> {t.exportCsv}
            </Button>
            <Button variant="outline" size="sm" onClick={exportExcel}>
              <FileSpreadsheet className="h-4 w-4 mr-1" /> {t.exportExcel}
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 pt-4">
        {/* Filter grid — mirrors the screenshot's 2x2 + 3 layout */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              {t.from}
            </label>
            <Input
              type="date"
              value={fromDate}
              onChange={(e) => {
                setFromDate(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              {t.to}
            </label>
            <Input
              type="date"
              value={toDate}
              onChange={(e) => {
                setToDate(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              {t.client}
            </label>
            <Select
              value={clientFilter}
              onValueChange={(v) => {
                setClientFilter(v);
                setPage(1);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder={t.allClients} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t.allClients}</SelectItem>
                {mockClients.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {isRtl ? c.nameAr : c.nameEn}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              {t.issuance}
            </label>
            <Select
              value={issuanceFilter}
              onValueChange={(v) => {
                setIssuanceFilter(v as IssuanceFilter);
                setPage(1);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder={t.all} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t.all}</SelectItem>
                <SelectItem value="issued">{t.issued}</SelectItem>
                <SelectItem value="pending">{t.pending}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              {t.status}
            </label>
            <Select
              value={statusFilter}
              onValueChange={(v) => {
                setStatusFilter(v);
                setPage(1);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder={t.all} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t.all}</SelectItem>
                {statusOptions.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              {t.type}
            </label>
            <Select
              value={typeFilter}
              onValueChange={(v) => {
                setTypeFilter(v);
                setPage(1);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder={t.allTypes} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t.allTypes}</SelectItem>
                {typeOptions.map((ty) => (
                  <SelectItem key={ty} value={ty}>
                    {ty}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5 lg:col-span-2">
            <label className="text-xs font-medium text-muted-foreground">
              {t.search}
            </label>
            <div className="flex gap-2">
              <Input
                placeholder={t.searchPh}
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="flex-1"
              />
              <Button variant="ghost" onClick={resetFilters}>
                {isRtl ? "مسح" : "Clear"}
              </Button>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="rounded-md border bg-card overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[140px]">{t.sample}</TableHead>
                <TableHead>{t.clientCol}</TableHead>
                <TableHead>{t.sampleType}</TableHead>
                <TableHead className="min-w-[280px]">
                  {t.performed}
                </TableHead>
                <TableHead>{t.received}</TableHead>
                <TableHead>{t.delivery}</TableHead>
                <TableHead>{t.due}</TableHead>
                <TableHead>{t.now}</TableHead>
                <TableHead className="w-[80px] text-center">
                  {t.days}
                </TableHead>
                <TableHead className="w-[140px]">{t.progress}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageRows.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={10}
                    className="h-24 text-center text-muted-foreground"
                  >
                    {t.noRows}
                  </TableCell>
                </TableRow>
              ) : (
                pageRows.map((r) => (
                  <TableRow key={r.sample.id} className="align-top">
                    <TableCell className="font-mono font-medium text-primary">
                      {r.sample.id}
                    </TableCell>
                    <TableCell>{r.sample.clientName}</TableCell>
                    <TableCell>{r.sample.sampleType}</TableCell>
                    <TableCell className="max-w-[360px]">
                      <span className="text-sm leading-relaxed text-muted-foreground line-clamp-3">
                        {r.performedParameters}
                      </span>
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {r.sample.receivedDate}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {r.deliveryDate}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {r.dueDate}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {ANCHOR_TODAY}
                    </TableCell>
                    <TableCell className="text-center">
                      <span
                        className={
                          r.daysRemaining < 0
                            ? "text-rose-600 font-semibold"
                            : r.daysRemaining <= 2
                              ? "text-amber-600 font-semibold"
                              : "text-emerald-600 font-semibold"
                        }
                      >
                        {r.daysRemaining}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="h-2 flex-1 rounded-full bg-muted overflow-hidden">
                          <div
                            className={
                              r.progress >= 100
                                ? "h-full bg-emerald-500"
                                : r.progress >= 50
                                  ? "h-full bg-amber-500"
                                  : "h-full bg-rose-500"
                            }
                            style={{ width: `${r.progress}%` }}
                          />
                        </div>
                        <span className="text-xs tabular-nums text-muted-foreground w-9 text-right">
                          {r.progress}%
                        </span>
                      </div>
                      <div className="mt-1">
                        <StatusBadge status={r.sample.status} />
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination — matches the screenshot's "Show 10 entries" + arrows */}
        <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2 text-sm">
            <span>{t.show}</span>
            <Select
              value={String(pageSize)}
              onValueChange={(v) => {
                setPageSize(parseInt(v, 10));
                setPage(1);
              }}
            >
              <SelectTrigger className="w-[80px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[5, 10, 25, 50].map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    {n}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span>{t.entries}</span>
            <span className="text-muted-foreground ml-2">
              {filtered.length === 0 ? 0 : startIdx + 1}-
              {Math.min(startIdx + pageSize, filtered.length)} {t.of}{" "}
              {filtered.length}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={safePage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm tabular-nums">
              {safePage} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={safePage === totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}