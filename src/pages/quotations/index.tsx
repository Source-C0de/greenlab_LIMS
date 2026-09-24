/**
 * Quotation list page.
 *
 * Combines issued quotations (in mockQuotations) with locally-stored
 * drafts (via listDrafts()) into a single filterable table.
 */

import { useEffect, useMemo, useState } from "react";
import { useLocation, Link } from "wouter";
import { Plus, Eye, Pencil, Trash2, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { DataTable } from "@/components/shared/DataTable";
import { useAppContext } from "@/context/AppContext";
import { useAuth } from "@/context/AuthContext";
import { SAR } from "@/lib/quotation-utils";
import { deleteDraft, listDrafts } from "@/lib/quotation-storage";
import { mockQuotations, type Quotation, type QuotationStatus } from "@/mock-data";
import { toast } from "sonner";

const STATUS_LABELS: Record<QuotationStatus, { en: string; ar: string }> = {
  draft:      { en: "Draft",      ar: "مسودة" },
  issued:     { en: "Issued",     ar: "صادر" },
  expired:    { en: "Expired",    ar: "منتهي" },
  superseded: { en: "Superseded", ar: "ملغى" },
};

const STATUS_VARIANT: Record<QuotationStatus, "default" | "secondary" | "outline" | "destructive"> = {
  draft: "outline",
  issued: "default",
  expired: "destructive",
  superseded: "secondary",
};

const LABELS = {
  title:    { en: "Quotations",            ar: "عروض الأسعار" } as const,
  subtitle: { en: "Manage pre-sale price quotes issued to clients.",
               ar: "إدارة عروض الأسعار المُصدرة للعملاء." } as const,
  newBtn:   { en: "New Quotation",         ar: "عرض سعر جديد" } as const,
  empty:    { en: "No quotations yet. Create your first one to get started.",
              ar: "لا توجد عروض أسعار بعد. أنشئ عرضك الأول للبدء." } as const,
  view:     { en: "View",                  ar: "عرض" } as const,
  edit:     { en: "Edit",                  ar: "تعديل" } as const,
  delete:   { en: "Delete",                ar: "حذف" } as const,
  colId:    { en: "Reference",             ar: "الرقم المرجعي" } as const,
  colClient:{ en: "Client",                ar: "العميل" } as const,
  colItems: { en: "Items",                 ar: "العناصر" } as const,
  colTotal: { en: "Total",                 ar: "الإجمالي" } as const,
  colStatus:{ en: "Status",                ar: "الحالة" } as const,
  colDate:  { en: "Issue date",            ar: "تاريخ الإصدار" } as const,
  colValid: { en: "Valid until",           ar: "صالح حتى" } as const,
  deleted:  { en: "Draft deleted.",        ar: "تم حذف المسودة." } as const,
};

interface Row {
  id: string;            // display id (QUO-... for issued, draft id for drafts)
  raw: Quotation;        // source record
  isDraft: boolean;
}

export default function QuotationsList() {
  const { language } = useAppContext();
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const isRtl = language === "ar";
  const pick = <T extends { en: string; ar: string }>(l: T) => (isRtl ? l.ar : l.en);

  const [refreshKey, setRefreshKey] = useState(0);
  const [statusFilter, setStatusFilter] = useState<QuotationStatus | "all">("all");

  // Re-read drafts from localStorage on mount + after returning to this page.
  useEffect(() => {
    const onFocus = () => setRefreshKey((n) => n + 1);
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);

  const rows = useMemo<Row[]>(() => {
    const drafts = listDrafts().map<Row>((d) => ({
      id: d.draftId ?? "(draft)",
      raw: d,
      isDraft: true,
    }));
    const issued = mockQuotations.map<Row>((q) => ({
      id: q.id ?? "(issued)",
      raw: q,
      isDraft: false,
    }));
    // Newest first (updatedAt desc).
    return [...issued, ...drafts].sort((a, b) =>
      b.raw.updatedAt.localeCompare(a.raw.updatedAt),
    );
  }, [refreshKey]);

  const filtered = useMemo(
    () => (statusFilter === "all" ? rows : rows.filter((r) => r.raw.status === statusFilter)),
    [rows, statusFilter],
  );

  const handleDelete = (r: Row) => {
    if (!r.isDraft) return;
    if (r.raw.draftId) deleteDraft(r.raw.draftId);
    toast.success(pick(LABELS.deleted));
    setRefreshKey((n) => n + 1);
  };

  const columns = useMemo(
    () => [
      {
        key: "id",
        header: pick(LABELS.colId),
        render: (r: Row) =>
          r.isDraft ? (
            <Link href={`/quotations/new?draft=${r.raw.draftId}`}>
              <span className="font-mono text-sm text-primary hover:underline">
                {r.id.slice(0, 12)}…
              </span>
            </Link>
          ) : (
            <Link href={`/quotations/${r.id}`}>
              <span className="font-mono text-sm font-semibold hover:underline">
                {r.id}
              </span>
            </Link>
          ),
      },
      {
        key: "client",
        header: pick(LABELS.colClient),
        render: (r: Row) => (
          <div className="min-w-0">
            <div className="font-medium truncate">
              {isRtl && r.raw.clientSnapshot.nameAr
                ? r.raw.clientSnapshot.nameAr
                : r.raw.clientSnapshot.nameEn || "—"}
            </div>
            {r.raw.clientSnapshot.vatNo && (
              <div className="text-xs text-muted-foreground font-mono">
                {r.raw.clientSnapshot.vatNo}
              </div>
            )}
          </div>
        ),
      },
      {
        key: "items",
        header: pick(LABELS.colItems),
        render: (r: Row) => r.raw.lineItems.length,
      },
      {
        key: "total",
        header: pick(LABELS.colTotal),
        render: (r: Row) => <span className="font-mono">{SAR(r.raw.total)}</span>,
      },
      {
        key: "status",
        header: pick(LABELS.colStatus),
        render: (r: Row) => (
          <Badge variant={STATUS_VARIANT[r.raw.status]}>
            {pick(STATUS_LABELS[r.raw.status])}
          </Badge>
        ),
      },
      {
        key: "issueDate",
        header: pick(LABELS.colDate),
        render: (r: Row) => <span className="font-mono text-xs">{r.raw.issueDate}</span>,
      },
      {
        key: "validUntil",
        header: pick(LABELS.colValid),
        render: (r: Row) => <span className="font-mono text-xs">{r.raw.validUntil}</span>,
      },
      {
        key: "actions",
        header: "",
        render: (r: Row) => (
          <div className="flex items-center justify-end gap-1">
            {r.isDraft ? (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate(`/quotations/new?draft=${r.raw.draftId}`)}
                aria-label={pick(LABELS.edit)}
                title={pick(LABELS.edit)}
              >
                <Pencil className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate(`/quotations/${r.id}`)}
                aria-label={pick(LABELS.view)}
                title={pick(LABELS.view)}
              >
                <Eye className="h-4 w-4" />
              </Button>
            )}
            {r.isDraft && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleDelete(r)}
                aria-label={pick(LABELS.delete)}
                title={pick(LABELS.delete)}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            )}
          </div>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isRtl, user?.username, navigate, refreshKey],
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{pick(LABELS.title)}</h1>
          <p className="text-muted-foreground mt-1">{pick(LABELS.subtitle)}</p>
        </div>
        <Button onClick={() => navigate("/quotations/new")}>
          <Plus className="h-4 w-4 me-2" />
          {pick(LABELS.newBtn)}
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {(["all", "draft", "issued", "expired", "superseded"] as const).map((s) => (
          <Button
            key={s}
            size="sm"
            variant={statusFilter === s ? "default" : "outline"}
            onClick={() => setStatusFilter(s)}
          >
            {s === "all" ? (isRtl ? "الكل" : "All") : pick(STATUS_LABELS[s])}
          </Button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">{pick(LABELS.empty)}</p>
            <Button className="mt-4" onClick={() => navigate("/quotations/new")}>
              <Plus className="h-4 w-4 me-2" />
              {pick(LABELS.newBtn)}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <DataTable<Row>
          data={filtered}
          columns={columns}
          searchKey="id"
          searchPlaceholder={isRtl ? "البحث بالرقم المرجعي…" : "Search by reference…"}
          onRowClick={(r) =>
            r.isDraft
              ? navigate(`/quotations/new?draft=${r.raw.draftId}`)
              : navigate(`/quotations/${r.id}`)
          }
        />
      )}
    </div>
  );
}
