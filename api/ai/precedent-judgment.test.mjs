import assert from "node:assert/strict";
import { describe, it } from "node:test";
import handler from "./precedent-judgment.js";

function createResponse() {
  return {
    statusCode: 200,
    body: undefined,
    headers: {},
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
    setHeader(name, value) {
      this.headers[name] = value;
    },
  };
}

const originalResult = {
  verdict: "A가 72% 선넘었어요",
  partyAPercent: 72,
  partyBPercent: 28,
  reasons: ["약속 설명이 늦었어요", "사과가 짧았어요", "감정 확인이 부족했어요"],
  advice: "기다린 시간을 먼저 인정해 주세요.",
  safetyLevel: "normal",
};

const precedents = [
  {
    title: "대법원 2020다00000",
    court: "대법원",
    decidedAt: "2020-01-01",
    summary: "반복적인 비난과 사과 부족은 관계 파탄의 책임 판단에 참고될 수 있다.",
    similarityReason: "입력 대화의 사과, 비난 표현과 유사한 맥락이 확인됐어요.",
    sourceUrl: "https://example.com/case",
  },
];

describe("precedent judgment api", () => {
  it("rejects non-POST requests with Allow POST", async () => {
    const response = createResponse();

    await handler({ method: "GET", body: {} }, response);

    assert.equal(response.statusCode, 405);
    assert.equal(response.headers.Allow, "POST");
  });

  it("rejects requests without paid entitlement", async () => {
    const response = createResponse();

    await handler(
      {
        method: "POST",
        headers: {},
        body: { text: "A: test", originalResult },
        testVerifyEntitlement: () => false,
      },
      response,
    );

    assert.equal(response.statusCode, 402);
    assert.equal(response.body.message, "판례 분석 결제가 필요해요.");
  });

  it("rejects empty text and missing original judgment", async () => {
    const response = createResponse();

    await handler(
      {
        method: "POST",
        headers: { "x-precedent-entitlement": "token" },
        body: { text: "", originalResult: null },
        testVerifyEntitlement: () => true,
      },
      response,
    );

    assert.equal(response.statusCode, 400);
    assert.equal(response.body.message, "판례로 분석할 대화와 기존 판정이 필요해요.");
  });

  it("returns a precedent-grounded AI judgment report", async () => {
    process.env.OPENAI_API_KEY = "test-key";
    process.env.OPENAI_PRECEDENT_JUDGMENT_MODEL = "precedent-model";
    const response = createResponse();

    await handler(
      {
        method: "POST",
        headers: { "x-precedent-entitlement": "token" },
        body: {
          text: "A: 늦어서 미안\nB: 왜 이제 와",
          originalResult,
        },
        testVerifyEntitlement: (token) => token === "token",
        testSearchPrecedents: ({ text, limit }) => {
          assert.match(text, /늦어서 미안/);
          assert.equal(limit, 3);
          return precedents;
        },
        testFetch: async (url, options) => {
          assert.equal(url, "https://api.openai.com/v1/responses");
          assert.equal(options.headers.Authorization, "Bearer test-key");
          const body = JSON.parse(options.body);
          assert.equal(body.model, "precedent-model");
          assert.match(body.input, /유사 판례/);
          assert.match(body.input, /대법원 2020다00000/);

          return {
            ok: true,
            json: async () => ({
              output_text: JSON.stringify({
                verdict: "판례 기준으로도 A가 68% 선넘었어요",
                partyAPercent: 68,
                partyBPercent: 32,
                reasons: [
                  "사과와 설명이 늦어진 점이 책임 비율을 높였어요.",
                  "상대 감정 확인이 부족했어요.",
                  "다만 B의 강한 반응도 일부 책임이 있어요.",
                ],
                advice: "A가 먼저 기다린 시간을 인정하고 짧게 보상 제안을 해보세요.",
                safetyLevel: "normal",
                precedentIssues: ["사과 지연", "반복 비난", "감정 확인 부족"],
                rebuttalPoints: ["늦은 사정이 불가피했다는 점은 A의 반박 포인트예요."],
                reconciliationSuggestion: "커피 한 잔으로 사과를 시작해 보세요.",
              }),
            }),
          };
        },
      },
      response,
    );

    assert.equal(response.statusCode, 200);
    assert.equal(response.body.report.verdict, "판례 기준으로도 A가 68% 선넘었어요");
    assert.equal(response.body.report.partyBPercent, 32);
    assert.deepEqual(response.body.report.precedentIssues, [
      "사과 지연",
      "반복 비난",
      "감정 확인 부족",
    ]);
    assert.equal(response.body.report.precedents[0].title, "대법원 2020다00000");
    assert.match(response.body.disclaimer, /법률 상담이 아닌 참고용 분석/);
  });

  it("returns 503 when AI precedent judgment fails", async () => {
    process.env.OPENAI_API_KEY = "test-key";
    const response = createResponse();

    await handler(
      {
        method: "POST",
        headers: { "x-precedent-entitlement": "token" },
        body: { text: "A: test", originalResult },
        testVerifyEntitlement: () => true,
        testSearchPrecedents: () => precedents,
        testFetch: async () => {
          throw new Error("OpenAI unavailable");
        },
      },
      response,
    );

    assert.equal(response.statusCode, 503);
    assert.equal(response.body.message, "판례 AI 분석을 완료하지 못했어요.");
  });
});
