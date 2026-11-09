import { redirect } from "next/navigation";
import { AppHeader } from "@/components/layout/app-header";
import { NotificationList } from "@/features/notifications/components/notification-list";
import { PushToggle } from "@/features/notifications/components/push-toggle";
import { getNotifications } from "@/features/notifications/queries";
import { hasSupabase } from "@/lib/env";

export const dynamic = "force-dynamic";
export const metadata = { title: "알림" };

export default async function NotificationsPage() {
  const items = hasSupabase() ? await getNotifications() : [];
  if (!items) redirect("/login?next=/notifications");
  return (
    <>
      <AppHeader title="알림" right={null} />
      <PushToggle />
      <NotificationList items={items} />
    </>
  );
}
