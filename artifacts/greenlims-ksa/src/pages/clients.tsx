import { mockClients } from "@/mock-data/clients";
import { DataTable } from "@/components/shared/DataTable";
import { Button } from "@/components/ui/button";
import { Plus, Building2, MapPin, Phone, Mail } from "lucide-react";
import { useAppContext } from "@/context/AppContext";

export default function ClientsList() {
  const { language } = useAppContext();
  const isRtl = language === "ar";

  const columns = [
    { 
      key: "name", 
      header: "Client Name",
      render: (item: typeof mockClients[0]) => (
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-md bg-primary/10 flex items-center justify-center text-primary shrink-0">
            <Building2 className="h-5 w-5" />
          </div>
          <div>
            <p className="font-medium">{isRtl ? item.nameAr : item.nameEn}</p>
            <p className="text-xs text-muted-foreground font-mono">VAT: {item.vatNo}</p>
          </div>
        </div>
      )
    },
    { key: "type", header: "Industry" },
    { 
      key: "contact", 
      header: "Contact",
      render: (item: typeof mockClients[0]) => (
        <div className="text-sm space-y-1">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Mail className="h-3.5 w-3.5" />
            <span>{item.email}</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Phone className="h-3.5 w-3.5" />
            <span>{item.phone}</span>
          </div>
        </div>
      )
    },
    { 
      key: "city", 
      header: "Location",
      render: (item: typeof mockClients[0]) => (
        <div className="flex items-center gap-1.5 text-sm">
          <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
          <span>{item.city}, KSA</span>
        </div>
      )
    },
    { 
      key: "actions", 
      header: "",
      render: () => (
        <Button variant="ghost" size="sm">Manage</Button>
      )
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Clients Directory</h1>
          <p className="text-muted-foreground mt-1">Manage laboratory clients and billing details</p>
        </div>
        
        <Button>
          <Plus className="mr-2 h-4 w-4" /> Add Client
        </Button>
      </div>

      <DataTable 
        data={mockClients} 
        columns={columns} 
        searchKey="nameEn" 
        searchPlaceholder="Search clients..."
      />
    </div>
  );
}
