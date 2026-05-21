import { openURL } from "@apps-in-toss/web-framework";

export type RewardCategory =
  | "커피/음료"
  | "디저트/간식"
  | "꽃/감정 회복"
  | "캐릭터 굿즈"
  | "생활 소품"
  | "식사권";

export type RewardRecommendation = {
  category: RewardCategory;
  searchTerms: readonly [string, string, string];
  shoppingUrl: string;
  reason: string;
  ctaLabel: "토스 쇼핑에서 비슷한 보상 찾기";
};

export type RewardSeverity = "light" | "fair" | "serious" | "legend";

export type RewardCandidateTone = "가벼운 사과" | "적정 보상" | "확실한 사과";

export type RewardCandidate = {
  tone: RewardCandidateTone;
  title: string;
  query: string;
  shoppingUrl: string;
  priceHint: string;
  message: string;
};

export type RewardChatRecommendation = RewardRecommendation & {
  blamedParty: "A" | "B";
  blamePercent: number;
  severity: RewardSeverity;
  severityLabel: string;
  luaMessage: string;
  candidates: readonly [RewardCandidate, RewardCandidate, RewardCandidate];
};

type RewardTier = {
  severity: RewardSeverity;
  severityLabel: string;
  prices: readonly [string, string, string];
};

const rewardRules: Array<{
  category: RewardCategory;
  keywords: string[];
  searchTerms: readonly [string, string, string];
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
    keywords: ["꽃", "사과 카드", "사과 선물", "화해", "미안", "기분", "감정", "편지"],
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
  searchTerms: ["미니 캔들 선물세트", "귀여운 편지지 세트", "작은 디퓨저"] as const,
  reason: "작은 선물 안에서도 잘못 정도에 맞춰 부담 없는 상품을 고를 수 있어요.",
};

const defaultShoppingSearchUrl =
  "https://service.toss.im/shopping-discovery/search?keyword={query}";

function normalizeForMatching(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, "");
}

function getMatchScore(normalizedWish: string, keyword: string) {
  const normalizedKeyword = normalizeForMatching(keyword);

  if (!normalizedKeyword || !normalizedWish.includes(normalizedKeyword)) {
    return 0;
  }

  return normalizedKeyword.length;
}

export function createRewardRecommendation(wish: string): RewardRecommendation {
  const normalizedWish = normalizeForMatching(wish);
  const match = rewardRules.reduce<
    | {
        rule: (typeof rewardRules)[number];
        score: number;
      }
    | undefined
  >((bestMatch, rule) => {
    const score = Math.max(
      ...rule.keywords.map((keyword) => getMatchScore(normalizedWish, keyword)),
    );

    if (score === 0 || (bestMatch && bestMatch.score >= score)) {
      return bestMatch;
    }

    return { rule, score };
  }, undefined);
  const recommendation = match?.rule ?? fallback;

  const primarySearchTerm = recommendation.searchTerms[0];

  return {
    category: recommendation.category,
    searchTerms: [...recommendation.searchTerms] as const,
    shoppingUrl: createShoppingSearchUrl(primarySearchTerm),
    reason: recommendation.reason,
    ctaLabel: "토스 쇼핑에서 비슷한 보상 찾기",
  };
}

function getRewardTier(blamePercent: number): RewardTier {
  if (blamePercent >= 80) {
    return {
      severity: "serious",
      severityLabel: "확실한 사과가 필요한 판정",
      prices: ["1~2만원대", "3만원대", "3만원 이상"],
    };
  }

  if (blamePercent >= 60) {
    return {
      severity: "fair",
      severityLabel: "적정 보상이 어울리는 판정",
      prices: ["5천원대", "1~2만원대", "2만원대"],
    };
  }

  return {
    severity: "light",
    severityLabel: "가벼운 사과로 충분한 판정",
    prices: ["5천원대", "5천원대", "1만원 이하"],
  };
}

