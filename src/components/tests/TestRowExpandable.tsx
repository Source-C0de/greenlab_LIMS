import { useState } from "react";
import { TableRow, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/shared/StatusBadge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ChevronDown,
  ChevronRight,
  Eye,
  FileEdit,
  Save,
  Paperclip,
  MessageSquare,
  UserCircle,
  Check,
  X as XIcon,
  Search,
} from "lucide-react";
import { ParameterTable, Parameter } from "./ParameterTable";
import { useAppContext } from "@/context/AppContext";
import { cn } from "@/lib/utils";

export interface TestTableTest {
  id: string;
  name: string;
  category: string;
  method: string;
  assignedTo: string | null;
  status?: string;
  reviewStatus?: string;
  parameters: Parameter[];
  specificationId?: string;
}

interface TestRowExpandableProps {
  test: TestTableTest;
  onView: (id: string) => void;
  onAssignAnalyst?: (analyst: { name: string; nameAr: string } | null) => void;
  analystPickerOpen?: boolean;
  onAnalystPickerOpenChange?: (open: boolean) => void;
  analystSearch?: string;
  onAnalystSearchChange?: (s: string) => void;
  filteredAnalysts?: { id: string; name: string; nameAr: string; specialization: string }[];
  canEditAnalyst?: boolean;
}

export function TestRowExpandable({
  test,
  onView,
  onAssignAnalyst,
  analystPickerOpen,
  onAnalystPickerOpenChange,
  analystSearch,
  onAnalystSearchChange,
  filteredAnalysts,
  canEditAnalyst = true,
}: TestRowExpandableProps) {
  const { language } = useAppContext();
  const isRtl = language === "ar";
  const [isExpanded, setIsExpanded] = useState(false);
  const [parameters, setParameters] = useState<Parameter[]>(test.parameters);

  const renderAnalystCell = () => {
    if (!canEditAnalyst || !onAssignAnalyst) {
      return (
        <span className="text-sm">
          {test.assignedTo || (isRtl ? "غير معين" : "Not Assigned")}
        </span>
      );
    }

    return (
      <Popover
        open={analystPickerOpen}
        onOpenChange={onAnalystPickerOpenChange}
      >
        <PopoverTrigger asChild>
          <button
            type="button"
            className={cn(
              "text-sm text-start rounded px-2 py-1 -mx-2 hover:bg-muted/60 transition-colors cursor-pointer flex items-center gap-1.5 group",
              !test.assignedTo && "text-muted-foreground italic"
            )}
            onClick={(e) => e.stopPropagation()}
          >
            <UserCircle className="h-3.5 w-3.5 text-muted-foreground" />
            {test.assignedTo || (isRtl ? "غير معين" : "Not Assigned")}
            <span className="text-[10px] text-muted-foreground/0 group-hover:text-muted-foreground transition-colors">
              {isRtl ? "تغيير" : "change"}
            </span>
          </button>
        </PopoverTrigger>
        <PopoverContent
          className="w-[280px] p-0"
          align="start"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-2 border-b">
            <div className="relative">
              <Search
                className={`absolute h-3.5 w-3.5 text-muted-foreground top-1/2 -translate-y-1/2 ${
                  isRtl ? "right-2.5" : "left-2.5"
                }`}
              />
              <Input
                placeholder={isRtl ? "البحث عن محلل..." : "Search analysts..."}
                className={`h-8 ${isRtl ? "pr-8" : "pl-8"}`}
                value={analystSearch ?? ""}
                onChange={(e) => onAnalystSearchChange?.(e.target.value)}
                autoFocus
              />
            </div>
          </div>
          <ScrollArea className="h-[240px]">
            <div className="p-1 space-y-0.5">
              {test.assignedTo && (
                <button
                  type="button"
                  onClick={() => {
                    onAssignAnalyst(null);
                    onAnalystPickerOpenChange?.(false);
                  }}
                  className="w-full flex items-center gap-2 p-2 rounded text-start text-xs text-muted-foreground hover:bg-muted"
                >
                  <XIcon className="h-3.5 w-3.5" />
                  {isRtl ? "إلغاء التعيين" : "Unassign"}
                </button>
              )}
              {filteredAnalysts?.map((a) => {
                const selected = test.assignedTo === a.name;
                return (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => {
                      onAssignAnalyst({ name: a.name, nameAr: a.nameAr });
                      onAnalystPickerOpenChange?.(false);
                    }}
                    className={cn(
                      "w-full flex items-center gap-2 p-2 rounded text-start hover:bg-muted transition-colors",
                      selected && "bg-primary/5"
                    )}
                  >
                    <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                      <UserCircle className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">
                        {isRtl ? a.nameAr : a.name}
                      </p>
                      <p className="text-[10px] text-muted-foreground truncate">
                        {a.specialization}
                      </p>
                    </div>
                    {selected && <Check className="h-4 w-4 text-primary" />}
                  </button>
                );
              })}
              {filteredAnalysts?.length === 0 && (
                <div className="py-6 text-center text-xs text-muted-foreground">
                  {isRtl ? "لا يوجد نتائج" : "No matching analysts"}
                </div>
              )}
            </div>
          </ScrollArea>
        </PopoverContent>
      </Popover>
    );
  };

  return (
    <>
      <TableRow className={`cursor-pointer transition-colors group ${isExpanded ? 'bg-muted/30' : ''}`} onClick={() => setIsExpanded(!isExpanded)}>
        <TableCell className="w-10">
          <Button variant="ghost" size="icon" className="h-8 w-8">
            {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </Button>
        </TableCell>
        <TableCell className="font-medium">
          <div className="flex flex-col">
            <span>{test.name}</span>
            <span className="text-xs text-muted-foreground font-mono">{test.id}</span>
          </div>
        </TableCell>
        <TableCell>
          <Badge variant="outline" className="font-normal">{test.category}</Badge>
        </TableCell>
        <TableCell className="text-sm text-muted-foreground">{test.method}</TableCell>
        <TableCell className="text-sm" onClick={(e) => e.stopPropagation()}>
          {renderAnalystCell()}
        </TableCell>
        <TableCell>
          <StatusBadge status={test.reviewStatus ?? test.status ?? "pending"} />
        </TableCell>
        <TableCell className="text-right">
          <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
            <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => onView(test.id)}>
              <Eye className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
              <FileEdit className="h-4 w-4" />
            </Button>
          </div>
        </TableCell>
      </TableRow>

      {isExpanded && (
        <TableRow className="bg-muted/10 hover:bg-muted/10">
          <TableCell colSpan={7} className="p-4 pt-0">
            <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold flex items-center gap-2">
                  <FileEdit className="h-4 w-4 text-primary" />
                  {isRtl ? "إدخال النتائج" : "Result Entry"}
                </h4>
                <div className="flex gap-2">
                   <Button variant="outline" size="sm" className="h-8 gap-1">
                    <Paperclip className="h-3.5 w-3.5" />
                    {isRtl ? "المرفقات" : "Attachments"}
                  </Button>
                  <Button variant="outline" size="sm" className="h-8 gap-1">
                    <MessageSquare className="h-3.5 w-3.5" />
                    {isRtl ? "الملاحظات" : "Notes"}
                  </Button>
                  <Button size="sm" className="h-8 gap-1">
                    <Save className="h-3.5 w-3.5" />
                    {isRtl ? "حفظ" : "Save"}
                  </Button>
                </div>
              </div>

              <ParameterTable
                parameters={parameters}
                onUpdate={(updated) => setParameters(updated)}
              />
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}
