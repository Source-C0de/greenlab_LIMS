import { useState } from "react";
import { mockInvoices as initialInvoices, mockClients, mockSamples } from "@/mock-data";
import { DataTable } from "@/components/shared/DataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { KpiCard } from "@/components/shared/KpiCard";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { FileText, Plus, CreditCard, AlertCircle, Loader2 } from "lucide-react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter,
  DialogDescription
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { useAppContext } from "@/context/AppContext";

const invoiceSchema = z.object({
  clientId: z.string().min(1, "Please select a client"),
  sampleId: z.string().optional(),
  subtotal: z.coerce.number().min(1, "Amount must be greater than 0"),
  dueDate: z.string().min(1, "Due date is required"),
});

type InvoiceFormValues = z.infer<typeof invoiceSchema>;

export default function InvoicesList() {
  const { language } = useAppContext();
  const [invoices, setInvoices] = useState(initialInvoices);
  const [isSubmiting, setIsSubmiting] = useState(false);
  const [open, setOpen] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors }
  } = useForm<InvoiceFormValues>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: {
      subtotal: 0,
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days from now
    }
  });

  const subtotal = watch("subtotal") || 0;
  const vat = subtotal * 0.15;
  const total = subtotal + vat;

  const onSubmit = (data: InvoiceFormValues) => {
    setIsSubmiting(true);
    setTimeout(() => {
      const client = mockClients.find(c => c.id === data.clientId);
      const newInvoice = {
        id: `INV-2024-${String(invoices.length + 1).padStart(4, '0')}`,
        clientId: data.clientId,
        clientName: client ? (language === 'ar' ? client.nameAr : client.nameEn) : "Unknown Client",
        sampleId: data.sampleId || "N/A",
        issueDate: new Date().toISOString().split('T')[0],
        dueDate: data.dueDate,
        subtotal: data.subtotal,
        vat: data.subtotal * 0.15,
        total: data.subtotal * 1.15,
        status: "Pending",
        vatNo: client?.vatNo || "N/A",
        qrCode: "mock-qr-data",
      };

      setInvoices([newInvoice, ...invoices]);
      setIsSubmiting(false);
      setOpen(false);
      reset();
      toast.success("Invoice created successfully");
    }, 1000);
  };
  
  const columns = [
    { 
      key: "id", 
      header: "Invoice No",
      render: (item: any) => <span className="font-mono font-medium">{item.id}</span>
    },
    { key: "clientName", header: "Client" },
    { 
      key: "amount", 
      header: "Total Amount",
      render: (item: any) => (
        <span className="font-bold">SAR {item.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
      )
    },
    { 
      key: "status", 
      header: "Status",
      render: (item: any) => <StatusBadge status={item.status} />
    },
    { key: "issueDate", header: "Issue Date" },
    { key: "dueDate", header: "Due Date" },
    { 
      key: "actions", 
      header: "",
      render: (item: any) => (
        <Link href={`/invoices/${item.id}`}>
          <Button variant="outline" size="sm">View Tax Invoice</Button>
        </Link>
      )
    },
  ];

  const totalRevenue = invoices.reduce((sum, inv) => sum + inv.total, 0);
  const outstanding = invoices.filter(i => i.status === 'Pending').reduce((sum, inv) => sum + inv.total, 0);
  const overdue = invoices.filter(i => i.status === 'Overdue').reduce((sum, inv) => sum + inv.total, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Billing & Invoices</h1>
          <p className="text-muted-foreground mt-1">Manage client billing and ZATCA-compliant tax invoices</p>
        </div>
        
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" /> Create Invoice
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Create New Tax Invoice</DialogTitle>
              <DialogDescription>
                Generate a ZATCA compliant tax invoice for laboratory services.
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="clientId">Client</Label>
                <Select onValueChange={(val) => setValue("clientId", val)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select client" />
                  </SelectTrigger>
                  <SelectContent>
                    {mockClients.map(c => (
                      <SelectItem key={c.id} value={c.id}>
                        {language === 'ar' ? c.nameAr : c.nameEn}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.clientId && <p className="text-xs text-destructive">{errors.clientId.message}</p>}
              </div>

              <div className="grid gap-2">
                <Label htmlFor="sampleId">Related Sample ID (Optional)</Label>
                <Input id="sampleId" placeholder="e.g. SAM-2024-001" {...register("sampleId")} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="subtotal">Subtotal (SAR)</Label>
                  <Input id="subtotal" type="number" step="0.01" {...register("subtotal")} />
                  {errors.subtotal && <p className="text-xs text-destructive">{errors.subtotal.message}</p>}
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="dueDate">Due Date</Label>
                  <Input id="dueDate" type="date" {...register("dueDate")} />
                  {errors.dueDate && <p className="text-xs text-destructive">{errors.dueDate.message}</p>}
                </div>
              </div>

              <div className="p-4 bg-muted/50 rounded-lg space-y-2 text-sm border">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>SAR {subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between font-medium">
                  <span className="text-muted-foreground">VAT (15%)</span>
                  <span>SAR {vat.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="border-t pt-2 flex justify-between font-bold text-lg text-primary">
                  <span>Total Amount</span>
                  <span>SAR {total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
              </div>

              <DialogFooter className="pt-4">
                <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={isSubmiting}>
                  {isSubmiting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating...
                    </>
                  ) : "Create Tax Invoice"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <KpiCard title="Total Billed (This Month)" value={`SAR ${totalRevenue.toLocaleString()}`} icon={<FileText />} />
        <KpiCard title="Outstanding" value={`SAR ${outstanding.toLocaleString()}`} icon={<CreditCard />} />
        <KpiCard title="Overdue" value={`SAR ${overdue.toLocaleString()}`} icon={<AlertCircle />} className="border-red-200 dark:border-red-900" />
      </div>

      <DataTable 
        data={invoices} 
        columns={columns} 
        searchKey="id" 
        searchPlaceholder="Search invoice number..."
      />
    </div>
  );
}

