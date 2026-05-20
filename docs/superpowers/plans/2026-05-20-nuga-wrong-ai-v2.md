# 누가 잘못 AI v2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebrand the Toss mini app to `누가 잘못 AI`, introduce `미스 노짱` as the judge character, add free reward recommendations, and scaffold future 990원 precedent/payment integrations.

**Architecture:** Keep the current client-only MVP and add focused feature modules for rewards, premium payment state, and precedent lookup state. Do not bundle `legalize-kr/precedent-kr`; expose a typed adapter that can later call a server-side index. UI stays mobile-first inside the existing Toss WebView/TDS surface.

**Tech Stack:** React, TypeScript, Vite, Vitest, Testing Library, Toss TDS Mobile, lucide-react, Granite Apps in Toss packaging.

---

## File Structure

- Modify `granite.config.ts`: update app metadata, display name, icon path, and description.
- Create `public/miss-nozzang-judge.png`: original project mascot inspired by the provided judge image, generated during execution with the `imagegen` skill.
- Create `public/nuga-wrong-ai-icon.png`: app icon derived from the same character direction, generated during execution with the `imagegen` skill.
- Create `src/shared/ui/MissNozzangMascot.tsx`: image-based mascot component with accessible alt text and asset fallback.
- Modify `src/features/input/InputHome.tsx`: replace `미스터 노우` copy and mascot with the new brand, free/premium CTAs, and `990원` messaging.
- Modify `src/features/input/TextReview.tsx`: rename action copy to `무료 판독 받기` and change judge copy to `미스 노짱`.
- Modify `src/features/result/ResultScreen.tsx`: rename result copy, add reward recommendation section, add premium CTA and setup panel, hide reward/premium upsell on safety results.
- Create `src/features/rewards/rewardAdapter.ts`: map winner wish text to Toss Shopping-ready category/search metadata without opening a real deep link.
- Create `src/features/rewards/rewardAdapter.test.ts`: verify category mapping and fallback behavior.
- Create `src/features/premium/premiumAdapter.ts`: represent the 990원 product and return `notConfigured` until real Toss IAP is connected.
- Create `src/features/premium/premiumAdapter.test.ts`: verify product metadata and not-configured state.
- Create `src/features/precedent/precedentAdapter.ts`: define future precedent result shape and return safe not-configured state.
- Create `src/features/precedent/precedentAdapter.test.ts`: verify no bundled precedent data is required and disclaimer copy is present.
- Modify `src/App.css`: style new mascot, home pricing band, reward section, and premium setup panel.
- Modify tests in `src/App.test.tsx`, `src/features/input/InputHome.test.tsx`, `src/features/input/TextReview.test.tsx`, `src/features/result/ResultScreen.test.tsx`: update assertions for new copy and new flows.
- Modify `README.md`: update product name, free/990원 split, future integration notes, and safety/legal disclaimers.

## Task 1: Brand Metadata And Home Copy

**Files:**
- Modify: `granite.config.ts`
- Modify: `src/features/input/InputHome.tsx`
- Modify: `src/features/input/InputHome.test.tsx`
- Modify: `src/App.css`

- [ ] **Step 1: Write failing home branding tests**

Update `src/features/input/InputHome.test.tsx` so the primary test asserts the new app name, subcopy, and 990원 headline:

```tsx
it("shows the 누가 잘못 AI brand and pricing split", () => {
  renderInputHome(<InputHome onSelect={vi.fn()} />);

  expect(screen.getByText("누가 잘못 AI")).toBeInTheDocument();
  expect(screen.getByText("미스 노짱이 판독해드립니다")).toBeInTheDocument();
  expect(screen.getByText("990원 내면 판례까지 뒤져드립니다")).toBeInTheDocument();
  expect(screen.getByText("싸움 판독 자체는 무료예요")).toBeInTheDocument();
});
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run:

```bash
npm test -- src/features/input/InputHome.test.tsx --run
```

Expected: FAIL because `미스터 노우` copy is still rendered.

- [ ] **Step 3: Update home copy and metadata**

In `granite.config.ts`, set:

```ts
appName: "nuga-wrong-ai",
displayName: "누가 잘못 AI",
description: "미스 노짱이 대화 싸움을 무료로 판독하고, 990원 판례 판독 연결을 준비하는 Toss 미니앱",
icon: "/nuga-wrong-ai-icon.png",
```

In `src/features/input/InputHome.tsx`, replace the `Top` and hero copy with:

```tsx
<Top
  title={<Top.TitleParagraph size={28}>누가 잘못 AI</Top.TitleParagraph>}
  subtitleBottom={
    <Top.SubtitleParagraph size={15}>
      미스 노짱이 판독해드립니다
    </Top.SubtitleParagraph>
  }
