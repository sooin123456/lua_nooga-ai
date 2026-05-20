import { ThemeProvider } from "@toss/tds-mobile";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { beforeAll, describe, expect, it, vi } from "vitest";
import type { JudgmentResult } from "../analyzer/types";
import { ResultScreen } from "./ResultScreen";

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

const result: JudgmentResult = {
  verdict: "A가 62% 정도 더 선 넘었어요",
  partyAPercent: 62,
  partyBPercent: 38,
  reasons: ["감정 표현이 강했어요", "사과가 뒤따랐어요", "대화를 끝내려 했어요"],
  advice: "바로 결론내기보다 각자 원하는 걸 한 문장으로 말해보세요.",
  safetyLevel: "normal",
};

function ThemeWrapper({ children }: { children: ReactNode }) {
  return <ThemeProvider>{children}</ThemeProvider>;
}

function renderResultScreen(ui: ReactNode) {
  return render(ui, { wrapper: ThemeWrapper });
}

describe("ResultScreen", () => {
  it("shows verdict, percentages, exactly three reasons, advice, and disclaimer", () => {
    renderResultScreen(<ResultScreen result={result} onRestart={vi.fn()} />);

    expect(screen.getByText("오늘의 판결")).toBeInTheDocument();
    expect(screen.getByText("판독 결과")).toBeInTheDocument();
    expect(screen.getByText(result.verdict)).toBeInTheDocument();
    expect(screen.getByText("A 62%")).toBeInTheDocument();
    expect(screen.getByText("B 38%")).toBeInTheDocument();

    const reasons = screen.getAllByRole("listitem");
    expect(reasons).toHaveLength(3);
    expect(reasons.map((reason) => reason.textContent)).toEqual(result.reasons);

    expect(screen.getByText(result.advice)).toBeInTheDocument();
    expect(
      screen.getByText(/입력된 내용 기준의 재미용 판독/),
    ).toBeInTheDocument();
  });

  it("calls onRestart when the restart button is pressed", async () => {
    const user = userEvent.setup();
    const onRestart = vi.fn();

    renderResultScreen(<ResultScreen result={result} onRestart={onRestart} />);

    await user.click(screen.getByRole("button", { name: "다시 판독하기" }));

    expect(onRestart).toHaveBeenCalledTimes(1);
  });
});
