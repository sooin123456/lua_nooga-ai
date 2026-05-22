# Lua AI UX Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tighten the home, room, Hot Battle, result sharing, reward, and evidence review flows into a more complete Toss mini app experience.

**Architecture:** Keep the current React screen components and route state. Add focused UI states inside `InputHome`, `RoomScreen`, `ResultScreen`, `RewardChatScreen`, and `TextReview` without introducing new server dependencies.

**Tech Stack:** React, TypeScript, Vite/Granite, Vitest, Testing Library, TDS Mobile, Apps in Toss `openURL`, existing CSS.

---

### Task 1: Home, Hot Battle, Recent, and Random Reward Entry

**Files:**
- Modify: `src/features/input/InputHome.tsx`
- Modify: `src/features/input/InputHome.test.tsx`
- Modify: `src/App.css`

- [ ] Add a full-height home layout.
- [ ] Add a random Toss shopping recommendation card labelled `루아가 직접 화해의 상품을 추천해요`.
- [ ] Make Hot Battle open a separate list page with `Top 3` and a lower list.
- [ ] Make Recent open a real recent page state instead of only scrolling to a card.

### Task 2: Judgment Room Step Flow

**Files:**
- Modify: `src/features/rooms/RoomScreen.tsx`
- Modify: `src/features/rooms/RoomScreen.test.tsx`
- Modify: `src/App.css`

- [ ] Show nickname entry first.
- [ ] Show invite-link state before chat when only one participant is present.
- [ ] Style active chat like a compact Telegram-style room.

### Task 3: Result Screen Polish

**Files:**
- Modify: `src/features/result/ResultScreen.tsx`
- Modify: `src/features/result/ResultScreen.test.tsx`
- Modify: `src/features/result/AnimatedPercentBar.tsx`
- Modify: `src/App.css`

- [ ] Remove visible `판례`/`판결` boxes from the percent effect.
- [ ] Split share into `카톡 보내기`, `텔레그램 보내기`, and `링크 보내기`.

### Task 4: Reward Consultation Polish

**Files:**
- Modify: `src/features/rewards/rewardAdapter.ts`
- Modify: `src/features/rewards/rewardAdapter.test.ts`
- Modify: `src/features/rewards/RewardChatScreen.tsx`
- Modify: `src/features/rewards/RewardChatScreen.test.tsx`
- Modify: `src/App.css`

- [ ] Recommend actual product-like Toss shopping candidates by matched category.
- [ ] Keep all three recommendations in the current blame tier price band.
- [ ] Fix action button sizing.

### Task 5: Evidence Review Copy

**Files:**
- Modify: `src/features/input/TextReview.tsx`
- Modify: `src/features/input/TextReview.test.tsx`
- Modify: `src/App.css`

- [ ] Replace unclear `1 증거 2 확인 3 판독` pills with a clearer analysis-progress explanation.

### Task 6: Verification

- [ ] Run focused tests.
- [ ] Run `npm test`, `npm run lint`, and `npm run vercel-build`.
- [ ] Smoke check local UI.
