# Paged Incident Intake UX Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current single-page incident review flow with a paged `자료 넣기 -> 루아 정리 중 -> 싸움 일지 확인 -> 판독 결과` flow.

**Architecture:** Split the current `TextReview` responsibilities into focused input, loading, and journal confirmation screens. Keep AI intake in the existing adapter, add a small journal utility for editable items and final judge text, and let `App.tsx` own the page-state transitions so OCR/audio paths converge into the same flow.

**Tech Stack:** React 18, TypeScript, Vite/Granite, TDS Mobile, Vitest, Testing Library, Apps in Toss WebView.

---

## File Structure

- Create `src/features/intake/incidentJournal.ts`
  - Owns conversion between `IncidentIntakeSummary` and editable `IncidentJournalItem[]`.
  - Owns `buildJudgeText()` so final AI judgment input is not embedded inside UI components.
- Create `src/features/intake/incidentJournal.test.ts`
  - Covers item conversion, empty fallback, edited item output, and original evidence inclusion.
- Create `src/features/input/EvidenceInputScreen.tsx`
  - Replaces the input portion of `TextReview`.
  - Owns draft text syncing, topic, extra context, user perspective, media controls, paste handler, and validation.
- Create `src/features/input/EvidenceInputScreen.test.tsx`
  - Covers required text, draft syncing, media control placement, topic/perspective payload, and submit payload.
- Create `src/features/intake/LuaIntakeLoadingScreen.tsx`
  - Displays the Lua loading page while `prepareIncidentIntake()` runs.
- Create `src/features/intake/LuaIntakeLoadingScreen.test.tsx`
  - Covers loading copy, fallback notice, and back action.
- Create `src/features/intake/IncidentJournalScreen.tsx`
  - Displays editable numbered journal cards and sends final judge text.
- Create `src/features/intake/IncidentJournalScreen.test.tsx`
  - Covers edit, delete, add, missing question disclosure, empty item validation, back, and analyze failure.
- Modify `src/App.tsx`
  - Replace `screen: "review"` rendering with three states: `"review"`, `"intake-loading"`, and `"journal"`.
  - Rename the old review state conceptually to evidence input while preserving `screen: "review"` where it reduces churn.
  - Move AI intake execution to `App`.
  - Route OCR/audio updates into the evidence input state.
- Modify `src/App.test.tsx`
  - Update the main app flow tests to assert the paged transitions.
- Modify `src/App.css`
  - Add styles for the three new screens.
  - Keep existing `.incident-summary-*` styles in place during this plan because they do not affect the new screens and deleting them is not required for the UX change.
- Remove `src/features/input/TextReview.tsx` and `src/features/input/TextReview.test.tsx`
  - Only after the new screens and App tests pass.

---

### Task 1: Journal Utility

**Files:**
- Create: `src/features/intake/incidentJournal.ts`
- Create: `src/features/intake/incidentJournal.test.ts`

- [ ] **Step 1: Write the failing utility tests**

Create `src/features/intake/incidentJournal.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import type { IncidentIntakeSummary } from "./incidentIntake";
import {
  buildJudgeText,
  createJournalItemsFromSummary,
  normalizeJournalItems,
} from "./incidentJournal";

const summary: IncidentIntakeSummary = {
  title: "답장 지연으로 시작된 싸움",
  topic: "reply",
  partyA: "첫 번째 사람",
  partyB: "두 번째 사람",
  partyAClaim: "답장이 늦어 서운했어요.",
  partyBClaim: "회의 중이라 바로 답하지 못했어요.",
  issues: ["답장 지연", "사전 설명", "말투"],
  missingQuestions: ["회의 시간이 미리 공유됐나요?"],
  completeness: "needs_context",
  normalizedDialogue: ["A: 왜 답장을 안 해?", "B: 회의였어"],
  judgeText: "[루아 사건 접수서]\n기존 요약",
};

describe("incidentJournal", () => {
  it("creates numbered journal items from summary claims and issues", () => {
    expect(createJournalItemsFromSummary(summary)).toEqual([
      { id: "claim-a", text: "첫 번째 사람: 답장이 늦어 서운했어요." },
      { id: "claim-b", text: "두 번째 사람: 회의 중이라 바로 답하지 못했어요." },
      { id: "issue-1", text: "핵심 쟁점: 답장 지연" },
      { id: "issue-2", text: "핵심 쟁점: 사전 설명" },
      { id: "issue-3", text: "핵심 쟁점: 말투" },
    ]);
  });

  it("uses normalized dialogue when claims are empty", () => {
    expect(
      createJournalItemsFromSummary({
        ...summary,
        partyAClaim: "",
        partyBClaim: "",
      }).slice(0, 2),
    ).toEqual([
      { id: "line-1", text: "A: 왜 답장을 안 해?" },
      { id: "line-2", text: "B: 회의였어" },
    ]);
  });

  it("normalizes edited journal items by trimming and removing blanks", () => {
    expect(
      normalizeJournalItems([
        { id: "a", text: "  하나  " },
        { id: "b", text: "" },
        { id: "c", text: "둘" },
      ]),
    ).toEqual([
      { id: "a", text: "하나" },
      { id: "c", text: "둘" },
    ]);
  });

  it("builds final judge text from confirmed journal and original evidence", () => {
    expect(
      buildJudgeText({
        summary,
        journalItems: [
          { id: "custom-1", text: "A가 먼저 서운함을 표현했어요." },
          { id: "custom-2", text: "B는 회의 중이었다고 설명했어요." },
        ],
        originalText: "A: 왜 답장을 안 해?\nB: 회의였어",
        extraContext: "연락 문제로 자주 다퉜어요.",
      }),
    ).toContain("사용자가 확인한 싸움 일지");
    expect(
      buildJudgeText({
        summary,
        journalItems: [{ id: "custom-1", text: "A가 먼저 서운함을 표현했어요." }],
        originalText: "A: 원본",
        extraContext: "",
      }),
    ).toContain("원본 자료:\nA: 원본");
  });
});
```

