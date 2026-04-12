import { mockAccounts } from "@/mock-data";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription 
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Plus, Download, ChevronRight, Network } from "lucide-react";
import { useAppContext } from "@/context/AppContext";

export default function ChartOfAccountsPage() {
  const { language } = useAppContext();
  const isRtl = language === "ar";

  const getBadgeVariant = (type: string) => {
    switch(type) {
      case 'Asset': return 'default';
      case 'Liability': return 'destructive';
      case 'Equity': return 'secondary';
      case 'Revenue': return 'success'; // success variant might need custom implementation or use outline
      case 'Expense': return 'outline';
      default: return 'default';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {isRtl ? "شجرة الحسابات" : "Chart of Accounts"}
          </h1>
          <p className="text-muted-foreground mt-1">
            {isRtl ? "الهيكل المالي والتبويب المحاسبي للمنشأة" : "The financial structure and accounting classification of the enterprise"}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline"><Download className="h-4 w-4 mr-2" /> {isRtl ? "تصدير" : "Export"}</Button>
          <Button><Plus className="h-4 w-4 mr-2" /> {isRtl ? "حساب جديد" : "New Account"}</Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-4">
        {['Asset', 'Liability', 'Equity', 'Revenue', 'Expense'].map((type) => {
          const count = mockAccounts.filter(a => a.type === type).length;
          const totalBalance = mockAccounts.filter(a => a.type === type).reduce((sum, a) => sum + a.balance, 0);
          
          return (
            <Card key={type} className="bg-muted/30">
              <CardContent className="pt-6">
                <p className="text-xs font-bold text-muted-foreground uppercase">{type}</p>
                <div className="flex justify-between items-end mt-2">
                  <p className="text-2xl font-bold">{count}</p>
                  <p className="text-xs font-medium text-primary">SAR {totalBalance.toLocaleString()}</p>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-2">
            <Network className="h-5 w-5 text-primary" />
            {isRtl ? "دليل الحسابات" : "Accounts Directory"}
          </CardTitle>
          <CardDescription>
            {isRtl ? "تصنيف الحسابات حسب النوع والرمز المحاسبي" : "Classification of accounts by type and accounting code"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-[120px]">{isRtl ? "الرمز" : "Code"}</TableHead>
                  <TableHead>{isRtl ? "اسم الحساب" : "Account Name"}</TableHead>
                  <TableHead>{isRtl ? "النوع" : "Type"}</TableHead>
                  <TableHead>{isRtl ? "الفئة" : "Category"}</TableHead>
                  <TableHead className="text-right">{isRtl ? "الرصيد" : "Balance"}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockAccounts.map((account) => (
                  <TableRow key={account.id} className="cursor-pointer hover:bg-muted/50 transition-colors group">
                    <TableCell className="font-mono font-medium">{account.code}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <ChevronRight className="h-3 w-3 text-muted-foreground group-hover:text-primary transition-colors" />
                        <span className="font-medium">{isRtl ? account.nameAr : account.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="px-2 py-0 h-5 text-[10px] font-bold">
                        {account.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{account.category}</TableCell>
                    <TableCell className="text-right font-bold">
                      SAR {account.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
