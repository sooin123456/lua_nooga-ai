# Lua AI Detail UX Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade the first-visit intro and all post-home detail flows while preserving the current home dashboard.

**Architecture:** Keep `InputHome` as the unchanged feature hub. Add focused components for first-visit intro, result actions/comments, reward recommendation cards, hot Battle detail, room states, and precedent confirmation so each screen has a single purpose and can be tested independently.

**Tech Stack:** React, TypeScript, Vite/Granite/AIT, Vitest, Testing Library, TDS Mobile, lucide-react, CSS animations, existing Supabase/result/room/precedent adapters.

---

## File Structure

- Modify `src/App.tsx`: route first-visit intro before home, wire detail flow transitions, keep existing back guard.
- Modify `src/App.test.tsx`: app-level flow tests for first visit, result actions, reward, hot Battle, room, and precedent.
- Modify `src/App.css`: shared detail page styling, fixed result actions, intro court show, reward cards, board comments, room states, precedent confirmation.
- Modify `src/features/input/IntroScreen.tsx`: turn the current intro into first-visit court show if it is already close enough, or keep API stable and update content.
- Modify `src/features/result/ResultScreen.tsx`: split result hierarchy into verdict, reasons, advice, primary actions, board comments, and folded precedent CTA.
- Modify `src/features/result/ResultScreen.test.tsx`: component tests for result layout and CTA behavior.
- Modify `src/features/rewards/RewardChatScreen.tsx`: simplify into Lua reward consultation and Toss-shopping-style recommendations.
- Modify `src/features/rewards/rewardAdapter.ts`: enforce percent-based price bands and candidate tones.
- Modify `src/features/rewards/RewardChatScreen.test.tsx` and `src/features/rewards/rewardAdapter.test.ts`: reward UX and price band tests.
- Modify `src/features/input/InputHome.tsx`: keep home dashboard cards and tabbar behavior unchanged; reorder only the selected hot Battle detail branch.
- Modify `src/features/input/InputHome.test.tsx`: hot Battle detail order, comment board, and privacy text tests.
- Modify `src/features/rooms/RoomScreen.tsx`: improve room invite, waiting, spectator, countdown, and exploded transition UI.
- Modify `src/features/rooms/RoomScreen.test.tsx`: room state tests.
- Modify `src/features/precedent/precedentEntitlementAdapter.ts`: keep API, ensure consent/entitlement state supports confirmation screen.
- Modify `src/features/precedent/precedentEntitlementAdapter.test.ts`: entitlement behavior tests.

---

### Task 1: First-Visit Lua Court Intro

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/features/input/IntroScreen.tsx`
- Modify: `src/App.test.tsx`
- Modify: `src/App.css`

- [ ] **Step 1: Write failing tests for first-visit intro routing**

Add these tests to `src/App.test.tsx`.

```tsx
it("shows the Lua court intro only before the first home visit", async () => {
  localStorage.clear();
  render(<App />);

  expect(screen.getByText(/증거를 제출하세요/)).toBeInTheDocument();

  await userEvent.click(screen.getByRole("button", { name: "판정 시작하기" }));

  expect(screen.getByText("루아 AI")).toBeInTheDocument();
  expect(localStorage.getItem("lua-nooga-intro-complete")).toBe("true");
});

it("skips the Lua court intro after the first visit is complete", () => {
  localStorage.setItem("lua-nooga-intro-complete", "true");

  render(<App />);

  expect(screen.queryByText(/증거를 제출하세요/)).not.toBeInTheDocument();
  expect(screen.getByText("루아 AI")).toBeInTheDocument();
});
```

- [ ] **Step 2: Run tests and verify failure**

Run:

```bash
npm test -- src/App.test.tsx -t "Lua court intro"
```

Expected: tests fail because the intro completion key and new copy do not exist yet.

- [ ] **Step 3: Implement first-visit state in `src/App.tsx`**

Add a storage key and update initial state logic.

```tsx
const introCompleteStorageKey = "lua-nooga-intro-complete";

function hasCompletedIntro() {
  if (typeof window === "undefined") {
    return false;
  }

  return window.localStorage.getItem(introCompleteStorageKey) === "true";
}

