import { STYLE_TAGS } from "@omu/core";
import { getDiscover } from "@/features/feed/queries";
import { DiscoverView } from "@/features/feed/components/discover-view";

export const dynamic = "force-dynamic";

export default async function HomePage({ searchParams }: { searchParams: Promise<{ tag?: string; q?: string }> }) {
  const { tag, q } = await searchParams;
  const activeTag = tag && (STYLE_TAGS as readonly string[]).includes(tag) ? tag : null;
  const query = (q ?? "").trim();
  const data = await getDiscover({ tag: activeTag, q: query });
  // 검색어가 스타일 이름이면 그 칩이 선택된 것처럼 보이게
  const tagFromQuery = (STYLE_TAGS as readonly string[]).find((t) => t === query.replace(/^#/, "")) ?? null;
  return <DiscoverView data={data} tag={activeTag ?? tagFromQuery} q={tagFromQuery ? "" : query} />;
}