/>

<section className="hero-panel" aria-label="누가 잘못 AI 소개">
  <MissNozzangMascot />
  <div>
    <p className="eyebrow">싸움 판독 자체는 무료예요</p>
    <h1>990원 내면 판례까지 뒤져드립니다</h1>
    <p className="hero-panel__note">무료로는 가볍게, 유료로는 더 그럴듯하게.</p>
  </div>
</section>
```

Keep the four input method cards unchanged.

- [ ] **Step 4: Add home note styles**

In `src/App.css`, add:

```css
.hero-panel__note {
  margin: 8px 0 0;
  color: #4e5968;
  font-size: 14px;
  font-weight: 700;
  line-height: 1.45;
}
```

- [ ] **Step 5: Run focused test and commit**

Run:

```bash
npm test -- src/features/input/InputHome.test.tsx --run
```

Expected: PASS.

Commit:

```bash
git add granite.config.ts src/features/input/InputHome.tsx src/features/input/InputHome.test.tsx src/App.css
git commit -m "feat: rebrand home to nuga wrong ai"
```

## Task 2: Miss Nozzang Character Assets

**Files:**
- Create: `public/miss-nozzang-judge.png`
- Create: `public/nuga-wrong-ai-icon.png`
- Create: `src/shared/ui/MissNozzangMascot.tsx`
- Modify: `src/features/input/InputHome.tsx`
- Modify: `src/App.css`

- [ ] **Step 1: Generate original character assets with imagegen**

Use the `imagegen` skill. Reference the user-provided image at `/Users/sooin/Downloads/Lua-판사.png`, but create an original asset rather than copying it.

Prompt for `public/miss-nozzang-judge.png`:

```text
Original cute anime judge mascot for a Korean Toss mini app named "누가 잘못 AI". White bob haircut, soft judge wig curls, black judge robe, small wooden gavel, stern but cute expression, clean mobile app illustration, centered upper body, bright friendly lighting, no text, no logo, not a copy of the reference image.
```

Prompt for `public/nuga-wrong-ai-icon.png`:

```text
Original app icon portrait of the same cute anime judge mascot. White bob hair, judge wig, black robe collar, tiny gavel visible, stern cute expression, simple high contrast composition, works at small icon sizes, no text, no logo.
```

Save the generated files exactly at the paths above.

- [ ] **Step 2: Create mascot component**

Create `src/shared/ui/MissNozzangMascot.tsx`:

```tsx
export function MissNozzangMascot() {
  return (
    <figure className="miss-nozzang" aria-label="미스 노짱 판사 캐릭터">
      <img
        className="miss-nozzang__image"
        src="/miss-nozzang-judge.png"
        alt="하얀 단발머리에 판사 가발을 쓰고 망치를 든 미스 노짱"
      />
      <figcaption>미스 노짱</figcaption>
    </figure>
  );
}
```

- [ ] **Step 3: Replace mascot import**

In `src/features/input/InputHome.tsx`, replace:

```tsx
import { MrKnowMascot } from "../../shared/ui/MrKnowMascot";
```

with:

```tsx
import { MissNozzangMascot } from "../../shared/ui/MissNozzangMascot";
```

and replace `<MrKnowMascot />` with `<MissNozzangMascot />`.

- [ ] **Step 4: Add image mascot styles**

In `src/App.css`, add:

```css
.miss-nozzang {
  display: grid;
  gap: 6px;
  justify-items: center;
  width: 108px;
  margin: 0;
  flex: 0 0 auto;
}

.miss-nozzang__image {
  width: 96px;
  height: 96px;
  border: 1px solid #e5e8eb;
  border-radius: 8px;
  background: #ffffff;
  object-fit: cover;
  object-position: center top;
}

