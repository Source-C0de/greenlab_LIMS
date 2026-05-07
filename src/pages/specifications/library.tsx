import { useState } from "react";
import { parameterLibrary, ParameterMaster } from "@/mock-data/specifications";
import { DataTable } from "@/components/shared/DataTable";
import { Button } from "@/components/ui/button";
import { 
  Plus, 
  Filter, 
  Download, 
  BookOpen, 
  Loader2,
  Database
} from "lucide-react";
import { useAppContext } from "@/context/AppContext";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

export default function ParameterLibrary() {
  const { language } = useAppContext();
  const isRtl = language === 'ar';
  const [params, setParams] = useState(parameterLibrary);
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    method: "",
    unit: "",
    category: "Chemical"
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.method || !formData.unit) {
      toast.error(isRtl ? "يرجى ملء جميع الحقول المطلوبة" : "Please fill in all required fields");
      return;
    }

    setIsSubmitting(true);
    
    // Simulate API call
    setTimeout(() => {
      const newParam: ParameterMaster = {
        id: `PM-${String(params.length + 1).padStart(3, '0')}`,
        name: formData.name,
        method: formData.method,
        unit: formData.unit,
        category: formData.category
      };

      setParams([newParam, ...params]);
      setIsSubmitting(false);
      setOpen(false);
      setFormData({ name: "", method: "", unit: "", category: "Chemical" });
      toast.success(isRtl ? "تم إضافة المعلمة بنجاح" : "Parameter added to master library successfully");
    }, 800);
  };

  const columns = [
    { 
      key: "id", 
      header: isRtl ? "كود المعلمة" : "Parameter ID",
      render: (item: any) => <span className="font-mono font-medium">{item.id}</span>
    },
    { key: "name", header: isRtl ? "اسم المعلمة" : "Parameter Name" },
    { key: "category", header: isRtl ? "الفئة" : "Category" },
    { key: "method", header: isRtl ? "الطريقة القياسية" : "Standard Method" },
    { key: "unit", header: isRtl ? "الوحدة" : "Unit" },
    { 
      key: "actions", 
      header: "",
      render: (item: any) => (
        <Button variant="ghost" size="sm">{isRtl ? "تعديل" : "Edit"}</Button>
      )
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Database className="h-8 w-8 text-primary" />
            {isRtl ? "معلمات الاختبار" : "Test Parameters"}
          </h1>
          <p className="text-muted-foreground mt-1">
            {isRtl ? "قاعدة بيانات مركزية لجميع معلمات وطرق المختبر" : "Central database of all laboratory parameters and methods"}
          </p>
        </div>
        
        <div className="flex gap-2">
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" /> {isRtl ? "إضافة معلمة" : "New Parameter"}
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>{isRtl ? "إضافة معلمة جديدة" : "Add New Parameter to Library"}</DialogTitle>
                <DialogDescription>
                  {isRtl ? "أدخل تفاصيل المعلمة الجديدة لإضافتها إلى قاعدة البيانات المركزية." : "Enter the details of the new parameter to add it to the central database."}
                </DialogDescription>
              </DialogHeader>
              
              <form onSubmit={handleSubmit} className="space-y-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">{isRtl ? "اسم المعلمة" : "Parameter Name"} <span className="text-destructive">*</span></Label>
                  <Input 
                    id="name" 
                    placeholder="e.g. pH, TDS, Conductivity..." 
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="category">{isRtl ? "الفئة" : "Category"}</Label>
                    <Select 
                      value={formData.category} 
                      onValueChange={(val) => setFormData({ ...formData, category: val })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select Category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Chemical">Chemical</SelectItem>
                        <SelectItem value="Physical">Physical</SelectItem>
                        <SelectItem value="Microbiology">Microbiology</SelectItem>
                        <SelectItem value="Radiological">Radiological</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="unit">{isRtl ? "الوحدة" : "Unit"} <span className="text-destructive">*</span></Label>
                    <Input 
                      id="unit" 
                      placeholder="e.g. mg/L, pH, cP..." 
                      value={formData.unit}
                      onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="method">{isRtl ? "الطريقة القياسية" : "Standard Method"} <span className="text-destructive">*</span></Label>
                  <Input 
                    id="method" 
                    placeholder="e.g. ASTM D1293, EPA 150.1..." 
                    value={formData.method}
                    onChange={(e) => setFormData({ ...formData, method: e.target.value })}
                  />
                </div>

                <DialogFooter className="pt-4">
                  <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                    {isRtl ? "إلغاء" : "Cancel"}
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {isRtl ? "جاري الإضافة..." : "Adding..."}
                      </>
                    ) : (
                      isRtl ? "إضافة المعلمة" : "Add Parameter"
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
          
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" /> {isRtl ? "تصدير" : "Export"}
          </Button>
        </div>
      </div>

      <DataTable 
        data={params} 
        columns={columns} 
        searchKey="name" 
        searchPlaceholder={isRtl ? "البحث في المعلمات..." : "Search parameters..."}
      />
    </div>
  );
}