function markIntroComplete() {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(introCompleteStorageKey, "true");
  } catch {
    // Intro persistence is non-critical; still allow app entry.
  }
}
```

Update `createInitialState()` so it returns `{ screen: "home" }` when no room/shared-result query exists and `hasCompletedIntro()` is true. Keep `{ screen: "intro" }` when first visit is incomplete.

Update the intro button handler:

```tsx
const enterHomeFromIntro = () => {
  markIntroComplete();
  setState({ screen: "home" });
};
```

Pass `enterHomeFromIntro` to `IntroScreen`.

- [ ] **Step 4: Update `IntroScreen` copy and motion hooks**

Ensure `src/features/input/IntroScreen.tsx` includes the approved first-visit text and button.

```tsx
<h1>루아 법정에 오신 걸 환영해요</h1>
<p>증거를 제출하세요. 누가 선 넘었는지 루아가 판독해드릴게요.</p>
<button type="button" onClick={onStart}>
  판정 시작하기
</button>
```

Keep the existing Lua mascot and court background if already present. Do not add input cards to the intro.

- [ ] **Step 5: Add intro CSS**

In `src/App.css`, ensure the intro is cinematic but short.

```css
.screen--intro {
  min-height: 100vh;
  overflow: hidden;
}

.intro-start-button {
  min-height: 56px;
}

.home-hero-red__mascot {
  animation:
    red-hero-mascot-in 520ms cubic-bezier(0.2, 0.9, 0.2, 1) both,
    lua-hero-float 3.8s ease-in-out 620ms infinite;
}
```

- [ ] **Step 6: Verify and commit**

Run:

```bash
npm test -- src/App.test.tsx -t "Lua court intro"
npm run lint
```

Expected: tests and lint pass.

Commit:

```bash
git add src/App.tsx src/App.test.tsx src/features/input/IntroScreen.tsx src/App.css
git commit -m "feat: show lua court intro on first visit"
```

---

### Task 2: Result Detail Hierarchy and Primary Actions

**Files:**
- Modify: `src/features/result/ResultScreen.tsx`
- Modify: `src/features/result/ResultScreen.test.tsx`
- Modify: `src/App.css`

- [ ] **Step 1: Write failing result layout tests**

Add to `src/features/result/ResultScreen.test.tsx`.

```tsx
it("shows verdict, reasons, advice, and two primary actions before comments", () => {
  render(
    <ResultScreen
      result={normalResult}
      onRestart={vi.fn()}
      onOpenRewardChat={vi.fn()}
      resultShareService={null}
    />,
  );

  expect(screen.getByText("오늘의 판정")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "보상받기" })).toHaveClass(
    "result-primary-action--reward",
  );
  expect(screen.getByRole("button", { name: "다시 판독하기" })).toBeInTheDocument();
  expect(screen.getByText("댓글쓰기")).toBeInTheDocument();
});

it("keeps precedent analysis folded behind a red objection CTA", () => {
  render(
    <ResultScreen
      result={normalResult}
      onRestart={vi.fn()}
      onOpenRewardChat={vi.fn()}
      resultShareService={null}
    />,
  );

  expect(
    screen.getByRole("button", { name: /억울하면 유사 판례로 한 번 더 따져보기/ }),
  ).toHaveClass("result-objection-cta");
  expect(screen.queryByText("990원 결제 후")).not.toBeInTheDocument();
});
```

- [ ] **Step 2: Run tests and verify failure**

Run:

```bash
npm test -- src/features/result/ResultScreen.test.tsx -t "primary actions|precedent analysis"
```

Expected: tests fail because classes/section names are not fully aligned.

- [ ] **Step 3: Update result content order**

In `ResultScreen.tsx`, keep the existing verdict card and reason/advice sections, but label the summary block `오늘의 판정`.

Use this primary action structure after the disclaimer:

```tsx
<div className="result-primary-actions" aria-label="다음 행동">
  {!isSafetyResult ? (
    <Button
      className="result-primary-action result-primary-action--reward"
      type="button"
      onClick={onOpenRewardChat}
      disabled={!onOpenRewardChat}
    >
      보상받기
    </Button>
  ) : null}
  <Button
    className="result-primary-action result-primary-action--restart"
    type="button"
    onClick={onRestart}
  >
    다시 판독하기
  </Button>
