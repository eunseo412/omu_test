import { notFound, redirect } from "next/navigation";
import { getRental } from "@/features/rental/queries";
import { markRentalNotificationsRead } from "@/features/notifications/queries";
import { RentalDetailView } from "@/features/rental/components/rental-detail-view";
import { hasSupabase } from "@/lib/env";

export const dynamic = "force-dynamic";
export const metadata = { title: "거래 상세" };

export default async function RentalPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!hasSupabase()) redirect("/rentals");
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const rental = await getRental(id);
  if (!rental) notFound();
  await markRentalNotificationsRead(id); // 이 거래 알림은 읽음 처리
  return <RentalDetailView r={rental} />;
}
