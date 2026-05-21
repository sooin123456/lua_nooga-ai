# Free AI Judgment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the free local rule-based judgment flow with a server AI judgment flow, including user perspective, daily free usage limits, and a safe local fallback.

**Architecture:** The React app will call a new `freeJudgmentAdapter` instead of calling `analyzeWithRules` directly. A Vercel API route will validate input, enforce anonymous daily limits, call OpenAI with a strict JSON schema, normalize the result, and return a `JudgmentResult` compatible with the current UI. Supabase-backed usage storage is introduced behind a small server helper, with an in-memory development fallback so local work still functions without remote setup.

**Tech Stack:** React, Vite, Vitest, Vercel API routes, Supabase REST/RPC via service role on server, OpenAI Responses API via `fetch`, TypeScript app code, JavaScript Vercel functions.

---

## File Map

- Modify `src/features/analyzer/types.ts`: add user perspective and public summary fields without breaking existing UI.
- Create `src/features/analyzer/freeJudgmentAdapter.ts`: browser adapter that calls `/api/ai/free-judgment` and falls back to `analyzeWithRules`.
- Create `src/features/analyzer/freeJudgmentAdapter.test.ts`: adapter tests for success, limit, and fallback behavior.
- Modify `src/App.tsx`: track user perspective in review state and call `analyzeWithAi`.
- Modify `src/features/input/TextReview.tsx`: add `나는 누구예요?` selector before analysis.
- Modify `src/features/input/TextReview.test.tsx`: cover perspective selection.
- Create `api/_aiJson.js`: shared AI JSON parsing, percentage normalization, and safety fallback helpers.
- Create `api/_usageLimit.js`: anonymous daily usage limiter with Supabase service role and memory fallback.
- Create `api/ai/free-judgment.js`: Vercel endpoint for free AI judgment.
- Create `api/ai/free-judgment.test.mjs`: server endpoint unit tests using mock fetch and mock usage store.
- Modify `.env.example`: document `OPENAI_API_KEY`, `OPENAI_FREE_JUDGMENT_MODEL`, `SUPABASE_SERVICE_ROLE_KEY`.
- Modify `README.md`: update “무료 판독” from local demo to server AI with limits.

---

### Task 1: Extend Judgment Types for AI Results

**Files:**
- Modify: `src/features/analyzer/types.ts`
- Test: existing analyzer/result tests

- [ ] **Step 1: Inspect current type file**

Run:

```bash
sed -n '1,220p' src/features/analyzer/types.ts
```

Expected: confirm the current `JudgmentResult` fields used by `ResultScreen`, `RewardChatScreen`, and room flows.

- [ ] **Step 2: Add compatible optional fields**

Patch `src/features/analyzer/types.ts` so `JudgmentResult` keeps existing required fields and adds optional AI/public fields:

```ts
export type UserPerspective = "first" | "second" | "unknown";

export type RewardTier = "small" | "medium" | "large";

export type JudgmentResult = {
  verdict: string;
  partyAPercent: number;
  partyBPercent: number;
  reasons: string[];
  advice: string;
  safetyLevel: "normal" | "caution" | "urgent";
  winner?: "A" | "B" | "draw";
  blamedParty?: "A" | "B" | "both" | "unknown";
  userPerspective?: UserPerspective;
  userPerspectiveVerdict?: string;
  tone?: "light" | "serious" | "safety";
  rewardTier?: RewardTier;
  publicTitle?: string;
  issueSummary?: string;
  anonymizedDialogueSummary?: [string, string];
  shareSummary?: string;
};
```

If the existing file already exports `JudgmentResult`, merge the optional fields into that type rather than creating a duplicate.

- [ ] **Step 3: Run type-adjacent tests**

Run:

```bash
npm test -- src/features/analyzer/ruleBasedAnalyzer.test.ts src/features/result/ResultScreen.test.tsx --run
```

Expected: PASS. Existing rule-based tests must continue because the fallback still uses the old analyzer.

- [ ] **Step 4: Commit**

