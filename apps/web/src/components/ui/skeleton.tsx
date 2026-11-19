/** 로딩 중 회색 뼈대. 누르자마자 화면이 바뀌어 체감 속도를 높인다 */
export function Bone({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-surface ${className}`} />;
}

export function HeaderSkeleton() {
  return (
    <div className="pt-safe flex h-14 items-center px-4">
      <Bone className="h-6 w-24" />
    </div>
  );
}

/** 홈·관심 목록처럼 2열 사진 그리드 */
export function GridSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3 px-4">
      {[0, 1].map((c) => (
        <div key={c} className="flex flex-col gap-3">
          {Array.from({ length: rows }, (_, r) => (
            <Bone key={r} className={`${(r + c) % 2 ? "aspect-[8/9]" : "aspect-[21/20]"} rounded-[10px]`} />
          ))}
        </div>
      ))}
    </div>
  );
}

/** 거래·알림·MY 같은 목록 */
export function ListSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="space-y-4 px-4 pt-2">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-3">
          <Bone className="h-16 w-14 shrink-0" />
          <div className="flex-1 space-y-2">
            <Bone className="h-4 w-2/3" />
            <Bone className="h-3 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}
