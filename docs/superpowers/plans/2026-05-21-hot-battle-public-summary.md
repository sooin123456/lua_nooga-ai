# Hot Battle Public Summary Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Save Hot Battle/shared results with server-generated public title, issue summary, and anonymized dialogue summary instead of relying only on client-side result fields.

**Architecture:** Add a Vercel API route that takes the original judgment result and optional source text, asks OpenAI for public-safe summary JSON, normalizes it, and returns a `JudgmentResult` shape. Update the result share service so `createSharedResult` can receive `sourceText`, call the summary endpoint before Supabase RPC storage, and keep local/share fallback usable when the endpoint is unavailable.

**Tech Stack:** React, TypeScript, Vite/Vitest, Vercel API routes, OpenAI Responses API, Supabase RPC.

---

### Task 1: Public Summary API

**Files:**
- Create: `api/ai/public-summary.js`
- Create: `api/ai/public-summary.test.mjs`

- [ ] Add endpoint tests for successful summary, empty result rejection, long text rejection, and AI failure.
- [ ] Implement the endpoint with strict JSON parsing and `normalizeJudgmentResult`.
- [ ] Run `node --test api/ai/public-summary.test.mjs`.
- [ ] Commit.

### Task 2: Share Service Integration

**Files:**
- Modify: `src/features/resultShare/types.ts`
- Modify: `src/features/resultShare/resultShareAdapter.ts`
- Modify: `src/features/resultShare/resultShareAdapter.test.ts`
- Modify: `src/features/result/ResultScreen.tsx`
- Modify: `src/features/result/ResultScreen.test.tsx`

- [ ] Let `createSharedResult` accept `{ result, sourceText }` through a backwards-compatible optional parameter.
- [ ] Add a client helper that calls `/api/ai/public-summary` and falls back to the current result if unavailable.
- [ ] Pass `sourceText` from `ResultScreen` when creating a shared result.
- [ ] Verify Supabase RPC receives summary result JSON and never receives raw `sourceText`.
- [ ] Run focused result share/result screen tests.
- [ ] Commit.

### Task 3: Verification

**Files:**
- No direct source edits unless verification exposes a bug.

- [ ] Run `npm test -- --run`.
- [ ] Run `npm run lint`.
- [ ] Run `npm run vercel-build`.
- [ ] Document any remaining limitations.
