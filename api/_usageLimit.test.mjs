import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import {
  checkAndConsumeFreeUse,
  grantShareBonusUse,
  memoryUsage,
  refundFreeUse,
} from "./_usageLimit.js";

const originalSupabaseUrl = process.env.SUPABASE_URL;
const originalViteSupabaseUrl = process.env.VITE_SUPABASE_URL;
const originalServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function restoreEnv(key, value) {
  if (value === undefined) {
    delete process.env[key];
    return;
  }

  process.env[key] = value;
}

afterEach(() => {
  memoryUsage.clear();
  restoreEnv("SUPABASE_URL", originalSupabaseUrl);
  restoreEnv("VITE_SUPABASE_URL", originalViteSupabaseUrl);
  restoreEnv("SUPABASE_SERVICE_ROLE_KEY", originalServiceRoleKey);
});

describe("usage limit helper", () => {
  it("uses VITE_SUPABASE_URL as server fallback when SUPABASE_URL is absent", async () => {
    delete process.env.SUPABASE_URL;
    process.env.VITE_SUPABASE_URL = "https://project.supabase.co/";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role";
    let requestedUrl = "";

    const result = await checkAndConsumeFreeUse({
      anonymousUserKey: "anon-user-123",
      supabaseFetch: async (url) => {
        requestedUrl = url;
        return {
          ok: true,
          json: async () => [{ allowed: true, remaining_free_uses: 2 }],
        };
      },
    });

    assert.equal(
      requestedUrl,
      "https://project.supabase.co/rest/v1/rpc/consume_free_judgment_use",
    );
    assert.deepEqual(result, { allowed: true, remainingFreeUses: 2 });
  });

  it("grants one memory share bonus and reuses it for the daily limit", async () => {
    delete process.env.SUPABASE_URL;
    delete process.env.VITE_SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    const input = {
      anonymousUserKey: "anon-user-456",
      now: new Date("2026-05-21T00:00:00.000Z"),
    };

    await checkAndConsumeFreeUse(input);
    await checkAndConsumeFreeUse(input);
    await checkAndConsumeFreeUse(input);
    assert.deepEqual(await checkAndConsumeFreeUse(input), {
      allowed: false,
      remainingFreeUses: 0,
    });

    assert.deepEqual(await grantShareBonusUse(input), {
      granted: true,
      remainingFreeUses: 1,
    });
    assert.deepEqual(await grantShareBonusUse(input), {
      granted: false,
      remainingFreeUses: 1,
    });
    assert.deepEqual(await checkAndConsumeFreeUse(input), {
      allowed: true,
      remainingFreeUses: 0,
    });
  });

  it("refunds one consumed memory use", async () => {
    delete process.env.SUPABASE_URL;
    delete process.env.VITE_SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    const input = {
      anonymousUserKey: "anon-user-789",
      now: new Date("2026-05-21T00:00:00.000Z"),
    };

    await checkAndConsumeFreeUse(input);

    assert.deepEqual(await refundFreeUse(input), {
      refunded: true,
      remainingFreeUses: 3,
    });
  });
});
