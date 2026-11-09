import Link from "next/link";
import { redirect } from "next/navigation";
import { AppHeader } from "@/components/layout/app-header";
import { ItemImage } from "@/components/ui/item-image";
import { StatusBadge } from "@/features/rental/components/status-badge";
import { getMyRentals } from "@/features/rental/queries";
import type { RentalListItem } from "@/features/rental/types";
import { formatWon, hasSupabase } from "@/lib/env";
import { formatPeriod } from "@/lib/date";

export const dynamic = "force-dynamic";
export const metadata = { title: "거래" };

export default async function RentalsPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab } = await searchParams;
  const data = hasSupabase() ? await getMyRentals() : { borrowed: [], lent: [] };
  if (!data) redirect("/login?next=/rentals");
  const active = tab === "lent" ? "lent" : "borrowed";
  const list = data[active];
  const turnCount = (l: RentalListItem[]) => l.filter((r) => r.myTurn).length;

  return (
    <>
      <AppHeader title="거래" />
      <div className="grid grid-cols-2 border-b border-neutral-200">
        <TabLink href="/rentals" on={active === "borrowed"} label="빌린 옷" count={turnCount(data.borrowed)} />
        <TabLink href="/rentals?tab=lent" on={active === "lent"} label="빌려준 옷" count={turnCount(data.lent)} />
      </div>

      {list.length === 0 ? (
        <div className="px-6 py-16 text-center">
          <p className="text-[14px] text-neutral-500">
            {active === "borrowed" ? "아직 빌린 옷이 없어요." : "아직 들어온 대여 신청이 없어요."}
          </p>
          <Link
            href={active === "borrowed" ? "/explore" : "/closet/new"}
            className="mt-4 inline-block rounded-xl bg-neutral-900 px-5 py-2.5 text-[14px] font-semibold text-white"
          >
            {active === "borrowed" ? "옷 둘러보기" : "옷 등록하기"}
          </Link>
        </div>
      ) : (
        <ul className="divide-y divide-neutral-100">
          {list.map((r) => (
            <li key={r.id}>
              <Link href={`/rentals/${r.id}`} className="flex gap-3 px-4 py-3.5">
                <ItemImage src={r.itemImage} alt={r.itemTitle} sizes="64px" className="h-20 w-16 shrink-0 rounded-lg" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <StatusBadge status={r.status} />
                    {r.myTurn && <span className="text-[11px] font-bold text-accent">내 차례</span>}
                  </div>
                  <p className="mt-1 truncate text-[15px] font-semibold">{r.itemTitle}</p>
                  <p className="text-[12px] text-neutral-500">
                    {formatPeriod(r.startDate, r.endDate)} · {formatWon(r.feeTotal)}
                  </p>
                  <p className="text-[12px] text-neutral-400">
                    {r.role === "renter" ? "빌려주는 사람" : "빌리는 사람"} @{r.counterpart.handle}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

function TabLink({ href, on, label, count }: { href: string; on: boolean; label: string; count: number }) {
  return (
    <Link href={href} className={`relative py-3 text-center text-[14px] ${on ? "font-semibold" : "text-neutral-400"}`}>
      {label}
      {count > 0 && <span className="ml-1 rounded-full bg-accent px-1.5 text-[11px] font-bold text-white">{count}</span>}
      {on && <span className="absolute inset-x-6 bottom-0 h-0.5 bg-neutral-900" />}
    </Link>
  );
}
