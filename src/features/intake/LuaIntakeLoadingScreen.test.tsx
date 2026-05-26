import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { LuaIntakeLoadingScreen } from "./LuaIntakeLoadingScreen";

describe("LuaIntakeLoadingScreen", () => {
  it("shows Lua intake progress copy", () => {
    render(<LuaIntakeLoadingScreen onBack={vi.fn()} />);

    expect(
      screen.getByText("루아가 싸움 일지를 정리하고 있어요"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("카톡 말투와 앞뒤 상황을 A/B 주장으로 나누는 중이에요."),
    ).toBeInTheDocument();
  });

  it("shows fallback notice when provided", () => {
    render(
      <LuaIntakeLoadingScreen
        fallbackMessage="간단 정리로 먼저 진행할게요."
        onBack={vi.fn()}
      />,
    );

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
