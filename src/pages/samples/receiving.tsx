import { useState, useRef, useEffect } from "react";
import { 
  mockSamples, 
  mockClients, 
  sampleTypes 
} from "@/mock-data";
import { Button } from "@/components/ui/button";
import { 
  Plus, 
  Printer, 
  Search, 
  Box,
  User, 
  Calendar,
  Clock,
  Edit2,
  Eye,
  ArrowRight,
  MoreVertical,
  CheckCircle2,
  Beaker,
  Thermometer,
  Hash,
  Package
} from "lucide-react";
import { useAppContext } from "@/context/AppContext";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { BarcodeMock } from "@/components/shared/BarcodeMock";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { motion, AnimatePresence } from "framer-motion";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

export default function SampleReceiving() {
  const { language, currentRole } = useAppContext();
  const isRtl = language === 'ar';
  const isReception = currentRole === 'receptionist';
  
  const [samples, setSamples] = useState(mockSamples);
  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [printPreviewOpen, setPrintPreviewOpen] = useState(false);
  const [selectedSample, setSelectedSample] = useState<any>(null);
  
  const [formData, setFormData] = useState({
    clientId: "",
    receivingDate: new Date().toISOString().split('T')[0],
    priority: "Normal",
    referenceNo: "",
    productName: "",
    productQty: "",
    storageCondition: "Ambient",
    batchNo: "",
    mfgDate: "",
    expireDate: "",
    sampleNo: ""
  });

  useEffect(() => {
    if (!formData.sampleNo) {
      const nextId = `SAM/${new Date().getFullYear()}/${String(samples.length + 1).padStart(4, '0')}`;
      setFormData(prev => ({ ...prev, sampleNo: nextId }));
    }
  }, [samples, open]);

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.clientId || !formData.productName) {
      toast.error(isRtl ? "يرجى ملء الحقول المطلوبة" : "Please fill in required fields");
      return;
    }

    const client = mockClients.find(c => c.id === formData.clientId);
    
    const newSample = {
      id: formData.sampleNo,
      clientName: client ? (isRtl ? client.nameAr : client.nameEn) : "Unknown Client",
      sampleType: "Product", // Default for receptionist
      status: "Received",
      receivedDate: formData.receivingDate,
      ...formData
    };

    // @ts-ignore
    setSamples([newSample, ...samples]);
    setSelectedSample(newSample);
    setOpen(false);
    toast.success(isRtl ? "تم تسجيل العينة بنجاح" : "Sample registered successfully");
    resetForm();
  };

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    const client = mockClients.find(c => c.id === formData.clientId);
    const updatedSamples = samples.map(s => s.id === selectedSample.id ? { 
      ...s, 
      ...formData,
      clientName: client ? (isRtl ? client.nameAr : client.nameEn) : s.clientName 
    } : s);
    // @ts-ignore
    setSamples(updatedSamples);
    setEditOpen(false);
    toast.success(isRtl ? "تم تحديث العينة" : "Sample updated successfully");
  };

  const resetForm = () => {
    setFormData({
      clientId: "",
      receivingDate: new Date().toISOString().split('T')[0],
      priority: "Normal",
      referenceNo: "",
      productName: "",
      productQty: "",
      storageCondition: "Ambient",
      batchNo: "",
      mfgDate: "",
      expireDate: "",
      sampleNo: ""
    });
  };

  const openEdit = (sample: any) => {
    setSelectedSample(sample);
    setFormData({
      clientId: sample.clientId || "",
      receivingDate: sample.receivedDate || sample.receivingDate,
      priority: sample.priority || "Normal",
      referenceNo: sample.referenceNo || "",
      productName: sample.productName || sample.description || "",
      productQty: sample.productQty || "",
      storageCondition: sample.storageCondition || "Ambient",
      batchNo: sample.batchNo || "",
      mfgDate: sample.mfgDate || "",
      expireDate: sample.expireDate || "",
      sampleNo: sample.id
    });
    setEditOpen(true);
  };

  const openView = (sample: any) => {
    setSelectedSample(sample);
    setViewOpen(true);
  };

  const openPrintPreview = (sample: any) => {
    if (!sample) return;
    setSelectedSample(sample);
    setPrintPreviewOpen(true);
  };

  // Build a Code 128-style barcode as inline SVG that we can drop into the
  // print window. Same algorithm as <BarcodeMock /> so the on-screen preview
  // and the printed label match exactly.
  const buildBarcodeSvg = (value: string, width = 260, height = 70): string => {
    const valueStr = value || "SAMPLE";
    const segments: { bar: boolean; width: number }[] = [];
    // Quiet zone (left)
    segments.push({ bar: false, width: 8 });
    // Start guard
    segments.push(
      { bar: true, width: 2 },
      { bar: false, width: 1 },
      { bar: true, width: 1 },
      { bar: false, width: 2 },
      { bar: true, width: 2 },
      { bar: false, width: 1 }
    );
    for (const char of valueStr) {
      const code = char.charCodeAt(0);
      const w1 = ((code * 7) % 3) + 1;
      const w2 = ((code * 13) % 3) + 1;
      const w3 = ((code * 19) % 3) + 1;
      segments.push({ bar: true, width: w1 });
      segments.push({ bar: false, width: 1 });
      segments.push({ bar: true, width: w2 });
      segments.push({ bar: false, width: 1 });
      segments.push({ bar: true, width: w3 });
      segments.push({ bar: false, width: 1 });
    }
    // Stop guard
    segments.push(
      { bar: true, width: 2 },
      { bar: false, width: 1 },
      { bar: true, width: 3 },
      { bar: false, width: 1 },
      { bar: true, width: 2 }
    );
    // Quiet zone (right)
    segments.push({ bar: false, width: 8 });

    const totalUnits = segments.reduce((sum, s) => sum + s.width, 0);
    const unitWidth = width / totalUnits;
    const barHeight = height - 18;

    let cursor = 0;
    const bars = segments
      .map((seg) => {
        const x = cursor;
        cursor += seg.width * unitWidth;
        if (!seg.bar) return "";
        return `<rect x="${x.toFixed(2)}" y="0" width="${(seg.width * unitWidth).toFixed(2)}" height="${barHeight}" fill="black"/>`;
      })
      .join("");

    return `
      <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
        <rect x="0" y="0" width="${width}" height="${barHeight}" fill="white"/>
        ${bars}
        <text x="${width / 2}" y="${height - 4}" text-anchor="middle" font-size="10" font-family="ui-monospace, Menlo, monospace" font-weight="600" fill="black" letter-spacing="0.5">${escapeHtml(valueStr)}</text>
      </svg>
    `;
  };

  const escapeHtml = (s: string) =>
    String(s ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");

  const handlePrint = (sample: any) => {
    if (!sample) return;
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast.error(
        isRtl
          ? "الرجاء السماح بالنوافذ المنبثقة لطباعة الملصق"
          : "Please allow pop-ups to print the label"
      );
      return;
    }

    const barcodeSvg = buildBarcodeSvg(sample.id, 260, 70);

    printWindow.document.write(`
      <!doctype html>
      <html>
        <head>
          <title>Label ${escapeHtml(sample.id)}</title>
          <style>
            @page { size: 2in 1.25in; margin: 0; }
            html, body { margin: 0; padding: 0; }
            body {
              font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
              width: 2in;
              height: 1.25in;
              display: flex;
              flex-direction: column;
              justify-content: space-between;
              box-sizing: border-box;
              padding: 4px 6px;
              color: #000;
              background: #fff;
            }
            .header { display: flex; justify-content: space-between; align-items: center; font-size: 7pt; font-weight: 800; border-bottom: 0.5px solid #000; padding-bottom: 2px; text-transform: uppercase; letter-spacing: 0.5px; }
            .header .brand { display: flex; align-items: center; gap: 3px; }
            .header .dot { width: 6px; height: 6px; background: #16a34a; border-radius: 50%; }
            .main { text-align: center; flex: 1; display: flex; flex-direction: column; justify-content: center; gap: 1px; }
            .id { font-size: 11pt; font-weight: 900; letter-spacing: 0.5px; }
            .client { font-size: 6.5pt; font-weight: 700; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
            .meta { display: flex; justify-content: space-between; font-size: 5.5pt; font-weight: 600; margin-top: 1px; }
            .barcode-wrap { display: flex; justify-content: center; }
            .barcode-wrap svg { display: block; }
            .footer-row { display: flex; justify-content: space-between; font-size: 5.5pt; font-weight: 700; }
            @media print {
              body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <span class="brand"><span class="dot"></span>GREEN LAB</span>
            <span>${escapeHtml(sample.receivedDate || sample.receivingDate || "")}</span>
          </div>
          <div class="main">
            <div class="id">${escapeHtml(sample.id)}</div>
            <div class="client">${escapeHtml((sample.clientName || "N/A").toUpperCase())}</div>
            <div class="meta">
              <span>PRI: ${escapeHtml(sample.priority || "Normal")}</span>
              <span>${escapeHtml(sample.storageCondition || "Ambient")}</span>
            </div>
          </div>
          <div class="barcode-wrap">${barcodeSvg}</div>
          <div class="footer-row">
            <span>PN: ${escapeHtml(sample.productName || "N/A")}</span>
            <span>B: ${escapeHtml(sample.batchNo || "N/A")}</span>
          </div>
          <script>
            window.onload = function () {
              setTimeout(function () {
                window.focus();
                window.print();
                setTimeout(function () { window.close(); }, 300);
              }, 100);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-card p-6 rounded-2xl border shadow-sm">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
            <Box className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {isRtl ? "استقبال العينات" : "Reception - Sample Receiving"}
            </h1>
            <p className="text-sm text-muted-foreground">
              {isRtl ? "تسجيل وإدارة العينات المستلمة في الاستقبال" : "Register and manage incoming samples at reception desk"}
            </p>
          </div>
        </div>

        <Dialog open={open} onOpenChange={(val) => { setOpen(val); if(!val) resetForm(); }}>
          <DialogTrigger asChild>
            <Button size="lg" className="rounded-xl shadow-lg shadow-primary/20">
              <Plus className="mr-2 h-5 w-5" /> {isRtl ? "إضافة عينة جديدة" : "Add New Sample"}
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[800px] max-h-[90vh]">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold">{isRtl ? "إضافة عينة جديدة" : "Add New Sample"}</DialogTitle>
              <DialogDescription>{isRtl ? "أدخل تفاصيل العينة المستلمة" : "Enter the details of the received sample below."}</DialogDescription>
            </DialogHeader>

            <ScrollArea className="max-h-[60vh] pr-4">
              <form id="receive-form" onSubmit={handleRegister} className="grid grid-cols-2 gap-6 py-4">
                <div className="space-y-2">
                  <Label className="font-bold">{isRtl ? "العميل" : "Customer"}</Label>
                  <Select onValueChange={(val) => setFormData({ ...formData, clientId: val })}>
                    <SelectTrigger className="rounded-xl h-11">
                      <SelectValue placeholder={isRtl ? "اختر العميل" : "Select Customer"} />
                    </SelectTrigger>
                    <SelectContent>
                      {mockClients.map(c => <SelectItem key={c.id} value={c.id}>{isRtl ? c.nameAr : c.nameEn}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="font-bold">{isRtl ? "تاريخ الاستلام" : "Receiving Date"}</Label>
                  <Input type="date" value={formData.receivingDate} onChange={e => setFormData({...formData, receivingDate: e.target.value})} className="rounded-xl h-11" />
                </div>

                <div className="space-y-2">
                  <Label className="font-bold">{isRtl ? "الأولوية" : "Priority"}</Label>
                  <Select onValueChange={(val) => setFormData({ ...formData, priority: val })} defaultValue="Normal">
                    <SelectTrigger className="rounded-xl h-11">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Normal">Normal</SelectItem>
                      <SelectItem value="High">High</SelectItem>
                      <SelectItem value="Highest">Highest</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="font-bold">{isRtl ? "الرقم المرجعي" : "Reference No"}</Label>
                  <Input placeholder="Reference No" value={formData.referenceNo} onChange={e => setFormData({...formData, referenceNo: e.target.value})} className="rounded-xl h-11" />
                </div>

                <div className="space-y-2">
                  <Label className="font-bold">{isRtl ? "اسم المنتج" : "Product Name"}</Label>
                  <Input placeholder="Product Name" value={formData.productName} onChange={e => setFormData({...formData, productName: e.target.value})} className="rounded-xl h-11" />
                </div>

                <div className="space-y-2">
                  <Label className="font-bold">{isRtl ? "كمية المنتج" : "Product Qty"}</Label>
                  <Input placeholder="Product Qty" value={formData.productQty} onChange={e => setFormData({...formData, productQty: e.target.value})} className="rounded-xl h-11" />
                </div>

                <div className="space-y-2">
                  <Label className="font-bold">{isRtl ? "حالة التخزين" : "Storage Condition"}</Label>
                  <Input placeholder="Storage Condition" value={formData.storageCondition} onChange={e => setFormData({...formData, storageCondition: e.target.value})} className="rounded-xl h-11" />
                </div>

                <div className="space-y-2">
                  <Label className="font-bold">{isRtl ? "رقم الدفعة" : "Batch No"}</Label>
                  <Input placeholder="Batch No" value={formData.batchNo} onChange={e => setFormData({...formData, batchNo: e.target.value})} className="rounded-xl h-11" />
                </div>

                <div className="space-y-2">
                  <Label className="font-bold">{isRtl ? "تاريخ التصنيع" : "Mfg Date"}</Label>
                  <Input type="date" value={formData.mfgDate} onChange={e => setFormData({...formData, mfgDate: e.target.value})} className="rounded-xl h-11" />
                </div>

                <div className="space-y-2">
                  <Label className="font-bold">{isRtl ? "تاريخ الانتهاء" : "Expire Date"}</Label>
                  <Input type="date" value={formData.expireDate} onChange={e => setFormData({...formData, expireDate: e.target.value})} className="rounded-xl h-11" />
                </div>

                <div className="col-span-2 space-y-2">
                  <Label className="font-bold">{isRtl ? "رقم العينة" : "Sample No."}</Label>
                  <Input value={formData.sampleNo} readOnly className="rounded-xl h-11 bg-muted font-mono font-bold" />
                </div>
              </form>
            </ScrollArea>

            <DialogFooter className="pt-4 border-t">
              <Button variant="ghost" onClick={() => setOpen(false)}>{isRtl ? "إلغاء" : "Cancel"}</Button>
              <Button type="submit" form="receive-form">{isRtl ? "حفظ العينة" : "Save Sample"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Samples Table */}
      <Card className="rounded-2xl border-none shadow-sm overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-muted/50 border-b">
                <tr>
                  <th className="p-4 text-xs font-bold uppercase text-muted-foreground">{isRtl ? "رقم العينة" : "Sample No"}</th>
                  <th className="p-4 text-xs font-bold uppercase text-muted-foreground">{isRtl ? "العميل" : "Customer"}</th>
                  <th className="p-4 text-xs font-bold uppercase text-muted-foreground">{isRtl ? "اسم المنتج" : "Product Name"}</th>
                  <th className="p-4 text-xs font-bold uppercase text-muted-foreground">{isRtl ? "تاريخ الاستلام" : "Date"}</th>
                  <th className="p-4 text-xs font-bold uppercase text-muted-foreground">{isRtl ? "الحالة" : "Status"}</th>
                  <th className="p-4 text-xs font-bold uppercase text-muted-foreground text-right">{isRtl ? "الإجراءات" : "Actions"}</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {samples.map((sample: any) => (
                  <tr key={sample.id} className="hover:bg-muted/30 transition-colors group">
                    <td className="p-4 font-mono font-bold text-primary">{sample.id}</td>
                    <td className="p-4 font-medium">{sample.clientName}</td>
                    <td className="p-4">{sample.productName || sample.description}</td>
                    <td className="p-4 text-sm text-muted-foreground">{sample.receivedDate || sample.receivingDate}</td>
                    <td className="p-4">
                      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Received</Badge>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={() => openView(sample)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={() => openEdit(sample)}>
                          <Edit2 className="h-4 w-4 text-amber-600" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={() => openPrintPreview(sample)}>
                          <Printer className="h-4 w-4 text-primary" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-[800px] max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>{isRtl ? "تعديل بيانات العينة" : "Edit Sample Data"}</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh] pr-4">
            <form id="edit-form" onSubmit={handleUpdate} className="grid grid-cols-2 gap-6 py-4">
              {/* Same fields as Register Form */}
              <div className="space-y-2">
                <Label className="font-bold">{isRtl ? "العميل" : "Customer"}</Label>
                <Select onValueChange={(val) => setFormData({ ...formData, clientId: val })} defaultValue={formData.clientId}>
                  <SelectTrigger className="rounded-xl h-11">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {mockClients.map(c => <SelectItem key={c.id} value={c.id}>{isRtl ? c.nameAr : c.nameEn}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="font-bold">{isRtl ? "تاريخ الاستلام" : "Receiving Date"}</Label>
                <Input type="date" value={formData.receivingDate} onChange={e => setFormData({...formData, receivingDate: e.target.value})} className="rounded-xl h-11" />
              </div>
              <div className="space-y-2">
                <Label className="font-bold">{isRtl ? "الأولوية" : "Priority"}</Label>
                <Select onValueChange={(val) => setFormData({ ...formData, priority: val })} defaultValue={formData.priority}>
                  <SelectTrigger className="rounded-xl h-11">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Normal">Normal</SelectItem>
                    <SelectItem value="High">High</SelectItem>
                    <SelectItem value="Highest">Highest</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="font-bold">{isRtl ? "الرقم المرجعي" : "Reference No"}</Label>
                <Input placeholder="Reference No" value={formData.referenceNo} onChange={e => setFormData({...formData, referenceNo: e.target.value})} className="rounded-xl h-11" />
              </div>
              <div className="space-y-2">
                <Label className="font-bold">{isRtl ? "اسم المنتج" : "Product Name"}</Label>
                <Input placeholder="Product Name" value={formData.productName} onChange={e => setFormData({...formData, productName: e.target.value})} className="rounded-xl h-11" />
              </div>
              <div className="space-y-2">
                <Label className="font-bold">{isRtl ? "كمية المنتج" : "Product Qty"}</Label>
                <Input placeholder="Product Qty" value={formData.productQty} onChange={e => setFormData({...formData, productQty: e.target.value})} className="rounded-xl h-11" />
              </div>
              <div className="space-y-2">
                <Label className="font-bold">{isRtl ? "رقم الدفعة" : "Batch No"}</Label>
                <Input placeholder="Batch No" value={formData.batchNo} onChange={e => setFormData({...formData, batchNo: e.target.value})} className="rounded-xl h-11" />
              </div>
              <div className="space-y-2">
                <Label className="font-bold">{isRtl ? "تاريخ التصنيع" : "Mfg Date"}</Label>
                <Input type="date" value={formData.mfgDate} onChange={e => setFormData({...formData, mfgDate: e.target.value})} className="rounded-xl h-11" />
              </div>
            </form>
          </ScrollArea>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditOpen(false)}>{isRtl ? "إلغاء" : "Cancel"}</Button>
            <Button type="submit" form="edit-form">{isRtl ? "تحديث" : "Update"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-primary" />
              {isRtl ? "تفاصيل العينة" : "Sample Detail"}
            </DialogTitle>
          </DialogHeader>
          {selectedSample && (
            <div className="space-y-4 py-4">
              <div className="bg-primary/5 p-4 rounded-2xl flex items-center justify-between border border-primary/10">
                <div>
                  <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">{isRtl ? "رقم العينة" : "Sample ID"}</p>
                  <p className="text-xl font-mono font-black text-primary">{selectedSample.id}</p>
                </div>
                <Badge variant="outline" className="bg-white">{selectedSample.priority}</Badge>
              </div>

              <div className="grid grid-cols-2 gap-y-4 text-sm px-2">
                <div className="space-y-1">
                  <p className="text-muted-foreground font-medium flex items-center gap-1"><User className="h-3 w-3" /> {isRtl ? "العميل" : "Customer"}</p>
                  <p className="font-bold">{selectedSample.clientName}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground font-medium flex items-center gap-1"><Calendar className="h-3 w-3" /> {isRtl ? "تاريخ الاستلام" : "Date"}</p>
                  <p className="font-bold">{selectedSample.receivedDate || selectedSample.receivingDate}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground font-medium flex items-center gap-1"><Package className="h-3 w-3" /> {isRtl ? "اسم المنتج" : "Product"}</p>
                  <p className="font-bold">{selectedSample.productName || selectedSample.description}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground font-medium flex items-center gap-1"><Hash className="h-3 w-3" /> {isRtl ? "رقم الدفعة" : "Batch No"}</p>
                  <p className="font-bold">{selectedSample.batchNo || 'N/A'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground font-medium flex items-center gap-1"><Thermometer className="h-3 w-3" /> {isRtl ? "حالة التخزين" : "Condition"}</p>
                  <p className="font-bold">{selectedSample.storageCondition || 'Ambient'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground font-medium flex items-center gap-1"><Hash className="h-3 w-3" /> {isRtl ? "الكمية" : "Qty"}</p>
                  <p className="font-bold">{selectedSample.productQty || 'N/A'}</p>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" className="w-full rounded-xl" onClick={() => openPrintPreview(selectedSample)}>
              <Printer className="mr-2 h-4 w-4" /> {isRtl ? "طباعة الملصق" : "Print Label"}
            </Button>
            <Button className="w-full rounded-xl" onClick={() => setViewOpen(false)}>{isRtl ? "إغلاق" : "Close"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Print Label Preview Dialog */}
      <Dialog open={printPreviewOpen} onOpenChange={setPrintPreviewOpen}>
        <DialogContent className="sm:max-w-[460px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Printer className="h-5 w-5 text-primary" />
              {isRtl ? "معاينة ملصق العينة" : "Sample Reception Label"}
            </DialogTitle>
            <DialogDescription>
              {isRtl
                ? "معاينة الملصق قبل الطباعة. الملصق بحجم 2 × 1.25 بوصة."
                : "Preview the label before printing. Label size is 2 × 1.25 in."}
            </DialogDescription>
          </DialogHeader>

          {selectedSample && (
            <div className="space-y-4 py-2">
              {/* On-screen preview — exactly matches the printed layout */}
              <div className="flex justify-center">
                <div
                  className="bg-white border-2 border-dashed border-muted-foreground/30 rounded-lg p-3 shadow-inner"
                  style={{ width: "fit-content" }}
                >
                  <div
                    className="bg-white text-black flex flex-col justify-between box-border"
                    style={{
                      width: "320px",
                      height: "200px",
                      padding: "8px 10px",
                      fontFamily: 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif',
                    }}
                  >
                    <div className="flex justify-between items-center text-[10px] font-extrabold border-b border-black/70 pb-1 uppercase tracking-wider">
                      <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-green-600 inline-block" />
                        GREEN LAB
                      </span>
                      <span>{selectedSample.receivedDate || selectedSample.receivingDate}</span>
                    </div>
                    <div className="flex-1 flex flex-col items-center justify-center text-center gap-0.5">
                      <div className="text-[16px] font-black tracking-wide">{selectedSample.id}</div>
                      <div className="text-[10px] font-bold truncate max-w-full">
                        {(selectedSample.clientName || "N/A").toUpperCase()}
                      </div>
                      <div className="flex justify-between w-full text-[8.5px] font-semibold mt-0.5">
                        <span>PRI: {selectedSample.priority || "Normal"}</span>
                        <span>{selectedSample.storageCondition || "Ambient"}</span>
                      </div>
                    </div>
                    <div className="flex justify-center">
                      <BarcodeMock value={selectedSample.id} width={260} height={70} />
                    </div>
                    <div className="flex justify-between text-[8.5px] font-bold">
                      <span>PN: {selectedSample.productName || "N/A"}</span>
                      <span>B: {selectedSample.batchNo || "N/A"}</span>
                    </div>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-lg bg-muted/40 p-2">
                  <p className="text-muted-foreground">{isRtl ? "رقم العينة" : "Sample No"}</p>
                  <p className="font-mono font-bold">{selectedSample.id}</p>
                </div>
                <div className="rounded-lg bg-muted/40 p-2">
                  <p className="text-muted-foreground">{isRtl ? "العميل" : "Customer"}</p>
                  <p className="font-bold truncate">{selectedSample.clientName}</p>
                </div>
                <div className="rounded-lg bg-muted/40 p-2">
                  <p className="text-muted-foreground">{isRtl ? "المنتج" : "Product"}</p>
                  <p className="font-bold truncate">{selectedSample.productName || "N/A"}</p>
                </div>
                <div className="rounded-lg bg-muted/40 p-2">
                  <p className="text-muted-foreground">{isRtl ? "رقم الدفعة" : "Batch No"}</p>
                  <p className="font-bold">{selectedSample.batchNo || "N/A"}</p>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setPrintPreviewOpen(false)}>
              {isRtl ? "إلغاء" : "Cancel"}
            </Button>
            <Button
              className="rounded-xl"
              onClick={() => {
                handlePrint(selectedSample);
                toast.success(
                  isRtl ? "جاري إرسال الملصق للطباعة..." : "Sending label to printer..."
                );
              }}
            >
              <Printer className="mr-2 h-4 w-4" />
              {isRtl ? "طباعة" : "Print"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
