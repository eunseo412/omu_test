import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { ItemImage } from "@/components/ui/item-image";
import { FollowButton } from "@/features/profile/components/follow-button";
import { formatPeriod } from "@/lib/date";
import type { ArchiveEntry } from "../queries";
import { ArchiveHideToggle } from "./archive-hide-toggle";

/** mood archive 카드 상세. 처음 열면 '내 옷장에 추가됐어요' */
export function ArchiveEntryView({ e }: { e: ArchiveEntry }) {
  const canRent = e.itemId && e.itemAvailable && !e.viewerIsOwner;
  const backHref = `/u/${e.collector.handle}?tab=archive`;

  return (
    <main className="pb-12">
      <header className="pt-safe sticky top-0 z-30 bg-white/95 backdrop-blur">
        <div className="flex h-14 items-center gap-1 px-2">
          <Link href={backHref} aria-label="뒤로" className="p-2"><ChevronLeft className="h-6 w-6" /></Link>
          <span className="truncate text-[15px] font-semibold">@{e.collector.handle}의 mood archive</span>
        </div>
      </header>

      {e.isNew && (
        <section className="px-4 pb-4 pt-2">
          <h1 className="text-[26px] font-extrabold leading-tight tracking-[-0.03em]">내 옷장에 추가됐어요</h1>
          <p className="mt-1.5 text-[14px] text-muted">입어본 옷이 mood archive에 수집됐어요.</p>
        </section>
      )}

      <div className="px-4">
        <ItemImage src={e.imageUrl} alt={e.title} tone={e.tone} sizes="480px" priority className="aspect-[4/5] rounded-2xl" />
        <h2 className="mt-4 text-[20px] font-extrabold tracking-[-0.02em]">{e.title}</h2>
        <p className="mt-0.5 text-[13px] text-muted">
          {e.owner ? `@${e.owner.handle}님의 옷` : "옷장 주인을 찾을 수 없어요"} · {formatPeriod(e.rentedFrom, e.rentedTo)}
        </p>
        {e.isMine && e.hidden && (
          <p className="mt-3 rounded-xl bg-surface px-3.5 py-2.5 text-[13px] text-neutral-700">숨긴 카드예요. 나만 볼 수 있어요.</p>
        )}
      </div>

      {e.owner && !e.viewerIsOwner && (
        <div className="mx-4 mt-6 space-y-2.5">
          {canRent ? (
            <Link href={`/items/${e.itemId}/rent`} className="flex h-12 items-center justify-center rounded-xl bg-neutral-900 text-[15px] font-semibold text-white">
              {e.isMine ? "다시 빌리기" : "이 옷 빌리기"}
            </Link>
          ) : (
            <Link href={`/u/${e.owner.handle}`} className="flex h-12 items-center justify-center rounded-xl bg-neutral-900 text-[15px] font-semibold text-white">
              지금은 빌릴 수 없어요 · 이 옷장 둘러보기
            </Link>
          )}

          <div className="flex items-center gap-3 rounded-2xl bg-surface p-3">
            <Link href={`/u/${e.owner.handle}`} className="flex min-w-0 flex-1 items-center gap-3">
              <Avatar src={e.owner.avatarUrl} name={e.owner.displayName || e.owner.handle} size={40} />
              <span className="min-w-0">
                <span className="block truncate text-[14px] font-bold">@{e.owner.handle}의 옷장</span>
                <span className="text-[12px] text-muted">{e.isFollowingOwner ? "팔로우 중이에요" : "팔로우하고 새 옷 소식 받기"}</span>
              </span>
            </Link>
            <div className="flex w-24">
              <FollowButton targetId={e.owner.id} handle={e.owner.handle} initial={e.isFollowingOwner} />
            </div>
          </div>
        </div>
      )}

      {e.isMine && (
        <div className="mx-4 mt-4">
          <ArchiveHideToggle id={e.id} hidden={e.hidden} />
        </div>
      )}
    </main>
  );
}
