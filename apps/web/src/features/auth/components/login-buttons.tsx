"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Provider = "kakao" | "google";

export function LoginButtons({ next = "/" }: { next?: string }) {
  const [loading, setLoading] = useState<Provider | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function signIn(provider: Provider) {
    setError(null);
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      setError("Supabase 환경변수가 설정되지 않았습니다 (.env.local)");
      return;
    }
    setLoading(provider);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
        // 카카오: 비즈앱 전환 전에는 이메일 동의항목을 받을 수 없어 닉네임·프로필만 요청
        scopes: provider === "kakao" ? "profile_nickname profile_image" : undefined,
        queryParams: provider === "google" ? { prompt: "select_account" } : undefined,
      },
    });
    if (error) {
      setError(error.message);
      setLoading(null);
    }
  }

  return (
    <div className="space-y-2.5">
      <button
        onClick={() => signIn("kakao")}
        disabled={loading !== null}
        className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#FEE500] text-[15px] font-semibold text-black/85 disabled:opacity-60"
      >
        <KakaoIcon />
        {loading === "kakao" ? "이동 중…" : "카카오로 시작하기"}
      </button>
      <button
        onClick={() => signIn("google")}
        disabled={loading !== null}
        className="flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-neutral-300 bg-white text-[15px] font-semibold disabled:opacity-60"
      >
        <GoogleIcon />
        {loading === "google" ? "이동 중…" : "Google로 시작하기"}
      </button>
      {error && <p className="text-center text-[13px] text-red-600">{error}</p>}
    </div>
  );
}

function KakaoIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
      <path fill="currentColor" d="M12 3C6.48 3 2 6.58 2 11c0 2.85 1.86 5.35 4.66 6.77l-.95 3.48c-.08.3.26.54.52.37l4.13-2.74c.54.07 1.09.12 1.64.12 5.52 0 10-3.58 10-8S17.52 3 12 3z" />
    </svg>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  );
}
