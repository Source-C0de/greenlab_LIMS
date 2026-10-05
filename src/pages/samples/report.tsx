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
import { Badge } from "@/components/ui/badge";
import {
  Printer,
  Download,
  CheckCircle2,
  Loader2,
  ArrowLeft,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { QrCode } from "@/components/shared/QrCode";
import { APP_VERSION, DOC_CODE_NO, DOC_LAST_MODIFIED } from "@/lib/app-meta";
import { mockClients } from "@/mock-data";
import { toast } from "sonner";
import { buildAndDownloadPdf, type PdfSection } from "@/lib/pdf-report";
import {
  findSample,
  getStoreSnapshot,
  notifyStoreChanged,
  subscribe,
} from "@/hooks/test-approvals/store";
import { useSyncExternalStore } from "react";
import { useAppContext } from "@/context/AppContext";
import { signatureFor } from "@/lib/signature";

/**
 * A single key:value row where the label sits in a fixed-width column so the
 * trailing colon aligns vertically across rows even when labels have very
 * different lengths ("Customer" vs "Customer Address").
 */
function FieldRow({
  label,
  value,
  valueClassName = "",
}: {
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <div className="flex items-baseline gap-1.5">
      <span className="w-[170px] shrink-0 text-gray-500 font-medium">{label}</span>
      <span className="text-gray-500 shrink-0">:</span>
      <span className={`flex-1 text-gray-900 ${valueClassName}`}>{value}</span>
    </div>
  );
}

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
  // Sample IDs contain slashes (e.g. "FD/2024/0001"), so wouter's `:id` would
  // not match. The route is registered as `/samples/*/report`, and the splat
  // is exposed under the literal key `"*"` by wouter/regexparam.
  const params = useParams<{ "*": string }>();
  const { language } = useAppContext();
  const isRtl = language === "ar";
  const sampleId = (params["*"] ?? "").replace(/\/$/, "");

  // Re-read sample from the live store so the report reflects latest approvals.
  useSyncExternalStore(subscribe, getStoreSnapshot, getStoreSnapshot);
  const sample = useMemo(() => findSample(sampleId), [sampleId]);

  const reportRef = useRef<HTMLDivElement>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  // Section refs — each becomes exactly one A4 page in the downloaded PDF.
  // Splitting the COA across multiple section refs (instead of capturing the
  // whole report as one giant canvas) avoids html2canvas OOM and produces
  // natural page breaks at logical report boundaries.
  const pageOneRef = useRef<HTMLDivElement>(null); // Header + Report Info + Customer + Sample Details
  const pageTwoRef = useRef<HTMLDivElement>(null); // Results Table + Statement of Conformity
  const pageThreeRef = useRef<HTMLDivElement>(null); // Remarks + Signatures + Disclaimer

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

  // Controlled radio state for "Status of Report". Sample report is only
  // reachable when sample.status === "Approved", so the default is "New Report".
  type ReportStatusOption = "New Report" | "Re-issued Report" | "Supplement Report";
  const [reportStatus, setReportStatus] = useState<ReportStatusOption>("New Report");

  // Build the GL/AR/D/YYYY/NNNN report number from the source reportNo and
  // issue date — same format as reports/[id].tsx.
  const formattedReportNo = `GL/AR/D/${issueDate.slice(0, 4)}/${(reportNo.replace(/[^0-9]/g, "") || "0000").slice(-4).padStart(4, "0")}`;

  // QR target — current origin so LAN devices can scan and view the report.
  const qrUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/samples/${sample?.id ?? ""}/report`;

  // Resolve the source client by matching the denormalized clientName on the
  // sample against mockClients.nameEn. Used to populate the Customer Details
  // block (contact person, phone, email, address).
  const client = sample ? mockClients.find(c => c.nameEn === sample.clientName) : undefined;

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
    if (!sample) return;
    setIsDownloading(true);
    const downloadToast = toast.loading(
      isRtl ? "جاري إنشاء ملف PDF..." : "Generating PDF report...",
    );
    try {
      const sections: PdfSection[] = [
        { label: "Header + Details", ref: pageOneRef },
        { label: "Analytical Results", ref: pageTwoRef },
        { label: "Remarks + Signatures", ref: pageThreeRef },
      ];

      const reportId = sample.id;
      const pages = await buildAndDownloadPdf({
        sections,
        meta: {
          reportId,
          title: `Certificate of Analysis — ${reportId}`,
          author: "Green Lab KSA",
          subject: `COA for sample ${reportId} (${sample.sampleName ?? sample.description})`,
        },
        scale: 2,
      });

      toast.dismiss(downloadToast);
      toast.success(
        isRtl
          ? `تم تنزيل ملف PDF بنجاح (${pages} صفحة)`
          : `PDF report downloaded (${pages} page${pages === 1 ? "" : "s"})`,
      );
    } catch (error) {
      console.error("PDF generation error:", error);
      toast.dismiss(downloadToast);
      toast.error(
        isRtl
          ? error instanceof Error
            ? error.message
            : "فشل إنشاء ملف PDF"
          : error instanceof Error
            ? error.message
            : "Failed to generate PDF",
      );
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

      {/* The actual COA document layout — split into 3 sections, each one becomes
          a separate A4 page in the downloaded PDF.
          NOTE: each page section uses plain <div> wrappers (NOT <Card>) because
          shadcn <Card> uses CSS variables + box-shadow that html2canvas can't
          reliably capture. */}
      <div ref={reportRef} className="bg-white">
        {/* Page 1 — Header + Report Info + Customer + Sample Details */}
        <div ref={pageOneRef} style={{ backgroundColor: "#ffffff", color: "#000000" }} className="p-8 sm:p-12 mb-6 print:mb-0 print-break-after-page">
          {/* Header */}
            <div className="grid grid-cols-3 items-center gap-6 border-b-2 border-gray-300 pb-4 mb-8">
              <div className="text-sm leading-snug text-gray-800">
                <p>Version No: <span className="font-bold">{APP_VERSION}</span></p>
                <p>Code No: <span className="font-bold">{DOC_CODE_NO}</span></p>
                <p>Last Modified: <span className="font-bold">{DOC_LAST_MODIFIED}</span></p>
              </div>
              <div className="text-center">
                <h3 className="text-2xl font-bold text-blue-700 tracking-tight">
                  Analysis Report
                </h3>
              </div>
              <div className="flex justify-end">
                <img
                  src="/images/greenlab_logo_original.png"
                  alt="Green Lab"
                  className="h-20 w-auto shrink-0 object-contain"
                />
              </div>
            </div>

            {/* Report Information */}
            <div className="flex items-start justify-between gap-6 mb-6">
              <div className="text-sm leading-relaxed">
                <p className="mb-1">
                  <span className="font-bold">Report No</span>
                  <span className="mx-2">:</span>
                  <span className="font-mono">{formattedReportNo}</span>
                </p>
                <p className="mb-1">
                  <span className="font-bold">Issue Date</span>
                  <span className="mx-2">:</span>
                  <span>{issueDate}</span>
                </p>
              </div>
              <div className="flex items-center justify-center gap-8 grow">
                <div>
                  <p className="font-bold text-sm mb-1">Status of Report:</p>
                  <div className="flex gap-6">
                    {(["New Report", "Re-issued Report", "Supplement Report"] as const).map(
                      (option) => (
                        <label
                          key={option}
                          className="inline-flex items-center gap-2 cursor-pointer text-sm"
                        >
                          <input
                            type="radio"
                            name="report-status"
                            value={option}
                            checked={reportStatus === option}
                            onChange={() => setReportStatus(option)}
                            className="h-3.5 w-3.5 accent-blue-700"
                          />
                          <span>{option}</span>
                        </label>
                      ),
                    )}
                  </div>
                </div>
                <div className="flex flex-col items-center gap-1 shrink-0">
                  <QrCode value={qrUrl} size={110} level="H" />
                  <p className="text-[10px] text-gray-500">Scan to verify</p>
                </div>
              </div>
            </div>

            <div className="space-y-3 mb-6">
              {/* Customer Details */}
              <div style={{ backgroundColor: "#f9fafb", borderColor: "#e5e7eb" }} className="p-4 rounded-lg border">
                <h4 style={{ color: "#065f46" }} className="font-bold mb-2 text-sm uppercase tracking-wider">
                  Customer Details
                </h4>
                <div className="grid grid-cols-2 gap-x-8 text-sm">
                  <div className="space-y-1">
                    <FieldRow
                      label="Customer"
                      value={sample.clientName}
                      valueClassName="font-medium"
                    />
                    <FieldRow
                      label="Customer Address"
                      value={client?.address ?? "—"}
                    />
                  </div>
                  <div className="space-y-1">
                    <FieldRow
                      label="Contact Person"
                      value={client?.contactPerson ?? "—"}
                    />
                    <FieldRow
                      label="Phone"
                      value={client?.contactPhone ?? "—"}
                      valueClassName="font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Sample Details */}
              <div style={{ backgroundColor: "#f9fafb", borderColor: "#e5e7eb" }} className="p-4 rounded-lg border">
                <h4 style={{ color: "#065f46" }} className="font-bold mb-2 text-sm uppercase tracking-wider">
                  Sample Details
                </h4>
                <div className="grid grid-cols-[1fr_1fr_80px] gap-x-6 items-start text-sm">
                  <div className="space-y-1">
                    <FieldRow
                      label="Sample Name"
                      value={sample.sampleName ?? "—"}
                      valueClassName="font-medium"
                    />
                    <FieldRow
                      label="Sample ID"
                      value={sample.id}
                      valueClassName="font-mono font-medium"
                    />
                    <FieldRow label="Batch Number" value={sample.batchNumber ?? "—"} />
                    <FieldRow label="Exp. Date" value={sample.expiryDate ?? "NA"} />
                    <FieldRow label="Mfg. Date" value={sample.mfgDate ?? "NA"} />
                  </div>
                  <div className="space-y-1">
                    <FieldRow
                      label="Sample Description"
                      value={sample.description}
                    />
                    <FieldRow label="Receiving Date" value={sample.receivedDate} />
                    <FieldRow label="Test Start Date" value={sample.testStartDate ?? "NA"} />
                    <FieldRow label="Test Completion Date" value={sample.testCompletionDate ?? "NA"} />
                    <FieldRow
                      label="Environmental Conditions"
                      value={sample.environmentalConditions ?? "NA"}
                    />
                  </div>
                  <div className="row-span-2 flex flex-col items-center gap-1">
                    <img
                      src="/images/sample-placeholder.svg"
                      alt="Sample"
                      className="h-20 w-20 object-contain border border-gray-200 rounded-md bg-white"
                    />
                    <p className="text-[10px] text-gray-500">Photo</p>
                  </div>
                </div>
              </div>
            </div>
        </div>

        {/* Page 2 — Analytical Results + Statement of Conformity */}
        <div ref={pageTwoRef} style={{ backgroundColor: "#ffffff", color: "#000000" }} className="p-8 sm:p-12 mb-6 print:mb-0 print-break-before-page print-break-after-page">
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
                  <TableHeader style={{ backgroundColor: "#f3f4f6" }}>
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
                style={overallPass
                  ? { backgroundColor: "#ecfdf5", borderColor: "#d1fae5" }
                  : { backgroundColor: "#fffbeb", borderColor: "#fef3c7" }
                }
                className="mt-4 p-4 border rounded-lg flex items-start gap-3"
              >
                <CheckCircle2
                  style={{ color: overallPass ? "#059669" : "#d97706" }}
                  className="h-5 w-5 mt-0.5 shrink-0"
                />
                <div>
                  <p
                    style={{ color: overallPass ? "#064e3b" : "#78350f" }}
                    className="font-bold text-sm"
                  >
                    Statement of Conformity
                  </p>
                  <p
                    style={{ color: overallPass ? "#065f46" : "#92400e" }}
                    className="text-sm mt-1"
                  >
                    {overallPass
                      ? "Green Lab is responsible for Reporting Statement of Conformity Upon Customer Request. The tested parameters comply with the specified limits; the sample is considered satisfactory."
                      : "One or more parameters are outside the specified limits. Please refer to the table above for details and contact the QA Manager for next steps."}
                  </p>
                </div>
              </div>
            </div>
        </div>

        {/* Page 3 — Remarks + Signatures + QR verification + Disclaimer */}
        <div ref={pageThreeRef} style={{ backgroundColor: "#ffffff", color: "#000000" }} className="p-8 sm:p-12 print-break-before-page">
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
            <div className="grid grid-cols-3 gap-8 mt-12 pt-8 border-t border-gray-200 items-end">
              {/* Cell 1: Reviewed By — Shymaa Ali.
                  PNG hard-coded because the sample data uses the transliteration
                  "Shymaa Ali" while the file is named after the alternate
                  transliteration "Saymaa" — signatureFor()'s exact-name lookup
                  would miss it. */}
              <div>
                <div className="h-16 flex items-end mb-2">
                  <img
                    src="/signatures/sign_saymaa.png"
                    alt={isRtl ? "توقيع المراجعة" : "Reviewer signature"}
                    className="h-16 max-w-full object-contain"
                  />
                </div>
                <div className="border-t border-black pt-2">
                  <p className="font-bold text-sm">Reviewed By</p>
                  <p className="text-xs text-gray-500">Shymaa Ali</p>
                  <p className="text-xs text-gray-500">Reviewer</p>
                </div>
              </div>

              {/* Cell 2: Lab stamp — white card, 128×128. */}
              <div className="flex justify-center">
                <div className="bg-white p-2 rounded-md shadow-sm">
                  <img
                    src="/branding/stamp-greenlab.svg"
                    alt={isRtl ? "ختم المختبر" : "Lab Stamp"}
                    className="h-32 w-32 object-contain"
                  />
                </div>
              </div>

              {/* Cell 3: Authorized By (QA Manager) — static text fallback. */}
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
            {/* <div className="flex flex-col items-center justify-center mt-12 pt-4 border-t border-gray-100">
              <QrCode
                value={`https://verify.greenlablims.sa/${sample.id}`}
                size={90}
                level="H"
              />
              <p className="text-[10px] text-gray-500 mt-2 text-center w-[120px]">
                Scan to verify authenticity
              </p>
            </div> */}

            <div className="text-center text-[10px] text-gray-400 mt-6 pt-4 border-t border-gray-100">
              <p>
                This report shall not be reproduced except in full without
                written approval of the laboratory.
              </p>
              <p>The results apply only to the sample tested as received.</p>
            </div>
        </div>
      </div>
    </div>
  );
}