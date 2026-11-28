"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getPaymentProvider } from "./provider";

export type PaymentActionResult = { ok: true } | { ok: false; error: string };

/** 결제수단 등록 — PG 연동 전까지는 준비 중 */
export async function registerPaymentMethod(): Promise<PaymentActionResult> {
  if (!getPaymentProvider()) return { ok: false, error: "결제 연동을 준비하고 있어요. 베타 기간에는 대여료를 직접 주고받아요." };
  return { ok: false, error: "아직 지원하지 않아요." };
}

export async function removePaymentMethod(id: string): Promise<PaymentActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요해요." };
  // TODO(PG 연동): provider.revokeBillingKey 로 빌링키도 함께 폐기
  const { error } = await supabase.from("payment_methods").delete().eq("id", id).eq("user_id", user.id);
  if (error) return { ok: false, error: "삭제하지 못했어요." };
  revalidatePath("/me/payment");
  return { ok: true };
}
