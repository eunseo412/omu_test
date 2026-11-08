import { z } from "zod";

/** 추구미(스타일) 태그. 베타에서는 고정 목록, 이후 DB 테이블로 이전. */
export const STYLE_TAGS = [
  "미니멀", "캐주얼", "스트릿", "빈티지", "클래식", "아메카지",
  "고프코어", "러블리", "시크", "Y2K", "포멀", "스포티",
] as const;

export const ITEM_CATEGORIES = ["top", "bottom", "outer", "dress", "shoes", "bag", "acc"] as const;
export const ITEM_SIZES = ["XS", "S", "M", "L", "XL", "XXL", "FREE"] as const;
export const HANDOFF_METHODS = ["in_person", "delivery"] as const; // 베타: 교내 대면 위주

export const itemInputSchema = z.object({
  title: z.string().min(2).max(60),
  description: z.string().max(1000).default(""),
  category: z.enum(ITEM_CATEGORIES),
  size: z.enum(ITEM_SIZES),
  brand: z.string().max(40).optional(),
  styleTags: z.array(z.enum(STYLE_TAGS)).max(5).default([]),
  pricePerDay: z.number().int().min(0).max(1_000_000),
  deposit: z.number().int().min(0).max(5_000_000),
  minDays: z.number().int().min(1).max(30).default(1),
  maxDays: z.number().int().min(1).max(60).default(7),
  forSale: z.boolean().default(false), // 3차 수익원(중고판매) 대비 플래그
  handoffMethods: z.array(z.enum(HANDOFF_METHODS)).min(1),
}).refine((v) => v.minDays <= v.maxDays, { message: "최소 대여일이 최대 대여일보다 클 수 없습니다", path: ["minDays"] });
export type ItemInput = z.infer<typeof itemInputSchema>;

export const rentalRequestSchema = z.object({
  itemId: z.string().uuid(),
  startDate: z.string().date(),
  endDate: z.string().date(),
  handoffMethod: z.enum(HANDOFF_METHODS),
  message: z.string().max(500).optional(),
});
export type RentalRequest = z.infer<typeof rentalRequestSchema>;

/** 거래 종료 후 상호 평가 (신뢰도 온도 산정 입력값) */
export const reviewInputSchema = z.object({
  rentalId: z.string().uuid(),
  condition: z.number().int().min(1).max(5), // 의류 상태 / 반납 상태
  punctuality: z.number().int().min(1).max(5), // 기한 준수
  manner: z.number().int().min(1).max(5), // 소통 매너
  comment: z.string().max(300).optional(),
});
export type ReviewInput = z.infer<typeof reviewInputSchema>;

export const CATEGORY_LABELS: Record<(typeof ITEM_CATEGORIES)[number], string> = {
  top: "상의", bottom: "하의", outer: "아우터", dress: "원피스", shoes: "신발", bag: "가방", acc: "액세서리",
};
export const HANDOFF_LABELS: Record<(typeof HANDOFF_METHODS)[number], string> = {
  in_person: "직거래(대면)", delivery: "택배",
};
export const MAX_ITEM_IMAGES = 8;

/** 프로필 편집. 체형 정보는 '나와 비슷한 사람' 찾기에 쓰인다. */
export const HANDLE_RE = /^[a-z0-9_.]{3,20}$/;
export const profileInputSchema = z.object({
  displayName: z.string().trim().min(1, "이름을 입력해 주세요.").max(20, "이름은 20자 이하로 입력해 주세요."),
  handle: z.string().trim().toLowerCase().regex(HANDLE_RE, "아이디는 영문 소문자·숫자·_·. 3~20자로 입력해 주세요."),
  bio: z.string().trim().max(150, "소개는 150자 이하로 입력해 주세요.").default(""),
  styleTags: z.array(z.enum(STYLE_TAGS)).max(5, "추구미는 최대 5개까지 고를 수 있어요.").default([]),
  heightCm: z.number().int().min(120, "키를 확인해 주세요.").max(230, "키를 확인해 주세요.").nullable().default(null),
  topSize: z.enum(ITEM_SIZES).nullable().default(null),
  bottomSize: z.enum(ITEM_SIZES).nullable().default(null),
  shoeSize: z.number().int().min(200, "신발 사이즈는 mm로 입력해 주세요.").max(320, "신발 사이즈는 mm로 입력해 주세요.").nullable().default(null),
  avatarPath: z.string().max(300).nullable().default(null),
});
export type ProfileInput = z.infer<typeof profileInputSchema>;