- [ ] **Step 2: Run the utility test to verify it fails**

Run:

```bash
npm test -- src/features/intake/incidentJournal.test.ts --run
```

Expected: FAIL because `incidentJournal.ts` does not exist.

- [ ] **Step 3: Implement the utility**

Create `src/features/intake/incidentJournal.ts`:

```ts
import type { IncidentIntakeSummary } from "./incidentIntake";
import { topicLabels } from "./incidentIntake";

export type IncidentJournalItem = {
  id: string;
  text: string;
};

export function normalizeJournalItems(
  items: IncidentJournalItem[],
): IncidentJournalItem[] {
  return items
    .map((item) => ({ ...item, text: item.text.trim() }))
    .filter((item) => item.text.length > 0);
}

export function createJournalItemsFromSummary(
  summary: IncidentIntakeSummary,
): IncidentJournalItem[] {
  const claimItems = [
    summary.partyAClaim.trim()
      ? {
          id: "claim-a",
          text: `${summary.partyA}: ${summary.partyAClaim.trim()}`,
        }
      : null,
    summary.partyBClaim.trim()
      ? {
          id: "claim-b",
          text: `${summary.partyB}: ${summary.partyBClaim.trim()}`,
        }
      : null,
  ].filter((item): item is IncidentJournalItem => item !== null);

  if (claimItems.length > 0) {
    return [
      ...claimItems,
      ...summary.issues.map((issue, index) => ({
        id: `issue-${index + 1}`,
        text: `핵심 쟁점: ${issue}`,
      })),
    ];
  }

  const dialogueItems = summary.normalizedDialogue
    .slice(0, 5)
    .map((line, index) => ({
      id: `line-${index + 1}`,
      text: line,
    }));

  if (dialogueItems.length > 0) {
    return dialogueItems;
  }

  return [
    { id: "issue-1", text: `싸움 주제: ${topicLabels[summary.topic]}` },
    { id: "issue-2", text: summary.title },
  ];
}

export function buildJudgeText({
  summary,
  journalItems,
  originalText,
  extraContext,
}: {
  summary: IncidentIntakeSummary;
  journalItems: IncidentJournalItem[];
  originalText: string;
  extraContext: string;
}) {
  const normalizedItems = normalizeJournalItems(journalItems);
  const journalText = normalizedItems
    .map((item, index) => `${index + 1}. ${item.text}`)
    .join("\n");

  return [
    "[루아 사건 접수서]",
    `제목: ${summary.title}`,
    `싸움 주제: ${topicLabels[summary.topic]}`,
    "",
    "[사용자가 확인한 싸움 일지]",
    journalText || "확인된 싸움 일지가 비어 있어 원본 자료를 기준으로 판독합니다.",
    "",
    "[추가 맥락]",
    extraContext.trim() || "없음",
    "",
    "[원본 자료]",
    originalText.trim(),
  ].join("\n");
}
```

- [ ] **Step 4: Run the utility test to verify it passes**

Run:

```bash
npm test -- src/features/intake/incidentJournal.test.ts --run
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/intake/incidentJournal.ts src/features/intake/incidentJournal.test.ts
git commit -m "feat: add incident journal utilities"
```

---

### Task 2: Evidence Input Screen

**Files:**
- Create: `src/features/input/EvidenceInputScreen.tsx`
- Create: `src/features/input/EvidenceInputScreen.test.tsx`

- [ ] **Step 1: Write the failing screen tests**

Create `src/features/input/EvidenceInputScreen.test.tsx`:

```tsx
import { ThemeProvider } from "@toss/tds-mobile";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { EvidenceInputScreen } from "./EvidenceInputScreen";

beforeAll(() => {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
});

function renderScreen(ui: ReactNode) {
  return render(ui, { wrapper: ({ children }) => <ThemeProvider>{children}</ThemeProvider> });
}

describe("EvidenceInputScreen", () => {
  it("requires evidence before submit", async () => {
    const user = userEvent.setup();
    const onSubmitEvidence = vi.fn();

    renderScreen(
      <EvidenceInputScreen
        initialText=" "
        onSubmitEvidence={onSubmitEvidence}
        onBack={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { name: "루아에게 보내기" }));

    expect(screen.getByText("루아에게 보낼 내용을 먼저 넣어주세요.")).toBeInTheDocument();
    expect(onSubmitEvidence).not.toHaveBeenCalled();
  });

  it("submits trimmed evidence with topic, extra context, and perspective", async () => {
    const user = userEvent.setup();
    const onSubmitEvidence = vi.fn();

    renderScreen(
      <EvidenceInputScreen
        initialText="  A: 왜 답장을 안 해?  "
        onSubmitEvidence={onSubmitEvidence}
        onBack={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { name: "연락" }));
    await user.click(screen.getByRole("button", { name: "나는 첫 번째 사람이에요" }));
    await user.type(screen.getByRole("textbox", { name: "추가 맥락" }), "연락 문제로 자주 다퉜어요.");
    await user.click(screen.getByRole("button", { name: "루아에게 보내기" }));

    expect(onSubmitEvidence).toHaveBeenCalledWith({
      text: "A: 왜 답장을 안 해?",
      topic: "reply",
      extraContext: "연락 문제로 자주 다퉜어요.",
      userPerspective: "first",
    });
  });

  it("renders media control before the textarea", () => {
    renderScreen(
      <EvidenceInputScreen
        initialText="A: 캡처 대기"
        mediaControl={<button type="button">이미지 선택</button>}
        onSubmitEvidence={vi.fn()}
        onBack={vi.fn()}
      />,
    );

    const section = screen.getByRole("region", { name: "자료 입력" });
    const controls = Array.from(section.children);

    expect(
      controls.indexOf(screen.getByRole("button", { name: "이미지 선택" })),
    ).toBeLessThan(controls.indexOf(screen.getByLabelText("분석할 대화 내용")));
  });

  it("syncs new initial text when the user has not edited the draft", async () => {
    const { rerender } = renderScreen(
      <EvidenceInputScreen
        initialText="OCR 대기 중"
        onSubmitEvidence={vi.fn()}
        onBack={vi.fn()}
      />,
    );

    rerender(
      <ThemeProvider>
        <EvidenceInputScreen
          initialText="OCR로 읽은 새 내용"
          onSubmitEvidence={vi.fn()}
          onBack={vi.fn()}
        />
      </ThemeProvider>,
    );

    await waitFor(() => {
      expect(screen.getByLabelText("분석할 대화 내용")).toHaveValue("OCR로 읽은 새 내용");
    });
  });
});
```

