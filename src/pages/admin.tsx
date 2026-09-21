import { mockTenants } from "@/mock-data";
import { DataTable } from "@/components/shared/DataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useAppContext } from "@/context/AppContext";
import { useMenuPermissions } from "@/hooks/useMenuPermissions";
import { useRolePermissions } from "@/hooks/useRolePermissions";
import {
  MENU_REGISTRY,
  MENU_GROUP_LABELS,
  type MenuEntry,
  type MenuGroup,
} from "@/mock-data/menuPermissions";
import {
  ROLE_REGISTRY,
  ALL_TOGGLEABLE_ROLES,
} from "@/mock-data/rolePermissions";

const GROUP_ORDER: MenuGroup[] = ["lab", "client", "accounting", "admin"];

function RolePermissionsPanel() {
  const { language } = useAppContext();
  const isRtl = language === "ar";
  const { isEnabled, toggle, setAll, reset, isAllEnabled, isAllDisabled } =
    useRolePermissions();

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>{isRtl ? "صلاحيات الأدوار" : "Role Permissions"}</CardTitle>
          <CardDescription>
            {isRtl
              ? "تفعيل أو تعطيل الأدوار. الأدوار المعطلة تختفي من صفحة تسجيل الدخول ومن قائمة تبديل الدور."
              : "Enable or disable user roles. Disabled roles disappear from the login page and the role-switcher dropdown."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAll(true)}
              disabled={isAllEnabled()}
            >
              {isRtl ? "تفعيل الكل" : "Enable All"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAll(false)}
              disabled={isAllDisabled()}
            >
              {isRtl ? "تعطيل الكل" : "Disable All"}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => reset()}>
              {isRtl ? "إعادة التعيين للافتراضي" : "Reset to Defaults"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            {isRtl ? "الأدوار" : "Roles"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {ALL_TOGGLEABLE_ROLES.map((role) => {
            const entry = ROLE_REGISTRY[role];
            const Icon = entry.icon;
            return (
              <div
                key={role}
                className="flex items-center justify-between border-b last:border-b-0 pb-4 last:pb-0"
              >
                <div className="flex items-center gap-3">
                  <Icon className="h-5 w-5 text-muted-foreground" />
                  <div className="space-y-0.5">
                    <Label className="text-sm font-bold">
                      {isRtl ? entry.labelAr : entry.labelEn}
                    </Label>
                    <p className="text-xs text-muted-foreground max-w-md">
                      {isRtl ? entry.descriptionAr : entry.descriptionEn}
                    </p>
                  </div>
                </div>
                <Switch
                  checked={isEnabled(role)}
                  onCheckedChange={() => toggle(role)}
                />
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}

function MenuPermissionsPanel() {
  const { language } = useAppContext();
  const isRtl = language === "ar";
  const { isEnabled, toggle, setAll, reset, isAllEnabled, isAllDisabled } =
    useMenuPermissions();

  const groupLabel = (g: MenuGroup) =>
    isRtl ? MENU_GROUP_LABELS[g].ar : MENU_GROUP_LABELS[g].en;

  const groups = GROUP_ORDER.map((group) => ({
    group,
    entries: Object.values(MENU_REGISTRY).filter((e) => e.group === group),
  })).filter((g) => g.entries.length > 0);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>{isRtl ? "صلاحيات القائمة" : "Menu Permissions"}</CardTitle>
          <CardDescription>
            {isRtl
              ? "تفعيل أو تعطيل عناصر القائمة لجميع المستخدمين عبر الأدوار."
              : "Enable or disable sidebar menu items for all users across roles."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAll(true)}
              disabled={isAllEnabled()}
            >
              {isRtl ? "إظهار الكل" : "Show All"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAll(false)}
              disabled={isAllDisabled()}
            >
              {isRtl ? "إخفاء الكل" : "Hide All"}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => reset()}>
              {isRtl ? "إعادة التعيين للافتراضي" : "Reset to Defaults"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {groups.map(({ group, entries }) => (
        <Card key={group}>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{groupLabel(group)}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {entries.map((entry: MenuEntry) => {
              const Icon = entry.icon;
              return (
                <div
                  key={entry.key}
                  className="flex items-center justify-between border-b last:border-b-0 pb-4 last:pb-0"
                >
                  <div className="flex items-center gap-3">
                    <Icon className="h-5 w-5 text-muted-foreground" />
                    <div className="space-y-0.5">
                      <Label className="text-sm font-bold">
                        {isRtl ? entry.labelAr : entry.labelEn}
                      </Label>
                      <p className="text-xs text-muted-foreground" dir="ltr">
                        {entry.href}
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={isEnabled(entry.key)}
                    onCheckedChange={() => toggle(entry.key)}
                  />
                </div>
              );
            })}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default function AdminPanel() {
  const { language } = useAppContext();
  const isRtl = language === "ar";

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
        <h1 className="text-3xl font-bold tracking-tight">{isRtl ? "إدارة النظام" : "SaaS Administration"}</h1>
        <p className="text-muted-foreground mt-1">
          {isRtl
            ? "عرض المسؤول العام لمنصة GreenLabLIMS KSA"
            : "Super-admin view for GreenLabLIMS KSA platform"}
        </p>
      </div>

      <Tabs defaultValue="tenants" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-5">
          <TabsTrigger value="tenants">{isRtl ? "المستأجرون" : "Tenants"}</TabsTrigger>
          <TabsTrigger value="plans">{isRtl ? "خطط الأسعار" : "Pricing Plans"}</TabsTrigger>
          <TabsTrigger value="features">{isRtl ? "ميزات النظام" : "Feature Flags"}</TabsTrigger>
          <TabsTrigger value="menu">{isRtl ? "صلاحيات القائمة" : "Menu Permissions"}</TabsTrigger>
          <TabsTrigger value="roles">{isRtl ? "صلاحيات الأدوار" : "Role Permissions"}</TabsTrigger>
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

        <TabsContent value="menu">
          <MenuPermissionsPanel />
        </TabsContent>

        <TabsContent value="roles">
          <RolePermissionsPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}