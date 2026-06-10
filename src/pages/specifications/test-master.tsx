import { useMemo, useState } from "react";
import {
  testMasterData,
  TestMaster,
  parameterLibrary,
  TestParameterRow,
  TestLimitType,
} from "@/mock-data/specifications";
import { DataTable } from "@/components/shared/DataTable";
import { Button } from "@/components/ui/button";
import {
  Plus,
  Download,
  Loader2,
  TestTube2,
  Eye,
  Pencil,
  Trash2,
  X,
  Check,
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
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

type FormState = {
  testName: string;
  testParameters: string[]; // joined display names (kept for backward compat with table render)
  parameterRows: TestParameterRow[]; // rich per-parameter rows
  methodReference: string;
  sampleType: string;
  referenceNo: string;
  sopCode: string;
  warehouseItems: string;
};

const emptyForm: FormState = {
  testName: "",
  testParameters: [],
  parameterRows: [],
  methodReference: "",
  sampleType: "",
  referenceNo: "",
  sopCode: "",
  warehouseItems: "",
};

const limitTypeOptions: TestLimitType[] = [
  'Range',
  'Max Only',
  'Min Only',
  'Exact Value',
  'Pass / Fail',
  'Text',
  'Not Detected',
];

const newRowId = () =>
  `TPR-${Date.now().toString(36)}-${Math.floor(Math.random() * 1000).toString(36)}`;

function safeParseRows(raw?: string | null): TestParameterRow[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed
        .filter((r) => r && typeof r === 'object' && typeof r.name === 'string')
        .map((r) => ({
          id: r.id || newRowId(),
          name: r.name,
          methodReference: r.methodReference || '',
          limitRange: r.limitRange || '',
          limitType: (r.limitType as TestLimitType) || 'Range',
          method: r.method,
          unit: r.unit,
          mu: r.mu,
          category: r.category,
          isCustom: !!r.isCustom,
        }));
    }
  } catch {
    /* ignore malformed */
  }
  return [];
}

// Generate the next sequential GL-TM-N test code based on existing tests.
function generateNextTestCode(existing: TestMaster[]): string {
  const max = existing.reduce((acc, t) => {
    const m = /GL-TM-(\d+)/i.exec(t.testCode);
    return m ? Math.max(acc, parseInt(m[1], 10)) : acc;
  }, 0);
  return `GL-TM-${max + 1}`;
}

