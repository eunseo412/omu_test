# 아키텍처 (베타 → 확장)

## 기술 스택과 선택 이유
| 영역 | 선택 | 이유 |
|---|---|---|
| 웹 | Next.js 15 + TypeScript + Tailwind v4 | SSR/SEO(프로필·옷장 공유 링크), Vercel 배포 간단 |
| 앱처럼 쓰기 | PWA (manifest, standalone, safe-area) | 설치 없이 홈 화면 추가. 베타 배포 속도 |
| 백엔드 | Supabase (Postgres, Auth, Storage, Realtime) | 서버 없이 인증·DB·이미지·채팅. 2~3인 팀에 적합 |
| 공유 로직 | `packages/core` (TS + zod) | 이후 Expo 앱이 그대로 재사용 |
| 모노레포 | pnpm workspace + Turborepo | `apps/mobile` 추가만으로 앱 확장 |
| 배포 | Vercel (web), Supabase Cloud | 무료 티어로 베타 운영 가능 |

## 확장 로드맵
1. **베타 (지금)**: 가입 → 프로필(추구미·사이즈) → 옷 등록 → 대여 신청/수락 → 대면 인도 → 반납 승인 → 상호 평가.
   결제·보증금은 `payments` 테이블에 **수동 기록**(계좌이체 등)으로 시작하고 데이터만 쌓는다.
2. **결제 연동**: PortOne(V2)으로 대여료 결제. 보증금 '카드 홀드'는 PG 지원 범위·전자금융거래법 검토 후 결정
   (대안: 빌링키 등록 후 파손 시에만 청구). `payments.provider`로 확장.
3. **네이티브 앱**: `apps/mobile` (Expo + Expo Router). `@omu/core` 공유, Supabase JS 그대로 사용, 푸시 알림.
4. **구독 채널·중고판매**: `channels`, `subscriptions` 테이블 추가, `items.for_sale` 활용.

## 데이터 모델 요약
- `profiles` 사람(추구미 태그, 체형, 신뢰도 온도) ← `follows`
- `items` 옷장 아이템 + `item_images`, `looks`(착장) + `look_items`
- `rentals` 거래(가격 스냅샷) + `rental_events`(상태 이력, 인도·반납 사진) + `messages`(채팅)
- `payments` 결제/보증금 기록, `reviews` 상호 평가

## 대여 상태 머신
```
requested ─┬─> accepted ──> handed_over ──> returned ─┬─> completed
           ├─> rejected                               └─> disputed ──(관리자)──> completed
           └─> cancelled  (accepted에서도 인도 전이면 취소 가능)
```

## 베타 지표 (rental_events로 계산)
신청→수락 전환율, 수락→완료율, 평균 대여 기간·가격(카테고리별), 재대여율, 반납 지연률, 분쟁률.

## 신뢰도 온도 (core/trust.ts ↔ SQL 동일 규칙)
- 거래 완료: 양쪽 +0.1 (트리거 `rental_completed_trust`)
- 상호 평가: (평균 별점 − 3) × 0.2 → 상대에게 (`submit_review`)
- 반납 지연·귀책 분쟁 감점은 운영 기준이 정해지면 추가

## 운영 (베타)
- 분쟁(`disputed`) 해결: 관리자가 SQL로 `update rentals set status='completed'` 후 `rental_events`에 기록
- 결제·보증금은 앱 밖에서 직접 주고받음 (`payments` 테이블은 PG 연동 시 사용)

## TODO
- 알림 (새 신청·수락·채팅) — 웹 푸시 또는 카카오 알림톡
- 반납 지연 자동 감점, 관리자 분쟁 처리 화면
- Supabase 타입 생성 (`supabase gen types typescript`) → `packages/core` 또는 `packages/db`
- 이용약관·개인정보처리방침·통신판매중개 고지
