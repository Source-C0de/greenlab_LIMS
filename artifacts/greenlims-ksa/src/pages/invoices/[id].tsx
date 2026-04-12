import { useParams, Link } from "wouter";
import { mockInvoices, mockInvoices as allInvoices } from "@/mock-data";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Printer, 
  Download, 
  ArrowLeft, 
  ShieldCheck, 
  QrCode, 
  FileText,
  Mail,
  Copy,
  AlertCircle
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { useAppContext } from "@/context/AppContext";
import { toast } from "sonner";
import { QrCodeMock } from "@/components/shared/QrCodeMock";
import { ZatcaService } from "@/lib/accounting-utils";

export default function InvoiceDetail() {
  const { id } = useParams();
  const { language } = useAppContext();
  const isRtl = language === "ar";
  
  const invoice = allInvoices.find(inv => inv.id === id) || allInvoices[0];

  const handlePrint = () => {
    window.print();
  };

  const handleCopyHash = () => {
    navigator.clipboard.writeText(invoice.hash);
    toast.success(isRtl ? "تم نسخ الهاش" : "Invoice hash copied to clipboard");
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      <div className="flex justify-between items-center no-print">
        <Link href="/invoices">
          <Button variant="ghost">
            <ArrowLeft className={`h-4 w-4 ${isRtl ? 'ml-2 rotate-180' : 'mr-2'}`} />
            {isRtl ? "العودة للفواتير" : "Back to Invoices"}
          </Button>
        </Link>
        <div className="flex gap-2">
           <Button variant="outline" onClick={() => toast.info(isRtl ? "جاري الإرسال للبريد..." : "Sending to client email...")}>
            <Mail className="h-4 w-4 mr-2" /> {isRtl ? "إرسال" : "Send"}
          </Button>
          <Button variant="outline" onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-2" /> {isRtl ? "طباعة" : "Print"}
          </Button>
          <Button>
            <Download className="h-4 w-4 mr-2" /> {isRtl ? "تحميل PDF" : "Download PDF"}
          </Button>
        </div>
      </div>

      <Card className="border-2 shadow-xl print:shadow-none print:border-none overflow-hidden">
        {/* Invoice Header Stripe */}
        <div className="bg-primary h-2 w-full" />
        
        <CardContent className="p-8 md:p-12 space-y-10">
          {/* Header Section */}
          <div className="flex flex-col md:flex-row justify-between gap-8">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="bg-primary text-white p-2 rounded-lg font-bold text-xl">GL</div>
                <div>
                  <h1 className="text-2xl font-bold tracking-tighter">GreenLabLIMS <span className="font-light">KSA</span></h1>
                  <p className="text-xs text-muted-foreground uppercase font-bold tracking-widest">Laboratory & Diagnostic Centers</p>
                </div>
              </div>
              <div className="text-sm space-y-1">
                <p>Kingdom of Saudi Arabia, Riyadh</p>
                <p>Tax Number / الرقم الضريبي: <span className="font-mono font-bold">300012345600003</span></p>
                <p>CR / رقم السجل التجاري: <span className="font-mono">1010887766</span></p>
              </div>
            </div>

            <div className="text-right space-y-2">
              <h2 className="text-4xl font-black text-primary/10 uppercase tracking-tighter absolute right-12 top-10 opacity-50 select-none">
                {invoice.invoiceType === 'Tax Invoice' ? (isRtl ? 'فاتورة ضريبية' : 'Tax Invoice') : (isRtl ? 'فاتورة مبسطة' : 'Simplified Invoice')}
              </h2>
              <div className="relative z-10">
                <Badge variant="outline" className="mb-2 uppercase tracking-widest bg-muted/50 border-primary/20">
                  {invoice.invoiceType}
                </Badge>
                <h3 className="text-xl font-mono font-bold">{invoice.id}</h3>
                <p className="text-sm text-muted-foreground">{isRtl ? "تاريخ الإصدار: " : "Issue Date: "} {invoice.issueDate}</p>
                <div className="mt-2">
                  <StatusBadge status={invoice.status} />
                </div>
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-12 pt-8 border-t border-dashed">
             {/* Client Info */}
             <div className="space-y-4">
               <h4 className="text-xs font-bold uppercase tracking-widest text-primary/60 border-b pb-1">{isRtl ? "بيانات العميل" : "BILL TO"}</h4>
               <div className="space-y-1">
                 <p className="text-xl font-bold">{invoice.clientName}</p>
                 <p className="text-sm">Vat No / الرقم الضريي: <span className="font-mono font-bold">{invoice.vatNo}</span></p>
                 <p className="text-sm text-muted-foreground">Saudi Arabia, Riyadh Branch</p>
               </div>
             </div>

             {/* ZATCA Phase 2 Metrics */}
             <div className="p-4 bg-muted/30 rounded-lg border border-primary/10 flex items-start gap-4">
               <ShieldCheck className="h-5 w-5 text-emerald-500 mt-1 shrink-0" />
               <div className="space-y-2 flex-1">
                 <p className="text-xs font-bold uppercase">{isRtl ? "الامتثال لهيئة الزكاة (الفوترة الإلكترونية)" : "ZATCA E-Invoicing Compliance"}</p>
                 <div className="space-y-1">
                   <p className="text-[10px] text-muted-foreground font-mono">UUID: {invoice.uuid}</p>
                   <div className="flex items-center gap-2">
                      <p className="text-[10px] text-muted-foreground font-mono truncate max-w-[200px]">HASH: {invoice.hash}</p>
                      <Button variant="ghost" size="icon" className="h-4 w-4" onClick={handleCopyHash}>
                        <Copy className="h-3 w-3" />
                      </Button>
                   </div>
                 </div>
                 {invoice.isReported && (
                   <Badge className="bg-emerald-500 hover:bg-emerald-600 text-[10px]"><ShieldCheck className="h-3 w-3 mr-1" /> Reported to ZATCA</Badge>
                 )}
               </div>
             </div>
          </div>

          {/* Line Items */}
          <div className="pt-8">
            <table className="w-full text-left rtl:text-right">
              <thead>
                <tr className="border-b-2 border-primary/20 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                  <th className="py-2">{isRtl ? "الخدمة / المنتج" : "Service / Product"}</th>
                  <th className="py-2 text-right">{isRtl ? "الكمية" : "Qty"}</th>
                  <th className="py-2 text-right">{isRtl ? "سعر الوحدة" : "Unit Price"}</th>
                  <th className="py-2 text-right">{isRtl ? "الضريبة" : "Tax (15%)"}</th>
                  <th className="py-2 text-right">{isRtl ? "الإجمالي" : "Total"}</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b transition-colors hover:bg-muted/30">
                  <td className="py-4 font-medium">
                    <p>{isRtl ? "فحوصات مختبرية شاملة" : "Comprehensive Laboratory Testing Service"}</p>
                    <p className="text-xs text-muted-foreground font-mono">{invoice.sampleId}</p>
                  </td>
                  <td className="py-4 text-right">1</td>
                  <td className="py-4 text-right">SAR {invoice.subtotal.toLocaleString()}</td>
                  <td className="py-4 text-right">SAR {invoice.vat.toLocaleString()}</td>
                  <td className="py-4 text-right font-bold">SAR {invoice.total.toLocaleString()}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Totals Section */}
          <div className="flex flex-col md:flex-row justify-between gap-8 pt-8">
             <div className="flex flex-col gap-4">
                <div className="p-4 bg-muted/50 rounded flex items-center gap-4 border border-dashed border-primary/20">
                   <QrCodeMock value={ZatcaService.generateQR(invoice)} size={120} />
                   <div>
                     <p className="text-[10px] font-bold uppercase tracking-tight text-muted-foreground mb-1">{isRtl ? "رمز الاستجابة السريع" : "ZATCA QR Code"}</p>
                     <p className="text-[9px] text-muted-foreground max-w-[150px] leading-tight">
                       {isRtl ? "وفقاً لمتطلبات فاتورة - المرحلة الأولى (البناء الضريبي)." : "Per Fatoora requirements - Phase 1 & 2 construction."}
                     </p>
                   </div>
                </div>
                {!invoice.isReported && (
                  <div className="flex items-center gap-2 text-amber-600 font-bold text-xs bg-amber-50 p-2 rounded no-print">
                    <AlertCircle className="h-4 w-4" />
                    <span>{isRtl ? "مسودة فاتورة - لم يتم الإبلاغ للهيئة بعد" : "Draft Invoice - Not yet reported to ZATCA"}</span>
                  </div>
                )}
             </div>

             <div className="w-full md:w-64 space-y-3">
               <div className="flex justify-between text-sm">
                 <span className="text-muted-foreground">{isRtl ? "المجموع الفرعي" : "Subtotal"}</span>
                 <span className="font-medium text-right font-mono">SAR {invoice.subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
               </div>
               <div className="flex justify-between text-sm">
                 <span className="text-muted-foreground tracking-tighter">{isRtl ? "ضريبة القيمة المضافة (15%)" : "VAT TOTAL (15%)"}</span>
                 <span className="font-medium text-right font-mono">SAR {invoice.vat.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
               </div>
               <div className="flex justify-between text-xl font-black text-primary border-t-2 border-primary pt-3">
                 <span>{isRtl ? "الإجمالي المستحق" : "GRAND TOTAL"}</span>
                 <span className="font-mono">SAR {invoice.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
               </div>
               <div className="text-[10px] text-right text-muted-foreground font-medium pt-2 italic">
                 {isRtl ? "تم تفقيط المبلغ آلياً بالريال السعودي" : "Amount In Words: Saudi Riyals Only"}
               </div>
             </div>
          </div>

          {/* Footer Branding */}
          <div className="pt-24 text-center space-y-4">
             <div className="flex justify-center gap-24 text-center">
               <div className="w-48">
                 <div className="h-1px bg-black mb-1" />
                 <p className="text-[10px] font-bold tracking-widest">{isRtl ? "المحاسب المسؤول" : "ACCOUNTANT SIGNATURE"}</p>
               </div>
               <div className="w-48">
                 <div className="h-1px bg-black mb-1" />
                 <p className="text-[10px] font-bold tracking-widest">{isRtl ? "ختم المختبر" : "LABORATORY STAMP"}</p>
               </div>
             </div>
             <p className="text-[10px] text-muted-foreground pt-12">
               This is a ZATCA compliant electronic invoice. Generated by GreenLabLIMS ERP Integration.
               <br />
               هذه فاتورة ضريبية إلكترونية متوافقة مع متطلبات هيئة الزكاة والضريبة والجمارك.
             </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
