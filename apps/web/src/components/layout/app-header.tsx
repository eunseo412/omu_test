import { NotificationBell } from "@/features/notifications/components/notification-bell";

/** right를 생략하면 알림 종을 보여주고, null을 넘기면 아무것도 표시하지 않는다 */
export function AppHeader({ title, right }: { title: string; right?: React.ReactNode }) {
  return (
    <header className="pt-safe sticky top-0 z-30 border-b border-neutral-100 bg-white/95 backdrop-blur">
      <div className="flex h-12 items-center justify-between px-4">
        <h1 className="text-lg font-bold">{title}</h1>
        <div className="-mr-2">{right === undefined ? <NotificationBell /> : right}</div>
      </div>
    </header>
  );
}
