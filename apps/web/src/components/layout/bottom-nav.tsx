"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Compass, Home, PlusSquare, Repeat, User } from "lucide-react";

const TABS = [
  { href: "/", label: "홈", Icon: Home },
  { href: "/explore", label: "탐색", Icon: Compass },
  { href: "/closet/new", label: "등록", Icon: PlusSquare },
  { href: "/rentals", label: "거래", Icon: Repeat },
  { href: "/me", label: "MY", Icon: User },
] as const;

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className="pb-safe fixed inset-x-0 bottom-0 z-40 mx-auto max-w-[480px] border-t border-neutral-200 bg-white/95 backdrop-blur">
      <ul className="grid h-14 grid-cols-5">
        {TABS.map(({ href, label, Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <li key={href}>
              <Link href={href} className={`flex h-full flex-col items-center justify-center gap-0.5 text-[10px] ${active ? "text-accent" : "text-neutral-400"}`}>
                <Icon className="h-[22px] w-[22px]" strokeWidth={active ? 2.2 : 1.6} />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
