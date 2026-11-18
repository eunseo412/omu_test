"use client";

import { useOptimistic, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Heart } from "lucide-react";
import { toggleLike } from "../actions";

/** variant="overlay": 사진 위에 올리는 흰 하트(그림자로 밝은 사진에서도 보이게) */
export function LikeButton({
  itemId, initial, size = 20, variant = "plain", className = "",
}: { itemId: string; initial: boolean; size?: number; variant?: "plain" | "overlay"; className?: string }) {
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
    <button
      onClick={onClick}
      aria-label={liked ? "관심 해제" : "관심 추가"}
      aria-pressed={liked}
      className={`${variant === "overlay" ? "p-2" : "-m-1.5 p-1.5"} ${className}`}
    >
      <Heart
        style={{ width: size, height: size }}
        strokeWidth={variant === "overlay" ? 2 : 1.8}
        className={
          variant === "overlay"
            ? `text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.45)] ${liked ? "fill-white" : ""}`
            : liked ? "fill-neutral-900 text-neutral-900" : "text-neutral-800"
        }
      />
    </button>
  );
}
