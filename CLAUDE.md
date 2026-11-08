# O:MU (오늘의 mood)

추구미를 가진 '사람'을 팔로우하고 그 사람의 옷장에서 옷을 빌리는 P2P 패션 대여 플랫폼.
현재 단계: **KENTECH 교내 베타 검증** (모바일 웹/PWA). 이후 Expo 네이티브 앱 추가 예정.

## 구조
- `apps/web` — Next.js 15 App Router, Tailwind v4, PWA. 모바일 우선(최대 폭 480px).
- `packages/core` — 웹·앱 공유 도메인 로직: 대여 상태 머신, zod 스키마, 신뢰도 온도. **UI·Supabase 의존 금지.**
- `supabase/migrations` — DB 스키마, RLS, RPC. 스키마 변경은 항상 새 마이그레이션 파일로.
- `docs/` — 아키텍처, 결정 기록.

## 명령어
- `pnpm dev` / `pnpm build` / `pnpm lint` / `pnpm typecheck` / `pnpm test`
- 작업 후 반드시 `pnpm typecheck && pnpm test` 통과 확인.

## 규칙
- 대여 상태 전이 규칙은 `packages/core/src/rental.ts`와 `transition_rental` RPC(SQL) 두 곳에 있다. **한쪽을 바꾸면 다른 쪽도 같이 바꾸고 테스트 추가.**
- 거래(rentals) 생성·상태 변경은 클라이언트에서 직접 insert/update 하지 말고 RPC(`request_rental`, `transition_rental`)만 사용. 금액은 서버에서 계산.
- 모든 새 테이블은 RLS를 켜고 정책을 작성.
- `SUPABASE_SERVICE_ROLE_KEY`는 서버 코드에서만. 클라이언트 번들에 들어가면 안 됨.
- 기능 코드는 `apps/web/src/features/<도메인>/`에 (components, actions.ts, queries.ts). `app/`의 page는 얇게 유지.
- 화면은 모바일 기준으로 만들고 하단 탭/safe-area(`pb-safe`, `pt-safe`)를 고려.
- UI 문구는 한국어.
