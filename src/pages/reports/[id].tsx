import { useParams } from "wouter";
import { useRef, useState } from "react";
import { mockReports, mockSamples } from "@/mock-data";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { QrCode } from "@/components/shared/QrCode";
import { Printer, Download, CheckCircle2, Loader2 } from "lucide-react";
import { APP_VERSION, DOC_CODE_NO, DOC_LAST_MODIFIED } from "@/lib/app-meta";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

export default function ReportDetail() {
  const params = useParams();
  const reportRef = useRef<HTMLDivElement>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  const reportId = params.id;
  const report = mockReports.find(r => r.id === reportId) || mockReports[0];
  const sample = mockSamples.find(s => s.id === report.sampleId) || mockSamples[0];

  // Controlled radio state for "Status of Report". Default is derived from the
  // source report's status: Final → "New Report", Draft → "Re-issued Report".
  type ReportStatusOption = "New Report" | "Re-issued Report" | "Supplement Report";
  const [reportStatus, setReportStatus] = useState<ReportStatusOption>(() =>
    report.status === "Draft" ? "Re-issued Report" : "New Report"
  );

  // Build the GL/AR/D/YYYY/NNNN report number from the source id and issue date.
  // For mock reports whose id is already RPT-YYYY-NNN we re-format to the new
  // template. If issueDate is missing we fall back to today's date.
  const issueDate = report.issueDate || new Date().toISOString().slice(0, 10);
  const formattedReportNo = `GL/AR/D/${issueDate.slice(0, 4)}/${report.id.replace(/[^0-9]/g, "").slice(-4).padStart(4, "0")}`;

  // QR target — same origin so a LAN device on the same Wi-Fi as the dev server
  // can scan and view the report. Falls back to localhost if window isn't
  // available (e.g. during SSR, though this app is CSR-only).
  const qrUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/reports/${report.id}`;

  const handleDownloadPDF = async () => {
    if (!reportRef.current) return;
    
    setIsDownloading(true);
    const downloadToast = toast.loading("Generating PDF report...");
    
    try {
      const element = reportRef.current;
      const canvas = await html2canvas(element, {
        scale: 2, // Higher scale for better quality
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
      pdf.save(`Certificate_of_Analysis_${report.id}.pdf`);
      
      toast.dismiss(downloadToast);
      toast.success("PDF report downloaded successfully");
    } catch (error) {
      console.error("PDF generation error:", error);
      toast.dismiss(downloadToast);
      toast.error("Failed to generate PDF");
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex justify-between items-center mb-6 no-print">
        <h1 className="text-2xl font-bold">Report Viewer</h1>
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
            <div className="grid grid-cols-3 items-center gap-6 border-b-2 border-gray-300 pb-4 mb-8">
              <div className="text-sm leading-snug text-gray-800">
                <p>Version No: <span className="font-bold">{APP_VERSION}</span></p>
                <p>Code No: <span className="font-bold">{DOC_CODE_NO}</span></p>
                <p>Last Modified: <span className="font-bold">{DOC_LAST_MODIFIED}</span></p>
              </div>
              <div className="text-center">
                <h3 className="text-2xl font-bold text-blue-700 tracking-tight">Analysis Report</h3>
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

            <div className="grid grid-cols-2 gap-8 mb-8">
              {/* Client Info */}
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <h4 className="font-bold text-emerald-800 mb-3 text-sm uppercase tracking-wider">Client Information</h4>
                <div className="space-y-2 text-sm">
                  <div className="grid grid-cols-3"><span className="text-gray-500">Name:</span> <span className="col-span-2 font-medium">{report.clientName}</span></div>
                  <div className="grid grid-cols-3"><span className="text-gray-500">Address:</span> <span className="col-span-2">Riyadh, Kingdom of Saudi Arabia</span></div>
                  <div className="grid grid-cols-3"><span className="text-gray-500">Contact:</span> <span className="col-span-2">quality@client.com</span></div>
                </div>
              </div>

              {/* Sample Info */}
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <h4 className="font-bold text-emerald-800 mb-3 text-sm uppercase tracking-wider">Sample Details</h4>
                <div className="space-y-2 text-sm">
                  <div className="grid grid-cols-3"><span className="text-gray-500">Sample ID:</span> <span className="col-span-2 font-mono font-medium">{report.sampleId}</span></div>
                  <div className="grid grid-cols-3"><span className="text-gray-500">Description:</span> <span className="col-span-2">{sample.description}</span></div>
                  <div className="grid grid-cols-3"><span className="text-gray-500">Matrix:</span> <span className="col-span-2">{sample.sampleType}</span></div>
                  <div className="grid grid-cols-3"><span className="text-gray-500">Rec. Date:</span> <span className="col-span-2">{sample.receivedDate}</span></div>
                </div>
              </div>
            </div>

            {/* Results Table */}
            <div className="mb-12">
              <h4 className="font-bold text-emerald-800 mb-4 text-sm uppercase tracking-wider">Analytical Results</h4>
              <Table className="border">
                <TableHeader className="bg-gray-100">
                  <TableRow>
                    <TableHead className="text-black font-bold">Parameter</TableHead>
                    <TableHead className="text-black font-bold">Method</TableHead>
                    <TableHead className="text-black font-bold text-right">Result</TableHead>
                    <TableHead className="text-black font-bold">Unit</TableHead>
                    <TableHead className="text-black font-bold">Specification</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-medium">pH Level</TableCell>
                    <TableCell className="text-gray-500 text-sm">ISO 10523</TableCell>
                    <TableCell className="text-right font-medium">7.2</TableCell>
                    <TableCell>-</TableCell>
                    <TableCell>6.5 - 8.5</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Total Dissolved Solids</TableCell>
                    <TableCell className="text-gray-500 text-sm">APHA 2540 C</TableCell>
                    <TableCell className="text-right font-medium">145</TableCell>
                    <TableCell>mg/L</TableCell>
                    <TableCell>&lt; 500</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Total Coliforms</TableCell>
                    <TableCell className="text-gray-500 text-sm">ISO 9308-1</TableCell>
                    <TableCell className="text-right font-medium">Not Detected</TableCell>
                    <TableCell>CFU/100ml</TableCell>
                    <TableCell>Absent</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Heavy Metals (Pb)</TableCell>
                    <TableCell className="text-gray-500 text-sm">EPA 200.8</TableCell>
                    <TableCell className="text-right font-medium">0.005</TableCell>
                    <TableCell>mg/L</TableCell>
                    <TableCell>&lt; 0.01</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
              
              <div className="mt-4 p-4 bg-emerald-50 border border-emerald-100 rounded-lg flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-emerald-600 mt-0.5 shrink-0" />
                <div>
                  <p className="font-bold text-emerald-900 text-sm">Conclusion</p>
                  <p className="text-sm text-emerald-800 mt-1">The tested parameters comply with the specified limits. The sample is considered satisfactory based on the above analytical results.</p>
                </div>
              </div>
            </div>

            {/* Footer & Signatures */}
            <div className="grid grid-cols-3 gap-8 mt-16 pt-8 border-t border-gray-200">
              <div>
                <div className="h-16 flex items-end mb-2">
                  {report.signed && (
                    report.analystSignatureUrl ? (
                      <img src={report.analystSignatureUrl} alt="Signature" className="h-16 object-contain" />
                    ) : (
                      <span className="font-serif italic text-2xl text-blue-800">{report.analystName}</span>
                    )
                  )}
                </div>
                <div className="border-t border-black pt-2">
                  <p className="font-bold text-sm">Analyzed By</p>
                  <p className="text-xs text-gray-500">{report.analystName || 'Pending'}</p>
                  <p className="text-xs text-gray-500">Laboratory Analyst</p>
                </div>
              </div>
              
              <div>
                <div className="h-16 flex items-end mb-2">
                  {report.signed && (
                    report.reviewerSignatureUrl ? (
                      <img src={report.reviewerSignatureUrl} alt="Signature" className="h-16 object-contain" />
                    ) : (
                      <span className="font-serif italic text-2xl text-blue-800">{report.reviewerName}</span>
                    )
                  )}
                </div>
                <div className="border-t border-black pt-2">
                  <p className="font-bold text-sm">Reviewed & Approved By</p>
                  <p className="text-xs text-gray-500">{report.reviewerName || 'Pending'}</p>
                  <p className="text-xs text-gray-500">Laboratory Director</p>
                </div>
              </div>
              
              <div className="flex flex-col items-end justify-end">
                <QrCode value={`https://verify.greenlablims.sa/${report.id}`} size={100} level="H" />
                <p className="text-[10px] text-gray-500 mt-2 text-center w-[100px]">Scan to verify authenticity</p>
              </div>
            </div>
            
            <div className="text-center text-[10px] text-gray-400 mt-12 pt-4 border-t border-gray-100">
              <p>This report shall not be reproduced except in full without written approval of the laboratory.</p>
              <p>The results apply only to the sample tested as received.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

