"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CreditCard, Plus } from "lucide-react";
import { cardLabel, PAYMENTS_LIVE, type PaymentMethod } from "../config";
import { registerPaymentMethod, removePaymentMethod } from "../actions";

export function PaymentMethodsView({ methods }: { methods: PaymentMethod[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  return (
    <div className="space-y-4 px-4 pt-2">
      <div className="rounded-2xl bg-surface p-4 text-[14px] leading-relaxed">
        <b className="block text-[15px]">보증금 없이, 반납 후 자동결제</b>
        <span className="text-neutral-600">
          미리 내는 돈은 없어요. 옷을 돌려주고 거래가 끝나면 대여료가 등록한 결제수단으로 자동 결제돼요. 분실·파손이 확인될 때만 보상 기준액 안에서 추가로 청구돼요.
        </span>
      </div>

      {methods.length > 0 ? (
        <ul className="space-y-2">
          {methods.map((m) => (
            <li key={m.id} className="flex items-center gap-3 rounded-2xl p-4 ring-1 ring-inset ring-line">
              <CreditCard className="h-6 w-6" strokeWidth={1.6} />
              <span className="flex-1 text-[15px] font-semibold">
                {cardLabel(m)} {m.isDefault && <span className="ml-1 rounded bg-neutral-900 px-1.5 py-0.5 text-[10px] text-white">기본</span>}
              </span>
              <button
                disabled={pending}
                onClick={() => start(async () => { const r = await removePaymentMethod(m.id); setMsg(r.ok ? null : r.error); router.refresh(); })}
                className="text-[13px] text-muted underline"
              >
                삭제
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-2xl px-4 py-6 text-center text-[14px] text-muted ring-1 ring-inset ring-line">등록된 결제수단이 없어요.</p>
      )}

      <button
        disabled={pending}
        onClick={() => start(async () => { const r = await registerPaymentMethod(); setMsg(r.ok ? null : r.error); })}
        className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-neutral-900 text-[15px] font-semibold text-white disabled:opacity-50"
      >
        <Plus className="h-4 w-4" /> 카드 등록하기
      </button>
      {!PAYMENTS_LIVE && <p className="text-center text-[12px] text-muted">결제 연동 준비 중 · 베타 기간에는 대여료를 직접 주고받아요.</p>}
      {msg && <p className="text-center text-[13px] text-red-600">{msg}</p>}
    </div>
  );
}
