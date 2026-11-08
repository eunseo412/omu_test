"use client";

import { useOptimistic, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toggleFollow } from "../actions";

export function FollowButton({ targetId, handle, initial }: { targetId: string; handle: string; initial: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [following, setOptimistic] = useOptimistic(initial);

  function onClick() {
    start(async () => {
      setOptimistic(!following);
      const res = await toggleFollow(targetId, !following);
      if (!res.ok && res.error === "login_required") router.push(`/login?next=/u/${handle}`);
      else if (!res.ok) alert(res.error);
    });
  }

  return (
    <button
      onClick={onClick}
      disabled={pending}
      className={`h-10 flex-1 rounded-xl text-[14px] font-semibold ${following ? "border border-neutral-300 bg-white" : "bg-neutral-900 text-white"}`}
    >
      {following ? "팔로잉" : "팔로우"}
    </button>
  );
}
