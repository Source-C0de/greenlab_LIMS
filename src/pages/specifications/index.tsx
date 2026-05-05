
import { useState } from "react";
import { Link } from "wouter";
import { mockSpecifications } from "@/mock-data";
import { DataTable } from "@/components/shared/DataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { Plus, Filter, Download, History, CheckCircle2, BookOpen } from "lucide-react";
import { useAppContext } from "@/context/AppContext";
import { Badge } from "@/components/ui/badge";

export default function SpecificationList() {
  const { language } = useAppContext();
  const isRtl = language === 'ar';
  const [specs] = useState(mockSpecifications);

  const columns = [
    { 
      key: "code", 
      header: isRtl ? "كود المواصفة" : "Spec Code",
      render: (item: any) => <span className="font-mono font-medium">{item.code}</span>
    },
    { key: "name", header: isRtl ? "اسم المواصفة" : "Specification Name" },
    { key: "productName", header: isRtl ? "المنتج / المادة" : "Product / Material" },
    { 
      key: "version", 
      header: isRtl ? "الإصدار" : "Version",
      render: (item: any) => <Badge variant="secondary">v{item.version}</Badge>
    },
    { 
      key: "status", 
      header: isRtl ? "الحالة" : "Status",
      render: (item: any) => <StatusBadge status={item.status} />
    },
    { key: "effectiveDate", header: isRtl ? "تاريخ التفعيل" : "Effective Date" },
    { 
      key: "actions", 
      header: "",
      render: (item: any) => (
        <div className="flex gap-2">
          <Link href={`/specifications/edit/${item.id}`}>
            <Button variant="ghost" size="sm">{isRtl ? "تعديل" : "Edit"}</Button>
          </Link>
        </div>
      )
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
            {isRtl ? "تكوين وإدارة مواصفات المنتجات ومعايير الاختبار" : "Configure and manage product specifications and test standards"}
          </p>
        </div>
        
        <div className="flex flex-wrap gap-2">
          <Link href="/specifications/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" /> {isRtl ? "إضافة مواصفة" : "Add Specification"}
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
            <p className="text-sm text-muted-foreground">{isRtl ? "إجمالي المواصفات" : "Total Specs"}</p>
            <p className="text-2xl font-bold">{specs.length}</p>
          </div>
        </div>
        <div className="bg-card p-4 rounded-xl border shadow-sm flex items-center gap-4">
          <div className="h-12 w-12 rounded-lg bg-green-500/10 flex items-center justify-center text-green-600">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">{isRtl ? "النشطة" : "Active"}</p>
            <p className="text-2xl font-bold">{specs.filter(s => s.status === 'Active').length}</p>
          </div>
        </div>
        <div className="bg-card p-4 rounded-xl border shadow-sm flex items-center gap-4">
          <div className="h-12 w-12 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-600">
            <History className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">{isRtl ? "قيد الانتظار" : "Pending"}</p>
            <p className="text-2xl font-bold">{specs.filter(s => s.status === 'Pending').length}</p>
          </div>
        </div>
        <div className="bg-card p-4 rounded-xl border shadow-sm flex items-center gap-4">
          <div className="h-12 w-12 rounded-lg bg-gray-500/10 flex items-center justify-center text-gray-600">
            <Plus className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">{isRtl ? "مسودة" : "Draft"}</p>
            <p className="text-2xl font-bold">{specs.filter(s => s.status === 'Draft').length}</p>
          </div>
        </div>
      </div>

      <DataTable 
        data={specs} 
        columns={columns} 
        searchKey="name" 
        searchPlaceholder={isRtl ? "البحث في المواصفات..." : "Search specifications..."}
      />
    </div>
  );
}
