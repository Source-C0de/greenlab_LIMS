import { useState } from "react";
import { TableRow, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronRight, Eye, FileEdit, Save, Paperclip, MessageSquare } from "lucide-react";
import { ParameterTable, Parameter } from "./ParameterTable";
import { useAppContext } from "@/context/AppContext";

interface Test {
  id: string;
  name: string;
  category: string;
  method: string;
  assignedTo: string | null;
  status: string;
  parameters: Parameter[];
}

interface TestRowExpandableProps {
  test: Test;
  onView: (id: string) => void;
}

export function TestRowExpandable({ test, onView }: TestRowExpandableProps) {
  const { language } = useAppContext();
  const isRtl = language === "ar";
  const [isExpanded, setIsExpanded] = useState(false);
  const [parameters, setParameters] = useState<Parameter[]>(test.parameters);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Completed": return "bg-green-500/10 text-green-600 border-green-200";
      case "In Progress": return "bg-blue-500/10 text-blue-600 border-blue-200";
      case "Review": return "bg-yellow-500/10 text-yellow-600 border-yellow-200";
      default: return "bg-gray-500/10 text-gray-600 border-gray-200";
    }
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
        <TableCell className="text-sm">
          {test.assignedTo || (isRtl ? "غير معين" : "Not Assigned")}
        </TableCell>
        <TableCell>
          <Badge className={`font-normal ${getStatusColor(test.status)}`}>
            {test.status}
          </Badge>
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
