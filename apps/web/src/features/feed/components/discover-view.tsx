import Link from "next/link";
import { Search, X } from "lucide-react";
import { Wordmark } from "@/components/ui/wordmark";
import { NotificationBell } from "@/features/notifications/components/notification-bell";
import type { DiscoverResult } from "../queries";
import { LookGrid } from "./look-grid";
import { StyleChips } from "./style-chips";
import { BodyFilterBar } from "./body-filter-bar";

type MyBody = { gender: "female" | "male" | "other" | null; heightCm: number | null; weightKg: number | null } | null;

export function DiscoverView({ data, tag, q, myBody, filtered }: { data: DiscoverResult; tag: string | null; q: string; myBody: MyBody; filtered: boolean }) {
  return (
    <div className="pb-6">
      <header className="pt-safe sticky top-0 z-30 bg-white/95 backdrop-blur">
        <div className="flex h-14 items-center justify-between px-4">
          <Link href="/" aria-label="홈"><Wordmark /></Link>
          <div className="-mr-2 flex items-center">
            <label htmlFor="discover-search" aria-label="검색" className="cursor-pointer p-2">
              <Search className="h-[22px] w-[22px]" strokeWidth={2} />
            </label>
            <NotificationBell />
          </div>
        </div>
      </header>

      <section className="px-4 pb-5 pt-3">
        <h1 className="text-[26px] font-extrabold leading-[1.3] tracking-[-0.03em]">
          오늘은 누구의 분위기를
          <br />
          입어볼까요?
        </h1>
        <p className="mt-2 text-[14px] text-muted">마음에 드는 스타일에서 옷장으로.</p>
      </section>

      <form action="/" className="relative mx-4 mb-4">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
        <input
          id="discover-search"
          name="q"
          defaultValue={q}
          enterKeyHint="search"
          placeholder="원하는 스타일을 찾아보세요"
          className="h-12 w-full rounded-xl bg-surface pl-11 pr-10 text-[15px] outline-none placeholder:text-muted focus:ring-2 focus:ring-neutral-900/10"
        />
        {q && (
          <Link href="/" aria-label="검색어 지우기" className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-muted">
            <X className="h-4 w-4" />
          </Link>
        )}
      </form>

      <StyleChips active={tag} />
      <BodyFilterBar myBody={myBody} />

      {data.isSample && (
        <p className="mx-4 mt-4 rounded-lg bg-surface px-3 py-2 text-[12px] text-muted">
          샘플 화면이에요. 옷이 등록되면 실제 사진으로 바뀌어요.
        </p>
      )}

      <div className="mt-5">
        {data.items.length ? (
          <LookGrid items={data.items} likedIds={data.likedIds} activeTag={tag} />
        ) : (
          <div className="px-6 py-16 text-center">
            <p className="text-[15px] font-semibold">
              {filtered ? "이 체형의 옷장이 아직 없어요" : q ? `'${q}'에 맞는 옷이 없어요` : "아직 이 스타일의 옷이 없어요"}
            </p>
            <p className="mt-1 text-[13px] text-muted">
              {filtered ? "구간을 넓히거나 필터를 초기화해 보세요." : "다른 스타일을 둘러보거나, 내 옷을 먼저 올려보세요."}
            </p>
            <Link href="/closet/new" className="mt-5 inline-block rounded-xl bg-neutral-900 px-5 py-3 text-[14px] font-semibold text-white">
              옷 등록하기
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
