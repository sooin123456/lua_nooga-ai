import { describe, expect, it } from "vitest";
import { analyzeWithRules } from "./ruleBasedAnalyzer";

describe("analyzeWithRules", () => {
  it("returns a complete judgment with percentages that add up to 100", async () => {
    const result = await analyzeWithRules({
      text: "A: 미안한데 내가 말이 좀 셌어.\nB: 너는 항상 이기적이야. 됐고 내 말만 들어.",
    });

    expect(result.partyAPercent + result.partyBPercent).toBe(100);
    expect(result.reasons).toHaveLength(3);
    expect(result.advice.length).toBeGreaterThan(0);
    expect(result.verdict.length).toBeGreaterThan(0);
    expect(result.safetyLevel).toBe("normal");
  });

  it("keeps party percentages within readable bounds", async () => {
    const result = await analyzeWithRules({
      text: "A: 다 네 탓이야. 사과 안 하면 끝이야.\nB: 내가 늦게 말한 건 미안해. 다시 이야기하자.",
    });

    expect(result.partyAPercent).toBeGreaterThanOrEqual(5);
    expect(result.partyAPercent).toBeLessThanOrEqual(95);
    expect(result.partyBPercent).toBeGreaterThanOrEqual(5);
    expect(result.partyBPercent).toBeLessThanOrEqual(95);
  });

  it("prioritizes urgent safety signals over normal judgment", async () => {
    const result = await analyzeWithRules({
      text: "A: 죽여버린다고 했고 집 앞에서 기다리겠다고 했어.\nB: 너무 무서워.",
    });

    expect(result.safetyLevel).toBe("urgent");
    expect(result.verdict).toContain("안전");
  });
});
