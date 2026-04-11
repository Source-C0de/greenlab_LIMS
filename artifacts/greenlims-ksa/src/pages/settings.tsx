import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function Settings() {
  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-1">Manage your account and laboratory preferences</p>
      </div>

      <Tabs defaultValue="profile" className="space-y-4">
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="laboratory">Laboratory Details</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
        </TabsList>
        
        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
              <CardDescription>Update your profile details and preferences.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input id="firstName" defaultValue="Demo" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input id="lastName" defaultValue="User" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" defaultValue="demo@greenlims.sa" />
              </div>
              <Button>Save Changes</Button>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="laboratory">
          <Card>
            <CardHeader>
              <CardTitle>Laboratory Configuration</CardTitle>
              <CardDescription>Manage your tenant's official details used in reports and invoices.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="labName">Laboratory Name (English)</Label>
                <Input id="labName" defaultValue="GreenLIMS Central Facility" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="labNameAr">Laboratory Name (Arabic)</Label>
                <Input id="labNameAr" defaultValue="جرين ليمز - المرفق المركزي" dir="rtl" />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="cr">CR Number</Label>
                  <Input id="cr" defaultValue="1010123456" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="vat">VAT Registration Number</Label>
                  <Input id="vat" defaultValue="300000000000003" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="iso">ISO/IEC 17025 Accreditation No.</Label>
                <Input id="iso" defaultValue="TEST-1234-SA" />
              </div>
              <Button>Update Details</Button>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>Alert Preferences</CardTitle>
              <CardDescription>Choose what events trigger email or in-app notifications.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between border-b pb-4">
                <div className="space-y-0.5">
                  <Label className="text-base">Sample Received</Label>
                  <p className="text-sm text-muted-foreground">Notify when a new sample is logged in the system.</p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between border-b pb-4">
                <div className="space-y-0.5">
                  <Label className="text-base">Critical/Urgent Priority</Label>
                  <p className="text-sm text-muted-foreground">Immediate alert for high priority tests.</p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between pb-4">
                <div className="space-y-0.5">
                  <Label className="text-base">Low Inventory Alert</Label>
                  <p className="text-sm text-muted-foreground">Weekly digest of items falling below minimum stock.</p>
                </div>
                <Switch defaultChecked />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