.miss-nozzang figcaption {
  margin: 0;
  color: #4e5968;
  font-size: 12px;
  font-weight: 800;
  line-height: 1.2;
}
```

- [ ] **Step 5: Run asset smoke checks and commit**

Run:

```bash
test -s public/miss-nozzang-judge.png
test -s public/nuga-wrong-ai-icon.png
npm test -- src/features/input/InputHome.test.tsx --run
```

Expected: both `test -s` commands exit 0 and Vitest passes.

Commit:

```bash
git add public/miss-nozzang-judge.png public/nuga-wrong-ai-icon.png src/shared/ui/MissNozzangMascot.tsx src/features/input/InputHome.tsx src/App.css
git commit -m "feat: add miss nozzang mascot"
```

## Task 3: Free Verdict Copy And Text Review

**Files:**
- Modify: `src/features/input/TextReview.tsx`
- Modify: `src/features/input/TextReview.test.tsx`
- Modify: `src/features/result/ResultScreen.tsx`
- Modify: `src/features/result/ResultScreen.test.tsx`

- [ ] **Step 1: Write failing copy tests**

In `src/features/input/TextReview.test.tsx`, assert:

```tsx
expect(screen.getByRole("button", { name: "무료 판독 받기" })).toBeInTheDocument();
expect(screen.getByText(/미스 노짱/)).toBeInTheDocument();
```

In `src/features/result/ResultScreen.test.tsx`, replace `오늘의 판정` assertions with:

```tsx
expect(screen.getByText("오늘의 판결")).toBeInTheDocument();
expect(screen.getByText("판독 결과")).toBeInTheDocument();
expect(screen.getByText(/입력된 내용 기준의 재미용 판독/)).toBeInTheDocument();
```

- [ ] **Step 2: Run focused tests and verify failures**

Run:

```bash
npm test -- src/features/input/TextReview.test.tsx src/features/result/ResultScreen.test.tsx --run
```

Expected: FAIL because old `판정` copy is still present.

- [ ] **Step 3: Update TextReview copy**

In `src/features/input/TextReview.tsx`, use these strings:

```tsx
<Top.TitleParagraph size={22}>미스 노짱이 판독할 대화</Top.TitleParagraph>
```

Button text:

```tsx
{isSubmitting ? "판독 중..." : "무료 판독 받기"}
```

Empty error:

```tsx
판독할 내용을 먼저 입력해주세요.
```

- [ ] **Step 4: Update ResultScreen copy**

In `src/features/result/ResultScreen.tsx`, change:

```tsx
<Top.TitleParagraph size={22}>판독 결과</Top.TitleParagraph>
```

Change the verdict label to:

```tsx
<p>오늘의 판결</p>
```

Change disclaimer to:

```tsx
입력된 내용 기준의 재미용 판독이에요. 법률 자문이 아니며, 실제 법적 판단은 구체적 사실관계에 따라 달라져요.
```

Change restart button to:

```tsx
다시 판독하기
```

- [ ] **Step 5: Run focused tests and commit**

Run:

```bash
npm test -- src/features/input/TextReview.test.tsx src/features/result/ResultScreen.test.tsx --run
```

Expected: PASS.

Commit:

```bash
git add src/features/input/TextReview.tsx src/features/input/TextReview.test.tsx src/features/result/ResultScreen.tsx src/features/result/ResultScreen.test.tsx
git commit -m "feat: update free verdict copy"
```

## Task 4: Reward Recommendation Adapter

**Files:**
- Create: `src/features/rewards/rewardAdapter.ts`
- Create: `src/features/rewards/rewardAdapter.test.ts`

- [ ] **Step 1: Write failing reward tests**

Create `src/features/rewards/rewardAdapter.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { createRewardRecommendation } from "./rewardAdapter";

describe("createRewardRecommendation", () => {
  it("maps sweet requests to dessert recommendations", () => {
    const recommendation = createRewardRecommendation("달달한 거 먹고 싶어");

    expect(recommendation.category).toBe("디저트/간식");
    expect(recommendation.searchTerms).toEqual(["초콜릿", "마카롱", "케이크"]);
    expect(recommendation.ctaLabel).toBe("토스 쇼핑에서 비슷한 보상 찾기");
  });

  it("maps coffee requests to drink recommendations", () => {
    const recommendation = createRewardRecommendation("아이스 아메리카노");

    expect(recommendation.category).toBe("커피/음료");
    expect(recommendation.searchTerms).toContain("커피");
  });

  it("uses a low-risk fallback for unclear requests", () => {
    const recommendation = createRewardRecommendation("");

    expect(recommendation.category).toBe("생활 소품");
    expect(recommendation.searchTerms).toEqual(["작은 선물", "편지지", "캔들"]);
  });
});
```

- [ ] **Step 2: Run test and verify failure**

Run:

```bash
npm test -- src/features/rewards/rewardAdapter.test.ts --run
```

Expected: FAIL because `rewardAdapter.ts` does not exist.

- [ ] **Step 3: Implement reward adapter**

Create `src/features/rewards/rewardAdapter.ts`:

```ts
export type RewardCategory =
  | "커피/음료"
  | "디저트/간식"
  | "꽃/감정 회복"
  | "캐릭터 굿즈"
  | "생활 소품"
  | "식사권";

