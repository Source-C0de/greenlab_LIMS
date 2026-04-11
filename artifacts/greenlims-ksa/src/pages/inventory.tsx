import { mockReagents } from "@/mock-data";
import { DataTable } from "@/components/shared/DataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle, Plus, PackageOpen } from "lucide-react";
import { useAppContext } from "@/context/AppContext";

export default function InventoryList() {
  const { language } = useAppContext();
  const isRtl = language === "ar";

  const columns = [
    { 
      key: "name", 
      header: "Reagent / Material",
      render: (item: typeof mockReagents[0]) => (
        <div className="font-medium">
          {isRtl ? item.nameAr : item.name}
          <div className="text-xs text-muted-foreground font-normal">Supplier: {item.supplier}</div>
        </div>
      )
    },
    { key: "lotNo", header: "Lot Number" },
    { 
      key: "quantity", 
      header: "Stock Level",
      render: (item: typeof mockReagents[0]) => (
        <div className="flex items-center gap-2">
          <span className={`font-bold ${item.quantity <= item.minStock ? 'text-destructive' : ''}`}>
            {item.quantity} {item.unit}
          </span>
          <span className="text-xs text-muted-foreground">(Min: {item.minStock})</span>
        </div>
      )
    },
    { key: "expiryDate", header: "Expiry Date" },
    { 
      key: "status", 
      header: "Status",
      render: (item: typeof mockReagents[0]) => <StatusBadge status={item.status} />
    },
    { 
      key: "actions", 
      header: "",
      render: () => (
        <Button variant="outline" size="sm">Update</Button>
      )
    },
  ];

  const lowStock = mockReagents.filter(r => r.status === 'Low Stock' || r.status === 'Expired');

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reagent Inventory</h1>
          <p className="text-muted-foreground mt-1">Track laboratory consumables and reagents</p>
        </div>
        
        <Button>
          <Plus className="mr-2 h-4 w-4" /> Receive Items
        </Button>
      </div>

      {lowStock.length > 0 && (
        <Card className="bg-destructive/5 border-destructive/20">
          <CardContent className="p-4 flex items-start gap-4">
            <div className="p-2 bg-destructive/10 rounded-full">
              <AlertTriangle className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <h3 className="font-semibold text-destructive">Attention Required</h3>
              <p className="text-sm text-destructive/80 mt-1">
                You have {lowStock.length} items that are low on stock or expired. Please review and reorder.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <DataTable 
        data={mockReagents} 
        columns={columns} 
        searchKey="name" 
        searchPlaceholder="Search reagents..."
      />
    </div>
  );
}
