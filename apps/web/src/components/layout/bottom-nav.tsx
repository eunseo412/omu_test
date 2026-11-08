"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/", label: "홈" },
  { href: "/explore", label: "탐색" },
  { href: "/closet/new", label: "등록" },
  { href: "/rentals", label: "거래" },
  { href: "/me", label: "MY" },
] as const;

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className="pb-safe fixed inset-x-0 bottom-0 z-40 mx-auto max-w-[480px] border-t border-neutral-200 bg-white/95 backdrop-blur">
      <ul className="grid h-14 grid-cols-5">
        {TABS.map((t) => {
          const active = t.href === "/" ? pathname === "/" : pathname.startsWith(t.href);
          return (
            <li key={t.href}>
              <Link
                href={t.href}
                className={`flex h-full items-center justify-center text-sm ${active ? "font-semibold text-brand" : "text-neutral-400"}`}
              >
                {t.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
