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

function ThemeWrapper({ children }: { children: ReactNode }) {
  return <ThemeProvider>{children}</ThemeProvider>;
}

function renderResultScreen(ui: ReactNode) {
  return render(ui, { wrapper: ThemeWrapper });
}

describe("ResultScreen", () => {
  it("shows verdict, percentages, exactly three reasons, advice, and disclaimer", () => {
    renderResultScreen(
      <ResultScreen
        result={result}
        resultShareService={null}
        onRestart={vi.fn()}
      />,
    );

    expect(screen.getByText("오늘의 판독")).toBeInTheDocument();
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

  it("supports lightweight likes, comments, and sharing", async () => {
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

    expect(screen.getByRole("heading", { name: "0개의 댓글" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "추천 0" }));
    expect(screen.getByRole("button", { name: "추천 1" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    await user.type(screen.getByLabelText("판독 결과 댓글"), "이건 인정");
    await user.click(screen.getByRole("button", { name: "등록" }));
    expect(screen.getByText("이건 인정")).toBeInTheDocument();
    expect(screen.getByText("답글 0개")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "판독 결과 공유하기" }));
    expect(writeText).toHaveBeenCalledWith(expect.stringContaining(result.verdict));
    expect(screen.getByText("판독 결과를 공유할 수 있게 준비했어요.")).toBeInTheDocument();
  });

  it("blocks public comments that cross the line", async () => {
    const user = userEvent.setup();

    renderResultScreen(
      <ResultScreen
        result={result}
        resultShareService={null}
        onRestart={vi.fn()}
      />,
    );

    await user.type(screen.getByLabelText("판독 결과 댓글"), "진짜 죽여버려");
    await user.click(screen.getByRole("button", { name: "등록" }));

    expect(
      screen.getByText("선넘었어요. 댓글은 가볍게 남겨주세요."),
    ).toBeInTheDocument();
    expect(screen.queryByText("익명 1")).not.toBeInTheDocument();
  });

  it("stores reactions through the result share service before sharing", async () => {
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
        resultShareService={resultShareService}
        onRestart={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { name: "추천 0" }));
    expect(await screen.findByRole("button", { name: "추천 1" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(resultShareService.createSharedResult).toHaveBeenCalledWith(result);
    expect(resultShareService.setLiked).toHaveBeenCalledWith("shared-1", true);

    await user.type(screen.getByLabelText("판독 결과 댓글"), "서버 댓글");
    await user.click(screen.getByRole("button", { name: "등록" }));
    expect(await screen.findByText("서버 댓글")).toBeInTheDocument();
    expect(resultShareService.addComment).toHaveBeenCalledWith(
      "shared-1",
      "서버 댓글",
    );

    await user.click(screen.getByRole("button", { name: "판독 결과 공유하기" }));
    expect(writeText).toHaveBeenCalledWith(expect.stringContaining("result=shared-1"));
    expect(
      screen.getByText("공유 가능한 판독 결과 링크를 준비했어요."),
    ).toBeInTheDocument();
  });

  it("does not show the objection precedent panel on the result screen", () => {
    renderResultScreen(
      <ResultScreen
        result={result}
        sourceText="A: 너 때문이야"
        onRestart={vi.fn()}
      />,
    );

    expect(screen.queryByText("판정이 억울한가요?")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "억울하면 판례로 다시 따지기" }),
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
