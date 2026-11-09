# O:MU — 오늘의 mood

추구미를 가진 사람의 옷장에서 옷을 빌려 입는 P2P 패션 대여 플랫폼 (베타: 모바일 웹/PWA)

## 실행

```bash
pnpm install
cp .env.example apps/web/.env.local   # 아래 Supabase 값 입력
pnpm dev                               # http://localhost:3000
```

Supabase 환경변수가 없으면 **샘플 데이터**로 화면이 표시됩니다. 연결 후 옷이 등록되면 실제 사진으로 바뀝니다.

## Supabase 설정

1. [supabase.com](https://supabase.com)에서 프로젝트 생성 → Project Settings › API 에서
   `Project URL`, `anon public` 키를 `apps/web/.env.local`에 입력
2. SQL Editor에서 `supabase/migrations/` 폴더의 SQL 파일을 **날짜 순서대로** 실행
   - `20261108000000_init.sql` (테이블·RLS·RPC·스토리지 버킷)
   - `20261109000000_rental_flow.sql` (대여 흐름·평가·신뢰도·채팅 실시간)
   - `20261110000000_notifications.sql` (알림·푸시 구독)
   - 새 파일이 추가되면 그 파일만 추가로 실행하면 됩니다.
3. Authentication › URL Configuration
   - Site URL: `http://localhost:3000` (배포 후 Vercel 주소로 변경)
   - Redirect URLs: 접속하는 **모든 주소**를 등록해야 합니다. 여기 없는 주소에서 로그인하면 Site URL로 돌아가
     다른 컴퓨터에서는 `localhost 연결 거부` 에러가 납니다.
     - `http://localhost:3000/**`
     - 같은 와이파이의 다른 기기에서 접속: `http://<내 PC IP>:3000/**` (예: `http://192.168.0.12:3000/**`)
     - Vercel 배포: `https://<프로젝트>.vercel.app/**`, 미리보기 배포까지 허용하려면 `https://*-<팀>.vercel.app/**`

### 알림
- **앱 안 알림**은 SQL만 실행하면 바로 동작합니다 (종 아이콘·알림 목록, 실시간 배지).
- **휴대폰 푸시 알림**은 아래 환경변수가 필요합니다. 로컬은 `apps/web/.env.local`, 배포는 Vercel › Settings › Environment Variables.
  1. 키 생성: `pnpm vapid` → 출력된 Public Key / Private Key 사용
  2. 환경변수 추가
     | 이름 | 값 |
     |---|---|
     | `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Public Key |
     | `VAPID_PRIVATE_KEY` | Private Key (공개 금지) |
     | `VAPID_SUBJECT` | `mailto:연락받을이메일` |
     | `SUPABASE_SERVICE_ROLE_KEY` | Supabase Secret key (공개 금지) |
  3. Vercel은 환경변수를 바꾼 뒤 **Redeploy** 해야 반영됩니다.
- 휴대폰에서 알림 탭(또는 MY)의 **알림 켜기**를 누르면 그 기기로 알림이 옵니다.
  아이폰은 Safari에서 **홈 화면에 추가**한 앱에서만 켤 수 있어요 (iOS 16.4+).

### 이메일 인증 로그인 (설정 없이 바로 동작)
Supabase에 기본으로 켜져 있습니다. 메일의 **링크**를 누르거나 **인증 코드**를 입력하면 로그인되고, 처음 쓰는 이메일은 자동 가입됩니다.

**메일 템플릿 설정 (필수)** — Authentication › Emails › Templates 에서 **Magic Link**와 **Confirm signup** 본문을 아래로 바꾸세요.
기본 템플릿 링크는 "요청한 브라우저"에서만 열려서, Gmail 앱 등에서 누르면 로그인이 실패합니다.
아래 링크(token_hash 방식)는 어느 브라우저에서 열어도 되고, 인증 코드도 함께 보여줍니다.

```html
<h2>O:MU 로그인</h2>
<p>아래 버튼을 누르거나, 앱에 인증 코드를 입력하세요.</p>
<p><a href="{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=email&next=/">로그인하기</a></p>
<p>인증 코드: <strong>{{ .Token }}</strong></p>
<p>요청하지 않았다면 이 메일을 무시하세요.</p>
```

> `{{ .SiteURL }}`은 URL Configuration의 Site URL(배포 주소)입니다. Site URL이 Vercel 주소인지 확인하세요.

> 기본 메일 발송은 시간당 몇 통으로 제한됩니다. 베타 사용자에게 배포하기 전에 Authentication › Emails › SMTP Settings에서
> Resend 등 외부 SMTP를 연결하세요.

### 카카오 로그인
1. [developers.kakao.com](https://developers.kakao.com) › 내 애플리케이션 › 앱 생성
2. 앱 설정 › 플랫폼 › Web 사이트 도메인에 `http://localhost:3000` 등록
3. 카카오 로그인 활성화, Redirect URI에 `https://<프로젝트ID>.supabase.co/auth/v1/callback` 등록
4. 동의항목: 닉네임, 프로필 사진 (이메일은 비즈앱 전환 후 가능)
5. 보안 › Client Secret 생성·활성화
6. Supabase › Authentication › Providers › Kakao: REST API 키(Client ID)와 Client Secret 입력

### Google 로그인 (Gmail)
1. [Google Cloud Console](https://console.cloud.google.com) › API 및 서비스 › OAuth 동의 화면 구성
2. 사용자 인증 정보 › OAuth 클라이언트 ID (웹 애플리케이션)
   - 승인된 리디렉션 URI: `https://<프로젝트ID>.supabase.co/auth/v1/callback`
3. Supabase › Authentication › Providers › Google: Client ID / Secret 입력

## 구조
자세한 구조는 [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md), 개발 규칙은 [CLAUDE.md](CLAUDE.md).
