import { 
  mockAccounts, 
  mockInvoices, 
  mockExpenses,
  mockJournals 
} from "@/mock-data";
import { KpiCard } from "@/components/shared/KpiCard";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell
} from "recharts";
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Calculator, 
  ArrowUpRight, 
  ArrowDownRight,
  PieChart as PieChartIcon
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { useAppContext } from "@/context/AppContext";

const COLORS = ['#059669', '#3b82f6', '#eab308', '#ef4444'];

export default function AccountingDashboard() {
  const { language } = useAppContext();
  const isRtl = language === "ar";
  
  // Calculations
  const totalRevenue = mockInvoices.reduce((sum, inv) => sum + inv.subtotal, 0);
  const totalExpenses = mockExpenses.reduce((sum, exp) => sum + exp.amount, 0);
  const totalVatReceivable = mockExpenses.reduce((sum, exp) => sum + exp.vat, 0);
  const totalVatPayable = mockInvoices.reduce((sum, inv) => sum + inv.vat, 0);
  const netProfit = totalRevenue - totalExpenses;
  const vatPayableToZatca = totalVatPayable - totalVatReceivable;

  const cashFlowData = [
    { name: 'Jan', revenue: 45000, expenses: 32000 },
    { name: 'Feb', revenue: 52000, expenses: 35000 },
    { name: 'Mar', revenue: 48000, expenses: 38000 },
    { name: 'Apr', revenue: 61000, expenses: 42000 },
  ];

  const statusDistribution = [
    { name: 'Paid', value: mockInvoices.filter(i => i.status === 'Paid').length },
    { name: 'Pending', value: mockInvoices.filter(i => i.status === 'Pending').length },
    { name: 'Overdue', value: mockInvoices.filter(i => i.status === 'Overdue').length },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{isRtl ? "لوحة التحكم المالية" : "Financial Dashboard"}</h1>
        <p className="text-muted-foreground mt-1">
          {isRtl ? "نظرة عامة على الأداء المالي والالتزام بضريبة القيمة المضافة" : "Overview of financial performance and VAT compliance"}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KpiCard 
          title={isRtl ? "إجمالي الإيرادات" : "Total Revenue"} 
          value={`SAR ${totalRevenue.toLocaleString()}`} 
          icon={<TrendingUp className="text-emerald-500" />}
          trend={{ value: "12%", isPositive: true }}
        />
        <KpiCard 
          title={isRtl ? "إجمالي المصاريف" : "Total Expenses"} 
          value={`SAR ${totalExpenses.toLocaleString()}`} 
          icon={<TrendingDown className="text-rose-500" />}
          trend={{ value: "8%", isPositive: false }}
        />
        <KpiCard 
          title={isRtl ? "صافي الربح" : "Net Profit"} 
          value={`SAR ${netProfit.toLocaleString()}`} 
          icon={<DollarSign className="text-blue-500" />}
        />
        <KpiCard 
          title={isRtl ? "ضريبة القيمة المضافة المستحقة" : "VAT Payable (Net)"} 
          value={`SAR ${vatPayableToZatca.toLocaleString()}`} 
          icon={<Calculator className="text-amber-500" />}
          className="border-amber-200 dark:border-amber-900"
        />
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle>{isRtl ? "التدفق النقدي والربحية" : "Cash Flow & Profitability"}</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={cashFlowData}>
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Area type="monotone" dataKey="revenue" stroke="#10b981" fillOpacity={1} fill="url(#colorRev)" strokeWidth={2} />
                <Area type="monotone" dataKey="expenses" stroke="#f43f5e" fillOpacity={0} strokeWidth={2} strokeDasharray="5 5" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>{isRtl ? "حالة الفواتير" : "Invoice Status"}</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px] flex flex-col justify-center">
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={statusDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {statusDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex justify-center gap-4 text-sm mt-4">
              {statusDistribution.map((item, i) => (
                <div key={item.name} className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full" style={{ backgroundColor: COLORS[i] }} />
                  <span>{item.name}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="md:col-span-1 lg:col-span-2">
          <CardHeader>
            <CardTitle>{isRtl ? "أهم العملاء" : "Top Customers"}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {mockInvoices.slice(0, 4).map((inv, i) => (
                <div key={inv.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                      {inv.clientName.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{inv.clientName}</p>
                      <p className="text-xs text-muted-foreground">{inv.id}</p>
                    </div>
                  </div>
                  <p className="text-sm font-bold">SAR {inv.total.toLocaleString()}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-1 lg:col-span-2">
          <CardHeader>
            <CardTitle>{isRtl ? "المصاريف التشغيلية" : "Operating Expenses"}</CardTitle>
          </CardHeader>
          <CardContent>
             <div className="space-y-4">
              {mockExpenses.map((exp) => (
                <div key={exp.id} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{exp.vendorName}</p>
                    <p className="text-xs text-muted-foreground">{exp.category}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold">SAR {exp.total.toLocaleString()}</p>
                    <p className={`text-[10px] font-bold ${exp.status === 'Paid' ? 'text-emerald-500' : 'text-amber-500'}`}>{exp.status}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
