"use client";

import { useEffect, useState } from "react";

const MESSAGES: Record<string, string> = {
  browser:
    "메일 링크를 다른 브라우저(또는 메일 앱 안)에서 열어서 로그인이 안 됐어요. 아래에 이메일을 다시 입력하고, 메일에 있는 인증 코드를 입력해 주세요.",
  expired: "인증 링크가 만료됐거나 이미 사용됐어요. 이메일을 다시 입력해 새 메일을 받아주세요.",
  unknown: "로그인에 실패했어요. 이메일을 다시 입력하고, 메일에 있는 인증 코드로 로그인해 주세요.",
};

/**
 * 로그인 실패 안내. 서버 콜백이 넘긴 ?error= 와,
 * Supabase가 주소 뒤(#error_code=otp_expired 등)에 붙인 오류를 모두 해석한다.
 */
export function LoginError({ error }: { error?: string }) {
  const [reason, setReason] = useState<string | null>(error ? (MESSAGES[error] ? error : "unknown") : null);

  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.slice(1));
    const code = hash.get("error_code");
    if (code) {
      setReason(code === "otp_expired" ? "expired" : "unknown");
      history.replaceState(null, "", window.location.pathname + window.location.search); // 주소 정리
    }
  }, []);

  if (!reason) return null;
  return <p className="rounded-xl bg-red-50 px-3.5 py-2.5 text-[13px] leading-relaxed text-red-700">{MESSAGES[reason]}</p>;
}