</div>
```

- [ ] **Step 4: Convert reactions into board comments**

Replace reaction tabs with one board-style section:

```tsx
<section className="result-comments-board" aria-label="판정 댓글">
  <div className="result-comments-board__title-row">
    <h2>
      <strong>{comments.length}</strong>개의 댓글
    </h2>
    <button type="button" onClick={handleLike} className={hasLiked ? "is-liked" : ""}>
      선넘었어요 {likeCount}
    </button>
  </div>
  <h3>댓글쓰기</h3>
  <form className="result-comment-form" onSubmit={handleCommentSubmit}>
    <textarea
      aria-label="판정 댓글"
      value={commentDraft}
      placeholder="타인을 배려하는 마음을 담아 댓글을 남겨주세요."
      onChange={(event) => setCommentDraft(event.currentTarget.value)}
    />
    <button type="submit" disabled={commentDraft.trim().length === 0 || isReactionPending}>
      등록
    </button>
  </form>
  <ol className="result-comments">
    {comments.map((comment) => (
      <li key={comment.id}>
        <p>{comment.body}</p>
      </li>
    ))}
  </ol>
  <button className="result-share-button" type="button" onClick={handleShare}>
    판정 공유하기
  </button>
</section>
```

- [ ] **Step 5: Add folded red precedent CTA placeholder**

If the existing precedent panel is removed, add a folded CTA only:

```tsx
{!isSafetyResult ? (
  <button className="result-objection-cta" type="button">
    억울하면 유사 판례로 한 번 더 따져보기
  </button>
) : null}
```

The confirmation flow is completed in Task 6.

- [ ] **Step 6: Add CSS for priority**

In `src/App.css`:

```css
.result-primary-actions {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.result-primary-action--reward {
  background: linear-gradient(135deg, #ffd36a, #c78500) !important;
  color: #191f28 !important;
}

.result-objection-cta {
  min-height: 52px;
  border: 0;
  border-radius: 12px;
  background: linear-gradient(135deg, #f04452, #b42333);
  color: #ffffff;
  font: inherit;
  font-weight: 1000;
}
```

- [ ] **Step 7: Verify and commit**

Run:

```bash
npm test -- src/features/result/ResultScreen.test.tsx
npm test -- src/App.test.tsx -t "shows free verdict result"
npm run lint
```

Expected: result tests pass; app result flow still passes.

Commit:

```bash
git add src/features/result/ResultScreen.tsx src/features/result/ResultScreen.test.tsx src/App.css src/App.test.tsx
git commit -m "feat: refine result detail actions"
```

---

### Task 3: Lua Reward Consultation

**Files:**
- Modify: `src/features/rewards/rewardAdapter.ts`
- Modify: `src/features/rewards/rewardAdapter.test.ts`
- Modify: `src/features/rewards/RewardChatScreen.tsx`
- Modify: `src/features/rewards/RewardChatScreen.test.tsx`
- Modify: `src/App.css`

- [ ] **Step 1: Write failing price band tests**

Add to `src/features/rewards/rewardAdapter.test.ts`.

```ts
it("uses a 5,000 won range for light blame", () => {
  const recommendation = createRewardChatRecommendation({
    wish: "달달한 거",
    partyAPercent: 55,
    partyBPercent: 45,
  });

  expect(recommendation.severityLabel).toContain("가벼운");
  expect(recommendation.candidates[0].priceHint).toContain("5천원");
});

it("uses a 10,000 to 20,000 won range for medium blame", () => {
  const recommendation = createRewardChatRecommendation({
    wish: "커피",
    partyAPercent: 72,
    partyBPercent: 28,
  });

  expect(recommendation.severityLabel).toContain("적정");
  expect(recommendation.candidates[1].priceHint).toMatch(/1~2만원|1만원|2만원/);
});

it("uses a 30,000 won plus range for severe blame", () => {
  const recommendation = createRewardChatRecommendation({
    wish: "귀여운 거",
    partyAPercent: 12,
    partyBPercent: 88,
  });

  expect(recommendation.severityLabel).toContain("확실한");
  expect(recommendation.candidates[2].priceHint).toContain("3만원");
});
```

- [ ] **Step 2: Run tests and verify failure**

Run:

```bash
npm test -- src/features/rewards/rewardAdapter.test.ts
```

Expected: at least one new price band assertion fails if current wording differs.

- [ ] **Step 3: Implement explicit price band mapping**

In `rewardAdapter.ts`, add:

```ts
function getRewardPriceBand(blamePercent: number) {
  if (blamePercent >= 80) {
    return {
      severityLabel: "확실한 사과가 필요한 판정",
      prices: ["1~2만원대", "3만원대", "3만원 이상"],
    };
  }

  if (blamePercent >= 60) {
    return {
      severityLabel: "적정 보상이 어울리는 판정",
      prices: ["5천원대", "1~2만원대", "2만원대"],
    };
  }

  return {
    severityLabel: "가벼운 사과로 충분한 판정",
    prices: ["5천원대", "5천원대", "1만원 이하"],
  };
}
```

Use this function inside `createRewardChatRecommendation`.

- [ ] **Step 4: Write failing screen tests for simplified reward UX**

Add to `RewardChatScreen.test.tsx`.

```tsx
it("shows Lua consultation copy and a home button before recommendation", () => {
  render(<RewardChatScreen result={result} onBack={vi.fn()} onHome={vi.fn()} />);

  expect(screen.getByText("루아 보상 상담소")).toBeInTheDocument();
  expect(screen.getByText(/보상 후보를 골라볼게요/)).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "홈으로 돌아가기" })).toBeInTheDocument();
});

