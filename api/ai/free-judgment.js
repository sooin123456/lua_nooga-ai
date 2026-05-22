import { normalizeJudgmentResult, parseJsonFromModelText } from "../_aiJson.js";
import { checkAndConsumeFreeUse, refundFreeUse } from "../_usageLimit.js";

const maxTextLength = 4000;
const allowedPerspectives = ["first", "second", "unknown"];

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

function getUserPerspective(value) {
  return allowedPerspectives.includes(value) ? value : "unknown";
}

function getAnonymousUserKey(value) {
  return typeof value === "string" && value.trim() ? value.trim() : "anonymous";
}

function createPrompt({ text, userPerspective }) {
  return [
    "너는 Toss 미니앱 '누가 잘못 AI'의 한국어 판정 엔진이다.",
    "대화 속 A와 B의 책임 비율을 재미있게 판정하되, 당사자를 조롱하거나 몰아붙이지 말고 부드럽게 완충해라.",
    "법률 상담, 의료 상담, 심리 상담, 진단, 치료 조언처럼 말하지 마라.",
    "위협, 폭력, 자해, 스토킹, 학대, 강압처럼 즉시 주의가 필요한 위험 신호가 보이면 safetyLevel을 caution 또는 urgent로 설정해라.",
    "반드시 JSON만 출력해라. 마크다운, 설명문, 코드블록을 붙이지 마라.",
    "",
    `사용자 관점: ${userPerspective} (userPerspective)`,
    "필수 JSON 필드: verdict, partyAPercent, reasons, advice, safetyLevel, userPerspectiveVerdict, publicTitle, issueSummary, anonymizedDialogueSummary, shareSummary, rewardTier, tone",
    "허용값: safetyLevel normal/caution/urgent, rewardTier small/medium/large, tone light/serious/safety.",
    "partyAPercent는 0부터 100 사이 정수다. partyBPercent는 서버가 계산한다.",
    "reasons는 한국어 문장 3개, anonymizedDialogueSummary는 개인정보를 제거한 한국어 문장 최대 2개로 작성해라.",
    "",
    "대화:",
    text,
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

async function callOpenAi({ text, userPerspective, fetcher }) {
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
      model: process.env.OPENAI_FREE_JUDGMENT_MODEL ?? "gpt-4.1-mini",
      input: createPrompt({ text, userPerspective }),
      temperature: 0.4,
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
  const text = typeof body.text === "string" ? body.text.trim() : "";
  const userPerspective = getUserPerspective(body.userPerspective);
  const anonymousUserKey = getAnonymousUserKey(body.anonymousUserKey);

  if (!text) {
    response.status(400).json({ message: "판독할 대화가 필요해요." });
    return;
  }

  if (text.length > maxTextLength) {
    response
      .status(413)
      .json({ message: "대화가 너무 길어요. 핵심 부분만 줄여주세요." });
    return;
  }

  let usage;

  try {
    usage = await (request.testUsage ?? checkAndConsumeFreeUse)({
      anonymousUserKey,
    });

    if (!usage.allowed) {
      response.status(429).json({
        message:
          "오늘 무료 판독을 모두 사용했어요. 공유하면 1회를 추가로 받을 수 있어요.",
        remainingFreeUses: 0,
      });
      return;
    }

    const rawResult = await callOpenAi({
      text,
      userPerspective,
      fetcher: request.testFetch ?? fetch,
    });
    const result = normalizeJudgmentResult({
      ...rawResult,
      userPerspective,
    });

    response.status(200).json({
      result,
      remainingFreeUses: usage.remainingFreeUses,
    });
  } catch {
    if (usage?.allowed) {
      try {
        await (request.testRefund ?? refundFreeUse)({ anonymousUserKey });
      } catch {
        // The user should not see refund internals; keep the AI error generic.
      }
    }

    response.status(503).json({
      message: "AI 판독 서버가 잠시 불안정해요. 다시 시도해 주세요.",
    });
  }
}
