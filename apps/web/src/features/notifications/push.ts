import "server-only";
import * as webpush from "web-push";
import { after } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

type Payload = { title: string; body: string; url: string; tag?: string };

let configured: boolean | null = null;
function configure(): boolean {
  if (configured !== null) return configured;
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim();
  const priv = process.env.VAPID_PRIVATE_KEY?.trim();
  const subject = process.env.VAPID_SUBJECT?.trim() || "mailto:omuandyou@gmail.com";
  configured = Boolean(pub && priv);
  if (configured) webpush.setVapidDetails(subject, pub!, priv!);
  else console.info("[push] VAPID 키가 없어 푸시 알림을 보내지 않습니다 (앱 내 알림은 정상 동작)");
  return configured;
}

async function sendToUser(userId: string, payload: Payload) {
  const admin = createAdminClient();
  if (!admin || !configure()) return;
  const { data: subs } = await admin.from("push_subscriptions").select("id,endpoint,p256dh,auth").eq("user_id", userId);
  await Promise.all(
    (subs ?? []).map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          JSON.stringify(payload),
          { TTL: 60 * 60 * 24, urgency: "high" },
        );
      } catch (e) {
        const status = (e as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) await admin.from("push_subscriptions").delete().eq("id", s.id); // 만료된 구독 정리
        else console.error("[push] 전송 실패", status, (e as Error).message);
      }
    }),
  );
}

/**
 * DB 트리거가 방금 만든(또는 갱신한) 알림을 상대 기기로 푸시한다.
 * 알림 문구는 SQL 트리거 한 곳에서만 관리. 응답을 늦추지 않도록 after()로 실행.
 */
export function pushLatestNotification(recipientId: string, rentalId: string) {
  after(async () => {
    const admin = createAdminClient();
    if (!admin || !configure()) return;
    const { data: n } = await admin
      .from("notifications")
      .select("id,kind,title,body,link")
      .eq("user_id", recipientId)
      .eq("rental_id", rentalId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!n) return;
    // 같은 거래의 채팅 알림은 휴대폰에서도 하나로 겹쳐 보이게 tag 지정
    await sendToUser(recipientId, { title: n.title, body: n.body, url: n.link, tag: n.kind === "message" ? `chat-${rentalId}` : `rental-${n.id}` });
  });
}
