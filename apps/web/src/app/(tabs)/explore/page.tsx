import Link from "next/link";
import { STYLE_TAGS } from "@omu/core";
import { AppHeader } from "@/components/layout/app-header";
import { ItemTile } from "@/components/ui/item-card";
import { getItemsByTag } from "@/features/feed/queries";

export const dynamic = "force-dynamic";

export default async function ExplorePage({ searchParams }: { searchParams: Promise<{ tag?: string }> }) {
  const { tag } = await searchParams;
  const active = tag && (STYLE_TAGS as readonly string[]).includes(tag) ? tag : null;
  const { items } = await getItemsByTag(active);

  return (
    <>
      <AppHeader title="추구미 찾기" />
      <div className="no-scrollbar flex gap-2 overflow-x-auto px-4 py-3">
        <TagChip href="/explore" label="전체" active={!active} />
        {STYLE_TAGS.map((t) => (
          <TagChip key={t} href={`/explore?tag=${encodeURIComponent(t)}`} label={`#${t}`} active={active === t} />
        ))}
      </div>
      {items.length ? (
        <div className="grid grid-cols-2 gap-0.5">
          {items.map((it) => (
            <ItemTile key={it.id} item={it} />
          ))}
        </div>
      ) : (
        <p className="p-10 text-center text-sm text-neutral-500">아직 이 추구미의 옷이 없어요.</p>
      )}
    </>
  );
}

function TagChip({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <Link
      href={href}
      className={`shrink-0 rounded-full px-3.5 py-1.5 text-[13px] ${active ? "bg-neutral-900 text-white" : "border border-neutral-200 bg-white"}`}
    >
      {label}
    </Link>
  );
}