it("shows Toss-shopping-style reward cards after entering a wish", async () => {
  const user = userEvent.setup();
  render(<RewardChatScreen result={result} onBack={vi.fn()} onHome={vi.fn()} />);

  await user.type(screen.getByRole("textbox", { name: "받고 싶은 보상" }), "달달한 거");
  await user.click(screen.getByRole("button", { name: "루아에게 골라달라 하기" }));

  expect(screen.getByText("잘못 정도별 토스 상품 추천")).toBeInTheDocument();
  expect(screen.getAllByText("토스 상품 추천")).toHaveLength(3);
  expect(screen.queryByText("문자 메시지 작성")).not.toBeInTheDocument();
});
```

- [ ] **Step 5: Run tests and verify failure**

Run:

```bash
npm test -- src/features/rewards/RewardChatScreen.test.tsx
```

Expected: tests fail if old wording or containers remain.

- [ ] **Step 6: Update reward screen markup**

Keep the existing state and share handler. Ensure the result cards use:

```tsx
<section className="reward-chat-result" aria-label="루아 추천 결과">
  <div className="reward-composer-heading">
    <strong>잘못 정도별 토스 상품 추천</strong>
    <button type="button" onClick={() => setRecommendation(null)}>
      닫기
    </button>
  </div>
  <ol className="reward-candidate-list">
    {recommendation.candidates.map((candidate, index) => (
      <li className="reward-candidate-card" key={candidate.tone}>
        <label>
          <input
            aria-label={`${candidate.tone} 선택`}
            type="checkbox"
            checked={selectedTones.includes(candidate.tone)}
            onChange={() => toggleCandidate(candidate.tone)}
          />
          <span className="reward-candidate-card__source">토스 상품 추천</span>
          <span className="reward-candidate-card__tone">{candidate.tone}</span>
          <strong>{candidate.title}</strong>
          <em>{candidate.priceHint}</em>
        </label>
      </li>
    ))}
  </ol>
