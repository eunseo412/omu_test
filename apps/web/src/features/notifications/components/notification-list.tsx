"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { MessageCircle, Shirt } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { formatRelative } from "@/lib/date";
import { markNotificationsRead } from "../actions";
import type { NotificationItem } from "../queries";

export function NotificationList({ items }: { items: NotificationItem[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const unread = items.filter((n) => !n.read).length;

  function open(n: NotificationItem) {
    start(async () => {
      if (!n.read) await markNotificationsRead([n.id]);
      router.push(n.link);
    });
  }

  if (items.length === 0) {
    return <p className="px-6 py-16 text-center text-[14px] text-neutral-500">아직 알림이 없어요.</p>;
  }

  return (
    <>
      {unread > 0 && (
        <div className="flex justify-end px-4 pb-1">
          <button
            disabled={pending}
            onClick={() => start(async () => { await markNotificationsRead("all"); router.refresh(); })}
            className="text-[13px] text-neutral-500 underline"
          >
            모두 읽음
          </button>
        </div>
      )}
      <ul>
        {items.map((n) => (
          <li key={n.id}>
            <button onClick={() => open(n)} className={`flex w-full gap-3 px-4 py-3.5 text-left ${n.read ? "" : "bg-orange-50/60"}`}>
              <div className="relative shrink-0">
                {n.actor ? (
                  <Avatar src={n.actor.avatarUrl} name={n.actor.displayName} size={44} />
                ) : (
                  <span className="flex h-11 w-11 items-center justify-center rounded-full bg-neutral-100"><Shirt className="h-5 w-5" /></span>
                )}
                <span className="absolute -bottom-0.5 -right-0.5 rounded-full bg-white p-0.5">
                  {n.kind === "message" ? <MessageCircle className="h-3.5 w-3.5 text-sky-600" /> : <Shirt className="h-3.5 w-3.5 text-accent" />}
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <p className={`text-[14px] ${n.read ? "text-neutral-700" : "font-semibold"}`}>{n.title}</p>
                <p className="line-clamp-2 text-[13px] text-neutral-500">{n.body}</p>
                <p className="mt-0.5 text-[11px] text-neutral-400">{formatRelative(n.createdAt)}</p>
              </div>
              {!n.read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-accent" aria-label="안 읽음" />}
            </button>
          </li>
        ))}
      </ul>
    </>
  );
}
