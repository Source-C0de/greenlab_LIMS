import { useState } from "react";
import { testMasterData, TestMaster, mockSpecifications } from "@/mock-data/specifications";
import { DataTable } from "@/components/shared/DataTable";
import { Button } from "@/components/ui/button";
import {
  Plus,
  Download,
  Loader2,
  TestTube2,
  Search,
  Eye
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

export default function TestMasterPage() {
  const { language } = useAppContext();
  const isRtl = language === 'ar';
  const [tests, setTests] = useState(testMasterData);
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [selectedTest, setSelectedTest] = useState<TestMaster | null>(null);
  const [specDialogOpen, setSpecDialogOpen] = useState(false);

  const [formData, setFormData] = useState({
    specification: "",
    testName: "",
    sopCode: "",
    tests: "",
    unit: "",
    mu: "",
    limit: "",
    methodReference: "",
    sampleType: "",
    referenceNo: "",
    incubationTemp: "",
    incubationPeriod: "",
    warehouseItems: ""
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.testName || !formData.sopCode) {
      toast.error(isRtl ? "يرجى ملء الحقول المطلوبة" : "Please fill in required fields");
      return;
    }

    setIsSubmitting(true);

    // Simulate API call
    setTimeout(() => {
      const newTest: TestMaster = {
        id: `TM-${String(tests.length + 1).padStart(3, '0')}`,
        ...formData
      };

      setTests([newTest, ...tests]);
      setIsSubmitting(false);
      setOpen(false);
      setFormData({
        specification: "",
        testName: "",
        sopCode: "",
        tests: "",
        unit: "",
        mu: "",
        limit: "",
        methodReference: "",
        sampleType: "",
        referenceNo: "",
        incubationTemp: "",
        incubationPeriod: "",
        warehouseItems: ""
      });
      toast.success(isRtl ? "تم إضافة الاختبار بنجاح" : "Test added successfully");
    }, 800);
  };

  const handleView = (test: TestMaster) => {
    setSelectedTest(test);
    setViewOpen(true);
  };

  const columns = [
    {
      key: "testName",
      header: isRtl ? "اسم الاختبار" : "Test Name",
      render: (item: any) => <span className="font-medium text-primary">{item.testName}</span>
    },
    { key: "sopCode", header: isRtl ? "كود SOP" : "SOP CODE" },
    { key: "specification", header: isRtl ? "المواصفة" : "Specification" },
    { key: "unit", header: isRtl ? "الوحدة" : "Unit" },
    { key: "limit", header: isRtl ? "الحد" : "Limit" },
    { key: "sampleType", header: isRtl ? "نوع العينة" : "Sample Type" },
    {
      key: "actions",
      header: "",
      render: (item: any) => (
        <div className="flex gap-2 justify-end">
          <Button variant="ghost" size="icon" onClick={() => handleView(item)}>
            <Eye className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm">{isRtl ? "تعديل" : "Edit"}</Button>
        </div>
      )
    },
  ];

  const specColumns = [
    { key: "code", header: isRtl ? "كود المواصفة" : "Spec Code" },
    { 
      key: "name", 
      header: isRtl ? "اسم المواصفة" : "Spec Name", 
      render: (item: any) => <span className="font-medium text-primary">{item.name}</span> 
    },
    { key: "productName", header: isRtl ? "المنتج" : "Product" },
    {
      key: "actions",
      header: "",
      render: (item: any) => (
        <div className="flex justify-end">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => {
              setFormData({ ...formData, specification: item.name });
              setSpecDialogOpen(false);
            }}
          >
            {isRtl ? "اختيار" : "Select"}
          </Button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <TestTube2 className="h-8 w-8 text-primary" />
            {isRtl ? "قائمة الاختبارات" : "Test List"}
          </h1>
          <p className="text-muted-foreground mt-1">
            {isRtl ? "إدارة وتكوين طرق ومعايير الاختبار التفصيلية" : "Manage and configure detailed test methods and standards"}
          </p>
        </div>

        <div className="flex gap-2">
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" /> {isRtl ? "إضافة اختبار" : "Add New Test"}
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[700px]">
              <DialogHeader>
                <DialogTitle>{isRtl ? "إضافة اختبار جديد" : "Add New Test to Master"}</DialogTitle>
                <DialogDescription>
                  {isRtl ? "أدخل التفاصيل الكاملة للاختبار الجديد." : "Enter the full details of the new test."}
                </DialogDescription>
              </DialogHeader>

              <ScrollArea className="max-h-[70vh] px-1">
                <form id="test-form" onSubmit={handleSubmit} className="space-y-4 py-4 pr-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="specification">{isRtl ? "المواصفة" : "Specification"}</Label>
                      <div className="flex gap-2">
                        <Input
                          id="specification"
                          value={formData.specification}
                          onChange={(e) => setFormData({ ...formData, specification: e.target.value })}
                          placeholder={isRtl ? "اختر أو اكتب..." : "Select or type..."}
                          className="flex-1"
                        />
                        <Button 
                          type="button" 
                          variant="outline" 
                          size="icon"
                          onClick={() => setSpecDialogOpen(true)}
                        >
                          <Search className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="testName">{isRtl ? "اسم الاختبار" : "Test Name"} <span className="text-destructive">*</span></Label>
                      <Input
                        id="testName"
                        value={formData.testName}
                        onChange={(e) => setFormData({ ...formData, testName: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="sopCode">{isRtl ? "كود SOP" : "SOP CODE"} <span className="text-destructive">*</span></Label>
                      <Input
                        id="sopCode"
                        value={formData.sopCode}
                        onChange={(e) => setFormData({ ...formData, sopCode: e.target.value })}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="tests">{isRtl ? "الاختبارات" : "Tests"}</Label>
                      <Input
                        id="tests"
                        value={formData.tests}
                        onChange={(e) => setFormData({ ...formData, tests: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="unit">{isRtl ? "الوحدة" : "Unit"}</Label>
                      <Input
                        id="unit"
                        value={formData.unit}
                        onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="mu">{isRtl ? "MU" : "MU"}</Label>
                      <Input
                        id="mu"
                        value={formData.mu}
                        onChange={(e) => setFormData({ ...formData, mu: e.target.value })}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="limit">{isRtl ? "الحد" : "Limit"}</Label>
                      <Input
                        id="limit"
                        value={formData.limit}
                        onChange={(e) => setFormData({ ...formData, limit: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="methodReference">{isRtl ? "مرجع الطريقة" : "Method Reference"}</Label>
                      <Input
                        id="methodReference"
                        value={formData.methodReference}
                        onChange={(e) => setFormData({ ...formData, methodReference: e.target.value })}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="sampleType">{isRtl ? "نوع العينة" : "Sample Type"}</Label>
                      <Input
                        id="sampleType"
                        value={formData.sampleType}
                        onChange={(e) => setFormData({ ...formData, sampleType: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="referenceNo">{isRtl ? "الرقم المرجعي" : "Reference No"}</Label>
                      <Input
                        id="referenceNo"
                        value={formData.referenceNo}
                        onChange={(e) => setFormData({ ...formData, referenceNo: e.target.value })}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="incubationTemp">{isRtl ? "درجة حرارة التحضين" : "Incubation Temp"}</Label>
                      <Input
                        id="incubationTemp"
                        value={formData.incubationTemp}
                        onChange={(e) => setFormData({ ...formData, incubationTemp: e.target.value })}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="incubationPeriod">{isRtl ? "مدة التحضين" : "Incubation Period"}</Label>
                      <Input
                        id="incubationPeriod"
                        value={formData.incubationPeriod}
                        onChange={(e) => setFormData({ ...formData, incubationPeriod: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="warehouseItems">{isRtl ? "عناصر المستودع" : "Warehouse Items"}</Label>
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
                    isRtl ? "إضافة اختبار" : "Add Test"
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
        columns={columns}
        searchKey="testName"
        searchPlaceholder={isRtl ? "البحث في الاختبارات..." : "Search tests..."}
      />

      {/* View Dialog */}
      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>{isRtl ? "تفاصيل الاختبار" : "Test Details"}</DialogTitle>
          </DialogHeader>

          {selectedTest && (
            <div className="grid grid-cols-2 gap-y-4 py-4 text-sm">
              <div className="space-y-1">
                <p className="text-muted-foreground font-medium">{isRtl ? "اسم الاختبار" : "Test Name"}</p>
                <p className="font-semibold text-lg">{selectedTest.testName}</p>
              </div>
              <div className="space-y-1">
                <p className="text-muted-foreground font-medium">{isRtl ? "كود SOP" : "SOP CODE"}</p>
                <p className="font-semibold text-lg">{selectedTest.sopCode}</p>
              </div>
              <div className="space-y-1">
                <p className="text-muted-foreground font-medium">{isRtl ? "المواصفة" : "Specification"}</p>
                <p>{selectedTest.specification || "—"}</p>
              </div>
              <div className="space-y-1">
                <p className="text-muted-foreground font-medium">{isRtl ? "نوع العينة" : "Sample Type"}</p>
                <p>{selectedTest.sampleType || "—"}</p>
              </div>
              <div className="space-y-1">
                <p className="text-muted-foreground font-medium">{isRtl ? "الوحدة" : "Unit"}</p>
                <p>{selectedTest.unit || "—"}</p>
              </div>
              <div className="space-y-1">
                <p className="text-muted-foreground font-medium">{isRtl ? "MU" : "MU"}</p>
                <p>{selectedTest.mu || "—"}</p>
              </div>
              <div className="space-y-1">
                <p className="text-muted-foreground font-medium">{isRtl ? "الحد" : "Limit"}</p>
                <p>{selectedTest.limit || "—"}</p>
              </div>
              <div className="space-y-1">
                <p className="text-muted-foreground font-medium">{isRtl ? "مرجع الطريقة" : "Method Reference"}</p>
                <p>{selectedTest.methodReference || "—"}</p>
              </div>
              <div className="space-y-1">
                <p className="text-muted-foreground font-medium">{isRtl ? "درجة حرارة التحضين" : "Incubation Temp"}</p>
                <p>{selectedTest.incubationTemp || "—"}</p>
              </div>
              <div className="space-y-1">
                <p className="text-muted-foreground font-medium">{isRtl ? "مدة التحضين" : "Incubation Period"}</p>
                <p>{selectedTest.incubationPeriod || "—"}</p>
              </div>
              <div className="col-span-2 space-y-1 border-t pt-2 mt-2">
                <p className="text-muted-foreground font-medium">{isRtl ? "عناصر المستودع" : "Warehouse Items"}</p>
                <p className="text-primary font-medium">{selectedTest.warehouseItems || "—"}</p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button onClick={() => setViewOpen(false)}>{isRtl ? "إغلاق" : "Close"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Specification Selection Dialog */}
      <Dialog open={specDialogOpen} onOpenChange={setSpecDialogOpen}>
        <DialogContent className="sm:max-w-[800px]">
          <DialogHeader>
            <DialogTitle>{isRtl ? "اختيار مواصفة" : "Select Specification"}</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <DataTable
              data={mockSpecifications}
              columns={specColumns}
              searchKey="name"
              searchPlaceholder={isRtl ? "البحث في المواصفات..." : "Search specifications..."}
            />
          </div>
          <DialogFooter>
            <Button onClick={() => setSpecDialogOpen(false)} variant="outline">
              {isRtl ? "إغلاق" : "Close"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
