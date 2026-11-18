"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { STYLE_TAGS } from "@omu/core";

/** 홈 스타일 필터: 잡지 목차 같은 텍스트 탭. 선택은 굵게 + 밑줄, 가로로 넘겨서 전체 보기 */
export function StyleChips({ active }: { active: string | null }) {
  const activeRef = useRef<HTMLAnchorElement>(null);

  // 오른쪽에 있는 스타일을 골랐을 때도 선택된 탭이 보이게
  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: "nearest", inline: "center" });
  }, [active]);

  const tabs: (string | null)[] = [null, ...STYLE_TAGS];
  return (
    <nav aria-label="스타일" className="no-scrollbar flex gap-5 overflow-x-auto border-b border-line px-4">
      {tabs.map((t) => {
        const on = (t ?? null) === active;
        return (
          <Link
            key={t ?? "all"}
            ref={on ? activeRef : undefined}
            href={t ? `/?tag=${encodeURIComponent(t)}` : "/"}
            aria-current={on ? "page" : undefined}
            className={`-mb-px shrink-0 border-b-2 pb-2.5 text-[15px] transition-colors ${
              on ? "border-neutral-900 font-bold text-neutral-900" : "border-transparent text-muted"
            }`}
          >
            {t ?? "전체"}
          </Link>
        );
      })}
    </nav>
  );
}
