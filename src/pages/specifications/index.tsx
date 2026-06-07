import { useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import { mockSpecifications } from "@/mock-data";
import { DataTable } from "@/components/shared/DataTable";
import { Button } from "@/components/ui/button";
import {
  Plus,
  Filter,
  Download,
  History,
  CheckCircle2,
  BookOpen,
  TestTube2,
  Pencil,
  Trash2,
  Eye,
  ListChecks
} from "lucide-react";
import { useAppContext } from "@/context/AppContext";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function SpecificationList() {
  const { language } = useAppContext();
  const isRtl = language === 'ar';
  const [, setLocation] = useLocation();
  const [specs, setSpecs] = useState(mockSpecifications);
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);
  const [viewTarget, setViewTarget] = useState<any | null>(null);

  const handleDelete = () => {
    if (!deleteTarget) return;
    setSpecs((prev) => prev.filter((s) => s.id !== deleteTarget.id));
    toast.success(
      isRtl
        ? `تم حذف المواصفة ${deleteTarget.code}`
        : `Specification ${deleteTarget.code} deleted`
    );
    setDeleteTarget(null);
  };

  const totalParameters = useMemo(
    () => specs.reduce((sum, s) => sum + (s.parameters?.length || 0), 0),
    [specs]
  );
  const totalTests = useMemo(
    () => specs.reduce((sum, s) => sum + (s.tests?.length || 0), 0),
    [specs]
  );
  const uniqueCategories = useMemo(
    () => new Set(specs.map((s) => s.category).filter(Boolean)).size,
    [specs]
  );

  const columns = [
    {
      key: "code",
      header: isRtl ? "كود المواصفة" : "Spec Code",
      render: (item: any) => <span className="font-mono font-medium">{item.code}</span>,
    },
    {
      key: "name",
      header: isRtl ? "اسم المواصفة" : "Specification Name",
      render: (item: any) => (
        <div className="flex flex-col">
          <span className="font-medium">{item.name}</span>
          <span className="text-[10px] text-muted-foreground font-mono">{item.id}</span>
        </div>
      ),
    },
    {
      key: "category",
      header: isRtl ? "الفئة" : "Category",
      render: (item: any) =>
        item.category ? (
          <Badge variant="outline">{item.category}</Badge>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      key: "issuanceDate",
      header: isRtl ? "تاريخ الإصدار" : "Issuance Date",
      render: (item: any) => (
        <span className="text-xs font-mono text-muted-foreground">
          {item.issuanceDate || "—"}
        </span>
      ),
    },
    {
      key: "parameters",
      header: isRtl ? "عدد المعلمات" : "Parameters",
      render: (item: any) => {
        const count = item.parameters?.length || 0;
        return (
          <span className="inline-flex items-center gap-1 text-xs">
            <ListChecks className="h-3 w-3 text-muted-foreground" />
            <span className="font-medium">{count}</span>
          </span>
        );
      },
    },
    {
      key: "tests",
      header: isRtl ? "عدد الاختبارات" : "Tests",
      render: (item: any) => {
        const count = item.tests?.length || 0;
        return (
          <span className="inline-flex items-center gap-1 text-xs">
            <TestTube2 className="h-3 w-3 text-muted-foreground" />
            <span className="font-medium">{count}</span>
          </span>
        );
      },
    },
    {
      key: "actions",
      header: isRtl ? "إجراءات" : "Actions",
      render: (item: any) => (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setViewTarget(item)}
            title={isRtl ? "عرض" : "View"}
          >
            <Eye className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-primary hover:bg-primary/10"
            onClick={() => setLocation(`/specifications/edit/${item.id}`)}
            title={isRtl ? "تعديل" : "Edit"}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive hover:bg-destructive/10"
            onClick={() => setDeleteTarget(item)}
            title={isRtl ? "حذف" : "Delete"}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {isRtl ? "إدارة المواصفات" : "Specification Management"}
          </h1>
          <p className="text-muted-foreground mt-1">
            {isRtl
              ? "تكوين وإدارة مواصفات المنتجات ومعايير الاختبار"
              : "Configure and manage product specifications and test standards"}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link href="/specifications/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />{" "}
              {isRtl ? "إضافة مواصفة" : "Add Specification"}
            </Button>
          </Link>
          <Button variant="outline">
            <Filter className="mr-2 h-4 w-4" /> {isRtl ? "تصفية" : "Filter"}
          </Button>
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" /> {isRtl ? "تصدير" : "Export"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-card p-4 rounded-xl border shadow-sm flex items-center gap-4">
          <div className="h-12 w-12 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-600">
            <BookOpen className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">
              {isRtl ? "إجمالي المواصفات" : "Total Specs"}
            </p>
            <p className="text-2xl font-bold">{specs.length}</p>
          </div>
        </div>
        <div className="bg-card p-4 rounded-xl border shadow-sm flex items-center gap-4">
          <div className="h-12 w-12 rounded-lg bg-green-500/10 flex items-center justify-center text-green-600">
            <ListChecks className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">
              {isRtl ? "إجمالي المعلمات" : "Total Parameters"}
            </p>
            <p className="text-2xl font-bold">{totalParameters}</p>
          </div>
        </div>
        <div className="bg-card p-4 rounded-xl border shadow-sm flex items-center gap-4">
          <div className="h-12 w-12 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-600">
            <TestTube2 className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">
              {isRtl ? "إجمالي الاختبارات" : "Total Tests"}
            </p>
            <p className="text-2xl font-bold">{totalTests}</p>
          </div>
        </div>
        <div className="bg-card p-4 rounded-xl border shadow-sm flex items-center gap-4">
          <div className="h-12 w-12 rounded-lg bg-violet-500/10 flex items-center justify-center text-violet-600">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">
              {isRtl ? "الفئات" : "Categories"}
            </p>
            <p className="text-2xl font-bold">{uniqueCategories}</p>
          </div>
        </div>
      </div>

      <DataTable
        data={specs}
        columns={columns}
        searchKey="name"
        searchPlaceholder={isRtl ? "البحث في المواصفات..." : "Search specifications..."}
      />

      {/* View dialog */}
      <Dialog open={!!viewTarget} onOpenChange={(o) => !o && setViewTarget(null)}>
        <DialogContent className="sm:max-w-[640px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" />
              {viewTarget?.name}
            </DialogTitle>
            <DialogDescription className="font-mono text-xs">
              {viewTarget?.code} · {viewTarget?.id}
            </DialogDescription>
          </DialogHeader>
          {viewTarget && (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-muted-foreground">
                    {isRtl ? "الفئة" : "Category"}
                  </p>
                  <p>{viewTarget.category || "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">
                    {isRtl ? "تاريخ الإصدار" : "Issuance Date"}
                  </p>
                  <p className="font-mono">{viewTarget.issuanceDate || "—"}</p>
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase">
                  {isRtl
                    ? `المعلمات (${viewTarget.parameters?.length || 0})`
                    : `Parameters (${viewTarget.parameters?.length || 0})`}
                </p>
                <div className="border rounded-md divide-y max-h-48 overflow-y-auto">
                  {viewTarget.parameters?.length ? (
                    viewTarget.parameters.map((p: any) => (
                      <div
                        key={p.parameterId}
                        className="px-3 py-2 flex justify-between items-center"
                      >
                        <div>
                          <p className="font-medium">{p.name}</p>
                          <p className="text-[10px] font-mono text-muted-foreground">
                            {p.method} · {p.unit}
                          </p>
                        </div>
                        <span className="text-xs font-mono text-muted-foreground">
                          {p.limitRange || `${p.min ?? ""}${p.min || p.max ? " - " : ""}${p.max ?? ""}`.trim() || "—"}
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="px-3 py-4 text-center text-muted-foreground italic">
                      {isRtl ? "لا توجد معلمات" : "No parameters"}
                    </p>
                  )}
                </div>
              </div>

              {viewTarget.tests?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase">
                    {isRtl
                      ? `الاختبارات (${viewTarget.tests.length})`
                      : `Tests (${viewTarget.tests.length})`}
                  </p>
                  <div className="border rounded-md divide-y max-h-40 overflow-y-auto">
                    {viewTarget.tests.map((t: any) => (
                      <div
                        key={t.testId}
                        className="px-3 py-2 flex justify-between items-center"
                      >
                        <p className="font-medium">{t.testName}</p>
                        <span className="text-[10px] font-mono text-muted-foreground">
                          {t.testCode} · {t.methodType}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewTarget(null)}>
              {isRtl ? "إغلاق" : "Close"}
            </Button>
            <Button
              onClick={() => {
                if (!viewTarget) return;
                const id = viewTarget.id;
                setViewTarget(null);
                setLocation(`/specifications/edit/${id}`);
              }}
            >
              <Pencil className="mr-2 h-4 w-4" />
              {isRtl ? "تعديل" : "Edit"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>
              {isRtl ? "تأكيد الحذف" : "Confirm Delete"}
            </DialogTitle>
            <DialogDescription>
              {isRtl
                ? `هل تريد بالتأكيد حذف المواصفة ${deleteTarget?.code}؟ لا يمكن التراجع عن هذا الإجراء.`
                : `Are you sure you want to delete specification ${deleteTarget?.code}? This action cannot be undone.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              {isRtl ? "إلغاء" : "Cancel"}
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              <Trash2 className="mr-2 h-4 w-4" />
              {isRtl ? "حذف" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
