import { mockInvoices } from "@/mock-data";
import { DataTable } from "@/components/shared/DataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { KpiCard } from "@/components/shared/KpiCard";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { FileText, Plus, CreditCard, AlertCircle } from "lucide-react";

export default function InvoicesList() {
  
  const columns = [
    { 
      key: "id", 
      header: "Invoice No",
      render: (item: typeof mockInvoices[0]) => <span className="font-mono font-medium">{item.id}</span>
    },
    { key: "clientName", header: "Client" },
    { 
      key: "amount", 
      header: "Total Amount",
      render: (item: typeof mockInvoices[0]) => (
        <span className="font-bold">SAR {item.total.toLocaleString()}</span>
      )
    },
    { 
      key: "status", 
      header: "Status",
      render: (item: typeof mockInvoices[0]) => <StatusBadge status={item.status} />
    },
    { key: "issueDate", header: "Issue Date" },
    { key: "dueDate", header: "Due Date" },
    { 
      key: "actions", 
      header: "",
      render: (item: typeof mockInvoices[0]) => (
        <Link href={`/invoices/${item.id}`}>
          <Button variant="outline" size="sm">View Tax Invoice</Button>
        </Link>
      )
    },
  ];

  const totalRevenue = mockInvoices.reduce((sum, inv) => sum + inv.total, 0);
  const outstanding = mockInvoices.filter(i => i.status === 'Pending').reduce((sum, inv) => sum + inv.total, 0);
  const overdue = mockInvoices.filter(i => i.status === 'Overdue').reduce((sum, inv) => sum + inv.total, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Billing & Invoices</h1>
          <p className="text-muted-foreground mt-1">Manage client billing and ZATCA-compliant tax invoices</p>
        </div>
        
        <Button>
          <Plus className="mr-2 h-4 w-4" /> Create Invoice
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <KpiCard title="Total Billed (This Month)" value={`SAR ${totalRevenue.toLocaleString()}`} icon={<FileText />} />
        <KpiCard title="Outstanding" value={`SAR ${outstanding.toLocaleString()}`} icon={<CreditCard />} />
        <KpiCard title="Overdue" value={`SAR ${overdue.toLocaleString()}`} icon={<AlertCircle />} className="border-red-200 dark:border-red-900" />
      </div>

      <DataTable 
        data={mockInvoices} 
        columns={columns} 
        searchKey="id" 
        searchPlaceholder="Search invoice number..."
      />
    </div>
  );
}
