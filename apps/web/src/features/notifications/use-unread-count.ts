"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { hasSupabase } from "@/lib/env";

/** 로그인 사용자의 안 읽은 알림 수 (실시간). 로그인 안 했으면 userId = null */
export function useUnreadCount() {
  const pathname = usePathname();
  const [userId, setUserId] = useState<string | null>(null);
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!hasSupabase()) return;
    // 화면 표시용이라 저장된 세션만 확인 (네트워크 왕복 없음). 데이터 권한은 DB(RLS)가 확인
    createClient().auth.getSession().then(({ data }) => setUserId(data.session?.user.id ?? null));
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
      .channel(`unread-${userId}-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` }, refresh)
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, pathname]);

  return { userId, count };
}
