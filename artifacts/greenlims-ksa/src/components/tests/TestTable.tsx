import { 
  Table, 
  TableBody, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { 
  Users, 
  CheckCircle, 
  MoreHorizontal, 
  Filter, 
  Search,
  LayoutGrid
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { TestRowExpandable } from "./TestRowExpandable";
import { useAppContext } from "@/context/AppContext";

interface TestTableProps {
  tests: any[];
  onViewTest: (id: string) => void;
}

export function TestTable({ tests, onViewTest }: TestTableProps) {
  const { language } = useAppContext();
  const isRtl = language === "ar";

  return (
    <div className="space-y-4">
      {/* Table Actions/Filters */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className={`absolute h-4 w-4 text-muted-foreground top-1/2 -translate-y-1/2 ${isRtl ? 'right-3' : 'left-3'}`} />
            <Input 
              placeholder={isRtl ? "البحث عن اختبار..." : "Filter tests..."} 
              className={`${isRtl ? 'pr-9' : 'pl-9'} h-9`}
            />
          </div>
          <Button variant="outline" size="sm" className="h-9">
            <Filter className="mr-2 h-4 w-4" /> {isRtl ? "تصفية" : "Filter"}
          </Button>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" className="text-muted-foreground h-9">
            <Users className="mr-2 h-4 w-4" /> {isRtl ? "تعيين جماعي" : "Bulk Assign"}
          </Button>
          <Button variant="ghost" size="sm" className="text-muted-foreground h-9">
            <CheckCircle className="mr-2 h-4 w-4" /> {isRtl ? "إكمال جماعي" : "Bulk Complete"}
          </Button>
          <div className="h-6 w-px bg-border mx-1"></div>
          <Button variant="outline" size="icon" className="h-9 w-9">
            <LayoutGrid className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="rounded-xl border shadow-sm overflow-hidden bg-card">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              <TableHead className="w-10">
                <Checkbox />
              </TableHead>
              <TableHead className="w-[250px]">{isRtl ? "الاختبار" : "Test Name"}</TableHead>
              <TableHead>{isRtl ? "الفئة" : "Category"}</TableHead>
              <TableHead>{isRtl ? "الطريقة" : "Method"}</TableHead>
              <TableHead>{isRtl ? "المحلل" : "Technical Assistant"}</TableHead>
              <TableHead>{isRtl ? "الحالة" : "Status"}</TableHead>
              <TableHead className="text-right w-20"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tests.map((test) => (
              <TestRowExpandable key={test.id} test={test} onView={onViewTest} />
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
