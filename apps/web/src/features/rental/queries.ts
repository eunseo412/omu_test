import "server-only";
import { isMyTurn, type RentalStatus } from "@omu/core";
import { createClient } from "@/lib/supabase/server";
import { hasSupabase, publicImageUrl } from "@/lib/env";
import type { RentalDetail, RentalListItem } from "./types";

type ImgRow = { path: string; sort_order: number };
const firstImage = (imgs: ImgRow[] | null | undefined) =>
  publicImageUrl("items", [...(imgs ?? [])].sort((a, b) => a.sort_order - b.sort_order)[0]?.path);

export async function getBookedRanges(itemId: string): Promise<{ start: string; end: string }[]> {
  if (!hasSupabase() || itemId.startsWith("sample-")) return [];
  const supabase = await createClient();
  const { data } = await supabase.rpc("item_booked_ranges", { p_item_id: itemId });
  return ((data ?? []) as { start_date: string; end_date: string }[]).map((r) => ({ start: r.start_date, end: r.end_date }));
}

const LIST_SELECT =
  "id,status,owner_id,renter_id,start_date,end_date,fee_total,updated_at," +
  "item:items(title,item_images(path,sort_order))," +
  "owner:profiles!rentals_owner_id_fkey(handle,display_name)," +
  "renter:profiles!rentals_renter_id_fkey(handle,display_name)";

type ListRow = {
  id: string; status: RentalStatus; owner_id: string; renter_id: string; start_date: string; end_date: string;
  fee_total: number; updated_at: string;
  item: { title: string; item_images: ImgRow[] } | null;
  owner: { handle: string; display_name: string } | null;
  renter: { handle: string; display_name: string } | null;
};

export async function getMyRentals(): Promise<{ borrowed: RentalListItem[]; lent: RentalListItem[] } | null> {
  if (!hasSupabase()) return null;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("rentals")
    .select(LIST_SELECT)
    .or(`owner_id.eq.${user.id},renter_id.eq.${user.id}`)
    .order("updated_at", { ascending: false })
    .limit(100);

  const rows = ((data ?? []) as unknown as ListRow[]).map((r): RentalListItem => {
    const role = r.owner_id === user.id ? "owner" : "renter";
    const other = role === "owner" ? r.renter : r.owner;
    return {
      id: r.id,
      status: r.status,
      role,
      startDate: r.start_date,
      endDate: r.end_date,
      feeTotal: r.fee_total,
      itemTitle: r.item?.title ?? "(삭제된 옷)",
      itemImage: firstImage(r.item?.item_images),
      counterpart: { handle: other?.handle ?? "", displayName: other?.display_name ?? "" },
      myTurn: isMyTurn(r.status, role),
      updatedAt: r.updated_at,
    };
  });
  const sort = (a: RentalListItem, b: RentalListItem) => Number(b.myTurn) - Number(a.myTurn) || b.updatedAt.localeCompare(a.updatedAt);
  return {
    borrowed: rows.filter((r) => r.role === "renter").sort(sort),
    lent: rows.filter((r) => r.role === "owner").sort(sort),
  };
}

export async function getRental(id: string): Promise<RentalDetail | null> {
  if (!hasSupabase()) return null;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: r } = await supabase
    .from("rentals")
    .select(
      "id,status,owner_id,renter_id,start_date,end_date,handoff_method,price_per_day,fee_total,deposit," +
        "item:items(id,title,item_images(path,sort_order))," +
        "owner:profiles!rentals_owner_id_fkey(id,handle,display_name,avatar_url,trust_temp)," +
        "renter:profiles!rentals_renter_id_fkey(id,handle,display_name,avatar_url,trust_temp)",
    )
    .eq("id", id)
    .maybeSingle();
  if (!r) return null;

  type P = { id: string; handle: string; display_name: string; avatar_url: string | null; trust_temp: number };
  const row = r as unknown as {
    id: string; status: RentalStatus; owner_id: string; renter_id: string; start_date: string; end_date: string;
    handoff_method: string; price_per_day: number; fee_total: number; deposit: number;
    item: { id: string; title: string; item_images: ImgRow[] } | null; owner: P; renter: P;
  };
  const role = row.owner_id === user.id ? "owner" : "renter";
  const other = role === "owner" ? row.renter : row.owner;

  const [eventsRes, messagesRes, reviewRes] = await Promise.all([
    supabase.from("rental_events").select("id,actor_id,from_status,to_status,note,photo_paths,created_at").eq("rental_id", id).order("id"),
    supabase.from("messages").select("id,sender_id,body,created_at").eq("rental_id", id).order("id").limit(300),
    supabase.from("reviews").select("id").eq("rental_id", id).eq("reviewer_id", user.id).maybeSingle(),
  ]);

  type E = { id: number; actor_id: string | null; from_status: RentalStatus | null; to_status: RentalStatus; note: string | null; photo_paths: string[]; created_at: string };
  const events = (eventsRes.data ?? []) as E[];
  const paths = events.flatMap((e) => e.photo_paths ?? []);
  const signed = new Map<string, string>();
  if (paths.length) {
    const { data } = await supabase.storage.from("rental-proofs").createSignedUrls(paths, 60 * 60);
    for (const s of data ?? []) if (s.path && s.signedUrl) signed.set(s.path, s.signedUrl);
  }

  return {
    id: row.id,
    status: row.status,
    role,
    myId: user.id,
    startDate: row.start_date,
    endDate: row.end_date,
    handoffMethod: row.handoff_method,
    pricePerDay: row.price_per_day,
    feeTotal: row.fee_total,
    deposit: row.deposit,
    item: { id: row.item?.id ?? "", title: row.item?.title ?? "(삭제된 옷)", imageUrl: firstImage(row.item?.item_images) },
    counterpart: {
      id: other.id, handle: other.handle, displayName: other.display_name,
      avatarUrl: publicImageUrl("avatars", other.avatar_url), trustTemp: Number(other.trust_temp),
    },
    events: events.map((e) => ({
      id: e.id, actorId: e.actor_id, from: e.from_status, to: e.to_status, note: e.note, createdAt: e.created_at,
      photos: (e.photo_paths ?? []).map((p) => signed.get(p)).filter((u): u is string => Boolean(u)),
    })),
    messages: ((messagesRes.data ?? []) as { id: number; sender_id: string; body: string; created_at: string }[]).map((m) => ({
      id: m.id, senderId: m.sender_id, body: m.body, createdAt: m.created_at,
    })),
    myReviewDone: Boolean(reviewRes.data),
  };
}
