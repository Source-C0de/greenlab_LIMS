import { mockSamples, mockReports, mockInvoices } from "@/mock-data";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Link } from "wouter";
import { FileText, Receipt, Plus, Download } from "lucide-react";

export default function ClientPortal() {
  const myClientId = "C001"; // Mock client ID for "Al-Marai Company"
  const mySamples = mockSamples.filter(s => s.clientId === myClientId);
  const myReports = mockReports.filter(r => r.clientName.includes("Al-Marai"));
  const myInvoices = mockInvoices.filter(i => i.clientId === myClientId);

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b pb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Al-Marai Portal</h1>
          <p className="text-muted-foreground mt-1">Manage your testing requests and results</p>
        </div>
        <Button size="lg" className="shadow-lg">
          <Plus className="mr-2 h-5 w-5" /> Submit New Sample
        </Button>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <div className="space-y-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle>Recent Samples</CardTitle>
                <CardDescription>Track status of active submissions</CardDescription>
              </div>
              <Link href="/samples"><Button variant="ghost" size="sm">View All</Button></Link>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 mt-4">
                {mySamples.slice(0, 4).map(sample => (
                  <div key={sample.id} className="flex justify-between items-center border-b pb-4 last:border-0 last:pb-0">
                    <div>
                      <p className="font-medium">{sample.description}</p>
                      <p className="text-sm text-muted-foreground">{sample.id} • Submitted {sample.receivedDate}</p>
                    </div>
                    <StatusBadge status={sample.status} />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle>Latest Reports</CardTitle>
                <CardDescription>Certificates of Analysis ready for download</CardDescription>
              </div>
              <Link href="/reports"><Button variant="ghost" size="sm">View All</Button></Link>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 mt-4">
                {myReports.map(report => (
                  <div key={report.id} className="flex justify-between items-center border-b pb-4 last:border-0 last:pb-0">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 bg-primary/10 rounded flex items-center justify-center">
                        <FileText className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{report.testType}</p>
                        <p className="text-xs text-muted-foreground">{report.id} • {report.issueDate}</p>
                      </div>
                    </div>
                    <Button variant="outline" size="icon">
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle>Invoices</CardTitle>
                <CardDescription>Billing and payment status</CardDescription>
              </div>
              <Link href="/invoices"><Button variant="ghost" size="sm">View All</Button></Link>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 mt-4">
                {myInvoices.map(invoice => (
                  <div key={invoice.id} className="flex justify-between items-center border-b pb-4 last:border-0 last:pb-0">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 bg-muted rounded flex items-center justify-center">
                        <Receipt className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="font-medium font-mono text-sm">{invoice.id}</p>
                        <p className="text-xs font-bold text-foreground">SAR {invoice.total.toLocaleString()}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <StatusBadge status={invoice.status} />
                      <Link href={`/invoices/${invoice.id}`}>
                        <Button variant="ghost" size="sm" className="hidden sm:flex">Details</Button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
