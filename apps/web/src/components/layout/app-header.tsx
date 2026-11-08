export function AppHeader({ title, right }: { title: string; right?: React.ReactNode }) {
  return (
    <header className="pt-safe sticky top-0 z-30 border-b border-neutral-100 bg-white/95 backdrop-blur">
      <div className="flex h-12 items-center justify-between px-4">
        <h1 className="text-lg font-bold">{title}</h1>
        {right}
      </div>
    </header>
  );
}
