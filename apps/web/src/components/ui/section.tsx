import Link from "next/link";

export function Section({ title, href, children }: { title: string; href?: string; children: React.ReactNode }) {
  return (
    <section className="py-5">
      <div className="mb-3 flex items-end justify-between px-4">
        <h2 className="text-[19px] font-bold tracking-tight">{title}</h2>
        {href && (
          <Link href={href} className="rounded-full border border-neutral-200 px-3 py-1 text-xs text-neutral-600">
            전체보기
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}

/** 가로 스크롤 줄 (스냅) */
export function Rail({ children }: { children: React.ReactNode }) {
  return (
    <div className="no-scrollbar flex snap-x snap-mandatory gap-2.5 overflow-x-auto scroll-px-4 px-4">{children}</div>
  );
}
