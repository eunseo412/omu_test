import { Bone } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div>
      <Bone className="aspect-[4/5] w-full rounded-none" />
      <div className="space-y-3 px-4 pt-5">
        <Bone className="h-4 w-24" />
        <Bone className="h-7 w-2/3" />
        <Bone className="h-4 w-1/3" />
        <div className="grid grid-cols-3 gap-2 pt-2">
          {[0, 1, 2].map((i) => <Bone key={i} className="h-14 rounded-xl" />)}
        </div>
      </div>
    </div>
  );
}
