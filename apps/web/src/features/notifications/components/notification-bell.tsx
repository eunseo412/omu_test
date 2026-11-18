"use client";

import Link from "next/link";
import { Bell } from "lucide-react";
import { useUnreadCount } from "../use-unread-count";

/** 안 읽은 알림 수 배지. 새 알림이 오면 실시간으로 갱신 */
export function NotificationBell() {
  const { userId, count } = useUnreadCount();
  if (!userId) return null;
  return (
    <Link href="/notifications" aria-label={count ? `알림 ${count}개` : "알림"} className="relative p-2">
      <Bell className="h-[22px] w-[22px]" strokeWidth={1.8} />
      {count > 0 && (
        <span className="absolute right-0.5 top-0.5 min-w-[17px] rounded-full bg-point px-1 text-center text-[10px] font-bold leading-[17px] text-white">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Link>
  );
}
