import { BottomNav } from "@/components/layout/bottom-nav";

export default function TabsLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <main className="pb-[calc(3.5rem+env(safe-area-inset-bottom))]">{children}</main>
      <BottomNav />
    </>
  );
}
