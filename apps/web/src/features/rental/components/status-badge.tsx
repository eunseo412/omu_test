import { RENTAL_STATUS_LABELS, type RentalStatus } from "@omu/core";

// 흑백 테마: 확인이 필요한 상태는 검정, 진행 중은 진회색 글자, 끝난 상태는 흐리게
const TONE: Record<RentalStatus, string> = {
  requested: "bg-neutral-900 text-white",
  returned: "bg-neutral-900 text-white",
  disputed: "bg-point text-white",
  accepted: "bg-surface text-neutral-900",
  handed_over: "bg-surface text-neutral-900",
  completed: "bg-surface text-muted",
  rejected: "bg-surface text-muted line-through",
  cancelled: "bg-surface text-muted line-through",
};

export function StatusBadge({ status }: { status: RentalStatus }) {
  return <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${TONE[status]}`}>{RENTAL_STATUS_LABELS[status]}</span>;
}
