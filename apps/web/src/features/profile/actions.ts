"use server";

import { profileInputSchema } from "@omu/core";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type ActionResult = { ok: true; handle?: string } | { ok: false; error: string; fieldErrors?: Record<string, string> };

export async function toggleFollow(targetId: string, follow: boolean): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "login_required" };
  if (user.id === targetId) return { ok: false, error: "자기 자신은 팔로우할 수 없어요." };

  const { error } = follow
    ? await supabase.from("follows").upsert({ follower_id: user.id, followee_id: targetId }, { ignoreDuplicates: true })
    : await supabase.from("follows").delete().eq("follower_id", user.id).eq("followee_id", targetId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/u/[handle]", "page");
  revalidatePath("/");
  return { ok: true };
}

export async function updateProfile(raw: unknown): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요해요." };

  const parsed = profileInputSchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const i of parsed.error.issues) fieldErrors[String(i.path[0])] ??= i.message;
    return { ok: false, error: "입력값을 확인해 주세요.", fieldErrors };
  }
  const v = parsed.data;
  if (v.avatarPath && !v.avatarPath.startsWith(`${user.id}/`)) return { ok: false, error: "잘못된 이미지 경로입니다." };

  const { error } = await supabase
    .from("profiles")
    .update({
      display_name: v.displayName,
      handle: v.handle,
      bio: v.bio,
      style_tags: v.styleTags,
      height_cm: v.heightCm,
      top_size: v.topSize,
      bottom_size: v.bottomSize,
      shoe_size: v.shoeSize,
      avatar_url: v.avatarPath,
    })
    .eq("id", user.id);
  if (error) {
    if (error.code === "23505") return { ok: false, error: "입력값을 확인해 주세요.", fieldErrors: { handle: "이미 사용 중인 아이디예요." } };
    return { ok: false, error: `저장에 실패했어요. (${error.message})` };
  }
  revalidatePath("/", "layout");
  return { ok: true, handle: v.handle };
}
