# O:MU — 오늘의 mood

```bash
pnpm install
cp .env.example apps/web/.env.local   # Supabase 키 입력
pnpm dev                               # http://localhost:3000
```

DB: Supabase 프로젝트를 만들고 `supabase/migrations/*.sql`을 적용하세요 (Supabase CLI `supabase db push` 또는 SQL Editor).
자세한 구조는 [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md), 개발 규칙은 [CLAUDE.md](CLAUDE.md).
