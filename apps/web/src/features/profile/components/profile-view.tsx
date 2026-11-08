import Link from "next/link";
import { BadgeCheck, ChevronLeft, Plus } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { ItemImage } from "@/components/ui/item-image";
import { formatWon } from "@/lib/env";
import { FollowButton } from "./follow-button";
import { ShareButton } from "./share-button";
import type { ProfileData } from "../types";

export function ProfileView({ p }: { p: ProfileData }) {
  const body = [
    p.heightCm && `${p.heightCm}cm`,
    p.topSize && `상의 ${p.topSize}`,
    p.bottomSize && `하의 ${p.bottomSize}`,
    p.shoeSize && `신발 ${p.shoeSize}`,
  ].filter(Boolean);

  return (
    <main className="pb-10">
      <header className="pt-safe sticky top-0 z-30 bg-white/95 backdrop-blur">
        <div className="flex h-12 items-center justify-between px-2">
          <Link href="/" aria-label="뒤로" className="p-2">
            <ChevronLeft className="h-5 w-5" />
          </Link>
          <span className="text-[15px] font-semibold">@{p.handle}</span>
          <ShareButton title={`${p.displayName}님의 옷장 · O:MU`} />
        </div>
      </header>

      {p.isSample && (
        <p className="mx-4 mb-2 rounded-lg bg-neutral-900 px-3 py-2 text-xs text-white/80">샘플 옷장입니다.</p>
      )}

      <section className="px-4 pt-2">
        <div className="flex items-center gap-4">
          <Avatar src={p.avatarUrl} name={p.displayName} size={76} />
          <div className="grid flex-1 grid-cols-3 text-center">
            <Stat n={p.items.filter((i) => !i.hidden).length} label="옷" />
            <Stat n={p.followerCount} label="팔로워" />
            <Stat n={p.followingCount} label="팔로잉" />
          </div>
        </div>

        <div className="mt-3 flex items-center gap-1.5">
          <h1 className="text-[17px] font-bold">{p.displayName}</h1>
          {p.isVerifiedStudent && <BadgeCheck className="h-4 w-4 text-sky-500" aria-label="학생 인증" />}
          <span className="ml-auto rounded-full bg-orange-50 px-2.5 py-1 text-[12px] font-bold text-accent">
            신뢰도 {p.trustTemp.toFixed(1)}℃
          </span>
        </div>
        {body.length > 0 && <p className="mt-1 text-[13px] text-neutral-500">{body.join(" · ")}</p>}
        {p.bio && <p className="mt-2 whitespace-pre-line text-[14px] leading-relaxed">{p.bio}</p>}
        {p.styleTags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {p.styleTags.map((t) => (
              <Link key={t} href={`/explore?tag=${encodeURIComponent(t)}`} className="rounded-full bg-neutral-100 px-2.5 py-1 text-[12px]">
                #{t}
              </Link>
            ))}
          </div>
        )}

        <div className="mt-4 flex gap-2">
          {p.isMe ? (
            <>
              <Link href="/me/edit" className="flex h-10 flex-1 items-center justify-center rounded-xl border border-neutral-300 text-[14px] font-semibold">
                프로필 편집
              </Link>
              <Link href="/closet/new" className="flex h-10 flex-1 items-center justify-center gap-1 rounded-xl bg-neutral-900 text-[14px] font-semibold text-white">
                <Plus className="h-4 w-4" /> 옷 등록
              </Link>
            </>
          ) : p.isSample ? null : (
            <FollowButton targetId={p.id} handle={p.handle} initial={p.isFollowing} />
          )}
        </div>
      </section>

      <div className="mt-5 border-b border-neutral-200 px-4">
        <span className="inline-block border-b-2 border-neutral-900 pb-2.5 text-[14px] font-semibold">옷장</span>
      </div>

      {p.items.length ? (
        <div className="grid grid-cols-3 gap-0.5 pt-0.5">
          {p.items.map((it) => (
            <Link key={it.id} href={`/items/${it.id}`} className="relative block">
              <ItemImage src={it.imageUrl} alt={it.title} tone={it.tone} sizes="(max-width: 480px) 33vw, 160px" className="aspect-[3/4]" />
              <span className="absolute bottom-1.5 left-1.5 rounded-md bg-black/55 px-1.5 py-0.5 text-[11px] font-medium text-white">
                {formatWon(it.pricePerDay)}
              </span>
              {it.hidden && (
                <span className="absolute inset-0 flex items-center justify-center bg-white/60 text-[12px] font-semibold">숨김</span>
              )}
            </Link>
          ))}
        </div>
      ) : (
        <div className="px-4 py-14 text-center">
          <p className="text-[14px] text-neutral-500">{p.isMe ? "아직 등록한 옷이 없어요." : "아직 옷장이 비어 있어요."}</p>
          {p.isMe && (
            <Link href="/closet/new" className="mt-4 inline-block rounded-xl bg-neutral-900 px-5 py-2.5 text-[14px] font-semibold text-white">
              첫 옷 등록하기
            </Link>
          )}
        </div>
      )}
    </main>
  );
}

function Stat({ n, label }: { n: number; label: string }) {
  return (
    <div>
      <p className="text-[17px] font-bold">{n}</p>
      <p className="text-[12px] text-neutral-500">{label}</p>
    </div>
  );
}
