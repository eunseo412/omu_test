import { NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

/**
 * 로그인 리다이렉트 처리
 * - ?token_hash=...&type=...  : 메일 템플릿이 token_hash 방식일 때 (권장: 어느 브라우저에서 열어도 동작)
 * - ?code=...                 : OAuth(카카오/구글) 또는 기본 메일 링크(PKCE: 요청한 브라우저에서만 동작)
 *
 * 실패하면 /login?error=<원인> 으로 보내 사용자에게 맞는 안내를 보여준다.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = searchParams.get("next") ?? "/";
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/";

  const supabase = await createClient();
  let reason = "unknown";

  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
    if (!error) return NextResponse.redirect(`${origin}${safeNext}`);
    reason = "expired";
    console.warn("[auth/callback] verifyOtp 실패:", error.code, error.message);
  } else if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${safeNext}`);
    const msg = `${error.code ?? ""} ${error.message}`.toLowerCase();
    // 다른 브라우저/메일 앱 내 브라우저에서 링크를 연 경우: 이 브라우저에 code verifier 쿠키가 없다
    reason = msg.includes("verifier") || msg.includes("flow_state") ? "browser" : msg.includes("expired") ? "expired" : "unknown";
    console.warn("[auth/callback] exchangeCodeForSession 실패:", error.code, error.message);
  }

  // 링크를 두 번 누른 경우 등: 이미 로그인돼 있으면 그대로 진행
  const { data: { user } } = await supabase.auth.getUser();
  if (user) return NextResponse.redirect(`${origin}${safeNext}`);

  return NextResponse.redirect(`${origin}/login?error=${reason}&next=${encodeURIComponent(safeNext)}`);
}
