import { describe, expect, it } from "vitest";
import { getPrecedentBasis, precedentDisclaimer } from "./precedentAdapter";

describe("precedentAdapter", () => {
  it("returns a not-configured state without bundling precedent-kr", async () => {
    await expect(
      getPrecedentBasis({ text: "A가 사과 없이 화냈어요" }),
    ).resolves.toEqual({
      status: "notConfigured",
      precedents: [],
      message: "판례 검색 서버 연결 예정",
    });
  });

  it("keeps the legal safety disclaimer explicit", () => {
    expect(precedentDisclaimer).toContain("유사한 참고 자료");
    expect(precedentDisclaimer).toContain("구체적 사실관계");
  });
});
