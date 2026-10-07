// =========================================================================
// Client Requests — New Request form (catalog-driven)
// =========================================================================
// Tests are NOT typed in by hand anymore. Instead, the user picks one or
// more tests from the technical-specification catalog (filtered by sample
// type), and the resulting WorkOrderTestRow[] is derived from each picked
// TestMaster on submit.

import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import { useAppContext } from "@/context/AppContext";
import { mockClients, sampleTypes } from "@/mock-data";
import { testMasterData, type TestMaster } from "@/mock-data/specifications";
import { useCreateWorkOrder } from "@/hooks/work-orders/useCreateWorkOrder";
import { useAdvanceWorkOrder } from "@/hooks/work-orders/useAdvanceWorkOrder";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ClipboardList,
  Save,
  ArrowRight,
  FlaskConical,
} from "lucide-react";
import { toast } from "sonner";
import { TestCatalogPicker } from "@/components/work-orders/TestCatalogPicker";
import { testMasterToRow } from "@/hooks/work-orders/useWorkOrderTestsFromCatalog";

const ALLOWED_ROLES = new Set(["admin", "lab_manager", "receptionist"]);

export default function NewClientRequest() {
  const { currentRole, language } = useAppContext();
  const isRtl = language === "ar";
  const [, setLocation] = useLocation();

  const { create } = useCreateWorkOrder();
  const { advance } = useAdvanceWorkOrder();

  const [clientId, setClientId] = useState("");
  const [sampleName, setSampleName] = useState("");
  const [sampleType, setSampleType] = useState("Food");
  const [description, setDescription] = useState("");
  const [requestedBy, setRequestedBy] = useState("");
  const [aofNumber, setAofNumber] = useState("NA");
  const [receivedVia, setReceivedVia] = useState<
    "Email" | "Phone" | "In-Person" | "Portal"
  >("Email");
  const [requestedAt, setRequestedAt] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [preparedByName, setPreparedByName] = useState(
    currentRole === "receptionist" ? "Waseem Dad Khan" : "",
  );
  const [preparedByPosition, setPreparedByPosition] = useState(
    currentRole === "receptionist" ? "CSR" : "",
  );
  const [checkedByName, setCheckedByName] = useState("Dr. Shymaa Ali");
  const [checkedByPosition, setCheckedByPosition] = useState("CHEM. LM");

  // Selected TestMaster ids (from the catalog). The actual WorkOrderTestRow[]
  // is derived at submit time via testMasterToRow().
  const [selectedTestIds, setSelectedTestIds] = useState<string[]>([]);

  // Resolve the picked ids back to TestMaster records so we can map to
  // rows on save. The picker is a sibling; the picker only needs ids.
  const pickedMasters = useMemo<TestMaster[]>(
    () => testMasterData.filter((t) => selectedTestIds.includes(t.id)),
    [selectedTestIds],
  );

  if (!ALLOWED_ROLES.has(currentRole)) {
    return (
      <div className="p-6 text-sm text-muted-foreground">
        {isRtl ? "غير مصرح" : "Not authorized to create client requests."}
      </div>
    );
  }

  const handleSubmit = (alsoStartDraft: boolean) => {
    if (!clientId || !sampleName) {
      toast.error(
        isRtl
          ? "يرجى ملء العميل واسم العينة"
          : "Please fill in client and sample name.",
      );
      return;
    }
    if (selectedTestIds.length === 0) {
      toast.error(
        isRtl
          ? "يرجى اختيار اختبار واحد على الأقل من الكتالوج"
          : "Please pick at least one test from the catalog.",
      );
      return;
    }

    const client = mockClients.find((c) => c.id === clientId);
    const clientName = client
      ? isRtl
        ? client.nameAr
        : client.nameEn
      : clientId;

    const derivedRows = pickedMasters.map(testMasterToRow);

    const wo = create({
      clientId,
      clientName,
      sampleType,
      sampleName,
      description,
      requestedBy,
      aofNumber,
      receivedVia,
      requestedAt,
      testRows: derivedRows,
      preparedByName,
      preparedByPosition,
      checkedByName,
      checkedByPosition,
    });

    if (!wo) {
      toast.error(isRtl ? "فشل إنشاء الطلب" : "Failed to create request.");
      return;
    }

    if (alsoStartDraft) {
      advance({
        workOrderId: wo.id,
        toStage: "csr_drafting",
        note: isRtl ? "بدء المسودة الفنية" : "Started TE draft",
      });
    }

    toast.success(
      isRtl ? `تم إنشاء الطلب ${wo.id}` : `Request ${wo.id} created.`,
    );
    setLocation(`/client-requests/${wo.id}`);
  };

  return (
    <div className="space-y-4 p-4 md:p-6">
      <div className="flex items-center gap-2">
        <ClipboardList className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-semibold tracking-tight">
          {isRtl ? "طلب عميل جديد" : "New Client Request"}
        </h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {isRtl ? "العميل والعينة" : "Client & Sample"}
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>{isRtl ? "العميل" : "Client"} *</Label>
            <Select value={clientId} onValueChange={setClientId}>
              <SelectTrigger>
                <SelectValue placeholder={isRtl ? "اختر عميل" : "Pick a client"} />
              </SelectTrigger>
              <SelectContent>
                {mockClients.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {isRtl ? c.nameAr : c.nameEn}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>{isRtl ? "نوع العينة" : "Sample type"} *</Label>
            <Select value={sampleType} onValueChange={setSampleType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {sampleTypes.map((s) => (
                  <SelectItem key={s.type} value={s.type}>
                    {s.type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>{isRtl ? "اسم العينة" : "Sample name"} *</Label>
            <Input
              value={sampleName}
              onChange={(e) => setSampleName(e.target.value)}
              placeholder={isRtl ? "مثلاً: شوكولاتة" : "e.g. Chocolate"}
            />
          </div>
          <div className="space-y-1.5">
            <Label>{isRtl ? "الوصف" : "Description"}</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {isRtl ? "بيانات الطلب" : "Request metadata"}
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="space-y-1.5">
            <Label>{isRtl ? "طالبة الاختبار" : "Requested by"}</Label>
            <Input
              value={requestedBy}
              onChange={(e) => setRequestedBy(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>{isRtl ? "رقم AOF" : "AOF number"}</Label>
            <Input
              value={aofNumber}
              onChange={(e) => setAofNumber(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>{isRtl ? "طريقة الاستلام" : "Received via"}</Label>
            <Select
              value={receivedVia}
              onValueChange={(v) => setReceivedVia(v as typeof receivedVia)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Email">Email</SelectItem>
                <SelectItem value="Phone">Phone</SelectItem>
                <SelectItem value="In-Person">In-Person</SelectItem>
                <SelectItem value="Portal">Portal</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>{isRtl ? "تاريخ الطلب" : "Requested at"}</Label>
            <Input
              type="date"
              value={requestedAt}
              onChange={(e) => setRequestedAt(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            <span className="inline-flex items-center gap-2">
              <FlaskConical className="h-4 w-4 text-primary" />
              {isRtl ? "اختر الاختبارات من الكتالوج" : "Pick tests from catalog"}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-3">
            {isRtl
              ? `يتم عرض الاختبارات المسجلة في المواصفات الفنية لنوع العينة "${sampleType}". كل اختبار يتم اختياره سيضاف تلقائياً للطلب مع تعبئة الحقول من المواصفة.`
              : `Showing tests from the technical specifications catalog for sample type "${sampleType}". Each picked test is auto-filled into the request from the spec.`}
          </p>
          <TestCatalogPicker
            sampleType={sampleType}
            selectedIds={selectedTestIds}
            onChange={setSelectedTestIds}
            isRtl={isRtl}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {isRtl ? "التوقيعات" : "Signatures"}
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>{isRtl ? "أعد بواسطة (الاسم)" : "Prepared by (name)"}</Label>
            <Input
              value={preparedByName}
              onChange={(e) => setPreparedByName(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>{isRtl ? "المنصب" : "Position"}</Label>
            <Input
              value={preparedByPosition}
              onChange={(e) => setPreparedByPosition(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>{isRtl ? "راجع بواسطة (الاسم)" : "Checked by (name)"}</Label>
            <Input
              value={checkedByName}
              onChange={(e) => setCheckedByName(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>{isRtl ? "المنصب" : "Position"}</Label>
            <Input
              value={checkedByPosition}
              onChange={(e) => setCheckedByPosition(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
        <Button variant="outline" onClick={() => handleSubmit(false)}>
          <Save className="h-4 w-4 me-1" />
          {isRtl ? "حفظ كطلب" : "Save as Request"}
        </Button>
        <Button onClick={() => handleSubmit(true)}>
          <ArrowRight className="h-4 w-4 me-1" />
          {isRtl ? "حفظ وبدء المسودة الفنية" : "Save & Start TE Draft"}
        </Button>
      </div>
    </div>
  );
}