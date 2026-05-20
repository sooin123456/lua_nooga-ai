import { describe, expect, it } from "vitest";
import { createRewardRecommendation } from "./rewardAdapter";

describe("createRewardRecommendation", () => {
  it("maps sweet requests to dessert recommendations", () => {
    const recommendation = createRewardRecommendation("달달한 거 먹고 싶어");

    expect(recommendation.category).toBe("디저트/간식");
    expect(recommendation.searchTerms).toEqual(["초콜릿", "마카롱", "케이크"]);
    expect(recommendation.ctaLabel).toBe("토스 쇼핑에서 비슷한 보상 찾기");
  });

  it("maps coffee requests to drink recommendations", () => {
    const recommendation = createRewardRecommendation("아이스 아메리카노");

    expect(recommendation.category).toBe("커피/음료");
    expect(recommendation.searchTerms).toContain("커피");
  });

  it("uses a low-risk fallback for unclear requests", () => {
    const recommendation = createRewardRecommendation("");

    expect(recommendation.category).toBe("생활 소품");
    expect(recommendation.searchTerms).toEqual(["작은 선물", "편지지", "캔들"]);
  });

  it("normalizes Korean spacing before matching", () => {
    const recommendation = createRewardRecommendation("달 달한 거");

    expect(recommendation.category).toBe("디저트/간식");
  });

  it("uses the most specific match for mixed requests", () => {
    const recommendation = createRewardRecommendation("커피랑 케이크");

    expect(recommendation.category).toBe("디저트/간식");
  });

  it("does not treat every apple request as an apology gift", () => {
    const recommendation = createRewardRecommendation("사과 먹고 싶어");

    expect(recommendation.category).toBe("생활 소품");
  });

  it("does not expose shared search term arrays", () => {
    const recommendation = createRewardRecommendation("커피");
    (recommendation.searchTerms as unknown as string[])[0] = "변경됨";

    expect(createRewardRecommendation("커피").searchTerms).toEqual([
      "커피",
      "카페 쿠폰",
      "음료 교환권",
    ]);
  });
});
