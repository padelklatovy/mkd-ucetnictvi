import { statusColors, statusLabels } from "@/lib/utils/labels";
import type { Enums } from "@/lib/types/database.types";

export function StatusBadge({ status }: { status: Enums<"document_status"> }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap ${statusColors[status]}`}
    >
      {statusLabels[status]}
    </span>
  );
}
