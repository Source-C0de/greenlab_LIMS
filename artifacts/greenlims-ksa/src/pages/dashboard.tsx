import { useState, useEffect } from "react";
import { useAppContext } from "@/context/AppContext";
import { mockSamples, mockInvoices, mockReports } from "@/mock-data";
import { KpiCard } from "@/components/shared/KpiCard";
import { FlaskConical, FileText, Receipt, CheckCircle, Activity, ArrowRight } from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell, LineChart, Line, Legend
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";

const areaData = [
  { name: 'Aug', samples: 450 },
  { name: 'Sep', samples: 520 },
  { name: 'Oct', samples: 480 },
  { name: 'Nov', samples: 610 },
  { name: 'Dec', samples: 590 },
  { name: 'Jan', samples: 680 },
];

const barData = [
  { name: 'Water', revenue: 45000 },
  { name: 'Food', revenue: 38000 },
  { name: 'Pharma', revenue: 65000 },
  { name: 'Cosmetics', revenue: 25000 },
  { name: 'Perfume', revenue: 18000 },
];

const pieData = [
  { name: 'Approved', value: 45 },
  { name: 'Testing', value: 25 },
  { name: 'Review', value: 15 },
  { name: 'Received', value: 10 },
  { name: 'Rejected', value: 5 },
];

const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