```bash
git add src/features/analyzer/types.ts
git commit -m "feat: extend judgment result for ai"
```

---

### Task 2: Add Free Judgment Browser Adapter

**Files:**
- Create: `src/features/analyzer/freeJudgmentAdapter.ts`
- Create: `src/features/analyzer/freeJudgmentAdapter.test.ts`
- Modify: none outside analyzer in this task

- [ ] **Step 1: Write failing adapter tests**

Create `src/features/analyzer/freeJudgmentAdapter.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest";
import { analyzeWithAi } from "./freeJudgmentAdapter";

const aiResult = {
  verdict: "A가 72% 선넘었어요",
  partyAPercent: 72,
  partyBPercent: 28,
  reasons: ["사과가 늦었어요", "말투가 강했어요", "상대 감정을 놓쳤어요"],
  advice: "먼저 미안했던 지점을 짚어주세요.",
  safetyLevel: "normal",
  userPerspectiveVerdict: "내가 72% 선넘었어요",
};

describe("analyzeWithAi", () => {
  it("returns server AI result when API succeeds", async () => {
    const fetcher = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ result: aiResult, remainingFreeUses: 2 }),
    });

    const result = await analyzeWithAi({
      text: "A: 미안\nB: 괜찮아",
      userPerspective: "first",
      fetcher,
    });

    expect(result.status).toBe("ready");
    expect(result.result.verdict).toBe("A가 72% 선넘었어요");
    expect(result.remainingFreeUses).toBe(2);
  });

  it("returns limited status when daily quota is exhausted", async () => {
    const fetcher = vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      json: async () => ({ message: "오늘 무료 판독을 모두 사용했어요." }),
    });

    const result = await analyzeWithAi({
      text: "A: 왜 그래",
      userPerspective: "unknown",
      fetcher,
    });

    expect(result.status).toBe("limited");
    expect(result.message).toBe("오늘 무료 판독을 모두 사용했어요.");
  });

  it("falls back to local rule analyzer when network fails", async () => {
    const result = await analyzeWithAi({
      text: "A: 너는 항상 그래\nB: 미안해",
      userPerspective: "unknown",
      fetcher: vi.fn().mockRejectedValue(new Error("offline")),
    });

    expect(result.status).toBe("fallback");
    expect(result.result.reasons.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run tests and verify failure**

Run:

```bash
npm test -- src/features/analyzer/freeJudgmentAdapter.test.ts --run
```

Expected: FAIL because `freeJudgmentAdapter.ts` does not exist.

- [ ] **Step 3: Implement adapter**

Create `src/features/analyzer/freeJudgmentAdapter.ts`:

```ts
import { analyzeWithRules } from "./ruleBasedAnalyzer";
import type { JudgmentResult, UserPerspective } from "./types";

export type AiJudgmentReady = {
  status: "ready" | "fallback";
  result: JudgmentResult;
  remainingFreeUses?: number;
  message?: string;
};

export type AiJudgmentLimited = {
  status: "limited";
  message: string;
  remainingFreeUses: 0;
};

export type AiJudgmentResult = AiJudgmentReady | AiJudgmentLimited;

type AnalyzeWithAiInput = {
  text: string;
  userPerspective: UserPerspective;
  endpointUrl?: string;
  fetcher?: typeof fetch;
};

