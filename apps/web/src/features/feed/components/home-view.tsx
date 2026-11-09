import Link from "next/link";
import { Search } from "lucide-react";
import { NotificationBell } from "@/features/notifications/components/notification-bell";
import { ItemPosterCard, ItemTile } from "@/components/ui/item-card";
import { ItemImage } from "@/components/ui/item-image";
import { Rail, Section } from "@/components/ui/section";
import type { HomeData } from "../types";

export function HomeView({ data }: { data: HomeData }) {
  return (
    <div className="bg-[#faf8f5]">
      <header className="pt-safe sticky top-0 z-30 bg-[#faf8f5]/90 backdrop-blur">
        <div className="flex h-14 items-center justify-between px-4">
          <span className="text-[22px] font-black tracking-tighter">
            O<span className="text-accent">:</span>MU
          </span>
          <div className="-mr-2 flex items-center">
            <Link href="/explore" aria-label="검색" className="p-2">
              <Search className="h-5 w-5" />
            </Link>
            <NotificationBell />
          </div>
        </div>
      </header>

      {data.isSample && (
        <p className="mx-4 rounded-lg bg-neutral-900 px-3 py-2 text-xs text-white/80">
          샘플 화면입니다. 옷이 등록되면 실제 사진으로 바뀝니다.
        </p>
      )}

      <Section title="새로 올라온 옷" href="/explore">
        <Rail>
          {data.newItems.map((it, i) => (
            <ItemPosterCard key={it.id} item={it} priority={i < 2} />
          ))}
        </Rail>
      </Section>

      <Section title="추구미로 둘러보기" href="/explore">
        <div className="grid grid-cols-2 gap-2 px-4">
          {data.collections.map((c) => (
            <Link
              key={c.tag}
              href={`/explore?tag=${encodeURIComponent(c.tag)}`}
              className="flex h-[76px] items-center justify-between overflow-hidden rounded-xl bg-white pl-3.5"
            >
              <span className="text-[15px] font-semibold">{c.tag}</span>
              <ItemImage src={c.imageUrl} alt={c.tag} tone={c.tone} sizes="80px" className="h-full w-[72px]" />
            </Link>
          ))}
        </div>
      </Section>

      <Section title="취향 맞는 옷장">
        <Rail>
          {data.popularClosets.map((c) => (
            <Link key={c.handle} href={`/u/${c.handle}`} className="block w-[64vw] max-w-[300px] shrink-0 snap-start overflow-hidden rounded-2xl bg-white">
              <div className="grid h-[150px] grid-cols-3 gap-0.5">
                {c.previewImages.map((src, i) => (
                  <ItemImage key={i} src={src} alt="" tone={c.tones[i]} sizes="100px" className="h-full" />
                ))}
              </div>
              <div className="flex items-center justify-between p-3">
                <div>
                  <p className="text-[14px] font-semibold">@{c.handle}</p>
                  <p className="text-[12px] text-neutral-500">{c.styleTags.map((t) => `#${t}`).join(" ")}</p>
                </div>
                <span className="text-[13px] font-bold text-accent">{c.trustTemp.toFixed(1)}℃</span>
              </div>
            </Link>
          ))}
        </Rail>
      </Section>

      <section className="pt-5">
        <h2 className="mb-3 px-4 text-[19px] font-bold tracking-tight">오늘의 피드</h2>
        {/* 두 줄 엇갈림 그리드: 여백 거의 없이 사진으로 채움 */}
        <div className="grid grid-cols-2 gap-0.5">
          {[0, 1].map((col) => (
            <div key={col} className="flex flex-col gap-0.5">
              {data.feed
                .filter((_, i) => i % 2 === col)
                .map((it, i) => (
                  <ItemTile key={it.id} item={it} tall={(i + col) % 3 === 0} />
                ))}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
