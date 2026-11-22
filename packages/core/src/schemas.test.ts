import { describe, expect, it } from "vitest";
import { profileInputSchema } from "./schemas";

describe("profileInputSchema", () => {
  it("normalizes handle to lowercase and trims", () => {
    const r = profileInputSchema.parse({ displayName: " 준 ", handle: " Minimal.Jun " });
    expect(r.handle).toBe("minimal.jun");
    expect(r.displayName).toBe("준");
    expect(r.styleTags).toEqual([]);
    expect(r.heightCm).toBeNull();
  });
  it("rejects invalid handle", () => {
    expect(profileInputSchema.safeParse({ displayName: "a", handle: "한글아이디" }).success).toBe(false);
    expect(profileInputSchema.safeParse({ displayName: "a", handle: "ab" }).success).toBe(false);
  });
  it("limits style tags to 5", () => {
    const r = profileInputSchema.safeParse({
      displayName: "a", handle: "abc", styleTags: ["프렌치시크", "캐주얼", "스트릿", "빈티지", "클래식", "페미닌"],
    });
    expect(r.success).toBe(false);
  });
});

import { HEIGHT_RANGES, WEIGHT_RANGES, rangeKeyFor, rangeOf } from "./schemas";

describe("body filter ranges", () => {
  it("finds the range for a value", () => {
    expect(rangeKeyFor(HEIGHT_RANGES, 163)).toBe("160-165");
    expect(rangeKeyFor(HEIGHT_RANGES, 150)).toBe("-155");
    expect(rangeKeyFor(HEIGHT_RANGES, 185)).toBe("180-");
    expect(rangeKeyFor(WEIGHT_RANGES, 50)).toBe("50-55");
    expect(rangeKeyFor(WEIGHT_RANGES, null)).toBeNull();
  });
  it("weight bounds are 5kg steps (DB rule)", () => {
    for (const r of WEIGHT_RANGES) for (const v of [r.min, r.max]) if (v != null) expect(v % 5).toBe(0);
  });
  it("looks up by key", () => {
    expect(rangeOf(WEIGHT_RANGES, "60-65")?.min).toBe(60);
    expect(rangeOf(WEIGHT_RANGES, "x")).toBeNull();
  });
  it("profile accepts gender and weight", () => {
    const r = profileInputSchema.parse({ displayName: "a", handle: "abc", gender: "female", weightKg: 52 });
    expect(r.gender).toBe("female");
    expect(profileInputSchema.safeParse({ displayName: "a", handle: "abc", weightKg: 10 }).success).toBe(false);
  });
});
