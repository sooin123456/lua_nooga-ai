import assert from "node:assert/strict";
import { describe, it } from "node:test";
import handler from "./public-summary.js";

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

const result = {
  verdict: "A가 72% 선넘었어요",
  partyAPercent: 72,
  partyBPercent: 28,
  reasons: ["말투가 강했어요", "사과가 늦었어요", "상대 입장을 놓쳤어요"],
  advice: "먼저 기다리게 한 시간을 인정해 주세요.",
  safetyLevel: "normal",
};

describe("public summary api", () => {
  it("returns a normalized public-safe judgment summary", async () => {
    process.env.OPENAI_API_KEY = "test-key";
    process.env.OPENAI_PUBLIC_SUMMARY_MODEL = "summary-model";
    const response = createResponse();

    await handler(
      {
        method: "POST",
        body: {
          result,
          sourceText: "A: 늦어서 미안\nB: 왜 이제 와",
        },
        testFetch: async (url, options) => {
          assert.equal(url, "https://api.openai.com/v1/responses");
          assert.equal(options.method, "POST");
          assert.equal(options.headers.Authorization, "Bearer test-key");

          const body = JSON.parse(options.body);
          assert.equal(body.model, "summary-model");
          assert.match(body.input, /원문 대화를 그대로 저장하거나 재현하지 마라/);
          assert.match(body.input, /A: 늦어서 미안/);

          return {
            ok: true,
            json: async () => ({
              output_text: JSON.stringify({
                ...result,
                publicTitle: "약속 시간 늦은 뒤 사과 타이밍 Battle",
                issueSummary: "늦은 설명과 기다린 감정이 부딪힌 대화예요.",
                anonymizedDialogueSummary: [
                  "A는 늦은 이유를 설명했지만 사과가 짧았어요.",
                  "B는 기다린 감정이 쌓여 강하게 반응했어요.",
                ],
                shareSummary: "약속 시간 갈등에서 A 책임이 더 크게 나왔어요.",
                rewardTier: "medium",
                tone: "light",
              }),
            }),
          };
        },
      },
      response,
    );

    assert.equal(response.statusCode, 200);
    assert.equal(
      response.body.result.publicTitle,
      "약속 시간 늦은 뒤 사과 타이밍 Battle",
    );
    assert.equal(response.body.result.partyAPercent, 72);
    assert.equal(response.body.result.partyBPercent, 28);
    assert.deepEqual(response.body.result.anonymizedDialogueSummary, [
      "A는 늦은 이유를 설명했지만 사과가 짧았어요.",
      "B는 기다린 감정이 쌓여 강하게 반응했어요.",
    ]);
  });

  it("rejects missing judgment result", async () => {
    const response = createResponse();

    await handler({ method: "POST", body: {} }, response);

    assert.equal(response.statusCode, 400);
    assert.equal(response.body.message, "공개할 판정 결과가 필요해요.");
  });

  it("rejects source text longer than 4000 characters", async () => {
    const response = createResponse();

    await handler(
      { method: "POST", body: { result, sourceText: "a".repeat(4001) } },
      response,
    );

    assert.equal(response.statusCode, 413);
    assert.equal(
      response.body.message,
      "공개 요약할 대화가 너무 길어요. 핵심 부분만 줄여주세요.",
    );
  });

  it("returns 503 when AI summary fails", async () => {
    process.env.OPENAI_API_KEY = "test-key";
    const response = createResponse();

    await handler(
      {
        method: "POST",
        body: { result, sourceText: "A: test" },
        testFetch: async () => {
          throw new Error("AI unavailable");
        },
      },
      response,
    );

    assert.equal(response.statusCode, 503);
    assert.equal(
      response.body.message,
      "공개용 요약을 만들지 못했어요. 다시 시도해 주세요.",
    );
  });

  it("rejects non-POST requests with Allow POST", async () => {
    const response = createResponse();

    await handler({ method: "GET", body: {} }, response);

    assert.equal(response.statusCode, 405);
    assert.equal(response.headers.Allow, "POST");
  });
});
