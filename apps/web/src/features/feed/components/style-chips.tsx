"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { STYLE_TAGS } from "@omu/core";

/** 홈 스타일 필터: 해시태그 텍스트. 박스·밑줄 없이 글자만, 선택한 태그는 검정 굵게. 가로로 넘겨서 전체 보기 */
export function StyleChips({ active }: { active: string | null }) {
  const activeRef = useRef<HTMLAnchorElement>(null);
  const params = useSearchParams();
  const href = (t: string | null) => {
    const p = new URLSearchParams();
    if (t) p.set("tag", t);
    for (const k of ["g", "h", "w"]) { const v = params.get(k); if (v) p.set(k, v); }
    const qs = p.toString();
    return qs ? `/?${qs}` : "/";
  };

  // 오른쪽에 있는 태그를 골랐을 때도 보이게
  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: "nearest", inline: "center" });
  }, [active]);

  const tags: (string | null)[] = [null, ...STYLE_TAGS];
  return (
    <nav aria-label="스타일" className="no-scrollbar flex gap-3.5 overflow-x-auto px-4 py-1">
      {tags.map((t) => {
        const on = t === active;
        return (
          <Link
            key={t ?? "all"}
            ref={on ? activeRef : undefined}
            href={href(t)}
            aria-current={on ? "page" : undefined}
            className={`shrink-0 text-[15px] transition-colors ${on ? "font-bold text-neutral-900" : "text-neutral-400"}`}
          >
            {t ? `#${t}` : "전체"}
          </Link>
        );
      })}
    </nav>
  );
}
