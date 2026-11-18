"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, PlusSquare, Repeat, User } from "lucide-react";
import { useUnreadCount } from "@/features/notifications/use-unread-count";

const TABS = [
  { href: "/", label: "홈", Icon: Home, match: (p: string) => p === "/" },
  { href: "/closet/new", label: "등록", Icon: PlusSquare, match: (p: string) => p.startsWith("/closet") },
  { href: "/rentals", label: "거래", Icon: Repeat, match: (p: string) => p.startsWith("/rentals") || p.startsWith("/notifications") },
  { href: "/me", label: "MY", Icon: User, match: (p: string) => p.startsWith("/me") || p.startsWith("/likes") },
] as const;

export function BottomNav() {
  const pathname = usePathname();
  const { count } = useUnreadCount();
  return (
    <nav className="pb-safe fixed inset-x-0 bottom-0 z-40 mx-auto max-w-[480px] border-t border-line bg-white/95 backdrop-blur">
      <ul className="grid h-16 grid-cols-4">
        {TABS.map(({ href, label, Icon, match }) => {
          const active = match(pathname);
          return (
            <li key={href}>
              <Link
                href={href}
                className={`relative flex h-full flex-col items-center justify-center gap-1 text-[11px] ${active ? "font-semibold text-neutral-900" : "text-neutral-400"}`}
              >
                <Icon className="h-[22px] w-[22px]" strokeWidth={active ? 2.3 : 1.7} />
                {label}
                {href === "/rentals" && count > 0 && (
                  <span className="absolute left-1/2 top-2.5 ml-2 h-2 w-2 rounded-full bg-point" aria-label="새 알림" />
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
