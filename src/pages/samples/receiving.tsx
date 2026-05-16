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
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { motion, AnimatePresence } from "framer-motion";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function SampleReceiving() {
  const { language, currentRole } = useAppContext();
  const isRtl = language === 'ar';
  const isReception = currentRole === 'receptionist';
  
  const [samples, setSamples] = useState(mockSamples);
  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
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

  const handlePrint = (sample: any) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>Label ${sample.id}</title>
          <style>
            @page { size: 2in 1in; margin: 0; }
            body { margin: 0; padding: 5px; font-family: sans-serif; width: 2in; height: 1in; display: flex; flex-direction: column; justify-content: space-between; box-sizing: border-box; }
            .header { display: flex; justify-content: space-between; font-size: 7pt; font-weight: bold; border-bottom: 0.5px solid #000; padding-bottom: 2px; }
            .main { text-align: center; flex: 1; display: flex; flex-direction: column; justify-content: center; }
            .id { font-size: 11pt; font-weight: 900; }
            .client { font-size: 6pt; font-weight: bold; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
            .footer { display: flex; justify-content: space-between; font-size: 6pt; margin-top: 2px; }
            .barcode { height: 12px; background: repeating-linear-gradient(90deg, #000, #000 1px, #fff 1px, #fff 2px); width: 100%; margin-top: 2px; }
          </style>
        </head>
        <body>
          <div class="header">
            <span>GREEN LAB</span>
            <span>${sample.receivedDate || sample.receivingDate}</span>
          </div>
          <div class="main">
            <div class="id">${sample.id}</div>
            <div class="client">${(sample.clientName || 'N/A').toUpperCase()}</div>
          </div>
          <div class="footer">
            <span>PN: ${sample.productName || 'N/A'}</span>
            <span>B: ${sample.batchNo || 'N/A'}</span>
          </div>
          <div class="barcode"></div>
          <script>window.onload = () => { window.print(); window.close(); }</script>
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
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={() => handlePrint(sample)}>
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
            <Button variant="outline" className="w-full rounded-xl" onClick={() => handlePrint(selectedSample)}>
              <Printer className="mr-2 h-4 w-4" /> {isRtl ? "طباعة الملصق" : "Print Label"}
            </Button>
            <Button className="w-full rounded-xl" onClick={() => setViewOpen(false)}>{isRtl ? "إغلاق" : "Close"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
