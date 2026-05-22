import { describe, expect, it, vi } from "vitest";
import { getPrecedentBasis, precedentDisclaimer } from "./precedentAdapter";

describe("precedentAdapter", () => {
  it("returns a not-configured state without bundling precedent-kr", async () => {
    await expect(
      getPrecedentBasis({ text: "A가 사과 없이 화냈어요" }),
    ).resolves.toEqual({
      status: "notConfigured",
      precedents: [],
      message: "판례 분석 서버 연결이 필요해요",
    });
  });

  it("keeps the legal safety disclaimer explicit", () => {
    expect(precedentDisclaimer).toContain("유사한 참고 자료");
    expect(precedentDisclaimer).toContain("구체적 사실관계");
  });

  it("fetches precedent basis from a configured precedent server", async () => {
    const fetcher = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        precedents: [
          {
            title: "대법원 2020다00000",
            court: "대법원",
            decidedAt: "2020-01-01",
            summary: "반복적 모욕 표현은 책임 판단에 영향을 줄 수 있다는 취지",
            similarityReason: "대화에서 반복 비난 표현이 확인됨",
            sourceUrl: "https://example.com/case",
          },
        ],
      }),
    });

    await expect(
      getPrecedentBasis({
        text: "A: 너 때문이야",
        endpointUrl: "https://api.example.com",
        fetcher,
      }),
    ).resolves.toEqual({
      status: "ready",
      precedents: [
        {
          title: "대법원 2020다00000",
          court: "대법원",
          decidedAt: "2020-01-01",
          summary: "반복적 모욕 표현은 책임 판단에 영향을 줄 수 있다는 취지",
          similarityReason: "대화에서 반복 비난 표현이 확인됨",
          sourceUrl: "https://example.com/case",
        },
      ],
      message: "유사 판례 근거를 찾았어요",
    });
    expect(fetcher).toHaveBeenCalledWith(
      "https://api.example.com/precedents/search",
      {
        body: JSON.stringify({ text: "A: 너 때문이야" }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      },
    );
  });

  it("sends the paid entitlement token to the precedent server", async () => {
    const fetcher = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ precedents: [] }),
    });

    await getPrecedentBasis({
      text: "A: 너 때문이야",
      entitlementToken: "paid-token",
      endpointUrl: "https://api.example.com",
      fetcher,
    });

    expect(fetcher).toHaveBeenCalledWith(
      "https://api.example.com/precedents/search",
      expect.objectContaining({
        headers: {
          "Content-Type": "application/json",
          "X-Precedent-Entitlement": "paid-token",
        },
      }),
    );
  });
});
