import { ThemeProvider } from "@toss/tds-mobile";
import { fireEvent, render, screen } from "@testing-library/react";
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
  return render(ui, {
    wrapper: ({ children }) => <ThemeProvider>{children}</ThemeProvider>,
  });
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
    expect(
      screen.getByDisplayValue("첫 번째 사람: 답장이 늦어 서운했어요."),
    ).toBeInTheDocument();
  });

  it("allows edit, delete, add, then submits final judge text", async () => {
    const user = userEvent.setup();
    const onAnalyze = vi.fn();

    renderScreen(
      <IncidentJournalScreen
        summary={summary}
        originalText={"A: 왜 답장을 안 해?\nB: 회의였어"}
        extraContext="연락 문제로 자주 다퉜어요."
        userPerspective="first"
        onAnalyze={onAnalyze}
        onBack={vi.fn()}
      />,
    );

    const firstItem = screen.getByDisplayValue(
      "첫 번째 사람: 답장이 늦어 서운했어요.",
    );
    fireEvent.change(firstItem, {
      target: { value: "A는 답장이 늦어 서운했어요." },
    });
    await user.click(screen.getAllByRole("button", { name: "항목 삭제" })[1]);
    await user.click(screen.getByRole("button", { name: "항목 추가" }));
    fireEvent.change(screen.getByDisplayValue(""), {
      target: { value: "B는 회의 중이었다고 설명했어요." },
    });
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

    expect(
      await screen.findByText(
        "판독 중 문제가 생겼어요. 잠시 후 다시 시도해주세요.",
      ),
    ).toBeInTheDocument();
  });
});
