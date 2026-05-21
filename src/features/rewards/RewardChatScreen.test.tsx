import { ThemeProvider } from "@toss/tds-mobile";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { JudgmentResult } from "../analyzer/types";
import { RewardChatScreen } from "./RewardChatScreen";

const result: JudgmentResult = {
  verdict: "A가 72% 선넘었어요",
  partyAPercent: 72,
  partyBPercent: 28,
  reasons: ["말이 셌어요", "사과가 늦었어요", "대화를 끊었어요"],
  advice: "먼저 사과하고 다시 이야기해 보세요.",
  safetyLevel: "normal",
};

function ThemeWrapper({ children }: { children: ReactNode }) {
  return <ThemeProvider>{children}</ThemeProvider>;
}

function renderRewardChat(ui: ReactNode) {
  return render(ui, { wrapper: ThemeWrapper });
}

describe("RewardChatScreen", () => {
  beforeEach(() => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
    });
    Object.defineProperty(navigator, "share", {
      configurable: true,
      value: undefined,
    });
  });

  it("starts with a Lua chat prompt based on the judgment result", () => {
    renderRewardChat(
      <RewardChatScreen result={result} onBack={vi.fn()} onHome={vi.fn()} />,
    );

    expect(screen.getByText("루아 보상 상담소")).toBeInTheDocument();
    expect(
      screen.getByAltText("하얀 단발머리에 판사 가발을 쓰고 망치를 든 루아 AI"),
    ).toBeInTheDocument();
    expect(screen.getByText("루아의 보상 판결")).toBeInTheDocument();
    expect(screen.getByText(/A가 72% 선넘었어요/)).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "받고 싶은 보상" })).toBeInTheDocument();
    expect(screen.queryByText("STEP 1")).not.toBeInTheDocument();
  });

  it("shows Toss product recommendations classified by blame severity", async () => {
    const user = userEvent.setup();
    renderRewardChat(
      <RewardChatScreen result={result} onBack={vi.fn()} onHome={vi.fn()} />,
    );

    await user.type(screen.getByRole("textbox", { name: "받고 싶은 보상" }), "달달한 거");
    await user.click(screen.getByRole("button", { name: "루아에게 골라달라 하기" }));

    expect(screen.getByText("잘못 정도별 토스 상품 추천")).toBeInTheDocument();
    expect(screen.queryByText("문의 메시지 작성")).not.toBeInTheDocument();
    expect(screen.getByText("선택한 토스 상품 3개")).toBeInTheDocument();
    expect(screen.getByText("커피/디저트급")).toBeInTheDocument();
    expect(screen.getByText("가벼운 사과")).toBeInTheDocument();
    expect(screen.getByText("적정 보상")).toBeInTheDocument();
    expect(screen.getByText("확실한 사과")).toBeInTheDocument();
    expect(screen.getAllByText("토스 상품 추천")).toHaveLength(3);
    expect(screen.getAllByRole("checkbox", { checked: true })).toHaveLength(3);
    expect(
      screen.getByRole<HTMLTextAreaElement>("textbox", {
        name: "상대방에게 보낼 메시지",
      }).value,
    ).toContain("달달한 거");
    expect(screen.getByRole("button", { name: "3개 상품 링크 보내기" })).toBeInTheDocument();
  });

  it("copies the selected reward inquiry message for the other person", async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });
    renderRewardChat(
      <RewardChatScreen result={result} onBack={vi.fn()} onHome={vi.fn()} />,
    );

    await user.type(screen.getByRole("textbox", { name: "받고 싶은 보상" }), "커피");
    await user.click(screen.getByRole("button", { name: "루아에게 골라달라 하기" }));
    await user.click(screen.getByLabelText("가벼운 사과 선택"));
    await user.click(screen.getByRole("button", { name: "2개 상품 링크 보내기" }));

    expect(writeText).toHaveBeenCalledWith(expect.stringContaining("루아 AI 보상 판결"));
    expect(writeText).toHaveBeenCalledWith(expect.not.stringContaining("가벼운 사과"));
    expect(screen.getByRole("status")).toHaveTextContent(
      "상대방에게 보낼 보상 링크를 준비했어요.",
    );
  });

  it("returns to the result screen", async () => {
    const user = userEvent.setup();
    const onBack = vi.fn();
    renderRewardChat(
      <RewardChatScreen result={result} onBack={onBack} onHome={vi.fn()} />,
    );

    await user.click(screen.getByRole("button", { name: "판정 결과로 돌아가기" }));

    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it("returns directly to the home screen", async () => {
    const user = userEvent.setup();
    const onHome = vi.fn();
    renderRewardChat(
      <RewardChatScreen result={result} onBack={vi.fn()} onHome={onHome} />,
    );

    await user.click(screen.getByRole("button", { name: "홈으로 돌아가기" }));

    expect(onHome).toHaveBeenCalledTimes(1);
  });
});
