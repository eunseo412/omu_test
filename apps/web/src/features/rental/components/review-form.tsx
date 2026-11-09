"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Star } from "lucide-react";
import { submitReview } from "../actions";

export function ReviewForm({ rentalId, role, counterpartHandle }: { rentalId: string; role: "owner" | "renter"; counterpartHandle: string }) {
  const router = useRouter();
  const [scores, setScores] = useState({ condition: 0, punctuality: 0, manner: 0 });
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const rows: { key: keyof typeof scores; label: string }[] = [
    { key: "condition", label: role === "owner" ? "옷을 깨끗하게 돌려줬나요?" : "옷 상태가 설명과 같았나요?" },
    { key: "punctuality", label: "약속 시간·반납 기한을 지켰나요?" },
    { key: "manner", label: "소통이 친절했나요?" },
  ];

  async function submit() {
    if (Object.values(scores).some((s) => s === 0)) return setError("모든 항목에 별점을 매겨 주세요.");
    setBusy(true);
    setError(null);
    const res = await submitReview({ rentalId, ...scores, comment: comment.trim() || undefined });
    setBusy(false);
    if (!res.ok) return setError(res.error);
    router.refresh();
  }

  return (
    <section className="mx-4 rounded-2xl border border-neutral-200 p-4">
      <h2 className="text-[16px] font-bold">@{counterpartHandle}님은 어땠나요?</h2>
      <p className="mb-4 text-[12px] text-neutral-500">평가는 상대의 신뢰도 온도에 반영돼요.</p>
      <div className="space-y-3">
        {rows.map((r) => (
          <div key={r.key}>
            <p className="mb-1 text-[13px]">{r.label}</p>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} type="button" aria-label={`${n}점`} onClick={() => setScores((s) => ({ ...s, [r.key]: n }))} className="p-0.5">
                  <Star className={`h-7 w-7 ${n <= scores[r.key] ? "fill-accent text-accent" : "text-neutral-300"}`} strokeWidth={1.5} />
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        maxLength={300}
        rows={2}
        placeholder="한 줄 후기 (선택)"
        className="mt-4 w-full resize-none rounded-xl border border-neutral-200 p-3 text-[14px] outline-none focus:border-neutral-900"
      />
      {error && <p className="mt-1 text-[13px] text-red-600">{error}</p>}
      <button onClick={submit} disabled={busy} className="mt-3 h-12 w-full rounded-xl bg-neutral-900 text-[15px] font-semibold text-white disabled:opacity-50">
        {busy ? "저장 중…" : "평가 남기기"}
      </button>
    </section>
  );
}
