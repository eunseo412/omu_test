import Link from "next/link";
import { ItemImage } from "@/components/ui/item-image";
import type { ItemCardData } from "../types";
import { LikeButton } from "./like-button";

/**
 * 2열 엇갈림(메이슨리) 사진 그리드. 사진 아래 스타일 이름 + 하트.
 * 왼쪽 열은 조금 낮게, 오른쪽 열은 조금 길게 해서 디자인 시안처럼 엇갈리게 보인다.
 */
export function LookGrid({ items, likedIds = [], activeTag }: { items: ItemCardData[]; likedIds?: string[]; activeTag?: string | null }) {
  const liked = new Set(likedIds);
  const cols = [items.filter((_, i) => i % 2 === 0), items.filter((_, i) => i % 2 === 1)];
  return (
    <div className="grid grid-cols-2 gap-3 px-4">
      {cols.map((col, c) => (
        <div key={c} className="flex flex-col gap-5">
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
    <div>
      <Link href={`/items/${item.id}`} className="block">
        <ItemImage
          src={item.imageUrl}
          alt={item.title}
          tone={item.tone}
          sizes="(max-width: 480px) 50vw, 230px"
          priority={priority}
          className={`${aspect} rounded-[10px]`}
        />
      </Link>
      <div className="mt-2 flex items-center justify-between gap-2">
        <Link href={`/items/${item.id}`} className="min-w-0 truncate text-[14px] font-bold">
          {label}
        </Link>
        <LikeButton itemId={item.id} initial={liked} />
      </div>
    </div>
  );
}
