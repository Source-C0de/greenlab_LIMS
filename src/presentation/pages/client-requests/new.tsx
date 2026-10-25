// =========================================================================
// Client Requests — New Request form
// =========================================================================
// The CSR registers the request: who it is for, what the sample is, and any
// supporting documents (PDF / docs / images) the client sent along.
//
// Tests are NOT chosen here. Per the current process the request is created
// with an empty test list and the required tests are added during Technical
// Evaluation, where the lab manager picks them from the catalog or enters
// them by hand.

import { useState } from "react";
import { useLocation } from "wouter";
import { useAppContext } from "@/presentation/providers/AppContext";
import { mockClients, sampleTypes } from "@/infrastructure/mock/data";
import { useCreateWorkOrder } from "@/presentation/hooks/work-orders/useCreateWorkOrder";
import { useAdvanceWorkOrder } from "@/presentation/hooks/work-orders/useAdvanceWorkOrder";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Textarea } from "@/shared/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { ClipboardList, Save, ArrowRight, Paperclip } from "lucide-react";
import { toast } from "sonner";
import { ClientCombobox, type ClientSelection } from "@/presentation/components/features/client-requests/ClientCombobox";
import {
  AttachmentsPicker,
  type AttachmentDraft,
} from "@/presentation/components/features/client-requests/AttachmentsPicker";

const ALLOWED_ROLES = new Set(["admin", "lab_manager", "receptionist"]);

export default function NewClientRequest() {
  const { currentRole, language } = useAppContext();
  const isRtl = language === "ar";
  const [, setLocation] = useLocation();

  const { create } = useCreateWorkOrder();
  const { advance } = useAdvanceWorkOrder();

  const [client, setClient] = useState<ClientSelection | null>(null);
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

  // Files the client sent with the request (metadata only — see
  // AttachmentsPicker).
  const [attachments, setAttachments] = useState<AttachmentDraft[]>([]);

  if (!ALLOWED_ROLES.has(currentRole)) {
    return (
      <div className="p-6 text-sm text-muted-foreground">
        {isRtl ? "غير مصرح" : "Not authorized to create client requests."}
      </div>
    );
  }

  const handleSubmit = (alsoStartDraft: boolean) => {
    if (!client || !sampleName) {
      toast.error(
        isRtl
          ? "يرجى ملء العميل واسم العينة"
          : "Please fill in client and sample name.",
      );
      return;
    }

    // An existing directory client keeps its id. A manually typed client has
    // no id — only the name travels with the request.
    const existing =
      client.kind === "existing"
        ? mockClients.find((c) => c.id === client.clientId)
        : undefined;
    const clientId = existing?.id ?? "";
    const clientName =
      existing?.[isRtl ? "nameAr" : "nameEn"] ??
      (client.kind === "manual" ? client.name : "");


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
      // Tests are added during Technical Evaluation.
      testRows: [],
      attachments,
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
            <ClientCombobox
              value={client}
              onChange={setClient}
              isRtl={isRtl}
            />
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
              <Paperclip className="h-4 w-4 text-primary" />
              {isRtl ? "المرفقات" : "Attachments"}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            {isRtl
              ? "أرفق المستندات التي أرسلها العميل مع الطلب (مثل خطاب الطلب أو صور العينات)."
              : "Attach the documents the client sent with the request (e.g. the request letter or sample photos)."}
          </p>
          <AttachmentsPicker
            files={attachments}
            onChange={setAttachments}
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