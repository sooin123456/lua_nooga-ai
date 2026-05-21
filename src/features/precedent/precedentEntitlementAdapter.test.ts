import { describe, expect, it, vi } from "vitest";
import { requestPrecedentEntitlement } from "./precedentEntitlementAdapter";

describe("precedentEntitlementAdapter", () => {
  it("returns not configured without an endpoint", async () => {
    await expect(
      requestPrecedentEntitlement({ orderId: "order-1" }),
    ).resolves.toEqual({
      status: "notConfigured",
      message: "판례 분석 결제 검증 서버 연결이 필요해요",
    });
  });

  it("requests a short lived entitlement token for a paid order", async () => {
    const fetcher = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ entitlementToken: "token-1" }),
    });

    await expect(
      requestPrecedentEntitlement({
        orderId: "order-1",
        endpointUrl: "https://api.example.com",
        fetcher,
      }),
    ).resolves.toEqual({
      status: "ready",
      entitlementToken: "token-1",
      message: "결제 검증이 완료됐어요",
    });

    expect(fetcher).toHaveBeenCalledWith(
      "https://api.example.com/payments/precedent-entitlement",
      {
        body: JSON.stringify({ orderId: "order-1" }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      },
    );
  });
});
