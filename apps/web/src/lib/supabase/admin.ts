import "server-only";
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL } from "@/lib/env";

/**
 * 서비스 롤 클라이언트: RLS를 무시한다. 서버에서 '다른 사용자'의 데이터가 꼭 필요할 때만
 * (예: 상대방의 푸시 구독 조회) 사용. 절대 클라이언트로 import 하지 말 것.
 */
export function createAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!SUPABASE_URL || !key) return null;
  return createClient(SUPABASE_URL, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
