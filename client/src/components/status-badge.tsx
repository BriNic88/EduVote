import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ElectionStatus, UserStatus } from "@shared/schema";

interface ElectionStatusBadgeProps {
  status: ElectionStatus;
}

export function ElectionStatusBadge({ status }: ElectionStatusBadgeProps) {
  const variants: Record<ElectionStatus, { className: string; label: string }> = {
    upcoming: {
      className: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800",
      label: "Upcoming",
    },
    live: {
      className: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800",
      label: "Live",
    },
    completed: {
      className: "bg-gray-100 text-gray-700 dark:bg-gray-800/50 dark:text-gray-400 border-gray-200 dark:border-gray-700",
      label: "Completed",
    },
  };

  const variant = variants[status];

  return (
    <Badge 
      variant="outline" 
      className={cn("font-medium", variant.className)}
      data-testid={`badge-election-status-${status}`}
    >
      {status === "live" && (
        <span className="w-2 h-2 rounded-full bg-green-500 mr-1.5 animate-pulse" />
      )}
      {variant.label}
    </Badge>
  );
}

interface UserStatusBadgeProps {
  status: UserStatus;
}

export function UserStatusBadge({ status }: UserStatusBadgeProps) {
  const variants: Record<UserStatus, { className: string; label: string }> = {
    pending: {
      className: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800",
      label: "Pending",
    },
    approved: {
      className: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800",
      label: "Approved",
    },
    blocked: {
      className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800",
      label: "Blocked",
    },
  };

  const variant = variants[status];

  return (
    <Badge 
      variant="outline" 
      className={cn("font-medium", variant.className)}
      data-testid={`badge-user-status-${status}`}
    >
      {variant.label}
    </Badge>
  );
}