function getAnonymousUserKey() {
  const storageKey = "lua-nooga-ai-anonymous-user-key";

  if (typeof window === "undefined") {
    return "server-render";
  }

  const existingKey = window.localStorage.getItem(storageKey);
  if (existingKey) {
    return existingKey;
  }

  const nextKey =
    typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `anon-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  window.localStorage.setItem(storageKey, nextKey);
  return nextKey;
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
      message?: string;
      remainingFreeUses?: number;
    };

    if (response.status === 429) {
      return {
        status: "limited",
        message: payload.message ?? "오늘 무료 판독을 모두 사용했어요.",
        remainingFreeUses: 0,
      };
    }

    if (!response.ok || !payload.result) {
      throw new Error(payload.message ?? "AI 판독에 실패했어요.");
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
      message: "AI 서버 연결이 불안정해서 기기 안에서 가볍게 판독했어요.",
    };
  }
}
```

- [ ] **Step 4: Run tests and verify pass**

Run:

```bash
npm test -- src/features/analyzer/freeJudgmentAdapter.test.ts --run
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/analyzer/freeJudgmentAdapter.ts src/features/analyzer/freeJudgmentAdapter.test.ts
git commit -m "feat: add free ai judgment adapter"
```

---

### Task 3: Add User Perspective Selector to Review UI

**Files:**
- Modify: `src/features/input/TextReview.tsx`
- Modify: `src/features/input/TextReview.test.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Inspect TextReview props**

Run:

```bash
sed -n '1,260p' src/features/input/TextReview.tsx
```

Expected: identify the existing `onAnalyze(text)` prop and the submit button area.

- [ ] **Step 2: Update TextReview test first**

Add a test to `src/features/input/TextReview.test.tsx`:

```ts
it("submits selected user perspective with the text", async () => {
  const user = userEvent.setup();
  const onAnalyze = vi.fn();

  render(
    <TextReview
      initialText="첫번째: 늦어서 미안\n두번째: 기다렸잖아"
      onAnalyze={onAnalyze}
      onBack={vi.fn()}
    />,
  );

  await user.click(screen.getByRole("button", { name: "나는 첫 번째 사람이에요" }));
  await user.click(screen.getByRole("button", { name: "판독하기" }));

  expect(onAnalyze).toHaveBeenCalledWith(
    "첫번째: 늦어서 미안\n두번째: 기다렸잖아",
    "first",
  );
});
```

If the file uses a different helper setup, keep the local setup style and only add this behavior.

- [ ] **Step 3: Run test and verify failure**

Run:

```bash
npm test -- src/features/input/TextReview.test.tsx --run
```

Expected: FAIL because `onAnalyze` still receives only text and no perspective selector exists.

- [ ] **Step 4: Implement perspective state and UI**

In `TextReview.tsx`, import the type:

```ts
import type { UserPerspective } from "../analyzer/types";
```

Change prop signature:

```ts
onAnalyze(text: string, userPerspective: UserPerspective): void;
```

Add state:

```ts
const [userPerspective, setUserPerspective] =
  useState<UserPerspective>("unknown");
```

Add this selector above the submit button:

```tsx
<section className="perspective-selector" aria-label="내가 누구인지 선택">
  <strong>이 대화에서 나는 누구예요?</strong>
  <div>
    <button
      type="button"
      aria-pressed={userPerspective === "first"}
      onClick={() => setUserPerspective("first")}
    >
      나는 첫 번째 사람이에요
    </button>
    <button
      type="button"
      aria-pressed={userPerspective === "second"}
      onClick={() => setUserPerspective("second")}
    >
      나는 두 번째 사람이에요
    </button>
    <button
      type="button"
      aria-pressed={userPerspective === "unknown"}
      onClick={() => setUserPerspective("unknown")}
    >
      잘 모르겠어요
    </button>
  </div>
</section>
```

Change submit call:

```ts
onAnalyze(draft.trim(), userPerspective);
```

In `src/App.tsx`, change `handleAnalyze` signature:

```ts
const handleAnalyze = async (
  text: string,
  userPerspective: UserPerspective,
  reviewId: number,
) => {
  const aiJudgment = await analyzeWithAi({ text, userPerspective });

  if (reviewId !== activeReviewIdRef.current) {
    return;
  }

  revokeScreenshotPreviewUrl();

  if (aiJudgment.status === "limited") {
    setState((currentState) =>
      currentState.screen === "review" && currentState.reviewId === reviewId
        ? { ...currentState, helperText: aiJudgment.message }
        : currentState,
    );
    return;
  }

  setState({ screen: "result", result: aiJudgment.result, sourceText: text });
};
```

Import:

```ts
import { analyzeWithAi } from "./features/analyzer/freeJudgmentAdapter";
import type { UserPerspective } from "./features/analyzer/types";
```

Remove direct free-flow usage of `analyzeWithRules` from `handleAnalyze`; keep it only if room explosion still uses local fallback for now.

Change `TextReview` usage:

```tsx
onAnalyze={(text, userPerspective) =>
  handleAnalyze(text, userPerspective, state.reviewId)
}
```

- [ ] **Step 5: Add minimal CSS**

In `src/App.css`, add:

```css
.perspective-selector {
  display: grid;
  gap: 10px;
  padding: 14px;
  border: 1px solid rgba(229, 232, 235, 0.95);
  border-radius: 12px;
  background: #ffffff;
}

.perspective-selector strong {
  color: #191f28;
  font-size: 15px;
  font-weight: 900;
}

.perspective-selector > div {
  display: grid;
  grid-template-columns: 1fr;
  gap: 8px;
}

.perspective-selector button {
  min-height: 42px;
  border: 1px solid #e5e8eb;
  border-radius: 8px;
  background: #ffffff;
  color: #333d4b;
  font: inherit;
  font-size: 14px;
  font-weight: 800;
}

.perspective-selector button[aria-pressed="true"] {
  border-color: #3182f6;
  background: #eef6ff;
  color: #1b64da;
}
```

- [ ] **Step 6: Run tests**

Run:

```bash
npm test -- src/features/input/TextReview.test.tsx src/App.test.tsx --run
```

Expected: PASS after updating any existing mocks from `analyzeWithRules` to `analyzeWithAi` for the free text flow.

- [ ] **Step 7: Commit**

```bash
git add src/App.tsx src/App.css src/features/input/TextReview.tsx src/features/input/TextReview.test.tsx
git commit -m "feat: collect user perspective before judgment"
```

---

### Task 4: Add AI JSON and Usage Limit Server Helpers

**Files:**
- Create: `api/_aiJson.js`
- Create: `api/_usageLimit.js`

- [ ] **Step 1: Create AI normalization helper**

Create `api/_aiJson.js`:

```js
export function clampPercent(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    return 50;
  }
  return Math.max(0, Math.min(100, Math.round(number)));
}