export type RewardRecommendation = {
  category: RewardCategory;
  searchTerms: [string, string, string];
  reason: string;
  ctaLabel: "토스 쇼핑에서 비슷한 보상 찾기";
};

const rewardRules: Array<{
  category: RewardCategory;
  keywords: string[];
  searchTerms: [string, string, string];
  reason: string;
}> = [
  {
    category: "커피/음료",
    keywords: ["커피", "아메리카노", "라떼", "음료", "카페", "버블티"],
    searchTerms: ["커피", "카페 쿠폰", "음료 교환권"],
    reason: "가볍게 사과하고 바로 건네기 좋은 보상이에요.",
  },
  {
    category: "디저트/간식",
    keywords: ["달달", "디저트", "간식", "초콜릿", "케이크", "마카롱", "젤리"],
    searchTerms: ["초콜릿", "마카롱", "케이크"],
    reason: "분위기를 부드럽게 풀기 좋은 달콤한 보상이에요.",
  },
  {
    category: "꽃/감정 회복",
    keywords: ["꽃", "사과", "화해", "기분", "감정", "편지"],
    searchTerms: ["꽃다발", "미니 꽃", "사과 카드"],
    reason: "말로 부족한 사과를 모양으로 보여주기 좋아요.",
  },
  {
    category: "캐릭터 굿즈",
    keywords: ["귀여운", "캐릭터", "인형", "키링", "굿즈"],
    searchTerms: ["캐릭터 키링", "미니 인형", "스티커"],
    reason: "무겁지 않게 웃으면서 넘기기 좋은 보상이에요.",
  },
  {
    category: "식사권",
    keywords: ["밥", "식사", "저녁", "점심", "치킨", "피자", "고기"],
    searchTerms: ["식사권", "치킨 쿠폰", "피자 쿠폰"],
    reason: "제대로 앉아서 다시 이야기할 명분을 만들어줘요.",
  },
];

const fallback = {
  category: "생활 소품" as const,
  searchTerms: ["작은 선물", "편지지", "캔들"] as [string, string, string],
  reason: "취향을 잘 모를 때도 부담 없이 고르기 좋은 보상이에요.",
};

export function createRewardRecommendation(wish: string): RewardRecommendation {
  const normalizedWish = wish.trim().toLowerCase();
  const match = rewardRules.find((rule) =>
    rule.keywords.some((keyword) => normalizedWish.includes(keyword)),
  );
  const recommendation = match ?? fallback;

  return {
    category: recommendation.category,
    searchTerms: recommendation.searchTerms,
    reason: recommendation.reason,
    ctaLabel: "토스 쇼핑에서 비슷한 보상 찾기",
  };
}
```

- [ ] **Step 4: Run test and commit**

Run:

```bash
npm test -- src/features/rewards/rewardAdapter.test.ts --run
```

Expected: PASS.

Commit:

```bash
git add src/features/rewards/rewardAdapter.ts src/features/rewards/rewardAdapter.test.ts
git commit -m "feat: add reward recommendation adapter"
```

## Task 5: Reward Recommendation UI

**Files:**
- Modify: `src/features/result/ResultScreen.tsx`
- Modify: `src/features/result/ResultScreen.test.tsx`
- Modify: `src/App.css`

- [ ] **Step 1: Write failing UI tests**

Add tests to `src/features/result/ResultScreen.test.tsx`:

```tsx
it("recommends a Toss Shopping reward from the winner wish", async () => {
  const user = userEvent.setup();
  renderResultScreen(<ResultScreen result={result} onRestart={vi.fn()} />);

  await user.type(screen.getByLabelText("이긴 사람이 받고 싶은 것"), "달달한 거");
  await user.click(screen.getByRole("button", { name: "보상 추천 받기" }));

  expect(screen.getByText("디저트/간식")).toBeInTheDocument();
  expect(screen.getByText("초콜릿 · 마카롱 · 케이크")).toBeInTheDocument();
  expect(
    screen.getByRole("button", { name: "토스 쇼핑에서 비슷한 보상 찾기" }),
  ).toBeInTheDocument();
});

