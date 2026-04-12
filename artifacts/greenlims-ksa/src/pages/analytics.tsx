import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, LineChart, Line, ComposedChart } from "recharts";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const tatData = [
  { month: 'Jul', water: 2.1, food: 3.5, pharma: 5.2 },
  { month: 'Aug', water: 2.3, food: 3.2, pharma: 4.8 },
  { month: 'Sep', water: 2.0, food: 3.6, pharma: 4.5 },
  { month: 'Oct', water: 1.8, food: 3.1, pharma: 4.2 },
  { month: 'Nov', water: 1.9, food: 2.9, pharma: 4.0 },
  { month: 'Dec', water: 1.7, food: 2.8, pharma: 3.8 },
];

const performanceData = [
  { name: 'Shahjahan', samples: 145, tat: 2.8, passRate: 98.5 },
  { name: 'Tariq masum', samples: 132, tat: 2.1, passRate: 99.2 },
  { name: 'Nazmul Alam', samples: 118, tat: 4.2, passRate: 97.8 },
  { name: 'Khaled', samples: 95, tat: 3.5, passRate: 98.1 },
  { name: 'Tariq masum', samples: 120, tat: 2.5, passRate: 96.5 },
];

export default function Analytics() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Laboratory Analytics</h1>
          <p className="text-muted-foreground mt-1">Deep dive into operational and financial metrics</p>
        </div>
        <div className="flex gap-2">
          <Select defaultValue="6m">
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Timeframe" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="30d">Last 30 Days</SelectItem>
              <SelectItem value="3m">Last 3 Months</SelectItem>
              <SelectItem value="6m">Last 6 Months</SelectItem>
              <SelectItem value="1y">Last Year</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Average Turnaround Time (TAT)</CardTitle>
            <CardDescription>Days from sample receipt to report approval by matrix</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[350px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={tatData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={v => `${v}d`} />
                  <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }} />
                  <Legend />
                  <Line type="monotone" dataKey="water" name="Water" stroke="hsl(var(--chart-1))" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                  <Line type="monotone" dataKey="food" name="Food" stroke="hsl(var(--chart-2))" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                  <Line type="monotone" dataKey="pharma" name="Pharma" stroke="hsl(var(--chart-3))" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Analyst Performance Metrics</CardTitle>
            <CardDescription>Volume vs Efficiency</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[350px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={performanceData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" stroke="#888888" fontSize={10} tickLine={false} axisLine={false} tickFormatter={n => n.split(' ')[0]} />
                  <YAxis yAxisId="left" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis yAxisId="right" orientation="right" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} domain={[0, 100]} />
                  <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }} />
                  <Legend />
                  <Bar yAxisId="left" dataKey="samples" name="Total Samples" fill="hsl(var(--chart-4))" radius={[4, 4, 0, 0]} barSize={30} />
                  <Line yAxisId="right" type="monotone" dataKey="passRate" name="Pass Rate %" stroke="hsl(var(--chart-2))" strokeWidth={3} dot={{ r: 4 }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