</section>
```

- [ ] **Step 7: Verify and commit**

Run:

```bash
npm test -- src/features/rewards
npm run lint
```

Expected: reward adapter and screen tests pass.

Commit:

```bash
git add src/features/rewards src/App.css
git commit -m "feat: refine reward consultation flow"
```

---

### Task 4: Hot Battle Detail Board

**Files:**
- Modify: `src/features/input/InputHome.tsx`
- Modify: `src/features/input/InputHome.test.tsx`
- Modify: `src/App.css`

- [ ] **Step 1: Write failing detail order test**

Add to `InputHome.test.tsx`.

```tsx
it("shows hot Battle detail in conversation, verdict, comments order", async () => {
  const user = userEvent.setup();

  render(
    <InputHome
      resultShareService={null}
      onCreateRoom={vi.fn()}
      onSelect={vi.fn()}
    />,
  );

  await user.click(screen.getByRole("button", { name: "핫 Battle" }));
  await user.click(screen.getAllByRole("button", { name: "댓글달기" })[0]);

  const conversation = screen.getByRole("heading", { name: "대화 내용" });
  const verdict = screen.getByRole("heading", { name: "루아 판정" });
  const comments = screen.getByRole("heading", { name: "댓글쓰기" });

  expect(
    conversation.compareDocumentPosition(verdict) & Node.DOCUMENT_POSITION_FOLLOWING,
  ).toBeTruthy();
  expect(
    verdict.compareDocumentPosition(comments) & Node.DOCUMENT_POSITION_FOLLOWING,
  ).toBeTruthy();
});
```

- [ ] **Step 2: Run test and verify failure**

Run:

```bash
npm test -- src/features/input/InputHome.test.tsx -t "conversation, verdict, comments"
```

Expected: fails if current order is verdict before conversation or heading labels differ.

- [ ] **Step 3: Reorder selected Battle detail markup**

In the selected battle branch of `InputHome.tsx`, order sections as:

```tsx
<article className="home-battle-detail home-battle-detail--summary">
  <span className="home-leaderboard__rank">{selectedBattle.rank}위</span>
  <strong>{selectedBattle.title}</strong>
  <div className="home-battle-detail__meta">
    <span>댓글 {commentCounts[selectedBattle.id]}</span>
    <span>좋아요 {selectedBattle.likes}</span>
  </div>
</article>

<section className="home-battle-transcript" aria-label="대화 내용">
  <h2>대화 내용</h2>
  <ol>{/* existing conversation lines */}</ol>
</section>

<article className="home-battle-detail">
  <h2>루아 판정</h2>
  <strong>{selectedBattle.verdict}</strong>
  <p>{selectedBattle.summary}</p>
</article>

<section className="home-battle-comments" aria-label="댓글">
  <h2>댓글쓰기</h2>
  {/* existing form and comments */}
</section>
```

- [ ] **Step 4: Add privacy hint**

Add a small note in detail:

```tsx
<p className="home-battle-privacy-note">
  공개 Battle은 개인정보를 제외한 익명 요약으로 보여줘요.
</p>
```

- [ ] **Step 5: Verify and commit**

Run:

```bash
npm test -- src/features/input/InputHome.test.tsx
npm run lint
```

Expected: input home tests pass.

Commit:

```bash
git add src/features/input/InputHome.tsx src/features/input/InputHome.test.tsx src/App.css
git commit -m "feat: reorder hot battle detail"
```

---

### Task 5: 60-Second Room State Polish

**Files:**
- Modify: `src/features/rooms/RoomScreen.tsx`
- Modify: `src/features/rooms/RoomScreen.test.tsx`
- Modify: `src/App.css`

- [ ] **Step 1: Write failing room UX tests**

Add to `RoomScreen.test.tsx`.

```tsx
it("shows waiting copy until both A and B have entered", () => {
  render(
    <RoomScreen
      room={{ ...room, startedAt: null }}
      messages={[]}
      participants={[{ ...participant, role: "A", nickname: "루아" }]}
      currentParticipant={participant}
      remainingSeconds={60}
      isLoading={false}
      isExploding={false}
      errorMessage={null}
      onBack={vi.fn()}
      onExplodeNow={vi.fn()}
      onJoinRoom={vi.fn()}
      onSendMessage={vi.fn()}
    />,
  );

  expect(screen.getByText(/A와 B가 모두 입장하면/)).toBeInTheDocument();
  expect(screen.getByText("대기")).toBeInTheDocument();
});

