import { useState } from "react";
import { mockInvoices as initialInvoices, mockClients } from "@/mock-data";
import { DataTable } from "@/components/shared/DataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { KpiCard } from "@/components/shared/KpiCard";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { 
  FileText, 
  Plus, 
  CreditCard, 
  AlertCircle, 
  Loader2, 
  Send, 
  QrCode,
  ShieldCheck,
  Building2,
  Users2
} from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import { ZatcaService, AccountingEngine } from "@/lib/accounting-utils";

const invoiceSchema = z.object({
  clientId: z.string().min(1, "Please select a client"),
  invoiceType: z.enum(['Tax Invoice', 'Simplified Tax Invoice']),
  subtotal: z.coerce.number().min(1, "Amount must be greater than 0"),
  dueDate: z.string().min(1, "Due date is required"),
});

type InvoiceFormValues = z.infer<typeof invoiceSchema>;

export default function InvoicesList() {
  const { language } = useAppContext();
  const isRtl = language === "ar";
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
      invoiceType: 'Tax Invoice',
      subtotal: 0,
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    }
  });

  const subtotal = watch("subtotal") || 0;
  const vat = subtotal * 0.15;
  const total = subtotal + vat;

  const onSubmit = (data: InvoiceFormValues) => {
    setIsSubmiting(true);
    setTimeout(() => {
      const client = mockClients.find(c => c.id === data.clientId);
      const newInvoice: any = {
        id: `INV-2024-${String(invoices.length + 1).padStart(4, '0')}`,
        clientId: data.clientId,
        clientName: client ? (language === 'ar' ? client.nameAr : client.nameEn) : "Unknown Client",
        sampleId: "N/A",
        issueDate: new Date().toISOString().split('T')[0],
        dueDate: data.dueDate,
        subtotal: data.subtotal,
        vat: data.subtotal * 0.15,
        total: data.subtotal * 1.15,
        status: "Pending",
        vatNo: client?.vatNo || "N/A",
        // ZATCA Fields
        uuid: crypto.randomUUID(),
        invoiceType: data.invoiceType,
        hash: ZatcaService.generateHash({}),
        isReported: false,
        qrCode: "MOCKED_QR"
      };

      setInvoices([newInvoice, ...invoices]);
      setIsSubmiting(false);
      setOpen(false);
      reset();
      toast.success(isRtl ? "تم إنشاء الفاتورة وترحيلها محاسبياً" : "Invoice created and posted to ledger");
    }, 1000);
  };

  const handleReportToZatca = async (id: string) => {
    const reportingToast = toast.loading(isRtl ? "جاري الإبلاغ لهيئة الزكاة..." : "Reporting to ZATCA Fatoora...");
    const result = await ZatcaService.reportToZatca({ id });
    
    if (result.success) {
      setInvoices(prev => prev.map(inv => inv.id === id ? { ...inv, isReported: true } : inv));
      toast.dismiss(reportingToast);
      toast.success(isRtl ? "تم القبول برقم IRN: " + result.irn : "Reported successfully. IRN: " + result.irn);
    }
  };
  
  const columns = [
    { 
      key: "id", 
      header: isRtl ? "رقم الفاتورة" : "Invoice No",
      render: (item: any) => (
        <div className="flex flex-col">
          <span className="font-mono font-medium text-primary">{item.id}</span>
          <span className="text-[10px] text-muted-foreground font-mono truncate w-24">{item.uuid}</span>
        </div>
      )
    },
    { 
      key: "clientName", 
      header: isRtl ? "العميل" : "Client",
      render: (item: any) => (
        <div className="flex items-center gap-2">
          {item.invoiceType === 'Tax Invoice' ? <Building2 className="h-3 w-3 text-blue-500" /> : <Users2 className="h-3 w-3 text-amber-500" />}
          <span className="text-sm font-medium">{item.clientName}</span>
        </div>
      )
    },
    { 
      key: "total", 
      header: isRtl ? "الإجمالي" : "Total Amount",
      render: (item: any) => (
        <div className="flex flex-col items-end">
          <span className="font-bold">SAR {item.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
          <span className="text-[10px] text-muted-foreground">VAT: {item.vat.toLocaleString()}</span>
        </div>
      )
    },
    { 
      key: "type", 
      header: isRtl ? "النوع" : "Type",
      render: (item: any) => (
        <Badge variant={item.invoiceType === 'Tax Invoice' ? 'default' : 'secondary'} className="text-[10px] py-0">
          {item.invoiceType === 'Tax Invoice' ? (isRtl ? 'ضريبية' : 'Tax') : (isRtl ? 'مبسطة' : 'Simplified')}
        </Badge>
      )
    },
    { 
      key: "zatca", 
      header: "ZATCA",
      render: (item: any) => (
        <div className="flex items-center gap-2">
          {item.isReported ? (
             <ShieldCheck className="h-4 w-4 text-emerald-500" />
          ) : (
             <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleReportToZatca(item.id)}>
               <Send className="h-3 w-3 text-amber-500" />
             </Button>
          )}
        </div>
      )
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
        <Link href={`/invoices/${item.id}`}>
          <Button variant="outline" size="sm">{isRtl ? "عرض" : "View"}</Button>
        </Link>
      )
    },
  ];

  const paidCount = invoices.filter(i => i.status === 'Paid').length;
  const pendingCount = invoices.filter(i => i.status === 'Pending').length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{isRtl ? "الفواتير والتحصيل" : "Invoicing & Revenue"}</h1>
          <p className="text-muted-foreground mt-1">
            {isRtl ? "إدارة الفواتير الضريبية المتوافقة مع متطلبات هيئة الزكاة" : "Manage ZATCA-compliant tax invoices and revenue collection"}
          </p>
        </div>
        
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary/90">
              <Plus className="mr-2 h-4 w-4" /> {isRtl ? "فاتورة جديدة" : "Create Invoice"}
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>{isRtl ? "إنشاء فاتورة ضريبية" : "Create Tax Invoice"}</DialogTitle>
              <DialogDescription>
                {isRtl ? "إصدار فاتورة متوافقة مع نظام فاتورة (المرحلة الثانية)" : "Issue an invoice compliant with ZATCA Fatoora Phase 2"}
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-4">
               <div className="grid gap-2">
                <Label>{isRtl ? "نوع الفاتورة" : "Invoice Type"}</Label>
                <div className="grid grid-cols-2 gap-4">
                  <div 
                    className={`cursor-pointer p-3 border rounded-lg transition-all ${watch('invoiceType') === 'Tax Invoice' ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'hover:bg-muted'}`}
                    onClick={() => setValue('invoiceType', 'Tax Invoice')}
                  >
                    <Building2 className={`h-4 w-4 mb-1 ${watch('invoiceType') === 'Tax Invoice' ? 'text-primary' : 'text-muted-foreground'}`} />
                    <p className="text-xs font-bold">{isRtl ? "فاتورة ضريبية (B2B)" : "Tax Invoice (B2B)"}</p>
                  </div>
                  <div 
                    className={`cursor-pointer p-3 border rounded-lg transition-all ${watch('invoiceType') === 'Simplified Tax Invoice' ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'hover:bg-muted'}`}
                    onClick={() => setValue('invoiceType', 'Simplified Tax Invoice')}
                  >
                    <Users2 className={`h-4 w-4 mb-1 ${watch('invoiceType') === 'Simplified Tax Invoice' ? 'text-primary' : 'text-muted-foreground'}`} />
                    <p className="text-xs font-bold">{isRtl ? "فاتورة مبسطة (B2C)" : "Simplified (B2C)"}</p>
                  </div>
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="clientId">{isRtl ? "العميل" : "Client"}</Label>
                <Select onValueChange={(val) => setValue("clientId", val)}>
                  <SelectTrigger>
                    <SelectValue placeholder={isRtl ? "اختر العميل" : "Select client"} />
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

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="subtotal">{isRtl ? "المبلغ (ريال)" : "Subtotal (SAR)"}</Label>
                  <Input id="subtotal" type="number" step="0.01" {...register("subtotal")} />
                  {errors.subtotal && <p className="text-xs text-destructive">{errors.subtotal.message}</p>}
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="dueDate">{isRtl ? "تاريخ الاستحقاق" : "Due Date"}</Label>
                  <Input id="dueDate" type="date" {...register("dueDate")} />
                  {errors.dueDate && <p className="text-xs text-destructive">{errors.dueDate.message}</p>}
                </div>
              </div>

              <div className="p-4 bg-muted/50 rounded-lg space-y-2 text-sm border">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{isRtl ? "المجموع الفرعي" : "Subtotal"}</span>
                  <span>SAR {subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between font-medium">
                  <span className="text-muted-foreground">{isRtl ? "الضريبة (15%)" : "VAT (15%)"}</span>
                  <span>SAR {vat.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="border-t pt-2 flex justify-between font-bold text-lg text-primary">
                  <span>{isRtl ? "الإجمالي" : "Grand Total"}</span>
                  <span>SAR {total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
              </div>

              <DialogFooter className="pt-4">
                <Button type="button" variant="ghost" onClick={() => setOpen(false)}>{isRtl ? "إلغاء" : "Cancel"}</Button>
                <Button type="submit" disabled={isSubmiting}>
                  {isSubmiting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (isRtl ? "إصدار الفاتورة" : "Issue Invoice")}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <KpiCard 
          title={isRtl ? "الفواتير المدفوعة" : "Paid Invoices"} 
          value={paidCount.toString()} 
          icon={<ShieldCheck className="text-emerald-500" />} 
        />
        <KpiCard 
          title={isRtl ? "بانتظار التحصيل" : "Pending Collection"} 
          value={pendingCount.toString()} 
          icon={<CreditCard className="text-amber-500" />} 
        />
        <KpiCard 
          title={isRtl ? "فواتير بانتظار الربط" : "Waiting for ZATCA"} 
          value={invoices.filter(i => !i.isReported).length.toString()} 
          icon={<QrCode className="text-blue-500" />} 
        />
      </div>

      <DataTable 
        data={invoices} 
        columns={columns} 
        searchKey="id" 
        searchPlaceholder={isRtl ? "بحث في رقم الفاتورة..." : "Search invoice number..."}
      />
    </div>
  );
}
