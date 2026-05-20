import { ThemeProvider } from "@toss/tds-mobile";
import { render, screen, waitFor } from "@testing-library/react";
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

function ThemeWrapper({ children }: { children: ReactNode }) {
  return <ThemeProvider>{children}</ThemeProvider>;
}

function renderTextReview(ui: ReactNode) {
  return render(ui, { wrapper: ThemeWrapper });
}

describe("TextReview", () => {
  it("renders an optional media control before the textarea", () => {
    renderTextReview(
      <TextReview
        initialText="A: 확인할 내용"
        mediaControl={<button type="button">이미지 선택</button>}
        onAnalyze={vi.fn()}
        onBack={vi.fn()}
      />,
    );

    const reviewSection = screen.getByRole("region", {
      name: "대화 내용 확인",
    });
    const controls = Array.from(reviewSection.children);

    expect(screen.getByRole("button", { name: "이미지 선택" })).toBeVisible();
    expect(
      controls.indexOf(screen.getByRole("button", { name: "이미지 선택" })),
    ).toBeLessThan(controls.indexOf(screen.getByLabelText("분석할 대화 내용")));
  });

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
    expect(screen.getByLabelText("분석할 대화 내용")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    expect(screen.getByLabelText("분석할 대화 내용")).toHaveAttribute(
      "aria-describedby",
      "analysis-text-error",
    );
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

  it("prevents duplicate submits while analysis is pending", async () => {
    const user = userEvent.setup();
    let resolveAnalyze: () => void = () => undefined;
    const onAnalyze = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveAnalyze = resolve;
        }),
    );

    renderTextReview(
      <TextReview
        initialText="A: 확인할 내용"
        onAnalyze={onAnalyze}
        onBack={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { name: "판정 받기" }));

    expect(screen.getByRole("button", { name: "판정 중..." })).toBeDisabled();
    expect(onAnalyze).toHaveBeenCalledTimes(1);

    resolveAnalyze();
  });

  it("shows a friendly message when analysis submission fails", async () => {
    const user = userEvent.setup();

    renderTextReview(
      <TextReview
        initialText="A: 확인할 내용"
        onAnalyze={vi.fn().mockRejectedValue(new Error("network"))}
        onBack={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { name: "판정 받기" }));

    expect(
      await screen.findByText(
        "판정 중 문제가 생겼어요. 잠시 후 다시 시도해주세요.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "판정 받기" })).toBeEnabled();
  });

  it("syncs new initial text when the draft has not been edited", async () => {
    const { rerender } = renderTextReview(
      <TextReview
        initialText="OCR 대기 중"
        onAnalyze={vi.fn()}
        onBack={vi.fn()}
      />,
    );

    rerender(
      <TextReview
        initialText="OCR로 읽은 새 내용"
        onAnalyze={vi.fn()}
        onBack={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(screen.getByLabelText("분석할 대화 내용")).toHaveValue(
        "OCR로 읽은 새 내용",
      );
    });
  });

  it("preserves the user draft when initial text changes after editing", async () => {
    const user = userEvent.setup();
    const { rerender } = renderTextReview(
      <TextReview
        initialText="OCR 대기 중"
        onAnalyze={vi.fn()}
        onBack={vi.fn()}
      />,
    );

    const textarea = screen.getByLabelText("분석할 대화 내용");
    await user.clear(textarea);
    await user.type(textarea, "사용자가 고친 내용");

    rerender(
      <TextReview
        initialText="OCR로 읽은 새 내용"
        onAnalyze={vi.fn()}
        onBack={vi.fn()}
      />,
    );

    expect(screen.getByLabelText("분석할 대화 내용")).toHaveValue(
      "사용자가 고친 내용",
    );
  });

  it("preserves a user-edited draft even when it matches the previous initial text", async () => {
    const user = userEvent.setup();
    const { rerender } = renderTextReview(
      <TextReview
        initialText="OCR 대기 중"
        onAnalyze={vi.fn()}
        onBack={vi.fn()}
      />,
    );

    const textarea = screen.getByLabelText("분석할 대화 내용");
    await user.clear(textarea);
    await user.type(textarea, "임시 수정");
    await user.clear(textarea);
    await user.type(textarea, "OCR 대기 중");

    rerender(
      <TextReview
        initialText="OCR로 읽은 새 내용"
        onAnalyze={vi.fn()}
        onBack={vi.fn()}
      />,
    );

    expect(screen.getByLabelText("분석할 대화 내용")).toHaveValue(
      "OCR 대기 중",
    );
  });
});
