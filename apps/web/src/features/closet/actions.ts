"use server";

import { MAX_ITEM_IMAGES, itemInputSchema } from "@omu/core";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { pushLatestNotification } from "@/features/notifications/push";

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

/** 내 옷 수정. 사진 목록은 최종 순서대로(기존+새로 올린 경로) 받아 통째로 교체하고, 빠진 사진 파일은 지운다 */
export async function updateItem(itemId: string, raw: unknown, imagePaths: string[]): Promise<CreateItemResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요해요." };

  const parsed = itemInputSchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0])] ??= issue.message;
    return { ok: false, error: "입력값을 확인해 주세요.", fieldErrors };
  }
  if (imagePaths.length < 1 || imagePaths.length > MAX_ITEM_IMAGES) return { ok: false, error: `사진은 1~${MAX_ITEM_IMAGES}장 올려주세요.` };
  if (!imagePaths.every((p) => p.startsWith(`${user.id}/`))) return { ok: false, error: "잘못된 이미지 경로입니다." };

  const { data: item } = await supabase.from("items").select("id,owner_id,status,item_images(path)").eq("id", itemId).maybeSingle();
  if (!item || item.owner_id !== user.id || item.status === "deleted") return { ok: false, error: "수정할 수 없는 옷이에요." };

  const v = parsed.data;
  const { error } = await supabase
    .from("items")
    .update({
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
    .eq("id", itemId);
  if (error) return { ok: false, error: `저장에 실패했어요. (${error.message})` };

  // 사진: 새 목록을 먼저 넣고 → 예전 행 삭제 (중간에 실패해도 사진이 0장이 되지 않게)
  const oldPaths = ((item.item_images ?? []) as { path: string }[]).map((i) => i.path);
  const { data: inserted, error: insError } = await supabase
    .from("item_images")
    .insert(imagePaths.map((path, i) => ({ item_id: itemId, path, sort_order: i })))
    .select("id");
  if (insError) return { ok: false, error: `사진 저장에 실패했어요. (${insError.message})` };
  const keepIds = (inserted ?? []).map((r) => r.id);
  await supabase.from("item_images").delete().eq("item_id", itemId).not("id", "in", `(${keepIds.join(",")})`);

  const removed = oldPaths.filter((p) => !imagePaths.includes(p) && p.startsWith(`${user.id}/`));
  if (removed.length) await supabase.storage.from("items").remove(removed);

  revalidatePath("/");
  revalidatePath(`/items/${itemId}`);
  return { ok: true, id: itemId };
}

export type ItemActionResult = { ok: true } | { ok: false; error: string };

/** 숨기기/다시 보이기: 숨기면 다른 사람에게 안 보이고 새 대여 신청도 받지 않는다 */
export async function setItemHidden(itemId: string, hidden: boolean): Promise<ItemActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요해요." };
  const { data, error } = await supabase
    .from("items")
    .update({ status: hidden ? "hidden" : "active" })
    .eq("id", itemId)
    .eq("owner_id", user.id)
    .neq("status", "deleted")
    .select("id");
  if (error || !data?.length) return { ok: false, error: "처리하지 못했어요." };
  revalidatePath("/");
  revalidatePath(`/items/${itemId}`);
  return { ok: true };
}

/**
 * 삭제: 진행 중인 거래가 있으면 막고, 수락 대기 중인 신청은 자동 취소(상대에게 알림)한 뒤
 * 상태를 deleted로 바꾼다. 지난 거래 기록·분쟁 확인을 위해 행과 사진은 남겨둔다.
 */
export async function deleteItem(itemId: string): Promise<ItemActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요해요." };

  const { data: item } = await supabase.from("items").select("id,owner_id").eq("id", itemId).maybeSingle();
  if (!item || item.owner_id !== user.id) return { ok: false, error: "삭제할 수 없는 옷이에요." };

  const { data: open } = await supabase
    .from("rentals")
    .select("id,status,renter_id")
    .eq("item_id", itemId)
    .in("status", ["requested", "accepted", "handed_over", "returned", "disputed"]);
  if ((open ?? []).some((r) => r.status !== "requested")) {
    return { ok: false, error: "진행 중인 거래가 있어 삭제할 수 없어요. 거래가 끝난 뒤 삭제하거나, 지금은 숨기기를 이용해 주세요." };
  }
  for (const r of open ?? []) {
    const { error } = await supabase.rpc("transition_rental", { p_rental_id: r.id, p_to: "cancelled", p_note: "옷장 주인이 옷을 삭제했어요", p_photos: [] });
    if (!error) pushLatestNotification(r.renter_id, r.id); // 신청자에게 취소 알림
  }

  const { error } = await supabase.from("items").update({ status: "deleted" }).eq("id", itemId).eq("owner_id", user.id);
  if (error) return { ok: false, error: "삭제하지 못했어요." };
  revalidatePath("/");
  revalidatePath("/rentals");
  return { ok: true };
}
