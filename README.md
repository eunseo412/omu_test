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
2. SQL Editor에서 `supabase/migrations/20261108000000_init.sql` 내용을 실행 (테이블·RLS·RPC·스토리지 버킷 생성)
3. Authentication › URL Configuration
   - Site URL: `http://localhost:3000` (배포 후 Vercel 주소로 변경)
   - Redirect URLs: `http://localhost:3000/auth/callback`, `https://<배포주소>/auth/callback`

### 이메일 인증 로그인 (설정 없이 바로 동작)
Supabase에 기본으로 켜져 있습니다. 메일의 **링크**를 누르거나 **인증 코드**를 입력하면 로그인되고, 처음 쓰는 이메일은 자동 가입됩니다.

메일에 인증 코드가 보이게 하려면 (권장: 휴대폰 메일 앱에서 링크를 열면 다른 브라우저로 열려 실패할 수 있음)
Authentication › Emails › Templates 에서 **Magic Link**와 **Confirm signup** 템플릿 본문에 아래를 추가하세요.

```html
<p>인증 코드: <strong>{{ .Token }}</strong></p>
```

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
