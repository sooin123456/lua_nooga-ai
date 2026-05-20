# Red Report Motion UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply the approved red report motion UI to `누가 잘못 AI` while preserving all current input, verdict, reward, safety, and premium placeholder behavior.

**Architecture:** Keep the existing React feature structure and refactor only UI presentation components around home and result screens. Use CSS `transform` and `opacity` animations with `prefers-reduced-motion` fallbacks. Add small focused components for the red home hero and animated result presentation rather than changing analyzer or adapter logic.

**Tech Stack:** React, TypeScript, Vite, Vitest, Testing Library, Toss TDS Mobile, CSS animations.

---

## File Structure

- Create `src/features/input/MotionHomeHero.tsx`: red hero with Lua AI mascot, large background graphics, and approved home copy.
- Create `src/features/input/EvidenceMethodCard.tsx`: input card presentation component with stagger index.
- Modify `src/features/input/InputHome.tsx`: use new hero and card components.
- Modify `src/features/input/InputHome.test.tsx`: assert `사건을 접수해 주세요`, `루아 AI가 판독해드립니다`, four input cards.
- Modify `src/features/input/TextReview.tsx`: update subtitle to `판독 전에 증거 내용을 확인하고 고칠 수 있어요.`
- Modify `src/features/input/TextReview.test.tsx`: update copy assertion if needed.
- Create `src/features/result/AnimatedPercentBar.tsx`: accessible A/B percentage bar with CSS custom properties.
- Create `src/features/result/VerdictSummaryCard.tsx`: result hero card with one-shot gavel visual.
- Create `src/features/result/ResultReasonCard.tsx`: reason card with stagger index.
- Modify `src/features/result/ResultScreen.tsx`: use result components and keep reward/premium safety suppression.
- Modify `src/features/result/ResultScreen.test.tsx`: assert percentage bar accessible text and existing result behavior.
- Modify `src/App.css`: red home layout, motion utilities, result card/bar animations, reduced-motion override.
- Modify `src/App.test.tsx`: update home/result integration assertions.
- Modify `README.md`: mention red report motion UI.

## Task 1: Red Home Hero

**Files:**
- Create: `src/features/input/MotionHomeHero.tsx`
- Create: `src/features/input/EvidenceMethodCard.tsx`
- Modify: `src/features/input/InputHome.tsx`
- Modify: `src/features/input/InputHome.test.tsx`
- Modify: `src/App.css`

- [ ] **Step 1: Write failing home tests**

In `src/features/input/InputHome.test.tsx`, update the branding test:

```tsx
expect(screen.getByText("누가 잘못 AI")).toBeInTheDocument();
expect(screen.getByText("루아 AI가 판독해드립니다")).toBeInTheDocument();
expect(screen.getByText("사건을 접수해 주세요")).toBeInTheDocument();
expect(screen.getByText(/대화, 캡처, 녹음을 증거로 제출하면/)).toBeInTheDocument();
```

- [ ] **Step 2: Implement hero/card components**

Create `MotionHomeHero` with `home-hero-red`, `home-hero-red__graphic`, `home-hero-red__copy`, and `home-hero-red__orb` classes. Render `LuaAiMascot`, `AI`, `62`, and `990` as decorative graphics.

Create `EvidenceMethodCard` accepting `{ title, description, Icon, index, onClick }`, rendering a button with class `method-card method-card--evidence` and CSS variable `--stagger-index`.

- [ ] **Step 3: Wire InputHome**

Replace the old hero section with `<MotionHomeHero />` and render `EvidenceMethodCard` for the existing `inputMethods`.

- [ ] **Step 4: Add CSS**

Add red gradient home styling, larger Lua AI mascot on the home hero, decorative numbers, staggered card entrance, and reduced-motion override.

- [ ] **Step 5: Verify and commit**

Run:

```bash
npm test -- src/features/input/InputHome.test.tsx --run
```

Commit:

```bash
git add src/features/input src/App.css
git commit -m "feat: add red report home hero"
```

## Task 2: Evidence Review Copy

**Files:**
- Modify: `src/features/input/TextReview.tsx`
- Modify: `src/features/input/TextReview.test.tsx`

- [ ] **Step 1: Update copy**

Change the subtitle to:

```tsx
판독 전에 증거 내용을 확인하고 고칠 수 있어요.
```

- [ ] **Step 2: Verify and commit**

Run:

```bash
npm test -- src/features/input/TextReview.test.tsx --run
```

Commit:

```bash
git add src/features/input/TextReview.tsx src/features/input/TextReview.test.tsx
git commit -m "feat: tune evidence review copy"
```

## Task 3: Animated Result Report

**Files:**
- Create: `src/features/result/AnimatedPercentBar.tsx`
- Create: `src/features/result/VerdictSummaryCard.tsx`
- Create: `src/features/result/ResultReasonCard.tsx`
- Modify: `src/features/result/ResultScreen.tsx`
- Modify: `src/features/result/ResultScreen.test.tsx`
- Modify: `src/App.css`

- [ ] **Step 1: Write result tests**

Add assertions to `ResultScreen.test.tsx`:

```tsx
expect(screen.getByLabelText("A 62%, B 38%")).toBeInTheDocument();
expect(screen.getByText("증거 1")).toBeInTheDocument();
expect(screen.getByText("증거 2")).toBeInTheDocument();
expect(screen.getByText("증거 3")).toBeInTheDocument();
```

- [ ] **Step 2: Add components**

`AnimatedPercentBar` renders `.animated-percent-bar` with CSS variables `--party-a` and `--party-b`, plus visible labels.

`VerdictSummaryCard` renders `오늘의 판결`, verdict, a small Lua AI judge/gavel visual, and uses `.verdict-summary-card`.

`ResultReasonCard` renders `증거 N` and the reason text with CSS variable `--stagger-index`.

- [ ] **Step 3: Wire ResultScreen**

Replace the old result verdict and percentage blocks with the new components. Keep reward and premium behavior unchanged and hidden for safety results.

- [ ] **Step 4: Add CSS**

Add result card entrance, percent bar fill animation, reason card stagger, one-shot gavel motion, and reduced-motion overrides.

- [ ] **Step 5: Verify and commit**

Run:

```bash
npm test -- src/features/result/ResultScreen.test.tsx --run
```

Commit:

```bash
git add src/features/result src/App.css
git commit -m "feat: add animated result report"
```

## Task 4: Integration And Verification

**Files:**
- Modify: `src/App.test.tsx`
- Modify: `README.md`

- [ ] **Step 1: Update integration assertions**

Assert the app flow sees `사건을 접수해 주세요`, `오늘의 판결`, reward recommendation, and `결제 없이 판례 판독 미리보기`.

- [ ] **Step 2: Update README**

Add one sentence that the app uses a red report motion UI with reduced-motion support.

- [ ] **Step 3: Full verification**

Run:

```bash
npm test -- --run
npm run lint
npx tsc -b --pretty false
npm run build
```

Expected: all pass, with only the existing Tesseract large chunk warning.

- [ ] **Step 4: Browser smoke**

Open the local dev server and verify home, text flow, animated result, reward, and premium status. If screenshot capture fails, DOM verification is acceptable.

- [ ] **Step 5: Commit**

```bash
git add src/App.test.tsx README.md
git commit -m "docs: document red report motion ui"
```

## Self-Review

- Spec coverage: The plan implements red home visuals, C-style result report motion, Lua AI naming, reduced-motion support, preserved feature behavior, and safety suppression.
- Placeholder scan: No placeholders or unspecified tasks remain.
- Type consistency: Component names and props are defined before usage and match existing feature paths.
