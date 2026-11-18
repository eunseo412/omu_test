import "server-only";
import { createClient } from "@/lib/supabase/server";
import { hasSupabase, publicImageUrl } from "@/lib/env";
import type { ItemFormInitial } from "./components/item-form";

/** 수정 화면용: 내 옷이면 원래 값과 사진 경로를 돌려준다 */
export async function getItemForEdit(id: string): Promise<ItemFormInitial | "not_mine" | null> {
  if (!hasSupabase()) return null;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from("items")
    .select("id,owner_id,status,title,description,category,size,brand,style_tags,price_per_day,deposit,min_days,max_days,for_sale,handoff_methods,item_images(path,sort_order)")
    .eq("id", id)
    .neq("status", "deleted")
    .maybeSingle();
  if (!data) return null;
  if (data.owner_id !== user.id) return "not_mine";
  const images = [...((data.item_images ?? []) as { path: string; sort_order: number }[])]
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((im) => ({ path: im.path, url: publicImageUrl("items", im.path)! }));
  return {
    id: data.id,
    title: data.title,
    description: data.description ?? "",
    category: data.category,
    size: data.size,
    brand: data.brand,
    styleTags: data.style_tags ?? [],
    pricePerDay: data.price_per_day,
    deposit: data.deposit,
    minDays: data.min_days,
    maxDays: data.max_days,
    forSale: data.for_sale,
    handoffMethods: data.handoff_methods ?? ["in_person"],
    images,
  };
}
