import { useMemo, useState } from "react";
import {
  testMasterData,
  TestMaster,
  methodTypeLibrary,
  parameterLibrary,
} from "@/mock-data/specifications";
import { DataTable } from "@/components/shared/DataTable";
import { Button } from "@/components/ui/button";
import {
  Plus,
  Download,
  Loader2,
  TestTube2,
  Search,
  Eye,
  Check,
  ChevronsUpDown,
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
import { cn } from "@/lib/utils";

type FormState = {
  testCode: string;
  testName: string;
  testParameter: string;
  methodType: string;
  methodReference: string;
  sampleType: string;
  referenceNo: string;
  sopCode: string;
  warehouseItems: string;
};

const emptyForm: FormState = {
  testCode: "",
  testName: "",
  testParameter: "",
  methodType: "",
  methodReference: "",
  sampleType: "",
  referenceNo: "",
  sopCode: "",
  warehouseItems: "",
};

export default function TestMasterPage() {
  const { language } = useAppContext();
  const isRtl = language === 'ar';
  const [tests, setTests] = useState<TestMaster[]>(testMasterData);
  const [methods, setMethods] = useState(methodTypeLibrary);
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [selectedTest, setSelectedTest] = useState<TestMaster | null>(null);

  const [formData, setFormData] = useState<FormState>(emptyForm);

  // Pickers
  const [paramOpen, setParamOpen] = useState(false);
  const [methodOpen, setMethodOpen] = useState(false);
  const [methodMode, setMethodMode] = useState<"select" | "manual">("select");
  const [paramMode, setParamMode] = useState<"select" | "manual">("select");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.testName || !formData.testCode) {
      toast.error(isRtl ? "يرجى ملء الحقول المطلوبة" : "Please fill in required fields");
      return;
    }

    setIsSubmitting(true);

    setTimeout(() => {
      const newTest: TestMaster = {
        id: `TM-${String(tests.length + 1).padStart(3, '0')}`,
        ...formData,
      };

      // If user typed a new method type manually, register it in the master list
      if (
        formData.methodType &&
        !methods.some(m => m.name.toLowerCase() === formData.methodType.toLowerCase())
      ) {
        setMethods(prev => [
          {
            id: `MT-${String(prev.length + 1).padStart(3, '0')}`,
            name: formData.methodType,
            category: 'Other',
          },
          ...prev,
        ]);
      }

      setTests([newTest, ...tests]);
      setIsSubmitting(false);
      setOpen(false);
      setFormData(emptyForm);
      setParamMode("select");
      setMethodMode("select");
      toast.success(isRtl ? "تم إضافة الاختبار بنجاح" : "Test added successfully");
    }, 600);
  };

  const handleView = (test: TestMaster) => {
    setSelectedTest(test);
    setViewOpen(true);
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
        header: isRtl ? "معلمة الاختبار" : "Test Parameter",
        render: (item: TestMaster) => (
          <span className="text-xs">{item.testParameter || "—"}</span>
        ),
      },
      {
        key: "methodType",
        header: isRtl ? "نوع الطريقة" : "Method Type",
        render: (item: TestMaster) => (
          <BadgeLike label={item.methodType} />
        ),
      },
      {
        key: "actions",
        header: "",
        render: (item: TestMaster) => (
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" size="icon" onClick={() => handleView(item)}>
              <Eye className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm">{isRtl ? "تعديل" : "Edit"}</Button>
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
            {isRtl ? "معلمات الاختبار" : "Test Parameters"}
          </h1>
          <p className="text-muted-foreground mt-1">
            {isRtl
              ? "إدارة مكتبة معلمات الاختبار وأنواع الطرق المستخدمة في المختبر"
              : "Manage the master library of test parameters and method types used in the lab"}
          </p>
        </div>

        <div className="flex gap-2">
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" /> {isRtl ? "إضافة معلمة اختبار" : "Add Test Parameter"}
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[720px]">
              <DialogHeader>
                <DialogTitle>
                  {isRtl ? "إضافة معلمة اختبار جديدة" : "Add New Test Parameter"}
                </DialogTitle>
                <DialogDescription>
                  {isRtl
                    ? "اختر معلمة اختبار من المكتبة أو أضف واحدة جديدة، ثم حدد نوع الطريقة."
                    : "Pick a test parameter from the library or add a new one, then choose a method type."}
                </DialogDescription>
              </DialogHeader>

              <ScrollArea className="max-h-[70vh] px-1">
                <form id="test-form" onSubmit={handleSubmit} className="space-y-4 py-4 pr-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="testCode">
                        {isRtl ? "كود الاختبار" : "Test Code"} <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="testCode"
                        value={formData.testCode}
                        onChange={(e) => setFormData({ ...formData, testCode: e.target.value })}
                        placeholder="e.g. TC-MB-001"
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

                  {/* Test Parameter (select or manual) */}
                  <div className="grid gap-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="testParameter">
                        {isRtl ? "معلمة الاختبار" : "Test Parameter"}
                      </Label>
                      <div className="flex items-center gap-1 text-xs">
                        <Button
                          type="button"
                          size="sm"
                          variant={paramMode === "select" ? "default" : "outline"}
                          className="h-6 px-2 text-[11px]"
                          onClick={() => {
                            setParamMode("select");
                            setFormData({ ...formData, testParameter: "" });
                          }}
                        >
                          {isRtl ? "قائمة" : "From list"}
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant={paramMode === "manual" ? "default" : "outline"}
                          className="h-6 px-2 text-[11px]"
                          onClick={() => {
                            setParamMode("manual");
                            setFormData({ ...formData, testParameter: "" });
                          }}
                        >
                          {isRtl ? "إدخال يدوي" : "Manual"}
                        </Button>
                      </div>
                    </div>

                    {paramMode === "select" ? (
                      <Popover open={paramOpen} onOpenChange={setParamOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            type="button"
                            variant="outline"
                            role="combobox"
                            className={cn(
                              "w-full justify-between",
                              !formData.testParameter && "text-muted-foreground"
                            )}
                          >
                            {formData.testParameter || (isRtl ? "اختر معلمة..." : "Select a parameter...")}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                          <Command>
                            <CommandInput placeholder={isRtl ? "بحث في المكتبة..." : "Search library..."} />
                            <CommandList>
                              <CommandEmpty>{isRtl ? "لا توجد نتائج" : "No results."}</CommandEmpty>
                              <CommandGroup>
                                {parameterLibrary.map(p => (
                                  <CommandItem
                                    key={p.id}
                                    value={`${p.name} ${p.method} ${p.unit}`}
                                    onSelect={() => {
                                      setFormData({
                                        ...formData,
                                        testParameter: p.name,
                                        sopCode: formData.sopCode || `SOP-${p.id}`,
                                      });
                                      setParamOpen(false);
                                    }}
                                  >
                                    <Check
                                      className={cn(
                                        "mr-2 h-4 w-4",
                                        formData.testParameter === p.name ? "opacity-100" : "opacity-0"
                                      )}
                                    />
                                    <div className="flex flex-col">
                                      <span className="text-sm">{p.name}</span>
                                      <span className="text-[10px] text-muted-foreground">
                                        {p.method} · {p.unit} · {p.category}
                                      </span>
                                    </div>
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    ) : (
                      <Input
                        id="testParameter"
                        value={formData.testParameter}
                        onChange={(e) => setFormData({ ...formData, testParameter: e.target.value })}
                        placeholder={isRtl ? "اكتب اسم المعلمة..." : "Type parameter name..."}
                      />
                    )}
                  </div>

                  {/* Method Type (select or manual) */}
                  <div className="grid gap-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="methodType">
                        {isRtl ? "نوع الطريقة" : "Method Type"}
                      </Label>
                      <div className="flex items-center gap-1 text-xs">
                        <Button
                          type="button"
                          size="sm"
                          variant={methodMode === "select" ? "default" : "outline"}
                          className="h-6 px-2 text-[11px]"
                          onClick={() => {
                            setMethodMode("select");
                            setFormData({ ...formData, methodType: "" });
                          }}
                        >
                          {isRtl ? "قائمة" : "From list"}
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant={methodMode === "manual" ? "default" : "outline"}
                          className="h-6 px-2 text-[11px]"
                          onClick={() => {
                            setMethodMode("manual");
                            setFormData({ ...formData, methodType: "" });
                          }}
                        >
                          {isRtl ? "إدخال يدوي" : "Manual"}
                        </Button>
                      </div>
                    </div>

                    {methodMode === "select" ? (
                      <Popover open={methodOpen} onOpenChange={setMethodOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            type="button"
                            variant="outline"
                            role="combobox"
                            className={cn(
                              "w-full justify-between",
                              !formData.methodType && "text-muted-foreground"
                            )}
                          >
                            {formData.methodType || (isRtl ? "اختر نوع الطريقة..." : "Select a method type...")}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                          <Command>
                            <CommandInput placeholder={isRtl ? "بحث في الأنواع..." : "Search method types..."} />
                            <CommandList>
                              <CommandEmpty>{isRtl ? "لا توجد نتائج" : "No results."}</CommandEmpty>
                              <CommandGroup>
                                {methods.map(m => (
                                  <CommandItem
                                    key={m.id}
                                    value={`${m.name} ${m.category}`}
                                    onSelect={() => {
                                      setFormData({ ...formData, methodType: m.name });
                                      setMethodOpen(false);
                                    }}
                                  >
                                    <Check
                                      className={cn(
                                        "mr-2 h-4 w-4",
                                        formData.methodType === m.name ? "opacity-100" : "opacity-0"
                                      )}
                                    />
                                    <div className="flex flex-col">
                                      <span className="text-sm">{m.name}</span>
                                      <span className="text-[10px] text-muted-foreground">{m.category}</span>
                                    </div>
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    ) : (
                      <Input
                        id="methodType"
                        value={formData.methodType}
                        onChange={(e) => setFormData({ ...formData, methodType: e.target.value })}
                        placeholder={isRtl ? "اكتب نوع طريقة جديد..." : "Type a new method type..."}
                      />
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
                      {isRtl ? "جاري الإضافة..." : "Adding..."}
                    </>
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
              <div className="space-y-1">
                <p className="text-muted-foreground font-medium">
                  {isRtl ? "معلمة الاختبار" : "Test Parameter"}
                </p>
                <p>{selectedTest.testParameter || "—"}</p>
              </div>
              <div className="space-y-1">
                <p className="text-muted-foreground font-medium">
                  {isRtl ? "نوع الطريقة" : "Method Type"}
                </p>
                <p>{selectedTest.methodType || "—"}</p>
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
              <div className="space-y-1">
                <p className="text-muted-foreground font-medium">
                  {isRtl ? "الرقم المرجعي" : "Reference No"}
                </p>
                <p className="font-mono">{selectedTest.referenceNo || "—"}</p>
              </div>
              <div className="col-span-2 space-y-1 border-t pt-2 mt-2">
                <p className="text-muted-foreground font-medium">
                  {isRtl ? "عناصر المستودع" : "Warehouse Items"}
                </p>
                <p className="text-primary font-medium">{selectedTest.warehouseItems || "—"}</p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button onClick={() => setViewOpen(false)}>{isRtl ? "إغلاق" : "Close"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function BadgeLike({ label }: { label?: string }) {
  if (!label) return <span className="text-muted-foreground">—</span>;
  return (
    <span className="inline-flex items-center rounded-full bg-primary/10 text-primary px-2 py-0.5 text-xs font-medium">
      {label}
    </span>
  );
}