- [ ] **Step 2: Run the screen test to verify it fails**

Run:

```bash
npm test -- src/features/input/EvidenceInputScreen.test.tsx --run
```

Expected: FAIL because `EvidenceInputScreen.tsx` does not exist.

- [ ] **Step 3: Implement the screen**

Create `src/features/input/EvidenceInputScreen.tsx` by moving the input-only logic from `TextReview`:

```tsx
import { Button } from "@toss/tds-mobile";
import type { ClipboardEvent, ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import type { UserPerspective } from "../analyzer/types";
import type { IncidentIntakeInput, IncidentTopic } from "../intake/incidentIntake";

type EvidenceInputScreenProps = {
  initialText: string;
  initialTextSyncKey?: number;
  draftSyncKey?: number;
  helperText?: string;
  mediaControl?: ReactNode;
  onPaste?: (event: ClipboardEvent<HTMLElement>) => void;
  onSubmitEvidence(input: IncidentIntakeInput): void;
  onBack(): void;
};

const intakeTopics: Array<{ id: IncidentTopic; label: string }> = [
  { id: "reply", label: "연락" },
  { id: "schedule", label: "약속/시간" },
  { id: "tone", label: "말투" },
  { id: "money", label: "돈/선물" },
  { id: "jealousy", label: "질투/오해" },
  { id: "family", label: "가족/친구" },
  { id: "other", label: "기타" },
];

export function EvidenceInputScreen({
  initialText,
  initialTextSyncKey,
  draftSyncKey,
  helperText,
  mediaControl,
  onPaste,
  onSubmitEvidence,
  onBack,
}: EvidenceInputScreenProps) {
  const [text, setText] = useState(initialText);
  const [extraContext, setExtraContext] = useState("");
  const [topic, setTopic] = useState<IncidentTopic>("unspecified");
  const [error, setError] = useState("");
  const [hasUserEditedDraft, setHasUserEditedDraft] = useState(false);
  const [userPerspective, setUserPerspective] = useState<UserPerspective>("unknown");
  const lastInitialTextSyncKeyRef = useRef(initialTextSyncKey);
  const lastUserEditSyncKeyRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    const syncKeyChanged = lastInitialTextSyncKeyRef.current !== initialTextSyncKey;
    lastInitialTextSyncKeyRef.current = initialTextSyncKey;

    if (initialTextSyncKey !== undefined) {
      if (syncKeyChanged && lastUserEditSyncKeyRef.current !== initialTextSyncKey) {
        setText(initialText);
        setHasUserEditedDraft(false);
      }

      return;
    }

    if (!hasUserEditedDraft) {
      setText(initialText);
    }
  }, [hasUserEditedDraft, initialText, initialTextSyncKey]);

  const submit = () => {
    const trimmedText = text.trim();

    if (!trimmedText) {
      setError("루아에게 보낼 내용을 먼저 넣어주세요.");
      return;
    }

    setError("");
    onSubmitEvidence({
      text: trimmedText,
      topic,
      extraContext: extraContext.trim(),
      userPerspective,
    });
  };

  const errorId = error ? "analysis-text-error" : undefined;

  return (
    <main className="screen screen--review evidence-input-screen" onPaste={onPaste}>
      <header className="review-brief">
        <button className="review-brief__back" type="button" onClick={onBack}>
          돌아가기
        </button>
        <p>루아 사건 접수</p>
        <h1>루아에게 보낼 자료</h1>
        <span>카톡 대화나 상황을 그대로 넣어주세요. 정리는 루아가 할게요.</span>
      </header>

      <section className="text-review" aria-label="자료 입력">
        <div className="incident-topic-picker" aria-label="싸움 주제 선택">
          <strong>어떤 싸움이에요?</strong>
          <div>
            {intakeTopics.map(({ id, label }) => (
              <button
                type="button"
                aria-pressed={topic === id}
                key={id}
                onClick={() => setTopic(id)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="text-review__header">
          <label htmlFor="analysis-text">싸움 자료</label>
          <span>{text.trim().length}자</span>
        </div>
        {mediaControl}
        {helperText ? <p className="notice">{helperText}</p> : null}
        <textarea
          id="analysis-text"
          aria-label="분석할 대화 내용"
          aria-describedby={errorId}
          aria-invalid={error ? "true" : undefined}
          value={text}
          onChange={(event) => {
            lastUserEditSyncKeyRef.current = draftSyncKey;
            setHasUserEditedDraft(true);
            setText(event.target.value);
            if (error) setError("");
          }}
          rows={11}
          placeholder="카톡 대화, 상황 설명, 음성 변환 텍스트를 그대로 넣어주세요."
        />
        <label className="extra-context-field" htmlFor="incident-extra-context">
          <span>카톡에 안 나온 맥락이 있나요?</span>
          <textarea
            id="incident-extra-context"
            aria-label="추가 맥락"
            rows={3}
            value={extraContext}
            onChange={(event) => {
              setExtraContext(event.target.value);
              if (error) setError("");
            }}
            placeholder="예: 이전에도 같은 일로 다퉜어요. 상대가 먼저 사과하긴 했어요."
          />
        </label>
        {error ? (
          <p className="form-error" id="analysis-text-error">
            {error}
          </p>
        ) : null}
      </section>

      <div className="perspective-selector" aria-label="내가 누구인지 선택">
        <button type="button" aria-pressed={userPerspective === "first"} onClick={() => setUserPerspective("first")}>
          나는 첫 번째 사람이에요
        </button>
        <button type="button" aria-pressed={userPerspective === "second"} onClick={() => setUserPerspective("second")}>
          나는 두 번째 사람이에요
        </button>
        <button type="button" aria-pressed={userPerspective === "unknown"} onClick={() => setUserPerspective("unknown")}>
          잘 모르겠어요
        </button>
      </div>

      <div className="action-row">
        <Button type="button" onClick={submit}>
          루아에게 보내기
        </Button>
      </div>
    </main>
  );
}
```

