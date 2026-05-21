import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { analyzeWithAi } from "./freeJudgmentAdapter";
import type { JudgmentResult } from "./types";

const aiResult: JudgmentResult = {
  verdict: "A가 72% 선넘었어요",
  partyAPercent: 72,
  partyBPercent: 28,
  reasons: ["사과가 늦었어요", "말투가 강했어요", "상대 감정을 놓쳤어요"],
  advice: "먼저 미안했던 지점을 짚어주세요.",
  safetyLevel: "normal",
  userPerspectiveVerdict: "내가 72% 선넘었어요",
};

describe("analyzeWithAi", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns server AI result when API succeeds", async () => {
    const fetcher = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ result: aiResult, remainingFreeUses: 2 }),
    });

    const result = await analyzeWithAi({
      text: "A: 미안\nB: 괜찮아",
      userPerspective: "first",
      fetcher,
    });

    expect(result).toEqual({
      status: "ready",
      result: aiResult,
      remainingFreeUses: 2,
    });
    expect(fetcher).toHaveBeenCalledWith("/api/ai/free-judgment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: expect.any(String),
    });
    expect(JSON.parse(fetcher.mock.calls[0][1].body)).toEqual({
      text: "A: 미안\nB: 괜찮아",
      userPerspective: "first",
      anonymousUserKey: expect.any(String),
    });
  });

  it("returns server AI result when localStorage access throws", async () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("storage unavailable");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("storage unavailable");
    });
    const fetcher = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ result: aiResult, remainingFreeUses: 1 }),
    });

    const result = await analyzeWithAi({
      text: "A: 미안\nB: 괜찮아",
      userPerspective: "first",
      fetcher,
    });

    expect(result).toEqual({
      status: "ready",
      result: aiResult,
      remainingFreeUses: 1,
    });
    expect(JSON.parse(fetcher.mock.calls[0][1].body)).toEqual({
      text: "A: 미안\nB: 괜찮아",
      userPerspective: "first",
      anonymousUserKey: expect.any(String),
    });
  });

  it("returns limited status when daily quota is exhausted", async () => {
    const fetcher = vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      json: async () => ({ message: "오늘 무료 판독을 모두 사용했어요." }),
    });

    const result = await analyzeWithAi({
      text: "A: 왜 그래",
      userPerspective: "unknown",
      fetcher,
    });

    expect(result).toEqual({
      status: "limited",
      message: "오늘 무료 판독을 모두 사용했어요.",
      remainingFreeUses: 0,
    });
  });

  it("returns limited status with default message when quota response JSON is invalid", async () => {
    const fetcher = vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      json: async () => {
        throw new Error("invalid json");
      },
    });

    const result = await analyzeWithAi({
      text: "A: 왜 그래",
      userPerspective: "unknown",
      fetcher,
    });

    expect(result).toEqual({
      status: "limited",
      message: "오늘 무료 판독을 모두 사용했어요.",
      remainingFreeUses: 0,
    });
  });

  it("falls back to local rule analyzer when network fails", async () => {
    const result = await analyzeWithAi({
      text: "A: 너는 항상 그래\nB: 미안해",
      userPerspective: "unknown",
      fetcher: vi.fn().mockRejectedValue(new Error("offline")),
    });

    expect(result.status).toBe("fallback");
    expect(result.message).toBe(
      "AI 서버 연결이 불안정해서 기기 안에서 가볍게 판독했어요.",
    );
    expect(result.result.reasons).toHaveLength(3);
    expect(result.result.verdict).toMatch(/[AB]가 \d+% 선넘었어요/);
  });
});
