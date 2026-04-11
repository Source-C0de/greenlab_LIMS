import { mockSamples } from "@/mock-data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, AlertCircle } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const columns = [
  { id: "Received", title: "Received & Logged" },
  { id: "Assigned", title: "Assigned to Analyst" },
  { id: "Testing", title: "Testing in Progress" },
  { id: "Review", title: "Pending Review" },
  { id: "Approved", title: "Approved / Final" },
];

export default function WorkflowBoard() {
  
  // Distribute samples into columns based on status
  // Mock logic to handle 'Assigned' column which isn't explicitly a status in our mock data
  const getColumnForSample = (sample: any) => {
    if (sample.status === 'Received') {
      return sample.assignedAnalyst ? 'Assigned' : 'Received';
    }
    return sample.status;
  };

  return (
    <div className="space-y-6 h-full flex flex-col">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Laboratory Workflow</h1>
        <p className="text-muted-foreground mt-1">Kanban view of all active samples</p>
      </div>

      <div className="flex-1 flex gap-4 overflow-x-auto pb-4 min-h-[600px]">
        {columns.map(col => {
          const columnSamples = mockSamples.filter(s => getColumnForSample(s) === col.id);
          
          return (
            <div key={col.id} className="w-80 shrink-0 flex flex-col bg-muted/30 rounded-lg border border-border/50">
              <div className="p-3 border-b border-border/50 flex justify-between items-center bg-card rounded-t-lg">
                <h3 className="font-medium text-sm">{col.title}</h3>
                <Badge variant="secondary" className="px-1.5 py-0.5 text-xs">{columnSamples.length}</Badge>
              </div>
              
              <div className="p-3 flex-1 overflow-y-auto space-y-3">
                {columnSamples.map(sample => (
                  <Card key={sample.id} className="cursor-grab active:cursor-grabbing hover:border-primary/50 transition-colors shadow-sm">
                    <CardContent className="p-3">
                      <div className="flex justify-between items-start mb-2">
                        <span className="font-mono text-xs font-bold text-primary">{sample.id}</span>
                        {sample.priority === 'Urgent' && (
                          <AlertCircle className="h-3.5 w-3.5 text-destructive" />
                        )}
                        {sample.priority === 'High' && (
                          <AlertCircle className="h-3.5 w-3.5 text-amber-500" />
                        )}
                      </div>
                      <p className="text-sm font-medium mb-1 line-clamp-2" title={sample.description}>
                        {sample.description}
                      </p>
                      <p className="text-xs text-muted-foreground mb-3 truncate">
                        {sample.clientName}
                      </p>
                      
                      <div className="flex justify-between items-center mt-auto pt-2 border-t border-border/50">
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-normal">
                          {sample.sampleType}
                        </Badge>
                        
                        {sample.assignedAnalyst ? (
                          <Avatar className="h-6 w-6">
                            <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                              {sample.assignedAnalyst.split(' ').map((n: string) => n[0]).join('')}
                            </AvatarFallback>
                          </Avatar>
                        ) : (
                          <div className="text-xs text-muted-foreground flex items-center">
                            <Clock className="h-3 w-3 mr-1" /> Unassigned
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
                
                {columnSamples.length === 0 && (
                  <div className="h-24 border-2 border-dashed border-border rounded-lg flex items-center justify-center text-muted-foreground text-sm">
                    Drop here
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
