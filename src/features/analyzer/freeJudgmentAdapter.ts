import { analyzeWithRules } from "./ruleBasedAnalyzer";
import type { JudgmentResult, UserPerspective } from "./types";

const anonymousUserKeyStorageKey = "lua-nooga-ai-anonymous-user-key";
const fallbackMessage =
  "AI 서버 연결이 불안정해서 기기 안에서 가볍게 판독했어요.";

export type AiJudgmentReady = {
  status: "ready";
  result: JudgmentResult;
  remainingFreeUses?: number;
};

export type AiJudgmentLimited = {
  status: "limited";
  message: string;
  remainingFreeUses: 0;
};

export type AiJudgmentResult =
  | AiJudgmentReady
  | AiJudgmentLimited
  | {
      status: "fallback";
      result: JudgmentResult;
      message: typeof fallbackMessage;
    };

type AnalyzeWithAiInput = {
  text: string;
  userPerspective: UserPerspective;
  endpointUrl?: string;
  fetcher?: typeof fetch;
};

function createAnonymousUserKey() {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }

  return `anon-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function getAnonymousUserKey() {
  const storage = globalThis.localStorage;
  const existingKey = storage.getItem(anonymousUserKeyStorageKey);

  if (existingKey) {
    return existingKey;
  }

  const anonymousUserKey = createAnonymousUserKey();
  storage.setItem(anonymousUserKeyStorageKey, anonymousUserKey);

  return anonymousUserKey;
}

export async function analyzeWithAi({
  text,
  userPerspective,
  endpointUrl = "/api/ai/free-judgment",
  fetcher = fetch,
}: AnalyzeWithAiInput): Promise<AiJudgmentResult> {
  try {
    const response = await fetcher(endpointUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text,
        userPerspective,
        anonymousUserKey: getAnonymousUserKey(),
      }),
    });

    const payload = (await response.json()) as {
      result?: JudgmentResult;
      remainingFreeUses?: number;
      message?: string;
    };

    if (response.status === 429) {
      return {
        status: "limited",
        message: payload.message ?? "오늘 무료 판독을 모두 사용했어요.",
        remainingFreeUses: 0,
      };
    }

    if (!response.ok || !payload.result) {
      throw new Error(payload.message ?? "AI judgment request failed");
    }

    return {
      status: "ready",
      result: payload.result,
      remainingFreeUses: payload.remainingFreeUses,
    };
  } catch {
    return {
      status: "fallback",
      result: await analyzeWithRules({ text }),
      message: fallbackMessage,
    };
  }
}
