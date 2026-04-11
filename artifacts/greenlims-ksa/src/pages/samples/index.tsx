import { useState } from "react";
import { Link } from "wouter";
import { mockSamples } from "@/mock-data";
import { DataTable } from "@/components/shared/DataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { Plus, Filter, Download } from "lucide-react";
import { useAppContext } from "@/context/AppContext";

export default function SamplesList() {
  const { currentRole, language } = useAppContext();
  const isRtl = language === "ar";
  
  const columns = [
    { 
      key: "id", 
      header: "Sample ID",
      render: (item: any) => <span className="font-mono font-medium">{item.id}</span>
    },
    { key: "clientName", header: "Client" },
    { key: "sampleType", header: "Type" },
    { 
      key: "status", 
      header: "Status",
      render: (item: any) => <StatusBadge status={item.status} />
    },
    { 
      key: "priority", 
      header: "Priority",
      render: (item: any) => {
        const color = item.priority === 'Urgent' ? 'text-red-600' : 
                      item.priority === 'High' ? 'text-amber-600' : 'text-muted-foreground';
        return <span className={`font-medium text-sm ${color}`}>{item.priority}</span>;
      }
    },
    { key: "receivedDate", header: "Received Date" },
    { 
      key: "actions", 
      header: "",
      render: (item: any) => (
        <Link href={`/samples/${item.id}`}>
          <Button variant="ghost" size="sm">View</Button>
        </Link>
      )
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Samples Management</h1>
          <p className="text-muted-foreground mt-1">Manage and track all laboratory samples</p>
        </div>
        
        <div className="flex gap-2 w-full sm:w-auto">
          <Button variant="outline">
            <Filter className="mr-2 h-4 w-4" /> Filter
          </Button>
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" /> Export
          </Button>
          {(currentRole === "admin" || currentRole === "lab_manager" || currentRole === "client") && (
            <Button>
              <Plus className="mr-2 h-4 w-4" /> New Sample
            </Button>
          )}
        </div>
      </div>

      <DataTable 
        data={mockSamples} 
        columns={columns} 
        searchKey="id" 
        searchPlaceholder="Search sample ID..."
      />
    </div>
  );
}
