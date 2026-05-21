export type PrecedentEntitlementResult = {
  status: "ready" | "notConfigured" | "failed";
  entitlementToken?: string;
  message: string;
};

type RequestPrecedentEntitlementInput = {
  orderId: string;
  endpointUrl?: string;
  fetcher?: typeof fetch;
};

function getDefaultPrecedentEndpointUrl() {
  const configuredUrl = import.meta.env.VITE_PRECEDENT_API_URL as
    | string
    | undefined;

  if (configuredUrl) {
    return configuredUrl;
  }

  return import.meta.env.PROD ? "/api" : undefined;
}

export async function requestPrecedentEntitlement({
  orderId,
  endpointUrl,
  fetcher,
}: RequestPrecedentEntitlementInput): Promise<PrecedentEntitlementResult> {
  const resolvedEndpointUrl = endpointUrl ?? getDefaultPrecedentEndpointUrl();

  if (!resolvedEndpointUrl) {
    return {
      status: "notConfigured",
      message: "판례 분석 결제 검증 서버 연결이 필요해요",
    };
  }

  try {
    const response = await (fetcher ?? fetch)(
      `${resolvedEndpointUrl.replace(/\/$/, "")}/payments/precedent-entitlement`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId }),
      },
    );

    if (!response.ok) {
      throw new Error("Precedent entitlement request failed");
    }

    const payload = (await response.json()) as {
      entitlementToken?: string;
    };

    if (!payload.entitlementToken) {
      throw new Error("Entitlement token is missing");
    }

    return {
      status: "ready",
      entitlementToken: payload.entitlementToken,
      message: "결제 검증이 완료됐어요",
    };
  } catch {
    return {
      status: "failed",
      message: "결제 검증에 실패했어요",
    };
  }
}
