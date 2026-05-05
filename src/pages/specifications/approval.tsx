
import { useState } from "react";
import { mockSpecifications } from "@/mock-data/specifications";
import { DataTable } from "@/components/shared/DataTable";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Eye } from "lucide-react";
import { useAppContext } from "@/context/AppContext";
import { StatusBadge } from "@/components/shared/StatusBadge";

export default function ApprovalQueue() {
  const { language } = useAppContext();
  const isRtl = language === 'ar';
  const pendingSpecs = mockSpecifications.filter(s => s.status === 'Pending');

  const columns = [
    { key: "code", header: isRtl ? "كود المواصفة" : "Code" },
    { key: "name", header: isRtl ? "الاسم" : "Name" },
    { key: "productName", header: isRtl ? "المنتج" : "Product" },
    { key: "createdBy", header: isRtl ? "بواسطة" : "Submitted By" },
    { key: "createdAt", header: isRtl ? "التاريخ" : "Date" },
    { 
      key: "actions", 
      header: "",
      render: (item: any) => (
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="text-green-600 hover:text-green-700 hover:bg-green-50">
            <CheckCircle2 className="mr-1 h-4 w-4" /> {isRtl ? "اعتماد" : "Approve"}
          </Button>
          <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50">
            <XCircle className="mr-1 h-4 w-4" /> {isRtl ? "رفض" : "Reject"}
          </Button>
          <Button variant="ghost" size="sm">
            <Eye className="h-4 w-4" />
          </Button>
        </div>
      )
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          {isRtl ? "قائمة الاعتماد" : "Specification Approval Queue"}
        </h1>
        <p className="text-muted-foreground mt-1">
          {isRtl ? "مراجعة واعتماد المواصفات الجديدة أو المحدثة" : "Review and authorize new or updated product specifications"}
        </p>
      </div>

      <DataTable 
        data={pendingSpecs} 
        columns={columns} 
        searchKey="name" 
        searchPlaceholder={isRtl ? "البحث في الطلبات..." : "Search pending requests..."}
      />
    </div>
  );
}
