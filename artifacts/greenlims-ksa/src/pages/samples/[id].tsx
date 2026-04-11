import { useParams } from "wouter";
import { mockSamples } from "@/mock-data";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { SampleTimeline } from "@/components/shared/SampleTimeline";
import { QrCodeMock } from "@/components/shared/QrCodeMock";
import { Download, Printer, FileEdit, CheckCircle2, User, Calendar, Beaker, Plus, FileText } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function SampleDetail() {
  const params = useParams();
  const sampleId = params.id;
  const sample = mockSamples.find(s => s.id === sampleId) || mockSamples[0];

  const timelineSteps = [
    { label: "Sample Received", status: "completed" as const, date: sample.receivedDate, actor: "Reception" },
    { label: "Logged in LIMS", status: "completed" as const, date: sample.receivedDate, actor: "System" },
    { label: "Assigned to Analyst", status: sample.assignedAnalyst ? "completed" as const : "pending" as const, date: sample.assignedAnalyst ? sample.receivedDate : undefined, actor: sample.assignedAnalyst },
    { label: "Testing in Progress", status: sample.status === "Testing" ? "current" as const : (sample.status === "Review" || sample.status === "Approved" ? "completed" as const : "pending" as const) },
    { label: "Results Review", status: sample.status === "Review" ? "current" as const : (sample.status === "Approved" ? "completed" as const : "pending" as const) },
    { label: "Final Approval", status: sample.status === "Approved" ? "completed" as const : "pending" as const, date: sample.completedDate || undefined },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b pb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-3xl font-bold tracking-tight font-mono">{sample.id}</h1>
            <StatusBadge status={sample.status} />
            <Badge variant="outline" className={sample.priority === 'Urgent' ? 'text-red-600 border-red-200' : ''}>
              {sample.priority} Priority
            </Badge>
          </div>
          <p className="text-muted-foreground text-lg">{sample.description}</p>
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline">
            <Printer className="mr-2 h-4 w-4" /> Print Label
          </Button>
          {(sample.status === 'Approved') && (
            <Button>
              <Download className="mr-2 h-4 w-4" /> Download COA
            </Button>
          )}
          {(sample.status !== 'Approved') && (
            <Button>
              <FileEdit className="mr-2 h-4 w-4" /> Enter Results
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Test Parameters & Results</CardTitle>
              <CardDescription>Analytical results for {sample.sampleType} matrix</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Parameter</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Result</TableHead>
                    <TableHead>Unit</TableHead>
                    <TableHead>Specification</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-medium">pH Level</TableCell>
                    <TableCell className="text-muted-foreground text-sm">ISO 10523</TableCell>
                    <TableCell>7.2</TableCell>
                    <TableCell>-</TableCell>
                    <TableCell>6.5 - 8.5</TableCell>
                    <TableCell><StatusBadge status="OK" className="bg-transparent" /></TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Total Dissolved Solids</TableCell>
                    <TableCell className="text-muted-foreground text-sm">APHA 2540 C</TableCell>
                    <TableCell>145</TableCell>
                    <TableCell>mg/L</TableCell>
                    <TableCell>&lt; 500</TableCell>
                    <TableCell><StatusBadge status="OK" className="bg-transparent" /></TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Total Coliforms</TableCell>
                    <TableCell className="text-muted-foreground text-sm">ISO 9308-1</TableCell>
                    <TableCell>Not Detected</TableCell>
                    <TableCell>CFU/100ml</TableCell>
                    <TableCell>Absent</TableCell>
                    <TableCell><StatusBadge status="OK" className="bg-transparent" /></TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Heavy Metals (Pb)</TableCell>
                    <TableCell className="text-muted-foreground text-sm">EPA 200.8</TableCell>
                    <TableCell>0.005</TableCell>
                    <TableCell>mg/L</TableCell>
                    <TableCell>&lt; 0.01</TableCell>
                    <TableCell><StatusBadge status="OK" className="bg-transparent" /></TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Sample Documentation</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[1, 2].map(i => (
                  <div key={i} className="aspect-square bg-muted rounded-md border flex items-center justify-center flex-col text-muted-foreground hover:bg-muted/80 cursor-pointer transition-colors">
                    <FileText className="h-8 w-8 mb-2 opacity-50" />
                    <span className="text-xs font-medium">Attachment_{i}.pdf</span>
                  </div>
                ))}
                <div className="aspect-square bg-muted/50 border border-dashed rounded-md flex items-center justify-center flex-col text-muted-foreground hover:bg-muted cursor-pointer transition-colors">
                  <Plus className="h-8 w-8 mb-2 opacity-50" />
                  <span className="text-xs font-medium">Add File</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Sample Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3">
                <User className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Client</p>
                  <p className="text-sm text-muted-foreground">{sample.clientName}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Beaker className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Matrix</p>
                  <p className="text-sm text-muted-foreground">{sample.sampleType}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Calendar className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Dates</p>
                  <p className="text-sm text-muted-foreground">Received: {sample.receivedDate}</p>
                  {sample.completedDate && <p className="text-sm text-muted-foreground">Completed: {sample.completedDate}</p>}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Chain of Custody</CardTitle>
            </CardHeader>
            <CardContent>
              <SampleTimeline steps={timelineSteps} />
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6 flex flex-col items-center justify-center text-center">
              <QrCodeMock value={sample.id} size={150} />
              <p className="text-sm font-mono mt-4 tracking-wider">{sample.id}</p>
              <p className="text-xs text-muted-foreground mt-1">Scan for internal tracking</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
