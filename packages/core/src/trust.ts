/**
 * 신뢰도 온도 (기본 36.5℃). 베타 데이터로 가중치를 재설계할 예정이므로
 * 계산 로직을 이 파일 하나에 격리해 둔다.
 */
export const BASE_TEMPERATURE = 36.5;

export type TrustSignal =
  | { kind: "review"; avgScore: number } // 1~5
  | { kind: "completed" } // 정상 종료
  | { kind: "late_return"; days: number }
  | { kind: "disputed_at_fault" }; // 반납 미승인 귀책

export function applySignal(temp: number, s: TrustSignal): number {
  let next = temp;
  switch (s.kind) {
    case "review":
      next += (s.avgScore - 3) * 0.2;
      break;
    case "completed":
      next += 0.1;
      break;
    case "late_return":
      next -= Math.min(s.days, 7) * 0.3;
      break;
    case "disputed_at_fault":
      next -= 2;
      break;
  }
  return Math.round(Math.min(99, Math.max(0, next)) * 10) / 10;
}
