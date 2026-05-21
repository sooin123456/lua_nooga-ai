import assert from "node:assert/strict";
import { describe, it } from "node:test";
import handler from "./share-bonus.js";

function createResponse() {
  return {
    statusCode: 200,
    body: undefined,
    headers: {},
    setHeader(key, value) {
      this.headers[key] = value;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
}

describe("share bonus api", () => {
  it("grants share bonus for an anonymous user", async () => {
    const response = createResponse();

    await handler(
      {
        method: "POST",
        body: { anonymousUserKey: "anon-user-123" },
        testGrantShareBonus: async () => ({
          granted: true,
          remainingFreeUses: 1,
        }),
      },
      response,
    );

    assert.equal(response.statusCode, 200);
    assert.deepEqual(response.body, {
      granted: true,
      remainingFreeUses: 1,
    });
  });

  it("rejects missing anonymous user key", async () => {
    const response = createResponse();

    await handler({ method: "POST", body: {} }, response);

    assert.equal(response.statusCode, 400);
  });

  it("rejects non-POST requests", async () => {
    const response = createResponse();

    await handler({ method: "GET" }, response);

    assert.equal(response.statusCode, 405);
    assert.equal(response.headers.Allow, "POST");
  });
});
