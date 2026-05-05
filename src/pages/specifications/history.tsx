
import { useState } from "react";
import { mockSpecifications } from "@/mock-data/specifications";
import { DataTable } from "@/components/shared/DataTable";
import { Button } from "@/components/ui/button";
import { History, Eye, RotateCcw } from "lucide-react";
import { useAppContext } from "@/context/AppContext";
import { Badge } from "@/components/ui/badge";

export default function VersionHistory() {
  const { language } = useAppContext();
  const isRtl = language === 'ar';
  
  // Mock history data
  const historyData = [
    { id: '1', code: 'SPEC-DW-001', name: 'Drinking Water Standard', version: '2.0', date: '2024-04-15', user: 'Admin', change: 'Updated pH limits' },
    { id: '2', code: 'SPEC-DW-001', name: 'Drinking Water Standard', version: '1.1', date: '2024-02-10', user: 'Lab Manager', change: 'Added Chloride parameter' },
    { id: '3', code: 'SPEC-DW-001', name: 'Drinking Water Standard', version: '1.0', date: '2023-12-15', user: 'Admin', change: 'Initial Release' },
  ];

  const columns = [
    { key: "code", header: isRtl ? "كود المواصفة" : "Code" },
    { 
      key: "version", 
      header: isRtl ? "الإصدار" : "Version",
      render: (item: any) => <Badge variant="secondary">v{item.version}</Badge>
    },
    { key: "date", header: isRtl ? "التاريخ" : "Date" },
    { key: "user", header: isRtl ? "المستخدم" : "Changed By" },
    { key: "change", header: isRtl ? "التعديل" : "Change Description" },
    { 
      key: "actions", 
      header: "",
      render: (item: any) => (
        <div className="flex gap-2">
          <Button variant="ghost" size="sm">
            <Eye className="mr-1 h-4 w-4" /> {isRtl ? "عرض" : "View"}
          </Button>
          <Button variant="ghost" size="sm" className="text-blue-600">
            <RotateCcw className="mr-1 h-4 w-4" /> {isRtl ? "استعادة" : "Restore"}
          </Button>
        </div>
      )
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <History className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {isRtl ? "سجل الإصدارات" : "Version Control & History"}
          </h1>
          <p className="text-muted-foreground mt-1">
            {isRtl ? "تتبع جميع التغييرات والمراجعات في مواصفات المختبر" : "Track all changes and revisions in laboratory specifications"}
          </p>
        </div>
      </div>

      <DataTable 
        data={historyData} 
        columns={columns} 
        searchKey="code" 
        searchPlaceholder={isRtl ? "البحث بالكود..." : "Search by code..."}
      />
    </div>
  );
}