export function normalizeJudgmentResult(payload) {
  const partyAPercent = clampPercent(payload.partyAPercent);
  const partyBPercent = 100 - partyAPercent;
  const reasons = Array.isArray(payload.reasons)
    ? payload.reasons.filter((reason) => typeof reason === "string" && reason.trim()).slice(0, 3)
    : [];

  while (reasons.length < 3) {
    reasons.push("대화의 표현과 맥락을 함께 봤어요.");
  }

  const safetyLevel = ["normal", "caution", "urgent"].includes(payload.safetyLevel)
    ? payload.safetyLevel
    : "normal";

  return {
    verdict:
      typeof payload.verdict === "string" && payload.verdict.trim()
        ? payload.verdict.trim()
        : `A가 ${partyAPercent}% 선넘었어요`,
    partyAPercent,
    partyBPercent,
    reasons,
    advice:
      typeof payload.advice === "string" && payload.advice.trim()
        ? payload.advice.trim()
        : "서로 한 문장씩만 낮춰서 다시 말해보세요.",
    safetyLevel,
    winner: ["A", "B", "draw"].includes(payload.winner) ? payload.winner : undefined,
    blamedParty: ["A", "B", "both", "unknown"].includes(payload.blamedParty)
      ? payload.blamedParty
      : undefined,
    userPerspective: ["first", "second", "unknown"].includes(payload.userPerspective)
      ? payload.userPerspective
      : undefined,
    userPerspectiveVerdict:
      typeof payload.userPerspectiveVerdict === "string"
        ? payload.userPerspectiveVerdict.trim()
        : undefined,
    tone: ["light", "serious", "safety"].includes(payload.tone) ? payload.tone : undefined,
    rewardTier: ["small", "medium", "large"].includes(payload.rewardTier)
      ? payload.rewardTier
      : undefined,
    publicTitle: typeof payload.publicTitle === "string" ? payload.publicTitle.trim() : undefined,
    issueSummary:
      typeof payload.issueSummary === "string" ? payload.issueSummary.trim() : undefined,
    anonymizedDialogueSummary: Array.isArray(payload.anonymizedDialogueSummary)
      ? payload.anonymizedDialogueSummary
          .filter((line) => typeof line === "string" && line.trim())
          .slice(0, 2)
      : undefined,
    shareSummary:
      typeof payload.shareSummary === "string" ? payload.shareSummary.trim() : undefined,
  };
}

