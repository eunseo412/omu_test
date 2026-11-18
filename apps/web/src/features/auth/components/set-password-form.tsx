"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/** 로그인한 상태에서 비밀번호 정하기/바꾸기 (인증 메일로만 가입했던 사람도 여기서 비밀번호를 만든다) */
export function SetPasswordForm() {
  const router = useRouter();
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (pw.length < 6) return setMsg({ ok: false, text: "비밀번호는 6자 이상으로 정해주세요." });
    if (pw !== pw2) return setMsg({ ok: false, text: "두 비밀번호가 달라요." });
    setBusy(true);
    const { error } = await createClient().auth.updateUser({ password: pw });
    setBusy(false);
    if (error) {
      const same = error.message.toLowerCase().includes("different from the old");
      return setMsg({ ok: false, text: same ? "지금 비밀번호와 다른 비밀번호를 입력해 주세요." : `저장하지 못했어요. (${error.message})` });
    }
    setMsg({ ok: true, text: "비밀번호를 저장했어요. 다음부터 이메일과 비밀번호로 로그인하세요." });
    setPw("");
    setPw2("");
    setTimeout(() => router.push("/me"), 1200);
  }

  const cls = "h-12 w-full rounded-xl bg-surface px-3.5 text-[15px] outline-none placeholder:text-muted focus:ring-2 focus:ring-neutral-900/10";
  return (
    <form onSubmit={submit} className="space-y-2.5 px-4 pt-4">
      <p className="pb-2 text-[13px] text-muted">이메일 + 비밀번호로 바로 로그인할 수 있게 비밀번호를 정해요.</p>
      <input type="password" autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="새 비밀번호 (6자 이상)" className={cls} />
      <input type="password" autoComplete="new-password" value={pw2} onChange={(e) => setPw2(e.target.value)} placeholder="한 번 더 입력" className={cls} />
      <button type="submit" disabled={busy || !pw || !pw2} className="h-12 w-full rounded-xl bg-neutral-900 text-[15px] font-semibold text-white disabled:opacity-40">
        {busy ? "저장 중…" : "저장"}
      </button>
      {msg && <p className={`text-center text-[13px] ${msg.ok ? "text-neutral-700" : "text-red-600"}`}>{msg.text}</p>}
    </form>
  );
}
