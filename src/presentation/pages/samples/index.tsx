import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { Link, useLocation } from "wouter";
import {
  sampleTypes,
  mockSpecifications,
} from "@/infrastructure/mock/data";
import { StatusBadge } from "@/presentation/components/shared/StatusBadge";
import { useReissueSample } from "@/presentation/hooks/test-approvals/useReissueSample";
import { useSupplementarySample } from "@/presentation/hooks/test-approvals/useSupplementarySample";
import {
  samplesStore,
  subscribe,
  getStoreSnapshot,
} from "@/infrastructure/mock/repositories/sampleStore";
import { container } from "@/infrastructure/di/container";
import type { Page } from "@/domain/shared/pagination";
import { MAX_PAGE_LIMIT } from "@/domain/shared/pagination";
import type { Sample } from "@/domain/sample/model";
import type { Client } from "@/domain/client/model";
import { Button } from "@/shared/ui/button";
import {
  Plus,
  Download,
  Loader2,
  Beaker,
  Info,
  FileText,
  Search,
  FileSpreadsheet,
  Eye,
  Edit,
  Trash2,
  X,
  Layers,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { useAppContext } from "@/presentation/providers/AppContext";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from "@/shared/ui/dialog";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import { Textarea } from "@/shared/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { Badge } from "@/shared/ui/badge";

const sampleSchema = z.object({
  clientId: z.string().min(1, "Please select a client"),
  sampleType: z.string().min(1, "Please select a sample type"),
  description: z.string().min(5, "Description must be at least 5 characters"),
  // Narrowed from `z.string()` so the validated value satisfies
  // `MockSample["priority"]` — the dropdown only offers these three.
  priority: z.enum(["Normal", "High", "Urgent"], {
    required_error: "Please select priority",
  }),
});

type SampleFormValues = z.infer<typeof sampleSchema>;

// Anchored "today" used by date defaults so demo data stays stable.
const ANCHOR_TODAY = "2026-08-14";

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const;
type PageSize = (typeof PAGE_SIZE_OPTIONS)[number];

export default function SamplesList() {
  const { currentRole, language } = useAppContext();
  const isRtl = language === "ar";

  const { reissue } = useReissueSample();
  const { supplementary } = useSupplementarySample();
  const [, setLocation] = useLocation();

  const [isAdding, setIsAdding] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedSpec, setSelectedSpec] = useState<any>(null);

  // Subscribe to store mutations so a new sample (registered here, reissued,
  // or created by an approval action on another route) refreshes the table
  // without the user touching a filter. Declared before the derived
  // `statusOptions`/`allMatches` memos that depend on it.
  const storeTick = useSyncExternalStore(subscribe, getStoreSnapshot, getStoreSnapshot);

  // Clients come from the `ClientRepository` port rather than the raw fixture.
  // Loaded once into component state because `ClientRepository` is async while
  // the client `<Select>` dropdowns, the filter-chip label and the submit
  // handler all need synchronous access — refetching per dropdown render would
  // be absurd. Client data is reference data and does not change at runtime.
  const [clients, setClients] = useState<Client[]>([]);

  useEffect(() => {
    let cancelled = false;
    void container.clients.list({ limit: MAX_PAGE_LIMIT }).then((result) => {
      if (cancelled) return;
      if (result.ok) setClients([...result.value.items] as Client[]);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Filters — single search + status + client + date range.
  const [search, setSearch] = useState("");
  const [customerFilter, setCustomerFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  // Pagination.
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<PageSize>(10);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<SampleFormValues>({
    resolver: zodResolver(sampleSchema),
    defaultValues: { priority: "Normal" },
  });

  const watchedSampleType = watch("sampleType");

  useEffect(() => {
    if (!watchedSampleType) {
      setSelectedSpec(null);
      return;
    }
    const spec = mockSpecifications.find(
      (s) => s.productName === watchedSampleType,
    );
    setSelectedSpec(spec || null);
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
      const client = clients.find((c) => c.id === data.clientId);
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

      const newSample: Omit<Sample, "id"> = {
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
        tests,
      };

      // Persisted through the port, not local component state. The previous
      // `setSamples([newSample, ...samples])` only touched this page's
      // useState — nothing wrote to `samplesStore`, so a freshly registered
      // sample disappeared the moment the user navigated away and came back.
      // `create()` also mints the id, which is why `generateSampleId` is no
      // longer called here: it needs the full corpus to derive the next
      // serial, and only the adapter has that.
      void container.samples.create(newSample).then((result) => {
        if (!result.ok) {
          toast.error(
            isRtl ? "تعذر تسجيل العينة" : "Failed to register sample",
          );
          setIsAdding(false);
          return;
        }
        setIsAdding(false);
        setDialogOpen(false);
        reset();
        setSelectedSpec(null);
        toast.success("Sample registered successfully with linked specification");
      });
    }, 600);
  };

  // Distinct status values for the dropdown. Read from the unfiltered corpus
  // via the store rather than `allMatches`, which is narrowed by the active
  // filters — offering only the statuses the user is already looking at makes
  // the dropdown useless for broadening a search.
  const statusOptions = useMemo(() => {
    const set = new Set<string>();
    samplesStore.forEach((s) => set.add(s.status));
    return Array.from(set).sort();
  }, [storeTick]);

  // Active filter chips + derived hasActiveFilters flag.
  const activeFilters = useMemo(() => {
    const chips: { key: string; label: string; clear: () => void }[] = [];
    if (search) chips.push({
      key: "search",
      label: `${isRtl ? "بحث" : "Search"}: "${search}"`,
      clear: () => setSearch(""),
    });
    if (customerFilter !== "all") {
      const c = clients.find((x) => x.id === customerFilter);
      chips.push({
        key: "customer",
        label: `${isRtl ? "العميل" : "Client"}: ${
          c ? (language === "ar" ? c.nameAr : c.nameEn) : customerFilter
        }`,
        clear: () => setCustomerFilter("all"),
      });
    }
    if (statusFilter !== "all") {
      chips.push({
        key: "status",
        label: `${isRtl ? "الحالة" : "Status"}: ${statusFilter}`,
        clear: () => setStatusFilter("all"),
      });
    }
    if (fromDate) chips.push({
      key: "from",
      label: `${isRtl ? "من" : "From"}: ${fromDate}`,
      clear: () => setFromDate(""),
    });
    if (toDate) chips.push({
      key: "to",
      label: `${isRtl ? "إلى" : "To"}: ${toDate}`,
      clear: () => setToDate(""),
    });
    return chips;
  }, [search, customerFilter, statusFilter, fromDate, toDate, isRtl, language]);

  const hasActiveFilters = activeFilters.length > 0;

  // -------------------------------------------------------------------
  // Filtering + pagination go through the `SampleRepository` port rather
  // than filtering `mockSamples` in the page.
  //
  // This is the payoff of Phase 3: filtering and paging used to be JS running
  // over the whole array in the browser. Now the page states WHAT it wants and
  // an adapter decides HOW — `list()` filters and returns a `Page<Sample>`.
  // When the HTTP adapter lands, the identical call returns a server-filtered
  // page and this component does not change.
  //
  // `filtered` is retained deliberately: the CSV/Excel exports and the status
  // dropdown both need every matching row, not just the current page. The mock
  // adapter is in-process so filtering it again costs nothing; when this
  // becomes a real backend call, exports get their own endpoint.
  // -------------------------------------------------------------------
  const query = useMemo(
    () => ({
      search,
      clientId: customerFilter === "all" ? undefined : customerFilter,
      status: statusFilter === "all" ? undefined : statusFilter,
      fromDate: fromDate || undefined,
      toDate: toDate || undefined,
      limit: pageSize,
      offset: (page - 1) * pageSize,
    }),
    [search, customerFilter, statusFilter, fromDate, toDate, pageSize, page],
  );

  const [pageResult, setPageResult] = useState<Page<Sample>>({
    items: [],
    total: 0,
    limit: pageSize,
    offset: 0,
  });

  useEffect(() => {
    let cancelled = false;
    void container.samples.list(query).then((result) => {
      if (cancelled) return;
      if (result.ok) setPageResult(result.value);
      else setPageResult({ items: [], total: 0, limit: query.limit, offset: query.offset });
    });
    return () => {
      cancelled = true;
    };
    // `storeTick` is deliberately a dependency: it is the invalidation signal
    // for mutations that happen outside this page's own handlers (approve /
    // reject / reissue performed on another route), so the refetched page
    // reflects them without the user touching a filter.
  }, [query, storeTick]);

  // `filtered` = EVERY row matching the filters, ignoring pagination. The CSV
  // and Excel exports both iterate it, so a page-sized slice would silently
  // export only what happens to be on screen. MAX_PAGE_LIMIT caps the request;
  // today the corpus is ~30 samples, and when it outgrows one page the export
  // path grows its own endpoint rather than a 100k-row fetch.
  const [allMatches, setAllMatches] = useState<Sample[]>([]);

  useEffect(() => {
    let cancelled = false;
    void container.samples
      .list({
        search,
        clientId: customerFilter === "all" ? undefined : customerFilter,
        status: statusFilter === "all" ? undefined : statusFilter,
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
        limit: MAX_PAGE_LIMIT,
      })
      .then((result) => {
        if (cancelled) return;
        setAllMatches(result.ok ? ([...result.value.items] as Sample[]) : []);
      });
    return () => {
      cancelled = true;
    };
  }, [search, customerFilter, statusFilter, fromDate, toDate, storeTick]);

  const filtered = allMatches;

  const totalRows = pageResult.total;
  const totalPages = Math.max(1, Math.ceil(totalRows / pageSize));
  const safePage = Math.min(page, totalPages);
  const startIdx = (safePage - 1) * pageSize;
  const endIdx = Math.min(startIdx + pageSize, totalRows);
  const pageRows = pageResult.items as Sample[];

  // Reset page whenever filters change so the user is never stranded on a
  // now-empty page.
  useEffect(() => {
    setPage(1);
  }, [search, customerFilter, statusFilter, fromDate, toDate, pageSize]);

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

  const exportHeaders = useMemo(
    () => [
      "Sample ID",
      "Client",
      "Batch",
      "Status",
      "Priority",
      "Received Date",
    ],
    [],
  );

  function exportCsv() {
    const esc = (v: string) => `"${(v ?? "").toString().replace(/"/g, '""')}"`;
    const body = filtered.map((s) =>
      [s.id, s.clientName, s.description, s.status, s.priority, s.receivedDate]
        .map(esc)
        .join(","),
    );
    const csv = [exportHeaders.map(esc).join(","), ...body].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    triggerDownload(blob, `samples_export_${ANCHOR_TODAY}.csv`);
    toast.success("Samples exported to CSV");
  }

  function exportExcel() {
    const esc = (v: string | number) =>
      `<td>${(v ?? "")
        .toString()
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")}</td>`;
    const body = filtered
      .map(
        (s) =>
          `<tr>${[s.id, s.clientName, s.description, s.status, s.priority, s.receivedDate]
            .map(esc)
            .join("")}</tr>`,
      )
      .join("");
    const html = `<html><head><meta charset="utf-8"></head><body><table border="1"><thead><tr>${exportHeaders
      .map((h) => `<th>${h}</th>`)
      .join("")}</tr></thead><tbody>${body}</tbody></table></body></html>`;
    const blob = new Blob([html], { type: "application/vnd.ms-excel" });
    triggerDownload(blob, `samples_export_${ANCHOR_TODAY}.xls`);
    toast.success("Samples exported to Excel");
  }

  function clearAllFilters() {
    setSearch("");
    setCustomerFilter("all");
    setStatusFilter("all");
    setFromDate("");
    setToDate("");
    setPage(1);
  }

  // Build a compact page list: 1 ... (n-1) n (n+1) ... total
  function buildPageList(): (number | "ellipsis")[] {
    const total = totalPages;
    const current = safePage;
    if (total <= 7) {
      const out: (number | "ellipsis")[] = [];
      for (let i = 1; i <= total; i++) out.push(i);
      return out;
    }
    const window = new Set<number>([1, total, current, current - 1, current + 1]);
    const sorted = [...window].filter((n) => n >= 1 && n <= total).sort((a, b) => a - b);
    const pages: (number | "ellipsis")[] = [];
    let prev = 0;
    for (const n of sorted) {
      if (prev && n - prev > 1) pages.push("ellipsis");
      pages.push(n);
      prev = n;
    }
    return pages;
  }
  const pageList = buildPageList();

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
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
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
                  <Select onValueChange={(val) => setValue("clientId", val)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a client" />
                    </SelectTrigger>
                    <SelectContent>
                      {clients.map((client) => (
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
                      onValueChange={(val) =>
                        setValue("priority", val as SampleFormValues["priority"])
                      }
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
                    onClick={() => setDialogOpen(false)}
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

      {/* Filter bar — single horizontal row that wraps on small screens */}
      <Card className="border-border/70">
        <CardContent className="pt-4">
          <div className="flex flex-wrap items-end gap-3">
            {/* Search */}
            <div className="space-y-1.5 flex-1 min-w-[220px]">
              <label className="text-xs font-medium text-muted-foreground">
                {isRtl ? "بحث" : "Search"}
              </label>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground rtl:left-auto rtl:right-2.5" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={
                    isRtl
                      ? "ابحث برقم العينة أو العميل أو الوصف..."
                      : "Search by sample, client, or description..."
                  }
                  className="pl-8 rtl:pl-3 rtl:pr-8"
                />
              </div>
            </div>

            {/* Client */}
            <div className="space-y-1.5 min-w-[160px]">
              <label className="text-xs font-medium text-muted-foreground">
                {isRtl ? "العميل" : "Client"}
              </label>
              <Select
                value={customerFilter}
                onValueChange={setCustomerFilter}
              >
                <SelectTrigger>
                  <SelectValue placeholder={isRtl ? "الكل" : "All"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    {isRtl ? "الكل" : "All clients"}
                  </SelectItem>
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {language === "ar" ? c.nameAr : c.nameEn}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Status */}
            <div className="space-y-1.5 min-w-[160px]">
              <label className="text-xs font-medium text-muted-foreground">
                {isRtl ? "الحالة" : "Status"}
              </label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder={isRtl ? "الكل" : "All"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    {isRtl ? "كل الحالات" : "All statuses"}
                  </SelectItem>
                  {statusOptions.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Date range (from) */}
            <div className="space-y-1.5 min-w-[150px]">
              <label className="text-xs font-medium text-muted-foreground">
                {isRtl ? "من تاريخ" : "From"}
              </label>
              <Input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
              />
            </div>

            {/* Date range (to) */}
            <div className="space-y-1.5 min-w-[150px]">
              <label className="text-xs font-medium text-muted-foreground">
                {isRtl ? "إلى تاريخ" : "To"}
              </label>
              <Input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
              />
            </div>
          </div>

          {/* Active filter chips */}
          {hasActiveFilters && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="text-xs text-muted-foreground">
                {isRtl ? "فلاتر نشطة:" : "Active filters:"}
              </span>
              {activeFilters.map((chip) => (
                <Badge
                  key={chip.key}
                  variant="secondary"
                  className="gap-1 cursor-pointer hover:bg-secondary/70"
                  onClick={chip.clear}
                >
                  {chip.label}
                  <X className="h-3 w-3" />
                </Badge>
              ))}
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAllFilters}
                className="h-6 px-2 text-xs"
              >
                {isRtl ? "مسح الكل" : "Clear all"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Results */}
      <Card>
        {/* Toolbar — title + page-size + exports */}
        <div className="flex flex-col gap-3 px-4 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-semibold">
              {isRtl ? "قائمة العينات" : "Samples"}
            </h2>
            <p className="text-xs text-muted-foreground">
              {totalRows === 0
                ? isRtl
                  ? "لا توجد نتائج"
                  : "No samples match the selected filters."
                : `${startIdx + 1}–${endIdx} ${isRtl ? "من" : "of"} ${totalRows} ${isRtl ? "سجل" : "samples"}`}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">
                {isRtl ? "صفحة" : "Rows"}
              </span>
              <Select
                value={String(pageSize)}
                onValueChange={(v) => setPageSize(Number(v) as PageSize)}
              >
                <SelectTrigger className="w-[84px] h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAGE_SIZE_OPTIONS.map((n) => (
                    <SelectItem key={n} value={String(n)}>
                      {n}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button variant="outline" size="sm" onClick={exportCsv}>
              <Download className="h-4 w-4 mr-1" /> CSV
            </Button>
            <Button variant="outline" size="sm" onClick={exportExcel}>
              <FileSpreadsheet className="h-4 w-4 mr-1" /> Excel
            </Button>
          </div>
        </div>

        <CardContent className="pt-4">
          <div className="rounded-md border bg-card overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{isRtl ? "رقم العينة" : "Sample#"}</TableHead>
                  <TableHead>{isRtl ? "العميل" : "Client"}</TableHead>
                  <TableHead>{isRtl ? "الدفعة" : "Batch"}</TableHead>
                  <TableHead>{isRtl ? "الحالة" : "Status"}</TableHead>
                  <TableHead>{isRtl ? "التقرير" : "Report"}</TableHead>
                  <TableHead>{isRtl ? "الأولوية" : "Priority"}</TableHead>
                  <TableHead className="w-[120px] text-right">
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
                          <div className="flex justify-end gap-1">
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
                              onClick={() =>
                                toast.info(
                                  isRtl
                                    ? `تعديل ${s.id}`
                                    : `Edit ${s.id}`,
                                )
                              }
                            >
                              <Edit className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-7 w-7 text-rose-600 border-rose-200 hover:bg-rose-50"
                              title={isRtl ? "حذف" : "Delete"}
                              onClick={() =>
                                toast.error(
                                  isRtl
                                    ? `حذف ${s.id}`
                                    : `Delete ${s.id}`,
                                )
                              }
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                            {isApproved && (
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-7 w-7 text-amber-700 border-amber-200 bg-amber-50 hover:bg-amber-100 hover:text-amber-800"
                                title={
                                  isRtl ? "إعادة إصدار" : "Reissue report"
                                }
                                aria-label={
                                  isRtl
                                    ? `إعادة إصدار لـ ${s.id}`
                                    : `Reissue for ${s.id}`
                                }
                                disabled={
                                  currentRole !== "admin" &&
                                  currentRole !== "lab_manager"
                                }
                                onClick={() => {
                                  const result = reissue({
                                    sourceSampleId: s.id,
                                  });
                                  if (result) {
                                    toast.success(
                                      isRtl
                                        ? `تم إعادة الإصدار باسم ${result.newId}`
                                        : `Reissued as ${result.newId}`,
                                    );
                                    // No manual re-sync needed: the page
                                    // subscribes to `storeTick`, and
                                    // `reissue()` notifies the store, which
                                    // re-runs the `container.samples.list()`
                                    // effect and refreshes the table.
                                  } else {
                                    toast.error(
                                      isRtl
                                        ? "فشل إعادة الإصدار"
                                        : "Reissue failed",
                                    );
                                  }
                                }}
                              >
                                <FileText className="h-3.5 w-3.5" />
                              </Button>
                            )}
                            {isApproved && (
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-7 w-7 text-sky-700 border-sky-200 bg-sky-50 hover:bg-sky-100 hover:text-sky-800"
                                title={
                                  isRtl ? "عينة تكميلية" : "Supplementary sample"
                                }
                                aria-label={
                                  isRtl
                                    ? `عينة تكميلية لـ ${s.id}`
                                    : `Supplementary for ${s.id}`
                                }
                                disabled={
                                  currentRole !== "admin" &&
                                  currentRole !== "lab_manager"
                                }
                                onClick={() => {
                                  const result = supplementary({
                                    sourceSampleId: s.id,
                                  });
                                  if (result) {
                                    toast.success(
                                      isRtl
                                        ? `تم إنشاء عينة تكميلية: ${result.newId}`
                                        : `Supplementary sample created: ${result.newId}`,
                                    );
                                    // Land on the new sample's detail page
                                    // so the user can use the existing
                                    // "Add Test" dialog to attach new
                                    // tests/parameters.
                                    setLocation(`/samples/${result.newId}`);
                                  } else {
                                    toast.error(
                                      isRtl
                                        ? "فشل إنشاء العينة التكميلية"
                                        : "Failed to create supplementary",
                                    );
                                  }
                                }}
                              >
                                <Layers className="h-3.5 w-3.5" />
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

          <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3 pt-2">
            <div className="text-sm text-muted-foreground tabular-nums">
              {totalRows === 0
                ? isRtl
                  ? "لا توجد سجلات"
                  : "No entries"
                : `${startIdx + 1}–${endIdx} ${isRtl ? "من" : "of"} ${totalRows}`}
            </div>

            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => setPage(1)}
                disabled={safePage === 1}
                title={isRtl ? "الأولى" : "First"}
              >
                <ChevronsLeft className="h-4 w-4 rtl:rotate-180" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={safePage === 1}
                title={isRtl ? "السابق" : "Previous"}
              >
                <ChevronLeft className="h-4 w-4 rtl:rotate-180" />
              </Button>

              <div className="hidden sm:flex items-center gap-1 mx-1">
                {pageList.map((p, i) =>
                  p === "ellipsis" ? (
                    <span
                      key={`e-${i}`}
                      className="px-2 text-sm text-muted-foreground select-none"
                    >
                      …
                    </span>
                  ) : (
                    <Button
                      key={p}
                      variant={p === safePage ? "default" : "outline"}
                      size="icon"
                      className="h-8 w-8 tabular-nums"
                      onClick={() => setPage(p)}
                      aria-current={p === safePage ? "page" : undefined}
                    >
                      {p}
                    </Button>
                  ),
                )}
              </div>

              <span className="sm:hidden px-2 text-sm tabular-nums text-muted-foreground">
                {safePage} / {totalPages}
              </span>

              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={safePage === totalPages}
                title={isRtl ? "التالي" : "Next"}
              >
                <ChevronRight className="h-4 w-4 rtl:rotate-180" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => setPage(totalPages)}
                disabled={safePage === totalPages}
                title={isRtl ? "الأخيرة" : "Last"}
              >
                <ChevronsRight className="h-4 w-4 rtl:rotate-180" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

