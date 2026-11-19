import { Bone, GridSkeleton, HeaderSkeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div>
      <HeaderSkeleton />
      <div className="space-y-2 px-4 pb-5 pt-3">
        <Bone className="h-7 w-3/4" />
        <Bone className="h-7 w-1/2" />
      </div>
      <Bone className="mx-4 mb-4 h-12 rounded-xl" />
      <div className="mb-5 flex gap-5 px-4">
        {["w-10", "w-16", "w-12", "w-12", "w-12"].map((w, i) => <Bone key={i} className={`h-5 ${w}`} />)}
      </div>
      <GridSkeleton />
    </div>
  );
}
