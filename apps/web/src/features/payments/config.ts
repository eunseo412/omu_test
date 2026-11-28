/**
 * 사후 자동결제 설정.
 * 실제 PG(예: PortOne 빌링키) 연동 전까지는 false → 화면에는 '준비 중', 대여료는 베타처럼 직접 주고받는다.
 * 연동 후 NEXT_PUBLIC_PAYMENTS_LIVE=true
 */
export const PAYMENTS_LIVE = process.env.NEXT_PUBLIC_PAYMENTS_LIVE === "true";

export type PaymentMethod = { id: string; brand: string | null; last4: string | null; isDefault: boolean };

export type PaymentStatus = "none" | "scheduled" | "charged" | "failed" | "waived";

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  none: "직접 정산 (베타)",
  scheduled: "반납 완료 · 자동결제 예정",
  charged: "결제 완료",
  failed: "결제 실패 · 결제수단 확인 필요",
  waived: "결제 없음",
};

export const cardLabel = (m: PaymentMethod) => `${m.brand ?? "카드"} •• ${m.last4 ?? "****"}`;
