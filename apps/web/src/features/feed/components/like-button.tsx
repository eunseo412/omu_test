"use client";

import { useOptimistic, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Heart } from "lucide-react";
import { toggleLike } from "../actions";

export function LikeButton({ itemId, initial, size = 20 }: { itemId: string; initial: boolean; size?: number }) {
  const router = useRouter();
  const [, start] = useTransition();
  const [liked, setLiked] = useOptimistic(initial);

  function onClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    start(async () => {
      setLiked(!liked);
      const res = await toggleLike(itemId, !liked);
      if (!res.ok && res.error === "login_required") router.push(`/login?next=${encodeURIComponent(location.pathname + location.search)}`);
    });
  }

  return (
    <button onClick={onClick} aria-label={liked ? "관심 해제" : "관심 추가"} aria-pressed={liked} className="-m-1.5 p-1.5">
      <Heart
        style={{ width: size, height: size }}
        strokeWidth={1.8}
        className={liked ? "fill-neutral-900 text-neutral-900" : "text-neutral-800"}
      />
    </button>
  );
}
