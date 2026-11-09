import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { SUPABASE_ANON_KEY, SUPABASE_URL, hasSupabase } from "@/lib/env";

const PROTECTED = ["/closet", "/rentals", "/me", "/notifications"];

export async function updateSession(request: NextRequest) {
  // 인증 메일/OAuth가 /auth/callback이 아닌 곳(예: Site URL 루트 "/?code=...")으로
  // 돌아온 경우에도 로그인이 완료되도록 콜백으로 넘긴다.
  // (Supabase Redirect URLs에 없는 주소로 요청하면 Site URL로 대체되어 이렇게 된다)
  const { pathname, searchParams } = request.nextUrl;
  if (pathname !== "/auth/callback" && (searchParams.has("code") || searchParams.has("token_hash"))) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth/callback";
    if (!url.searchParams.has("next")) url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  let response = NextResponse.next({ request });
  if (!hasSupabase()) return response; // env 미설정 시 UI 개발만 가능하게

  const supabase = createServerClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (list) => {
          list.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          list.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    },
  );

  const { data: { user } } = await supabase.auth.getUser();
  const path = request.nextUrl.pathname;
  if (!user && PROTECTED.some((p) => path === p || path.startsWith(p + "/"))) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", path);
    return NextResponse.redirect(url);
  }
  return response;
}
