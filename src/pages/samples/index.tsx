import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import {
  mockSamples,
  mockClients,
  sampleTypes,
  mockSpecifications,
  deriveMarketingRows,
} from "@/mock-data";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import {
  Plus,
  Download,
  Loader2,
  Beaker,
  Info,
  FileText,
  Search,
  Edit,
  Trash2,
  Printer,
  FileSpreadsheet,
  ChevronLeft,
  ChevronRight,
  Eye,
} from "lucide-react";
import { useAppContext } from "@/context/AppContext";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

const sampleSchema = z.object({
  clientId: z.string().min(1, "Please select a client"),
  sampleType: z.string().min(1, "Please select a sample type"),
  description: z.string().min(5, "Description must be at least 5 characters"),
  priority: z.string().min(1, "Please select priority"),
});

type SampleFormValues = z.infer<typeof sampleSchema>;

// Mirrors the anchor used in MarketingReports so the Days deltas agree.
const ANCHOR_TODAY = "2026-08-14";

export default function SamplesList() {
  const { currentRole, language } = useAppContext();
  const isRtl = language === "ar";
  const [samples, setSamples] = useState(mockSamples);
  const [isAdding, setIsAdding] = useState(false);
  const [open, setOpen] = useState(false);
  const [selectedSpec, setSelectedSpec] = useState<any>(null);

  // Filter state — mirrors the screenshot's filter card.
  const [customerFilter, setCustomerFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sampleNoQuery, setSampleNoQuery] = useState("");
  const [reportNoQuery, setReportNoQuery] = useState("");
  const [sampleNameQuery, setSampleNameQuery] = useState("");
  const [fromDate, setFromDate] = useState("2022-01-01");
  const [toDate, setToDate] = useState(ANCHOR_TODAY);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<SampleFormValues>({
    resolver: zodResolver(sampleSchema),
    defaultValues: {
      priority: "Normal",
    },
  });

  const watchedSampleType = watch("sampleType");

  useEffect(() => {
    if (watchedSampleType) {
      const spec = mockSpecifications.find(
        (s) => s.productName === watchedSampleType,
      );
      setSelectedSpec(spec || null);
    }
  }, [watchedSampleType]);

  const handleTypeChange = (val: string) => {
    setValue("sampleType", val);
    const spec = mockSpecifications.find((s) => s.productName === val);
    setSelectedSpec(spec || null);
    if (spec) {
      toast.info(
        isRtl
          ? `تم تحميل مواصفة ${val} تلقائياً`
          : `Auto-loaded ${val} specification`,
        {
          description: isRtl
            ? `تمت إضافة ${spec.parameters.length} اختبارات`
            : `Added ${spec.parameters.length} test parameters automatically.`,
        },
      );
    }
  };

  const onSubmit = (data: SampleFormValues) => {
    setIsAdding(true);
    setTimeout(() => {
      const client = mockClients.find((c) => c.id === data.clientId);
      const tests = selectedSpec
        ? selectedSpec.parameters.map((p: any, idx: number) => ({
            id: `T-${String(idx + 1).padStart(3, "0")}`,
            name: p.name,
            category: "Chemical",
            method: p.method,
            status: "Pending",
            parameters: [
              {
                id: `P-${idx}`,
                name: p.name,
                value: "",
                unit: p.unit,
                min: p.min,
                max: p.max,
                target: p.target,
                limitType: p.limitType,
                status: "Pending",
              },
            ],
          }))
        : [];

      const newSample = {
        id: `SAM-2024-${String(samples.length + 1).padStart(3, "0")}`,
        clientId: data.clientId,
        clientName: client
          ? language === "ar"
            ? client.nameAr
            : client.nameEn
          : "Unknown Client",
        sampleType: data.sampleType,
        description: data.description,
        status: "Received",
        assignedAnalyst: null,
        receivedDate: new Date().toISOString().split("T")[0],
        completedDate: null,
        priority: data.priority,
        tests: tests,
      };

      setSamples([newSample, ...samples]);
      setIsAdding(false);
      setOpen(false);
      reset();
      setSelectedSpec(null);
      toast.success("Sample registered successfully with linked specification");
    }, 1000);
  };

  // Distinct status values for the dropdown.
  const statusOptions = useMemo(() => {
    const set = new Set<string>();
    samples.forEach((s) => set.add(s.status));
    return Array.from(set).sort();
  }, [samples]);

  // Pre-compute marketing-style rows so we can reuse the progress + days
  // helpers without duplicating the math.
  const marketingRows = useMemo(
    () => deriveMarketingRows(ANCHOR_TODAY, samples),
    [samples],
  );
  const rowById = useMemo(() => {
    const m = new Map<string, (typeof marketingRows)[number]>();
    marketingRows.forEach((r) => m.set(r.sample.id, r));
    return m;
  }, [marketingRows]);

  // Filter pipeline.
  const filtered = useMemo(() => {
    const needle = (s: string) => s.trim().toLowerCase();
    return samples.filter((s) => {
      if (customerFilter !== "all" && s.clientId !== customerFilter) return false;
      if (statusFilter !== "all" && s.status !== statusFilter) return false;
      if (fromDate && s.receivedDate < fromDate) return false;
      if (toDate && s.receivedDate > toDate) return false;
      const sn = needle(sampleNoQuery);
      if (sn && !s.id.toLowerCase().includes(sn)) return false;
      const rn = needle(reportNoQuery);
      if (rn && !s.id.toLowerCase().includes(rn)) return false; // mock: no separate report# field
      const nm = needle(sampleNameQuery);
      if (nm && !s.description.toLowerCase().includes(nm)) return false;
      return true;
    });
  }, [
    samples,
    customerFilter,
    statusFilter,
    fromDate,
    toDate,
    sampleNoQuery,
    reportNoQuery,
    sampleNameQuery,
  ]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const startIdx = (safePage - 1) * pageSize;
  const pageRows = filtered.slice(startIdx, startIdx + pageSize);

  // -------------------------------------------------------------------
  // Export helpers — CSV + Excel + a print shortcut.
  // -------------------------------------------------------------------
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

  function exportCsv() {
    const headers = [
      "Sample ID",
      "Ref No.",
      "Client",
      "Batch",
      "Report",
      "Supplement",
      "Priority",
      "Sample Members",
      "Received Date",
      "Received By",
      "Progress (%)",
      "Status",
    ];
    const esc = (v: string) =>
      `"${(v ?? "").toString().replace(/"/g, '""')}"`;
    const body = filtered.map((s) => {
      const r = rowById.get(s.id);
      return [
        s.id,
        s.id,
        s.clientName,
        s.description,
        s.status === "Approved" ? s.id : "—",
        "—",
        s.priority,
        s.assignedAnalyst ?? "—",
        s.receivedDate,
        s.assignedAnalyst ?? "—",
        String(r?.progress ?? 0),
        s.status,
      ]
        .map(esc)
        .join(",");
    });
    const csv = [headers.map(esc).join(","), ...body].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    triggerDownload(blob, `samples_export_${ANCHOR_TODAY}.csv`);
    toast.success("Samples exported to CSV");
  }

  function exportExcel() {
    const headers = [
      "Sample ID",
      "Ref No.",
      "Client",
      "Batch",
      "Report",
      "Supplement",
      "Priority",
      "Sample Members",
      "Received Date",
      "Received By",
      "Progress (%)",
      "Status",
    ];
    const esc = (v: string | number) =>
      `<td>${(v ?? "")
        .toString()
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")}</td>`;
    const body = filtered
      .map((s) => {
        const r = rowById.get(s.id);
        return `<tr>${[
          s.id,
          s.id,
          s.clientName,
          s.description,
          s.status === "Approved" ? s.id : "—",
          "—",
          s.priority,
          s.assignedAnalyst ?? "—",
          s.receivedDate,
          s.assignedAnalyst ?? "—",
          r?.progress ?? 0,
          s.status,
        ]
          .map(esc)
          .join("")}</tr>`;
      })
      .join("");
    const html = `<html><head><meta charset="utf-8"></head><body><table border="1"><thead><tr>${headers
      .map((h) => `<th>${h}</th>`)
      .join("")}</tr></thead><tbody>${body}</tbody></table></body></html>`;
    const blob = new Blob([html], { type: "application/vnd.ms-excel" });
    triggerDownload(blob, `samples_export_${ANCHOR_TODAY}.xls`);
    toast.success("Samples exported to Excel");
  }

  function exportPdf() {
    toast.info(
      isRtl
        ? "تصدير PDF — استخدم طباعة المتصفح"
        : "PDF export — use the browser's Print dialog to save as PDF.",
    );
    window.print();
  }

  function handlePrint() {
    window.print();
  }

  // Reset filters back to the screenshot defaults.
  function resetFilters() {
    setCustomerFilter("all");
    setStatusFilter("all");
    setSampleNoQuery("");
    setReportNoQuery("");
    setSampleNameQuery("");
    setFromDate("2022-01-01");
    setToDate(ANCHOR_TODAY);
    setPage(1);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {currentRole === "client"
              ? isRtl
                ? "عيناتي"
                : "My Samples"
              : isRtl
                ? "إدارة العينات"
                : "Samples Management"}
          </h1>
          <p className="text-muted-foreground mt-1">
            {currentRole === "client"
              ? isRtl
                ? "تتبع عيناتك ونتائج الفحوصات الخاصة بك"
                : "Track your laboratory samples and test results"
              : isRtl
                ? "إدارة وتتبع جميع عينات المختبر"
                : "Manage and track all laboratory samples"}
          </p>
        </div>

        {currentRole === "admin" || currentRole === "lab_manager" ? (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                {isRtl ? "عينة جديدة" : "New Sample"}
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Register New Sample</DialogTitle>
                <DialogDescription>
                  Fill in the details below to register a new laboratory sample.
                </DialogDescription>
              </DialogHeader>

              <form
                onSubmit={handleSubmit(onSubmit)}
                className="space-y-4 py-4"
              >
                <div className="grid gap-2">
                  <Label htmlFor="clientId">Client</Label>
                  <Select
                    onValueChange={(val) => setValue("clientId", val)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a client" />
                    </SelectTrigger>
                    <SelectContent>
                      {mockClients.map((client) => (
                        <SelectItem key={client.id} value={client.id}>
                          {language === "ar" ? client.nameAr : client.nameEn}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.clientId && (
                    <p className="text-xs text-destructive">
                      {errors.clientId.message}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="sampleType">Sample Type</Label>
                    <Select onValueChange={handleTypeChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Type" />
                      </SelectTrigger>
                      <SelectContent>
                        {sampleTypes.map((t) => (
                          <SelectItem key={t.type} value={t.type}>
                            {t.type}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.sampleType && (
                      <p className="text-xs text-destructive">
                        {errors.sampleType.message}
                      </p>
                    )}
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="priority">Priority</Label>
                    <Select
                      onValueChange={(val) => setValue("priority", val)}
                      defaultValue="Normal"
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Priority" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Normal">Normal</SelectItem>
                        <SelectItem value="High">High</SelectItem>
                        <SelectItem value="Urgent">Urgent</SelectItem>
                      </SelectContent>
                    </Select>
                    {errors.priority && (
                      <p className="text-xs text-destructive">
                        {errors.priority.message}
                      </p>
                    )}
                  </div>
                </div>

                {selectedSpec && (
                  <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-primary uppercase flex items-center gap-1">
                        <Beaker className="h-3 w-3" /> Linked Specification
                      </span>
                      <Badge variant="outline" className="text-[10px] h-4">
                        {selectedSpec.code}
                      </Badge>
                    </div>
                    <p className="text-sm font-medium">{selectedSpec.name}</p>
                    <div className="flex flex-wrap gap-1">
                      {selectedSpec.parameters.map((p: any) => (
                        <Badge
                          key={p.parameterId}
                          variant="secondary"
                          className="text-[10px] font-normal py-0"
                        >
                          {p.name}
                        </Badge>
                      ))}
                    </div>
                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground pt-1">
                      <Info className="h-3 w-3" /> All tests will load automatically
                    </div>
                  </div>
                )}

                <div className="grid gap-2">
                  <Label htmlFor="description">Sample Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Enter detailed description of the sample..."
                    {...register("description")}
                  />
                  {errors.description && (
                    <p className="text-xs text-destructive">
                      {errors.description.message}
                    </p>
                  )}
                </div>

                <DialogFooter className="pt-4">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isAdding}>
                    {isAdding ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Registering...
                      </>
                    ) : (
                      "Register Sample"
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        ) : null}
      </div>

      {/* Filter card — matches the screenshot layout */}
      <Card className="border-border/70">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            {isRtl ? "فلترة العينات" : "Filter Samples"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                {isRtl ? "العملاء" : "Customers"}
              </label>
              <Select
                value={customerFilter}
                onValueChange={(v) => {
                  setCustomerFilter(v);
                  setPage(1);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder={isRtl ? "الكل" : "All"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    {isRtl ? "الكل" : "All"}
                  </SelectItem>
                  {mockClients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {language === "ar" ? c.nameAr : c.nameEn}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                {isRtl ? "الحالة" : "Status"}
              </label>
              <Select
                value={statusFilter}
                onValueChange={(v) => {
                  setStatusFilter(v);
                  setPage(1);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder={isRtl ? "الكل" : "All"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    {isRtl ? "الكل" : "All"}
                  </SelectItem>
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
                {isRtl ? "رقم العينة" : "Sample No."}
              </label>
              <Input
                placeholder="Sample No."
                value={sampleNoQuery}
                onChange={(e) => {
                  setSampleNoQuery(e.target.value);
                  setPage(1);
                }}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                {isRtl ? "رقم التقرير" : "Report No."}
              </label>
              <Input
                placeholder="Report No."
                value={reportNoQuery}
                onChange={(e) => {
                  setReportNoQuery(e.target.value);
                  setPage(1);
                }}
              />
            </div>

            <div className="space-y-1.5 lg:col-span-2">
              <label className="text-xs font-medium text-muted-foreground">
                {isRtl ? "اسم العينة" : "Sample Name"}
              </label>
              <Input
                placeholder="Sample Name"
                value={sampleNameQuery}
                onChange={(e) => {
                  setSampleNameQuery(e.target.value);
                  setPage(1);
                }}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                {isRtl ? "من تاريخ" : "From Date"}
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
                {isRtl ? "إلى تاريخ" : "To Date"}
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
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Button onClick={() => setPage(1)} className="min-w-[120px]">
              <Search className="h-4 w-4 mr-2" />
              {isRtl ? "بحث" : "Get"}
            </Button>
            <Button variant="ghost" onClick={resetFilters}>
              {isRtl ? "مسح" : "Clear"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Results section */}
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3">
          <CardTitle className="text-base">
            {isRtl ? "قائمة جميع العينات" : "List All Samples"}
          </CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 text-sm">
              <span>{isRtl ? "عرض" : "Show"}</span>
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
              <span>{isRtl ? "سجل" : "entries"}</span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={exportCsv}>
              <Download className="h-4 w-4 mr-1" /> CSV
            </Button>
            <Button variant="outline" size="sm" onClick={exportExcel}>
              <FileSpreadsheet className="h-4 w-4 mr-1" /> Excel
            </Button>
            <Button variant="outline" size="sm" onClick={exportPdf}>
              <FileText className="h-4 w-4 mr-1" /> PDF
            </Button>
            <Button variant="outline" size="sm" onClick={handlePrint}>
              <Printer className="h-4 w-4 mr-1" />{" "}
              {isRtl ? "طباعة" : "Print"}
            </Button>
            <div className="ml-auto flex items-center gap-2 max-w-xs w-full sm:w-auto">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={isRtl ? "بحث..." : "Search:"}
                value={sampleNoQuery}
                onChange={(e) => {
                  setSampleNoQuery(e.target.value);
                  setPage(1);
                }}
                className="h-9"
              />
            </div>
          </div>

          <div className="rounded-md border bg-card overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    {isRtl ? "رقم العينة" : "Sample000#"}
                  </TableHead>
                  <TableHead>{isRtl ? "العميل" : "Client"}</TableHead>
                  <TableHead>{isRtl ? "الدفعة" : "Batch"}</TableHead>
                  <TableHead>{isRtl ? "الحالة" : "Status"}</TableHead>
                  <TableHead>{isRtl ? "التقرير" : "Report"}</TableHead>
                  <TableHead>{isRtl ? "الأولوية" : "Priority"}</TableHead>
                  <TableHead className="w-[160px] text-right">
                    {isRtl ? "إجراء" : "Action"}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pageRows.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="h-24 text-center text-muted-foreground"
                    >
                      {isRtl
                        ? "لا توجد عينات تطابق الفلاتر المحددة."
                        : "No samples match the selected filters."}
                    </TableCell>
                  </TableRow>
                ) : (
                  pageRows.map((s) => {
                    const isApproved = s.status === "Approved";
                    return (
                      <TableRow key={s.id} className="align-top">
                        <TableCell className="font-mono font-medium text-primary whitespace-nowrap">
                          <Link href={`/samples/${s.id}`}>{s.id}</Link>
                        </TableCell>
                        <TableCell>{s.clientName}</TableCell>
                        <TableCell className="max-w-[220px]">
                          <span className="text-sm text-muted-foreground line-clamp-2">
                            {s.description}
                          </span>
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={s.status} />
                        </TableCell>
                        <TableCell>
                          {isApproved ? (
                            <Link href={`/samples/${s.id}/report`}>
                              <Button
                                variant="outline"
                                size="sm"
                                className="gap-1.5 text-emerald-700 border-emerald-200 bg-emerald-50 hover:bg-emerald-100 hover:text-emerald-800"
                              >
                                <FileText className="h-3.5 w-3.5" />
                                {isRtl ? "عرض" : "View"}
                              </Button>
                            </Link>
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              —
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          <span
                            className={
                              s.priority === "Urgent"
                                ? "text-rose-600 font-semibold"
                                : s.priority === "High"
                                  ? "text-amber-600 font-semibold"
                                  : "text-muted-foreground"
                            }
                          >
                            {s.priority}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-1 flex-wrap">
                            <Link href={`/samples/${s.id}`}>
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-7 w-7 text-sky-700 border-sky-200 hover:bg-sky-50"
                                title={isRtl ? "عرض" : "View"}
                              >
                                <Eye className="h-3.5 w-3.5" />
                              </Button>
                            </Link>
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-7 w-7"
                              title={isRtl ? "تعديل" : "Edit"}
                            >
                              <Edit className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-7 w-7 text-rose-600 border-rose-200 hover:bg-rose-50"
                              title={isRtl ? "حذف" : "Delete"}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                            {isApproved && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 gap-1 text-amber-700 border-amber-200 bg-amber-50 hover:bg-amber-100 hover:text-amber-800"
                                title={
                                  isRtl ? "إعادة إصدار" : "Reissue report"
                                }
                                onClick={() =>
                                  toast.info(
                                    isRtl
                                      ? `إعادة إصدار التقرير لـ ${s.id}`
                                      : `Reissue report for ${s.id}`,
                                  )
                                }
                              >
                                <FileText className="h-3.5 w-3.5" />
                                {isRtl ? "إعادة" : "Reissue"}
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="text-sm text-muted-foreground">
              {filtered.length === 0 ? 0 : startIdx + 1}-
              {Math.min(startIdx + pageSize, filtered.length)} {isRtl ? "من" : "of"}{" "}
              {filtered.length} {isRtl ? "سجل" : "entries"}
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
    </div>
  );
}

