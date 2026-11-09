"use client";

import { useEffect, useState } from "react";
import { BellRing } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { hasSupabase } from "@/lib/env";

const VAPID = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

type State = "loading" | "unsupported" | "ios-install" | "not-configured" | "denied" | "off" | "on";

function urlBase64ToUint8Array(base64: string) {
  const padded = (base64 + "=".repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(padded);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

function isIos() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}
function isStandalone() {
  return window.matchMedia("(display-mode: standalone)").matches || (navigator as unknown as { standalone?: boolean }).standalone === true;
}

async function save(sub: PushSubscription) {
  const json = sub.toJSON();
  await createClient().rpc("save_push_subscription", {
    p_endpoint: sub.endpoint,
    p_p256dh: json.keys?.p256dh ?? "",
    p_auth: json.keys?.auth ?? "",
    p_user_agent: navigator.userAgent,
  });
}

/** 휴대폰 푸시 알림 켜기/끄기 */
export function PushToggle() {
  const [state, setState] = useState<State>("loading");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      if (!VAPID || !hasSupabase()) return setState("not-configured");
      if (isIos() && !isStandalone()) return setState("ios-install");
      if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) return setState("unsupported");
      if (Notification.permission === "denied") return setState("denied");
      const reg = await navigator.serviceWorker.register("/sw.js");
      const sub = await reg.pushManager.getSubscription();
      if (sub && Notification.permission === "granted") {
        await save(sub).catch(() => {}); // 다른 계정으로 로그인한 경우 구독을 이 계정으로 갱신
        setState("on");
      } else setState("off");
    })().catch(() => setState("unsupported"));
  }, []);

  async function enable() {
    setBusy(true);
    setError(null);
    try {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") {
        setState(perm === "denied" ? "denied" : "off");
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const sub =
        (await reg.pushManager.getSubscription()) ??
        (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(VAPID) }));
      await save(sub);
      setState("on");
    } catch (e) {
      setError(e instanceof Error ? e.message : "알림을 켜지 못했어요.");
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await createClient().from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
        await sub.unsubscribe();
      }
      setState("off");
    } finally {
      setBusy(false);
    }
  }

  if (state === "loading" || state === "not-configured") return null;

  const text: Record<Exclude<State, "loading" | "not-configured">, string> = {
    on: "이 기기에서 휴대폰 알림을 받고 있어요.",
    off: "새 신청·수락·채팅을 휴대폰 알림으로 받아보세요.",
    denied: "알림이 차단돼 있어요. 브라우저(또는 휴대폰) 설정에서 이 사이트의 알림을 허용해 주세요.",
    unsupported: "이 브라우저는 휴대폰 알림을 지원하지 않아요. 앱 안 알림으로 확인해 주세요.",
    "ios-install": "아이폰은 홈 화면에 추가한 뒤 알림을 켤 수 있어요. Safari 공유 버튼 → '홈 화면에 추가' 후 거기서 열어주세요.",
  };

  return (
    <div className="mx-4 my-3 flex items-center gap-3 rounded-2xl bg-[#faf8f5] p-4">
      <BellRing className="h-6 w-6 shrink-0 text-accent" strokeWidth={1.8} />
      <div className="flex-1">
        <p className="text-[13px] leading-snug text-neutral-700">{text[state]}</p>
        {error && <p className="mt-1 text-[12px] text-red-600">{error}</p>}
      </div>
      {state === "off" && (
        <button onClick={enable} disabled={busy} className="shrink-0 rounded-xl bg-neutral-900 px-3.5 py-2 text-[13px] font-semibold text-white disabled:opacity-50">
          알림 켜기
        </button>
      )}
      {state === "on" && (
        <button onClick={disable} disabled={busy} className="shrink-0 rounded-xl border border-neutral-300 px-3.5 py-2 text-[13px] disabled:opacity-50">
          끄기
        </button>
      )}
    </div>
  );
}
