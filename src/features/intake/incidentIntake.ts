import type { UserPerspective } from "../analyzer/types";

export type IncidentTopic =
  | "unspecified"
  | "reply"
  | "schedule"
  | "tone"
  | "money"
  | "jealousy"
  | "family"
  | "other";

export type IncidentIntakeSummary = {
  title: string;
  topic: IncidentTopic;
  partyA: string;
  partyB: string;
  partyAClaim: string;
  partyBClaim: string;
  issues: [string, string, string];
  missingQuestions: string[];
  completeness: "enough" | "needs_context" | "too_short";
  normalizedDialogue: string[];
  judgeText: string;
};

export type IncidentIntakeInput = {
  text: string;
  topic: IncidentTopic;
  extraContext: string;
  userPerspective: UserPerspective;
};

const topicLabels: Record<IncidentTopic, string> = {
  unspecified: "아직 모름",
  reply: "연락 문제",
  schedule: "약속/시간",
  tone: "말투",
  money: "돈/선물",
  jealousy: "질투/오해",
  family: "가족/친구",
  other: "기타",
};

function compactLines(text: string) {
  return text
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 8);
}

function inferTopic(text: string, topic: IncidentTopic): IncidentTopic {
  if (topic !== "unspecified") {
    return topic;
  }

  if (/답장|연락|읽씹|카톡|전화/.test(text)) {
    return "reply";
  }

  if (/약속|지각|늦|시간|기다/.test(text)) {
    return "schedule";
  }

  if (/말투|짜증|화내|욕|비꼬/.test(text)) {
    return "tone";
  }

  if (/돈|선물|계산|빌려|갚/.test(text)) {
    return "money";
  }

  return "other";
}

export function createLocalIncidentSummary({
  text,
  topic,
  extraContext,
}: IncidentIntakeInput): IncidentIntakeSummary {
  const trimmedText = text.trim();
  const inferredTopic = inferTopic(`${trimmedText}\n${extraContext}`, topic);
  const normalizedDialogue = compactLines(trimmedText).map((line, index) => {
    if (/^[AB]\s*[:：]/i.test(line)) {
      return line.replace(
        /^([AB])\s*[:：]\s*/i,
        (_, speaker: string) => `${speaker.toUpperCase()}: `,
      );
    }

    return `${index % 2 === 0 ? "A" : "B"}: ${line}`;
  });
  const completeness =
    trimmedText.length < 30
      ? "too_short"
      : extraContext.trim().length > 0
        ? "enough"
        : "needs_context";

  return {
    title: `${topicLabels[inferredTopic]}로 시작된 싸움`,
    topic: inferredTopic,
    partyA: "첫 번째 사람",
    partyB: "두 번째 사람",
    partyAClaim:
      normalizedDialogue[0]?.replace(/^A:\s*/, "") ||
      "첫 번째 사람이 자신의 입장을 말했어요.",
    partyBClaim:
      normalizedDialogue
        .find((line) => line.startsWith("B:"))
        ?.replace(/^B:\s*/, "") ||
      "두 번째 사람의 입장은 대화에서 더 확인이 필요해요.",
    issues: [
      `${topicLabels[inferredTopic]}의 핵심 맥락`,
      "사전 설명과 반응 방식",
      "이후 말투와 사과 타이밍",
    ],
    missingQuestions:
      completeness === "enough"
        ? []
        : [
            "싸움이 시작되기 직전 상황이 더 있나요?",
            "상대가 사과하거나 설명한 부분이 있나요?",
          ],
    completeness,
    normalizedDialogue,
    judgeText: [
      `[루아 사건 접수서]`,
      `싸움 주제: ${topicLabels[inferredTopic]}`,
      `A 주장: ${normalizedDialogue[0] ?? "확인 필요"}`,
      `B 주장: ${normalizedDialogue.find((line) => line.startsWith("B:")) ?? "확인 필요"}`,
      `추가 맥락: ${extraContext.trim() || "없음"}`,
      "",
      trimmedText,
    ].join("\n"),
  };
}

export { topicLabels };
