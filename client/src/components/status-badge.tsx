import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, Loader2, Clock } from "lucide-react";

interface StatusBadgeProps {
  status: "online" | "offline" | "checking" | "pending";
  showIcon?: boolean;
}

export function StatusBadge({ status, showIcon = true }: StatusBadgeProps) {
  const config = {
    online: {
      label: "Online",
      className: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
      icon: CheckCircle2,
    },
    offline: {
      label: "Offline",
      className: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
      icon: XCircle,
    },
    checking: {
      label: "Verificando...",
      className: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
      icon: Loader2,
    },
    pending: {
      label: "Aguardando",
      className: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
      icon: Clock,
    },
  };

  const { label, className, icon: Icon } = config[status];

  return (
    <Badge
      variant="secondary"
      className={`${className} gap-1 font-medium text-xs`}
      data-testid={`badge-status-${status}`}
    >
      {showIcon && (
        <Icon className={`w-3 h-3 ${status === "checking" ? "animate-spin" : ""}`} />
      )}
      <span>{label}</span>
    </Badge>
  );
}
