import Link from "next/link";
import { notFound } from "next/navigation";
import { CATEGORY_LABELS, HANDOFF_LABELS } from "@omu/core";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { ItemImage } from "@/components/ui/item-image";
import { LikeButton } from "@/features/feed/components/like-button";
import { ItemOwnerMenu } from "@/features/closet/components/item-owner-menu";
import { getItem } from "@/features/feed/queries";
import { formatWon } from "@/lib/env";

export default async function ItemPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const item = await getItem(id);
  if (!item) notFound();
  const images = item.images.length ? item.images : [null];
  const handoff = item.handoffMethods.map((h) => HANDOFF_LABELS[h as keyof typeof HANDOFF_LABELS] ?? h).join(" · ");

  return (
    <main className="pb-32">
      {/* 사진이 화면 폭을 가득 채우는 가로 스와이프 */}
      <div className="relative">
        <div className="no-scrollbar flex snap-x snap-mandatory overflow-x-auto">
          {images.map((src, i) => (
            <ItemImage key={i} src={src} alt={item.title} tone={item.tone} sizes="480px" priority={i === 0} className="aspect-[4/5] w-full shrink-0 snap-center" />
          ))}
        </div>
        <Link href="/" aria-label="뒤로" className="absolute left-3 top-[calc(env(safe-area-inset-top)+12px)] rounded-full bg-white/90 p-2 backdrop-blur">
          <ChevronLeft className="h-5 w-5" />
        </Link>
        {item.isMine && <ItemOwnerMenu itemId={item.id} hidden={item.status === "hidden"} ownerHandle={item.owner.handle} />}
        {images.length > 1 && (
          <span className="absolute bottom-3 right-3 rounded-full bg-black/55 px-2.5 py-1 text-[12px] font-medium text-white">
            1 / {images.length} · 옆으로 넘겨보세요
          </span>
        )}
      </div>

      <div className="px-4 pt-5">
        {item.isMine && item.status === "hidden" && (
          <p className="mb-4 rounded-xl bg-neutral-900 px-3.5 py-2.5 text-[13px] text-white">
            숨긴 옷이에요. 나만 볼 수 있고 대여 신청을 받지 않아요. 오른쪽 위 ⋯ 에서 다시 보이게 할 수 있어요.
          </p>
        )}
        <div className="flex flex-wrap gap-1.5">
          {item.styleTags.map((t) => (
            <Link key={t} href={`/?tag=${encodeURIComponent(t)}`} className="rounded-full bg-surface px-3 py-1.5 text-[12px] font-semibold">
              {t}
            </Link>
          ))}
        </div>
        <h1 className="mt-3 text-[22px] font-extrabold leading-snug tracking-[-0.02em]">{item.title}</h1>
        {item.brand && <p className="mt-0.5 text-[14px] text-muted">{item.brand}</p>}

        <dl className="mt-5 grid grid-cols-3 gap-2 text-center">
          <Spec label="사이즈" value={item.size} />
          <Spec label="종류" value={CATEGORY_LABELS[item.category as keyof typeof CATEGORY_LABELS] ?? item.category} />
          <Spec label="대여 기간" value={item.minDays === item.maxDays ? `${item.minDays}일` : `${item.minDays}~${item.maxDays}일`} />
        </dl>
        <p className="mt-3 text-[13px] text-muted">전달 방법 · {handoff}</p>

        {item.description && <p className="mt-5 whitespace-pre-line text-[15px] leading-relaxed text-neutral-800">{item.description}</p>}

        <Link href={`/u/${item.owner.handle}`} className="mt-6 flex items-center gap-3 rounded-2xl bg-surface p-3.5">
          <Avatar src={item.owner.avatarUrl} name={item.owner.displayName || item.owner.handle} size={44} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[15px] font-bold">@{item.owner.handle}의 옷장</p>
            <p className="text-[12px] text-muted">이 사람의 다른 옷 보러가기</p>
          </div>
          <span className="text-right">
            <span className="block text-[10px] text-muted">신뢰도</span>
            <span className="text-[15px] font-extrabold">{item.ownerTrustTemp.toFixed(1)}℃</span>
          </span>
          <ChevronRight className="h-5 w-5 text-neutral-400" />
        </Link>
      </div>

      <div className="pb-safe fixed inset-x-0 bottom-0 z-40 mx-auto max-w-[480px] border-t border-line bg-white">
        <div className="flex items-center gap-4 px-4 py-3">
          {!item.isMine && <LikeButton itemId={item.id} initial={item.liked} size={24} />}
          <div className="flex-1">
            <p className="text-[18px] font-extrabold">{formatWon(item.pricePerDay)}<span className="text-[13px] font-medium text-muted"> / 일</span></p>
            <p className="text-[12px] text-muted">보증금 {formatWon(item.deposit)}</p>
          </div>
          {item.isMine ? (
            <Link href={`/items/${item.id}/edit`} className="rounded-xl bg-neutral-900 px-7 py-3.5 text-[15px] font-semibold text-white">
              수정하기
            </Link>
          ) : item.id.startsWith("sample-") ? (
            <span className="rounded-xl bg-neutral-300 px-6 py-3.5 text-[15px] font-semibold text-white">샘플 옷</span>
          ) : (
            <Link href={`/items/${item.id}/rent`} className="rounded-xl bg-neutral-900 px-7 py-3.5 text-[15px] font-semibold text-white">
              대여 신청
            </Link>
          )}
        </div>
      </div>
    </main>
  );
}

function Spec({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-surface py-3">
      <dt className="text-[11px] text-muted">{label}</dt>
      <dd className="mt-0.5 text-[15px] font-bold">{value}</dd>
    </div>
  );
}
