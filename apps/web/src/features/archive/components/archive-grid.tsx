import Link from "next/link";
import { EyeOff } from "lucide-react";
import { ItemImage } from "@/components/ui/item-image";
import type { ArchiveCard } from "../queries";

/** mood archive 2열 엇갈림 그리드 (홈 사진 그리드와 같은 리듬) */
export function ArchiveGrid({ cards }: { cards: ArchiveCard[] }) {
  const cols = [cards.filter((_, i) => i % 2 === 0), cards.filter((_, i) => i % 2 === 1)];
  return (
    <div className="grid grid-cols-2 gap-3 px-4">
      {cols.map((col, c) => (
        <div key={c} className="flex flex-col gap-3">
          {col.map((card, r) => (
            <Link key={card.id} href={`/archive/${card.id}`} className="relative block">
              <ItemImage
                src={card.imageUrl}
                alt={card.title}
                tone={card.tone}
                sizes="(max-width: 480px) 50vw, 230px"
                className={`${c === 0 ? (r % 3 === 2 ? "aspect-[4/5]" : "aspect-[21/20]") : r % 3 === 1 ? "aspect-[21/20]" : "aspect-[8/9]"} rounded-[10px] ${card.hidden ? "opacity-40" : ""}`}
              />
              {card.hidden && (
                <span className="absolute left-2 top-2 flex items-center gap-1 rounded-md bg-white/90 px-1.5 py-0.5 text-[11px] font-semibold">
                  <EyeOff className="h-3 w-3" /> 숨김
                </span>
              )}
            </Link>
          ))}
        </div>
      ))}
    </div>
  );
}
