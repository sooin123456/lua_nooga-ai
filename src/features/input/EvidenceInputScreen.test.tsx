import { ThemeProvider } from "@toss/tds-mobile";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { EvidenceInputScreen } from "./EvidenceInputScreen";

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

describe("EvidenceInputScreen", () => {
  it("requires evidence before submit", async () => {
    const user = userEvent.setup();
    const onSubmitEvidence = vi.fn();

    renderScreen(
      <EvidenceInputScreen
        initialText=" "
        onSubmitEvidence={onSubmitEvidence}
        onBack={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { name: "루아에게 보내기" }));

    expect(
      screen.getByText("루아에게 보낼 내용을 먼저 넣어주세요."),
    ).toBeInTheDocument();
    expect(onSubmitEvidence).not.toHaveBeenCalled();
  });

  it("submits trimmed evidence with topic, extra context, and perspective", async () => {
    const user = userEvent.setup();
    const onSubmitEvidence = vi.fn();

    renderScreen(
      <EvidenceInputScreen
        initialText="  A: 왜 답장을 안 해?  "
        onSubmitEvidence={onSubmitEvidence}
        onBack={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { name: "연락" }));
    await user.click(
      screen.getByRole("button", { name: "나는 첫 번째 사람이에요" }),
    );
    await user.type(
      screen.getByRole("textbox", { name: "추가 맥락" }),
      "연락 문제로 자주 다퉜어요.",
    );
    await user.click(screen.getByRole("button", { name: "루아에게 보내기" }));

    expect(onSubmitEvidence).toHaveBeenCalledWith({
      text: "A: 왜 답장을 안 해?",
      topic: "reply",
      extraContext: "연락 문제로 자주 다퉜어요.",
      userPerspective: "first",
    });
  });

  it("renders media control before the textarea", () => {
    renderScreen(
      <EvidenceInputScreen
        initialText="A: 캡처 대기"
        mediaControl={<button type="button">이미지 선택</button>}
        onSubmitEvidence={vi.fn()}
        onBack={vi.fn()}
      />,
    );

    const section = screen.getByRole("region", { name: "자료 입력" });
    const controls = Array.from(section.children);

    expect(
      controls.indexOf(screen.getByRole("button", { name: "이미지 선택" })),
    ).toBeLessThan(controls.indexOf(screen.getByLabelText("분석할 대화 내용")));
  });

  it("syncs new initial text when the user has not edited the draft", async () => {
    const { rerender } = renderScreen(
      <EvidenceInputScreen
        initialText="OCR 대기 중"
        onSubmitEvidence={vi.fn()}
        onBack={vi.fn()}
      />,
    );

    rerender(
      <ThemeProvider>
        <EvidenceInputScreen
          initialText="OCR로 읽은 새 내용"
          onSubmitEvidence={vi.fn()}
          onBack={vi.fn()}
        />
      </ThemeProvider>,
    );

    await waitFor(() => {
      expect(screen.getByLabelText("분석할 대화 내용")).toHaveValue(
        "OCR로 읽은 새 내용",
      );
    });
  });
});
