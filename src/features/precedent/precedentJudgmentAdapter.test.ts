import { describe, expect, it, vi } from "vitest";
import type { JudgmentResult } from "../analyzer/types";
import { requestPrecedentJudgment } from "./precedentJudgmentAdapter";

const originalResult: JudgmentResult = {
  verdict: "A가 72% 선넘었어요",
  partyAPercent: 72,
  partyBPercent: 28,
  reasons: ["설명이 늦었어요", "사과가 짧았어요", "감정 확인이 부족했어요"],
  advice: "기다린 시간을 먼저 인정해 주세요.",
  safetyLevel: "normal",
};

const report = {
  verdict: "판례 기준으로도 A가 68% 선넘었어요",
  partyAPercent: 68,
  partyBPercent: 32,
  reasons: ["사과 지연", "감정 확인 부족", "일부 쌍방 책임"],
  advice: "먼저 사과하고 작은 보상을 제안해 보세요.",
  safetyLevel: "normal" as const,
  precedentIssues: ["사과 지연", "비난 표현", "회복 노력"],
  rebuttalPoints: ["늦은 사정이 불가피했다는 점은 반박 포인트예요."],
  reconciliationSuggestion: "커피 한 잔으로 사과를 시작해 보세요.",
  precedents: [
    {
      title: "대법원 2020다00000",
      court: "대법원",
      decidedAt: "2020-01-01",
      summary: "반복 비난과 사과 부족은 책임 판단에 참고될 수 있다.",
      similarityReason: "사과, 비난 표현이 유사해요.",
    },
  ],
};

describe("requestPrecedentJudgment", () => {
  it("returns a ready precedent report when the API succeeds", async () => {
    const fetcher = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        report,
        disclaimer: "법률 상담이 아닌 참고용 분석이에요.",
      }),
    });

    await expect(
      requestPrecedentJudgment({
        text: "A: 늦어서 미안\nB: 왜 이제 와",
        originalResult,
        entitlementToken: "paid-token",
        fetcher,
      }),
    ).resolves.toEqual({
      status: "ready",
      report,
      disclaimer: "법률 상담이 아닌 참고용 분석이에요.",
      message: "판례 AI 분석이 완료됐어요.",
    });

    expect(fetcher).toHaveBeenCalledWith("/api/ai/precedent-judgment", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Precedent-Entitlement": "paid-token",
      },
      body: JSON.stringify({
        text: "A: 늦어서 미안\nB: 왜 이제 와",
        originalResult,
      }),
    });
  });

  it("returns notConfigured when no entitlement token exists", async () => {
    await expect(
      requestPrecedentJudgment({
        text: "A: test",
        originalResult,
        entitlementToken: "",
      }),
    ).resolves.toEqual({
      status: "notConfigured",
      message: "판례 분석 결제 확인이 필요해요.",
    });
  });

  it("returns failed when the API rejects the request", async () => {
    const fetcher = vi.fn().mockResolvedValue({
      ok: false,
      status: 402,
      json: async () => ({ message: "판례 분석 결제가 필요해요." }),
    });

    await expect(
      requestPrecedentJudgment({
        text: "A: test",
        originalResult,
        entitlementToken: "expired-token",
        fetcher,
      }),
    ).resolves.toEqual({
      status: "failed",
      message: "판례 분석 결제가 필요해요.",
    });
  });

  it("returns failed when network throws", async () => {
    await expect(
      requestPrecedentJudgment({
        text: "A: test",
        originalResult,
        entitlementToken: "paid-token",
        fetcher: vi.fn().mockRejectedValue(new Error("offline")),
      }),
    ).resolves.toEqual({
      status: "failed",
      message: "판례 AI 분석을 완료하지 못했어요.",
    });
  });
});
