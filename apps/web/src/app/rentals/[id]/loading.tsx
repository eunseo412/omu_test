import { Bone, HeaderSkeleton, ListSkeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div>
      <HeaderSkeleton />
      <ListSkeleton rows={1} />
      <Bone className="mx-4 mt-4 h-40 rounded-2xl" />
      <Bone className="mx-4 mt-3 h-16 rounded-2xl" />
      <Bone className="mx-4 mt-3 h-32 rounded-2xl" />
    </div>
  );
}
