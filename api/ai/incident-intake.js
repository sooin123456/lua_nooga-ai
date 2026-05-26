import { parseJsonFromModelText } from "../_aiJson.js";

const maxTextLength = 6000;
const allowedTopics = new Set([
  "unspecified",
  "reply",
  "schedule",
  "tone",
  "money",
  "jealousy",
  "family",
  "other",
]);
const allowedPerspectives = new Set(["first", "second", "unknown"]);

function parseBody(request) {
  if (!request.body) {
    return {};
  }

  if (typeof request.body === "string") {
    try {
      return JSON.parse(request.body);
    } catch {
      return {};
    }
  }

  return request.body;
}

function extractOutputText(payload) {
  if (typeof payload.output_text === "string") {
    return payload.output_text;
  }

  return payload.output
    ?.flatMap((item) => item.content ?? [])
    ?.map((content) => content.text ?? "")
    ?.join("\n");
}

function normalizeString(value, fallback) {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function normalizeStringArray(value, limit, fallback) {
  const items = Array.isArray(value)
    ? value
        .map((item) => (typeof item === "string" ? item.trim() : ""))
        .filter(Boolean)
        .slice(0, limit)
    : [];

  while (items.length < fallback.length && items.length < limit) {
    items.push(fallback[items.length]);
  }

  return items;
}

function normalizeSummary(payload = {}) {
  const issues = normalizeStringArray(payload.issues, 3, [
    "서로 기대한 설명의 차이",
    "감정이 커진 표현 방식",
    "사과와 확인 타이밍",
  ]);

  while (issues.length < 3) {
    issues.push("대화의 맥락을 함께 확인해야 해요.");
  }

  return {
    title: normalizeString(payload.title, "루아가 접수한 싸움"),
    topic: allowedTopics.has(payload.topic) ? payload.topic : "other",
    partyA: normalizeString(payload.partyA, "첫 번째 사람"),
    partyB: normalizeString(payload.partyB, "두 번째 사람"),
    partyAClaim: normalizeString(
      payload.partyAClaim,
      "첫 번째 사람의 입장을 더 확인해야 해요.",
    ),
    partyBClaim: normalizeString(
      payload.partyBClaim,
      "두 번째 사람의 입장을 더 확인해야 해요.",
    ),
    issues,
    missingQuestions: normalizeStringArray(payload.missingQuestions, 3, []),
    completeness: ["enough", "needs_context", "too_short"].includes(
      payload.completeness,
    )
      ? payload.completeness
      : "needs_context",
    normalizedDialogue: normalizeStringArray(payload.normalizedDialogue, 8, []),
    judgeText: normalizeString(payload.judgeText, ""),
  };
}

function createPrompt({ text, topic, extraContext, userPerspective }) {
  return [
    "너는 Toss 미니앱 '누가 잘못 AI'의 사건 접수관 루아다.",
    "사용자가 카톡 대화, 상황 설명, 캡처 OCR, 녹음 전사 내용을 아무렇게나 넣어도 판독 전에 읽기 쉬운 사건 카드로 정리한다.",
    "이 단계에서는 잘잘못을 판정하지 말고, A/B 주장과 핵심 쟁점만 중립적으로 정리한다.",
    "이름, 전화번호, 계정, 주소처럼 개인정보는 익명화한다.",
    "시간표시, 이모티콘, 중복 감탄사는 줄이고 대화 핵심만 남긴다.",
    "반드시 JSON만 출력한다. 마크다운과 코드블록은 금지한다.",
    "",
    "JSON 필드:",
    "title, topic, partyA, partyB, partyAClaim, partyBClaim, issues, missingQuestions, completeness, normalizedDialogue, judgeText",
    "topic 허용값: unspecified, reply, schedule, tone, money, jealousy, family, other",
    "completeness 허용값: enough, needs_context, too_short",
    "issues는 반드시 3개다. normalizedDialogue는 최대 8줄이고 각 줄은 A: 또는 B: 로 시작한다.",
    "judgeText는 이후 판정 엔진에 넣을 수 있게 사건 접수 요약과 정리된 대화를 함께 담는다.",
    "",
    `사용자 선택 주제: ${topic}`,
    `사용자 관점: ${userPerspective}`,
    `추가 맥락: ${extraContext || "없음"}`,
    "",
    "원본 자료:",
    text,
  ].join("\n");
}

async function callOpenAi({
  text,
  topic,
  extraContext,
  userPerspective,
  fetcher,
}) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is missing");
  }

  const response = await fetcher("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: process.env.OPENAI_INTAKE_MODEL ?? "gpt-4.1-mini",
      input: createPrompt({ text, topic, extraContext, userPerspective }),
      temperature: 0.2,
    }),
  });

  if (!response.ok) {
    throw new Error("OpenAI incident intake request failed");
  }

  return normalizeSummary(
    parseJsonFromModelText(extractOutputText(await response.json())),
  );
}

export default async function handler(request, response) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    response.status(405).json({ message: "method not allowed" });
    return;
  }

  const body = parseBody(request);
  const text = typeof body.text === "string" ? body.text.trim() : "";
  const topic = allowedTopics.has(body.topic) ? body.topic : "unspecified";
  const extraContext =
    typeof body.extraContext === "string" ? body.extraContext.trim() : "";
  const userPerspective = allowedPerspectives.has(body.userPerspective)
    ? body.userPerspective
    : "unknown";

  if (!text) {
    response.status(400).json({ message: "접수할 싸움 자료가 필요해요." });
    return;
  }

  if (text.length > maxTextLength) {
    response.status(413).json({
      message: "자료가 너무 길어요. 핵심 대화 위주로 줄여주세요.",
    });
    return;
  }

  try {
    const summary = await callOpenAi({
      text,
      topic,
      extraContext,
      userPerspective,
      fetcher: request.testFetch ?? fetch,
    });

    response.status(200).json({ summary });
  } catch {
    response.status(503).json({
      message: "AI 사건 접수 서버가 잠시 불안정해요.",
    });
  }
}
