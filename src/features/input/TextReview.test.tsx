import { ThemeProvider } from "@toss/tds-mobile";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { TextReview } from "./TextReview";

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

function renderTextReview(ui: ReactNode) {
  return render(<ThemeProvider>{ui}</ThemeProvider>);
}

describe("TextReview", () => {
  it("requires text before analysis", async () => {
    const user = userEvent.setup();
    const onAnalyze = vi.fn();

    renderTextReview(
      <TextReview initialText="   " onAnalyze={onAnalyze} onBack={vi.fn()} />,
    );

    await user.click(screen.getByRole("button", { name: "판정 받기" }));

    expect(
      screen.getByText("판정할 내용을 먼저 입력해주세요."),
    ).toBeInTheDocument();
    expect(onAnalyze).not.toHaveBeenCalled();
  });

  it("submits edited text", async () => {
    const user = userEvent.setup();
    const onAnalyze = vi.fn();

    renderTextReview(
      <TextReview
        initialText="A: 처음 내용"
        onAnalyze={onAnalyze}
        onBack={vi.fn()}
      />,
    );

    const textarea = screen.getByLabelText("분석할 대화 내용");
    await user.clear(textarea);
    await user.type(textarea, "  A: 미안해\nB: 다시 이야기하자  ");
    await user.click(screen.getByRole("button", { name: "판정 받기" }));

    expect(onAnalyze).toHaveBeenCalledWith("A: 미안해\nB: 다시 이야기하자");
  });
});
