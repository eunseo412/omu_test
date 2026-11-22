import "server-only";
import { createClient, getAuthUser } from "@/lib/supabase/server";
import { hasSupabase, publicImageUrl } from "@/lib/env";
import { TONES } from "@/features/feed/sample";

export type ArchiveCard = {
  id: string;
  title: string;
  imageUrl: string | null;
  isIllustration: boolean;
  ownerHandle: string | null;
  rentedFrom: string;
  rentedTo: string;
  hidden: boolean;
  tone: string;
};

type Row = {
  id: string; title: string; source_path: string | null; illustration_path: string | null; illustration_status: string;
  hidden: boolean; rented_from: string; rented_to: string; owner: { handle: string } | null;
};

/** 일러스트가 준비됐으면 일러스트, 아니면 원래 옷 사진 */
function imageOf(r: Pick<Row, "illustration_path" | "illustration_status" | "source_path">) {
  if (r.illustration_status === "ready" && r.illustration_path) return { url: publicImageUrl("archive", r.illustration_path), illus: true };
  return { url: publicImageUrl("items", r.source_path), illus: false };
}

/** 프로필의 mood archive 탭. 남의 프로필이면 숨긴 카드는 RLS가 빼준다 */
export async function getArchiveList(userId: string): Promise<ArchiveCard[]> {
  if (!hasSupabase() || userId.startsWith("sample-")) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("mood_archive")
    .select("id,title,source_path,illustration_path,illustration_status,hidden,rented_from,rented_to,owner:profiles!mood_archive_owner_id_fkey(handle)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(200);
  return ((data ?? []) as unknown as Row[]).map((r, i) => {
    const img = imageOf(r);
    return {
      id: r.id, title: r.title, imageUrl: img.url, isIllustration: img.illus, ownerHandle: r.owner?.handle ?? null,
      rentedFrom: r.rented_from, rentedTo: r.rented_to, hidden: r.hidden, tone: TONES[(i * 5) % TONES.length],
    };
  });
}

export type ArchiveEntry = ArchiveCard & {
  collector: { handle: string; displayName: string };
  owner: { id: string; handle: string; displayName: string; avatarUrl: string | null } | null;
  itemId: string | null;
  itemAvailable: boolean; // 지금도 빌릴 수 있는 옷인지 (삭제·숨김이면 false)
  isMine: boolean; // 내 아카이브 카드인지
  viewerIsOwner: boolean; // 보는 사람이 옷 주인인지
  isFollowingOwner: boolean;
  isLoggedIn: boolean;
  isNew: boolean; // '내 옷장에 추가됐어요'를 아직 안 봤는지
};

export async function getArchiveEntry(id: string): Promise<ArchiveEntry | null> {
  if (!hasSupabase() || !/^[0-9a-f-]{36}$/i.test(id)) return null;
  const supabase = await createClient();
  const [{ data }, user] = await Promise.all([
    supabase
      .from("mood_archive")
      .select(
        "id,user_id,item_id,title,source_path,illustration_path,illustration_status,hidden,rented_from,rented_to,seen_at," +
          "collector:profiles!mood_archive_user_id_fkey(handle,display_name)," +
          "owner:profiles!mood_archive_owner_id_fkey(id,handle,display_name,avatar_url)",
      )
      .eq("id", id)
      .maybeSingle(),
    getAuthUser(),
  ]);
  if (!data) return null;
  const r = data as unknown as Row & {
    user_id: string; item_id: string | null; seen_at: string | null;
    collector: { handle: string; display_name: string } | null;
    owner: { id: string; handle: string; display_name: string; avatar_url: string | null } | null;
  };

  const [itemRes, followRes] = await Promise.all([
    r.item_id ? supabase.from("items").select("id,status").eq("id", r.item_id).maybeSingle() : Promise.resolve({ data: null }),
    user && r.owner && user.id !== r.owner.id
      ? supabase.from("follows").select("follower_id").eq("follower_id", user.id).eq("followee_id", r.owner.id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);
  const img = imageOf(r);
  return {
    id: r.id, title: r.title, imageUrl: img.url, isIllustration: img.illus, ownerHandle: r.owner?.handle ?? null,
    rentedFrom: r.rented_from, rentedTo: r.rented_to, hidden: r.hidden, tone: TONES[0],
    collector: { handle: r.collector?.handle ?? "", displayName: r.collector?.display_name ?? "" },
    owner: r.owner ? { id: r.owner.id, handle: r.owner.handle, displayName: r.owner.display_name, avatarUrl: publicImageUrl("avatars", r.owner.avatar_url) } : null,
    itemId: r.item_id,
    itemAvailable: (itemRes.data as { status: string } | null)?.status === "active",
    isMine: user?.id === r.user_id,
    viewerIsOwner: Boolean(user && r.owner && user.id === r.owner.id),
    isFollowingOwner: Boolean(followRes.data),
    isLoggedIn: Boolean(user),
    isNew: user?.id === r.user_id && !r.seen_at,
  };
}

/** 카드를 열었으면 '추가됐어요' 표시는 한 번만 */
export async function markArchiveSeen(id: string) {
  const supabase = await createClient();
  await supabase.from("mood_archive").update({ seen_at: new Date().toISOString() }).eq("id", id).is("seen_at", null);
}

/** 거래 화면에서 '내 옷장에 추가됐어요' 카드로 연결하기 위한 id */
export async function getArchiveIdForRental(rentalId: string): Promise<string | null> {
  if (!hasSupabase()) return null;
  const supabase = await createClient();
  const { data } = await supabase.from("mood_archive").select("id").eq("rental_id", rentalId).maybeSingle();
  return data?.id ?? null;
}
