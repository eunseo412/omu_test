"use client";

import { Share } from "lucide-react";

/** 휴대폰에서는 공유 시트(카톡·인스타 DM 등), 데스크톱에서는 링크 복사 */
export function ShareButton({ title }: { title: string }) {
  async function share() {
    const url = window.location.href;
    try {
      if (navigator.share) await navigator.share({ title, url });
      else {
        await navigator.clipboard.writeText(url);
        alert("링크를 복사했어요.");
      }
    } catch {
      // 사용자가 공유를 취소한 경우
    }
  }
  return (
    <button onClick={share} aria-label="공유" className="p-2">
      <Share className="h-5 w-5" />
    </button>
  );
}
