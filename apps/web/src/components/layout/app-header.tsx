import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { NotificationBell } from "@/features/notifications/components/notification-bell";

/**
 * 화면 상단 제목. 홈의 굵은 타이포에 맞춘 스타일.
 * right를 생략하면 알림 종, null이면 비움. back을 주면 뒤로가기 버튼.
 */
export function AppHeader({ title, right, back }: { title: string; right?: React.ReactNode; back?: string }) {
  return (
    <header className="pt-safe sticky top-0 z-30 bg-white/95 backdrop-blur">
      <div className="flex h-14 items-center justify-between px-4">
        <div className="flex min-w-0 items-center gap-1">
          {back && (
            <Link href={back} aria-label="뒤로" className="-ml-2 p-2">
              <ChevronLeft className="h-6 w-6" strokeWidth={2} />
            </Link>
          )}
          <h1 className="truncate text-[22px] font-extrabold tracking-[-0.03em]">{title}</h1>
        </div>
        <div className="-mr-2">{right === undefined ? <NotificationBell /> : right}</div>
      </div>
    </header>
  );
}
