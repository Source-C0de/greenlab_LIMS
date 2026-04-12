import { useState } from "react";
import { 
  mockAccounts, 
  mockInvoices, 
  mockExpenses 
} from "@/mock-data";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Download, FileText, Calendar, Printer } from "lucide-react";
import { useAppContext } from "@/context/AppContext";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function AccountingReportsPage() {
  const { language } = useAppContext();
  const isRtl = language === "ar";
  
  // Data for P&L
  const revenueAccs = mockAccounts.filter(a => a.type === 'Revenue');
  const expenseAccs = mockAccounts.filter(a => a.type === 'Expense');
  const totalRevenue = revenueAccs.reduce((sum, a) => sum + a.balance, 0);
  const totalExpense = expenseAccs.reduce((sum, a) => sum + a.balance, 0);
  const netIncome = totalRevenue - totalExpense;

  // Data for Balance Sheet
  const assetAccs = mockAccounts.filter(a => a.type === 'Asset');
  const liabilityAccs = mockAccounts.filter(a => a.type === 'Liability');
  const equityAccs = mockAccounts.filter(a => a.type === 'Equity');
  const totalAssets = assetAccs.reduce((sum, a) => sum + a.balance, 0);
  const totalLiabilities = liabilityAccs.reduce((sum, a) => sum + a.balance, 0);
  const totalEquity = equityAccs.reduce((sum, a) => sum + a.balance, 0);

  // VAT Data
  const outputVat = mockInvoices.reduce((sum, i) => sum + i.vat, 0);
  const inputVat = mockExpenses.reduce((sum, e) => sum + e.vat, 0);
  const vatPayable = outputVat - inputVat;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {isRtl ? "التقارير المالية" : "Financial Reports"}
          </h1>
          <p className="text-muted-foreground mt-1">
            {isRtl ? "استخراج القوائم المالية وتقارير الضريبة" : "Generate financial statements and tax reports"}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline"><Calendar className="h-4 w-4 mr-2" /> Q1 2024</Button>
          <Button><Printer className="h-4 w-4 mr-2" /> {isRtl ? "طباعة الكل" : "Print All"}</Button>
        </div>
      </div>

      <Tabs defaultValue="pl" className="w-full">
        <TabsList className="grid w-full grid-cols-3 md:w-[600px]">
          <TabsTrigger value="pl">{isRtl ? "قائمة الدخل" : "Profit & Loss"}</TabsTrigger>
          <TabsTrigger value="bs">{isRtl ? "الميزانية العمومية" : "Balance Sheet"}</TabsTrigger>
          <TabsTrigger value="vat">{isRtl ? "تقرير الضريبة" : "VAT Report"}</TabsTrigger>
        </TabsList>

        {/* Profit & Loss */}
        <TabsContent value="pl" className="mt-6 space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between border-b pb-4">
              <div>
                <CardTitle>{isRtl ? "بيان الأرباح والخسائر" : "Income Statement"}</CardTitle>
                <CardDescription>January 1, 2024 - March 31, 2024</CardDescription>
              </div>
              <Button size="sm" variant="outline"><Download className="h-4 w-4 mr-2" /> PDF</Button>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-8">
                {/* Revenue Section */}
                <section>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4">
                    {isRtl ? "الإيرادات" : "Operating Revenue"}
                  </h3>
                  <div className="space-y-2">
                    {revenueAccs.map(acc => (
                      <div key={acc.id} className="flex justify-between py-1 border-b border-dashed">
                        <span className="text-sm">{isRtl ? acc.nameAr : acc.name}</span>
                        <span className="text-sm font-medium">{acc.balance.toLocaleString()}</span>
                      </div>
                    ))}
                    <div className="flex justify-between py-2 font-bold text-emerald-600 bg-emerald-50/50 px-2 rounded mt-2">
                      <span>{isRtl ? "إجمالي الإيرادات" : "Total Revenue"}</span>
                      <span>SAR {totalRevenue.toLocaleString()}</span>
                    </div>
                  </div>
                </section>

                {/* Expenses Section */}
                <section>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4">
                    {isRtl ? "المصاريف" : "Operating Expenses"}
                  </h3>
                  <div className="space-y-2">
                    {expenseAccs.map(acc => (
                      <div key={acc.id} className="flex justify-between py-1 border-b border-dashed">
                        <span className="text-sm">{isRtl ? acc.nameAr : acc.name}</span>
                        <span className="text-sm font-medium">({acc.balance.toLocaleString()})</span>
                      </div>
                    ))}
                    <div className="flex justify-between py-2 font-bold text-rose-600 bg-rose-50/50 px-2 rounded mt-2">
                      <span>{isRtl ? "إجمالي المصاريف" : "Total Expenses"}</span>
                      <span>SAR ({totalExpense.toLocaleString()})</span>
                    </div>
                  </div>
                </section>

                {/* Net Income */}
                <section className="pt-4 border-t-2 border-primary">
                  <div className="flex justify-between py-4 font-bold text-2xl text-primary px-2">
                    <span>{isRtl ? "صافي الدخل" : "Net Profit / Loss"}</span>
                    <span>SAR {netIncome.toLocaleString()}</span>
                  </div>
                </section>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Balance Sheet */}
        <TabsContent value="bs" className="mt-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between border-b pb-4">
              <div>
                <CardTitle>{isRtl ? "قائمة المركز المالي" : "Statement of Financial Position"}</CardTitle>
                <CardDescription>As of March 31, 2024</CardDescription>
              </div>
              <Button size="sm" variant="outline"><Download className="h-4 w-4 mr-2" /> PDF</Button>
            </CardHeader>
            <CardContent className="pt-6">
               <div className="grid md:grid-cols-2 gap-12">
                  {/* Assets */}
                  <div className="space-y-6">
                    <h3 className="text-lg font-bold text-primary border-b pb-2">{isRtl ? "الأصول" : "ASSETS"}</h3>
                    <div className="space-y-2">
                      {assetAccs.map(acc => (
                        <div key={acc.id} className="flex justify-between py-1 text-sm border-b border-dashed">
                          <span>{isRtl ? acc.nameAr : acc.name}</span>
                          <span className="font-medium">{acc.balance.toLocaleString()}</span>
                        </div>
                      ))}
                      <div className="flex justify-between py-2 font-bold bg-muted px-2 rounded mt-4">
                        <span>{isRtl ? "إجمالي الأصول" : "Total Assets"}</span>
                        <span>SAR {totalAssets.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  {/* Liabilities & Equity */}
                  <div className="space-y-8">
                    <section className="space-y-6">
                      <h3 className="text-lg font-bold text-rose-700 border-b pb-2">{isRtl ? "الالتزامات" : "LIABILITIES"}</h3>
                      <div className="space-y-2">
                        {liabilityAccs.map(acc => (
                          <div key={acc.id} className="flex justify-between py-1 text-sm border-b border-dashed">
                            <span>{isRtl ? acc.nameAr : acc.name}</span>
                            <span className="font-medium">{acc.balance.toLocaleString()}</span>
                          </div>
                        ))}
                        <div className="flex justify-between py-2 font-bold bg-muted px-2 rounded mt-2 text-rose-700">
                          <span>{isRtl ? "إجمالي الالتزامات" : "Total Liabilities"}</span>
                          <span>SAR {totalLiabilities.toLocaleString()}</span>
                        </div>
                      </div>
                    </section>

                    <section className="space-y-6">
                      <h3 className="text-lg font-bold text-blue-700 border-b pb-2">{isRtl ? "حقوق الملكية" : "EQUITY"}</h3>
                      <div className="space-y-2">
                        {equityAccs.map(acc => (
                          <div key={acc.id} className="flex justify-between py-1 text-sm border-b border-dashed">
                            <span>{isRtl ? acc.nameAr : acc.name}</span>
                            <span className="font-medium">{acc.balance.toLocaleString()}</span>
                          </div>
                        ))}
                        <div className="flex justify-between py-2 font-bold bg-muted px-2 rounded mt-2 text-blue-700">
                          <span>{isRtl ? "إجمالي حقوق الملكية" : "Total Equity"}</span>
                          <span>SAR {totalEquity.toLocaleString()}</span>
                        </div>
                      </div>
                    </section>
                  </div>
               </div>
               
               <div className="mt-12 p-4 bg-primary/5 border rounded-lg flex justify-between items-center">
                  <span className="font-bold">{isRtl ? "إجمالي الالتزامات وحقوق الملكية" : "Total Liabilities & Equity"}</span>
                  <span className="text-xl font-bold">SAR {(totalLiabilities + totalEquity).toLocaleString()}</span>
               </div>
               <p className="text-center text-xs text-muted-foreground mt-4 italic">
                {isRtl ? "تتوازن هذه الميزانية وفقاً للمعادلة المحاسبية الأساسية" : "Balanced according to fundamental accounting equation"}
               </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* VAT Report */}
        <TabsContent value="vat" className="mt-6">
           <Card>
            <CardHeader className="flex flex-row items-center justify-between border-b pb-4">
              <div>
                <CardTitle>{isRtl ? "تقرير الإقرار الضريبي" : "VAT Return Report"}</CardTitle>
                <CardDescription>{isRtl ? "ملخص الهيئة العامة للزكاة والدخل لضريبة القيمة المضافة" : "Summary for ZATCA VAT filing"}</CardDescription>
              </div>
              <Button size="sm" variant="outline"><Download className="h-4 w-4 mr-2" /> Export for Fatoora</Button>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-8">
                 <div className="grid md:grid-cols-2 gap-8">
                    <Card className="bg-emerald-50/50 border-emerald-200">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-bold text-emerald-800">{isRtl ? "ضريبة المخرجات (المبيعات)" : "Output VAT (Sales)"}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-2xl font-bold text-emerald-900">SAR {outputVat.toLocaleString()}</p>
                        <p className="text-xs text-emerald-600 mt-1">From {mockInvoices.length} taxable invoices</p>
                      </CardContent>
                    </Card>

                    <Card className="bg-rose-50/50 border-rose-200">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-bold text-rose-800">{isRtl ? "ضريبة المدخلات (المشتريات)" : "Input VAT (Purchases)"}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-2xl font-bold text-rose-900">SAR {inputVat.toLocaleString()}</p>
                        <p className="text-xs text-rose-600 mt-1">From {mockExpenses.length} taxable expenses</p>
                      </CardContent>
                    </Card>
                 </div>

                 <div className="rounded-md border overflow-hidden">
                    <Table>
                      <TableHeader className="bg-muted">
                        <TableRow>
                          <TableHead>{isRtl ? "وصف البند" : "Description"}</TableHead>
                          <TableHead className="text-right">{isRtl ? "المبلغ الخاضع" : "Taxable Amount"}</TableHead>
                          <TableHead className="text-right">{isRtl ? "الضريبة (15%)" : "Tax Amount (15%)"}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        <TableRow>
                          <TableCell className="font-medium">{isRtl ? "المبيعات المحلية (15%)" : "Standard Rated Domestic Sales (15%)"}</TableCell>
                          <TableCell className="text-right">SAR {totalRevenue.toLocaleString()}</TableCell>
                          <TableCell className="text-right font-bold text-emerald-600">{outputVat.toLocaleString()}</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="font-medium">{isRtl ? "المشتريات المحلية (15%)" : "Standard Rated Domestic Purchases (15%)"}</TableCell>
                          <TableCell className="text-right">SAR {totalExpense.toLocaleString()}</TableCell>
                          <TableCell className="text-right font-bold text-rose-600">{inputVat.toLocaleString()}</TableCell>
                        </TableRow>
                        <TableRow className="bg-primary/5">
                          <TableCell className="font-bold">{isRtl ? "صافي الضريبة واجبة السداد" : "Net VAT Payable / (Claimable)"}</TableCell>
                          <TableCell className="text-right">-</TableCell>
                          <TableCell className="text-right font-bold text-primary text-lg">SAR {vatPayable.toLocaleString()}</TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                 </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