it("does not show shopping reward flow for safety results", () => {
  renderResultScreen(
    <ResultScreen
      result={{ ...result, safetyLevel: "urgent" }}
      onRestart={vi.fn()}
    />,
  );

  expect(screen.queryByLabelText("이긴 사람이 받고 싶은 것")).not.toBeInTheDocument();
});
```

- [ ] **Step 2: Run focused test and verify failure**

Run:

```bash
npm test -- src/features/result/ResultScreen.test.tsx --run
```

Expected: FAIL because the reward UI is not implemented.

- [ ] **Step 3: Add reward UI state**

In `src/features/result/ResultScreen.tsx`, import:

```tsx
import { useState } from "react";
import { createRewardRecommendation, type RewardRecommendation } from "../rewards/rewardAdapter";
```

Inside `ResultScreen`, add:

```tsx
const [rewardWish, setRewardWish] = useState("");
const [rewardRecommendation, setRewardRecommendation] =
  useState<RewardRecommendation | null>(null);
```

Below the advice section, render only when `!isSafetyResult`:

```tsx
{!isSafetyResult ? (
  <section className="result-section reward-box" aria-labelledby="reward-title">
    <h2 id="reward-title">이긴 사람 보상 추천</h2>
    <label className="reward-box__label" htmlFor="reward-wish">
      이긴 사람이 받고 싶은 것
    </label>
    <div className="reward-box__input-row">
      <input
        id="reward-wish"
        value={rewardWish}
        placeholder="예: 달달한 거, 커피, 귀여운 거"
        onChange={(event) => setRewardWish(event.currentTarget.value)}
      />
      <button
        type="button"
        onClick={() =>
          setRewardRecommendation(createRewardRecommendation(rewardWish))
        }
      >
        보상 추천 받기
      </button>
    </div>
    {rewardRecommendation ? (
      <div className="reward-result">
        <strong>{rewardRecommendation.category}</strong>
        <p>{rewardRecommendation.searchTerms.join(" · ")}</p>
        <span>{rewardRecommendation.reason}</span>
        <button type="button">{rewardRecommendation.ctaLabel}</button>
      </div>
    ) : null}
  </section>
) : null}
```

- [ ] **Step 4: Add reward styles**

In `src/App.css`, add:

```css
.reward-box {
  gap: 10px;
}

.reward-box__label {
  color: #333d4b;
  font-size: 14px;
  font-weight: 800;
  line-height: 1.35;
}

.reward-box__input-row {
  display: grid;
  grid-template-columns: 1fr;
  gap: 8px;
}

.reward-box input {
  min-height: 44px;
  box-sizing: border-box;
  padding: 0 12px;
  border: 1px solid #d1d6db;
  border-radius: 8px;
  background: #ffffff;
  color: #191f28;
  font: inherit;
  font-size: 15px;
}

.reward-box button,
.premium-panel button {
  min-height: 44px;
  border: 0;
  border-radius: 8px;
  background: #191f28;
  color: #ffffff;
  font: inherit;
  font-size: 15px;
  font-weight: 800;
}

.reward-result {
  display: grid;
  gap: 6px;
  padding: 12px;
  border-radius: 8px;
  background: #f2f4f6;
}

.reward-result strong,
.reward-result p,
.reward-result span {
  margin: 0;
}

.reward-result strong {
  color: #191f28;
  font-size: 17px;
  line-height: 1.35;
}

.reward-result p,
.reward-result span {
  color: #4e5968;
  font-size: 14px;
  font-weight: 700;
  line-height: 1.45;
}
```

- [ ] **Step 5: Run focused test and commit**

Run:

```bash
npm test -- src/features/result/ResultScreen.test.tsx --run
```

Expected: PASS.

Commit:

```bash
git add src/features/result/ResultScreen.tsx src/features/result/ResultScreen.test.tsx src/App.css
git commit -m "feat: add reward recommendation UI"
```

## Task 6: Premium 990원 And Precedent Adapters

**Files:**
- Create: `src/features/premium/premiumAdapter.ts`
- Create: `src/features/premium/premiumAdapter.test.ts`
- Create: `src/features/precedent/precedentAdapter.ts`
- Create: `src/features/precedent/precedentAdapter.test.ts`

- [ ] **Step 1: Write failing premium tests**

Create `src/features/premium/premiumAdapter.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { createPremiumProduct, requestPremiumVerdict } from "./premiumAdapter";

