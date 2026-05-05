import { useState, useEffect } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Check, X, AlertCircle } from "lucide-react";
import { useAppContext } from "@/context/AppContext";

export interface Parameter {
  id: string;
  name: string;
  value: string;
  unit: string;
  min: number | null;
  max: number | null;
  status: string;
}

interface ParameterTableProps {
  parameters: Parameter[];
  onUpdate: (params: Parameter[]) => void;
}

export function ParameterTable({ parameters, onUpdate }: ParameterTableProps) {
  const { language, currentRole } = useAppContext();
  const isRtl = language === "ar";
  const [localParams, setLocalParams] = useState<Parameter[]>(parameters);

  useEffect(() => {
    setLocalParams(parameters);
  }, [parameters]);

  const handleValueChange = (id: string, newValue: string) => {
    const updated = localParams.map((p: any) => {
      if (p.id === id) {
        let status = "Pending";
        if (newValue !== "") {
          const numValue = parseFloat(newValue);
          const limitType = p.limitType || "Range";

          switch (limitType) {
            case "Range":
              if (!isNaN(numValue)) {
                const isMinOk = p.min === null || p.min === "" || numValue >= parseFloat(p.min);
                const isMaxOk = p.max === null || p.max === "" || numValue <= parseFloat(p.max);
                status = isMinOk && isMaxOk ? "Pass" : "Fail";
              }
              break;
            case "Max Only":
              if (!isNaN(numValue)) {
                status = p.max === null || p.max === "" || numValue <= parseFloat(p.max) ? "Pass" : "Fail";
              }
              break;
            case "Min Only":
              if (!isNaN(numValue)) {
                status = p.min === null || p.min === "" || numValue >= parseFloat(p.min) ? "Pass" : "Fail";
              }
              break;
            case "Exact Value":
              status = newValue === p.target ? "Pass" : "Fail";
              break;
            case "Pass / Fail":
              const lowerVal = newValue.toLowerCase();
              if (["pass", "absent", "negative", "ok", "yes", "clear"].includes(lowerVal)) {
                status = "Pass";
              } else if (["fail", "present", "positive", "not ok", "no", "turbid"].includes(lowerVal)) {
                status = "Fail";
              }
              break;
            case "Not Detected":
              if (newValue.toLowerCase().includes("not detected") || newValue.toLowerCase() === "nd" || newValue.toLowerCase() === "absent") {
                status = "Pass";
              } else {
                status = "Fail";
              }
              break;
            case "Text":
              status = newValue.length > 0 ? "Pass" : "Pending";
              break;
            default:
              // Fallback to original logic
              if (!isNaN(numValue)) {
                const isMinOk = p.min === null || numValue >= p.min;
                const isMaxOk = p.max === null || numValue <= p.max;
                status = isMinOk && isMaxOk ? "Pass" : "Fail";
              }
          }
        }
        return { ...p, value: newValue, status };
      }
      return p;
    });
    setLocalParams(updated);
    onUpdate(updated);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Pass":
        return <Badge className="bg-green-500/10 text-green-600 border-green-200 hover:bg-green-500/20"><Check className="w-3 h-3 mr-1" /> {isRtl ? "ناجح" : "Pass"}</Badge>;
      case "Fail":
        return <Badge variant="destructive" className="bg-red-500/10 text-red-600 border-red-200 hover:bg-red-500/20"><X className="w-3 h-3 mr-1" /> {isRtl ? "فاشل" : "Fail"}</Badge>;
      default:
        return <Badge variant="secondary" className="bg-gray-100 text-gray-500 border-gray-200"><AlertCircle className="w-3 h-3 mr-1" /> {isRtl ? "قيد الانتظار" : "Pending"}</Badge>;
    }
  };

  return (
    <div className="rounded-md border bg-muted/30 p-4">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="w-[200px]">{isRtl ? "المعلمة" : "Parameter"}</TableHead>
            <TableHead className="w-[150px]">{isRtl ? "القيمة" : "Value"}</TableHead>
            <TableHead className="w-[80px]">{isRtl ? "الوحدة" : "Unit"}</TableHead>
            <TableHead className="w-[150px]">{isRtl ? "نطاق المرجع" : "Ref. Range"}</TableHead>
            <TableHead className="text-right">{isRtl ? "الحالة" : "Status"}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {localParams.map((param) => (
            <TableRow key={param.id} className="hover:bg-transparent">
              <TableCell className="font-medium">{param.name}</TableCell>
              <TableCell>
                <Input
                  value={param.value}
                  onChange={(e) => handleValueChange(param.id, e.target.value)}
                  disabled={currentRole === 'client'}
                  className={`h-8 w-24 sm:w-32 ${param.status === 'Fail' ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                  placeholder="0.00"
                />
              </TableCell>
              <TableCell className="text-muted-foreground text-sm">{param.unit || "-"}</TableCell>
              <TableCell className="text-muted-foreground text-xs">
                {param.limitType === 'Pass / Fail' || param.limitType === 'Not Detected' || param.limitType === 'Text' || param.limitType === 'Exact Value' ? (
                  <span className="font-medium text-primary">{param.target || param.limitType}</span>
                ) : (param.min !== null && param.min !== "") || (param.max !== null && param.max !== "") ? (
                  <span>
                    {param.min !== null && param.min !== "" && param.max !== null && param.max !== "" ? `${param.min} - ${param.max}` : 
                     param.min !== null && param.min !== "" ? `≥ ${param.min}` : `≤ ${param.max}`}
                  </span>
                ) : "-"}
              </TableCell>
              <TableCell className="text-right">
                {getStatusBadge(param.status)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
