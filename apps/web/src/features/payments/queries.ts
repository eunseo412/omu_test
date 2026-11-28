import "server-only";
import { createClient, getAuthUser } from "@/lib/supabase/server";
import { hasSupabase } from "@/lib/env";
import type { PaymentMethod } from "./config";

/** 내 결제수단 (빌링키는 DB 권한상 읽을 수 없고, 읽지도 않는다) */
export async function getMyPaymentMethods(): Promise<PaymentMethod[]> {
  if (!hasSupabase()) return [];
  const user = await getAuthUser();
  if (!user) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("payment_methods")
    .select("id,card_brand,card_last4,is_default")
    .eq("user_id", user.id)
    .order("is_default", { ascending: false });
  return (data ?? []).map((m) => ({ id: m.id, brand: m.card_brand, last4: m.card_last4, isDefault: m.is_default }));
}
