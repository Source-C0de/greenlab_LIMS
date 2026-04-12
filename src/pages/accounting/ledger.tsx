import { useState } from "react";
import { mockAccounts, mockJournals } from "@/mock-data";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Download, Printer, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useAppContext } from "@/context/AppContext";

export default function GeneralLedgerPage() {
  const { language } = useAppContext();
  const isRtl = language === "ar";
  const [selectedAccountId, setSelectedAccountId] = useState(mockAccounts[1].id); // Default to Bank

  const selectedAccount = mockAccounts.find(a => a.id === selectedAccountId);
  
  // Extract transactions for this account from all journals
  const transactions = mockJournals.flatMap(je => {
    return je.lines
      .filter(line => line.accountId === selectedAccountId)
      .map(line => ({
        date: je.date,
        journalId: je.id,
        description: je.description,
        reference: je.reference,
        debit: line.debit,
        credit: line.credit,
      }));
  }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // Calculate running balance
  let runningBalance = 0;
  const transactionsWithBalance = transactions.map(t => {
    const isAssetOrExpense = ['Asset', 'Expense'].includes(selectedAccount?.type || '');
    if (isAssetOrExpense) {
      runningBalance += (t.debit - t.credit);
    } else {
      runningBalance += (t.credit - t.debit);
    }
    return { ...t, balance: runningBalance };
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {isRtl ? "دفتر الأستاذ العام" : "General Ledger"}
          </h1>
          <p className="text-muted-foreground mt-1">
            {isRtl ? "عرض السجل التفصيلي لجميع الحسابات المالية" : "Detailed transaction history for individual accounts"}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline"><Printer className="h-4 w-4 mr-2" /> {isRtl ? "طباعة" : "Print"}</Button>
          <Button variant="outline"><Download className="h-4 w-4 mr-2" /> {isRtl ? "تصدير" : "Export"}</Button>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <CardTitle>{isRtl ? "البحث والتصفية" : "Search & Filter"}</CardTitle>
              <CardDescription>{isRtl ? "اختر الحساب لعرض حركاته المالية" : "Select an account to view its financial movements"}</CardDescription>
            </div>
            <div className="flex gap-2 flex-1 md:max-w-md">
               <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select Account" />
                </SelectTrigger>
                <SelectContent>
                  {mockAccounts.map(acc => (
                    <SelectItem key={acc.id} value={acc.id}>
                      {acc.code} - {isRtl ? acc.nameAr : acc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="p-4 bg-muted/50 rounded-lg border">
              <p className="text-xs text-muted-foreground uppercase font-bold">{isRtl ? "نوع الحساب" : "Type"}</p>
              <p className="text-sm font-medium">{selectedAccount?.type}</p>
            </div>
            <div className="p-4 bg-muted/50 rounded-lg border">
              <p className="text-xs text-muted-foreground uppercase font-bold">{isRtl ? "الفئة" : "Category"}</p>
              <p className="text-sm font-medium">{selectedAccount?.category}</p>
            </div>
            <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
              <p className="text-xs text-primary/80 uppercase font-bold">{isRtl ? "الرصيد الحالي" : "Current Balance"}</p>
              <p className="text-lg font-bold text-primary">SAR {selectedAccount?.balance.toLocaleString()}</p>
            </div>
          </div>

          <div className="rounded-md border overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="w-[120px]">{isRtl ? "التاريخ" : "Date"}</TableHead>
                  <TableHead>{isRtl ? "البيان" : "Description"}</TableHead>
                  <TableHead className="w-[150px]">{isRtl ? "المرجع" : "Reference"}</TableHead>
                  <TableHead className="text-right w-[120px]">{isRtl ? "مدين (+)" : "Debit (+)"}</TableHead>
                  <TableHead className="text-right w-[120px]">{isRtl ? "دائن (-)" : "Credit (-)"}</TableHead>
                  <TableHead className="text-right w-[150px]">{isRtl ? "الرصيد" : "Balance"}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactionsWithBalance.length > 0 ? (
                  transactionsWithBalance.map((t, i) => (
                    <TableRow key={i}>
                      <TableCell className="text-sm">{t.date}</TableCell>
                      <TableCell>
                        <div>
                          <p className="text-sm font-medium">{t.description}</p>
                          <p className="text-[10px] text-muted-foreground font-mono">{t.journalId}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm font-mono">{t.reference}</TableCell>
                      <TableCell className="text-right text-emerald-600 font-medium">
                        {t.debit > 0 ? t.debit.toLocaleString(undefined, { minimumFractionDigits: 2 }) : "-"}
                      </TableCell>
                      <TableCell className="text-right text-rose-600 font-medium">
                        {t.credit > 0 ? t.credit.toLocaleString(undefined, { minimumFractionDigits: 2 }) : "-"}
                      </TableCell>
                      <TableCell className="text-right font-bold">
                        SAR {t.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                      {isRtl ? "لا توجد حركات مسجلة لهذا الحساب" : "No transactions found for this account"}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
