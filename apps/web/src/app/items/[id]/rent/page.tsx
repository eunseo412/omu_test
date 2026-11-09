import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { ItemImage } from "@/components/ui/item-image";
import { getItem } from "@/features/feed/queries";
import { getBookedRanges } from "@/features/rental/queries";
import { RentForm } from "@/features/rental/components/rent-form";
import { createClient } from "@/lib/supabase/server";
import { formatWon, hasSupabase } from "@/lib/env";

export const dynamic = "force-dynamic";
export const metadata = { title: "대여 신청" };

export default async function RentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!hasSupabase() || id.startsWith("sample-")) redirect(`/items/${id}`);
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/items/${id}/rent`);

  const [item, booked] = await Promise.all([getItem(id), getBookedRanges(id)]);
  if (!item) notFound();

  return (
    <main>
      <header className="pt-safe sticky top-0 z-30 border-b border-neutral-100 bg-white/95 backdrop-blur">
        <div className="flex h-12 items-center gap-1 px-2">
          <Link href={`/items/${id}`} aria-label="뒤로" className="p-2"><ChevronLeft className="h-5 w-5" /></Link>
          <h1 className="text-[16px] font-bold">대여 신청</h1>
        </div>
      </header>
      <div className="flex items-center gap-3 border-b border-neutral-100 px-4 py-3">
        <ItemImage src={item.imageUrl} alt={item.title} tone={item.tone} sizes="56px" className="h-[72px] w-14 shrink-0 rounded-lg" />
        <div className="min-w-0">
          <p className="truncate text-[15px] font-semibold">{item.title}</p>
          <p className="text-[13px] text-neutral-500">@{item.owner.handle} · {item.size} · {formatWon(item.pricePerDay)}/일</p>
        </div>
      </div>
      <RentForm item={item} booked={booked} />
    </main>
  );
}
