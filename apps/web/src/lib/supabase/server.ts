import { cache } from "react";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "@/lib/env";

/** 요청 하나 안에서는 같은 클라이언트를 재사용 (React cache) */
export const createClient = cache(async () => {
  const cookieStore = await cookies();
  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (list) => {
        try {
          list.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Server Component에서 호출된 경우: middleware가 세션을 갱신하므로 무시
        }
      },
    },
  });
});

export type AuthUser = { id: string; email: string | null };

/**
 * 로그인 사용자. 요청당 한 번만 확인하고(React cache), 가능하면 Auth 서버에 묻지 않고
 * 토큰 서명을 직접 검증한다(getClaims). 데이터 접근 권한은 어차피 DB(RLS)가 다시 확인한다.
 */
export const getAuthUser = cache(async (): Promise<AuthUser | null> => {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (error || !claims?.sub) return null;
  return { id: claims.sub, email: (claims.email as string | undefined) ?? null };
});
