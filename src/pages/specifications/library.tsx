
import { useState } from "react";
import { parameterLibrary } from "@/mock-data/specifications";
import { DataTable } from "@/components/shared/DataTable";
import { Button } from "@/components/ui/button";
import { Plus, Filter, Download, BookOpen } from "lucide-react";
import { useAppContext } from "@/context/AppContext";

export default function ParameterLibrary() {
  const { language } = useAppContext();
  const isRtl = language === 'ar';
  const [params] = useState(parameterLibrary);

  const columns = [
    { 
      key: "id", 
      header: isRtl ? "كود المعلمة" : "Parameter ID",
      render: (item: any) => <span className="font-mono font-medium">{item.id}</span>
    },
    { key: "name", header: isRtl ? "اسم المعلمة" : "Parameter Name" },
    { key: "category", header: isRtl ? "الفئة" : "Category" },
    { key: "method", header: isRtl ? "الطريقة القياسية" : "Standard Method" },
    { key: "unit", header: isRtl ? "الوحدة" : "Unit" },
    { 
      key: "actions", 
      header: "",
      render: (item: any) => (
        <Button variant="ghost" size="sm">{isRtl ? "تعديل" : "Edit"}</Button>
      )
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {isRtl ? "مكتبة المعلمات" : "Parameter Master Library"}
          </h1>
          <p className="text-muted-foreground mt-1">
            {isRtl ? "قاعدة بيانات مركزية لجميع معلمات وطرق المختبر" : "Central database of all laboratory parameters and methods"}
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button>
            <Plus className="mr-2 h-4 w-4" /> {isRtl ? "إضافة معلمة" : "New Parameter"}
          </Button>
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" /> {isRtl ? "تصدير" : "Export"}
          </Button>
        </div>
      </div>

      <DataTable 
        data={params} 
        columns={columns} 
        searchKey="name" 
        searchPlaceholder={isRtl ? "البحث في المعلمات..." : "Search parameters..."}
      />
    </div>
  );
}
