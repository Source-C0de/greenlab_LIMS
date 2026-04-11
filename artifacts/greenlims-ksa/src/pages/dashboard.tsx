import { useState, useEffect, useMemo } from "react";
import { useAppContext } from "@/context/AppContext";
import { mockSamples, mockInvoices, mockReports } from "@/mock-data";
import { KpiCard } from "@/components/shared/KpiCard";
import { FlaskConical, FileText, Receipt, CheckCircle, Activity, ArrowRight, Calendar } from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell, Legend
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { subDays, subMonths, isAfter, parseISO, format, startOfMonth, eachMonthOfInterval, endOfMonth, isWithinInterval } from "date-fns";

const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

export default function Dashboard() {
  const { currentRole, language } = useAppContext();
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("30"); // Default 30 days
  const isRtl = language === "ar";

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 600);
    return () => clearTimeout(timer);
  }, [currentRole]);

  // Derived filtered data
  const filteredData = useMemo(() => {
    // For demo purposes, since mock data is from Jan 2024, we use Jan 20, 2024 as "today"
    const mockToday = parseISO("2024-01-20");
    const startDate = subDays(mockToday, parseInt(period));

    const samples = mockSamples.filter(s => isAfter(parseISO(s.receivedDate), startDate));
    const reports = mockReports.filter(r => r.issueDate && isAfter(parseISO(r.issueDate), startDate));
    const invoices = mockInvoices.filter(i => isAfter(parseISO(i.issueDate), startDate));

    return { samples, reports, invoices, startDate };
  }, [period]);

  // Dynamic Chart Data Generation
  const areaData = useMemo(() => {
    const months = eachMonthOfInterval({
      start: subMonths(parseISO("2024-01-20"), 5),
      end: parseISO("2024-01-20")
    });

    return months.map(month => {
      const monthStart = startOfMonth(month);
      const monthEnd = endOfMonth(month);
      const count = mockSamples.filter(s => {
        const d = parseISO(s.receivedDate);
        return isWithinInterval(d, { start: monthStart, end: monthEnd });
      }).length;

      return {
        name: format(month, "MMM"),
        samples: count * 15 // Scale for visualization
      };
    });
  }, []);

  const barData = useMemo(() => {
    const types: Record<string, number> = {};
    filteredData.invoices.forEach(inv => {
      // Find sample to get type
      const sample = mockSamples.find(s => s.id === inv.sampleId);
      const type = sample?.sampleType || "Other";
      types[type] = (types[type] || 0) + inv.total;
    });

    return Object.entries(types).map(([name, revenue]) => ({ name, revenue }))
      .sort((a, b) => b.revenue - a.revenue);
  }, [filteredData.invoices]);

  const pieData = useMemo(() => {
    const statusMap: Record<string, number> = {};
    filteredData.samples.forEach(s => {
      statusMap[s.status] = (statusMap[s.status] || 0) + 1;
    });

    return Object.entries(statusMap).map(([name, value]) => ({ name, value }));
  }, [filteredData.samples]);

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

  // Admin / Manager Dashboard View
  const totalRevenue = filteredData.invoices.reduce((sum, i) => sum + i.total, 0);
  const pendingTests = filteredData.samples.filter(s => s.status === 'Testing' || s.status === 'Received').length;

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
        <div className="flex items-center gap-3 bg-muted/30 p-1.5 rounded-lg border">
          <Calendar className="h-4 w-4 text-muted-foreground ml-2" />
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[140px] border-none bg-transparent shadow-none focus:ring-0">
              <SelectValue placeholder="Select period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 Days</SelectItem>
              <SelectItem value="30">Last 30 Days</SelectItem>
              <SelectItem value="90">Last 90 Days</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KpiCard 
          title={isRtl ? "إجمالي العينات" : "Filtered Samples"} 
          value={filteredData.samples.length} 
          icon={<FlaskConical />} 
          trend={{ value: 12.5, isPositive: true }} 
        />
        <KpiCard 
          title={isRtl ? "الاختبارات المعلقة" : "Active Tests"} 
          value={pendingTests} 
          icon={<Activity />} 
          trend={{ value: 2.1, isPositive: false }} 
        />
        <KpiCard 
          title={isRtl ? "التقارير المنجزة" : "Reports Issued"} 
          value={filteredData.reports.length} 
          icon={<CheckCircle />} 
          trend={{ value: 8.4, isPositive: true }} 
        />
        <KpiCard 
          title={isRtl ? "الإيرادات" : "Revenue"} 
          value={`SAR ${totalRevenue.toLocaleString()}`} 
          icon={<Receipt />} 
          trend={{ value: 15.3, isPositive: true }} 
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle>{isRtl ? "اتجاه حجم العينات" : "Sample Volume Trends"}</CardTitle>
            <CardDescription>Monthly samples received over development period</CardDescription>
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
            <CardTitle>{isRtl ? "توزيع العينات" : "Status Distribution"}</CardTitle>
            <CardDescription>Current period status breakdown</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={90}
                    paddingAngle={3}
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
            <CardDescription>Latest actions in the selected period</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {filteredData.samples.slice(0, 5).map((sample, i) => (
                <div key={i} className="flex gap-4">
                  <div className="mt-1 h-2 w-2 rounded-full bg-primary ring-4 ring-primary/10" />
                  <div>
                    <p className="text-sm font-medium">{sample.id} {sample.status} from {sample.clientName}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{sample.receivedDate}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle>Revenue by Test Type</CardTitle>
            <CardDescription>Distribution (SAR) for selected period</CardDescription>
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

