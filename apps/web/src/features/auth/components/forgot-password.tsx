"use client";

import { useState } from "react";
import { EmailLogin } from "./email-login";

/** 비밀번호를 잊은 사람만 인증 메일 로그인 사용 (메일 발송 제한이 있어 기본 경로에서는 뺐다) */
export function ForgotPassword({ next }: { next: string }) {
  const [open, setOpen] = useState(false);
  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="w-full py-1 text-center text-[13px] text-muted underline">
        비밀번호를 잊었어요
      </button>
    );
  }
  return (
    <div className="space-y-2 rounded-2xl border border-line bg-white p-3">
      <p className="px-1 text-[12px] leading-relaxed text-neutral-600">
        인증 메일로 로그인한 뒤 <b>MY → 비밀번호 설정</b>에서 새 비밀번호를 정할 수 있어요.
      </p>
      <EmailLogin next={next === "/" ? "/me/password" : next} />
    </div>
  );
}
