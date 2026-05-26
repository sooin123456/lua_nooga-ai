import { describe, expect, it, vi } from "vitest";
import { prepareIncidentIntake } from "./incidentIntakeAdapter";

const input = {
  text: "오후 10:31 나: 왜 답장을 안 해?\n오후 10:35 상대: 회의였어",
  topic: "reply" as const,
  extraContext: "연락 문제로 자주 다퉜어요.",
  userPerspective: "first" as const,
};

describe("prepareIncidentIntake", () => {
  it("returns a structured incident summary from the API", async () => {
    const fetcher = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        summary: {
          title: "답장 지연으로 시작된 싸움",
          topic: "reply",
          partyA: "첫 번째 사람",
          partyB: "두 번째 사람",
          partyAClaim: "답장이 늦어 서운했어요.",
          partyBClaim: "회의 중이라 바로 답하지 못했어요.",
          issues: ["답장 지연", "사전 설명", "말투"],
          missingQuestions: [],
          completeness: "enough",
          normalizedDialogue: ["A: 왜 답장을 안 해?", "B: 회의였어"],
          judgeText: "싸움 주제: 연락 문제",
        },
      }),
    });

    await expect(
      prepareIncidentIntake({
        ...input,
        endpointUrl: "/api/test-intake",
        fetcher: fetcher as never,
      }),
    ).resolves.toMatchObject({
      status: "ready",
      summary: {
        title: "답장 지연으로 시작된 싸움",
        issues: ["답장 지연", "사전 설명", "말투"],
      },
    });
    expect(fetcher).toHaveBeenCalledWith("/api/test-intake", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
  });

  it("falls back to a local incident summary when the API fails", async () => {
    const fetcher = vi.fn().mockRejectedValue(new Error("offline"));

    await expect(
      prepareIncidentIntake({
        ...input,
        fetcher: fetcher as never,
      }),
    ).resolves.toMatchObject({
      status: "fallback",
      summary: {
        topic: "reply",
        completeness: "enough",
      },
    });
  });
});
