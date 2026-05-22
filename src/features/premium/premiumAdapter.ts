import { IAP } from "@apps-in-toss/web-framework";

export type PremiumProduct = {
  id: string;
  title: "억울하면 판례로 다시 따지기";
  priceLabel: "990원";
  description: "결과가 억울하거나 상대가 인정하지 않으면 유사 판례 기준으로 한 번 더 확인해요";
};

export type PremiumOrderResult = {
  orderId: string;
  displayName: string;
  displayAmount: string;
  amount: number;
  currency: string;
  fraction: number;
  miniAppIconUrl: string | null;
};

type PremiumSuccessEvent = {
  type: "success";
  data: PremiumOrderResult;
};

type CreateOneTimePurchaseOrderOptions = {
  options: {
    sku: string;
    processProductGrant(params: { orderId: string }): boolean | Promise<boolean>;
  };
  onEvent(event: PremiumSuccessEvent): void | Promise<void>;
  onError(error: unknown): void | Promise<void>;
};

export type PremiumPaymentGateway = {
  createOneTimePurchaseOrder(
    options: CreateOneTimePurchaseOrderOptions,
  ): (() => void) | Promise<() => void>;
};

export type PremiumVerdictRequestResult = {
  status: "notConfigured";
  message: "인앱결제 연결 예정";
} | {
  status: "paid";
  orderId: string;
  message: "결제가 완료됐어요";
} | {
  status: "failed";
  message: "결제에 실패했어요";
};

type RequestPremiumVerdictOptions = {
  gateway?: PremiumPaymentGateway;
  sku?: string;
};

export const defaultPremiumSku = "precedent-verdict-990";

function getConfiguredPremiumSku() {
  return (
    (import.meta.env.VITE_TOSS_IAP_PRECEDENT_SKU as string | undefined) ??
    defaultPremiumSku
  );
}

export function createPremiumProduct(): PremiumProduct {
  return {
    id: getConfiguredPremiumSku(),
    title: "억울하면 판례로 다시 따지기",
    priceLabel: "990원",
    description: "결과가 억울하거나 상대가 인정하지 않으면 유사 판례 기준으로 한 번 더 확인해요",
  };
}

export async function requestPremiumVerdict(
  options: RequestPremiumVerdictOptions = {},
): Promise<PremiumVerdictRequestResult> {
  const gateway = options.gateway ?? IAP;
  const sku = options.sku ?? getConfiguredPremiumSku();

  if (!gateway?.createOneTimePurchaseOrder) {
    return {
      status: "notConfigured",
      message: "인앱결제 연결 예정",
    };
  }

  return new Promise((resolve) => {
    let cleanup: (() => void) | undefined;

    try {
      void Promise.resolve(
        gateway.createOneTimePurchaseOrder({
          options: {
            sku,
            processProductGrant: () => true,
          },
          onEvent: (event) => {
            cleanup?.();
            resolve({
              status: "paid",
              orderId: event.data.orderId,
              message: "결제가 완료됐어요",
            });
          },
          onError: () => {
            cleanup?.();
            resolve({
              status: "failed",
              message: "결제에 실패했어요",
            });
          },
        }),
      ).then((nextCleanup) => {
        cleanup = nextCleanup;
      });
    } catch {
      resolve({
        status: "notConfigured",
        message: "인앱결제 연결 예정",
      });
    }
  });
}