it("shows read-only spectator state", () => {
  render(
    <RoomScreen
      room={room}
      messages={[]}
      participants={[participant, { ...participant, id: "p2", role: "spectator" }]}
      currentParticipant={{ ...participant, id: "p2", role: "spectator" }}
      remainingSeconds={42}
      isLoading={false}
      isExploding={false}
      errorMessage={null}
      onBack={vi.fn()}
      onExplodeNow={vi.fn()}
      onJoinRoom={vi.fn()}
      onSendMessage={vi.fn()}
    />,
  );

  expect(screen.getByText("관전 중이에요")).toBeInTheDocument();
  expect(screen.getByRole("textbox", { name: "판정방 메시지" })).toBeDisabled();
});
```

- [ ] **Step 2: Run tests and verify failure**

Run:

```bash
npm test -- src/features/rooms/RoomScreen.test.tsx
```

Expected: spectator/waiting copy assertions fail if exact UI is missing.

- [ ] **Step 3: Add room state copy and spectator banner**

In `RoomScreen.tsx`, add:

```tsx
{isSpectator ? (
  <p className="room-spectator-note">관전 중이에요. 결과가 나온 뒤 댓글로 참여할 수 있어요.</p>
) : null}
```

Keep `canChat` false for spectators. Keep countdown logic based on `room.startedAt`.

- [ ] **Step 4: Add dramatic hot countdown copy**

When `remainingSeconds <= 5`, show:

```tsx
{isCountdownStarted && remainingSeconds <= 5 ? (
  <p className="room-countdown-warning">루아가 망치를 들었어요.</p>
) : null}
```

- [ ] **Step 5: Add CSS**

```css
.room-spectator-note,
.room-countdown-warning {
  margin: 0;
  padding: 10px 12px;
  border-radius: 12px;
  background: #fff6d8;
  color: #8b5b00;
  font-size: 13px;
  font-weight: 900;
}

.room-countdown-warning {
  background: #fff0f1;
  color: #b42333;
}
```

- [ ] **Step 6: Verify and commit**

Run:

```bash
npm test -- src/features/rooms/RoomScreen.test.tsx
npm run lint
```

Expected: room tests pass.

Commit:

```bash
git add src/features/rooms/RoomScreen.tsx src/features/rooms/RoomScreen.test.tsx src/App.css
git commit -m "feat: polish judgment room states"
```

---

### Task 6: Precedent Objection Confirmation

**Files:**
- Modify: `src/features/result/ResultScreen.tsx`
- Modify: `src/features/result/ResultScreen.test.tsx`
- Modify: `src/features/precedent/precedentEntitlementAdapter.ts`
- Modify: `src/features/precedent/precedentEntitlementAdapter.test.ts`
- Modify: `src/App.css`

- [ ] **Step 1: Write failing confirmation tests**

Add to `ResultScreen.test.tsx`.

```tsx
it("opens precedent confirmation from the red objection CTA", async () => {
  const user = userEvent.setup();
  render(
    <ResultScreen
      result={normalResult}
      sourceText="A: 늦었어\nB: 미안"
      onRestart={vi.fn()}
      onOpenRewardChat={vi.fn()}
      resultShareService={null}
    />,
  );

  await user.click(
    screen.getByRole("button", { name: /억울하면 유사 판례로 한 번 더 따져보기/ }),
  );

  expect(screen.getByText("990원")).toBeInTheDocument();
  expect(screen.getByText(/판독 대화 텍스트/)).toBeInTheDocument();
  expect(screen.getByText(/법률 상담이 아닌 참고용 분석/)).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "동의하고 분석하기" })).toBeDisabled();
});

it("enables precedent analysis only after consent", async () => {
  const user = userEvent.setup();
  render(
    <ResultScreen
      result={normalResult}
      sourceText="A: 늦었어\nB: 미안"
      onRestart={vi.fn()}
      onOpenRewardChat={vi.fn()}
      resultShareService={null}
    />,
  );

  await user.click(
    screen.getByRole("button", { name: /억울하면 유사 판례로 한 번 더 따져보기/ }),
  );
  await user.click(screen.getByRole("checkbox", { name: /서버 전송과 참고용 분석에 동의/ }));

  expect(screen.getByRole("button", { name: "동의하고 분석하기" })).toBeEnabled();
});
```

- [ ] **Step 2: Run tests and verify failure**

Run:

```bash
npm test -- src/features/result/ResultScreen.test.tsx -t "precedent"
```

Expected: tests fail because confirmation UI does not exist.

- [ ] **Step 3: Add local confirmation state**

In `ResultScreen.tsx`:

```tsx
const [isPrecedentConfirmOpen, setIsPrecedentConfirmOpen] = useState(false);
const [hasPrecedentConsent, setHasPrecedentConsent] = useState(false);
```

Render confirmation after CTA:

```tsx
<button
  className="result-objection-cta"
  type="button"
  onClick={() => setIsPrecedentConfirmOpen((isOpen) => !isOpen)}
