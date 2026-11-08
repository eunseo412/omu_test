import Link from "next/link";
import type { ItemCardData } from "@/features/feed/types";
import { formatWon } from "@/lib/env";
import { ItemImage } from "./item-image";

/** 큰 세로 카드: 이미지가 카드 전체를 덮고 정보는 이미지 위 하단에 */
export function ItemPosterCard({ item, priority }: { item: ItemCardData; priority?: boolean }) {
  return (
    <Link href={`/items/${item.id}`} className="relative block w-[42vw] max-w-[200px] shrink-0 snap-start">
      <ItemImage src={item.imageUrl} alt={item.title} tone={item.tone} sizes="200px" priority={priority} className="aspect-[3/4] rounded-2xl" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 rounded-b-2xl bg-gradient-to-t from-black/60 to-transparent p-3 pt-10 text-white">
        <p className="truncate text-[13px] font-semibold">{item.title}</p>
        <p className="text-[12px] opacity-90">{formatWon(item.pricePerDay)}/일 · {item.size}</p>
      </div>
    </Link>
  );
}

/** 피드 그리드 타일: 여백 없이 이미지로 화면을 채움 */
export function ItemTile({ item, tall }: { item: ItemCardData; tall?: boolean }) {
  return (
    <Link href={`/items/${item.id}`} className="group relative block">
      <ItemImage src={item.imageUrl} alt={item.title} tone={item.tone} sizes="(max-width: 480px) 50vw, 240px" className={tall ? "aspect-[3/5]" : "aspect-[3/4]"} />
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/55 to-transparent p-2.5 pt-8 text-white">
        <p className="truncate text-[12px] font-medium">@{item.owner.handle}</p>
        <p className="text-[12px] font-semibold">{formatWon(item.pricePerDay)}/일</p>
      </div>
    </Link>
  );
}
