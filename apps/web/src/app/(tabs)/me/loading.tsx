import { HeaderSkeleton, ListSkeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div>
      <HeaderSkeleton />
      <ListSkeleton />
    </div>
  );
}
