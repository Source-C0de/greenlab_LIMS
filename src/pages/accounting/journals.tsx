import { mockJournals } from "@/mock-data";
import { DataTable } from "@/components/shared/DataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { Plus, FileText, Download, Filter } from "lucide-react";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  CardDescription
} from "@/components/ui/card";
import { useAppContext } from "@/context/AppContext";

export default function JournalsPage() {
  const { language } = useAppContext();
  const isRtl = language === "ar";

  const columns = [
    { 
      key: "date", 
      header: isRtl ? "التاريخ" : "Date",
      render: (item: any) => <span className="text-sm">{item.date}</span>
    },
    { 
      key: "id", 
      header: isRtl ? "رقم القيد" : "Journal No",
      render: (item: any) => <span className="font-mono font-medium text-primary">{item.id}</span>
    },
    { 
      key: "description", 
      header: isRtl ? "الوصف" : "Description",
      render: (item: any) => <span className="text-sm font-medium">{item.description}</span>
    },
    { 
      key: "reference", 
      header: isRtl ? "المرجع" : "Reference" 
    },
    { 
      key: "amount", 
      header: isRtl ? "المبلغ" : "Amount",
      render: (item: any) => {
        const total = item.lines.reduce((sum: number, line: any) => sum + line.debit, 0);
        return <span className="font-bold">SAR {total.toLocaleString()}</span>
      }
    },
    { 
      key: "status", 
      header: isRtl ? "الحالة" : "Status",
      render: (item: any) => <StatusBadge status={item.status} />
    },
    {
      key: "actions",
      header: "",
      render: (item: any) => (
        <Button variant="ghost" size="sm">
          {isRtl ? "عرض التفاصيل" : "View Details"}
        </Button>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {isRtl ? "قيود اليعومية العامة" : "General Journal"}
          </h1>
          <p className="text-muted-foreground mt-1">
            {isRtl ? "إدارة وتسجيل جميع الحركات المالية المزدوجة" : "Manage and record all double-entry financial transactions"}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" /> {isRtl ? "تصدير" : "Export"}
          </Button>
          <Button>
            <Plus className="mr-2 h-4 w-4" /> {isRtl ? "قيد يدوي جديد" : "New Manual Entry"}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>{isRtl ? "سجل القيود" : "Journal Log"}</CardTitle>
            <CardDescription>{isRtl ? "قائمة بجميع العمليات المالية المرحلة والمسودة" : "List of all posted and draft financial operations"}</CardDescription>
          </div>
          <Button variant="outline" size="sm">
            <Filter className="mr-2 h-4 w-4" /> {isRtl ? "تصفية" : "Filter"}
          </Button>
        </CardHeader>
        <CardContent>
          <DataTable 
            data={mockJournals} 
            columns={columns} 
            searchKey="description" 
            searchPlaceholder={isRtl ? "البحث في الوصف..." : "Search description..."}
          />
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="bg-primary/5 border-primary/20">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              {isRtl ? "التدقيق المالي" : "Financial Auditing"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {isRtl 
                ? "يتم إنشاء جميع قيود الفواتير والمدفوعات آلياً لضمان سلامة البيانات وفق معايير هيئة الزكاة والضريبة والجمارك." 
                : "All invoice and payment entries are automatically generated to ensure data integrity per ZATCA standards."}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
