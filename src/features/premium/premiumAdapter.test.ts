import { describe, expect, it } from "vitest";
import { createPremiumProduct, requestPremiumVerdict } from "./premiumAdapter";

describe("premiumAdapter", () => {
  it("describes the 990원 precedent verdict product", () => {
    expect(createPremiumProduct()).toEqual({
      id: "precedent-verdict-990",
      title: "990원 판례 판독",
      priceLabel: "990원",
      description: "AI/서버/판례 검색 연결 시 제공되는 고급 판독",
    });
  });

  it("does not charge until Toss IAP is configured", async () => {
    await expect(requestPremiumVerdict()).resolves.toEqual({
      status: "notConfigured",
      message: "인앱결제 연결 예정",
    });
  });
});