- [ ] **Step 4: Run the screen test to verify it passes**

Run:

```bash
npm test -- src/features/input/EvidenceInputScreen.test.tsx --run
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/input/EvidenceInputScreen.tsx src/features/input/EvidenceInputScreen.test.tsx
git commit -m "feat: add evidence input screen"
```

---

### Task 3: Loading and Journal Screens

**Files:**
- Create: `src/features/intake/LuaIntakeLoadingScreen.tsx`
- Create: `src/features/intake/LuaIntakeLoadingScreen.test.tsx`
- Create: `src/features/intake/IncidentJournalScreen.tsx`
- Create: `src/features/intake/IncidentJournalScreen.test.tsx`

- [ ] **Step 1: Write loading screen tests**

Create `src/features/intake/LuaIntakeLoadingScreen.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { LuaIntakeLoadingScreen } from "./LuaIntakeLoadingScreen";

describe("LuaIntakeLoadingScreen", () => {
  it("shows Lua intake progress copy", () => {
    render(<LuaIntakeLoadingScreen onBack={vi.fn()} />);

    expect(screen.getByText("루아가 싸움 일지를 정리하고 있어요")).toBeInTheDocument();
    expect(screen.getByText("카톡 말투와 앞뒤 상황을 A/B 주장으로 나누는 중이에요.")).toBeInTheDocument();
  });

  it("shows fallback notice when provided", () => {
    render(<LuaIntakeLoadingScreen fallbackMessage="간단 정리로 먼저 진행할게요." onBack={vi.fn()} />);

    expect(screen.getByText("간단 정리로 먼저 진행할게요.")).toBeInTheDocument();
  });

  it("calls back handler", async () => {
    const user = userEvent.setup();
    const onBack = vi.fn();
    render(<LuaIntakeLoadingScreen onBack={onBack} />);

    await user.click(screen.getByRole("button", { name: "돌아가기" }));

    expect(onBack).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Write journal screen tests**

Create `src/features/intake/IncidentJournalScreen.test.tsx`:

```tsx
import { ThemeProvider } from "@toss/tds-mobile";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { beforeAll, describe, expect, it, vi } from "vitest";
import type { IncidentIntakeSummary } from "./incidentIntake";
import { IncidentJournalScreen } from "./IncidentJournalScreen";

beforeAll(() => {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
});

function renderScreen(ui: ReactNode) {
  return render(ui, { wrapper: ({ children }) => <ThemeProvider>{children}</ThemeProvider> });
}

const summary: IncidentIntakeSummary = {
  title: "답장 지연으로 시작된 싸움",
  topic: "reply",
  partyA: "첫 번째 사람",
  partyB: "두 번째 사람",
  partyAClaim: "답장이 늦어 서운했어요.",
  partyBClaim: "회의 중이라 바로 답하지 못했어요.",
  issues: ["답장 지연", "사전 설명", "말투"],
  missingQuestions: ["회의 시간이 미리 공유됐나요?"],
  completeness: "needs_context",
  normalizedDialogue: ["A: 왜 답장을 안 해?", "B: 회의였어"],
  judgeText: "[루아 사건 접수서]\n기존 요약",
};

