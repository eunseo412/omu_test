import { STYLE_TAGS } from "@omu/core";
import type { ClosetCardData, HomeData, ItemCardData } from "./types";

// Supabase 연결 전/데이터가 없을 때 화면 구성을 확인하기 위한 샘플.
// 실제 옷 사진이 올라오면 자동으로 대체된다.
export const TONES = [
  "#d9cbb8", "#2f3a4a", "#b8c4a8", "#e8d5d0", "#5b4636", "#c9d6df",
  "#1f1f1f", "#efe6d8", "#8a9a8c", "#d4a59a", "#3e4a3d", "#f1efe9",
];

const owners = [
  { handle: "minimal.jun", displayName: "준", tags: ["미니멀", "클래식"] },
  { handle: "vintage_soo", displayName: "수아", tags: ["빈티지", "아메카지"] },
  { handle: "street.hyun", displayName: "현", tags: ["스트릿", "고프코어"] },
  { handle: "lovely.yeon", displayName: "연", tags: ["러블리", "Y2K"] },
  { handle: "chic.min", displayName: "민", tags: ["시크", "포멀"] },
  { handle: "sporty.dan", displayName: "단", tags: ["스포티", "캐주얼"] },
];

const titles = [
  ["울 블렌드 싱글 코트", "COS"], ["워싱 데님 트러커", "Levi's"], ["나일론 바람막이", "Arc'teryx"],
  ["퍼프 슬리브 블라우스", null], ["테일러드 와이드 슬랙스", "Our Legacy"], ["트랙 재킷", "adidas"],
  ["캐시미어 니트", "Uniqlo U"], ["코듀로이 셔츠", null], ["카고 팬츠", "Stussy"],
  ["플리츠 미니 스커트", null], ["레더 블레이저", "Zara"], ["후드 스웨트셔츠", "Carhartt WIP"],
];

export const SAMPLE_ITEMS: ItemCardData[] = titles.map(([title, brand], i) => {
  const o = owners[i % owners.length];
  return {
    id: `sample-${i}`,
    title: title!,
    brand,
    size: ["S", "M", "L", "FREE"][i % 4],
    pricePerDay: [3000, 4000, 5000, 2500, 6000][i % 5],
    imageUrl: null,
    tone: TONES[i % TONES.length],
    styleTags: o.tags,
    owner: { handle: o.handle, displayName: o.displayName, avatarUrl: null },
  };
});

const closets: ClosetCardData[] = owners.map((o, i) => ({
  handle: o.handle,
  displayName: o.displayName,
  avatarUrl: null,
  styleTags: o.tags,
  trustTemp: [38.2, 37.4, 36.9, 39.1, 36.5, 37.8][i],
  previewImages: [null, null, null],
  tones: [TONES[i], TONES[(i + 4) % 12], TONES[(i + 8) % 12]],
}));

export const SAMPLE_HOME: HomeData = {
  isSample: true,
  newItems: SAMPLE_ITEMS.slice(0, 6),
  popularClosets: closets,
  collections: STYLE_TAGS.slice(0, 8).map((tag, i) => ({ tag, imageUrl: null, tone: TONES[(i * 5) % 12], count: 0 })),
  feed: [...SAMPLE_ITEMS.slice(6), ...SAMPLE_ITEMS.slice(0, 6)],
};
