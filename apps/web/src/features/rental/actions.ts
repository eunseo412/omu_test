"use server";

import { RENTAL_STATUSES, rentalRequestSchema, reviewInputSchema, type RentalStatus } from "@omu/core";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { pushLatestNotification } from "@/features/notifications/push";

/** 거래 상대(알림 받을 사람) 찾기 — 당사자만 rentals를 읽을 수 있다 */
async function counterpartOf(supabase: Awaited<ReturnType<typeof createClient>>, rentalId: string, me: string) {
  const { data } = await supabase.from("rentals").select("owner_id,renter_id").eq("id", rentalId).maybeSingle();
  if (!data) return null;
  return data.owner_id === me ? data.renter_id : data.owner_id;
}

export type Result<T = undefined> = { ok: true; data?: T } | { ok: false; error: string };

/** DB 함수가 던지는 영문 에러 → 사용자 문구 */
function friendly(message: string): string {
  const map: [string, string][] = [
    ["login required", "로그인이 필요해요."],
    ["item not available", "지금은 빌릴 수 없는 옷이에요."],
    ["cannot rent own item", "내 옷은 빌릴 수 없어요."],
    ["start date in past", "시작일은 오늘 이후로 골라주세요."],
    ["invalid handoff method", "선택할 수 없는 전달 방법이에요."],
    ["invalid rental period", "대여 기간이 이 옷의 최소·최대 대여일을 벗어나요."],
    ["dates unavailable", "이미 예약된 날짜가 포함돼 있어요."],
    ["duplicate request", "이미 이 옷에 수락 대기 중인 신청이 있어요."],
    ["not allowed", "지금 상태에서는 할 수 없는 동작이에요. 새로고침해 주세요."],
    ["not a party", "이 거래의 당사자가 아니에요."],
    ["already reviewed", "이미 평가를 남겼어요."],
    ["rental not completed", "거래가 완료된 뒤에 평가할 수 있어요."],
  ];
  return map.find(([k]) => message.includes(k))?.[1] ?? `처리에 실패했어요. (${message})`;
}

export async function requestRental(raw: unknown): Promise<Result<{ id: string }>> {
  const parsed = rentalRequestSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "입력값을 확인해 주세요." };
  const v = parsed.data;
  if (v.endDate < v.startDate) return { ok: false, error: "반납일이 시작일보다 빠를 수 없어요." };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("request_rental", {
    p_item_id: v.itemId,
    p_start: v.startDate,
    p_end: v.endDate,
    p_handoff: v.handoffMethod,
    p_message: v.message?.trim() || null,
  });
  if (error) return { ok: false, error: friendly(error.message) };
  const rentalId = data as string;
  const { data: { user } } = await supabase.auth.getUser();
  const to = user ? await counterpartOf(supabase, rentalId, user.id) : null;
  if (to) pushLatestNotification(to, rentalId);
  revalidatePath("/rentals");
  return { ok: true, data: { id: rentalId } };
}

export async function transitionRental(
  rentalId: string, to: RentalStatus, note: string | null, photoPaths: string[],
): Promise<Result> {
  if (!RENTAL_STATUSES.includes(to)) return { ok: false, error: "잘못된 상태예요." };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요해요." };
  // 인증 사진은 본인 폴더/이 거래 폴더만
  if (!photoPaths.every((p) => p.startsWith(`${user.id}/${rentalId}/`))) return { ok: false, error: "잘못된 사진 경로예요." };

  const { error } = await supabase.rpc("transition_rental", {
    p_rental_id: rentalId,
    p_to: to,
    p_note: note?.trim() || null,
    p_photos: photoPaths,
  });
  if (error) return { ok: false, error: friendly(error.message) };
  const recipient = await counterpartOf(supabase, rentalId, user.id);
  if (recipient) pushLatestNotification(recipient, rentalId);
  revalidatePath(`/rentals/${rentalId}`);
  revalidatePath("/rentals");
  return { ok: true };
}

export async function submitReview(raw: unknown): Promise<Result> {
  const parsed = reviewInputSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "모든 항목에 별점을 매겨 주세요." };
  const v = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase.rpc("submit_review", {
    p_rental_id: v.rentalId,
    p_condition: v.condition,
    p_punctuality: v.punctuality,
    p_manner: v.manner,
    p_comment: v.comment ?? null,
  });
  if (error) return { ok: false, error: friendly(error.message) };
  revalidatePath(`/rentals/${v.rentalId}`);
  return { ok: true };
}

export type SentMessage = { id: number; senderId: string; body: string; createdAt: string };

/** 채팅 전송: DB 트리거가 상대 알림을 만들고, 여기서 휴대폰 푸시를 보낸다 */
export async function sendMessage(rentalId: string, raw: string): Promise<Result<SentMessage>> {
  const body = raw.trim();
  if (!body || body.length > 1000) return { ok: false, error: "메시지는 1~1000자로 입력해 주세요." };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요해요." };
  const { data, error } = await supabase
    .from("messages")
    .insert({ rental_id: rentalId, sender_id: user.id, body })
    .select("id,sender_id,body,created_at")
    .single();
  if (error || !data) return { ok: false, error: "메시지를 보내지 못했어요." };
  const to = await counterpartOf(supabase, rentalId, user.id);
  if (to) pushLatestNotification(to, rentalId);
  return { ok: true, data: { id: data.id, senderId: data.sender_id, body: data.body, createdAt: data.created_at } };
}
