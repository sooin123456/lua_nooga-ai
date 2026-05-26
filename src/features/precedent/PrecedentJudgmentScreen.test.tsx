import { ThemeProvider } from "@toss/tds-mobile";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { PrecedentJudgmentReport } from "./precedentJudgmentAdapter";
import { PrecedentJudgmentScreen } from "./PrecedentJudgmentScreen";

const report: PrecedentJudgmentReport = {
  verdict: "판례 기준으로도 A가 68% 선넘었어요",
  partyAPercent: 68,
  partyBPercent: 32,
  reasons: ["사과 지연", "감정 확인 부족", "일부 쌍방 책임"],
  advice: "먼저 사과하고 작은 보상을 제안해 보세요.",
  safetyLevel: "normal",
  precedentIssues: ["사과 지연", "비난 표현", "회복 노력"],
  rebuttalPoints: ["늦은 사정이 불가피했다는 점은 반박 포인트예요."],
  reconciliationSuggestion: "커피 한 잔으로 사과를 시작해 보세요.",
  precedents: [
    {
      title: "대법원 2020다00000",
      court: "대법원",
      decidedAt: "2020-01-01",
      summary: "반복 비난과 사과 부족은 책임 판단에 참고될 수 있다.",
      similarityReason: "사과, 비난 표현이 유사해요.",
      sourceUrl: "https://example.com/case",
    },
  ],
};

function renderScreen(onBack = vi.fn(), onHome = vi.fn()) {
  render(
    <ThemeProvider>
      <PrecedentJudgmentScreen
        report={report}
        disclaimer="법률 상담이 아닌 참고용 분석이에요."
        onBack={onBack}
        onHome={onHome}
      />
    </ThemeProvider>,
  );
}

describe("PrecedentJudgmentScreen", () => {
  it("renders a full precedent AI judgment report", () => {
    renderScreen();

    expect(screen.getByText("판례 AI 판독 완료")).toBeInTheDocument();
    expect(screen.getByText(report.verdict)).toBeInTheDocument();
    expect(screen.getByText("A 68%")).toBeInTheDocument();
    expect(screen.getByText("유사 판례 1")).toBeInTheDocument();
    expect(screen.getByText("대법원 2020다00000")).toBeInTheDocument();
    expect(screen.getByText("판례상 쟁점")).toBeInTheDocument();
    expect(screen.getByText("반박 포인트")).toBeInTheDocument();
    expect(screen.getByText(report.reconciliationSuggestion)).toBeInTheDocument();
    expect(screen.getByText("법률 상담이 아닌 참고용 분석이에요.")).toBeInTheDocument();
  });

  it("navigates back to result or home", async () => {
    const onBack = vi.fn();
    const onHome = vi.fn();
    renderScreen(onBack, onHome);

    fireEvent.click(screen.getByRole("button", { name: "판정 결과로 돌아가기" }));
    fireEvent.click(screen.getByRole("button", { name: "홈으로 돌아가기" }));

    expect(onBack).toHaveBeenCalledTimes(1);
    expect(onHome).toHaveBeenCalledTimes(1);
  });
});
