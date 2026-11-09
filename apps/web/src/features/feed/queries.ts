import "server-only";
import { STYLE_TAGS } from "@omu/core";
import { createClient } from "@/lib/supabase/server";
import { hasSupabase, publicImageUrl } from "@/lib/env";
import { SAMPLE_HOME, SAMPLE_ITEMS, TONES } from "./sample";
import type { HomeData, ItemCardData } from "./types";

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

export async function getHomeData(): Promise<HomeData> {
  if (!hasSupabase()) return SAMPLE_HOME;
  const supabase = await createClient();

  const { data: items, error } = await supabase
    .from("items")
    .select(ITEM_SELECT)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(40);
  if (error || !items?.length) return SAMPLE_HOME;
  const cards = (items as unknown as ItemRow[]).map(toCard);

  // 옷장(사람) 단위로 묶기: 아이템 많은 순
  const byOwner = new Map<string, ItemCardData[]>();
  for (const c of cards) byOwner.set(c.owner.handle, [...(byOwner.get(c.owner.handle) ?? []), c]);
  const handles = [...byOwner.keys()];
  const { data: profiles } = await supabase
    .from("profiles")
    .select("handle,display_name,avatar_url,style_tags,trust_temp")
    .in("handle", handles);

  const popularClosets = (profiles ?? [])
    .map((p, i) => {
      const its = byOwner.get(p.handle) ?? [];
      return {
        handle: p.handle,
        displayName: p.display_name,
        avatarUrl: publicImageUrl("avatars", p.avatar_url),
        styleTags: p.style_tags ?? [],
        trustTemp: Number(p.trust_temp),
        previewImages: its.slice(0, 3).map((c) => c.imageUrl),
        tones: [0, 4, 8].map((k) => TONES[(i + k) % TONES.length]),
        _n: its.length,
      };
    })
    .sort((a, b) => b._n - a._n)
    .map((c) => ({ ...c, _n: undefined }));

  const collections = STYLE_TAGS.map((tag, i) => {
    const tagged = cards.filter((c) => c.styleTags.includes(tag));
    return { tag, imageUrl: tagged.find((c) => c.imageUrl)?.imageUrl ?? null, tone: TONES[(i * 5) % 12], count: tagged.length };
  }).sort((a, b) => b.count - a.count).slice(0, 8);

  return {
    isSample: false,
    newItems: cards.slice(0, 10),
    popularClosets,
    collections,
    feed: cards,
  };
}

export async function getItemsByTag(tag: string | null): Promise<{ items: ItemCardData[]; isSample: boolean }> {
  if (!hasSupabase()) {
    return { items: tag ? SAMPLE_ITEMS.filter((i) => i.styleTags.includes(tag)) : SAMPLE_ITEMS, isSample: true };
  }
  const supabase = await createClient();
  let q = supabase.from("items").select(ITEM_SELECT).eq("status", "active").order("created_at", { ascending: false }).limit(60);
  if (tag) q = q.contains("style_tags", [tag]);
  const { data } = await q;
  return { items: ((data ?? []) as unknown as ItemRow[]).map(toCard), isSample: false };
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
};

export async function getItem(id: string): Promise<ItemDetail | null> {
  if (id.startsWith("sample-")) {
    const s = SAMPLE_ITEMS.find((i) => i.id === id);
    if (!s) return null;
    return { ...s, description: "샘플 아이템입니다. 실제 옷이 등록되면 이 자리에 설명이 표시됩니다.", category: "top", deposit: 30000, minDays: 1, maxDays: 7, handoffMethods: ["in_person"], images: [], ownerTrustTemp: 37.2, ownerId: "", isMine: false };
  }
  if (!hasSupabase()) return null;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data } = await supabase
    .from("items")
    .select(
      "id,title,brand,size,price_per_day,style_tags,description,category,deposit,min_days,max_days,handoff_methods," +
        "owner_id,item_images(path,sort_order),owner:profiles!items_owner_id_fkey(handle,display_name,avatar_url,trust_temp)",
    )
    .eq("id", id)
    .maybeSingle();
  if (!data) return null;
  const r = data as unknown as ItemRow & {
    owner_id: string; description: string; category: string; deposit: number; min_days: number; max_days: number; handoff_methods: string[];
    owner: ItemRow["owner"] & { trust_temp: number };
  };
  const card = toCard(r, 0);
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
  };
}
