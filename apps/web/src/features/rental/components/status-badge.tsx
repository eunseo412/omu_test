import { RENTAL_STATUS_LABELS, type RentalStatus } from "@omu/core";

const TONE: Record<RentalStatus, string> = {
  requested: "bg-amber-50 text-amber-700",
  accepted: "bg-sky-50 text-sky-700",
  handed_over: "bg-violet-50 text-violet-700",
  returned: "bg-amber-50 text-amber-700",
  disputed: "bg-red-50 text-red-700",
  completed: "bg-emerald-50 text-emerald-700",
  rejected: "bg-neutral-100 text-neutral-500",
  cancelled: "bg-neutral-100 text-neutral-500",
};

export function StatusBadge({ status }: { status: RentalStatus }) {
  return <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${TONE[status]}`}>{RENTAL_STATUS_LABELS[status]}</span>;
}
