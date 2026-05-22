import { describe, expect, it, vi } from "vitest";
import {
  createPremiumProduct,
  defaultPremiumSku,
  requestPremiumVerdict,
  type PremiumPaymentGateway,
} from "./premiumAdapter";

describe("premiumAdapter", () => {
  it("describes the 990원 objection precedent product", () => {
    expect(createPremiumProduct()).toEqual({
      id: "precedent-verdict-990",
      title: "억울하면 판례로 다시 따지기",
      priceLabel: "990원",
      description: "결과가 억울하거나 상대가 인정하지 않으면 유사 판례 기준으로 한 번 더 확인해요",
    });
  });

  it("does not charge until Toss IAP is configured", async () => {
    await expect(requestPremiumVerdict()).resolves.toEqual({
      status: "notConfigured",
      message: "인앱결제 연결 예정",
    });
  });

  it("requests a Toss IAP order with the precedent verdict sku", async () => {
    const gateway: PremiumPaymentGateway = {
      createOneTimePurchaseOrder: vi.fn(async ({ onEvent }) => {
        await onEvent({
          type: "success",
          data: {
            orderId: "order-1",
            displayName: "억울하면 판례로 다시 따지기",
            displayAmount: "990원",
            amount: 990,
            currency: "KRW",
            fraction: 0,
            miniAppIconUrl: null,
          },
        });
        return () => undefined;
      }),
    };

    await expect(requestPremiumVerdict({ gateway })).resolves.toEqual({
      status: "paid",
      orderId: "order-1",
      message: "결제가 완료됐어요",
    });
    expect(gateway.createOneTimePurchaseOrder).toHaveBeenCalledWith(
      expect.objectContaining({
        options: expect.objectContaining({
          sku: "precedent-verdict-990",
        }),
      }),
    );
  });

  it("can request payment with an injected operational sku", async () => {
    const gateway: PremiumPaymentGateway = {
      createOneTimePurchaseOrder: vi.fn(async ({ onEvent }) => {
        await onEvent({
          type: "success",
          data: {
            orderId: "order-2",
            displayName: "억울하면 판례로 다시 따지기",
            displayAmount: "990원",
            amount: 990,
            currency: "KRW",
            fraction: 0,
            miniAppIconUrl: null,
          },
        });
        return () => undefined;
      }),
    };

    await requestPremiumVerdict({ gateway, sku: "console-sku-990" });

    expect(defaultPremiumSku).toBe("precedent-verdict-990");
    expect(gateway.createOneTimePurchaseOrder).toHaveBeenCalledWith(
      expect.objectContaining({
        options: expect.objectContaining({
          sku: "console-sku-990",
        }),
      }),
    );
  });
});
