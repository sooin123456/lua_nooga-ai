import { describe, expect, it } from "vitest";
import type { IncidentIntakeSummary } from "./incidentIntake";
import {
  buildJudgeText,
  createJournalItemsFromSummary,
  normalizeJournalItems,
} from "./incidentJournal";

const summary: IncidentIntakeSummary = {
  title: "답장 지연으로 시작된 싸움",
  topic: "reply",
  partyA: "첫 번째 사람",
  partyB: "두 번째 사람",
  partyAClaim: "답장이 늦어 서운했어요.",
  partyBClaim: "회의 중이라 바로 답하지 못했어요.",
  issues: ["답장 지연", "사전 설명", "말투"],
  missingQuestions: ["회의 시간이 미리 공유됐나요?"],
  completeness: "needs_context",
  normalizedDialogue: ["A: 왜 답장을 안 해?", "B: 회의였어"],
  judgeText: "[루아 사건 접수서]\n기존 요약",
};

describe("incidentJournal", () => {
  it("creates numbered journal items from summary claims and issues", () => {
    expect(createJournalItemsFromSummary(summary)).toEqual([
      { id: "claim-a", text: "첫 번째 사람: 답장이 늦어 서운했어요." },
      {
        id: "claim-b",
        text: "두 번째 사람: 회의 중이라 바로 답하지 못했어요.",
      },
      { id: "issue-1", text: "핵심 쟁점: 답장 지연" },
      { id: "issue-2", text: "핵심 쟁점: 사전 설명" },
      { id: "issue-3", text: "핵심 쟁점: 말투" },
    ]);
  });

  it("uses normalized dialogue when claims are empty", () => {
    expect(
      createJournalItemsFromSummary({
        ...summary,
        partyAClaim: "",
        partyBClaim: "",
      }).slice(0, 2),
    ).toEqual([
      { id: "line-1", text: "A: 왜 답장을 안 해?" },
      { id: "line-2", text: "B: 회의였어" },
    ]);
  });

  it("normalizes edited journal items by trimming and removing blanks", () => {
    expect(
      normalizeJournalItems([
        { id: "a", text: "  하나  " },
        { id: "b", text: "" },
        { id: "c", text: "둘" },
      ]),
    ).toEqual([
      { id: "a", text: "하나" },
      { id: "c", text: "둘" },
    ]);
  });

  it("builds final judge text from confirmed journal and original evidence", () => {
    expect(
      buildJudgeText({
        summary,
        journalItems: [
          { id: "custom-1", text: "A가 먼저 서운함을 표현했어요." },
          { id: "custom-2", text: "B는 회의 중이었다고 설명했어요." },
        ],
        originalText: "A: 왜 답장을 안 해?\nB: 회의였어",
        extraContext: "연락 문제로 자주 다퉜어요.",
      }),
    ).toContain("사용자가 확인한 싸움 일지");
    expect(
      buildJudgeText({
        summary,
        journalItems: [
          { id: "custom-1", text: "A가 먼저 서운함을 표현했어요." },
        ],
        originalText: "A: 원본",
        extraContext: "",
      }),
    ).toContain("원본 자료:\nA: 원본");
  });
});
