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
});
