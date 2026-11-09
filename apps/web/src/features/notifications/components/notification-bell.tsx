"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { hasSupabase } from "@/lib/env";

/** 안 읽은 알림 수 배지. 새 알림이 오면 실시간으로 갱신 */
export function NotificationBell() {
  const pathname = usePathname();
  const [userId, setUserId] = useState<string | null>(null);
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!hasSupabase()) return;
    createClient().auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);

  useEffect(() => {
    if (!userId) return;
    const supabase = createClient();
    const refresh = () =>
      supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .is("read_at", null)
        .then(({ count }) => setCount(count ?? 0));
    refresh();
    const channel = supabase
      .channel(`notif-bell-${userId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` }, refresh)
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, pathname]);

  if (!userId) return null;
  return (
    <Link href="/notifications" aria-label={count ? `알림 ${count}개` : "알림"} className="relative p-2">
      <Bell className="h-5 w-5" />
      {count > 0 && (
        <span className="absolute right-0.5 top-0.5 min-w-[18px] rounded-full bg-accent px-1 text-center text-[10px] font-bold leading-[18px] text-white">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Link>
  );
}
