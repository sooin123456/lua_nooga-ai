import { ThemeProvider } from "@toss/tds-mobile";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { beforeAll, describe, expect, it, vi } from "vitest";
import type { IncidentIntakeSummary } from "../intake/incidentIntake";
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

const incidentSummary: IncidentIntakeSummary = {
  title: "답장 지연으로 시작된 싸움",
  topic: "reply",
  partyA: "첫 번째 사람",
  partyB: "두 번째 사람",
  partyAClaim: "답장이 늦어서 서운했어요.",
  partyBClaim: "회의 중이라 바로 답하지 못했어요.",
  issues: ["답장 지연", "사전 설명", "말투"],
  missingQuestions: ["회의 시간이 미리 공유됐나요?"],
  completeness: "needs_context",
  normalizedDialogue: ["A: 왜 답장을 안 해?", "B: 회의였어"],
  judgeText: "[루아 사건 접수서]\n답장 지연으로 시작된 싸움",
};

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

  it("requires text before preparing an incident", async () => {
    const user = userEvent.setup();
    const onAnalyze = vi.fn();
    const onPrepareIncident = vi.fn();

    renderTextReview(
      <TextReview
        initialText="   "
        onAnalyze={onAnalyze}
        onPrepareIncident={onPrepareIncident}
        onBack={vi.fn()}
      />,
    );

    expect(screen.getByText("루아 사건 접수실")).toBeInTheDocument();
    expect(screen.getByText("싸움 자료를 넣어주세요")).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: "루아가 사건 정리하기" }),
    );

    expect(
      screen.getByText("판독할 내용을 먼저 입력해주세요."),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("분석할 대화 내용")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    expect(onPrepareIncident).not.toHaveBeenCalled();
    expect(onAnalyze).not.toHaveBeenCalled();
  });

  it("prepares an incident card and submits the judge text", async () => {
    const user = userEvent.setup();
    const onAnalyze = vi.fn();
    const onPrepareIncident = vi.fn().mockResolvedValue(incidentSummary);

    renderTextReview(
      <TextReview
        initialText={"A: 왜 답장을 안 해?\nB: 회의였어"}
        onAnalyze={onAnalyze}
        onPrepareIncident={onPrepareIncident}
        onBack={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { name: "연락" }));
    await user.type(
      screen.getByRole("textbox", { name: "추가 맥락" }),
      "연락 문제로 자주 다퉜어요.",
    );
    await user.click(
      screen.getByRole("button", { name: "루아가 사건 정리하기" }),
    );

    expect(onPrepareIncident).toHaveBeenCalledWith({
      text: "A: 왜 답장을 안 해?\nB: 회의였어",
      topic: "reply",
      extraContext: "연락 문제로 자주 다퉜어요.",
      userPerspective: "unknown",
    });
    expect(await screen.findByText("루아가 정리한 사건")).toBeInTheDocument();
    expect(screen.getByText("답장 지연")).toBeInTheDocument();
    expect(screen.getByText("A: 왜 답장을 안 해?")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "이대로 판독하기" }));

    expect(onAnalyze).toHaveBeenCalledWith(
      incidentSummary.judgeText,
      "unknown",
    );
  });

  it("submits the selected first-person perspective to intake and analysis", async () => {
    const user = userEvent.setup();
    const onAnalyze = vi.fn();
    const onPrepareIncident = vi.fn().mockResolvedValue(incidentSummary);

    renderTextReview(
      <TextReview
        initialText="A: 미안해"
        onAnalyze={onAnalyze}
        onPrepareIncident={onPrepareIncident}
        onBack={vi.fn()}
      />,
    );

    await user.click(
      screen.getByRole("button", { name: "나는 첫 번째 사람이에요" }),
    );
    await user.click(
      screen.getByRole("button", { name: "루아가 사건 정리하기" }),
    );
    await user.click(
      await screen.findByRole("button", { name: "이대로 판독하기" }),
    );

    expect(onPrepareIncident).toHaveBeenCalledWith(
      expect.objectContaining({ userPerspective: "first" }),
    );
    expect(onAnalyze).toHaveBeenCalledWith(incidentSummary.judgeText, "first");
  });

  it("prevents duplicate incident preparation while pending", async () => {
    const user = userEvent.setup();
    let resolvePrepare: (summary: IncidentIntakeSummary) => void = () =>
      undefined;
    const onPrepareIncident = vi.fn(
      () =>
        new Promise<IncidentIntakeSummary>((resolve) => {
          resolvePrepare = resolve;
        }),
    );

    renderTextReview(
      <TextReview
        initialText="A: 확인할 내용"
        onAnalyze={vi.fn()}
        onPrepareIncident={onPrepareIncident}
        onBack={vi.fn()}
      />,
    );

    await user.click(
      screen.getByRole("button", { name: "루아가 사건 정리하기" }),
    );

    expect(
      screen.getByRole("button", { name: "루아가 정리 중..." }),
    ).toBeDisabled();
    expect(onPrepareIncident).toHaveBeenCalledTimes(1);

    resolvePrepare(incidentSummary);
  });

  it("shows a friendly message when incident preparation fails", async () => {
    const user = userEvent.setup();

    renderTextReview(
      <TextReview
        initialText="A: 확인할 내용"
        onAnalyze={vi.fn()}
        onPrepareIncident={vi.fn().mockRejectedValue(new Error("network"))}
        onBack={vi.fn()}
      />,
    );

    await user.click(
      screen.getByRole("button", { name: "루아가 사건 정리하기" }),
    );

    expect(
      await screen.findByText(
        "사건 정리 중 문제가 생겼어요. 잠시 후 다시 시도해주세요.",
      ),
    ).toBeInTheDocument();
  });

  it("shows a friendly message when analysis submission fails", async () => {
    const user = userEvent.setup();

    renderTextReview(
      <TextReview
        initialText="A: 확인할 내용"
        onAnalyze={vi.fn().mockRejectedValue(new Error("network"))}
        onPrepareIncident={vi.fn().mockResolvedValue(incidentSummary)}
        onBack={vi.fn()}
      />,
    );

    await user.click(
      screen.getByRole("button", { name: "루아가 사건 정리하기" }),
    );
    await user.click(
      await screen.findByRole("button", { name: "이대로 판독하기" }),
    );

    expect(
      await screen.findByText(
        "판독 중 문제가 생겼어요. 잠시 후 다시 시도해주세요.",
      ),
    ).toBeInTheDocument();
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
