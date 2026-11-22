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

## 알림
- `rental_events`·`messages` INSERT 트리거 → 상대방 `notifications` 행 생성 (문구는 SQL 한 곳에서 관리)
  - 안 읽은 채팅 알림은 새로 만들지 않고 갱신 → 알림함 도배 방지
- 웹: 종 배지(Realtime) + `/notifications`. 거래 화면을 열면 그 거래 알림 자동 읽음
- 웹 푸시: 서버 액션 성공 후 `after()`에서 상대의 최신 알림을 `web-push`로 전송 (`features/notifications/push.ts`)
  - 상대의 구독 조회에 서비스 롤 키 사용, 만료 구독(404/410) 자동 삭제
  - VAPID/서비스 롤 키가 없으면 푸시만 건너뛰고 앱 안 알림은 그대로 동작

## mood archive (빌린 옷 수집)
- 거래 완료 트리거 → `mood_archive`에 빌린 사람 기준으로 저장. 옷이 나중에 수정·삭제돼도 남도록 이름·사진 경로·주인을 스냅샷
- 프로필 `옷장 | mood archive` 탭(공개), 카드 `/archive/[id]`: 다시 빌리기 · 옷장 팔로우 · 카드별 숨기기
- 완료 알림은 빌린 사람에게 'mood archive에 추가됐어요'로 바뀌고 카드로 연결
- 옷 사진 수정 시 아카이브가 쓰는 사진 파일은 지우지 않음 (`archived_paths`)
- **2단계(예정): OpenAI 이미지 모델로 일러스트 변환**
  - 그림체: 색연필 스케치 / 사람은 빼고 옷만 그리기
  - `illustration_status` pending → ready, 결과는 `archive` 버킷에 저장, 같은 옷은 일러스트 재사용으로 비용 절감
  - 실패 시 원래 사진 표시(지금 동작과 같음)

## 상태 기록 사진 (분쟁 증거)
- 전달(주인)·반납 직전: 앞면·뒷면·라벨 3컷 필수, 카메라 촬영만(10분 넘은 파일은 거부), 흠집 추가 사진 선택
- 사진 아래에 '거래 번호 · 서버 기준 촬영 시각 · 컷'을 새겨 저장, 찍는 즉시 업로드
- 빌린 사람이 '이 상태로 받았어요'를 눌러야 대여 시작(`received_at`), 다른 점은 사진·메모로 남김
- 반납 승인 화면에 전달 때 vs 반납 때 컷별 비교
- 상태 사진은 누구도 삭제 불가(Storage 정책), 거래 종료(`closed_at`) 30일 후 Cron이 삭제(`proofs_purged_at`)
- 분쟁 해결을 SQL로 할 때는 `closed_at = now()`도 함께 기록할 것

## TODO
- 반납일 하루 전 리마인더 (pg_cron 또는 Vercel Cron)
- 카카오 알림톡 (정식 서비스 단계)
- 반납 지연 자동 감점, 관리자 분쟁 처리 화면
- Supabase 타입 생성 (`supabase gen types typescript`) → `packages/core` 또는 `packages/db`
- 이용약관·개인정보처리방침·통신판매중개 고지
