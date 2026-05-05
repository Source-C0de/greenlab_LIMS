
import { useState } from "react";
import { useLocation } from "wouter";
import { parameterLibrary, mockSpecifications } from "@/mock-data/specifications";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  CardDescription
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Plus, 
  Trash2, 
  Save, 
  ArrowLeft, 
  Search,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import { useAppContext } from "@/context/AppContext";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

export default function NewSpecification() {
  const [, setLocation] = useLocation();
  const { language } = useAppContext();
  const isRtl = language === 'ar';
  
  const [formData, setFormData] = useState({
    code: `SPEC-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`,
    name: "",
    productName: "",
    category: "",
    department: "",
    status: "Draft",
    effectiveDate: new Date().toISOString().split('T')[0],
    reviewDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0],
  });

  const [parameters, setParameters] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  const handleAddParameter = (paramMaster: any) => {
    const exists = parameters.find(p => p.parameterId === paramMaster.id);
    if (exists) {
      toast.error(isRtl ? "المعلمة موجودة بالفعل" : "Parameter already added");
      return;
    }

    const newParam = {
      parameterId: paramMaster.id,
      name: paramMaster.name,
      method: paramMaster.method,
      unit: paramMaster.unit,
      min: "",
      max: "",
      target: "",
      limitType: "Range",
      mandatory: true,
    };

    setParameters([...parameters, newParam]);
    setSearchQuery("");
  };

  const handleRemoveParameter = (id: string) => {
    setParameters(parameters.filter(p => p.parameterId !== id));
  };

  const handleParamChange = (id: string, field: string, value: any) => {
    setParameters(parameters.map(p => 
      p.parameterId === id ? { ...p, [field]: value } : p
    ));
  };

  const handleSave = () => {
    if (!formData.name || !formData.productName) {
      toast.error(isRtl ? "يرجى ملء جميع الحقول المطلوبة" : "Please fill in all required fields");
      return;
    }

    if (parameters.length === 0) {
      toast.error(isRtl ? "يرجى إضافة معلمة واحدة على الأقل" : "Please add at least one parameter");
      return;
    }

    toast.success(isRtl ? "تم حفظ المواصفة بنجاح" : "Specification saved successfully");
    setLocation("/specifications");
  };

  const filteredLibrary = parameterLibrary.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.method.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const limitTypes = [
    'Range', 'Max Only', 'Min Only', 'Exact Value', 'Pass / Fail', 'Text', 'Not Detected'
  ];

  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => setLocation("/specifications")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {isRtl ? "إضافة مواصفة جديدة" : "Add New Specification"}
          </h1>
          <p className="text-muted-foreground">
            {isRtl ? "إنشاء معايير جودة جديدة للمنتجات والمواد" : "Create new quality standards for products and materials"}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Basic Info */}
        <Card className="lg:col-span-3 border-primary/10 shadow-sm overflow-hidden">
          <CardHeader className="bg-primary/5 border-b py-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-primary" />
              {isRtl ? "المعلومات الأساسية" : "Basic Information"}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="space-y-2">
                <Label>{isRtl ? "كود المواصفة" : "Specification Code"}</Label>
                <Input value={formData.code} disabled className="bg-muted font-mono" />
              </div>
              <div className="space-y-2">
                <Label>{isRtl ? "اسم المواصفة" : "Specification Name"} <span className="text-destructive">*</span></Label>
                <Input 
                  placeholder={isRtl ? "مثال: معيار مياه الشرب" : "e.g. Drinking Water Standard"} 
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>{isRtl ? "المنتج / المادة" : "Product / Material Name"} <span className="text-destructive">*</span></Label>
                <Input 
                  placeholder={isRtl ? "مثال: مياه معبأة" : "e.g. Bottled Water"} 
                  value={formData.productName}
                  onChange={(e) => setFormData({ ...formData, productName: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>{isRtl ? "الفئة" : "Category"}</Label>
                <Select onValueChange={(val) => setFormData({ ...formData, category: val })}>
                  <SelectTrigger>
                    <SelectValue placeholder={isRtl ? "اختر الفئة" : "Select category"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Water">Water</SelectItem>
                    <SelectItem value="Food">Food</SelectItem>
                    <SelectItem value="Chemical">Chemical</SelectItem>
                    <SelectItem value="Environmental">Environmental</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{isRtl ? "القسم" : "Department"}</Label>
                <Select onValueChange={(val) => setFormData({ ...formData, department: val })}>
                  <SelectTrigger>
                    <SelectValue placeholder={isRtl ? "اختر القسم" : "Select department"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Chemical Lab">Chemical Lab</SelectItem>
                    <SelectItem value="Micro Lab">Micro Lab</SelectItem>
                    <SelectItem value="Physical Lab">Physical Lab</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{isRtl ? "الحالة" : "Status"}</Label>
                <Badge variant="outline" className="h-10 px-4 w-full justify-center">Draft</Badge>
              </div>
              <div className="space-y-2">
                <Label>{isRtl ? "تاريخ التفعيل" : "Effective Date"}</Label>
                <Input 
                  type="date" 
                  value={formData.effectiveDate}
                  onChange={(e) => setFormData({ ...formData, effectiveDate: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>{isRtl ? "تاريخ المراجعة" : "Review Date"}</Label>
                <Input 
                  type="date" 
                  value={formData.reviewDate}
                  onChange={(e) => setFormData({ ...formData, reviewDate: e.target.value })}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Parameter Section */}
        <Card className="lg:col-span-3 border-primary/10 shadow-sm">
          <CardHeader className="border-b py-4 flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <Plus className="h-5 w-5 text-primary" />
                {isRtl ? "معلمات الاختبار" : "Test Parameters"}
              </CardTitle>
              <CardDescription>
                {isRtl ? "أضف وحدد المعلمات والحدود لهذه المواصفة" : "Add and define parameters and limits for this specification"}
              </CardDescription>
            </div>
            
            <div className="relative w-72">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder={isRtl ? "البحث في مكتبة المعلمات..." : "Search parameter library..."} 
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <div className="absolute top-full left-0 w-full mt-1 bg-popover border rounded-md shadow-lg z-50 max-h-60 overflow-y-auto">
                  {filteredLibrary.map(p => (
                    <div 
                      key={p.id} 
                      className="px-3 py-2 hover:bg-accent cursor-pointer border-b last:border-0 flex justify-between items-center"
                      onClick={() => handleAddParameter(p)}
                    >
                      <div>
                        <p className="text-sm font-medium">{p.name}</p>
                        <p className="text-[10px] text-muted-foreground">{p.method} | {p.unit}</p>
                      </div>
                      <Plus className="h-3 w-3 text-primary" />
                    </div>
                  ))}
                  {filteredLibrary.length === 0 && (
                    <div className="px-3 py-2 text-sm text-muted-foreground">No parameters found</div>
                  )}
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="w-[200px]">{isRtl ? "المعلمة" : "Parameter"}</TableHead>
                  <TableHead>{isRtl ? "الطريقة" : "Method"}</TableHead>
                  <TableHead className="w-[100px]">{isRtl ? "الوحدة" : "Unit"}</TableHead>
                  <TableHead className="w-[120px]">{isRtl ? "الحد الأدنى" : "Min"}</TableHead>
                  <TableHead className="w-[120px]">{isRtl ? "الحد الأقصى" : "Max"}</TableHead>
                  <TableHead className="w-[120px]">{isRtl ? "الهدف" : "Target"}</TableHead>
                  <TableHead className="w-[180px]">{isRtl ? "نوع الحد" : "Limit Type"}</TableHead>
                  <TableHead className="w-[100px] text-center">{isRtl ? "إلزامي" : "Mandatory"}</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {parameters.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="h-32 text-center text-muted-foreground italic">
                      {isRtl ? "لم يتم إضافة معلمات بعد. استخدم البحث أعلاه للإضافة." : "No parameters added yet. Use the search above to add."}
                    </TableCell>
                  </TableRow>
                ) : (
                  parameters.map((p) => (
                    <TableRow key={p.parameterId}>
                      <TableCell className="font-medium">{p.name}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{p.method}</TableCell>
                      <TableCell className="text-xs">{p.unit}</TableCell>
                      <TableCell>
                        <Input 
                          size={1} 
                          className="h-8" 
                          value={p.min} 
                          onChange={(e) => handleParamChange(p.parameterId, 'min', e.target.value)}
                          placeholder="Min"
                        />
                      </TableCell>
                      <TableCell>
                        <Input 
                          size={1} 
                          className="h-8" 
                          value={p.max} 
                          onChange={(e) => handleParamChange(p.parameterId, 'max', e.target.value)}
                          placeholder="Max"
                        />
                      </TableCell>
                      <TableCell>
                        <Input 
                          size={1} 
                          className="h-8" 
                          value={p.target} 
                          onChange={(e) => handleParamChange(p.parameterId, 'target', e.target.value)}
                          placeholder="Target"
                        />
                      </TableCell>
                      <TableCell>
                        <Select 
                          value={p.limitType} 
                          onValueChange={(val) => handleParamChange(p.parameterId, 'limitType', val)}
                        >
                          <SelectTrigger className="h-8 py-0">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {limitTypes.map(t => (
                              <SelectItem key={t} value={t}>{t}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-center">
                        <Checkbox 
                          checked={p.mandatory} 
                          onCheckedChange={(val) => handleParamChange(p.parameterId, 'mandatory', val)} 
                        />
                      </TableCell>
                      <TableCell>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-destructive hover:bg-destructive/10"
                          onClick={() => handleRemoveParameter(p.parameterId)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <div className="fixed bottom-0 right-0 left-0 md:left-64 bg-background border-t p-4 z-40 flex justify-end gap-3 shadow-lg">
        <Button variant="outline" onClick={() => setLocation("/specifications")}>
          {isRtl ? "إلغاء" : "Cancel"}
        </Button>
        <Button variant="secondary" onClick={handleSave}>
          <Save className="mr-2 h-4 w-4" />
          {isRtl ? "حفظ كمسودة" : "Save as Draft"}
        </Button>
        <Button onClick={handleSave} className="bg-primary">
          <Save className="mr-2 h-4 w-4" />
          {isRtl ? "حفظ وإرسال للاعتماد" : "Save & Submit for Approval"}
        </Button>
      </div>
    </div>
  );
}
