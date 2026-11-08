export type ItemCardData = {
  id: string;
  title: string;
  brand: string | null;
  size: string;
  pricePerDay: number;
  imageUrl: string | null;
  styleTags: string[];
  owner: { handle: string; displayName: string; avatarUrl: string | null };
  /** 이미지가 없을 때 쓰는 배경 톤 (샘플/업로드 전) */
  tone?: string;
};

export type ClosetCardData = {
  handle: string;
  displayName: string;
  avatarUrl: string | null;
  styleTags: string[];
  trustTemp: number;
  previewImages: (string | null)[];
  tones: string[];
};

export type HomeData = {
  isSample: boolean;
  newItems: ItemCardData[];
  popularClosets: ClosetCardData[];
  collections: { tag: string; imageUrl: string | null; tone: string; count: number }[];
  feed: ItemCardData[];
};