>
  억울하면 유사 판례로 한 번 더 따져보기
</button>

{isPrecedentConfirmOpen ? (
  <section className="precedent-confirm" aria-label="판례 분석 결제 전 확인">
    <strong>990원</strong>
    <p>판독 대화 텍스트를 서버로 보내 유사 판례를 참고해 한 번 더 분석해요.</p>
    <p>실제 법률 상담이 아닌 참고용 분석이에요. 유사 판례가 없을 수도 있어요.</p>
    <label>
      <input
        type="checkbox"
        checked={hasPrecedentConsent}
        onChange={(event) => setHasPrecedentConsent(event.currentTarget.checked)}
      />
      서버 전송과 참고용 분석에 동의합니다.
    </label>
    <button type="button" disabled={!hasPrecedentConsent}>
      동의하고 분석하기
    </button>
  </section>
) : null}
```

- [ ] **Step 4: Add CSS**

```css
.precedent-confirm {
  display: grid;
  gap: 10px;
  padding: 14px;
  border: 1px solid #ffd1d6;
  border-radius: 14px;
  background: #fff0f1;
}

.precedent-confirm strong {
  color: #b42333;
  font-size: 20px;
  font-weight: 1000;
}

.precedent-confirm button:disabled {
  opacity: 0.45;
}
```

- [ ] **Step 5: Verify and commit**

Run:

```bash
npm test -- src/features/result/ResultScreen.test.tsx
npm test -- src/features/precedent
npm run lint
```

Expected: result and precedent tests pass.

Commit:

```bash
git add src/features/result/ResultScreen.tsx src/features/result/ResultScreen.test.tsx src/features/precedent src/App.css
git commit -m "feat: add precedent objection confirmation"
```

---

### Task 7: Full Verification and AIT Build

**Files:**
- No source edits expected unless verification reveals bugs.

- [ ] **Step 1: Run TypeScript**

Run:

```bash
npx tsc --noEmit
```

Expected: exit code 0.

- [ ] **Step 2: Run lint**

Run:

```bash
npm run lint
```

Expected: exit code 0.

- [ ] **Step 3: Run all tests**

Run:

```bash
npm test
```

Expected: all test files pass.

- [ ] **Step 4: Build AIT artifact**

Run:

```bash
VITE_PRECEDENT_API_URL=https://nuga-wrong-ai.vercel.app/api npm run build
```

Expected: `AIT build completed (lua-nooga-ai.ait)`.

- [ ] **Step 5: Manual smoke checklist**

Use local dev server or AIT preview to verify:

- First install/cleared storage shows Lua court intro.
- Returning visit skips intro and lands on home.
- Result screen shows verdict first, then reasons/advice, then reward/restart buttons.
- Reward consultation shows Lua and Toss-shopping-style cards.
- Hot Battle detail shows conversation before verdict.
- Room spectator sees read-only state.
- Precedent CTA opens confirmation and requires consent.

- [ ] **Step 6: Commit verification fixes or deploy**

If source changes were needed, commit them:

```bash
git add src docs
git commit -m "fix: complete detail ux verification"
```

If no changes were needed, deploy:

```bash
npm run deploy -- --location ./lua-nooga-ai.ait
```

Expected: CLI prints an `intoss-private://lua-nooga-ai?_deploymentId=...` link.

---

## Self-Review

Spec coverage:

- First-visit intro: Task 1.
- Result hierarchy and primary actions: Task 2.
- Reward consultation and price bands: Task 3.
- Hot Battle detail and comment board: Task 4.
- 60-second room state polish: Task 5.
- Precedent confirmation and consent: Task 6.
- Full verification and build: Task 7.

Placeholder scan:

- The plan contains no placeholder implementation markers or unspecified implementation steps.

Type consistency:

- Existing names are preserved: `JudgmentResult`, `ResultScreen`, `RewardChatScreen`, `createRewardChatRecommendation`, `InputHome`, `RoomScreen`.
- New UI state names are local to their components and do not require new shared types.
