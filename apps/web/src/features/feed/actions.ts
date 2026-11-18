"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

/** 하트(관심) 토글. 로그인 안 했으면 login_required */
export async function toggleLike(itemId: string, like: boolean): Promise<{ ok: boolean; error?: string }> {
  if (itemId.startsWith("sample-")) return { ok: false, error: "sample" };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "login_required" };
  const { error } = like
    ? await supabase.from("item_likes").upsert({ user_id: user.id, item_id: itemId }, { ignoreDuplicates: true })
    : await supabase.from("item_likes").delete().eq("user_id", user.id).eq("item_id", itemId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/likes");
  return { ok: true };
}