export function getRewardSeverity(blamePercent: number): RewardSeverity {
  return getRewardTier(blamePercent).severity;
}

function getLuaMessage({
  blamedParty,
  blamePercent,
  category,
  severity,
}: {
  blamedParty: "A" | "B";
  blamePercent: number;
  category: RewardCategory;
  severity: RewardSeverity;
}) {
  if (severity === "legend") {
    return `${blamedParty}가 ${blamePercent}% 선넘었어요. 이 정도면 ${category}도 그냥 하나로는 약합니다. 루아 기준으로는 제대로 사과 패키지예요.`;
  }

  if (severity === "serious") {
    return `${blamedParty}가 ${blamePercent}% 선넘었어요. 말로만 미안하다고 넘기기엔 커요. ${category} 쪽으로 확실한 사과가 필요해요.`;
  }

  if (severity === "fair") {
    return `${blamedParty}가 ${blamePercent}% 선넘었어요. 분위기 풀기엔 ${category} 보상이 딱 좋아 보여요.`;
  }

  return `${blamedParty}가 ${blamePercent}% 선넘었어요. 큰 벌은 아니고, 가볍게 웃으면서 풀 수 있는 ${category} 정도면 충분해요.`;
}

export function createRewardChatRecommendation({
  wish,
  partyAPercent,
  partyBPercent,
}: {
  wish: string;
  partyAPercent: number;
  partyBPercent: number;
}): RewardChatRecommendation {
  const recommendation = createRewardRecommendation(wish);
  const blamedParty = partyAPercent >= partyBPercent ? "A" : "B";
  const blamePercent = Math.max(partyAPercent, partyBPercent);
  const rewardTier = getRewardTier(blamePercent);
  const [firstTerm, secondTerm, thirdTerm] = recommendation.searchTerms;
  const candidates = [
    {
      tone: "가벼운 사과" as const,
      title: firstTerm,
      query: firstTerm,
      shoppingUrl: createShoppingSearchUrl(firstTerm),
      priceHint: rewardTier.prices[0],
      message: "가볍게 풀 수 있는 정도의 토스 상품이에요.",
    },
    {
      tone: "적정 보상" as const,
      title: secondTerm,
      query: secondTerm,
      shoppingUrl: createShoppingSearchUrl(secondTerm),
      priceHint: rewardTier.prices[1],
      message: "잘못 정도와 부담감을 맞춘 중간 보상이에요.",
    },
    {
      tone: "확실한 사과" as const,
      title: thirdTerm,
      query: thirdTerm,
      shoppingUrl: createShoppingSearchUrl(thirdTerm),
      priceHint: rewardTier.prices[2],
      message: "상대가 아직 서운할 때 확실히 마음을 보여주는 상품이에요.",
    },
  ] as const;

  return {
    ...recommendation,
    blamedParty,
    blamePercent,
    severity: rewardTier.severity,
    severityLabel: rewardTier.severityLabel,
    luaMessage: getLuaMessage({
      blamedParty,
      blamePercent,
      category: recommendation.category,
      severity: rewardTier.severity,
    }),
    candidates,
  };
}

export function createShoppingSearchUrl(query: string) {
  const template =
    (import.meta.env.VITE_TOSS_SHOPPING_SEARCH_URL as string | undefined) ??
    defaultShoppingSearchUrl;
  const encodedQuery = encodeURIComponent(query.trim() || "작은 선물");

  if (template.includes("{query}")) {
    return template.replaceAll("{query}", encodedQuery);
  }

  const url = new URL(template);
  url.searchParams.set("keyword", query.trim() || "작은 선물");
  return url.toString();
}

export async function openRewardShopping(recommendation: RewardRecommendation) {
  await openURL(recommendation.shoppingUrl);
}

export async function openRewardCandidate(candidate: RewardCandidate) {
  await openURL(candidate.shoppingUrl);
}
