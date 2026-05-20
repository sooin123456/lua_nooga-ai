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

  it("recommends a Toss Shopping reward from the winner wish", async () => {
    const user = userEvent.setup();
    renderResultScreen(<ResultScreen result={result} onRestart={vi.fn()} />);

    await user.type(screen.getByLabelText("이긴 사람이 받고 싶은 것"), "달달한 거");
    await user.click(screen.getByRole("button", { name: "보상 추천 받기" }));

    expect(screen.getByText("디저트/간식")).toBeInTheDocument();
    expect(screen.getByText("초콜릿 · 마카롱 · 케이크")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "토스 쇼핑 연결 준비 중" }),
    ).toBeDisabled();
    expect(screen.getByRole("status")).toHaveTextContent("디저트/간식");
  });

  it("supports Enter submission and clears stale reward results on edit", async () => {
    const user = userEvent.setup();
    renderResultScreen(<ResultScreen result={result} onRestart={vi.fn()} />);

    const input = screen.getByLabelText("이긴 사람이 받고 싶은 것");

    await user.type(input, "커피{Enter}");
    expect(screen.getByRole("status")).toHaveTextContent("커피/음료");

    await user.type(input, "랑 케이크");
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
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
});
