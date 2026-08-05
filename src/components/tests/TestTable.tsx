import { useState } from "react";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Users,
  CheckCircle,
  Filter,
  Search,
  LayoutGrid,
  UserCircle,
  Check,
} from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { TestRowExpandable, type TestTableTest } from "./TestRowExpandable";
import { mockAnalysts } from "@/mock-data";
import { useAppContext } from "@/context/AppContext";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";

export type { TestTableTest };

interface TestTableProps {
  tests: TestTableTest[];
  onViewTest: (id: string) => void;
  onUpdateTest?: (testId: string, patch: Partial<TestTableTest>) => void;
}

export function TestTable({ tests, onViewTest, onUpdateTest }: TestTableProps) {
  const { language, currentRole } = useAppContext();
  const isRtl = language === "ar";
  const [analystPickerFor, setAnalystPickerFor] = useState<string | null>(null);
  const [analystSearch, setAnalystSearch] = useState("");

  const filteredAnalysts = mockAnalysts.filter(
    (a) =>
      a.name.toLowerCase().includes(analystSearch.toLowerCase()) ||
      a.nameAr.includes(analystSearch)
  );

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
        <div className="max-h-[640px] overflow-auto">
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-muted/50">
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead className="w-10">
                  <Checkbox />
                </TableHead>
                <TableHead className="w-[260px]">{isRtl ? "الاختبار / المعامل" : "Test / Parameter"}</TableHead>
                <TableHead className="w-[140px]">{isRtl ? "الحد" : "Limit"}</TableHead>
                <TableHead className="w-[120px]">{isRtl ? "النتيجة" : "Result"}</TableHead>
                <TableHead className="w-[90px]">{isRtl ? "الوحدة" : "Unit"}</TableHead>
                <TableHead className="w-[90px]">{isRtl ? "MU" : "MU"}</TableHead>
                <TableHead className="w-[140px]">{isRtl ? "المرجع" : "Reference"}</TableHead>
                <TableHead className="w-[120px]">{isRtl ? "الحالة" : "Status"}</TableHead>
                <TableHead className="text-right w-16"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tests.flatMap((test) =>
                (test.parameters ?? []).map((param) => (
                  <TestRowExpandable
                    key={`${test.id}-${param.id}`}
                    test={test}
                    parameter={param}
                    onView={onViewTest}
                    onAssignAnalyst={
                      onUpdateTest
                        ? (analyst) => {
                            if (analyst === null) {
                              onUpdateTest(test.id, { assignedTo: null });
                            } else {
                              onUpdateTest(test.id, { assignedTo: analyst.name });
                            }
                          }
                        : undefined
                    }
                    analystPickerOpen={analystPickerFor === test.id}
                    onAnalystPickerOpenChange={(open) => {
                      setAnalystPickerFor(open ? test.id : null);
                      if (!open) setAnalystSearch("");
                    }}
                    analystSearch={analystSearch}
                    onAnalystSearchChange={setAnalystSearch}
                    filteredAnalysts={filteredAnalysts}
                    canEditAnalyst={currentRole !== "client"}
                  />
                )),
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
