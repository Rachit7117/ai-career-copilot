import { cn, STATUS_LABELS, STATUS_COLORS } from "@/lib/utils";
import type { ApplicationStatus } from "@/lib/api";

export function StatusBadge({ status }: { status: ApplicationStatus }) {
  return (
    <span className={cn("inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium", STATUS_COLORS[status])}>
      {STATUS_LABELS[status]}
    </span>
  );
}
