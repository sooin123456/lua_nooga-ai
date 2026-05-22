import { readFile } from "node:fs/promises";
import path from "node:path";
import { clampPercent, parseJsonFromModelText } from "../_aiJson.js";
import { verifyPrecedentEntitlement } from "../_entitlement.js";
import { searchPrecedents } from "../../server/precedent-api/src/search.mjs";

const maxTextLength = 4000;
const precedentDisclaimer =
  "법률 상담이 아닌 참고용 분석이에요. 실제 법적 판단은 구체적 사실관계와 전문가 검토에 따라 달라질 수 있어요.";

let cachedPrecedents;

async function getPrecedents() {
  if (cachedPrecedents) {
    return cachedPrecedents;
  }

  const filePath = path.join(process.cwd(), "api/precedents/precedents.json");
  cachedPrecedents = JSON.parse(await readFile(filePath, "utf8"));
  return cachedPrecedents;
}

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

function getEntitlementToken(request) {
  return (
    request.headers?.["x-precedent-entitlement"] ??
    request.headers?.["X-Precedent-Entitlement"]
  );
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

function getTrimmedString(value, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function getStringArray(value, limit, fallback) {
  const items = Array.isArray(value)
    ? value
        .map((item) => getTrimmedString(item))
        .filter(Boolean)
        .slice(0, limit)
    : [];

  while (items.length < fallback.length && items.length < limit) {
    items.push(fallback[items.length]);
  }

  return items;
}

function normalizePrecedentReport(payload = {}, precedents = []) {
  const partyAPercent = clampPercent(payload.partyAPercent);

  return {
    verdict:
      getTrimmedString(payload.verdict) ??
      `판례 기준으로 A가 ${partyAPercent}% 선넘었어요`,
    partyAPercent,
    partyBPercent: 100 - partyAPercent,
    reasons: getStringArray(payload.reasons, 3, [
      "기존 판정과 유사 판례의 책임 판단 요소를 함께 봤어요.",
      "대화의 표현 수위와 사과 여부를 비교했어요.",
      "정확한 법률 판단이 아닌 참고용 재판정이에요.",
    ]),
    advice:
      getTrimmedString(payload.advice) ||
      "판례 기준 결과를 다툼의 끝이 아니라 화해의 출발점으로 써보세요.",
    safetyLevel: ["normal", "caution", "urgent"].includes(payload.safetyLevel)
      ? payload.safetyLevel
      : "normal",
    precedentIssues: getStringArray(payload.precedentIssues, 3, [
      "책임 비율",
      "표현 수위",
      "사과와 회복 노력",
    ]),
    rebuttalPoints: getStringArray(payload.rebuttalPoints, 3, [
      "상대방도 감정적으로 반응한 부분은 함께 볼 수 있어요.",
    ]),
    reconciliationSuggestion:
      getTrimmedString(payload.reconciliationSuggestion) ||
      "작은 보상과 짧은 사과문으로 먼저 마무리해 보세요.",
    precedents,
  };
}

function createPrompt({ text, originalResult, precedents }) {
  return [
    "너는 Toss 미니앱 '누가 잘못 AI'의 판례 기반 이의제기 분석 엔진이다.",
    "사용자가 이미 받은 재미용 판정을 유사 판례 요지와 비교해 다시 분석한다.",
    "법률 상담처럼 단정하지 말고, 판례상 참고 포인트와 책임 비율을 설명한다.",
    "당사자를 조롱하거나 몰아붙이지 말고, 화해 가능한 표현으로 쓴다.",
    "반드시 JSON만 출력해라.",
    "",
    "필수 JSON 필드: verdict, partyAPercent, reasons, advice, safetyLevel, precedentIssues, rebuttalPoints, reconciliationSuggestion",
    "partyAPercent는 0부터 100 사이 정수다. partyBPercent는 서버가 계산한다.",
    "reasons, precedentIssues는 한국어 문장 3개다. rebuttalPoints는 한국어 문장 1~3개다.",
    "",
    "기존 판정:",
    JSON.stringify(originalResult),
    "",
    "유사 판례:",
    JSON.stringify(precedents),
    "",
    "분석할 대화:",
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

async function callOpenAi({ text, originalResult, precedents, fetcher }) {
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
      model: process.env.OPENAI_PRECEDENT_JUDGMENT_MODEL ?? "gpt-4.1-mini",
      input: createPrompt({ text, originalResult, precedents }),
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

  const token = getEntitlementToken(request);
  const verifyEntitlement = request.testVerifyEntitlement ?? verifyPrecedentEntitlement;

  if (!verifyEntitlement(token)) {
    response.status(402).json({ message: "판례 분석 결제가 필요해요." });
    return;
  }

  const body = parseBody(request);
  const text = typeof body.text === "string" ? body.text.trim() : "";

  if (!text || !hasJudgmentShape(body.originalResult)) {
    response
      .status(400)
      .json({ message: "판례로 분석할 대화와 기존 판정이 필요해요." });
    return;
  }

  if (text.length > maxTextLength) {
    response.status(413).json({ message: "대화가 너무 길어요. 핵심 부분만 줄여주세요." });
    return;
  }

  try {
    const precedents = request.testSearchPrecedents
      ? request.testSearchPrecedents({ text, limit: 3 })
      : searchPrecedents({
          precedents: await getPrecedents(),
          text,
          limit: 3,
        });
    const rawReport = await callOpenAi({
      text,
      originalResult: body.originalResult,
      precedents,
      fetcher: request.testFetch ?? fetch,
    });

    response.status(200).json({
      report: normalizePrecedentReport(rawReport, precedents),
      disclaimer: precedentDisclaimer,
    });
  } catch {
    response.status(503).json({ message: "판례 AI 분석을 완료하지 못했어요." });
  }
}
