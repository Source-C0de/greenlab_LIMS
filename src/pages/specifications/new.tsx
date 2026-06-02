
import { useMemo, useState } from "react";
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
  AlertCircle,
  TestTube2
} from "lucide-react";
import { useAppContext } from "@/context/AppContext";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

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
  const [openSuggFor, setOpenSuggFor] = useState<{ [id: string]: "tests" | "sopCode" | "referenceNo" | null }>({});

  // Multi-select dialog for adding test parameters from the parameter library
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerSearch, setPickerSearch] = useState("");
  const [pickerSelectedIds, setPickerSelectedIds] = useState<string[]>([]);

  const filteredPickerLibrary = useMemo(() => {
    const q = pickerSearch.toLowerCase().trim();
    if (!q) return parameterLibrary;
    return parameterLibrary.filter(p =>
      p.name.toLowerCase().includes(q) ||
      p.method.toLowerCase().includes(q) ||
      p.unit.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q)
    );
  }, [pickerSearch]);

  const togglePickerSelection = (id: string) => {
    setPickerSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const applyPickerSelection = () => {
    const picks = parameterLibrary.filter(p => pickerSelectedIds.includes(p.id));
    setParameters(prev => {
      const existing = new Set(prev.map(p => p.parameterId));
      const toAdd = picks
        .filter(p => !existing.has(p.id))
        .map(paramMaster => ({
          parameterId: paramMaster.id,
          name: paramMaster.name,
          method: paramMaster.method,
          unit: paramMaster.unit,
          sopCode: `SOP-${paramMaster.id}`,
          tests: paramMaster.name,
          referenceNo: `REF-${paramMaster.category?.slice(0, 2).toUpperCase() || "GL"}-${paramMaster.id}`,
          limitRange: "",
          min: "",
          max: "",
          target: "",
          limitType: "Range",
          mandatory: true,
        }));
      return [...prev, ...toAdd];
    });
    setPickerOpen(false);
    setPickerSearch("");
    setPickerSelectedIds([]);
    if (picks.length > 0) {
      toast.success(
        isRtl
          ? `تم إضافة ${picks.length} معلمة بنجاح`
          : `${picks.length} parameter${picks.length > 1 ? "s" : ""} added`
      );
    }
  };

  const openPickerDialog = () => {
    // Pre-select parameters that are already added so user can adjust
    setPickerSelectedIds(parameters.map(p => p.parameterId));
    setPickerSearch("");
    setPickerOpen(true);
  };

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
      sopCode: `SOP-${paramMaster.id}`,
      tests: paramMaster.name,
      referenceNo: `REF-${paramMaster.category?.slice(0, 2).toUpperCase() || "GL"}-${paramMaster.id}`,
      limitRange: "",
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

  const filteredSuggestions = (id: string, field: "tests" | "sopCode" | "referenceNo", query: string) => {
    const row = parameters.find(p => p.parameterId === id);
    if (!row) return [] as { value: string; label: string; sub?: string }[];

    const allValues = new Set<string>();
    parameters.forEach(p => {
      const v = (p[field] || "").toString();
      if (v) allValues.add(v);
    });

    if (field === "sopCode") {
      parameterLibrary.forEach(p => allValues.add(`SOP-${p.id}`));
    } else if (field === "tests") {
      parameterLibrary.forEach(p => allValues.add(p.name));
    } else if (field === "referenceNo") {
      parameterLibrary.forEach(p =>
        allValues.add(`REF-${(p.category || "GL").slice(0, 2).toUpperCase()}-${p.id}`)
      );
    }

    const list = Array.from(allValues).map(v => ({ value: v, label: v }));
    if (!query) return list.slice(0, 8);
    const q = query.toLowerCase();
    return list.filter(s => s.value.toLowerCase().includes(q)).slice(0, 8);
  };

  const applyLimitRange = (id: string, range: string) => {
    const match = range.match(/^(-?\d*\.?\d+)\s*[-–to]+\s*(-?\d*\.?\d+)$/i);
    if (match) {
      setParameters(parameters.map(p =>
        p.parameterId === id
          ? { ...p, limitRange: range, min: match[1], max: match[2] }
          : p
      ));
    } else {
      handleParamChange(id, "limitRange", range);
    }
  };

  const AutoSuggestCell = ({
    id,
    field,
    placeholder,
  }: {
    id: string;
    field: "tests" | "sopCode" | "referenceNo";
    placeholder: string;
  }) => {
    const row = parameters.find(p => p.parameterId === id);
    if (!row) return null;
    const open = openSuggFor[id] === field;
    const suggestions = open ? filteredSuggestions(id, field, row[field] || "") : [];
    return (
      <Popover open={open} onOpenChange={(o) => setOpenSuggFor({ ...openSuggFor, [id]: o ? field : null })}>
        <PopoverTrigger asChild>
          <div className="relative">
            <Input
              size={1}
              className="h-8 pr-7"
              value={row[field] || ""}
              onChange={(e) => {
                handleParamChange(id, field, e.target.value);
                setOpenSuggFor({ ...openSuggFor, [id]: field });
              }}
              onFocus={() => setOpenSuggFor({ ...openSuggFor, [id]: field })}
              placeholder={placeholder}
            />
            <Search className="absolute right-2 top-2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          </div>
        </PopoverTrigger>
        <PopoverContent className="w-[220px] p-0" align="start">
          {suggestions.length === 0 ? (
            <div className="px-3 py-2 text-xs text-muted-foreground">
              {isRtl ? "لا توجد اقتراحات" : "No suggestions"}
            </div>
          ) : (
            <div className="max-h-56 overflow-y-auto">
              {suggestions.map((s) => (
                <div
                  key={s.value}
                  className={cn(
                    "px-3 py-1.5 text-sm cursor-pointer hover:bg-accent border-b last:border-0",
                    row[field] === s.value && "bg-accent/50"
                  )}
                  onClick={() => {
                    handleParamChange(id, field, s.value);
                    setOpenSuggFor({ ...openSuggFor, [id]: null });
                  }}
                >
                  {s.label}
                </div>
              ))}
            </div>
          )}
        </PopoverContent>
      </Popover>
    );
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

            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                onClick={openPickerDialog}
              >
                <TestTube2 className="mr-2 h-4 w-4" />
                {isRtl ? "إضافة معلمة اختبار" : "Add Test Parameter"}
              </Button>
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
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="w-[180px]">{isRtl ? "المعلمة" : "Parameter"}</TableHead>
                  <TableHead className="w-[140px]">{isRtl ? "كود SOP" : "SOP CODE"}</TableHead>
                  <TableHead className="w-[160px]">{isRtl ? "قائمة معلمات الاختبار" : "Test Parameter List"}</TableHead>
                  <TableHead className="w-[150px]">{isRtl ? "رقم المرجع GL" : "GL Reference No"}</TableHead>
                  <TableHead>{isRtl ? "الطريقة" : "Method"}</TableHead>
                  <TableHead className="w-[100px]">{isRtl ? "الوحدة" : "Unit"}</TableHead>
                  <TableHead className="w-[150px]">{isRtl ? "الحد (أدنى-أقصى)" : "Limit (Min–Max)"}</TableHead>
                  <TableHead className="w-[120px]">{isRtl ? "الهدف" : "Target"}</TableHead>
                  <TableHead className="w-[180px]">{isRtl ? "نوع الحد" : "Limit Type"}</TableHead>
                  <TableHead className="w-[100px] text-center">{isRtl ? "إلزامي" : "Mandatory"}</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {parameters.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={11} className="h-32 text-center text-muted-foreground italic">
                      {isRtl ? "لم يتم إضافة معلمات بعد. استخدم البحث أعلاه للإضافة." : "No parameters added yet. Use the search above to add."}
                    </TableCell>
                  </TableRow>
                ) : (
                  parameters.map((p) => (
                    <TableRow key={p.parameterId}>
                      <TableCell className="font-medium">{p.name}</TableCell>
                      <TableCell>
                        <AutoSuggestCell id={p.parameterId} field="sopCode" placeholder="SOP-..." />
                      </TableCell>
                      <TableCell>
                        <AutoSuggestCell id={p.parameterId} field="tests" placeholder={isRtl ? "اختبار..." : "Test..."} />
                      </TableCell>
                      <TableCell>
                        <AutoSuggestCell id={p.parameterId} field="referenceNo" placeholder="REF-..." />
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{p.method}</TableCell>
                      <TableCell className="text-xs">{p.unit}</TableCell>
                      <TableCell>
                        <Input
                          size={1}
                          className="h-8"
                          value={p.limitRange ?? `${p.min ?? ""}${p.min || p.max ? " - " : ""}${p.max ?? ""}`.trim()}
                          onChange={(e) => applyLimitRange(p.parameterId, e.target.value)}
                          placeholder={isRtl ? "مثال: 0.5 - 1.5" : "e.g. 0.5 - 1.5"}
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

      {/* Multi-select picker for adding parameters from the parameter library */}
      <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
        <DialogContent className="sm:max-w-[720px]">
          <DialogHeader>
            <DialogTitle>
              {isRtl ? "اختر معلمات الاختبار من المكتبة" : "Pick Test Parameters from Library"}
            </DialogTitle>
            <DialogDescription>
              {isRtl
                ? "اختر معلمة أو أكثر من مكتبة المعلمات. ستظهر جميعها في الجدول ويمكنك تعديل الوحدة، الحد، الهدف، نوع الحد، والإلزامية لكل صف."
                : "Select one or more parameters from the parameter library. They will appear in the table below where you can edit unit, limit, target, limit type, and mandatory for each row."}
            </DialogDescription>
          </DialogHeader>
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={isRtl ? "بحث في مكتبة المعلمات..." : "Search parameter library..."}
              className="pl-8"
              value={pickerSearch}
              onChange={(e) => setPickerSearch(e.target.value)}
            />
          </div>
          <ScrollArea className="max-h-[55vh] border rounded-md">
            <div className="divide-y">
              {filteredPickerLibrary.length === 0 && (
                <div className="px-3 py-6 text-center text-sm text-muted-foreground">
                  {isRtl ? "لا توجد معلمات" : "No parameters found"}
                </div>
              )}
              {filteredPickerLibrary.map(p => {
                const checked = pickerSelectedIds.includes(p.id);
                return (
                  <label
                    key={p.id}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-accent/50",
                      checked && "bg-accent/30"
                    )}
                  >
                    <Checkbox
                      checked={checked}
                      onCheckedChange={() => togglePickerSelection(p.id)}
                    />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-primary">{p.name}</p>
                      <p className="text-[11px] text-muted-foreground font-mono">
                        {p.id} · {p.method} · {p.unit} · {p.category}
                      </p>
                    </div>
                  </label>
                );
              })}
            </div>
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPickerOpen(false)}>
              {isRtl ? "إلغاء" : "Cancel"}
            </Button>
            <Button onClick={applyPickerSelection}>
              {isRtl ? "إضافة" : "Add"}{" "}
              {pickerSelectedIds.length > 0 && `(${pickerSelectedIds.length})`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
