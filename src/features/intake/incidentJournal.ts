import type { IncidentIntakeSummary } from "./incidentIntake";
import { topicLabels } from "./incidentIntake";

export type IncidentJournalItem = {
  id: string;
  text: string;
};

export function normalizeJournalItems(
  items: IncidentJournalItem[],
): IncidentJournalItem[] {
  return items
    .map((item) => ({ ...item, text: item.text.trim() }))
    .filter((item) => item.text.length > 0);
}

export function createJournalItemsFromSummary(
  summary: IncidentIntakeSummary,
): IncidentJournalItem[] {
  const claimItems = [
    summary.partyAClaim.trim()
      ? {
          id: "claim-a",
          text: `${summary.partyA}: ${summary.partyAClaim.trim()}`,
        }
      : null,
    summary.partyBClaim.trim()
      ? {
          id: "claim-b",
          text: `${summary.partyB}: ${summary.partyBClaim.trim()}`,
        }
      : null,
  ].filter((item): item is IncidentJournalItem => item !== null);

  if (claimItems.length > 0) {
    return [
      ...claimItems,
      ...summary.issues.map((issue, index) => ({
        id: `issue-${index + 1}`,
        text: `핵심 쟁점: ${issue}`,
      })),
    ];
  }

  const dialogueItems = summary.normalizedDialogue
    .slice(0, 5)
    .map((line, index) => ({
      id: `line-${index + 1}`,
      text: line,
    }));

  if (dialogueItems.length > 0) {
    return dialogueItems;
  }

  return [
    { id: "issue-1", text: `싸움 주제: ${topicLabels[summary.topic]}` },
    { id: "issue-2", text: summary.title },
  ];
}

export function buildJudgeText({
  summary,
  journalItems,
  originalText,
  extraContext,
}: {
  summary: IncidentIntakeSummary;
  journalItems: IncidentJournalItem[];
  originalText: string;
  extraContext: string;
}) {
  const normalizedItems = normalizeJournalItems(journalItems);
  const journalText = normalizedItems
    .map((item, index) => `${index + 1}. ${item.text}`)
    .join("\n");

  return [
    "[루아 사건 접수서]",
    `제목: ${summary.title}`,
    `싸움 주제: ${topicLabels[summary.topic]}`,
    "",
    "[사용자가 확인한 싸움 일지]",
    journalText ||
      "확인된 싸움 일지가 비어 있어 원본 자료를 기준으로 판독합니다.",
    "",
    "[추가 맥락]",
    extraContext.trim() || "없음",
    "",
    "원본 자료:",
    originalText.trim(),
  ].join("\n");
}
