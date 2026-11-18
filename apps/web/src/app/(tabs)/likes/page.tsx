import Link from "next/link";
import { redirect } from "next/navigation";
import { AppHeader } from "@/components/layout/app-header";
import { Avatar } from "@/components/ui/avatar";
import { ItemImage } from "@/components/ui/item-image";
import { LookGrid } from "@/features/feed/components/look-grid";
import { getFavorites } from "@/features/feed/queries";
import { hasSupabase } from "@/lib/env";

export const dynamic = "force-dynamic";
export const metadata = { title: "관심 목록" };

export default async function LikesPage() {
  const fav = hasSupabase() ? await getFavorites() : { items: [], closets: [] };
  if (!fav) redirect("/login?next=/likes");

  return (
    <>
      <AppHeader title="관심 목록" back="/me" />

      <section className="pt-4">
        <h2 className="mb-3 px-4 text-[17px] font-bold">팔로우한 옷장</h2>
        {fav.closets.length ? (
          <div className="no-scrollbar flex gap-3 overflow-x-auto px-4">
            {fav.closets.map((c) => (
              <Link key={c.handle} href={`/u/${c.handle}`} className="w-[150px] shrink-0">
                <div className="grid h-[120px] grid-cols-2 grid-rows-2 gap-0.5 overflow-hidden rounded-[10px]">
                  {[0, 1, 2].map((i) => (
                    <ItemImage key={i} src={c.previewImages[i] ?? null} alt="" tone={c.tone} sizes="80px" className={i === 0 ? "row-span-2" : ""} />
                  ))}
                </div>
                <div className="mt-2 flex items-center gap-1.5">
                  <Avatar src={c.avatarUrl} name={c.displayName} size={22} />
                  <span className="truncate text-[13px] font-semibold">@{c.handle}</span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <p className="mx-4 rounded-xl bg-surface px-4 py-5 text-center text-[13px] text-muted">
            마음에 드는 옷장을 팔로우하면 여기에 모여요.
          </p>
        )}
      </section>

      <section className="pt-8">
        <h2 className="mb-3 px-4 text-[17px] font-bold">관심 옷 <span className="text-muted">{fav.items.length}</span></h2>
        {fav.items.length ? (
          <LookGrid items={fav.items} likedIds={fav.items.map((i) => i.id)} />
        ) : (
          <div className="mx-4 rounded-xl bg-surface px-4 py-8 text-center">
            <p className="text-[13px] text-muted">홈에서 하트를 누른 옷이 여기에 모여요.</p>
            <Link href="/" className="mt-4 inline-block rounded-xl bg-neutral-900 px-5 py-2.5 text-[14px] font-semibold text-white">
              둘러보기
            </Link>
          </div>
        )}
      </section>
    </>
  );
}
