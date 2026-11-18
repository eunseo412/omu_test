"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { hasSupabase } from "@/lib/env";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD = 6;

type Mode = "signin" | "signup";

function friendly(message: string, mode: Mode): string {
  const m = message.toLowerCase();
  if (m.includes("invalid login credentials")) return "이메일 또는 비밀번호가 맞지 않아요. 처음이라면 '회원가입'을 눌러주세요.";
  if (m.includes("already registered") || m.includes("already exists")) return "이미 가입된 이메일이에요. 로그인해 주세요.";
  if (m.includes("password should be") || m.includes("weak")) return `비밀번호는 ${MIN_PASSWORD}자 이상으로 정해주세요.`;
  if (m.includes("email not confirmed")) return "메일 인증이 아직 안 된 계정이에요. 아래 '비밀번호를 잊었어요'로 인증 메일 로그인을 해주세요.";
  if (m.includes("rate limit") || m.includes("too many") || m.includes("security purposes"))
    return "잠시 요청이 많았어요. 1분 뒤 다시 시도해 주세요.";
  if (m.includes("signups not allowed")) return "현재 신규 가입이 막혀 있어요. (Supabase 설정 확인)";
  return `${mode === "signup" ? "가입" : "로그인"}에 실패했어요. (${message})`;
}

/**
 * 이메일 + 비밀번호. 메일을 보내지 않으므로 Supabase 메일 발송 제한에 걸리지 않는다.
 * (Supabase › Authentication › Sign In / Providers › Email 의 'Confirm email'을 꺼야 가입 즉시 로그인된다)
 */
export function PasswordLogin({ next = "/" }: { next?: string }) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    if (!hasSupabase()) return setError("Supabase 환경변수가 설정되지 않았습니다 (.env.local)");
    const addr = email.trim().toLowerCase();
    if (!EMAIL_RE.test(addr)) return setError("이메일 주소를 확인해 주세요.");
    if (password.length < MIN_PASSWORD) return setError(`비밀번호는 ${MIN_PASSWORD}자 이상으로 정해주세요.`);

    setBusy(true);
    const supabase = createClient();
    if (mode === "signin") {
      const { error } = await supabase.auth.signInWithPassword({ email: addr, password });
      if (error) {
        setBusy(false);
        return setError(friendly(error.message, mode));
      }
      router.replace(next);
      router.refresh();
      return;
    }

    const { data, error } = await supabase.auth.signUp({
      email: addr,
      password,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=/me/edit` },
    });
    setBusy(false);
    if (error) {
      if (error.message.toLowerCase().includes("already registered")) setMode("signin");
      return setError(friendly(error.message, mode));
    }
    if (data.session) {
      // 가입 즉시 로그인 → 프로필(이름·아이디·추구미)부터 정하게
      router.replace("/me/edit");
      router.refresh();
      return;
    }
    // Confirm email이 켜져 있으면 세션 없이 인증 메일만 발송된다
    if (data.user && data.user.identities?.length === 0) {
      setMode("signin");
      return setError("이미 가입된 이메일이에요. 로그인해 주세요.");
    }
    setInfo("인증 메일을 보냈어요. 메일의 링크를 누르면 가입이 완료돼요.");
  }

  return (
    <form onSubmit={submit} className="space-y-2.5">
      <div className="grid grid-cols-2 rounded-xl bg-surface p-1 text-[14px] font-semibold">
        {(["signin", "signup"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => { setMode(m); setError(null); setInfo(null); }}
            aria-pressed={mode === m}
            className={`h-9 rounded-lg ${mode === m ? "bg-white text-neutral-900 shadow-sm" : "text-muted"}`}
          >
            {m === "signin" ? "로그인" : "회원가입"}
          </button>
        ))}
      </div>
      <input
        type="email"
        inputMode="email"
        autoComplete="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="이메일 주소"
        className="h-12 w-full rounded-xl bg-surface px-3.5 text-[15px] outline-none placeholder:text-muted focus:ring-2 focus:ring-neutral-900/10"
      />
      <div className="relative">
        <input
          type={show ? "text" : "password"}
          autoComplete={mode === "signin" ? "current-password" : "new-password"}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder={mode === "signup" ? `비밀번호 (${MIN_PASSWORD}자 이상)` : "비밀번호"}
          className="h-12 w-full rounded-xl bg-surface px-3.5 pr-11 text-[15px] outline-none placeholder:text-muted focus:ring-2 focus:ring-neutral-900/10"
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          aria-label={show ? "비밀번호 숨기기" : "비밀번호 보기"}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-muted"
        >
          {show ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
        </button>
      </div>
      <button
        type="submit"
        disabled={busy || !email || !password}
        className="h-12 w-full rounded-xl bg-neutral-900 text-[15px] font-semibold text-white disabled:opacity-40"
      >
        {busy ? "잠시만요…" : mode === "signin" ? "로그인" : "가입하고 시작하기"}
      </button>
      {error && <p className="text-center text-[13px] text-red-600">{error}</p>}
      {info && <p className="text-center text-[13px] text-neutral-700">{info}</p>}
    </form>
  );
}
