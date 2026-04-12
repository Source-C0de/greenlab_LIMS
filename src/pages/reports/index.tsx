import { mockReports } from "@/mock-data";
import { DataTable } from "@/components/shared/DataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { Filter, Download, FileText } from "lucide-react";
import { Link } from "wouter";

export default function ReportsList() {
  const columns = [
    { 
      key: "id", 
      header: "Report ID",
      render: (item: typeof mockReports[0]) => (
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-muted-foreground" />
          <span className="font-mono font-medium text-primary">{item.id}</span>
        </div>
      )
    },
    { 
      key: "sampleId", 
      header: "Sample ID",
      render: (item: typeof mockReports[0]) => <span className="font-mono text-sm">{item.sampleId}</span>
    },
    { key: "clientName", header: "Client" },
    { key: "testType", header: "Test Type" },
    { 
      key: "status", 
      header: "Status",
      render: (item: typeof mockReports[0]) => <StatusBadge status={item.status} />
    },
    { 
      key: "issueDate", 
      header: "Issue Date",
      render: (item: typeof mockReports[0]) => item.issueDate || <span className="text-muted-foreground italic">Pending</span>
    },
    { 
      key: "actions", 
      header: "",
      render: (item: typeof mockReports[0]) => (
        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="sm" className="hidden lg:flex">
            <Download className="mr-2 h-4 w-4" /> PDF
          </Button>
          <Link href={`/reports/${item.id}`}>
            <Button variant="outline" size="sm">View COA</Button>
          </Link>
        </div>
      )
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Certificates of Analysis</h1>
          <p className="text-muted-foreground mt-1">View and manage final laboratory reports</p>
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline">
            <Filter className="mr-2 h-4 w-4" /> Filter
          </Button>
        </div>
      </div>

      <DataTable 
        data={mockReports} 
        columns={columns} 
        searchKey="id" 
        searchPlaceholder="Search report ID..."
      />
    </div>
  );
}
