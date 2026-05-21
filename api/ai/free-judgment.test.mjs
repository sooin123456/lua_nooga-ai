import assert from "node:assert/strict";
import { describe, it } from "node:test";
import handler from "./free-judgment.js";

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

describe("free judgment api", () => {
  it("rejects empty text", async () => {
    const response = createResponse();

    await handler({ method: "POST", body: { text: "" } }, response);

    assert.equal(response.statusCode, 400);
    assert.equal(response.body.message, "판독할 대화가 필요해요.");
  });

  it("returns normalized AI result", async () => {
    process.env.OPENAI_API_KEY = "test-key";
    process.env.OPENAI_FREE_JUDGMENT_MODEL = "test-model";

    const response = createResponse();
    await handler(
      {
        method: "POST",
        body: {
          text: "A: 늦어서 미안\nB: 기다렸잖아",
          userPerspective: "first",
          anonymousUserKey: "anon-1",
        },
        testFetch: async (url, options) => {
          assert.equal(url, "https://api.openai.com/v1/responses");
          assert.equal(options.method, "POST");
          assert.equal(options.headers.Authorization, "Bearer test-key");

          const body = JSON.parse(options.body);
          assert.equal(body.model, "test-model");
          assert.equal(body.temperature, 0.4);
          assert.match(body.input, /사용자 관점: first/);

          return {
            ok: true,
            json: async () => ({
              output_text: JSON.stringify({
                verdict: "A가 64% 선넘었어요",
                partyAPercent: 64,
                reasons: ["늦은 설명", "사과 부족", "상대 감정 누락"],
                advice: "먼저 기다린 시간을 인정해 주세요.",
                safetyLevel: "normal",
              }),
            }),
          };
        },
        testUsage: async ({ anonymousUserKey }) => {
          assert.equal(anonymousUserKey, "anon-1");
          return { allowed: true, remainingFreeUses: 2 };
        },
      },
      response,
    );

    assert.equal(response.statusCode, 200);
    assert.equal(response.body.result.partyAPercent, 64);
    assert.equal(response.body.result.partyBPercent, 36);
    assert.equal(response.body.result.userPerspective, "first");
    assert.equal(response.body.remainingFreeUses, 2);
  });

  it("returns 429 when free uses are exhausted", async () => {
    const response = createResponse();

    await handler(
      {
        method: "POST",
        body: {
          text: "A: test",
          userPerspective: "unknown",
          anonymousUserKey: "anon-2",
        },
        testUsage: async () => ({ allowed: false, remainingFreeUses: 0 }),
      },
      response,
    );

    assert.equal(response.statusCode, 429);
    assert.equal(
      response.body.message,
      "오늘 무료 판독을 모두 사용했어요. 공유하면 1회를 추가로 받을 수 있어요.",
    );
    assert.equal(response.body.remainingFreeUses, 0);
  });

  it("rejects non-POST requests with Allow POST", async () => {
    const response = createResponse();

    await handler({ method: "GET", body: {} }, response);

    assert.equal(response.statusCode, 405);
    assert.equal(response.headers.Allow, "POST");
  });

  it("rejects text longer than 4000 characters", async () => {
    const response = createResponse();

    await handler(
      { method: "POST", body: { text: "a".repeat(4001) } },
      response,
    );

    assert.equal(response.statusCode, 413);
    assert.equal(
      response.body.message,
      "대화가 너무 길어요. 핵심 부분만 줄여주세요.",
    );
  });
});
