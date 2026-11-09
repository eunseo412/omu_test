/**
 * 대여 거래 상태 머신.
 * 웹·앱·서버(DB 트리거/엣지 함수)가 같은 규칙을 쓰도록 여기서만 정의한다.
 *
 * requested ─┬─> accepted ──> handed_over ──> returned ─┬─> completed
 *            ├─> rejected                               └─> disputed ──> completed
 *            └─> cancelled (accepted에서도 인도 전이면 취소 가능)
 */
export const RENTAL_STATUSES = [
  "requested", // 대여자가 신청
  "accepted", // 옷장 주인이 수락 (보증금·결제 안내 단계)
  "rejected", // 옷장 주인이 거절
  "cancelled", // 인도 전 취소
  "handed_over", // 옷 전달 완료 (대면/택배) → 대여 중
  "returned", // 대여자가 반납 처리 → 주인 확인 대기
  "disputed", // 주인이 반납 승인 거부 (파손·오염·미반납)
  "completed", // 주인이 반납 승인 → 거래 종료, 상호 평가 가능
] as const;

export type RentalStatus = (typeof RENTAL_STATUSES)[number];
export type RentalActor = "owner" | "renter" | "admin";

type Transition = { to: RentalStatus; by: RentalActor[] };

export const RENTAL_TRANSITIONS: Record<RentalStatus, Transition[]> = {
  requested: [
    { to: "accepted", by: ["owner"] },
    { to: "rejected", by: ["owner"] },
    { to: "cancelled", by: ["renter", "owner"] },
  ],
  accepted: [
    { to: "handed_over", by: ["owner"] },
    { to: "cancelled", by: ["renter", "owner"] },
  ],
  handed_over: [{ to: "returned", by: ["renter", "owner"] }],
  returned: [
    { to: "completed", by: ["owner"] },
    { to: "disputed", by: ["owner"] },
  ],
  disputed: [{ to: "completed", by: ["admin"] }],
  rejected: [],
  cancelled: [],
  completed: [],
};

export function canTransition(from: RentalStatus, to: RentalStatus, actor: RentalActor): boolean {
  return RENTAL_TRANSITIONS[from].some((t) => t.to === to && t.by.includes(actor));
}

export function isTerminal(status: RentalStatus): boolean {
  return RENTAL_TRANSITIONS[status].length === 0;
}

/** 대여 요금 계산. 가격 정책은 베타 동안 판매자 자율이므로 단순히 일당 × 일수. */
export function rentalDays(startDate: string, endDate: string): number {
  const ms = Date.parse(endDate) - Date.parse(startDate);
  if (Number.isNaN(ms) || ms < 0) throw new Error("invalid rental period");
  return Math.floor(ms / 86_400_000) + 1; // 시작일·종료일 모두 포함
}

export function rentalFee(pricePerDay: number, startDate: string, endDate: string): number {
  return pricePerDay * rentalDays(startDate, endDate);
}

export const RENTAL_STATUS_LABELS: Record<RentalStatus, string> = {
  requested: "수락 대기",
  accepted: "전달 대기",
  rejected: "거절됨",
  cancelled: "취소됨",
  handed_over: "대여 중",
  returned: "반납 확인 대기",
  disputed: "문제 확인 중",
  completed: "완료",
};

/** 이 사람이 지금 할 수 있는 상태 변경 목록 */
export function availableTransitions(status: RentalStatus, actor: RentalActor): RentalStatus[] {
  return RENTAL_TRANSITIONS[status].filter((t) => t.by.includes(actor)).map((t) => t.to);
}

/** 상대를 기다리는 게 아니라 '내가' 다음 행동을 해야 하는 상태인지 (취소는 제외) */
export function isMyTurn(status: RentalStatus, actor: RentalActor): boolean {
  return availableTransitions(status, actor).some((s) => s !== "cancelled");
}

export function rangesOverlap(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  return aStart <= bEnd && bStart <= aEnd; // YYYY-MM-DD 문자열 비교
}

/** 한국 시간 기준 오늘 (YYYY-MM-DD) */
export function todayKST(now: Date = new Date()): string {
  return now.toLocaleDateString("sv-SE", { timeZone: "Asia/Seoul" });
}

export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
