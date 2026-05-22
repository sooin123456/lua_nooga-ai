import { normalizeJudgmentResult, parseJsonFromModelText } from "../_aiJson.js";

const maxSourceTextLength = 4000;

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

function hasJudgmentShape(value) {
  return (
    value &&
    typeof value === "object" &&
    typeof value.verdict === "string" &&
    typeof value.partyAPercent !== "undefined" &&
    Array.isArray(value.reasons)
  );
}

function getSourceText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function createPrompt({ result, sourceText }) {
  return [
    "너는 Toss 미니앱 '누가 잘못 AI'의 핫 Battle 공개 요약 편집자다.",
    "판정 결과를 사람들이 댓글로 의견을 달 수 있게 짧고 안전한 공개 요약으로 바꿔라.",
    "원문 대화를 그대로 저장하거나 재현하지 마라. 실명, 연락처, 주소, 계정, 회사명처럼 식별 가능한 표현은 일반화해라.",
    "조롱, 혐오, 위협 표현을 키우지 말고 부드러운 표현으로 바꿔라.",
    "법률 상담처럼 말하지 마라. 반드시 JSON만 출력해라.",
    "",
    "필수 JSON 필드: publicTitle, issueSummary, anonymizedDialogueSummary, shareSummary, rewardTier, tone",
    "anonymizedDialogueSummary는 한국어 2문장 이하로 작성해라.",
    "publicTitle은 28자 이하의 게시판 제목처럼 작성해라.",
    "rewardTier 허용값: small, medium, large. tone 허용값: light, serious, safety.",
    "",
    "기존 판정 JSON:",
    JSON.stringify(result),
    "",
    "원문 대화 참고용:",
    sourceText || "원문 없음",
  ].join("\n");
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

async function callOpenAi({ result, sourceText, fetcher }) {
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
      model: process.env.OPENAI_PUBLIC_SUMMARY_MODEL ?? "gpt-4.1-mini",
      input: createPrompt({ result, sourceText }),
      temperature: 0.25,
    }),
  });

  if (!response.ok) {
    throw new Error("OpenAI request failed");
  }

  return parseJsonFromModelText(extractOutputText(await response.json()));
}

export default async function handler(request, response) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    response.status(405).json({ message: "method not allowed" });
    return;
  }

  const body = parseBody(request);
  const sourceText = getSourceText(body.sourceText);

  if (!hasJudgmentShape(body.result)) {
    response.status(400).json({ message: "공개할 판정 결과가 필요해요." });
    return;
  }

  if (sourceText.length > maxSourceTextLength) {
    response
      .status(413)
      .json({ message: "공개 요약할 대화가 너무 길어요. 핵심 부분만 줄여주세요." });
    return;
  }

  try {
    const summary = await callOpenAi({
      result: body.result,
      sourceText,
      fetcher: request.testFetch ?? fetch,
    });

    response.status(200).json({
      result: normalizeJudgmentResult({
        ...body.result,
        ...summary,
      }),
    });
  } catch {
    response.status(503).json({
      message: "공개용 요약을 만들지 못했어요. 다시 시도해 주세요.",
    });
  }
}
