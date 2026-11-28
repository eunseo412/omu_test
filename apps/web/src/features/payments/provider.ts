import "server-only";

/**
 * 결제 대행사(PG) 연결부 — 틀만. 실제 연동 시 이 인터페이스를 구현한다 (예: PortOne V2 빌링키).
 *
 * 흐름
 *  1) 결제수단 등록: 클라이언트에서 PG 창으로 카드 인증 → 서버가 빌링키 발급 확인 → payment_methods 에 저장(서비스 롤)
 *  2) 대여 신청: DB 트리거가 빌린 사람의 기본 결제수단을 거래에 연결 (선결제·보증금 없음)
 *  3) 반납 승인(거래 완료): DB 트리거가 payment_status = 'scheduled'
 *  4) 서버 작업(크론)이 scheduled 거래의 fee_total 을 빌링키로 결제 → charged / failed
 *  5) 분쟁에서 빌린 사람 귀책이 확인되면, 관리자가 보상 기준액(rentals.deposit) 안에서 추가 청구
 */
export interface PaymentProvider {
  /** 카드 인증 결과(PG가 준 값)로 빌링키를 확정하고 카드 정보 돌려주기 */
  confirmBillingKey(input: { userId: string; pgResult: unknown }): Promise<{ billingKey: string; brand: string; last4: string }>;
  /** 빌링키로 결제. orderId 는 같은 거래를 두 번 결제하지 않도록 거래 id 기반으로 */
  charge(input: { billingKey: string; amount: number; orderId: string; orderName: string }): Promise<{ ok: true; pgPaymentId: string } | { ok: false; reason: string }>;
  /** 빌링키 삭제 (결제수단 삭제 시) */
  revokeBillingKey(billingKey: string): Promise<void>;
}

/** 아직 연동 전: null → 호출하는 쪽에서 '준비 중' 처리 */
export function getPaymentProvider(): PaymentProvider | null {
  return null;
}
