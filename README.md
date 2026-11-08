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
