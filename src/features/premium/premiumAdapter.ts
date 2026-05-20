export type PremiumProduct = {
  id: "precedent-verdict-990";
  title: "990원 판례 판독";
  priceLabel: "990원";
  description: "AI/서버/판례 검색 연결 시 제공되는 고급 판독";
};

export type PremiumVerdictRequestResult = {
  status: "notConfigured";
  message: "인앱결제 연결 예정";
};

export function createPremiumProduct(): PremiumProduct {
  return {
    id: "precedent-verdict-990",
    title: "990원 판례 판독",
    priceLabel: "990원",
    description: "AI/서버/판례 검색 연결 시 제공되는 고급 판독",
  };
}

export async function requestPremiumVerdict(): Promise<PremiumVerdictRequestResult> {
  return {
    status: "notConfigured",
    message: "인앱결제 연결 예정",
  };
}