export function parseJsonFromModelText(text) {
  if (typeof text !== "string") {
    throw new Error("model output is not text");
  }

  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  return JSON.parse(fenced ? fenced[1] : trimmed);
}
```

- [ ] **Step 2: Create usage limiter**

Create `api/_usageLimit.js`:

```js
const memoryUsage = new Map();
const freeLimit = 3;

function getTodayKey(now = new Date()) {
  return now.toISOString().slice(0, 10);
}

function createMemoryKey({ anonymousUserKey, dateKey }) {
  return `${dateKey}:${anonymousUserKey}`;
}

export async function checkAndConsumeFreeUse({
  anonymousUserKey,
  supabaseFetch = fetch,
  now = new Date(),
}) {
  const dateKey = getTodayKey(now);

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const key = createMemoryKey({ anonymousUserKey, dateKey });
    const current = memoryUsage.get(key) ?? 0;

    if (current >= freeLimit) {
      return { allowed: false, remainingFreeUses: 0 };
    }

    memoryUsage.set(key, current + 1);
    return { allowed: true, remainingFreeUses: freeLimit - current - 1 };
  }

  const response = await supabaseFetch(
    `${process.env.SUPABASE_URL.replace(/\/$/, "")}/rest/v1/rpc/consume_free_judgment_use`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({
        p_anonymous_user_key: anonymousUserKey,
        p_usage_date: dateKey,
        p_free_limit: freeLimit,
      }),
    },
  );

  if (!response.ok) {
    throw new Error("usage limit request failed");
  }

  const payload = await response.json();
  const row = Array.isArray(payload) ? payload[0] : payload;
  return {
    allowed: Boolean(row.allowed),
    remainingFreeUses: Number(row.remaining_free_uses ?? 0),
  };
}
```

- [ ] **Step 3: Commit**

```bash
git add api/_aiJson.js api/_usageLimit.js
git commit -m "feat: add ai judgment server helpers"
```

---

### Task 5: Add Free AI Judgment API Route

**Files:**
- Create: `api/ai/free-judgment.js`
- Create: `api/ai/free-judgment.test.mjs`

- [ ] **Step 1: Write endpoint tests**

Create `api/ai/free-judgment.test.mjs`:

```js
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import handler from "./free-judgment.js";

function createResponse() {
  return {
    statusCode: 200,
    body: undefined,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
    setHeader() {},
  };
}

describe("free judgment api", () => {
  it("rejects empty text", async () => {
    const response = createResponse();
    await handler({ method: "POST", body: { text: "" } }, response);
    assert.equal(response.statusCode, 400);
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
        testFetch: async () => ({
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
        }),
        testUsage: async () => ({ allowed: true, remainingFreeUses: 2 }),
      },
      response,
    );

    assert.equal(response.statusCode, 200);
    assert.equal(response.body.result.partyAPercent, 64);
    assert.equal(response.body.result.partyBPercent, 36);
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
  });
});
```

- [ ] **Step 2: Run tests and verify failure**

Run:

```bash
node --test api/ai/free-judgment.test.mjs
```

Expected: FAIL because endpoint does not exist.

- [ ] **Step 3: Implement endpoint**

Create `api/ai/free-judgment.js`:

```js
import { normalizeJudgmentResult, parseJsonFromModelText } from "../_aiJson.js";
import { checkAndConsumeFreeUse } from "../_usageLimit.js";

const maxTextLength = 4000;

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

