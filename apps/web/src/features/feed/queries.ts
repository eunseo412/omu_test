import "server-only";
import { HEIGHT_RANGES, STYLE_TAGS, WEIGHT_RANGES, rangeOf, type Gender } from "@omu/core";
import { createClient, getAuthUser } from "@/lib/supabase/server";
import { hasSupabase, publicImageUrl } from "@/lib/env";
import { SAMPLE_ITEMS, TONES } from "./sample";
import type { ItemCardData } from "./types";

const ITEM_SELECT =
  "id,title,brand,size,price_per_day,style_tags,created_at," +
  "item_images(path,sort_order),owner:profiles!items_owner_id_fkey(handle,display_name,avatar_url)";

type ItemRow = {
  id: string;
  title: string;
  brand: string | null;
  size: string;
  price_per_day: number;
  style_tags: string[];
  item_images: { path: string; sort_order: number }[];
  owner: { handle: string; display_name: string; avatar_url: string | null } | null;
};

function toCard(r: ItemRow, i: number): ItemCardData {
  const first = [...(r.item_images ?? [])].sort((a, b) => a.sort_order - b.sort_order)[0];
  return {
    id: r.id,
    title: r.title,
    brand: r.brand,
    size: r.size,
    pricePerDay: r.price_per_day,
    styleTags: r.style_tags ?? [],
    imageUrl: publicImageUrl("items", first?.path),
    tone: TONES[i % TONES.length],
    owner: {
      handle: r.owner?.handle ?? "",
      displayName: r.owner?.display_name ?? "",
      avatarUrl: publicImageUrl("avatars", r.owner?.avatar_url),
    },
  };
}

export type DiscoverResult = { items: ItemCardData[]; likedIds: string[]; isSample: boolean; isLoggedIn: boolean };

/** 홈 체형 필터 (옷장 주인 기준). 값은 core의 HEIGHT_RANGES·WEIGHT_RANGES 키 */
export type BodyFilter = { gender: Gender | null; height: string | null; weight: string | null };
export const hasBodyFilter = (f?: BodyFilter | null) => Boolean(f && (f.gender || f.height || f.weight));

