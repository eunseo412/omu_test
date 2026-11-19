import { Bone, GridSkeleton, HeaderSkeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div>
      <HeaderSkeleton />
      <div className="flex gap-3 px-4 pb-8 pt-4">
        {[0, 1, 2].map((i) => <Bone key={i} className="h-[120px] w-[150px] shrink-0 rounded-[10px]" />)}
      </div>
      <GridSkeleton rows={2} />
    </div>
  );
}