function createPrompt({ text, userPerspective }) {
  return [
    "너는 Toss 미니앱 '누가 잘못 AI'의 판정 엔진이다.",
    "재미있는 판정 톤을 쓰되, 한 사람을 과도하게 공격하지 말고 부드럽게 완충해라.",
    "법률 상담, 의료 상담, 심리 상담처럼 말하지 마라.",
    "위협, 폭력, 자해, 스토킹, 학대 위험이 보이면 safetyLevel을 caution 또는 urgent로 설정해라.",
    "반드시 JSON만 출력해라.",
    "",
    `사용자 관점: ${userPerspective}`,
    "필수 JSON 필드: verdict, partyAPercent, reasons, advice, safetyLevel, userPerspectiveVerdict, publicTitle, issueSummary, anonymizedDialogueSummary, shareSummary, rewardTier, tone",
    "partyAPercent는 0부터 100 사이 정수다. partyBPercent는 서버가 계산한다.",
    "",
    "대화:",
    text,
  ].join("\n");
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

  const payload = await response.json();
  const outputText =
    payload.output_text ??
    payload.output?.flatMap((item) => item.content ?? [])
      ?.map((content) => content.text ?? "")
      ?.join("\n");

  return parseJsonFromModelText(outputText);
}

export default async function handler(request, response) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    response.status(405).json({ message: "method not allowed" });
    return;
  }

  const body = parseBody(request);
  const text = typeof body.text === "string" ? body.text.trim() : "";
  const userPerspective = ["first", "second", "unknown"].includes(body.userPerspective)
    ? body.userPerspective
    : "unknown";
  const anonymousUserKey =
    typeof body.anonymousUserKey === "string" && body.anonymousUserKey.trim()
      ? body.anonymousUserKey.trim()
      : "anonymous";

  if (!text) {
    response.status(400).json({ message: "판독할 대화가 필요해요." });
    return;
  }

  if (text.length > maxTextLength) {
    response.status(413).json({ message: "대화가 너무 길어요. 핵심 부분만 줄여주세요." });
    return;
  }

  try {
    const usage = await (request.testUsage ?? checkAndConsumeFreeUse)({
      anonymousUserKey,
    });

    if (!usage.allowed) {
      response.status(429).json({
        message: "오늘 무료 판독을 모두 사용했어요. 공유하면 1회를 추가로 받을 수 있어요.",
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
    response.status(503).json({
      message: "AI 판독 서버가 잠시 불안정해요. 다시 시도해 주세요.",
    });
  }
}
```

- [ ] **Step 4: Run endpoint tests**

Run:

```bash
node --test api/ai/free-judgment.test.mjs
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add api/ai/free-judgment.js api/ai/free-judgment.test.mjs
git commit -m "feat: add free ai judgment api"
```

---

### Task 6: Add Supabase Usage RPC Migration

**Files:**
- Modify: `supabase/schema.sql`

- [ ] **Step 1: Add usage tables and RPC**

Append to `supabase/schema.sql` near the existing result/room schema:

```sql
create table if not exists public.anonymous_users (
  anonymous_user_key text primary key,
  created_at timestamptz not null default now(),
  blocked_at timestamptz
);

create table if not exists public.daily_ai_usage (
  anonymous_user_key text not null references public.anonymous_users(anonymous_user_key) on delete cascade,
  usage_date date not null,
  free_uses integer not null default 0,
  share_bonus_uses integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (anonymous_user_key, usage_date)
);

alter table public.anonymous_users enable row level security;
alter table public.daily_ai_usage enable row level security;

revoke all on public.anonymous_users from anon, authenticated;
revoke all on public.daily_ai_usage from anon, authenticated;

create or replace function public.consume_free_judgment_use(
  p_anonymous_user_key text,
  p_usage_date date,
  p_free_limit integer default 3
)
returns table (
  allowed boolean,
  remaining_free_uses integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  usage_row public.daily_ai_usage%rowtype;
begin
  if length(trim(p_anonymous_user_key)) < 8 then
    raise exception 'invalid anonymous user key';
  end if;

  insert into public.anonymous_users (anonymous_user_key)
  values (trim(p_anonymous_user_key))
  on conflict (anonymous_user_key) do nothing;

  insert into public.daily_ai_usage (anonymous_user_key, usage_date)
  values (trim(p_anonymous_user_key), p_usage_date)
  on conflict (anonymous_user_key, usage_date) do nothing;

  select *
  into usage_row
  from public.daily_ai_usage
  where anonymous_user_key = trim(p_anonymous_user_key)
    and usage_date = p_usage_date
  for update;

  if usage_row.free_uses >= p_free_limit + usage_row.share_bonus_uses then
    allowed := false;
    remaining_free_uses := 0;
    return next;
    return;
  end if;

  update public.daily_ai_usage
  set free_uses = free_uses + 1,
      updated_at = now()
  where anonymous_user_key = trim(p_anonymous_user_key)
    and usage_date = p_usage_date
  returning * into usage_row;

  allowed := true;
  remaining_free_uses := greatest(
    0,
    p_free_limit + usage_row.share_bonus_uses - usage_row.free_uses
  );
  return next;
end;
$$;

revoke all on function public.consume_free_judgment_use(text, date, integer) from public, anon, authenticated;
grant execute on function public.consume_free_judgment_use(text, date, integer) to service_role;
```

- [ ] **Step 2: Run schema syntax check if Supabase CLI is available**

Run:

```bash
supabase db lint
```

Expected: PASS if local Supabase CLI is configured. If the CLI is unavailable, record that the SQL must be applied through the Supabase dashboard or MCP before release.

- [ ] **Step 3: Commit**

```bash
git add supabase/schema.sql
git commit -m "feat: add free ai usage limit schema"
```

---

### Task 7: Document Environment and Run Full Verification

**Files:**
- Modify: `.env.example`
- Modify: `README.md`

- [ ] **Step 1: Update environment example**

Add these keys to `.env.example`:

```bash
OPENAI_API_KEY=
OPENAI_FREE_JUDGMENT_MODEL=gpt-4.1-mini
SUPABASE_SERVICE_ROLE_KEY=
```

Keep existing `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, and `VITE_PRECEDENT_API_URL`.

- [ ] **Step 2: Update README free judgment section**

In `README.md`, replace language that says free judgment is local-only with:

```md
### 무료 AI 판독

무료 판독은 `/api/ai/free-judgment`에서 서버 AI로 실행됩니다. 프론트는 익명 사용자 키와 대화 텍스트, 사용자 관점을 보내고, 서버는 하루 3회 무료 제한을 확인한 뒤 AI JSON 판정 결과를 반환합니다. 서버 연결이 실패하면 앱은 로컬 규칙 기반 판독으로 임시 fallback합니다.
```

- [ ] **Step 3: Run focused tests**

Run:

```bash
npm test -- src/features/analyzer/freeJudgmentAdapter.test.ts src/features/input/TextReview.test.tsx src/App.test.tsx --run
node --test api/ai/free-judgment.test.mjs
```

Expected: PASS.

- [ ] **Step 4: Run full verification**

Run:

```bash
npm run lint
npm test -- --run
npm run vercel-build
```

Expected: lint PASS, all Vitest tests PASS, Vercel build PASS. The existing large chunk warning may remain until OCR code splitting is handled in a later plan.

- [ ] **Step 5: Commit**

```bash
git add .env.example README.md
git commit -m "docs: document free ai judgment setup"
```

---

## Self-Review

- Spec coverage: This plan covers the first implementation slice from the real AI service spec: free server AI, user perspective, daily usage limit, and safe fallback. It intentionally does not implement paid precedent analysis, Hot Battle server summaries, comments, rewards, or room AI; those require separate plans.
- Placeholder scan: The plan contains no TBD/TODO placeholders. Each task includes concrete file paths, code, commands, and expected outcomes.
- Type consistency: `UserPerspective`, `JudgmentResult`, `analyzeWithAi`, and `/api/ai/free-judgment` are introduced once and reused consistently.