describe("IncidentJournalScreen", () => {
  it("renders editable numbered journal items", () => {
    renderScreen(
      <IncidentJournalScreen
        summary={summary}
        originalText="A: 원본"
        extraContext=""
        userPerspective="unknown"
        onAnalyze={vi.fn()}
        onBack={vi.fn()}
      />,
    );

    expect(screen.getByText("루아가 정리한 싸움 일지")).toBeInTheDocument();
    expect(screen.getByDisplayValue("첫 번째 사람: 답장이 늦어 서운했어요.")).toBeInTheDocument();
  });

  it("allows edit, delete, add, then submits final judge text", async () => {
    const user = userEvent.setup();
    const onAnalyze = vi.fn();

    renderScreen(
      <IncidentJournalScreen
        summary={summary}
        originalText="A: 왜 답장을 안 해?\nB: 회의였어"
        extraContext="연락 문제로 자주 다퉜어요."
        userPerspective="first"
        onAnalyze={onAnalyze}
        onBack={vi.fn()}
      />,
    );

    const firstItem = screen.getByDisplayValue("첫 번째 사람: 답장이 늦어 서운했어요.");
    await user.clear(firstItem);
    await user.type(firstItem, "A는 답장이 늦어 서운했어요.");
    await user.click(screen.getAllByRole("button", { name: "항목 삭제" })[1]);
    await user.click(screen.getByRole("button", { name: "항목 추가" }));
    await user.type(screen.getByDisplayValue(""), "B는 회의 중이었다고 설명했어요.");
    await user.click(screen.getByRole("button", { name: "이대로 판독하기" }));

    expect(onAnalyze).toHaveBeenCalledWith(
      expect.stringContaining("A는 답장이 늦어 서운했어요."),
      "first",
    );
    expect(onAnalyze).toHaveBeenCalledWith(
      expect.stringContaining("원본 자료"),
      "first",
    );
  });

  it("keeps the user on journal screen when analysis fails", async () => {
    const user = userEvent.setup();

    renderScreen(
      <IncidentJournalScreen
        summary={summary}
        originalText="A: 원본"
        extraContext=""
        userPerspective="unknown"
        onAnalyze={vi.fn().mockRejectedValue(new Error("network"))}
        onBack={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { name: "이대로 판독하기" }));

    expect(await screen.findByText("판독 중 문제가 생겼어요. 잠시 후 다시 시도해주세요.")).toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Run the new screen tests to verify they fail**

Run:

```bash
npm test -- src/features/intake/LuaIntakeLoadingScreen.test.tsx src/features/intake/IncidentJournalScreen.test.tsx --run
```

Expected: FAIL because the components do not exist.

- [ ] **Step 4: Implement `LuaIntakeLoadingScreen`**

Create `src/features/intake/LuaIntakeLoadingScreen.tsx`:

```tsx
type LuaIntakeLoadingScreenProps = {
  fallbackMessage?: string | null;
  onBack(): void;
};

export function LuaIntakeLoadingScreen({
  fallbackMessage,
  onBack,
}: LuaIntakeLoadingScreenProps) {
  return (
    <main className="screen lua-intake-loading-screen">
      <header className="review-brief">
        <button className="review-brief__back" type="button" onClick={onBack}>
          돌아가기
        </button>
        <p>루아 사건 접수</p>
        <h1>루아가 싸움 일지를 정리하고 있어요</h1>
        <span>카톡 말투와 앞뒤 상황을 A/B 주장으로 나누는 중이에요.</span>
      </header>

      <section className="lua-intake-loading" aria-label="루아 정리 중">
        <div className="lua-intake-loading__character" aria-hidden="true">
          <span>Lua</span>
        </div>
        <strong>00:00:03</strong>
        <p>잠깐만 기다려주세요. 루아가 증거를 사건 일지로 바꾸고 있어요.</p>
        {fallbackMessage ? <small>{fallbackMessage}</small> : null}
      </section>
    </main>
  );
}
```

- [ ] **Step 5: Implement `IncidentJournalScreen`**

Create `src/features/intake/IncidentJournalScreen.tsx`:

```tsx
import { Button } from "@toss/tds-mobile";
import { useMemo, useState } from "react";
import type { UserPerspective } from "../analyzer/types";
import type { IncidentIntakeSummary } from "./incidentIntake";
import {
  buildJudgeText,
  createJournalItemsFromSummary,
  normalizeJournalItems,
  type IncidentJournalItem,
} from "./incidentJournal";

type IncidentJournalScreenProps = {
  summary: IncidentIntakeSummary;
  originalText: string;
  extraContext: string;
  userPerspective: UserPerspective;
  fallbackMessage?: string | null;
  onAnalyze(text: string, userPerspective: UserPerspective): void | Promise<void>;
  onBack(): void;
};

const submitFailureMessage = "판독 중 문제가 생겼어요. 잠시 후 다시 시도해주세요.";

export function IncidentJournalScreen({
  summary,
  originalText,
  extraContext,
  userPerspective,
  fallbackMessage,
  onAnalyze,
  onBack,
}: IncidentJournalScreenProps) {
  const initialItems = useMemo(() => createJournalItemsFromSummary(summary), [summary]);
  const [items, setItems] = useState<IncidentJournalItem[]>(initialItems);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState("");

  const updateItem = (id: string, text: string) => {
    setItems((currentItems) =>
      currentItems.map((item) => (item.id === id ? { ...item, text } : item)),
    );
    if (error) setError("");
  };

  const deleteItem = (id: string) => {
    setItems((currentItems) => currentItems.filter((item) => item.id !== id));
    if (error) setError("");
  };

  const addItem = () => {
    setItems((currentItems) => [
      ...currentItems,
      { id: `custom-${Date.now()}`, text: "" },
    ]);
  };

  const submit = async () => {
    const normalizedItems = normalizeJournalItems(items);

    if (normalizedItems.length === 0) {
      setError("판독할 싸움 일지를 하나 이상 남겨주세요.");
      return;
    }

    setError("");
    setIsPending(true);

    try {
      await onAnalyze(
        buildJudgeText({
          summary,
          journalItems: normalizedItems,
          originalText,
          extraContext,
        }),
        userPerspective,
      );
    } catch {
      setError(submitFailureMessage);
    } finally {
      setIsPending(false);
    }
  };

  return (
    <main className="screen incident-journal-screen">
      <header className="review-brief">
        <button className="review-brief__back" type="button" onClick={onBack}>
          돌아가기
        </button>
        <p>루아 사건 접수</p>
        <h1>루아가 정리한 싸움 일지</h1>
        <span>틀린 부분은 고치고, 빠진 내용은 한 줄 더 추가해 주세요.</span>
      </header>

      {fallbackMessage ? <p className="notice">{fallbackMessage}</p> : null}

      <section className="incident-journal-list" aria-label="싸움 일지 확인">
        {items.map((item, index) => (
          <article className="incident-journal-item" key={item.id}>
            <span>{index + 1}.</span>
            <textarea
              aria-label={`${index + 1}번 싸움 일지`}
              value={item.text}
              rows={2}
              onChange={(event) => updateItem(item.id, event.target.value)}
            />
            <button type="button" aria-label="항목 삭제" onClick={() => deleteItem(item.id)}>
              삭제
            </button>
          </article>
        ))}
      </section>

      {summary.missingQuestions.length > 0 ? (
        <details className="incident-journal-questions">
          <summary>더 정확해지려면</summary>
          <ul>
            {summary.missingQuestions.map((question) => (
              <li key={question}>{question}</li>
            ))}
          </ul>
        </details>
      ) : null}

      {error ? <p className="form-error">{error}</p> : null}

      <div className="incident-journal-actions">
        <button type="button" onClick={addItem}>
          항목 추가
        </button>
        <Button type="button" disabled={isPending} onClick={() => void submit()}>
          {isPending ? "판독 중..." : "이대로 판독하기"}
        </Button>
      </div>
    </main>
  );
}
```

- [ ] **Step 6: Run the new screen tests to verify they pass**

Run:

```bash
npm test -- src/features/intake/LuaIntakeLoadingScreen.test.tsx src/features/intake/IncidentJournalScreen.test.tsx --run
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/features/intake/LuaIntakeLoadingScreen.tsx src/features/intake/LuaIntakeLoadingScreen.test.tsx src/features/intake/IncidentJournalScreen.tsx src/features/intake/IncidentJournalScreen.test.tsx
git commit -m "feat: add paged intake confirmation screens"
```

---

### Task 4: App State Integration

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/App.test.tsx`

- [ ] **Step 1: Write/update app flow tests first**

In `src/App.test.tsx`, replace direct `무료 판독 받기` review-flow usage with the paged sequence. Update the helper:

```tsx
async function prepareAndAnalyze(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: "루아에게 보내기" }));
  expect(await screen.findByText("루아가 싸움 일지를 정리하고 있어요")).toBeInTheDocument();
  await user.click(await screen.findByRole("button", { name: "이대로 판독하기" }));
}
```

Add a focused app test:

```tsx
it("moves through evidence input, Lua loading, journal confirmation, and result", async () => {
  const user = userEvent.setup();
  vi.mocked(analyzeWithAi).mockResolvedValue({
    status: "ready",
    result: {
      verdict: "A가 55% 선넘었어요",
      partyAPercent: 55,
      partyBPercent: 45,
      reasons: ["첫 번째 이유", "두 번째 이유", "세 번째 이유"],
      advice: "천천히 다시 이야기해 보세요.",
      safetyLevel: "normal",
    },
  });

  await renderAppHome(user);
  await user.click(screen.getByRole("button", { name: /카톡 싸움 붙여넣기/ }));

  expect(screen.getByText("루아에게 보낼 자료")).toBeInTheDocument();

  await user.click(screen.getByRole("button", { name: "루아에게 보내기" }));

  expect(await screen.findByText("루아가 싸움 일지를 정리하고 있어요")).toBeInTheDocument();
  expect(await screen.findByText("루아가 정리한 싸움 일지")).toBeInTheDocument();

  await user.click(screen.getByRole("button", { name: "이대로 판독하기" }));

  expect(analyzeWithAi).toHaveBeenCalledWith({
    text: expect.stringContaining("사용자가 확인한 싸움 일지"),
    userPerspective: "unknown",
  });
  expect(await screen.findByText("오늘의 판정")).toBeInTheDocument();
});
```

- [ ] **Step 2: Run the app test to verify it fails**

Run:

```bash
npm test -- src/App.test.tsx --run
```

Expected: FAIL because `App.tsx` still renders `TextReview`.

- [ ] **Step 3: Update imports and app state types**

In `src/App.tsx`, replace:

```ts
import { TextReview } from "./features/input/TextReview";
import { prepareIncidentIntake } from "./features/intake/incidentIntakeAdapter";
import type { IncidentIntakeInput } from "./features/intake/incidentIntake";
```

with:

```ts
import { EvidenceInputScreen } from "./features/input/EvidenceInputScreen";
import type { IncidentIntakeInput, IncidentIntakeSummary } from "./features/intake/incidentIntake";
import { IncidentJournalScreen } from "./features/intake/IncidentJournalScreen";
import { LuaIntakeLoadingScreen } from "./features/intake/LuaIntakeLoadingScreen";
import { prepareIncidentIntake } from "./features/intake/incidentIntakeAdapter";
```

Extend `AppState` with:

```ts
  | {
      screen: "intake-loading";
      reviewId: number;
      input: IncidentIntakeInput;
      inputMethod: InputMethod;
    }
  | {
      screen: "journal";
      reviewId: number;
      input: IncidentIntakeInput;
      summary: IncidentIntakeSummary;
      fallbackMessage?: string | null;
    }
```

- [ ] **Step 4: Add intake transition helpers**

In `App.tsx`, replace `handlePrepareIncident` with:

```ts
  const handleSubmitEvidence = (input: IncidentIntakeInput, reviewId: number, inputMethod: InputMethod) => {
    setState({ screen: "intake-loading", reviewId, input, inputMethod });

    window.setTimeout(() => {
      void prepareIncidentForReview(input, reviewId);
    }, 0);
  };

  const prepareIncidentForReview = async (
    input: IncidentIntakeInput,
    reviewId: number,
  ) => {
    const startedAt = Date.now();
    const intake = await prepareIncidentIntake(input);
    const elapsed = Date.now() - startedAt;
    const minimumLoadingMs = 1000;

    if (elapsed < minimumLoadingMs) {
      await new Promise((resolve) => window.setTimeout(resolve, minimumLoadingMs - elapsed));
    }

    if (reviewId !== activeReviewIdRef.current) {
      return;
    }

    setState({
      screen: "journal",
      reviewId,
      input,
      summary: intake.summary,
      fallbackMessage:
        intake.status === "fallback"
          ? "AI 정리가 불안정해서 간단 정리로 먼저 진행할게요."
          : null,
    });
  };
```

- [ ] **Step 5: Render the new screens**

Replace the `state.screen === "review"` render block with:

```tsx
  if (state.screen === "review") {
    return (
      <EvidenceInputScreen
        initialText={state.initialText}
        initialTextSyncKey={state.ocrDeliveredSyncKey}
        draftSyncKey={state.ocrSyncKey}
        helperText={state.helperText}
        mediaControl={renderMediaControl()}
        onPaste={
          state.inputMethod === "screenshot"
            ? (event) => handleScreenshotPaste(event, state.reviewId)
            : undefined
        }
        onSubmitEvidence={(input) =>
          handleSubmitEvidence(input, state.reviewId, state.inputMethod)
        }
        onBack={goHome}
      />
    );
  }

  if (state.screen === "intake-loading") {
    return (
      <LuaIntakeLoadingScreen
        onBack={() =>
          setState({
            screen: "review",
            reviewId: state.reviewId,
            inputMethod: state.inputMethod,
            initialText: state.input.text,
            helperText: reviewHelpers[state.inputMethod],
          })
        }
      />
    );
  }

  if (state.screen === "journal") {
    return (
      <IncidentJournalScreen
        summary={state.summary}
        originalText={state.input.text}
        extraContext={state.input.extraContext}
        userPerspective={state.input.userPerspective}
        fallbackMessage={state.fallbackMessage}
        onAnalyze={(text, userPerspective) =>
          handleAnalyze(text, userPerspective, state.reviewId)
        }
        onBack={() =>
          setState({
            screen: "review",
            reviewId: state.reviewId,
            inputMethod: "text",
            initialText: state.input.text,
            helperText: undefined,
          })
        }
      />
    );
  }
```

- [ ] **Step 6: Update stale async guards**

In `handleAnalyze`, change the limited-state update guard from only `currentState.screen === "review"` to journal-aware handling:

```ts
if (aiJudgment.status === "limited") {
  setState((currentState) =>
    currentState.screen === "journal" && currentState.reviewId === reviewId
      ? { ...currentState, fallbackMessage: aiJudgment.message }
      : currentState,
  );
  return;
}
```

Add an App test that exhausts free usage from the journal screen:

```tsx
it("stays on the journal screen when free AI use is exhausted", async () => {
  const user = userEvent.setup();
  vi.mocked(analyzeWithAi).mockResolvedValue({
    status: "limited",
    message: "오늘 무료 판독을 모두 사용했어요.",
    remainingFreeUses: 0,
  });

  await renderAppHome(user);
  await user.click(screen.getByRole("button", { name: /카톡 싸움 붙여넣기/ }));
  await user.click(screen.getByRole("button", { name: "루아에게 보내기" }));
  await user.click(await screen.findByRole("button", { name: "이대로 판독하기" }));

  expect(await screen.findByText("오늘 무료 판독을 모두 사용했어요.")).toBeInTheDocument();
  expect(screen.getByText("루아가 정리한 싸움 일지")).toBeInTheDocument();
  expect(screen.queryByText("오늘의 판정")).not.toBeInTheDocument();
});
```

- [ ] **Step 7: Run the app tests**

Run:

```bash
npm test -- src/App.test.tsx --run
```

Expected: PASS after updating tests for the new labels.

- [ ] **Step 8: Commit**

```bash
git add src/App.tsx src/App.test.tsx
git commit -m "feat: route intake through paged journal flow"
```

---

### Task 5: Styling and Cleanup

**Files:**
- Modify: `src/App.css`
- Delete: `src/features/input/TextReview.tsx`
- Delete: `src/features/input/TextReview.test.tsx`

- [ ] **Step 1: Add focused CSS for new screens**

Append or merge into `src/App.css`:

```css
.evidence-input-screen .text-review textarea {
  min-height: 260px;
}

.lua-intake-loading-screen {
  min-height: 100dvh;
  align-content: start;
}

.lua-intake-loading {
  display: grid;
  justify-items: center;
  gap: 12px;
  padding: 36px 18px 24px;
  border-radius: 24px;
  background: #ffffff;
  text-align: center;
  box-shadow: 0 16px 34px rgba(20, 28, 45, 0.08);
}

.lua-intake-loading__character {
  display: grid;
  width: 118px;
  height: 118px;
  place-items: center;
  border-radius: 32px;
  background: linear-gradient(180deg, #fff7db, #ffffff);
  color: #191f28;
  font-size: 26px;
  font-weight: 1000;
  box-shadow: inset 0 0 0 1px #f0d493;
}

.lua-intake-loading strong {
  color: #191f28;
  font-size: 24px;
  font-weight: 1000;
}

.lua-intake-loading p,
.lua-intake-loading small {
  margin: 0;
  color: #6b7684;
  font-size: 14px;
  font-weight: 800;
  line-height: 1.45;
}

.incident-journal-screen {
  padding-bottom: 116px;
}

.incident-journal-list {
  display: grid;
  gap: 10px;
}

.incident-journal-item {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: 10px;
  align-items: start;
  padding: 12px;
  border: 1px solid #e5e8eb;
  border-radius: 14px;
  background: #ffffff;
  box-shadow: 0 10px 22px rgba(20, 28, 45, 0.05);
}

.incident-journal-item span {
  color: #191f28;
  font-size: 14px;
  font-weight: 1000;
  line-height: 36px;
}

.incident-journal-item textarea {
  width: 100%;
  min-height: 58px;
  box-sizing: border-box;
  resize: vertical;
  border: 0;
  border-radius: 10px;
  background: #f7f8fa;
  padding: 10px;
  color: #191f28;
  font: inherit;
  font-size: 14px;
  font-weight: 800;
  line-height: 1.45;
}

.incident-journal-item button,
.incident-journal-actions > button {
  min-height: 40px;
  border: 0;
  border-radius: 10px;
  background: #f2f4f6;
  color: #4e5968;
  font: inherit;
  font-size: 13px;
  font-weight: 900;
}

.incident-journal-questions {
  padding: 12px;
  border-radius: 14px;
  background: #fff7db;
  color: #4e5968;
  font-size: 13px;
  font-weight: 800;
  line-height: 1.45;
}

.incident-journal-questions summary {
  color: #191f28;
  font-weight: 1000;
  cursor: pointer;
}

.incident-journal-actions {
  display: grid;
  grid-template-columns: minmax(0, 0.8fr) minmax(0, 1.2fr);
  gap: 10px;
  position: sticky;
  bottom: 12px;
  z-index: 3;
}
```

- [ ] **Step 2: Remove `TextReview` once imports are gone**

Run:

```bash
rg -n "TextReview" src
```

Expected: only `TextReview.tsx` and `TextReview.test.tsx` remain. Then delete both files with `apply_patch` delete hunks.

- [ ] **Step 3: Run focused tests**

Run:

```bash
npm test -- src/features/intake/incidentJournal.test.ts src/features/input/EvidenceInputScreen.test.tsx src/features/intake/LuaIntakeLoadingScreen.test.tsx src/features/intake/IncidentJournalScreen.test.tsx src/App.test.tsx --run
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/App.css src/features/input/TextReview.tsx src/features/input/TextReview.test.tsx
git commit -m "refactor: remove single-page review screen"
```

---

### Task 6: Verification, Build, and Deployment

**Files:**
- No source files expected unless verification finds a bug.

- [ ] **Step 1: Run full test suite**

Run:

```bash
npm test -- --run
```

Expected: all test files pass.

- [ ] **Step 2: Run lint**

Run:

```bash
npm run lint
```

Expected: exits 0.

- [ ] **Step 3: Build AIT artifact**

Run:

```bash
npm run build
```

Expected: exits 0 and prints `AIT build completed`. The existing large chunk warning is acceptable.

- [ ] **Step 4: Smoke test with Vite**

Run dev server:

```bash
npx vite --host 127.0.0.1 --port 5174
```

In another command, run a browser smoke using installed Chrome:

```bash
NODE_PATH=/Users/sooin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules /Users/sooin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node - <<'NODE'
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.goto('http://127.0.0.1:5174/', { waitUntil: 'networkidle' });
  const start = page.getByRole('button', { name: '판정 시작하기' });
  if (await start.count()) await start.click();
  await page.getByRole('button', { name: /카톡 싸움 붙여넣기/ }).click();
  await page.getByLabel('분석할 대화 내용').fill('A: 왜 답장을 안 해?\\nB: 회의였어');
  await page.getByRole('button', { name: '루아에게 보내기' }).click();
  await page.getByText('루아가 싸움 일지를 정리하고 있어요').waitFor({ timeout: 5000 });
  await page.getByText('루아가 정리한 싸움 일지').waitFor({ timeout: 10000 });
  console.log(await page.getByText('루아가 정리한 싸움 일지').textContent());
  await browser.close();
})();
NODE
```

Expected output includes `루아가 정리한 싸움 일지`.

- [ ] **Step 5: Commit any verification fixes**

If a bug was found and fixed, stage the files touched by the paged intake flow:

```bash
git add src/App.tsx src/App.css src/App.test.tsx src/features/input/EvidenceInputScreen.tsx src/features/input/EvidenceInputScreen.test.tsx src/features/intake/IncidentJournalScreen.tsx src/features/intake/IncidentJournalScreen.test.tsx src/features/intake/LuaIntakeLoadingScreen.tsx src/features/intake/LuaIntakeLoadingScreen.test.tsx src/features/intake/incidentJournal.ts src/features/intake/incidentJournal.test.ts
git commit -m "fix: stabilize paged intake flow"
```

If no bug was found, skip this step.

- [ ] **Step 6: Push branch**

Run:

```bash
git push origin codex/lua-ai-detail-ux
```

Expected: push succeeds.

- [ ] **Step 7: Deploy AIT**

Run:

```bash
npm run deploy -- --location ./lua-nooga-ai.ait
```

Expected: output includes an `intoss-private://lua-nooga-ai?_deploymentId=...` link.

---

## Self-Review

Spec coverage:
- Paged flow is covered by Tasks 2, 3, and 4.
- Component split is covered by Tasks 2, 3, and 5.
- Journal editing and final judge text are covered by Tasks 1 and 3.
- OCR/audio convergence is covered by Task 4 through existing `renderMediaControl()` reuse.
- Error handling is covered by Tasks 2, 3, and 4.
- Testing and verification are covered by Task 6.

Placeholder scan:
- No unresolved placeholders are intended in the implementation instructions.

Type consistency:
- `IncidentIntakeInput`, `IncidentIntakeSummary`, `IncidentJournalItem`, `buildJudgeText()`, and `createJournalItemsFromSummary()` are consistently named across tasks.
