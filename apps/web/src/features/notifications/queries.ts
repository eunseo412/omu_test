import "server-only";
import { createClient } from "@/lib/supabase/server";
import { hasSupabase, publicImageUrl } from "@/lib/env";

export type NotificationItem = {
  id: number;
  kind: "rental" | "message";
  title: string;
  body: string;
  link: string;
  read: boolean;
  createdAt: string;
  actor: { displayName: string; avatarUrl: string | null } | null;
};

export async function getNotifications(): Promise<NotificationItem[] | null> {
  if (!hasSupabase()) return null;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from("notifications")
    .select("id,kind,title,body,link,read_at,created_at,actor:profiles!notifications_actor_id_fkey(display_name,avatar_url)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(60);
  type Row = {
    id: number; kind: "rental" | "message"; title: string; body: string; link: string; read_at: string | null; created_at: string;
    actor: { display_name: string; avatar_url: string | null } | null;
  };
  return ((data ?? []) as unknown as Row[]).map((n) => ({
    id: n.id,
    kind: n.kind,
    title: n.title,
    body: n.body,
    link: n.link,
    read: Boolean(n.read_at),
    createdAt: n.created_at,
    actor: n.actor ? { displayName: n.actor.display_name, avatarUrl: publicImageUrl("avatars", n.actor.avatar_url) } : null,
  }));
}

/** 거래 화면을 열면 그 거래의 알림은 읽은 것으로 */
export async function markRentalNotificationsRead(rentalId: string) {
  if (!hasSupabase()) return;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", user.id)
    .eq("rental_id", rentalId)
    .is("read_at", null);
}
