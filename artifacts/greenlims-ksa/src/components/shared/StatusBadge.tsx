import { Badge } from "@/components/ui/badge";

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export function StatusBadge({ status, className = "" }: StatusBadgeProps) {
  let variant: "default" | "secondary" | "destructive" | "outline" = "default";
  let colorClass = "";

  switch (status.toLowerCase()) {
    case "approved":
    case "paid":
    case "ok":
    case "active":
    case "final":
      colorClass = "bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/30 hover:bg-green-500/25";
      break;
    case "testing":
    case "pending":
    case "low stock":
    case "trial":
      colorClass = "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30 hover:bg-amber-500/25";
      break;
    case "review":
      colorClass = "bg-purple-500/15 text-purple-700 dark:text-purple-400 border-purple-500/30 hover:bg-purple-500/25";
      break;
    case "received":
    case "draft":
      colorClass = "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30 hover:bg-blue-500/25";
      break;
    case "rejected":
    case "overdue":
    case "expired":
      colorClass = "bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/30 hover:bg-red-500/25";
      variant = "destructive";
      break;
    default:
      variant = "outline";
  }

  return (
    <Badge variant={variant} className={`${colorClass} ${className}`}>
      {status}
    </Badge>
  );
}
