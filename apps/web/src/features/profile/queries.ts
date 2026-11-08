import "server-only";
import { createClient } from "@/lib/supabase/server";
import { hasSupabase, publicImageUrl } from "@/lib/env";
import { SAMPLE_HOME, SAMPLE_ITEMS, TONES } from "@/features/feed/sample";
import type { ProfileData } from "./types";

function sampleProfile(handle: string): ProfileData | null {
  const c = SAMPLE_HOME.popularClosets.find((x) => x.handle === handle);
  if (!c) return null;
  const items = SAMPLE_ITEMS.filter((i) => i.owner.handle === handle);
  return {
    id: `sample-${handle}`, handle, displayName: c.displayName,
    bio: "샘플 옷장입니다. 실제 사용자가 가입하면 이렇게 보여요.",
    avatarUrl: null, styleTags: c.styleTags, heightCm: 172, topSize: "M", bottomSize: "M", shoeSize: 265,
    trustTemp: c.trustTemp, isVerifiedStudent: true, followerCount: 24, followingCount: 12,
    items: [...items, ...items, ...items].map((i, k) => ({
      id: i.id, title: i.title, pricePerDay: i.pricePerDay, imageUrl: null, tone: TONES[(k * 5) % TONES.length], hidden: false,
    })),
    isMe: false, isFollowing: false, isLoggedIn: false, isSample: true,
  };
}

export async function getProfile(handle: string): Promise<ProfileData | null> {
  if (!hasSupabase()) return sampleProfile(handle);
  const supabase = await createClient();

  const { data: p } = await supabase
    .from("profiles")
    .select("id,handle,display_name,bio,avatar_url,style_tags,height_cm,top_size,bottom_size,shoe_size,trust_temp,is_verified_student")
    .eq("handle", handle)
    .maybeSingle();
  if (!p) return sampleProfile(handle);

  const { data: { user } } = await supabase.auth.getUser();
  const isMe = user?.id === p.id;

  const [itemsRes, followers, following, followRow] = await Promise.all([
    supabase
      .from("items")
      .select("id,title,price_per_day,status,item_images(path,sort_order)")
      .eq("owner_id", p.id)
      .neq("status", "deleted")
      .order("created_at", { ascending: false }),
    supabase.from("follows").select("*", { count: "exact", head: true }).eq("followee_id", p.id),
    supabase.from("follows").select("*", { count: "exact", head: true }).eq("follower_id", p.id),
    user && !isMe
      ? supabase.from("follows").select("follower_id").eq("follower_id", user.id).eq("followee_id", p.id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  type Row = { id: string; title: string; price_per_day: number; status: string; item_images: { path: string; sort_order: number }[] };
  const items = ((itemsRes.data ?? []) as Row[]).map((r, i) => {
    const first = [...(r.item_images ?? [])].sort((a, b) => a.sort_order - b.sort_order)[0];
    return {
      id: r.id,
      title: r.title,
      pricePerDay: r.price_per_day,
      imageUrl: publicImageUrl("items", first?.path),
      tone: TONES[(i * 5) % TONES.length],
      hidden: r.status !== "active",
    };
  });

  return {
    id: p.id,
    handle: p.handle,
    displayName: p.display_name,
    bio: p.bio ?? "",
    avatarUrl: publicImageUrl("avatars", p.avatar_url),
    styleTags: p.style_tags ?? [],
    heightCm: p.height_cm,
    topSize: p.top_size,
    bottomSize: p.bottom_size,
    shoeSize: p.shoe_size,
    trustTemp: Number(p.trust_temp),
    isVerifiedStudent: p.is_verified_student,
    followerCount: followers.count ?? 0,
    followingCount: following.count ?? 0,
    items,
    isMe,
    isFollowing: Boolean(followRow.data),
    isLoggedIn: Boolean(user),
    isSample: false,
  };
}

/** 프로필 편집 화면용: 로그인한 사용자의 현재 값 (경로 그대로) */
export async function getMyProfileForEdit() {
  if (!hasSupabase()) return null;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from("profiles")
    .select("handle,display_name,bio,avatar_url,style_tags,height_cm,top_size,bottom_size,shoe_size")
    .eq("id", user.id)
    .maybeSingle();
  if (!data) return null;
  return { userId: user.id, ...data, avatarPublicUrl: publicImageUrl("avatars", data.avatar_url) };
}
