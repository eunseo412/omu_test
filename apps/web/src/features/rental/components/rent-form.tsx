"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { HANDOFF_LABELS, addDays, rangesOverlap, rentalDays, todayKST } from "@omu/core";
import { formatWon } from "@/lib/env";
import { formatPeriod } from "@/lib/date";
import { requestRental } from "../actions";

type Props = {
  item: { id: string; pricePerDay: number; deposit: number; minDays: number; maxDays: number; handoffMethods: string[] };
  booked: { start: string; end: string }[];
};

export function RentForm({ item, booked }: Props) {
  const router = useRouter();
  const today = todayKST();
  const [start, setStart] = useState(addDays(today, 1));
  const [end, setEnd] = useState(addDays(today, item.minDays));
  const [handoff, setHandoff] = useState(item.handoffMethods[0] ?? "in_person");
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const check = useMemo(() => {
    if (!start || !end) return { error: "날짜를 골라주세요." };
    if (start < today) return { error: "시작일은 오늘 이후로 골라주세요." };
    if (end < start) return { error: "반납일이 시작일보다 빨라요." };
    const days = rentalDays(start, end);
    if (days < item.minDays) return { error: `최소 ${item.minDays}일부터 빌릴 수 있어요.`, days };
    if (days > item.maxDays) return { error: `최대 ${item.maxDays}일까지 빌릴 수 있어요.`, days };
    if (booked.some((b) => rangesOverlap(start, end, b.start, b.end))) return { error: "이미 예약된 날짜가 포함돼 있어요.", days };
    return { days };
  }, [start, end, today, item.minDays, item.maxDays, booked]);

  // 시작일을 바꾸면 반납일을 최소 대여일에 맞춰 자동 조정
  function onStart(v: string) {
    setStart(v);
    if (v && (!end || end < addDays(v, item.minDays - 1) || end > addDays(v, item.maxDays - 1))) setEnd(addDays(v, item.minDays - 1));
  }

  async function submit() {
    if (check.error) return setError(check.error);
    setError(null);
    setBusy(true);
    const res = await requestRental({ itemId: item.id, startDate: start, endDate: end, handoffMethod: handoff, message: message || undefined });
    if (!res.ok) {
      setError(res.error);
      setBusy(false);
      return;
    }
    router.replace(`/rentals/${res.data!.id}`);
  }

  const fee = check.days ? check.days * item.pricePerDay : 0;
  const dateCls = "h-12 w-full rounded-xl border border-neutral-200 bg-white px-3 text-[15px] outline-none focus:border-neutral-900";

  return (
    <div className="space-y-6 px-4 pb-40 pt-4">
      <section>
        <h2 className="mb-2 text-[15px] font-semibold">대여 기간</h2>
        <div className="grid grid-cols-2 gap-2">
          <label className="block">
            <span className="mb-1 block text-[12px] text-neutral-500">받는 날</span>
            <input type="date" value={start} min={today} onChange={(e) => onStart(e.target.value)} className={dateCls} />
          </label>
          <label className="block">
            <span className="mb-1 block text-[12px] text-neutral-500">반납하는 날</span>
            <input type="date" value={end} min={start || today} onChange={(e) => setEnd(e.target.value)} className={dateCls} />
          </label>
        </div>
        <p className="mt-2 text-[12px] text-neutral-500">
          이 옷은 {item.minDays === item.maxDays ? `${item.minDays}일` : `${item.minDays}~${item.maxDays}일`} 빌릴 수 있어요.
        </p>
        {booked.length > 0 && (
          <div className="mt-3 rounded-xl bg-neutral-50 p-3">
            <p className="mb-1 text-[12px] font-semibold text-neutral-600">이미 예약된 날짜</p>
            <ul className="space-y-0.5 text-[13px] text-neutral-600">
              {booked.map((b) => (
                <li key={b.start}>· {formatPeriod(b.start, b.end)}</li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-2 text-[15px] font-semibold">전달 방법</h2>
        <div className="flex gap-2">
          {item.handoffMethods.map((h) => (
            <button
              key={h}
              type="button"
              onClick={() => setHandoff(h)}
              aria-pressed={handoff === h}
              className={`rounded-full px-4 py-2 text-[14px] ${handoff === h ? "bg-neutral-900 text-white" : "border border-neutral-200"}`}
            >
              {HANDOFF_LABELS[h as keyof typeof HANDOFF_LABELS] ?? h}
            </button>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-[15px] font-semibold">옷장 주인에게 한마디 <span className="text-[12px] font-normal text-neutral-400">선택</span></h2>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          maxLength={500}
          rows={3}
          placeholder="예) 주말 졸업사진 촬영 때 입고 싶어요! 학생회관 앞에서 받을 수 있을까요?"
          className="w-full resize-none rounded-xl border border-neutral-200 p-3 text-[14px] outline-none focus:border-neutral-900"
        />
      </section>

      <section className="space-y-2 rounded-2xl bg-neutral-50 p-4 text-[14px]">
        <Row label={`대여료 (${formatWon(item.pricePerDay)} × ${check.days ?? 0}일)`} value={formatWon(fee)} />
        <Row label="보증금 (반납 확인 후 돌려받아요)" value={formatWon(item.deposit)} />
        <p className="border-t border-neutral-200 pt-2 text-[12px] leading-relaxed text-neutral-500">
          베타 기간에는 앱에서 결제하지 않아요. 수락되면 채팅으로 만날 시간을 정하고, 대여료와 보증금은 직접 주고받아요.
        </p>
      </section>

      <div className="pb-safe fixed inset-x-0 bottom-0 z-40 mx-auto max-w-[480px] border-t border-neutral-100 bg-white px-4 pt-3">
        {(error || check.error) && <p className="mb-2 text-center text-[13px] text-red-600">{error ?? check.error}</p>}
        <button
          onClick={submit}
          disabled={busy || Boolean(check.error)}
          className="mb-3 h-12 w-full rounded-xl bg-neutral-900 text-[16px] font-semibold text-white disabled:opacity-40"
        >
          {busy ? "신청하는 중…" : check.days ? `${formatPeriod(start, end)} · ${check.days}일 신청하기` : "신청하기"}
        </button>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-neutral-600">{label}</span>
      <b>{value}</b>
    </div>
  );
}
