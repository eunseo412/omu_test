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
      displayName: "a", handle: "abc", styleTags: ["미니멀", "캐주얼", "스트릿", "빈티지", "클래식", "시크"],
    });
    expect(r.success).toBe(false);
  });
});
