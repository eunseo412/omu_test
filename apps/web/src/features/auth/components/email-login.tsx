"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { hasSupabase } from "@/lib/env";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const RESEND_SECONDS = 60;

function friendlyError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("rate limit") || m.includes("security purposes"))
    return "메일을 너무 자주 요청했어요. 잠시 후 다시 시도해 주세요.";
  if (m.includes("expired") || m.includes("invalid")) return "코드가 올바르지 않거나 만료됐어요. 다시 확인해 주세요.";
  if (m.includes("signups not allowed")) return "현재 신규 가입이 막혀 있어요. (Supabase 설정 확인)";
  return message;
}

/**
 * 이메일 인증 로그인 (비밀번호 없음).
 * 메일로 온 링크를 누르거나, 메일의 인증 코드를 입력하면 로그인된다.
 * 처음 쓰는 이메일이면 자동으로 가입된다.
 */
export function EmailLogin({ next = "/" }: { next?: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  function startCooldown() {
    setCooldown(RESEND_SECONDS);
    const t = setInterval(() => {
      setCooldown((s) => {
        if (s <= 1) clearInterval(t);
        return s - 1;
      });
    }, 1000);
  }

  async function sendEmail(target: string) {
    setError(null);
    if (!hasSupabase()) return setError("Supabase 환경변수가 설정되지 않았습니다 (.env.local)");
    if (!EMAIL_RE.test(target)) return setError("이메일 주소를 확인해 주세요.");
    setBusy(true);
    const { error } = await createClient().auth.signInWithOtp({
      email: target,
      options: {
        shouldCreateUser: true,
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });
    setBusy(false);
    if (error) return setError(friendlyError(error.message));
    setSentTo(target);
    setCode("");
    startCooldown();
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    if (!sentTo) return;
    setError(null);
    setBusy(true);
    const { error } = await createClient().auth.verifyOtp({ email: sentTo, token: code, type: "email" });
    if (error) {
      setBusy(false);
      return setError(friendlyError(error.message));
    }
    router.replace(next);
    router.refresh();
  }

  if (!sentTo) {
    return (
      <form
        onSubmit={(e) => {
          e.preventDefault();
          sendEmail(email.trim().toLowerCase());
        }}
        className="space-y-2.5"
      >
        <input
          type="email"
          inputMode="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="이메일 주소 (예: name@gmail.com)"
          className="h-12 w-full rounded-xl border border-neutral-300 bg-white px-3.5 text-[15px] outline-none placeholder:text-neutral-400 focus:border-neutral-900"
        />
        <button
          type="submit"
          disabled={busy || !email}
          className="h-12 w-full rounded-xl bg-neutral-900 text-[15px] font-semibold text-white disabled:opacity-50"
        >
          {busy ? "보내는 중…" : "이메일로 인증하기"}
        </button>
        {error && <p className="text-center text-[13px] text-red-600">{error}</p>}
      </form>
    );
  }

  return (
    <form onSubmit={verify} className="space-y-2.5">
      <div className="rounded-xl bg-white p-3.5 text-[13px] leading-relaxed text-neutral-600">
        <b className="text-neutral-900">{sentTo}</b>로 인증 메일을 보냈어요.
        <br />
        메일의 <b>링크를 누르거나</b>, 메일에 있는 <b>인증 코드</b>를 아래에 입력해 주세요.
        <br />
        <span className="text-neutral-400">메일이 안 보이면 스팸함도 확인해 주세요.</span>
      </div>
      <input
        inputMode="numeric"
        autoComplete="one-time-code"
        value={code}
        onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 10))}
        placeholder="인증 코드"
        className="h-12 w-full rounded-xl border border-neutral-300 bg-white px-3.5 text-center text-[18px] tracking-[0.3em] outline-none placeholder:text-[15px] placeholder:tracking-normal placeholder:text-neutral-400 focus:border-neutral-900"
      />
      <button
        type="submit"
        disabled={busy || code.length < 6}
        className="h-12 w-full rounded-xl bg-neutral-900 text-[15px] font-semibold text-white disabled:opacity-50"
      >
        {busy ? "확인 중…" : "확인"}
      </button>
      {error && <p className="text-center text-[13px] text-red-600">{error}</p>}
      <div className="flex justify-between px-1 text-[13px] text-neutral-500">
        <button type="button" onClick={() => { setSentTo(null); setError(null); }} className="underline">
          이메일 다시 입력
        </button>
        <button type="button" disabled={cooldown > 0 || busy} onClick={() => sendEmail(sentTo)} className="underline disabled:no-underline disabled:opacity-60">
          {cooldown > 0 ? `재전송 (${cooldown}초)` : "메일 다시 보내기"}
        </button>
      </div>
    </form>
  );
}
