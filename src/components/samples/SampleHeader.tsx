import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { 
  Printer, 
  Download, 
  FileEdit, 
  Plus, 
  UserPlus, 
  RefreshCw, 
  FileBarChart 
} from "lucide-react";
import { useAppContext } from "@/context/AppContext";

interface SampleHeaderProps {
  sample: {
    id: string;
    clientName: string;
    sampleType: string;
    status: string;
    priority: string;
    receivedDate: string;
  };
  onPrint?: () => void;
  onGenerateReport?: () => void;
  onAssignAnalyst?: () => void;
  onAddTest?: () => void;
}

export function SampleHeader({ 
  sample, 
  onPrint, 
  onGenerateReport, 
  onAssignAnalyst, 
  onAddTest 
}: SampleHeaderProps) {
  const { language, currentRole } = useAppContext();
  const isRtl = language === "ar";

  return (
    <div className="sticky top-0 z-20 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b pb-4 mb-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pt-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold tracking-tight font-mono">{sample.id}</h1>
            <StatusBadge status={sample.status} />
            <Badge 
              variant="outline" 
              className={sample.priority === 'High' || sample.priority === 'Urgent' ? 'text-red-600 border-red-200 bg-red-50' : ''}
            >
              {sample.priority} {isRtl ? "أولوية" : "Priority"}
            </Badge>
          </div>
          <div className="flex items-center gap-4 text-muted-foreground text-sm">
            <span><strong>{isRtl ? "العميل:" : "Client:"}</strong> {sample.clientName}</span>
            <span className="h-1 w-1 rounded-full bg-muted-foreground/30"></span>
            <span><strong>{isRtl ? "النوع:" : "Type:"}</strong> {sample.sampleType}</span>
            <span className="h-1 w-1 rounded-full bg-muted-foreground/30"></span>
            <span><strong>{isRtl ? "تاريخ الاستلام:" : "Received:"}</strong> {sample.receivedDate}</span>
          </div>
        </div>
        
        <div className="flex flex-wrap gap-2">
          {currentRole !== 'client' && (
            <>
              <Button variant="outline" size="sm" onClick={onAssignAnalyst}>
                <UserPlus className="mr-2 h-4 w-4" /> {isRtl ? "تعديل الفريق" : "Assign Technician"}
              </Button>
              <Button variant="outline" size="sm" onClick={onAddTest}>
                <Plus className="mr-2 h-4 w-4" /> {isRtl ? "إضافة اختبار" : "Add Test"}
              </Button>
              <Button variant="outline" size="sm">
                <RefreshCw className="mr-2 h-4 w-4" /> {isRtl ? "تغيير الحالة" : "Change Status"}
              </Button>
              <div className="h-8 w-px bg-border mx-1 hidden md:block"></div>
            </>
          )}
          {sample.status === 'Approved' ? (
            <Button size="sm" onClick={onGenerateReport}>
              <Download className="mr-2 h-4 w-4" /> {isRtl ? "تحميل التقرير" : "Download Report"}
            </Button>
          ) : (
            <Button size="sm" onClick={onGenerateReport}>
              <FileBarChart className="mr-2 h-4 w-4" /> {isRtl ? "إصدار التقرير" : "Generate Report"}
            </Button>
          )}
          <Button variant="ghost" size="icon" onClick={onPrint}>
            <Printer className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
