# Precedent AI Judgment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the 990원 objection flow so a paid user can receive an AI judgment grounded in similar precedents.

**Architecture:** Add a Vercel API route that verifies the precedent entitlement, searches bundled precedent data, asks OpenAI to generate a precedent-based judgment report, and returns structured JSON. Wire the result screen consent button to Toss IAP, entitlement issuance, precedent AI analysis, and a dedicated result screen.

**Tech Stack:** React, TypeScript, Vite/Vitest, Vercel API routes, OpenAI Responses API, Apps in Toss IAP, bundled precedent search JSON.

---

### Task 1: Server Precedent AI Endpoint

**Files:**
- Create: `api/ai/precedent-judgment.js`
- Create: `api/ai/precedent-judgment.test.mjs`

- [ ] Write endpoint tests for method guard, entitlement rejection, input validation, normalized precedent report, and OpenAI failure.
- [ ] Implement entitlement verification, local precedent search, OpenAI JSON parsing, and safe response normalization.
- [ ] Run `node --test api/ai/precedent-judgment.test.mjs`.
- [ ] Commit with `feat: add precedent ai judgment api`.

### Task 2: Frontend Adapter and Result Types

**Files:**
- Create: `src/features/precedent/precedentJudgmentAdapter.ts`
- Create: `src/features/precedent/precedentJudgmentAdapter.test.ts`

- [ ] Add `requestPrecedentJudgment` that posts text, original result, and entitlement token to `/api/ai/precedent-judgment`.
- [ ] Return `ready`, `notConfigured`, or `failed` states with user-facing Korean messages.
- [ ] Run `npm test -- src/features/precedent/precedentJudgmentAdapter.test.ts --run`.
- [ ] Commit with `feat: add precedent judgment adapter`.

### Task 3: Paid Flow Screen Wiring

**Files:**
- Modify: `src/features/result/ResultScreen.tsx`
- Modify: `src/features/result/ResultScreen.test.tsx`
- Modify: `src/App.tsx`
- Modify: `src/App.test.tsx`
- Create: `src/features/precedent/PrecedentJudgmentScreen.tsx`
- Create: `src/features/precedent/PrecedentJudgmentScreen.test.tsx`

- [ ] Add an `onRequestPrecedentJudgment` prop to `ResultScreen` and make the consent button call it.
- [ ] In `App.tsx`, execute Toss IAP, request entitlement, request precedent AI judgment, then route to `precedent-result`.
- [ ] Add loading and error status messages inside the confirmation panel.
- [ ] Render precedent result with final judgment, precedent basis cards, issues, rebuttal points, reconciliation advice, and legal disclaimer.
- [ ] Run focused app/result/precedent tests.
- [ ] Commit with `feat: wire paid precedent judgment flow`.

### Task 4: Verification

**Files:**
- No direct source edits unless verification exposes a bug.

- [ ] Run `npm test -- --run`.
- [ ] Run `npm run lint`.
- [ ] Run `npm run vercel-build`.
- [ ] Record remaining non-blocking notes for the next feature slice.