export default function Dashboard() {
  const { currentRole, language } = useAppContext();
  const [loading, setLoading] = useState(true);
  const isRtl = language === "ar";

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 600);
    return () => clearTimeout(timer);
  }, [currentRole]);

  const pendingTests = mockSamples.filter(s => s.status === 'Received' || s.status === 'Testing').length;
  const completedReports = mockReports.filter(r => r.status === 'Final').length;

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold tracking-tight">
          {isRtl ? "لوحة القيادة" : "Dashboard"}
        </h1>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32 w-full rounded-xl" />)}
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
          <Skeleton className="h-[400px] w-full rounded-xl lg:col-span-4" />
          <Skeleton className="h-[400px] w-full rounded-xl lg:col-span-3" />
        </div>
      </div>
    );
  }

  // Client Dashboard
  if (currentRole === "client") {
    const clientSamples = mockSamples.filter(s => s.clientId === "C001");
    const pendingInvoices = mockInvoices.filter(i => i.clientId === "C001" && i.status !== "Paid");
    
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{isRtl ? "لوحة القيادة للعميل" : "Client Dashboard"}</h1>
            <p className="text-muted-foreground mt-1">Al-Marai Company Overview</p>
          </div>
          <Link href="/client-portal">
            <a className="text-sm text-primary hover:underline flex items-center">
              {isRtl ? "عرض البوابة" : "View Portal"} <ArrowRight className="h-4 w-4 ml-1 rtl:mr-1 rtl:ml-0 rtl:rotate-180" />
            </a>
          </Link>
        </div>
        
        <div className="grid gap-4 md:grid-cols-3">
          <KpiCard title="Active Samples" value={clientSamples.filter(s => s.status !== 'Approved' && s.status !== 'Rejected').length} icon={<FlaskConical />} />
          <KpiCard title="Completed Reports" value="12" icon={<FileText />} />
          <KpiCard title="Pending Invoices" value={pendingInvoices.length} icon={<Receipt />} className="border-amber-200 dark:border-amber-900" />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Recent Samples</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {clientSamples.slice(0, 5).map(sample => (
                <div key={sample.id} className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0">
                  <div>
                    <p className="font-medium">{sample.description}</p>
                    <p className="text-sm text-muted-foreground">{sample.id} • {sample.receivedDate}</p>
                  </div>
                  <StatusBadge status={sample.status} />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Analyst Dashboard
  if (currentRole === "analyst") {
    const mySamples = mockSamples.filter(s => s.assignedAnalyst?.includes("Ahmad"));
    
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold tracking-tight">{isRtl ? "لوحة محلل" : "Analyst Dashboard"}</h1>
        
        <div className="grid gap-4 md:grid-cols-3">
          <KpiCard title="Assigned Samples" value={mySamples.length} icon={<FlaskConical />} />
          <KpiCard title="Pending Tests" value={mySamples.filter(s => s.status === 'Testing').length} icon={<Activity />} />
          <KpiCard title="Completed Today" value="4" icon={<CheckCircle />} />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>My Workload</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {mySamples.map(sample => (
                <div key={sample.id} className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0">
                  <div>
                    <p className="font-medium">{sample.id}</p>
                    <p className="text-sm text-muted-foreground">{sample.clientName} • {sample.sampleType}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusBadge status={sample.status} />
                    <Link href={`/samples/${sample.id}`}>
                      <a className="text-sm text-primary hover:underline">Process</a>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Admin / Manager / Accountant Dashboard
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {isRtl ? "نظرة عامة على المختبر" : "Laboratory Overview"}
          </h1>
          <p className="text-muted-foreground mt-1">
            {isRtl ? "مؤشرات الأداء الرئيسية والنشاط الأخير" : "Key performance indicators and recent activity"}
          </p>
        </div>
        <div className="flex gap-2">
          <span className="text-sm text-muted-foreground">Period:</span>
          <select className="bg-transparent text-sm font-medium border-b border-border outline-none pb-1">
            <option>Last 30 Days</option>
            <option>Last Quarter</option>
            <option>Year to Date</option>
          </select>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KpiCard 
          title={isRtl ? "إجمالي العينات" : "Total Samples"} 
          value={mockSamples.length * 12} 
          icon={<FlaskConical />} 
          trend={{ value: 12.5, isPositive: true }} 
        />
        <KpiCard 
          title={isRtl ? "الاختبارات المعلقة" : "Pending Tests"} 
          value={pendingTests * 8} 
          icon={<Activity />} 
          trend={{ value: 2.1, isPositive: false }} 
        />
        <KpiCard 
          title={isRtl ? "التقارير المنجزة" : "Completed Reports"} 
          value={completedReports * 15} 
          icon={<CheckCircle />} 
          trend={{ value: 8.4, isPositive: true }} 
        />
        <KpiCard 
          title={isRtl ? "الإيرادات الشهرية" : "Monthly Revenue"} 
          value="SAR 89,500" 
          icon={<Receipt />} 
          trend={{ value: 15.3, isPositive: true }} 
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle>{isRtl ? "اتجاه حجم العينات" : "Sample Volume Trends"}</CardTitle>
            <CardDescription>Monthly samples received over last 6 months</CardDescription>
          </CardHeader>
          <CardContent className="pl-2">
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={areaData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorSamples" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}`} />
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }}
                    itemStyle={{ color: 'hsl(var(--foreground))' }}
                  />
                  <Area type="monotone" dataKey="samples" stroke="hsl(var(--primary))" strokeWidth={2} fillOpacity={1} fill="url(#colorSamples)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>{isRtl ? "توزيع العينات" : "Sample Status Distribution"}</CardTitle>
            <CardDescription>Current state of all active samples</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={80}
                    outerRadius={110}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                  />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest actions across the lab</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {[
                { time: "10 mins ago", text: "SAM-2024-019 received from Tabuk Pharmaceuticals" },
                { time: "1 hour ago", text: "Report RPT-2024-091 generated by Mohammad Al-Ghamdi" },
                { time: "2 hours ago", text: "Invoice INV-2024-0093 paid by Saudi Aramco" },
                { time: "3 hours ago", text: "Low stock alert: Salmonella Antiserum Poly" },
                { time: "5 hours ago", text: "SAM-2024-012 approved by Lab Manager" },
              ].map((activity, i) => (
                <div key={i} className="flex gap-4">
                  <div className="mt-1 h-2 w-2 rounded-full bg-primary ring-4 ring-primary/10" />
                  <div>
                    <p className="text-sm font-medium">{activity.text}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{activity.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle>Revenue by Test Type</CardTitle>
            <CardDescription>YTD Revenue distribution (SAR)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="hsl(var(--border))" />
                  <XAxis type="number" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `SAR ${value/1000}k`} />
                  <YAxis dataKey="name" type="category" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} width={80} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }}
                    cursor={{fill: 'hsl(var(--muted))'}}
                  />
                  <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} barSize={24} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
