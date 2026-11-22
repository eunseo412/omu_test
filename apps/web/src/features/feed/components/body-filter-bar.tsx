"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronDown, SlidersHorizontal, X } from "lucide-react";
import { GENDERS, GENDER_LABELS, HEIGHT_RANGES, WEIGHT_RANGES, rangeKeyFor, rangeOf, type Gender, type Range } from "@omu/core";
import { chipClass } from "@/components/ui/chip";

type Key = "g" | "h" | "w";
type MyBody = { gender: Gender | null; heightCm: number | null; weightKg: number | null } | null;

/**
 * 홈 체형 필터: 옷장 주인의 성별·키·몸무게로 거르기 (URL ?g=female&h=160-165&w=50-55).
 * 몸무게는 5kg 구간으로만 고를 수 있고, 다른 사람의 프로필에는 보이지 않는다.
 */
export function BodyFilterBar({ myBody }: { myBody: MyBody }) {
  const router = useRouter();
  const params = useSearchParams();
  const [open, setOpen] = useState<Key | null>(null);

  // 서버와 같은 기준으로 잘못된 값은 무시
  const rawG = params.get("g");
  const g = rawG && (GENDERS as readonly string[]).includes(rawG) ? (rawG as Gender) : null;
  const h = rangeOf(HEIGHT_RANGES, params.get("h"))?.key ?? null;
  const w = rangeOf(WEIGHT_RANGES, params.get("w"))?.key ?? null;

  const hrefWith = (next: Partial<Record<Key, string | null>>) => {
    const p = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(next)) {
      if (v) p.set(k, v);
      else p.delete(k);
    }
    const qs = p.toString();
    return qs ? `/?${qs}` : "/";
  };
  const apply = (next: Partial<Record<Key, string | null>>) => {
    setOpen(null);
    router.push(hrefWith(next), { scroll: false });
  };

  // '나와 비슷한 체형': 내 성별 + 내 키·몸무게가 속한 구간
  const mine = myBody
    ? { g: myBody.gender && myBody.gender !== "other" ? myBody.gender : null, h: rangeKeyFor(HEIGHT_RANGES, myBody.heightCm), w: rangeKeyFor(WEIGHT_RANGES, myBody.weightKg) }
    : null;
  const canMine = Boolean(mine && (mine.h || mine.w));
  const mineOn = Boolean(canMine && mine!.g === g && mine!.h === h && mine!.w === w);
  const any = Boolean(g || h || w);

  const btn = (on: boolean) =>
    `flex shrink-0 items-center gap-1 rounded-md px-3 py-1.5 text-[13px] ${on ? "bg-neutral-900 text-white" : "text-neutral-700 ring-1 ring-inset ring-neutral-300"}`;

  return (
    <>
      <div className="no-scrollbar mt-3 flex items-center gap-2 overflow-x-auto px-4">
        <SlidersHorizontal className="h-4 w-4 shrink-0 text-muted" aria-hidden />
        {canMine && (
          <button onClick={() => apply(mineOn ? { g: null, h: null, w: null } : { g: mine!.g, h: mine!.h, w: mine!.w })} className={btn(mineOn)}>
            나와 비슷한 체형
          </button>
        )}
        <button onClick={() => setOpen("g")} className={btn(Boolean(g))}>
          {g ? GENDER_LABELS[g] : "성별"} <ChevronDown className="h-3.5 w-3.5" />
        </button>
        <button onClick={() => setOpen("h")} className={btn(Boolean(h))}>
          {rangeOf(HEIGHT_RANGES, h)?.label ?? "키"} <ChevronDown className="h-3.5 w-3.5" />
        </button>
        <button onClick={() => setOpen("w")} className={btn(Boolean(w))}>
          {rangeOf(WEIGHT_RANGES, w)?.label ?? "몸무게"} <ChevronDown className="h-3.5 w-3.5" />
        </button>
        {any && (
          <Link href={hrefWith({ g: null, h: null, w: null })} scroll={false} className="shrink-0 px-1 text-[12px] text-muted underline">
            초기화
          </Link>
        )}
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40" onClick={() => setOpen(null)}>
          <div className="pb-safe w-full max-w-[480px] rounded-t-3xl bg-white px-5 pb-5 pt-5" onClick={(e) => e.stopPropagation()}>
            <div className="mb-1 flex items-center justify-between">
              <h3 className="text-[18px] font-bold">{open === "g" ? "성별" : open === "h" ? "키" : "몸무게"}</h3>
              <button onClick={() => setOpen(null)} aria-label="닫기" className="p-1"><X className="h-5 w-5" /></button>
            </div>
            <p className="mb-4 text-[13px] text-muted">
              {open === "w" ? "옷장 주인의 몸무게 구간이에요. 정확한 몸무게는 누구에게도 보이지 않아요." : "옷장 주인 기준으로 옷을 보여줘요."}
            </p>
            {open === "g" ? (
              <Options
                options={GENDERS.filter((x) => x !== "other").map((x) => ({ key: x, label: GENDER_LABELS[x] }))}
                value={g}
                onPick={(v) => apply({ g: v })}
              />
            ) : (
              <Options
                options={(open === "h" ? HEIGHT_RANGES : WEIGHT_RANGES).map((r: Range) => ({ key: r.key, label: r.label }))}
                value={open === "h" ? h : w}
                onPick={(v) => apply({ [open]: v })}
              />
            )}
          </div>
        </div>
      )}
    </>
  );
}

function Options({ options, value, onPick }: { options: { key: string; label: string }[]; value: string | null; onPick: (v: string | null) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      <button onClick={() => onPick(null)} className={chipClass(!value)}>전체</button>
      {options.map((o) => (
        <button key={o.key} onClick={() => onPick(value === o.key ? null : o.key)} className={chipClass(value === o.key)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}
