import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { ItemImage } from "@/components/ui/item-image";
import { getItem } from "@/features/feed/queries";
import { formatWon } from "@/lib/env";

export default async function ItemPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const item = await getItem(id);
  if (!item) notFound();
  const images = item.images.length ? item.images : [null];

  return (
    <main className="pb-28">
      {/* 사진이 화면 폭을 가득 채우는 가로 스와이프 */}
      <div className="relative">
        <div className="no-scrollbar flex snap-x snap-mandatory overflow-x-auto">
          {images.map((src, i) => (
            <ItemImage key={i} src={src} alt={item.title} tone={item.tone} sizes="480px" priority={i === 0} className="aspect-[3/4] w-full shrink-0 snap-center" />
          ))}
        </div>
        <Link href="/" aria-label="뒤로" className="pt-safe absolute left-3 top-3 rounded-full bg-white/80 p-1.5 backdrop-blur">
          <ChevronLeft className="h-5 w-5" />
        </Link>
      </div>

      <Link href={`/u/${item.owner.handle}`} className="flex items-center justify-between border-b border-neutral-100 px-4 py-3">
        <span className="text-[14px] font-semibold">@{item.owner.handle}의 옷장</span>
        <span className="text-[13px] font-bold text-accent">{item.ownerTrustTemp.toFixed(1)}℃</span>
      </Link>

      <div className="space-y-2 px-4 py-4">
        {item.brand && <p className="text-[13px] text-neutral-500">{item.brand}</p>}
        <h1 className="text-xl font-bold">{item.title}</h1>
        <p className="text-[13px] text-neutral-500">
          사이즈 {item.size} · {item.minDays}~{item.maxDays}일 대여 · {item.handoffMethods.includes("in_person") ? "대면" : "택배"}
        </p>
        <div className="flex flex-wrap gap-1.5 pt-1">
          {item.styleTags.map((t) => (
            <span key={t} className="rounded-full bg-neutral-100 px-2.5 py-1 text-[12px]">#{t}</span>
          ))}
        </div>
        <p className="whitespace-pre-line pt-3 text-[14px] leading-relaxed text-neutral-700">{item.description}</p>
      </div>

      <div className="pb-safe fixed inset-x-0 bottom-0 mx-auto flex max-w-[480px] items-center gap-3 border-t border-neutral-100 bg-white px-4 py-3">
        <div className="flex-1">
          <p className="text-[17px] font-bold">{formatWon(item.pricePerDay)}<span className="text-sm font-normal">/일</span></p>
          <p className="text-[12px] text-neutral-500">보증금 {formatWon(item.deposit)}</p>
        </div>
        <button className="rounded-xl bg-neutral-900 px-6 py-3 text-[15px] font-semibold text-white" disabled={item.id.startsWith("sample-")}>
          대여 신청
        </button>
      </div>
    </main>
  );
}
