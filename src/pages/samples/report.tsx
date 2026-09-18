import { useMemo, useRef, useState } from "react";
import { Link, useParams } from "wouter";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Printer,
  Download,
  Award,
  CheckCircle2,
  Loader2,
  ArrowLeft,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { QrCodeMock } from "@/components/shared/QrCodeMock";
import { toast } from "sonner";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import {
  findSample,
  getStoreSnapshot,
  notifyStoreChanged,
  subscribe,
} from "@/hooks/test-approvals/store";
import { useSyncExternalStore } from "react";
import { useAppContext } from "@/context/AppContext";

/** Format the spec range in a compact way, e.g. "6.5 - 8.5" or "< 0.01". */
function formatSpec(min: number | null, max: number | null, limitType?: string) {
  if (limitType === "max" && max !== null) return `< ${max}`;
  if (limitType === "min" && min !== null) return `> ${min}`;
  if (min === null && max === null) return "—";
  if (min === null) return `< ${max}`;
  if (max === null) return `> ${min}`;
  return `${min} - ${max}`;
}

function fmtDate(iso?: string | null) {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toISOString().slice(0, 10);
  } catch {
    return iso;
  }
}

export default function SampleReportPage() {
  const params = useParams();
  const { language } = useAppContext();
  const isRtl = language === "ar";
  const sampleId = params.id ?? "";

  // Re-read sample from the live store so the report reflects latest approvals.
  useSyncExternalStore(subscribe, getStoreSnapshot, getStoreSnapshot);
  const sample = useMemo(() => findSample(sampleId), [sampleId]);

  const reportRef = useRef<HTMLDivElement>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  // Collect every parameter from every test on this sample.
  const rows = useMemo(() => {
    if (!sample) return [];
    return sample.tests.flatMap((t) =>
      t.parameters.map((p) => ({
        testName: t.name,
        method: t.method,
        parameter: p,
      })),
    );
  }, [sample]);

  const overallPass = rows.length > 0 && rows.every((r) => r.parameter.status === "pass");

  // Pull QA approver (final sign-off) if present.
  const qaApprover = useMemo(() => {
    if (!sample) return null;
    for (const t of sample.tests) {
      if (t.approvals?.qa) return t.approvals.qa;
    }
    return null;
  }, [sample]);

  const techManager = useMemo(() => {
    if (!sample) return null;
    for (const t of sample.tests) {
      if (t.approvals?.tech_manager) return t.approvals.tech_manager;
    }
    return null;
  }, [sample]);

  const labSupervisor = useMemo(() => {
    if (!sample) return null;
    for (const t of sample.tests) {
      if (t.approvals?.lab_supervisor) return t.approvals.lab_supervisor;
    }
    return null;
  }, [sample]);

  const issueDate = sample?.completedDate ?? new Date().toISOString().slice(0, 10);
  const reportNo = `RPT-${sample?.id ?? "SAMPLE"}`;

  if (!sample) {
    return (
      <div className="space-y-4 max-w-3xl mx-auto text-center py-16">
        <h1 className="text-2xl font-bold">Sample not found</h1>
        <p className="text-muted-foreground">
          The sample report you requested does not exist.
        </p>
        <Link href="/samples">
          <Button variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to samples
          </Button>
        </Link>
      </div>
    );
  }

  if (sample.status !== "Approved") {
    return (
      <div className="space-y-4 max-w-3xl mx-auto text-center py-16">
        <h1 className="text-2xl font-bold">Report not yet available</h1>
        <p className="text-muted-foreground">
          This sample's current status is <strong>{sample.status}</strong>. A
          final Certificate of Analysis is issued only after the sample is fully
          approved.
        </p>
        <Link href={`/samples/${sample.id}`}>
          <Button variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to sample
          </Button>
        </Link>
      </div>
    );
  }

  const handleDownloadPDF = async () => {
    if (!reportRef.current) return;
    setIsDownloading(true);
    const downloadToast = toast.loading(
      isRtl ? "جاري إنشاء ملف PDF..." : "Generating PDF report...",
    );
    try {
      const element = reportRef.current;
      const canvas = await html2canvas(element, {
        scale: 2,
        logging: false,
        useCORS: true,
        backgroundColor: "#ffffff",
      });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Certificate_of_Analysis_${sample.id}.pdf`);
      toast.dismiss(downloadToast);
      toast.success(
        isRtl ? "تم تنزيل ملف PDF بنجاح" : "PDF report downloaded successfully",
      );
    } catch (error) {
      console.error("PDF generation error:", error);
      toast.dismiss(downloadToast);
      toast.error(isRtl ? "فشل إنشاء ملف PDF" : "Failed to generate PDF");
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Toolbar */}
      <div className="flex justify-between items-center mb-2 no-print">
        <div>
          <Link href={`/samples/${sample.id}`}>
            <Button variant="ghost" size="sm" className="mb-1 -ml-2 text-muted-foreground">
              <ArrowLeft className="mr-2 h-4 w-4" />
              {isRtl ? "العودة إلى العينة" : "Back to sample"}
            </Button>
          </Link>
          <h1 className="text-2xl font-bold">Certificate of Analysis</h1>
          <p className="text-sm text-muted-foreground">
            Sample <span className="font-mono">{sample.id}</span> ·{" "}
            {sample.clientName}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => window.print()}>
            <Printer className="mr-2 h-4 w-4" /> Print
          </Button>
          <Button onClick={handleDownloadPDF} disabled={isDownloading}>
            {isDownloading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" /> Download PDF
              </>
            )}
          </Button>
        </div>
      </div>

      {/* The actual COA document layout */}
      <div ref={reportRef}>
        <Card className="bg-white text-black print:shadow-none print:border-none shadow-lg border-2">
          <CardContent className="p-8 sm:p-12">
            {/* Header */}
            <div className="flex justify-between items-start border-b-2 border-emerald-800 pb-6 mb-8">
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 bg-emerald-800 text-white flex items-center justify-center rounded-lg font-bold text-2xl">
                  GL
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-emerald-900 tracking-tight">
                    GreenLabLIMS <span className="font-light">KSA</span>
                  </h2>
                  <p className="text-sm text-gray-600">
                    Central Laboratory Facility - Riyadh
                  </p>
                  <div className="flex items-center mt-1 text-xs text-gray-500 font-medium">
                    <Award className="h-3 w-3 mr-1 text-amber-500" /> ISO/IEC
                    17025:2017 Accredited
                  </div>
                </div>
              </div>
              <div className="text-right">
                <h3 className="text-xl font-bold text-gray-800 uppercase tracking-widest mb-1">
                  Certificate of Analysis
                </h3>
                <p className="text-sm font-mono">
                  Report No: <span className="font-bold">{reportNo}</span>
                </p>
                <p className="text-sm">Issue Date: {issueDate}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-8 mb-8">
              {/* Client Info */}
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <h4 className="font-bold text-emerald-800 mb-3 text-sm uppercase tracking-wider">
                  Client Information
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="grid grid-cols-3">
                    <span className="text-gray-500">Name:</span>{" "}
                    <span className="col-span-2 font-medium">
                      {sample.clientName}
                    </span>
                  </div>
                  <div className="grid grid-cols-3">
                    <span className="text-gray-500">Sample ID:</span>{" "}
                    <span className="col-span-2 font-mono font-medium">
                      {sample.id}
                    </span>
                  </div>
                  <div className="grid grid-cols-3">
                    <span className="text-gray-500">Description:</span>{" "}
                    <span className="col-span-2">{sample.description}</span>
                  </div>
                </div>
              </div>

              {/* Sample Info */}
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <h4 className="font-bold text-emerald-800 mb-3 text-sm uppercase tracking-wider">
                  Sample Details
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="grid grid-cols-3">
                    <span className="text-gray-500">Matrix:</span>{" "}
                    <span className="col-span-2">{sample.sampleType}</span>
                  </div>
                  <div className="grid grid-cols-3">
                    <span className="text-gray-500">Rec. Date:</span>{" "}
                    <span className="col-span-2">{sample.receivedDate}</span>
                  </div>
                  <div className="grid grid-cols-3">
                    <span className="text-gray-500">Comp. Date:</span>{" "}
                    <span className="col-span-2">
                      {sample.completedDate ?? "—"}
                    </span>
                  </div>
                  <div className="grid grid-cols-3">
                    <span className="text-gray-500">Analyst:</span>{" "}
                    <span className="col-span-2">
                      {sample.assignedAnalyst ?? "—"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Results Table */}
            <div className="mb-12">
              <h4 className="font-bold text-emerald-800 mb-4 text-sm uppercase tracking-wider">
                Analytical Results
              </h4>
              {rows.length === 0 ? (
                <p className="text-sm text-gray-500 italic">
                  No test parameters recorded for this sample.
                </p>
              ) : (
                <Table className="border">
                  <TableHeader className="bg-gray-100">
                    <TableRow>
                      <TableHead className="text-black font-bold">
                        Parameter
                      </TableHead>
                      <TableHead className="text-black font-bold">
                        Method
                      </TableHead>
                      <TableHead className="text-black font-bold text-right">
                        Result
                      </TableHead>
                      <TableHead className="text-black font-bold">
                        Unit
                      </TableHead>
                      <TableHead className="text-black font-bold">
                        MU*
                      </TableHead>
                      <TableHead className="text-black font-bold">
                        Specification
                      </TableHead>
                      <TableHead className="text-black font-bold text-center">
                        Status
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((row, idx) => {
                      const { parameter: p } = row;
                      return (
                        <TableRow key={idx}>
                          <TableCell className="font-medium">
                            {p.name}
                          </TableCell>
                          <TableCell className="text-gray-500 text-sm">
                            {p.reference ?? row.method ?? "—"}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {p.value || "—"}
                          </TableCell>
                          <TableCell>{p.unit || "—"}</TableCell>
                          <TableCell>{p.mu ?? "—"}</TableCell>
                          <TableCell>
                            {formatSpec(p.min, p.max, p.limitType)}
                          </TableCell>
                          <TableCell className="text-center">
                            {p.status === "pass" ? (
                              <Badge className="bg-green-500/15 text-green-700 border-green-500/30">
                                <CheckCircle className="h-3 w-3 mr-1" /> Pass
                              </Badge>
                            ) : p.status === "fail" ? (
                              <Badge variant="destructive" className="bg-red-500/15 text-red-700 border-red-500/30">
                                <XCircle className="h-3 w-3 mr-1" /> Fail
                              </Badge>
                            ) : (
                              <Badge variant="outline">Pending</Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}

              <div
                className={`mt-4 p-4 border rounded-lg flex items-start gap-3 ${
                  overallPass
                    ? "bg-emerald-50 border-emerald-100"
                    : "bg-amber-50 border-amber-100"
                }`}
              >
                <CheckCircle2
                  className={`h-5 w-5 mt-0.5 shrink-0 ${
                    overallPass ? "text-emerald-600" : "text-amber-600"
                  }`}
                />
                <div>
                  <p
                    className={`font-bold text-sm ${
                      overallPass ? "text-emerald-900" : "text-amber-900"
                    }`}
                  >
                    Statement of Conformity
                  </p>
                  <p
                    className={`text-sm mt-1 ${
                      overallPass ? "text-emerald-800" : "text-amber-800"
                    }`}
                  >
                    {overallPass
                      ? "Green Lab is responsible for Reporting Statement of Conformity Upon Customer Request. The tested parameters comply with the specified limits; the sample is considered satisfactory."
                      : "One or more parameters are outside the specified limits. Please refer to the table above for details and contact the QA Manager for next steps."}
                  </p>
                </div>
              </div>
            </div>

            {/* Remarks */}
            <div className="mb-8 text-xs text-gray-600 leading-relaxed">
              <p className="font-bold text-emerald-800 mb-2 uppercase tracking-wider text-sm">
                Remark
              </p>
              <ol className="list-decimal pl-5 space-y-1">
                <li>
                  Result of sample as per the sample received by the customer;
                  Green Lab is not responsible for source of samples and sampling
                  procedures.
                </li>
                <li>Results in this report are related only to the item tested.</li>
                <li>
                  Green Lab keeps all information obtained or created during the
                  performance of laboratory activities confidentially unless it
                  is required by law.
                </li>
                <li>
                  Report shall not be reissued without written approval of the
                  Lab Manager.
                </li>
                <li>
                  MU*: Measurement Uncertainty. Green Lab is responsible for
                  reporting measurement uncertainty upon customer request.
                </li>
                <li>
                  ** : The tests referenced by this mark have been conducted
                  outside Green Lab, and the laboratory is responsible for
                  conducting these tests at ISO 17025:2017 accredited service
                  provider.
                </li>
              </ol>
              <p className="text-center mt-6 font-bold">End of Report</p>
            </div>

            {/* Footer & Signatures */}
            <div className="grid grid-cols-3 gap-8 mt-12 pt-8 border-t border-gray-200">
              <div>
                <div className="h-16 flex items-end mb-2">
                  <span className="font-serif italic text-2xl text-blue-800">
                    {sample.assignedAnalyst ?? "—"}
                  </span>
                </div>
                <div className="border-t border-black pt-2">
                  <p className="font-bold text-sm">Analyzed By</p>
                  <p className="text-xs text-gray-500">
                    {sample.assignedAnalyst ?? "Pending"}
                  </p>
                  <p className="text-xs text-gray-500">Laboratory Analyst</p>
                </div>
              </div>

              <div>
                <div className="h-16 flex items-end mb-2">
                  <span className="font-serif italic text-2xl text-blue-800">
                    {techManager?.approverName ??
                      labSupervisor?.approverName ??
                      "—"}
                  </span>
                </div>
                <div className="border-t border-black pt-2">
                  <p className="font-bold text-sm">Reviewed By</p>
                  <p className="text-xs text-gray-500">
                    {techManager?.approverName ??
                      labSupervisor?.approverName ??
                      "Pending"}
                  </p>
                  <p className="text-xs text-gray-500">
                    {techManager ? "Technical Manager" : "Lab Supervisor"}
                  </p>
                </div>
              </div>

              <div>
                <div className="h-16 flex items-end mb-2">
                  <span className="font-serif italic text-2xl text-blue-800">
                    {qaApprover?.approverName ?? "Sameh Mustafa"}
                  </span>
                </div>
                <div className="border-t border-black pt-2">
                  <p className="font-bold text-sm">Authorized By</p>
                  <p className="text-xs text-gray-500">QA Manager</p>
                  <p className="text-xs text-gray-500">
                    {qaApprover?.approverName ?? "Sameh Mustafa"}
                  </p>
                  <p className="text-xs text-gray-500">Date: {issueDate}</p>
                </div>
              </div>
            </div>

            {/* QR + verify */}
            <div className="flex flex-col items-center justify-center mt-12 pt-4 border-t border-gray-100">
              <QrCodeMock
                value={`https://verify.greenlablims.sa/${sample.id}`}
                size={90}
              />
              <p className="text-[10px] text-gray-500 mt-2 text-center w-[120px]">
                Scan to verify authenticity
              </p>
            </div>

            <div className="text-center text-[10px] text-gray-400 mt-6 pt-4 border-t border-gray-100">
              <p>
                This report shall not be reproduced except in full without
                written approval of the laboratory.
              </p>
              <p>The results apply only to the sample tested as received.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}