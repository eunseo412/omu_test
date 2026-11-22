import { GENDERS, HEIGHT_RANGES, STYLE_TAGS, WEIGHT_RANGES, rangeOf, type Gender } from "@omu/core";
import { getDiscover, getMyBody, type BodyFilter } from "@/features/feed/queries";
import { DiscoverView } from "@/features/feed/components/discover-view";

export const dynamic = "force-dynamic";

export default async function HomePage({
  searchParams,
}: { searchParams: Promise<{ tag?: string; q?: string; g?: string; h?: string; w?: string }> }) {
  const { tag, q, g, h, w } = await searchParams;
  // 잘못된 값은 무시 (URL을 직접 고쳐도 안전하게)
  const body: BodyFilter = {
    gender: g && (GENDERS as readonly string[]).includes(g) ? (g as Gender) : null,
    height: rangeOf(HEIGHT_RANGES, h) ? h! : null,
    weight: rangeOf(WEIGHT_RANGES, w) ? w! : null,
  };
  const filtered = Boolean(body.gender || body.height || body.weight);
  const activeTag = tag && (STYLE_TAGS as readonly string[]).includes(tag) ? tag : null;
  const query = (q ?? "").trim();
  const [data, myBody] = await Promise.all([getDiscover({ tag: activeTag, q: query, body }), getMyBody()]);
  // 검색어가 스타일 이름이면 그 칩이 선택된 것처럼 보이게
  const tagFromQuery = (STYLE_TAGS as readonly string[]).find((t) => t === query.replace(/^#/, "")) ?? null;
  return <DiscoverView data={data} tag={activeTag ?? tagFromQuery} q={tagFromQuery ? "" : query} myBody={myBody} filtered={filtered} />;
}