describe("premiumAdapter", () => {
  it("describes the 990원 precedent verdict product", () => {
    expect(createPremiumProduct()).toEqual({
      id: "precedent-verdict-990",
      title: "990원 판례 판독",
      priceLabel: "990원",
      description: "AI/서버/판례 검색 연결 시 제공되는 고급 판독",
    });
  });

  it("does not charge until Toss IAP is configured", async () => {
    await expect(requestPremiumVerdict()).resolves.toEqual({
      status: "notConfigured",
      message: "인앱결제 연결 예정",
    });
  });
});
```

- [ ] **Step 2: Write failing precedent tests**

Create `src/features/precedent/precedentAdapter.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { getPrecedentBasis, precedentDisclaimer } from "./precedentAdapter";

describe("precedentAdapter", () => {
  it("returns a not-configured state without bundling precedent-kr", async () => {
    await expect(getPrecedentBasis({ text: "A가 사과 없이 화냈어요" })).resolves.toEqual({
      status: "notConfigured",
      precedents: [],
      message: "판례 검색 서버 연결 예정",
    });
  });

  it("keeps the legal safety disclaimer explicit", () => {
    expect(precedentDisclaimer).toContain("유사한 참고 자료");
    expect(precedentDisclaimer).toContain("구체적 사실관계");
  });
});
```

- [ ] **Step 3: Run tests and verify failure**

Run:

```bash
npm test -- src/features/premium/premiumAdapter.test.ts src/features/precedent/precedentAdapter.test.ts --run
```

Expected: FAIL because adapter files do not exist.

- [ ] **Step 4: Implement premium adapter**

Create `src/features/premium/premiumAdapter.ts`:

```ts
export type PremiumProduct = {
  id: "precedent-verdict-990";
  title: "990원 판례 판독";
  priceLabel: "990원";
  description: "AI/서버/판례 검색 연결 시 제공되는 고급 판독";
};

export type PremiumVerdictRequestResult = {
  status: "notConfigured";
  message: "인앱결제 연결 예정";
};

export function createPremiumProduct(): PremiumProduct {
  return {
    id: "precedent-verdict-990",
    title: "990원 판례 판독",
    priceLabel: "990원",
    description: "AI/서버/판례 검색 연결 시 제공되는 고급 판독",
  };
}

export async function requestPremiumVerdict(): Promise<PremiumVerdictRequestResult> {
  return {
    status: "notConfigured",
    message: "인앱결제 연결 예정",
  };
}
```

- [ ] **Step 5: Implement precedent adapter**

Create `src/features/precedent/precedentAdapter.ts`:

```ts
export type PrecedentBasisInput = {
  text: string;
};

export type PrecedentBasis = {
  title: string;
  court: string;
  decidedAt: string;
  summary: string;
  similarityReason: string;
  sourceUrl?: string;
};

export type PrecedentBasisResult = {
  status: "notConfigured";
  precedents: PrecedentBasis[];
  message: "판례 검색 서버 연결 예정";
};

export const precedentDisclaimer =
  "판례는 유사한 참고 자료이며, 실제 법률 판단은 사건의 구체적 사실관계에 따라 달라져요.";

export async function getPrecedentBasis(
  _input: PrecedentBasisInput,
): Promise<PrecedentBasisResult> {
  return {
    status: "notConfigured",
    precedents: [],
    message: "판례 검색 서버 연결 예정",
  };
}
```

- [ ] **Step 6: Run tests and commit**

Run:

```bash
npm test -- src/features/premium/premiumAdapter.test.ts src/features/precedent/precedentAdapter.test.ts --run
```

Expected: PASS.

Commit:

```bash
git add src/features/premium src/features/precedent
git commit -m "feat: scaffold premium precedent adapters"
```

## Task 7: Premium Setup UI

**Files:**
- Modify: `src/features/result/ResultScreen.tsx`
- Modify: `src/features/result/ResultScreen.test.tsx`
- Modify: `src/App.css`

- [ ] **Step 1: Write failing premium UI tests**

Add tests to `src/features/result/ResultScreen.test.tsx`:

```tsx
it("opens the 990원 precedent setup panel without charging", async () => {
  const user = userEvent.setup();
  renderResultScreen(<ResultScreen result={result} onRestart={vi.fn()} />);

  await user.click(screen.getByRole("button", { name: "990원 판례 판독 열기" }));

  expect(screen.getByText("990원 판례 판독")).toBeInTheDocument();
  expect(screen.getByText("인앱결제 연결 예정")).toBeInTheDocument();
  expect(screen.getByText("판례 검색 서버 연결 예정")).toBeInTheDocument();
  expect(screen.getByText(/법률 판단은 사건의 구체적 사실관계/)).toBeInTheDocument();
});

