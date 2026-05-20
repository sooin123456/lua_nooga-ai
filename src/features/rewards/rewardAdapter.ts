export type RewardCategory =
  | "커피/음료"
  | "디저트/간식"
  | "꽃/감정 회복"
  | "캐릭터 굿즈"
  | "생활 소품"
  | "식사권";

export type RewardRecommendation = {
  category: RewardCategory;
  searchTerms: [string, string, string];
  reason: string;
  ctaLabel: "토스 쇼핑에서 비슷한 보상 찾기";
};

const rewardRules: Array<{
  category: RewardCategory;
  keywords: string[];
  searchTerms: [string, string, string];
  reason: string;
}> = [
  {
    category: "커피/음료",
    keywords: ["커피", "아메리카노", "라떼", "음료", "카페", "버블티"],
    searchTerms: ["커피", "카페 쿠폰", "음료 교환권"],
    reason: "가볍게 사과하고 바로 건네기 좋은 보상이에요.",
  },
  {
    category: "디저트/간식",
    keywords: ["달달", "디저트", "간식", "초콜릿", "케이크", "마카롱", "젤리"],
    searchTerms: ["초콜릿", "마카롱", "케이크"],
    reason: "분위기를 부드럽게 풀기 좋은 달콤한 보상이에요.",
  },
  {
    category: "꽃/감정 회복",
    keywords: ["꽃", "사과", "화해", "기분", "감정", "편지"],
    searchTerms: ["꽃다발", "미니 꽃", "사과 카드"],
    reason: "말로 부족한 사과를 모양으로 보여주기 좋아요.",
  },
  {
    category: "캐릭터 굿즈",
    keywords: ["귀여운", "캐릭터", "인형", "키링", "굿즈"],
    searchTerms: ["캐릭터 키링", "미니 인형", "스티커"],
    reason: "무겁지 않게 웃으면서 넘기기 좋은 보상이에요.",
  },
  {
    category: "식사권",
    keywords: ["밥", "식사", "저녁", "점심", "치킨", "피자", "고기"],
    searchTerms: ["식사권", "치킨 쿠폰", "피자 쿠폰"],
    reason: "제대로 앉아서 다시 이야기할 명분을 만들어줘요.",
  },
];

const fallback = {
  category: "생활 소품" as const,
  searchTerms: ["작은 선물", "편지지", "캔들"] as [string, string, string],
  reason: "취향을 잘 모를 때도 부담 없이 고르기 좋은 보상이에요.",
};

export function createRewardRecommendation(wish: string): RewardRecommendation {
  const normalizedWish = wish.trim().toLowerCase();
  const match = rewardRules.find((rule) =>
    rule.keywords.some((keyword) => normalizedWish.includes(keyword)),
  );
  const recommendation = match ?? fallback;

  return {
    category: recommendation.category,
    searchTerms: recommendation.searchTerms,
    reason: recommendation.reason,
    ctaLabel: "토스 쇼핑에서 비슷한 보상 찾기",
  };
}
