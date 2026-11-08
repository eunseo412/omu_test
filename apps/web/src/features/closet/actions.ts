"use server";

import { MAX_ITEM_IMAGES, itemInputSchema } from "@omu/core";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type CreateItemResult =
  | { ok: true; id: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

/** 옷 등록. 사진은 클라이언트가 Storage `items/{uid}/...`에 먼저 올리고 경로만 넘긴다. */
export async function createItem(raw: unknown, imagePaths: string[]): Promise<CreateItemResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요해요." };

  const parsed = itemInputSchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0])] ??= issue.message;
    return { ok: false, error: "입력값을 확인해 주세요.", fieldErrors };
  }
  if (imagePaths.length < 1 || imagePaths.length > MAX_ITEM_IMAGES) {
    return { ok: false, error: `사진은 1~${MAX_ITEM_IMAGES}장 올려주세요.` };
  }
  if (!imagePaths.every((p) => p.startsWith(`${user.id}/`))) {
    return { ok: false, error: "잘못된 이미지 경로입니다." };
  }

  const v = parsed.data;
  const { data: item, error } = await supabase
    .from("items")
    .insert({
      owner_id: user.id,
      title: v.title,
      description: v.description,
      category: v.category,
      size: v.size,
      brand: v.brand || null,
      style_tags: v.styleTags,
      price_per_day: v.pricePerDay,
      deposit: v.deposit,
      min_days: v.minDays,
      max_days: v.maxDays,
      for_sale: v.forSale,
      handoff_methods: v.handoffMethods,
    })
    .select("id")
    .single();
  if (error || !item) return { ok: false, error: `등록에 실패했어요. (${error?.message ?? "unknown"})` };

  const { error: imgError } = await supabase
    .from("item_images")
    .insert(imagePaths.map((path, i) => ({ item_id: item.id, path, sort_order: i })));
  if (imgError) {
    await supabase.from("items").delete().eq("id", item.id);
    return { ok: false, error: `사진 저장에 실패했어요. (${imgError.message})` };
  }

  revalidatePath("/");
  return { ok: true, id: item.id };
}
