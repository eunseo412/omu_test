"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

/** 카드별 숨기기: 숨기면 다른 사람에게 안 보이고 나만 볼 수 있다 */
export async function setArchiveHidden(id: string, hidden: boolean): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요해요." };
  const { data, error } = await supabase.from("mood_archive").update({ hidden }).eq("id", id).eq("user_id", user.id).select("id");
  if (error || !data?.length) return { ok: false, error: "처리하지 못했어요." };
  revalidatePath(`/archive/${id}`);
  revalidatePath("/u/[handle]", "page");
  return { ok: true };
}
