import { Bone, HeaderSkeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div>
      <HeaderSkeleton />
      <div className="flex items-center gap-4 px-4 pt-2">
        <Bone className="h-[76px] w-[76px] rounded-full" />
        <div className="grid flex-1 grid-cols-3 gap-3">
          {[0, 1, 2].map((i) => <Bone key={i} className="h-10" />)}
        </div>
      </div>
      <div className="space-y-2 px-4 pt-4">
        <Bone className="h-5 w-32" />
        <Bone className="h-4 w-48" />
      </div>
      <div className="grid grid-cols-3 gap-0.5 pt-8">
        {Array.from({ length: 9 }, (_, i) => <Bone key={i} className="aspect-[3/4] rounded-none" />)}
      </div>
    </div>
  );
}
