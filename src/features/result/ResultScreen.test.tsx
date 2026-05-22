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
  verdict: "A가 62% 선넘었어요",
  partyAPercent: 62,
  partyBPercent: 38,
  reasons: ["감정 표현이 강했어요", "사과가 뒤따랐어요", "대화를 끝내려 했어요"],
  advice: "바로 결론내기보다 각자 원하는 걸 한 문장으로 말해보세요.",
  safetyLevel: "normal",
};
const normalResult = result;

function ThemeWrapper({ children }: { children: ReactNode }) {
  return <ThemeProvider>{children}</ThemeProvider>;
}

function renderResultScreen(ui: ReactNode) {
  return render(ui, { wrapper: ThemeWrapper });
}

describe("ResultScreen", () => {
  it("shows verdict, reasons, advice, and two primary actions before sharing", () => {
    renderResultScreen(
      <ResultScreen
        result={normalResult}
        onRestart={vi.fn()}
        onOpenRewardChat={vi.fn()}
        resultShareService={null}
      />,
    );

    expect(screen.getByText("오늘의 판정")).toBeInTheDocument();
    expect(screen.queryByText("오늘의 판독")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "보상받기" })).toHaveClass(
      "result-primary-action--reward",
    );
    expect(screen.getByRole("button", { name: "다시 판독하기" })).toBeInTheDocument();
    expect(screen.getByText("사람들한테 물어보기")).toBeInTheDocument();
  });

  it("keeps precedent analysis folded behind a red objection CTA", () => {
    renderResultScreen(
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
    expect(
      screen.queryByLabelText("판례 분석 결제 전 확인"),
    ).not.toBeInTheDocument();
  });

  it("opens precedent objection confirmation with price and consent details", async () => {
    const user = userEvent.setup();

    renderResultScreen(
      <ResultScreen
        result={normalResult}
        onRestart={vi.fn()}
        onOpenRewardChat={vi.fn()}
        resultShareService={null}
      />,
    );

    await user.click(
      screen.getByRole("button", {
        name: /억울하면 유사 판례로 한 번 더 따져보기/,
      }),
    );

    const confirmation = screen.getByLabelText("판례 분석 결제 전 확인");
    expect(confirmation).toHaveTextContent("990원");
    expect(confirmation).toHaveTextContent("판독 대화 텍스트");
    expect(confirmation).toHaveTextContent("법률 상담이 아닌 참고용 분석");
    expect(confirmation).toHaveTextContent("유사 판례가 없을 수 있어요");
    expect(
      screen.getByRole("checkbox", {
        name: "서버 전송과 참고용 분석에 동의합니다.",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "동의하고 분석하기" }),
    ).toBeDisabled();
  });

  it("enables precedent analysis confirmation after consent is checked", async () => {
    const user = userEvent.setup();

    renderResultScreen(
      <ResultScreen
        result={normalResult}
        onRestart={vi.fn()}
        onRequestPrecedentJudgment={vi.fn()}
        resultShareService={null}
      />,
    );

    await user.click(
      screen.getByRole("button", {
        name: /억울하면 유사 판례로 한 번 더 따져보기/,
      }),
    );
    await user.click(
      screen.getByRole("checkbox", {
        name: "서버 전송과 참고용 분석에 동의합니다.",
      }),
    );

    expect(
      screen.getByRole("button", { name: "동의하고 분석하기" }),
    ).toBeEnabled();
  });

  it("runs the paid precedent judgment request after consent", async () => {
    const user = userEvent.setup();
    const onRequestPrecedentJudgment = vi.fn().mockResolvedValue(undefined);

    renderResultScreen(
      <ResultScreen
        result={normalResult}
        onRestart={vi.fn()}
        onRequestPrecedentJudgment={onRequestPrecedentJudgment}
        resultShareService={null}
      />,
    );

    await user.click(
      screen.getByRole("button", {
        name: /억울하면 유사 판례로 한 번 더 따져보기/,
      }),
    );
    await user.click(
      screen.getByRole("checkbox", {
        name: "서버 전송과 참고용 분석에 동의합니다.",
      }),
    );
    await user.click(screen.getByRole("button", { name: "동의하고 분석하기" }));

    expect(onRequestPrecedentJudgment).toHaveBeenCalledTimes(1);
    expect(
      await screen.findByText("결제 확인 후 판례 AI가 다시 따져보고 있어요."),
    ).toBeInTheDocument();
  });

  it("resets precedent consent after the confirmation is closed and reopened", async () => {
    const user = userEvent.setup();

    renderResultScreen(
      <ResultScreen
        result={normalResult}
        onRestart={vi.fn()}
        onRequestPrecedentJudgment={vi.fn()}
        resultShareService={null}
      />,
    );

    const objectionCta = screen.getByRole("button", {
      name: /억울하면 유사 판례로 한 번 더 따져보기/,
    });

    await user.click(objectionCta);
    await user.click(
      screen.getByRole("checkbox", {
        name: "서버 전송과 참고용 분석에 동의합니다.",
      }),
    );
    expect(
      screen.getByRole("button", { name: "동의하고 분석하기" }),
    ).toBeEnabled();

    await user.click(objectionCta);
    expect(
      screen.queryByLabelText("판례 분석 결제 전 확인"),
    ).not.toBeInTheDocument();

    await user.click(objectionCta);

    expect(
      screen.getByRole("checkbox", {
        name: "서버 전송과 참고용 분석에 동의합니다.",
      }),
    ).not.toBeChecked();
    expect(
      screen.getByRole("button", { name: "동의하고 분석하기" }),
    ).toBeDisabled();
  });

  it("shows verdict, percentages, exactly three reasons, advice, and disclaimer", () => {
    renderResultScreen(
      <ResultScreen
        result={result}
        resultShareService={null}
        onRestart={vi.fn()}
      />,
    );

    expect(screen.getByText("오늘의 판정")).toBeInTheDocument();
    expect(screen.queryByText("오늘의 판독")).not.toBeInTheDocument();
    expect(screen.getByText(result.verdict)).toBeInTheDocument();
    expect(screen.getByText("A 62%")).toBeInTheDocument();
    expect(screen.getByText("B 38%")).toBeInTheDocument();
    expect(screen.getByLabelText("A 62%, B 38%")).toBeInTheDocument();
    expect(
      screen.getByLabelText("판례를 두드리는 망치 판정 이펙트"),
    ).toBeInTheDocument();
    expect(screen.getByText("증거 1")).toBeInTheDocument();
    expect(screen.getByText("증거 2")).toBeInTheDocument();
    expect(screen.getByText("증거 3")).toBeInTheDocument();

    const reasons = screen.getAllByRole("listitem");
    expect(reasons).toHaveLength(3);
    result.reasons.forEach((reason) => {
      expect(screen.getByText(reason)).toBeInTheDocument();
    });

    expect(screen.getByText(result.advice)).toBeInTheDocument();
    expect(
      screen.getByText(/입력된 내용 기준의 재미용 판독/),
    ).toBeInTheDocument();
    expect(screen.queryByText("억울하면 판례로 다시 따지기")).not.toBeInTheDocument();
  });

  it("calls onRestart when the restart button is pressed", async () => {
    const user = userEvent.setup();
    const onRestart = vi.fn();

    renderResultScreen(<ResultScreen result={result} onRestart={onRestart} />);

    await user.click(screen.getByRole("button", { name: "다시 판독하기" }));

    expect(onRestart).toHaveBeenCalledTimes(1);
  });

  it("opens the Lua reward chat from the bottom reward action", async () => {
    const user = userEvent.setup();
    const onOpenRewardChat = vi.fn();
    renderResultScreen(
      <ResultScreen
        result={result}
        resultShareService={null}
        onRestart={vi.fn()}
        onOpenRewardChat={onOpenRewardChat}
      />,
    );

    await user.click(screen.getByRole("button", { name: "보상받기" }));

    expect(onOpenRewardChat).toHaveBeenCalledTimes(1);
  });

  it("disables the reward chat CTA when no route handler is provided", () => {
    renderResultScreen(
      <ResultScreen
        result={result}
        resultShareService={null}
        onRestart={vi.fn()}
      />,
    );

    expect(
      screen.getByRole("button", { name: "보상받기" }),
    ).toBeDisabled();
  });

  it("does not show shopping reward flow for safety results", () => {
    renderResultScreen(
      <ResultScreen
        result={{ ...result, safetyLevel: "urgent" }}
        onRestart={vi.fn()}
      />,
    );

    expect(
      screen.queryByRole("button", { name: "보상받기" }),
    ).not.toBeInTheDocument();
  });

  it("does not show share or objection actions for safety results", () => {
    renderResultScreen(
      <ResultScreen
        result={{ ...result, safetyLevel: "caution" }}
        resultShareService={null}
        onRestart={vi.fn()}
      />,
    );

    expect(screen.queryByText("댓글쓰기")).not.toBeInTheDocument();
    expect(screen.queryByText("사람들한테 물어보기")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "판정 공유하기" }),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "카톡 보내기" })).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", {
        name: /억울하면 유사 판례로 한 번 더 따져보기/,
      }),
    ).not.toBeInTheDocument();
  });

  it("supports asking people by sharing", async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });
    Object.defineProperty(navigator, "share", {
      configurable: true,
      value: undefined,
    });
    renderResultScreen(
      <ResultScreen
        result={result}
        resultShareService={null}
        onRestart={vi.fn()}
      />,
    );

    expect(screen.getByRole("heading", { name: "사람들한테 물어보기" })).toBeInTheDocument();
    expect(screen.getByText(/오늘의 핫 Battle에 올라가 의견/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "카톡 보내기" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "다른 앱으로 공유하기" }));
    expect(screen.getByRole("button", { name: "카톡 보내기" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "텔레그램 보내기" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "링크 보내기" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "링크 보내기" }));
    expect(writeText).toHaveBeenCalledWith(expect.stringContaining(result.verdict));
    expect(screen.getByText("공유 링크를 복사했어요.")).toBeInTheDocument();
  });

  it("stores a shared result before link sharing", async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    const resultShareService = {
      createSharedResult: vi.fn().mockResolvedValue({
        id: "shared-1",
        result,
        createdAt: "2026-05-20T12:00:00.000Z",
        expiresAt: "2026-05-27T12:00:00.000Z",
      }),
      getSharedResult: vi.fn(),
      listComments: vi.fn().mockResolvedValue([]),
      addComment: vi.fn().mockResolvedValue({
        id: "comment-1",
        resultId: "shared-1",
        body: "서버 댓글",
        createdAt: "2026-05-20T12:00:01.000Z",
      }),
      getLikeState: vi.fn().mockResolvedValue({
        likeCount: 0,
        hasLiked: false,
      }),
      setLiked: vi.fn().mockResolvedValue({
        likeCount: 1,
        hasLiked: true,
      }),
      listHotBattles: vi.fn(),
    };
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });
    Object.defineProperty(navigator, "share", {
      configurable: true,
      value: undefined,
    });

    renderResultScreen(
      <ResultScreen
        result={result}
        sourceText="A: 늦어서 미안"
        resultShareService={resultShareService}
        onRestart={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { name: "다른 앱으로 공유하기" }));
    await user.click(screen.getByRole("button", { name: "링크 보내기" }));
    expect(writeText).toHaveBeenCalledWith(expect.stringContaining("result=shared-1"));
    expect(resultShareService.createSharedResult).toHaveBeenCalledWith(result, {
      sourceText: "A: 늦어서 미안",
    });
    expect(resultShareService.setLiked).not.toHaveBeenCalled();
    expect(resultShareService.addComment).not.toHaveBeenCalled();
    expect(screen.getByText("공유 링크를 복사했어요.")).toBeInTheDocument();
  });

  it("does not show the objection precedent confirmation before CTA is opened", () => {
    renderResultScreen(
      <ResultScreen
        result={result}
        sourceText="A: 너 때문이야"
        onRestart={vi.fn()}
      />,
    );

    expect(
      screen.queryByLabelText("판례 분석 결제 전 확인"),
    ).not.toBeInTheDocument();
  });

  it("does not show premium precedent CTA for safety results", () => {
    renderResultScreen(
      <ResultScreen
        result={{ ...result, safetyLevel: "caution" }}
        onRestart={vi.fn()}
      />,
    );

    expect(
      screen.queryByRole("button", { name: "990원 내고 판례로 다시 따지기" }),
    ).not.toBeInTheDocument();
  });
});
