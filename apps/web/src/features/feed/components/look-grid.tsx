import Link from "next/link";
import { ItemImage } from "@/components/ui/item-image";
import type { ItemCardData } from "../types";
import { LikeButton } from "./like-button";

/**
 * 2열 엇갈림(메이슨리) 사진 그리드. 사진만 보이고 하트는 사진 오른쪽 아래.
 * 왼쪽 열은 조금 낮게, 오른쪽 열은 조금 길게 해서 디자인 시안처럼 엇갈리게 보인다.
 */
export function LookGrid({ items, likedIds = [], activeTag }: { items: ItemCardData[]; likedIds?: string[]; activeTag?: string | null }) {
  const liked = new Set(likedIds);
  const cols = [items.filter((_, i) => i % 2 === 0), items.filter((_, i) => i % 2 === 1)];
  return (
    <div className="grid grid-cols-2 gap-3 px-4">
      {cols.map((col, c) => (
        <div key={c} className="flex flex-col gap-3">
          {col.map((it, r) => (
            <LookCard
              key={it.id}
              item={it}
              liked={liked.has(it.id)}
              label={activeTag && it.styleTags.includes(activeTag) ? activeTag : it.styleTags[0] ?? it.title}
              aspect={c === 0 ? (r % 3 === 2 ? "aspect-[4/5]" : "aspect-[21/20]") : r % 3 === 1 ? "aspect-[21/20]" : "aspect-[8/9]"}
              priority={r === 0}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

function LookCard({ item, liked, label, aspect, priority }: { item: ItemCardData; liked: boolean; label: string; aspect: string; priority?: boolean }) {
  return (
    <div className="relative">
      <Link href={`/items/${item.id}`} className="block" aria-label={label}>
        <ItemImage
          src={item.imageUrl}
          alt={item.title}
          tone={item.tone}
          sizes="(max-width: 480px) 50vw, 230px"
          priority={priority}
          className={`${aspect} rounded-[10px]`}
        />
      </Link>
      {/* 하트: 사진 오른쪽 아래 */}
      <LikeButton itemId={item.id} initial={liked} variant="overlay" size={22} className="absolute bottom-1 right-1" />
    </div>
  );
}
