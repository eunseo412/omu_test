"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { setArchiveHidden } from "../actions";

export function ArchiveHideToggle({ id, hidden }: { id: string; hidden: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <div>
      <button
        disabled={pending}
        onClick={() =>
          start(async () => {
            const res = await setArchiveHidden(id, !hidden);
            if (!res.ok) return setError(res.error ?? "처리하지 못했어요.");
            router.refresh();
          })
        }
        className="flex w-full items-center justify-center gap-1.5 py-2 text-[13px] text-muted disabled:opacity-50"
      >
        {hidden ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
        {hidden ? "다시 공개하기" : "이 카드 숨기기"}
      </button>
      {error && <p className="text-center text-[12px] text-red-600">{error}</p>}
    </div>
  );
}
