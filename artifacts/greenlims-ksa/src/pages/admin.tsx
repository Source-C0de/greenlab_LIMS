import { mockTenants } from "@/mock-data";
import { DataTable } from "@/components/shared/DataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

export default function AdminPanel() {
  const columns = [
    { key: "name", header: "Tenant Name", render: (t: any) => <span className="font-bold">{t.name}</span> },
    { key: "plan", header: "Plan" },
    { key: "activeUsers", header: "Users" },
    { key: "activeSamples", header: "Monthly Samples" },
    { key: "monthlyRevenue", header: "MRR", render: (t: any) => `SAR ${t.monthlyRevenue.toLocaleString()}` },
    { key: "status", header: "Status", render: (t: any) => <StatusBadge status={t.status} /> },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">SaaS Administration</h1>
        <p className="text-muted-foreground mt-1">Super-admin view for GreenLabLIMS KSA platform</p>
      </div>

      <Tabs defaultValue="tenants" className="space-y-4">
        <TabsList>
          <TabsTrigger value="tenants">Tenants</TabsTrigger>
          <TabsTrigger value="plans">Pricing Plans</TabsTrigger>
          <TabsTrigger value="features">Feature Flags</TabsTrigger>
        </TabsList>
        
        <TabsContent value="tenants" className="space-y-4">
          <DataTable data={mockTenants} columns={columns} />
        </TabsContent>
        
        <TabsContent value="plans">
          <div className="grid gap-6 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>Starter</CardTitle>
                <CardDescription>For small private labs</CardDescription>
                <div className="mt-4 text-3xl font-bold">SAR 500<span className="text-sm font-normal text-muted-foreground">/mo</span></div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>Up to 5 Users</li>
                  <li>Basic COA Generation</li>
                  <li>Standard Support</li>
                </ul>
              </CardContent>
            </Card>
            
            <Card className="border-primary shadow-md relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-bl-lg">POPULAR</div>
              <CardHeader>
                <CardTitle>Professional</CardTitle>
                <CardDescription>For growing commercial labs</CardDescription>
                <div className="mt-4 text-3xl font-bold">SAR 1,500<span className="text-sm font-normal text-muted-foreground">/mo</span></div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>Up to 15 Users</li>
                  <li>ZATCA E-Invoicing</li>
                  <li>Client Portal Access</li>
                  <li>Priority Support</li>
                </ul>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Enterprise</CardTitle>
                <CardDescription>For multi-site laboratory networks</CardDescription>
                <div className="mt-4 text-3xl font-bold">SAR 4,500<span className="text-sm font-normal text-muted-foreground">/mo</span></div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>Unlimited Users</li>
                  <li>API Access & Integrations</li>
                  <li>Custom Development</li>
                  <li>24/7 Dedicated Manager</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="features">
          <Card>
            <CardHeader>
              <CardTitle>Global Feature Flags</CardTitle>
              <CardDescription>Enable or disable modules across all tenants</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between border-b pb-4">
                <div className="space-y-0.5">
                  <Label className="text-base font-bold">ZATCA Phase 2 Integration</Label>
                  <p className="text-sm text-muted-foreground">Enable cryptographic stamping and XML generation for KSA e-invoicing.</p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between border-b pb-4">
                <div className="space-y-0.5">
                  <Label className="text-base font-bold">Bilingual COA Generation</Label>
                  <p className="text-sm text-muted-foreground">Allow generating reports with Arabic and English side-by-side.</p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between border-b pb-4">
                <div className="space-y-0.5">
                  <Label className="text-base font-bold">AI Result Interpretation</Label>
                  <p className="text-sm text-muted-foreground">Use ML to flag anomalous results automatically.</p>
                </div>
                <Switch />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
