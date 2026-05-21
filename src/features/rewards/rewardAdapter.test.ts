import { describe, expect, it } from "vitest";
import {
  createRewardChatRecommendation,
  createRewardRecommendation,
  createShoppingSearchUrl,
  getRewardSeverity,
} from "./rewardAdapter";

describe("createRewardRecommendation", () => {
  it("maps sweet requests to dessert recommendations", () => {
    const recommendation = createRewardRecommendation("달달한 거 먹고 싶어");

    expect(recommendation.category).toBe("디저트/간식");
    expect(recommendation.searchTerms).toEqual(["초콜릿", "마카롱", "케이크"]);
    expect(recommendation.shoppingUrl).toContain(
      encodeURIComponent("초콜릿"),
    );
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
    expect(recommendation.searchTerms).toEqual([
      "미니 캔들 선물세트",
      "귀여운 편지지 세트",
      "작은 디퓨저",
    ]);
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

  it("builds a Toss shopping search url with a safe fallback query", () => {
    expect(createShoppingSearchUrl("미니 꽃")).toContain(
      encodeURIComponent("미니 꽃"),
    );
    expect(createShoppingSearchUrl("")).toContain(
      encodeURIComponent("작은 선물"),
    );
  });
});

describe("createRewardChatRecommendation", () => {
  it("uses a 5,000 won range for light blame", () => {
    const recommendation = createRewardChatRecommendation({
      wish: "달달한 거",
      partyAPercent: 55,
      partyBPercent: 45,
    });

    expect(recommendation.severityLabel).toContain("가벼운");
    expect(recommendation.candidates[0].priceHint).toContain("5천원");
  });

  it("uses a 10,000 to 20,000 won range for medium blame", () => {
    const recommendation = createRewardChatRecommendation({
      wish: "커피",
      partyAPercent: 72,
      partyBPercent: 28,
    });

    expect(recommendation.severityLabel).toContain("적정");
    expect(recommendation.candidates.map((candidate) => candidate.priceHint)).toEqual([
      "1~2만원대",
      "1~2만원대",
      "1~2만원대",
    ]);
  });

  it("uses a 30,000 won plus range for severe blame", () => {
    const recommendation = createRewardChatRecommendation({
      wish: "귀여운 거",
      partyAPercent: 12,
      partyBPercent: 88,
    });

    expect(recommendation.severityLabel).toContain("확실한");
    expect(recommendation.candidates.map((candidate) => candidate.priceHint)).toEqual([
      "3만원대",
      "3만원대",
      "3만원대",
    ]);
  });

  it("scales candidates by the higher blame percentage", () => {
    const recommendation = createRewardChatRecommendation({
      wish: "달달한 거",
      partyAPercent: 72,
      partyBPercent: 28,
    });

    expect(recommendation.blamedParty).toBe("A");
    expect(recommendation.blamePercent).toBe(72);
    expect(recommendation.severityLabel).toBe("적정 보상이 어울리는 판정");
    expect(recommendation.luaMessage).toContain("A가 72% 선넘었어요");
    expect(recommendation.candidates).toHaveLength(3);
    expect(recommendation.candidates[0]).toMatchObject({
      tone: "가벼운 사과",
      priceHint: "1~2만원대",
      title: "고디바 초콜릿 미니박스",
    });
    expect(recommendation.candidates[2]).toMatchObject({
      tone: "확실한 사과",
      priceHint: "1~2만원대",
      title: "투썸 조각 케이크 교환권",
    });
  });

  it("uses the more responsible party when B has the higher score", () => {
    const recommendation = createRewardChatRecommendation({
      wish: "밥",
      partyAPercent: 12,
      partyBPercent: 88,
    });

    expect(recommendation.blamedParty).toBe("B");
    expect(recommendation.severity).toBe("serious");
    expect(recommendation.severityLabel).toBe("확실한 사과가 필요한 판정");
  });

  it.each([
    [
      59,
      "light",
      "가벼운 사과로 충분한 판정",
      ["5천원대", "5천원대", "5천원대"],
      "가볍게 웃으면서 풀 수 있는",
    ],
    [
      60,
      "fair",
      "적정 보상이 어울리는 판정",
      ["1~2만원대", "1~2만원대", "1~2만원대"],
      "분위기 풀기엔",
    ],
    [
      79,
      "fair",
      "적정 보상이 어울리는 판정",
      ["1~2만원대", "1~2만원대", "1~2만원대"],
      "분위기 풀기엔",
    ],
    [
      80,
      "serious",
      "확실한 사과가 필요한 판정",
      ["3만원대", "3만원대", "3만원대"],
      "확실한 사과가 필요해요",
    ],
    [
      89,
      "serious",
      "확실한 사과가 필요한 판정",
      ["3만원대", "3만원대", "3만원대"],
      "확실한 사과가 필요해요",
    ],
    [
      90,
      "serious",
      "확실한 사과가 필요한 판정",
      ["3만원대", "3만원대", "3만원대"],
      "확실한 사과가 필요해요",
    ],
  ] as const)(
    "keeps reward tier output aligned at %s percent",
    (percent, severity, severityLabel, prices, luaMessage) => {
      const recommendation = createRewardChatRecommendation({
        wish: "커피",
        partyAPercent: percent,
        partyBPercent: 100 - percent,
      });

      expect(recommendation.severity).toBe(severity);
      expect(recommendation.severityLabel).toBe(severityLabel);
      expect(recommendation.candidates.map((candidate) => candidate.priceHint)).toEqual(
        prices,
      );
      expect(recommendation.luaMessage).toContain(luaMessage);
    },
  );
});

describe("getRewardSeverity", () => {
  it.each([
    [50, "light"],
    [60, "fair"],
    [79, "fair"],
    [80, "serious"],
    [90, "serious"],
  ] as const)("maps %s percent to %s", (percent, severity) => {
    expect(getRewardSeverity(percent)).toBe(severity);
  });
});
