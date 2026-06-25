
import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import { mockSpecifications } from "@/mock-data/specifications";
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
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
} from "@/components/ui/card";
import {
  Save,
  ArrowLeft,
  CheckCircle2,
  Info
} from "lucide-react";
import { useAppContext } from "@/context/AppContext";
import { toast } from "sonner";

export default function NewSpecification() {
  const [, setLocation] = useLocation();
  const { language } = useAppContext();
  const isRtl = language === 'ar';

  // Edit-mode support: read optional `?id=...` query param
  const search = typeof window !== "undefined" ? window.location.search : "";
  const editId = useMemo(() => {
    const params = new URLSearchParams(search);
    return params.get("id");
  }, [search]);
  const editingSpec = useMemo(
    () => (editId ? mockSpecifications.find((s) => s.id === editId) : undefined),
    [editId]
  );

  const [formData, setFormData] = useState(() =>
    editingSpec
      ? {
          code: editingSpec.code,
          name: editingSpec.name,
          category: editingSpec.category || "",
          issuanceDate:
            editingSpec.issuanceDate || new Date().toISOString().split("T")[0],
        }
      : {
          code: `SPEC-${Math.floor(Math.random() * 10000)
            .toString()
            .padStart(4, "0")}`,
          name: "",
          category: "",
          issuanceDate: new Date().toISOString().split("T")[0],
        }
  );

  const handleSave = () => {
    if (!formData.name || !formData.issuanceDate) {
      toast.error(isRtl ? "يرجى ملء جميع الحقول المطلوبة" : "Please fill in all required fields");
      return;
    }

    if (editingSpec) {
      // Update in place
      const idx = mockSpecifications.findIndex((s) => s.id === editingSpec.id);
      if (idx >= 0) {
        mockSpecifications[idx] = {
          ...mockSpecifications[idx],
          code: formData.code,
          name: formData.name,
          category: formData.category,
          issuanceDate: formData.issuanceDate,
        };
      }
      toast.success(
        isRtl
          ? `تم تحديث المواصفة ${formData.code} بنجاح`
          : `Specification ${formData.code} updated successfully`
      );
    } else {
      // Create new
      const newSpec = {
        id: `SPEC-${Math.floor(Math.random() * 10000)
          .toString()
          .padStart(4, "0")}`,
        code: formData.code,
        name: formData.name,
        category: formData.category,
        issuanceDate: formData.issuanceDate,
        parameters: [],
      };
      mockSpecifications.unshift(newSpec);
      toast.success(
        isRtl
          ? `تم حفظ المواصفة ${formData.code} بنجاح`
          : `Specification ${formData.code} saved successfully`
      );
    }
    setLocation("/specifications");
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => setLocation("/specifications")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {editingSpec
              ? isRtl
                ? `تعديل المواصفة: ${formData.code}`
                : `Edit Specification: ${formData.code}`
              : isRtl
              ? "إضافة مواصفة جديدة"
              : "Add New Specification"}
          </h1>
          <p className="text-muted-foreground">
            {editingSpec
              ? isRtl
                ? "تحديث المعلومات الأساسية لهذه المواصفة"
                : "Update the basic information for this specification"
              : isRtl
              ? "إنشاء معيار جودة جديد للمنتجات والمواد"
              : "Create a new quality standard for products and materials"}
          </p>
        </div>
      </div>

      <Card className="lg:col-span-3 border-primary/10 shadow-sm overflow-hidden">
        <CardHeader className="bg-primary/5 border-b py-4">
          <CardTitle className="text-lg flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-primary" />
            {isRtl ? "المعلومات الأساسية" : "Basic Information"}
          </CardTitle>
          <CardDescription>
            {isRtl
              ? "الكود والاسم والفئة وتاريخ الإصدار للمواصفة."
              : "Specification code, name, category, and issuance date."}
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <Label>{isRtl ? "كود المواصفة" : "Specification Code"}</Label>
              <Input
                value={formData.code}
                disabled={!editingSpec}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                className={!editingSpec ? "bg-muted font-mono" : "font-mono"}
              />
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
              <Label>{isRtl ? "الفئة" : "Category"}</Label>
              <Select
                value={formData.category}
                onValueChange={(val) => setFormData({ ...formData, category: val })}
              >
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
              <Label>{isRtl ? "تاريخ الإصدار" : "Issuance Date"} <span className="text-destructive">*</span></Label>
              <Input
                type="date"
                value={formData.issuanceDate}
                onChange={(e) => setFormData({ ...formData, issuanceDate: e.target.value })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-dashed border-2 bg-muted/20">
        <CardContent className="py-6 flex items-start gap-3 text-sm text-muted-foreground">
          <Info className="h-5 w-5 mt-0.5 shrink-0 text-muted-foreground/70" />
          <div className="space-y-1">
            <p className="font-medium text-foreground">
              {isRtl ? "معلمات الاختبار والاختبارات" : "Test Parameters and Tests"}
            </p>
            <p>
              {isRtl
                ? "تُدار معلمات الاختبار والاختبارات في قسم الاختبارات. اربط هذه المواصفة بالاختبارات من شاشة تحرير الاختبار."
                : "Test parameters and tests are managed in the Test List. Link this specification to tests from the test edit screen."}
            </p>
          </div>
        </CardContent>
      </Card>

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
          {editingSpec
            ? isRtl
              ? "حفظ التغييرات"
              : "Save Changes"
            : isRtl
            ? "حفظ وإرسال للاعتماد"
            : "Save & Submit for Approval"}
        </Button>
      </div>
    </div>
  );
}
