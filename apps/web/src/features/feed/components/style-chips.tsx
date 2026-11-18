"use client";

import { useState } from "react";
import Link from "next/link";
import { STYLE_TAGS } from "@omu/core";
import { chipClass } from "@/components/ui/chip";

const VISIBLE = 2;

/** 전체 · 대표 스타일 2개 · 더 보기(펼치면 전체 스타일) */
export function StyleChips({ active }: { active: string | null }) {
  const [open, setOpen] = useState(false);
  const shown: string[] = STYLE_TAGS.slice(0, VISIBLE) as unknown as string[];
  if (active && !shown.includes(active)) shown.push(active); // 선택한 스타일은 접혀 있어도 보이게

  const href = (t: string | null) => (t ? `/?tag=${encodeURIComponent(t)}` : "/");

  return (
    <div className="px-4">
      {open ? (
        <div className="flex flex-wrap gap-2">
          <Link href={href(null)} className={chipClass(!active)} onClick={() => setOpen(false)}>전체</Link>
          {STYLE_TAGS.map((t) => (
            <Link key={t} href={href(t)} className={chipClass(active === t)} onClick={() => setOpen(false)}>
              {t}
            </Link>
          ))}
          <button onClick={() => setOpen(false)} className={chipClass(false)}>접기</button>
        </div>
      ) : (
        <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
          <Link href={href(null)} className={chipClass(!active)}>전체</Link>
          {shown.map((t) => (
            <Link key={t} href={href(t)} className={chipClass(active === t)}>
              {t}
            </Link>
          ))}
          <button onClick={() => setOpen(true)} className={chipClass(false)}>더 보기</button>
        </div>
      )}
    </div>
  );
}
