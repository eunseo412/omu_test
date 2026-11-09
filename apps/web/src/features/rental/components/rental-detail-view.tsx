import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { HANDOFF_LABELS, RENTAL_STATUS_LABELS, rentalDays, todayKST, type RentalStatus } from "@omu/core";
import { Avatar } from "@/components/ui/avatar";
import { ItemImage } from "@/components/ui/item-image";
import { formatWon } from "@/lib/env";
import { formatDateTime, formatDay, formatPeriod } from "@/lib/date";
import type { RentalDetail } from "../types";
import { RentalActions } from "./rental-actions";
import { RentalChat } from "./rental-chat";
import { ReviewForm } from "./review-form";
import { StatusBadge } from "./status-badge";

/** 진행 기록은 '상태'가 아니라 '일어난 일'로 보여준다 */
const EVENT_LABELS: Record<RentalStatus, string> = {
  requested: "대여 신청",
  accepted: "신청 수락",
  rejected: "신청 거절",
  cancelled: "거래 취소",
  handed_over: "옷 전달",
  returned: "반납",
  disputed: "문제 신고",
  completed: "반납 승인 · 거래 완료",
};

function guide(status: RentalStatus, role: "owner" | "renter", end: string): string {
  const owner = role === "owner";
  switch (status) {
    case "requested":
      return owner ? "신청을 수락하면 채팅으로 만날 시간과 장소를 정해요." : "옷장 주인이 확인하고 있어요. 채팅으로 먼저 인사해도 좋아요.";
    case "accepted":
      return owner
        ? "만나서 옷을 건네고 대여료·보증금을 받은 뒤 '옷 전달 완료'를 눌러주세요."
        : "만나서 옷을 받고 대여료·보증금을 전달해요. 주인이 전달 완료를 누르면 대여가 시작돼요.";
    case "handed_over":
      return owner ? `대여 중이에요. 반납일은 ${formatDay(end)}이에요.` : `${formatDay(end)}까지 반납해 주세요. 반납할 때 상태 사진을 남겨요.`;
    case "returned":
      return owner
        ? "옷 상태를 확인하고 보증금을 돌려준 뒤 '반납 승인'을 눌러주세요. 문제가 있으면 사진과 함께 알려주세요."
        : "주인이 옷 상태를 확인하고 있어요. 승인되면 보증금을 돌려받아요.";
    case "disputed":
      return "운영팀이 내용을 확인하고 있어요. 채팅으로 상황을 정리해 주세요.";
    case "completed":
      return "거래가 끝났어요. 서로 평가를 남겨주세요.";
    case "rejected":
      return owner ? "거절한 신청이에요." : "아쉽지만 이번 신청은 거절됐어요. 다른 날짜나 다른 옷을 찾아보세요.";
    case "cancelled":
      return "취소된 거래예요.";
  }
}