export default function TestMasterPage() {
  const { language } = useAppContext();
  const isRtl = language === 'ar';
  const [tests, setTests] = useState<TestMaster[]>(testMasterData);
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [selectedTest, setSelectedTest] = useState<TestMaster | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const [formData, setFormData] = useState<FormState>(emptyForm);

  // Multi-select picker for test parameters (sourced from parameterLibrary)
  const [paramOpen, setParamOpen] = useState(false);
  const [paramSearch, setParamSearch] = useState("");

  const filteredLibrary = useMemo(() => {
    const q = paramSearch.toLowerCase().trim();
    if (!q) return parameterLibrary;
    return parameterLibrary.filter(p =>
      p.name.toLowerCase().includes(q) ||
      p.method.toLowerCase().includes(q) ||
      p.unit.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q)
    );
  }, [paramSearch]);

  const addLibraryParameter = (name: string) => {
    setFormData(prev => {
      if (prev.testParameters.includes(name)) return prev;
      const lib = parameterLibrary.find(p => p.name === name);
      const row: TestParameterRow = {
        id: newRowId(),
        name,
        methodReference: '',
        limitRange: '',
        limitType: 'Range',
        method: lib?.method,
        unit: lib?.unit,
        mu: '',
        category: lib?.category,
      };
      return {
        ...prev,
        testParameters: [...prev.testParameters, name],
        parameterRows: [...prev.parameterRows, row],
      };
    });
  };

  const addCustomParameter = () => {
    setFormData(prev => {
      const baseName = `Custom Parameter ${prev.parameterRows.length + 1}`;
      const row: TestParameterRow = {
        id: newRowId(),
        name: baseName,
        methodReference: '',
        limitRange: '',
        limitType: 'Range',
        mu: '',
        isCustom: true,
      };
      return {
        ...prev,
        testParameters: [...prev.testParameters, baseName],
        parameterRows: [...prev.parameterRows, row],
      };
    });
  };

  const updateParameterRow = (id: string, patch: Partial<TestParameterRow>) => {
    setFormData(prev => {
      const rows = prev.parameterRows.map(r =>
        r.id === id
          ? {
              ...r,
              ...patch,
              // Keep the joined display name in sync when the row's `name` changes.
              name: patch.name ?? r.name,
            }
          : r
      );
      const names = rows.map(r => r.name);
      return { ...prev, parameterRows: rows, testParameters: names };
    });
  };

  const removeParameter = (id: string) => {
    setFormData(prev => {
      const rows = prev.parameterRows.filter(r => r.id !== id);
      return {
        ...prev,
        parameterRows: rows,
        testParameters: rows.map(r => r.name),
      };
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.testName) {
      toast.error(isRtl ? "يرجى ملء الحقول المطلوبة" : "Please fill in required fields");
      return;
    }
    if (formData.parameterRows.length === 0) {
      toast.error(
        isRtl
          ? "يرجى إضافة معلمة اختبار واحدة على الأقل"
          : "Please add at least one test parameter"
      );
      return;
    }

    setIsSubmitting(true);

    setTimeout(() => {
      const joinedNames = formData.parameterRows.map(r => r.name).join(", ");
      const parameterDetails = JSON.stringify(formData.parameterRows);

      if (editingId) {
        // Update existing test
        setTests(prev =>
          prev.map(t =>
            t.id === editingId
              ? {
                  ...t,
                  testName: formData.testName,
                  testParameter: joinedNames,
                  methodType: "",
                  methodReference: formData.methodReference,
                  sampleType: formData.sampleType,
                  referenceNo: formData.referenceNo,
                  sopCode: formData.sopCode,
                  warehouseItems: formData.warehouseItems,
                  parameterDetails,
                }
              : t
          )
        );
        toast.success(isRtl ? "تم تحديث الاختبار بنجاح" : "Test updated successfully");
      } else {
        const newTest: TestMaster = {
          id: `TM-${String(tests.length + 1).padStart(3, '0')}`,
          testCode: generateNextTestCode(tests),
          testName: formData.testName,
          testParameter: joinedNames,
          methodType: "",
          methodReference: formData.methodReference,
          sampleType: formData.sampleType,
          referenceNo: formData.referenceNo,
          sopCode: formData.sopCode,
          warehouseItems: formData.warehouseItems,
          parameterDetails,
        };
        setTests([newTest, ...tests]);
        toast.success(isRtl ? "تم إضافة الاختبار بنجاح" : "Test added successfully");
      }
      setIsSubmitting(false);
      setOpen(false);
      setEditingId(null);
      setFormData(emptyForm);
      setParamSearch("");
    }, 600);
  };

  const handleView = (test: TestMaster) => {
    setSelectedTest(test);
    setViewOpen(true);
  };

  const handleEdit = (test: TestMaster) => {
    const rows = safeParseRows(test.parameterDetails);
    // If we don't have rich rows stored, synthesize them from the joined names
    // so the user still gets an editable list in the form.
    const fallbackRows: TestParameterRow[] = rows.length
      ? rows
      : test.testParameter
      ? test.testParameter
          .split(",")
          .map(s => s.trim())
          .filter(Boolean)
          .map(name => ({
            id: newRowId(),
            name,
            methodReference: '',
            limitRange: '',
            limitType: 'Range' as TestLimitType,
            mu: '',
          }))
      : [];

    setEditingId(test.id);
    setFormData({
      testName: test.testName,
      testParameters: fallbackRows.map(r => r.name),
      parameterRows: fallbackRows,
      methodReference: test.methodReference,
      sampleType: test.sampleType,
      referenceNo: test.referenceNo,
      sopCode: test.sopCode,
      warehouseItems: test.warehouseItems,
    });
    setParamSearch("");
    setOpen(true);
  };

  const handleAddNew = () => {
    setEditingId(null);
    setFormData(emptyForm);
    setParamSearch("");
    setOpen(true);
  };

  const confirmDelete = () => {
    if (!deleteId) return;
    setTests(prev => prev.filter(t => t.id !== deleteId));
    toast.success(isRtl ? "تم حذف الاختبار بنجاح" : "Test deleted successfully");
    setDeleteId(null);
  };

  const columns = useMemo(
    () => [
      {
        key: "testCode",
        header: isRtl ? "كود الاختبار" : "Test Code",
        render: (item: TestMaster) => (
          <span className="font-mono font-medium">{item.testCode}</span>
        ),
      },
      {
        key: "testName",
        header: isRtl ? "اسم الاختبار" : "Test Name",
        render: (item: TestMaster) => (
          <span className="font-medium text-primary">{item.testName}</span>
        ),
      },
      {
        key: "testParameter",
        header: isRtl ? "معلمات الاختبار" : "Test Parameters",
        render: (item: TestMaster) => (
          <div className="flex flex-wrap gap-1 max-w-[260px]">
            {item.testParameter
              ? item.testParameter
                  .split(",")
                  .map(s => s.trim())
                  .filter(Boolean)
                  .map(p => (
                    <span
                      key={p}
                      className="inline-flex items-center rounded-full bg-primary/10 text-primary px-2 py-0.5 text-[11px] font-medium"
                    >
                      {p}
                    </span>
                  ))
              : <span className="text-muted-foreground text-xs">—</span>}
          </div>
        ),
      },
      {
        key: "actions",
        header: "",
        render: (item: TestMaster) => (
          <div className="flex gap-2 justify-end">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-primary hover:bg-primary/10"
              onClick={() => handleView(item)}
              title={isRtl ? "عرض" : "View"}
            >
              <Eye className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-primary hover:bg-primary/10"
              onClick={() => handleEdit(item)}
              title={isRtl ? "تعديل" : "Edit"}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive hover:bg-destructive/10"
              onClick={() => setDeleteId(item.id)}
              title={isRtl ? "حذف" : "Delete"}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ),
      },
    ],
    [isRtl]
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <TestTube2 className="h-8 w-8 text-primary" />
            {isRtl ? "معلمات الاختبار" : "Test Methods"}
          </h1>
          <p className="text-muted-foreground mt-1">
            {isRtl
              ? "إدارة مكتبة معلمات الاختبار وأنواع الطرق المستخدمة في المختبر"
              : "Manage the master library of test parameters and method types used in the lab"}
          </p>
        </div>

        <div className="flex gap-2">
          <Dialog open={open} onOpenChange={(v) => {
            setOpen(v);
            if (!v) {
              setEditingId(null);
              setFormData(emptyForm);
              setParamSearch("");
            }
          }}>
            <DialogTrigger asChild>
              <Button onClick={handleAddNew}>
                <Plus className="mr-2 h-4 w-4" /> {isRtl ? "إضافة معلمة اختبار" : "Add Test Parameter"}
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[720px]">
              <DialogHeader>
                <DialogTitle>
                  {editingId
                    ? isRtl
                      ? "تعديل الاختبار"
                      : "Edit Test"
                    : isRtl
                    ? "إضافة اختبار جديد"
                    : "Add New Test"}
                </DialogTitle>
                <DialogDescription>
                  {editingId
                    ? isRtl
                      ? "قم بتحديث تفاصيل الاختبار ومعلماته."
                      : "Update the test details and parameters."
                    : isRtl
                    ? "سيتم إنشاء كود الاختبار تلقائيًا. اختر معلمة اختبار واحدة أو أكثر من المكتبة، ثم أكمل التفاصيل."
                    : "The test code is generated automatically. Pick one or more test parameters from the library, then fill in the details."}
                </DialogDescription>
              </DialogHeader>

              <ScrollArea className="max-h-[70vh] px-1">
                <form id="test-form" onSubmit={handleSubmit} className="space-y-4 py-4 pr-3">
                  {/* Test Code (auto-generated, read-only) */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="testCode">
                        {isRtl ? "كود الاختبار" : "Test Code"}
                      </Label>
                      <Input
                        id="testCode"
                        value={
                          editingId
                            ? tests.find(t => t.id === editingId)?.testCode ||
                              generateNextTestCode(tests)
                            : generateNextTestCode(tests)
                        }
                        readOnly
                        className="bg-muted font-mono cursor-not-allowed"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="testName">
                        {isRtl ? "اسم الاختبار" : "Test Name"} <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="testName"
                        value={formData.testName}
                        onChange={(e) => setFormData({ ...formData, testName: e.target.value })}
                        placeholder="e.g. Salmonella Detection"
                      />
                    </div>
                  </div>

                  {/* Test Parameters (multi-select with rich per-row details) */}
                  <div className="grid gap-2">
                    <div className="flex items-center justify-between">
                      <Label>
                        {isRtl ? "معلمات الاختبار" : "Test Parameters"}{" "}
                        <span className="text-destructive">*</span>
                      </Label>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2 text-xs"
                          onClick={addCustomParameter}
                        >
                          <Plus className="mr-1 h-3 w-3" />
                          {isRtl ? "جديد" : "New"}
                        </Button>
                        <Popover open={paramOpen} onOpenChange={setParamOpen}>
                          <PopoverTrigger asChild>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="h-7 px-2 text-xs"
                            >
                              <Plus className="mr-1 h-3 w-3" />
                              {isRtl ? "إضافة من المكتبة" : "Add from Library"}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent
                            className="w-[--radix-popover-trigger-width] p-0"
                            align="end"
                          >
                            <Command>
                              <CommandInput
                                placeholder={isRtl ? "بحث في المكتبة..." : "Search library..."}
                                value={paramSearch}
                                onValueChange={setParamSearch}
                              />
                              <CommandList>
                                <CommandEmpty>
                                  {isRtl ? "لا توجد نتائج" : "No results."}
                                </CommandEmpty>
                                <CommandGroup
                                  heading={isRtl ? "مكتبة المعلمات" : "Parameter Library"}
                                >
                                  {filteredLibrary.map(p => {
                                    const selected = formData.testParameters.includes(p.name);
                                    return (
                                      <CommandItem
                                        key={p.id}
                                        value={`${p.name} ${p.method} ${p.unit}`}
                                        onSelect={() => {
                                          if (!selected) {
                                            addLibraryParameter(p.name);
                                            setParamOpen(false);
                                            setParamSearch("");
                                          }
                                        }}
                                        disabled={selected}
                                      >
                                        <Check
                                          className={cn(
                                            "mr-2 h-4 w-4",
                                            selected ? "opacity-100" : "opacity-0"
                                          )}
                                        />
                                        <div className="flex flex-col">
                                          <span className="text-sm font-medium">{p.name}</span>
                                          <span className="text-[10px] text-muted-foreground">
                                            {isRtl ? "الطريقة:" : "Method:"} {p.method} ·{" "}
                                            {isRtl ? "الوحدة:" : "Unit:"} {p.unit}
                                          </span>
                                        </div>
                                      </CommandItem>
                                    );
                                  })}
                                </CommandGroup>
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                      </div>
                    </div>

                    {formData.parameterRows.length === 0 ? (
                      <div className="min-h-[40px] border border-dashed rounded-md flex items-center justify-center text-xs text-muted-foreground px-3 py-2">
                        {isRtl
                          ? "لم تتم إضافة معلمات. انقر \"إضافة من المكتبة\" للاختيار أو \"جديد\" لإضافة معلمة مخصصة."
                          : "No parameters added yet. Click \"Add from Library\" to pick one, or \"New\" to add a custom parameter."}
                      </div>
                    ) : (
                      <div className="border rounded-md divide-y">
                        {formData.parameterRows.map((row) => (
                          <div
                            key={row.id}
                            className="grid grid-cols-12 gap-2 items-start p-2"
                          >
                            <div className="col-span-12 sm:col-span-3 grid gap-1">
                              <Label className="text-[10px] text-muted-foreground uppercase tracking-wide">
                                {isRtl ? "الاسم" : "Name"}
                              </Label>
                              <Input
                                value={row.name}
                                onChange={(e) =>
                                  updateParameterRow(row.id, { name: e.target.value })
                                }
                                placeholder={
                                  isRtl ? "اسم المعلمة" : "Parameter name"
                                }
                                className="h-8"
                              />
                            </div>
                            <div className="col-span-6 sm:col-span-1 grid gap-1">
                              <Label className="text-[10px] text-muted-foreground uppercase tracking-wide">
                                {isRtl ? "الوحدة" : "Unit"}
                              </Label>
                              <Input
                                value={row.unit || ""}
                                onChange={(e) =>
                                  updateParameterRow(row.id, {
                                    unit: e.target.value,
                                  })
                                }
                                placeholder="mg/L"
                                className="h-8"
                              />
                            </div>
                            <div className="col-span-6 sm:col-span-1 grid gap-1">
                              <Label className="text-[10px] text-muted-foreground uppercase tracking-wide">
                                {isRtl ? "عدم اليقين (MU)" : "MU"}
                              </Label>
                              <Input
                                value={row.mu || ""}
                                onChange={(e) =>
                                  updateParameterRow(row.id, {
                                    mu: e.target.value,
                                  })
                                }
                                placeholder="±0.05"
                                className="h-8"
                              />
                            </div>
                            <div className="col-span-12 sm:col-span-3 grid gap-1">
                              <Label className="text-[10px] text-muted-foreground uppercase tracking-wide">
                                {isRtl ? "مرجع الطريقة" : "Method Reference"}
                              </Label>
                              <Input
                                value={row.methodReference}
                                onChange={(e) =>
                                  updateParameterRow(row.id, {
                                    methodReference: e.target.value,
                                  })
                                }
                                placeholder="ISO 6579-1"
                                className="h-8"
                              />
                            </div>
                            <div className="col-span-6 sm:col-span-2 grid gap-1">
                              <Label className="text-[10px] text-muted-foreground uppercase tracking-wide">
                                {isRtl ? "نوع الحد" : "Limit Type"}
                              </Label>
                              <Select
                                value={row.limitType}
                                onValueChange={(v) =>
                                  updateParameterRow(row.id, {
                                    limitType: v as TestLimitType,
                                  })
                                }
                              >
                                <SelectTrigger className="h-8">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {limitTypeOptions.map((t) => (
                                    <SelectItem key={t} value={t}>
                                      {t}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="col-span-5 sm:col-span-1 grid gap-1">
                              <Label className="text-[10px] text-muted-foreground uppercase tracking-wide">
                                {isRtl ? "الحد" : "Limit"}
                              </Label>
                              <Input
                                value={row.limitRange}
                                onChange={(e) =>
                                  updateParameterRow(row.id, {
                                    limitRange: e.target.value,
                                  })
                                }
                                placeholder={
                                  row.limitType === 'Range'
                                    ? '0 - 100'
                                    : row.limitType === 'Pass / Fail' ||
                                      row.limitType === 'Text' ||
                                      row.limitType === 'Not Detected'
                                    ? 'Absent / Clear...'
                                    : '0'
                                }
                                className="h-8"
                              />
                            </div>
                            <div className="col-span-1 flex items-end justify-end pb-0.5">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:bg-destructive/10"
                                onClick={() => removeParameter(row.id)}
                                title={isRtl ? "إزالة" : "Remove"}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                            {row.isCustom && (
                              <div className="col-span-12 -mt-1">
                                <span className="text-[10px] text-amber-600 font-medium">
                                  {isRtl ? "معلمة مخصصة" : "Custom parameter"}
                                </span>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="sopCode">{isRtl ? "كود SOP" : "SOP Code"}</Label>
                      <Input
                        id="sopCode"
                        value={formData.sopCode}
                        onChange={(e) => setFormData({ ...formData, sopCode: e.target.value })}
                        placeholder="SOP-MB-001"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="methodReference">
                        {isRtl ? "مرجع الطريقة" : "Method Reference"}
                      </Label>
                      <Input
                        id="methodReference"
                        value={formData.methodReference}
                        onChange={(e) => setFormData({ ...formData, methodReference: e.target.value })}
                        placeholder="e.g. ISO 6579-1"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="sampleType">{isRtl ? "نوع العينة" : "Sample Type"}</Label>
                      <Input
                        id="sampleType"
                        value={formData.sampleType}
                        onChange={(e) => setFormData({ ...formData, sampleType: e.target.value })}
                        placeholder={isRtl ? "مياه، لحوم، أعلاف..." : "Water, Meat, Feed..."}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="referenceNo">{isRtl ? "الرقم المرجعي" : "Reference No"}</Label>
                      <Input
                        id="referenceNo"
                        value={formData.referenceNo}
                        onChange={(e) => setFormData({ ...formData, referenceNo: e.target.value })}
                        placeholder="REF-2024-001"
                      />
                    </div>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="warehouseItems">
                      {isRtl ? "عناصر المستودع" : "Warehouse Items"}
                    </Label>
                    <Input
                      id="warehouseItems"
                      placeholder="e.g. Media, Reagents, Kits..."
                      value={formData.warehouseItems}
                      onChange={(e) => setFormData({ ...formData, warehouseItems: e.target.value })}
                    />
                  </div>
                </form>
              </ScrollArea>

              <DialogFooter className="pt-4 border-t">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  {isRtl ? "إلغاء" : "Cancel"}
                </Button>
                <Button type="submit" form="test-form" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {editingId
                        ? isRtl
                          ? "جاري التحديث..."
                          : "Updating..."
                        : isRtl
                        ? "جاري الإضافة..."
                        : "Adding..."}
                    </>
                  ) : editingId ? (
                    isRtl ? "حفظ التغييرات" : "Save Changes"
                  ) : (
                    isRtl ? "إضافة معلمة اختبار" : "Add Test Parameter"
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" /> {isRtl ? "تصدير" : "Export"}
          </Button>
        </div>
      </div>

      <DataTable
        data={tests}
        columns={columns as any}
        searchKey="testName"
        searchPlaceholder={isRtl ? "البحث في معلمات الاختبار..." : "Search test parameters..."}
      />

      {/* View Dialog */}
      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle>
              {isRtl ? "تفاصيل معلمة الاختبار" : "Test Parameter Details"}
            </DialogTitle>
          </DialogHeader>

          {selectedTest && (
            <div className="grid grid-cols-2 gap-y-4 py-4 text-sm">
              <div className="space-y-1">
                <p className="text-muted-foreground font-medium">
                  {isRtl ? "كود الاختبار" : "Test Code"}
                </p>
                <p className="font-mono font-semibold text-lg">{selectedTest.testCode}</p>
              </div>
              <div className="space-y-1">
                <p className="text-muted-foreground font-medium">
                  {isRtl ? "اسم الاختبار" : "Test Name"}
                </p>
                <p className="font-semibold text-lg text-primary">{selectedTest.testName}</p>
              </div>
              <div className="col-span-2 space-y-2">
                <p className="text-muted-foreground font-medium">
                  {isRtl ? "معلمات الاختبار" : "Test Parameters"}
                </p>
                {(() => {
                  const viewRows = safeParseRows(selectedTest.parameterDetails);
                  const finalRows =
                    viewRows.length > 0
                      ? viewRows
                      : selectedTest.testParameter
                        .split(",")
                        .map(s => s.trim())
                        .filter(Boolean)
                        .map(name => ({
                          id: `view-${name}`,
                          name,
                          methodReference: "",
                          limitRange: "",
                          limitType: "Range" as TestLimitType,
                          unit: "",
                          mu: "",
                        }));
                  if (finalRows.length === 0) {
                    return <p className="text-muted-foreground text-xs">—</p>;
                  }
                  return (
                    <div className="border rounded-md overflow-hidden">
                      <div className="grid grid-cols-12 gap-2 px-2 py-1.5 bg-muted/50 text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                        <div className="col-span-3">
                          {isRtl ? "الاسم" : "Name"}
                        </div>
                        <div className="col-span-2">
                          {isRtl ? "الوحدة" : "Unit"}
                        </div>
                        <div className="col-span-1">
                          {isRtl ? "عدم اليقين (MU)" : "MU"}
                        </div>
                        <div className="col-span-3">
                          {isRtl ? "مرجع الطريقة" : "Method Reference"}
                        </div>
                        <div className="col-span-1">
                          {isRtl ? "نوع الحد" : "Limit Type"}
                        </div>
                        <div className="col-span-2">
                          {isRtl ? "الحد" : "Limit"}
                        </div>
                      </div>
                      {finalRows.map((row) => (
                        <div
                          key={row.id}
                          className="grid grid-cols-12 gap-2 px-2 py-1.5 text-xs border-t first:border-t-0"
                        >
                          <div className="col-span-3 font-medium">{row.name}</div>
                          <div className="col-span-2 font-mono text-muted-foreground">
                            {row.unit || "—"}
                          </div>
                          <div className="col-span-1 font-mono text-muted-foreground">
                            {row.mu || "—"}
                          </div>
                          <div className="col-span-3 font-mono text-muted-foreground">
                            {row.methodReference || "—"}
                          </div>
                          <div className="col-span-1 text-muted-foreground">
                            {row.limitType}
                          </div>
                          <div className="col-span-2 font-mono">{row.limitRange || "—"}</div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
              <div className="space-y-1">
                <p className="text-muted-foreground font-medium">
                  {isRtl ? "كود SOP" : "SOP Code"}
                </p>
                <p className="font-mono">{selectedTest.sopCode || "—"}</p>
              </div>
              <div className="space-y-1">
                <p className="text-muted-foreground font-medium">
                  {isRtl ? "مرجع الطريقة" : "Method Reference"}
                </p>
                <p>{selectedTest.methodReference || "—"}</p>
              </div>
              <div className="space-y-1">
                <p className="text-muted-foreground font-medium">
                  {isRtl ? "نوع العينة" : "Sample Type"}
                </p>
                <p>{selectedTest.sampleType || "—"}</p>
              </div>
              <div className="col-span-2 space-y-1 border-t pt-2 mt-2">
                <p className="text-muted-foreground font-medium">
                  {isRtl ? "عناصر المستودع" : "Warehouse Items"}
                </p>
                <p className="text-primary font-medium">{selectedTest.warehouseItems || "—"}</p>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button
              variant="destructive"
              onClick={() => {
                if (selectedTest) setDeleteId(selectedTest.id);
                setViewOpen(false);
              }}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              {isRtl ? "حذف" : "Delete"}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                if (selectedTest) handleEdit(selectedTest);
                setViewOpen(false);
              }}
            >
              <Pencil className="mr-2 h-4 w-4" />
              {isRtl ? "تعديل" : "Edit"}
            </Button>
            <Button onClick={() => setViewOpen(false)}>{isRtl ? "إغلاق" : "Close"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteId} onOpenChange={(v) => { if (!v) setDeleteId(null); }}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>
              {isRtl ? "تأكيد الحذف" : "Confirm Deletion"}
            </DialogTitle>
            <DialogDescription>
              {isRtl
                ? "هل أنت متأكد من حذف هذا الاختبار؟ لا يمكن التراجع عن هذا الإجراء."
                : "Are you sure you want to delete this test? This action cannot be undone."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteId(null)}>
              {isRtl ? "إلغاء" : "Cancel"}
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              <Trash2 className="mr-2 h-4 w-4" />
              {isRtl ? "حذف" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
