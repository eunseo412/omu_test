import { STYLE_TAGS } from "@omu/core";
import { AppHeader } from "@/components/layout/app-header";

// 탐색: 옷이 아니라 '사람'을 추구미 태그·체형으로 찾는다 (features/profile)
export default function ExplorePage() {
  return (
    <>
      <AppHeader title="추구미 찾기" />
      <div className="flex flex-wrap gap-2 p-4">
        {STYLE_TAGS.map((tag) => (
          <span key={tag} className="rounded-full border border-neutral-200 px-3 py-1 text-sm">
            #{tag}
          </span>
        ))}
      </div>
    </>
  );
}