/** 검색어에서 PostgREST 필터 문법을 깨는 문자 제거 */
const cleanQuery = (q: string) => q.replace(/[,()%*\\:"']/g, " ").trim().slice(0, 40);

/** 발견 탭: 최신 옷 사진 피드. 스타일 태그·검색어로 거르기 */
export async function getDiscover({ tag, q, body }: { tag?: string | null; q?: string | null; body?: BodyFilter | null }): Promise<DiscoverResult> {
  const query = q ? cleanQuery(q) : "";
  const tagFromQuery = (STYLE_TAGS as readonly string[]).find((t) => t === query.replace(/^#/, ""));
  const activeTag = tag ?? tagFromQuery ?? null;

  if (!hasSupabase()) {
    let items = SAMPLE_ITEMS;
    if (activeTag) items = items.filter((i) => i.styleTags.includes(activeTag));
    else if (query) items = items.filter((i) => `${i.title} ${i.brand ?? ""}`.includes(query));
    return { items, likedIds: [], isSample: true, isLoggedIn: false };
  }

  const supabase = await createClient();
  let req = supabase.from("items").select(ITEM_SELECT).eq("status", "active").order("created_at", { ascending: false }).limit(60);

  // 체형 필터: 조건에 맞는 옷장 주인을 먼저 찾고 그 사람들의 옷만
  if (hasBodyFilter(body)) {
    const h = rangeOf(HEIGHT_RANGES, body!.height);
    const w = rangeOf(WEIGHT_RANGES, body!.weight);
    const { data: owners } = await supabase.rpc("owners_by_body", {
      p_gender: body!.gender, p_height_min: h?.min ?? null, p_height_max: h?.max ?? null,
      p_weight_min: w?.min ?? null, p_weight_max: w?.max ?? null,
    });
    const ids = (owners ?? []) as string[];
    if (!ids.length) return { items: [], likedIds: [], isSample: false, isLoggedIn: Boolean(await getAuthUser()) };
    req = req.in("owner_id", ids);
  }
  if (activeTag) req = req.contains("style_tags", [activeTag]);
  else if (query) req = req.or(`title.ilike.%${query}%,brand.ilike.%${query}%`);
  const [{ data, error }, user] = await Promise.all([req, getAuthUser()]);
  const items = ((data ?? []) as unknown as ItemRow[]).map(toCard);

  // 아직 등록된 옷이 하나도 없을 때만 샘플을 보여준다 (검색 결과 0개는 그대로 빈 화면)
  if (!error && items.length === 0 && !activeTag && !query && !hasBodyFilter(body)) {
    return { items: SAMPLE_ITEMS, likedIds: [], isSample: true, isLoggedIn: Boolean(user) };
  }
  let likedIds: string[] = [];
  if (user && items.length) {
    const { data: likes } = await supabase.from("item_likes").select("item_id").eq("user_id", user.id).in("item_id", items.map((i) => i.id));
    likedIds = (likes ?? []).map((l) => l.item_id);
  }
  return { items, likedIds, isSample: false, isLoggedIn: Boolean(user) };
}

/** 관심 옷장 탭: 하트 누른 옷 + 팔로우한 옷장 */
export async function getFavorites() {
  if (!hasSupabase()) return null;
  const supabase = await createClient();
  const user = await getAuthUser();
  if (!user) return null;

  const [likesRes, followsRes] = await Promise.all([
    supabase.from("item_likes").select(`created_at,item:items(${ITEM_SELECT})`).eq("user_id", user.id).order("created_at", { ascending: false }).limit(100),
    supabase
      .from("follows")
      .select("created_at,followee:profiles!follows_followee_id_fkey(id,handle,display_name,avatar_url,style_tags)")
      .eq("follower_id", user.id)
      .order("created_at", { ascending: false }),
  ]);

  type LikeRow = { item: (ItemRow & { status?: string }) | null };
  const items = ((likesRes.data ?? []) as unknown as LikeRow[]).filter((l) => l.item).map((l, i) => toCard(l.item!, i));

  type FollowRow = { followee: { id: string; handle: string; display_name: string; avatar_url: string | null; style_tags: string[] } | null };
  const followees = ((followsRes.data ?? []) as unknown as FollowRow[]).map((f) => f.followee).filter((f): f is NonNullable<typeof f> => Boolean(f));

  // 팔로우한 옷장의 최근 옷 사진 3장씩
  const previews = new Map<string, (string | null)[]>();
  if (followees.length) {
    const { data: recent } = await supabase
      .from("items")
      .select("owner_id,item_images(path,sort_order)")
      .in("owner_id", followees.map((f) => f.id))
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(followees.length * 6);
    for (const r of (recent ?? []) as { owner_id: string; item_images: { path: string; sort_order: number }[] }[]) {
      const list = previews.get(r.owner_id) ?? [];
      if (list.length < 3) {
        const first = [...(r.item_images ?? [])].sort((a, b) => a.sort_order - b.sort_order)[0];
        list.push(publicImageUrl("items", first?.path));
        previews.set(r.owner_id, list);
      }
    }
  }

  return {
    items,
    closets: followees.map((f, i) => ({
      handle: f.handle,
      displayName: f.display_name,
      avatarUrl: publicImageUrl("avatars", f.avatar_url),
      styleTags: f.style_tags ?? [],
      previewImages: previews.get(f.id) ?? [],
      tone: TONES[(i * 5) % TONES.length],
    })),
  };
}

export type ItemDetail = ItemCardData & {
  description: string;
  category: string;
  deposit: number;
  minDays: number;
  maxDays: number;
  handoffMethods: string[];
  images: string[];
  ownerTrustTemp: number;
  ownerId: string;
  isMine: boolean;
  liked: boolean;
  status: "active" | "hidden";
};

export async function getItem(id: string): Promise<ItemDetail | null> {
  if (id.startsWith("sample-")) {
    const s = SAMPLE_ITEMS.find((i) => i.id === id);
    if (!s) return null;
    return { ...s, description: "샘플 아이템입니다. 실제 옷이 등록되면 이 자리에 설명이 표시됩니다.", category: "top", deposit: 30000, minDays: 1, maxDays: 7, handoffMethods: ["in_person"], images: [], ownerTrustTemp: 37.2, ownerId: "", isMine: false, liked: false, status: "active" };
  }
  if (!hasSupabase()) return null;
  const supabase = await createClient();
  const user = await getAuthUser();
  // 옷 정보와 '내가 하트했는지'를 동시에 조회
  const [{ data }, likeRes] = await Promise.all([
    supabase
    .from("items")
    .select(
      "id,title,brand,size,price_per_day,style_tags,description,category,deposit,min_days,max_days,handoff_methods,status," +
        "owner_id,item_images(path,sort_order),owner:profiles!items_owner_id_fkey(handle,display_name,avatar_url,trust_temp)",
    )
    .eq("id", id)
    .neq("status", "deleted")
    .maybeSingle(),
    user ? supabase.from("item_likes").select("item_id").eq("user_id", user.id).eq("item_id", id).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  if (!data) return null;
  const r = data as unknown as ItemRow & {
    owner_id: string; status: "active" | "hidden"; description: string; category: string; deposit: number; min_days: number; max_days: number; handoff_methods: string[];
    owner: ItemRow["owner"] & { trust_temp: number };
  };
  const card = toCard(r, 0);
  const liked = Boolean(likeRes.data);
  return {
    ...card,
    description: r.description,
    category: r.category,
    deposit: r.deposit,
    minDays: r.min_days,
    maxDays: r.max_days,
    handoffMethods: r.handoff_methods,
    images: [...r.item_images].sort((a, b) => a.sort_order - b.sort_order).map((im) => publicImageUrl("items", im.path)!),
    ownerTrustTemp: Number(r.owner?.trust_temp ?? 36.5),
    ownerId: r.owner_id,
    isMine: user?.id === r.owner_id,
    liked,
    status: r.status,
  };
}

/** '나와 비슷한 체형' 바로가기용: 로그인한 사람의 성별·키·몸무게 */
export async function getMyBody(): Promise<{ gender: Gender | null; heightCm: number | null; weightKg: number | null } | null> {
  if (!hasSupabase()) return null;
  const user = await getAuthUser();
  if (!user) return null;
  const supabase = await createClient();
  const { data } = await supabase.rpc("get_my_body");
  const b = (Array.isArray(data) ? data[0] : data) as { gender: Gender | null; height_cm: number | null; weight_kg: number | null } | null;
  return b ? { gender: b.gender, heightCm: b.height_cm, weightKg: b.weight_kg } : null;
}