export function RentalDetailView({ r }: { r: RentalDetail }) {
  const today = todayKST();
  const overdue = r.status === "handed_over" && today > r.endDate;
  const days = rentalDays(r.startDate, r.endDate);
  const actorLabel = (id: string | null) => (id === r.myId ? "나" : `@${r.counterpart.handle}`);

  return (
    <main className="pb-16">
      <header className="pt-safe sticky top-0 z-30 border-b border-neutral-100 bg-white/95 backdrop-blur">
        <div className="flex h-12 items-center gap-1 px-2">
          <Link href={r.role === "owner" ? "/rentals?tab=lent" : "/rentals"} aria-label="뒤로" className="p-2">
            <ChevronLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-[16px] font-bold">{r.role === "owner" ? "빌려준 옷" : "빌린 옷"}</h1>
        </div>
      </header>

      <Link href={`/items/${r.item.id}`} className="flex items-center gap-3 px-4 py-3">
        <ItemImage src={r.item.imageUrl} alt={r.item.title} sizes="64px" className="h-20 w-16 shrink-0 rounded-lg" />
        <div className="min-w-0 flex-1">
          <StatusBadge status={r.status} />
          <p className="mt-1 truncate text-[15px] font-semibold">{r.item.title}</p>
          <p className="text-[12px] text-neutral-500">{formatPeriod(r.startDate, r.endDate)} · {days}일</p>
        </div>
      </Link>

      <section className="mx-4 space-y-3 rounded-2xl bg-[#faf8f5] p-4">
        <p className="text-[17px] font-bold">{RENTAL_STATUS_LABELS[r.status]}</p>
        {overdue && <p className="rounded-lg bg-red-50 px-3 py-2 text-[13px] font-semibold text-red-600">반납일({formatDay(r.endDate)})이 지났어요.</p>}
        <p className="text-[14px] leading-relaxed text-neutral-700">{guide(r.status, r.role, r.endDate)}</p>
        <RentalActions rentalId={r.id} status={r.status} role={r.role} myId={r.myId} />
      </section>

      <Link href={`/u/${r.counterpart.handle}`} className="mx-4 mt-3 flex items-center gap-3 rounded-2xl border border-neutral-100 p-3">
        <Avatar src={r.counterpart.avatarUrl} name={r.counterpart.displayName} size={40} />
        <div className="flex-1">
          <p className="text-[12px] text-neutral-500">{r.role === "owner" ? "빌리는 사람" : "빌려주는 사람"}</p>
          <p className="text-[14px] font-semibold">{r.counterpart.displayName} @{r.counterpart.handle}</p>
        </div>
        <span className="text-[13px] font-bold text-accent">{r.counterpart.trustTemp.toFixed(1)}℃</span>
      </Link>

      <dl className="mx-4 mt-3 space-y-2 rounded-2xl border border-neutral-100 p-4 text-[14px]">
        <Info label="기간" value={`${formatPeriod(r.startDate, r.endDate)} (${days}일)`} />
        <Info label="전달 방법" value={HANDOFF_LABELS[r.handoffMethod as keyof typeof HANDOFF_LABELS] ?? r.handoffMethod} />
        <Info label="대여료" value={`${formatWon(r.feeTotal)} (${formatWon(r.pricePerDay)} × ${days}일)`} />
        <Info label="보증금" value={formatWon(r.deposit)} />
        <p className="pt-1 text-[12px] text-neutral-400">베타 기간에는 대여료·보증금을 직접 주고받아요.</p>
      </dl>

      <div className="mt-6">
        <RentalChat rentalId={r.id} myId={r.myId} counterpartName={r.counterpart.handle} initial={r.messages} />
      </div>

      {r.status === "completed" && (
        <div className="mt-6">
          {r.myReviewDone ? (
            <p className="mx-4 rounded-2xl bg-neutral-50 p-4 text-center text-[14px] text-neutral-500">평가를 남겼어요. 고마워요!</p>
          ) : (
            <ReviewForm rentalId={r.id} role={r.role} counterpartHandle={r.counterpart.handle} />
          )}
        </div>
      )}

      <section className="mt-6 px-4">
        <h2 className="mb-3 text-[15px] font-semibold">진행 기록</h2>
        <ol className="relative space-y-4 border-l border-neutral-200 pl-4">
          {[...r.events].reverse().map((e) => (
            <li key={e.id} className="relative">
              <span className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full bg-neutral-900" />
              <p className="text-[14px] font-semibold">
                {EVENT_LABELS[e.to]} <span className="font-normal text-neutral-500">· {actorLabel(e.actorId)}</span>
              </p>
              <p className="text-[12px] text-neutral-400">{formatDateTime(e.createdAt)}</p>
              {e.note && <p className="mt-1 whitespace-pre-line text-[13px] text-neutral-700">{e.note}</p>}
              {e.photos.length > 0 && (
                <div className="no-scrollbar mt-2 flex gap-1.5 overflow-x-auto">
                  {e.photos.map((src) => (
                    <a key={src} href={src} target="_blank" rel="noreferrer" className="shrink-0">
                      {/* eslint-disable-next-line @next/next/no-img-element -- 만료되는 서명 URL */}
                      <img src={src} alt="상태 사진" className="h-24 w-20 rounded-lg object-cover" />
                    </a>
                  ))}
                </div>
              )}
            </li>
          ))}
        </ol>
      </section>
    </main>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="shrink-0 text-neutral-500">{label}</dt>
      <dd className="text-right font-medium">{value}</dd>
    </div>
  );
}