it("does not show premium precedent CTA for safety results", () => {
  renderResultScreen(
    <ResultScreen
      result={{ ...result, safetyLevel: "caution" }}
      onRestart={vi.fn()}
    />,
  );

  expect(screen.queryByRole("button", { name: "990원 판례 판독 열기" })).not.toBeInTheDocument();
});
```

- [ ] **Step 2: Run focused test and verify failure**

Run:

```bash
npm test -- src/features/result/ResultScreen.test.tsx --run
```

Expected: FAIL because premium UI is not implemented.

- [ ] **Step 3: Add premium UI state and imports**

In `src/features/result/ResultScreen.tsx`, import:

```tsx
import { createPremiumProduct, requestPremiumVerdict } from "../premium/premiumAdapter";
import { precedentDisclaimer } from "../precedent/precedentAdapter";
```

Add state:

```tsx
const [premiumMessage, setPremiumMessage] = useState<string | null>(null);
const premiumProduct = createPremiumProduct();
```

Render below the reward section when `!isSafetyResult`:

```tsx
{!isSafetyResult ? (
  <section className="premium-panel" aria-labelledby="premium-title">
    <div>
      <p className="eyebrow">판례 근거는 나중에 서버로 연결</p>
      <h2 id="premium-title">{premiumProduct.title}</h2>
      <p>{premiumProduct.description}</p>
    </div>
    <button
      type="button"
      onClick={async () => {
        const paymentState = await requestPremiumVerdict();
        setPremiumMessage(paymentState.message);
      }}
    >
      990원 판례 판독 열기
    </button>
    {premiumMessage ? (
      <div className="premium-panel__status" role="status">
        <strong>{premiumMessage}</strong>
        <span>판례 검색 서버 연결 예정</span>
        <p>{precedentDisclaimer}</p>
      </div>
    ) : null}
  </section>
) : null}
```

- [ ] **Step 4: Add premium styles**

In `src/App.css`, add:

```css
.premium-panel {
  display: grid;
  gap: 12px;
  padding: 16px;
  border: 1px solid #d4e8ff;
  border-radius: 8px;
  background: #e8f3ff;
}

.premium-panel h2,
.premium-panel p {
  margin: 0;
}

.premium-panel h2 {
  color: #191f28;
  font-size: 20px;
  line-height: 1.3;
}

.premium-panel p {
  color: #4e5968;
  font-size: 14px;
  font-weight: 700;
  line-height: 1.45;
}

.premium-panel__status {
  display: grid;
  gap: 4px;
  padding: 12px;
  border-radius: 8px;
  background: #ffffff;
}

.premium-panel__status strong,
.premium-panel__status span {
  color: #191f28;
  font-size: 14px;
  font-weight: 800;
  line-height: 1.35;
}

.premium-panel__status p {
  color: #6b7684;
  font-size: 13px;
}
```

- [ ] **Step 5: Run focused test and commit**

Run:

```bash
npm test -- src/features/result/ResultScreen.test.tsx --run
```

Expected: PASS.

Commit:

```bash
git add src/features/result/ResultScreen.tsx src/features/result/ResultScreen.test.tsx src/App.css
git commit -m "feat: add premium precedent setup UI"
```

## Task 8: App Flow And Documentation Updates

**Files:**
- Modify: `src/App.test.tsx`
- Modify: `README.md`
- Modify: `docs/superpowers/specs/2026-05-20-miss-nozzang-v2-design.md` only if implementation decisions diverged from the approved spec.

- [ ] **Step 1: Update app integration tests**

In `src/App.test.tsx`, replace old brand/copy expectations:

```tsx
expect(screen.getByText("누가 잘못 AI")).toBeInTheDocument();
expect(screen.getByText("미스 노짱이 판독해드립니다")).toBeInTheDocument();
```

In the text flow test, after submit:

```tsx
expect(await screen.findByText("오늘의 판결")).toBeInTheDocument();
expect(screen.getByText("이긴 사람 보상 추천")).toBeInTheDocument();
expect(screen.getByRole("button", { name: "990원 판례 판독 열기" })).toBeInTheDocument();
```

- [ ] **Step 2: Update README**

Update `README.md` to include:

```md
# 누가 잘못 AI

