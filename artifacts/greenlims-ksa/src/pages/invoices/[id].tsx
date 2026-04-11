import { useParams } from "wouter";
import { mockInvoices, mockSamples } from "@/mock-data";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { QrCodeMock } from "@/components/shared/QrCodeMock";
import { Printer, Download, CreditCard } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/shared/StatusBadge";

export default function InvoiceDetail() {
  const params = useParams();
  const invoiceId = params.id;
  const invoice = mockInvoices.find(i => i.id === invoiceId) || mockInvoices[0];
  const sample = mockSamples.find(s => s.id === invoice.sampleId) || mockSamples[0];

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6 no-print">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold">Invoice Details</h1>
          <StatusBadge status={invoice.status} />
        </div>
        <div className="flex gap-2">
          {invoice.status !== 'Paid' && (
            <Button variant="default" className="bg-emerald-600 hover:bg-emerald-700">
              <CreditCard className="mr-2 h-4 w-4" /> Record Payment
            </Button>
          )}
          <Button variant="outline" onClick={() => window.print()}>
            <Printer className="mr-2 h-4 w-4" /> Print
          </Button>
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" /> XML
          </Button>
        </div>
      </div>

      <Card className="bg-white text-black print:shadow-none print:border-none rounded-none border-t-8 border-t-emerald-800">
        <CardContent className="p-8 sm:p-12">
          
          <div className="flex justify-between items-start mb-12">
            <div className="text-center flex-1">
              <h2 className="text-2xl font-bold uppercase tracking-wider text-emerald-900 mb-1">Tax Invoice</h2>
              <h2 className="text-2xl font-bold text-emerald-900 mb-4" dir="rtl">فاتورة ضريبية</h2>
              <div className="inline-block border border-gray-300 px-4 py-1 rounded bg-gray-50 text-sm font-mono">
                {invoice.id}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-8 mb-12 border-y border-gray-200 py-8">
            <div className="md:col-span-2 space-y-4">
              <div>
                <h3 className="font-bold text-gray-500 text-xs uppercase">Supplier / المورد</h3>
                <p className="font-bold text-lg text-emerald-900 mt-1">GreenLIMS KSA</p>
                <p className="text-sm">Riyadh, Kingdom of Saudi Arabia</p>
                <div className="mt-2 text-sm font-mono bg-gray-50 p-2 rounded inline-block">
                  <span className="text-gray-500">VAT No:</span> 300000000000003
                </div>
              </div>
            </div>

            <div className="md:col-span-2 space-y-4">
              <div>
                <h3 className="font-bold text-gray-500 text-xs uppercase">Customer / العميل</h3>
                <p className="font-bold text-lg mt-1">{invoice.clientName}</p>
                <p className="text-sm">Kingdom of Saudi Arabia</p>
                <div className="mt-2 text-sm font-mono bg-gray-50 p-2 rounded inline-block">
                  <span className="text-gray-500">VAT No:</span> {invoice.vatNo}
                </div>
              </div>
            </div>

            <div className="md:col-span-1 flex justify-end items-start">
              <QrCodeMock value={`ZATCA_TLV_MOCK_${invoice.id}`} size={120} />
            </div>
          </div>

          <div className="flex justify-between mb-8 text-sm">
            <div>
              <span className="text-gray-500 block mb-1">Issue Date / تاريخ الإصدار</span>
              <span className="font-bold">{invoice.issueDate}</span>
            </div>
            <div className="text-right">
              <span className="text-gray-500 block mb-1">Due Date / تاريخ الاستحقاق</span>
              <span className="font-bold">{invoice.dueDate}</span>
            </div>
          </div>

          <Table className="mb-8 border border-gray-200">
            <TableHeader className="bg-emerald-900">
              <TableRow className="hover:bg-emerald-900">
                <TableHead className="text-white font-bold py-3 w-[50%]">Description <span dir="rtl" className="block text-xs font-normal opacity-80">الوصف</span></TableHead>
                <TableHead className="text-white font-bold py-3 text-center">Qty <span dir="rtl" className="block text-xs font-normal opacity-80">الكمية</span></TableHead>
                <TableHead className="text-white font-bold py-3 text-right">Unit Price <span dir="rtl" className="block text-xs font-normal opacity-80">سعر الوحدة</span></TableHead>
                <TableHead className="text-white font-bold py-3 text-right">Amount (SAR) <span dir="rtl" className="block text-xs font-normal opacity-80">المبلغ</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell>
                  <p className="font-medium">Laboratory Testing Services</p>
                  <p className="text-xs text-gray-500 mt-1">Sample ID: {invoice.sampleId} - {sample.sampleType} Analysis</p>
                </TableCell>
                <TableCell className="text-center">1</TableCell>
                <TableCell className="text-right">{invoice.subtotal.toLocaleString()}</TableCell>
                <TableCell className="text-right font-medium">{invoice.subtotal.toLocaleString()}</TableCell>
              </TableRow>
            </TableBody>
          </Table>

          <div className="flex justify-end">
            <div className="w-full md:w-1/2 space-y-3 border border-gray-200 rounded-lg p-4 bg-gray-50">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Subtotal / المجموع الفرعي</span>
                <span className="font-mono">SAR {invoice.subtotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm border-b border-gray-200 pb-3">
                <span className="text-gray-600">VAT (15%) / ضريبة القيمة المضافة</span>
                <span className="font-mono">SAR {invoice.vat.toLocaleString()}</span>
              </div>
              <div className="flex justify-between font-bold text-lg text-emerald-900 pt-1">
                <span>Total Amount / الإجمالي</span>
                <span className="font-mono">SAR {invoice.total.toLocaleString()}</span>
              </div>
            </div>
          </div>

          <div className="mt-16 pt-8 border-t border-gray-200 text-xs text-gray-500 text-center">
            <p>This is a system generated document. Phase 2 ZATCA e-Invoicing compliant.</p>
            <p>CR: 1010123456 • Riyadh, KSA • billing@greenlims.sa</p>
          </div>

        </CardContent>
      </Card>
    </div>
  );
}
