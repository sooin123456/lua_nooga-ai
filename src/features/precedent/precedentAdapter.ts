export type PrecedentBasisInput = {
  text: string;
  entitlementToken?: string;
  endpointUrl?: string;
  fetcher?: typeof fetch;
};

export type PrecedentBasis = {
  title: string;
  court: string;
  decidedAt: string;
  summary: string;
  similarityReason: string;
  sourceUrl?: string;
};

export type PrecedentBasisResult = {
  status: "notConfigured" | "ready" | "failed";
  precedents: PrecedentBasis[];
  message:
    | "판례 분석 서버 연결이 필요해요"
    | "유사 판례 근거를 찾았어요"
    | "판례 검색에 실패했어요";
};

export const precedentDisclaimer =
  "판례는 유사한 참고 자료이며, 실제 법률 판단은 사건의 구체적 사실관계에 따라 달라져요.";

function getDefaultPrecedentEndpointUrl() {
  const configuredUrl = import.meta.env.VITE_PRECEDENT_API_URL as
    | string
    | undefined;

  if (configuredUrl) {
    return configuredUrl;
  }

  return import.meta.env.PROD ? "/api" : undefined;
}

export async function getPrecedentBasis(
  input: PrecedentBasisInput,
): Promise<PrecedentBasisResult> {
  const endpointUrl = input.endpointUrl ?? getDefaultPrecedentEndpointUrl();

  if (!endpointUrl) {
    return {
      status: "notConfigured",
      precedents: [],
      message: "판례 분석 서버 연결이 필요해요",
    };
  }

  try {
    const response = await (input.fetcher ?? fetch)(
      `${endpointUrl.replace(/\/$/, "")}/precedents/search`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(input.entitlementToken
            ? { "X-Precedent-Entitlement": input.entitlementToken }
            : {}),
        },
        body: JSON.stringify({ text: input.text }),
      },
    );

    if (!response.ok) {
      throw new Error("Precedent API request failed");
    }

    const payload = (await response.json()) as {
      precedents?: PrecedentBasis[];
    };

    return {
      status: "ready",
      precedents: payload.precedents ?? [],
      message: "유사 판례 근거를 찾았어요",
    };
  } catch {
    return {
      status: "failed",
      precedents: [],
      message: "판례 검색에 실패했어요",
    };
  }
}
