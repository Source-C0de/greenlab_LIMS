import { CheckCircle2, Circle, Clock, AlertCircle } from "lucide-react";

interface TimelineStep {
  label: string;
  status: "completed" | "current" | "pending" | "error";
  date?: string;
  actor?: string;
}

interface SampleTimelineProps {
  steps: TimelineStep[];
}

export function SampleTimeline({ steps }: SampleTimelineProps) {
  return (
    <div className="space-y-4">
      {steps.map((step, index) => {
        const isLast = index === steps.length - 1;
        
        let Icon = Circle;
        let colorClass = "text-muted-foreground";
        let bgClass = "bg-muted";

        if (step.status === "completed") {
          Icon = CheckCircle2;
          colorClass = "text-primary";
          bgClass = "bg-primary";
        } else if (step.status === "current") {
          Icon = Clock;
          colorClass = "text-amber-500";
          bgClass = "bg-muted";
        } else if (step.status === "error") {
          Icon = AlertCircle;
          colorClass = "text-destructive";
          bgClass = "bg-muted";
        }

        return (
          <div key={index} className="flex gap-4">
            <div className="flex flex-col items-center">
              <div className={`rounded-full bg-background relative z-10`}>
                <Icon className={`h-5 w-5 ${colorClass}`} />
              </div>
              {!isLast && <div className={`w-0.5 h-full min-h-[40px] ${bgClass} my-1`} />}
            </div>
            <div className="pb-6 pt-0.5">
              <p className={`text-sm font-medium ${step.status === 'pending' ? 'text-muted-foreground' : 'text-foreground'}`}>
                {step.label}
              </p>
              {step.date && (
                <p className="text-xs text-muted-foreground mt-1">
                  {step.date} {step.actor && `• ${step.actor}`}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