미스 노짱이 대화 싸움을 무료로 판독해주는 Toss WebView 미니앱 MVP입니다.

## 가격/연동 정책

- 싸움 판독 자체는 무료입니다.
- AI, 서버, 판례 검색이 필요한 고급 판독은 990원 상품으로 연결할 예정입니다.
- 현재 버전은 실제 Toss 인앱결제, 판례 서버, Toss Shopping 딥링크를 호출하지 않고 어댑터와 UX만 제공합니다.

## 판례 데이터

`legalize-kr/precedent-kr`는 서버 인덱싱 대상으로 보고, 클라이언트 번들에 통째로 포함하지 않습니다. 앱은 향후 서버가 반환하는 유사 판례 제목, 법원/선고일자, 요약, 유사 이유, 출처 링크를 표시할 수 있는 구조를 갖습니다.

## 안전 문구

입력된 내용 기준의 재미용 판독이며 법률 자문이 아닙니다. 판례는 유사한 참고 자료이고, 실제 법률 판단은 사건의 구체적 사실관계에 따라 달라집니다.
```

- [ ] **Step 3: Run integration test and commit**

Run:

```bash
npm test -- src/App.test.tsx --run
```

Expected: PASS.

Commit:

```bash
git add src/App.test.tsx README.md docs/superpowers/specs/2026-05-20-miss-nozzang-v2-design.md
git commit -m "docs: update nuga wrong ai app flow"
```

## Task 9: Full Verification And gstack-Style Review

**Files:**
- No planned code edits unless verification reveals an issue.

- [ ] **Step 1: Run complete verification**

Run:

```bash
npm test -- --run
npm run lint
npx tsc -b --pretty false
npm run build
```

Expected:

- Vitest passes all test files.
- ESLint exits 0.
- TypeScript exits 0.
- Vite/Granite build exits 0. A large chunk warning from OCR/Tesseract is acceptable if unchanged from the existing MVP.

- [ ] **Step 2: Run local preview smoke check**

Run:

```bash
npm run dev -- --host 127.0.0.1
```

Open the printed local URL in the in-app Browser and verify:

- Home shows `누가 잘못 AI`, `미스 노짱이 판독해드립니다`, `990원 내면 판례까지 뒤져드립니다`.
- Mascot image renders and is not distorted.
- Text input flow reaches `판독 결과`.
- Reward recommendation maps `달달한 거` to `디저트/간식`.
- `990원 판례 판독 열기` opens the setup status and does not imply a real charge.
- Safety scenario still suppresses reward and premium UI.

- [ ] **Step 3: Perform gstack-style review**

Review the final diff against these checks:

- No real payment is triggered.
- No real Toss Shopping external navigation is triggered.
- `precedent-kr` data is not bundled.
- Safety results prioritize safety copy over reward shopping.
- Legal language says `유사 판례 참고`, not guaranteed legal judgment.
- Mobile text does not overflow cards or buttons.

- [ ] **Step 4: Final commit if fixes were needed**

If verification required fixes, commit them:

```bash
git add <fixed-files>
git commit -m "fix: polish nuga wrong ai v2"
```

If no fixes were needed, do not create an empty commit.

## Self-Review

- Spec coverage: The plan covers the approved app name `누가 잘못 AI`, the `미스 노짱이 판독해드립니다` subcopy, the reference-inspired character asset, the free verdict flow, the 990원 premium setup, the reward recommendation and Toss Shopping adapter boundary, the `precedent-kr` server-side boundary, and safety/legal disclaimers.
- Placeholder scan: The plan avoids implementation placeholders. Future integrations are intentionally represented by explicit `notConfigured` adapter states with exact UI copy.
- Type consistency: `RewardRecommendation`, `PremiumProduct`, `PremiumVerdictRequestResult`, and `PrecedentBasisResult` are defined before UI usage. The plan consistently uses `판독`, `오늘의 판결`, and `990원 판례 판독`.
- Risk notes: Generated image output may need one manual acceptance pass for style and cropping. Browser smoke testing is required because the asset and mobile layout are visual.
