import { ThemeProvider } from "@toss/tds-mobile";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeAll, describe, expect, it, vi } from "vitest";
import App from "./App";
import { analyzeWithRules } from "./features/analyzer/ruleBasedAnalyzer";
import {
  extractTextFromImage,
  ocrFailureMessage,
} from "./features/ocr/ocrAdapter";

vi.mock("./features/analyzer/ruleBasedAnalyzer", () => ({
  analyzeWithRules: vi.fn(),
}));

vi.mock("./features/ocr/ocrAdapter", () => ({
  ocrFailureMessage: "이미지에서 글자를 읽지 못했어요. 직접 입력해 주세요.",
  extractTextFromImage: vi.fn(),
}));

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

describe("App text review flow", () => {
  it("runs OCR for a selected screenshot and fills review text", async () => {
    const user = userEvent.setup();
    vi.mocked(extractTextFromImage).mockResolvedValue("A: 사과해\nB: 미안해");

    render(
      <ThemeProvider>
        <App />
      </ThemeProvider>,
    );

    await user.click(
      screen.getByRole("button", { name: /증거 캡처 제출하기/ }),
    );

    const file = new File(["image bytes"], "chat.png", { type: "image/png" });
    await user.upload(screen.getByLabelText("캡처 이미지 선택"), file);

    expect(extractTextFromImage).toHaveBeenCalledWith(file);

    await waitFor(() => {
      expect(screen.getByLabelText("분석할 대화 내용")).toHaveValue(
        "A: 사과해\nB: 미안해",
      );
    });
    expect(
      screen.getByText(
        "캡처에서 글자를 읽었어요. 내용을 확인하고 고쳐 주세요.",
      ),
    ).toBeInTheDocument();
  });

  it("shows a friendly OCR failure and still allows manual entry", async () => {
    const user = userEvent.setup();
    vi.mocked(extractTextFromImage).mockRejectedValue(
      new Error(ocrFailureMessage),
    );

    render(
      <ThemeProvider>
        <App />
      </ThemeProvider>,
    );

    await user.click(
      screen.getByRole("button", { name: /증거 캡처 제출하기/ }),
    );

    const file = new File(["image bytes"], "chat.png", { type: "image/png" });
    await user.upload(screen.getByLabelText("캡처 이미지 선택"), file);

    expect(await screen.findByText(ocrFailureMessage)).toBeInTheDocument();

    await user.type(
      screen.getByLabelText("분석할 대화 내용"),
      "직접 적은 대화",
    );

    expect(screen.getByLabelText("분석할 대화 내용")).toHaveValue(
      "직접 적은 대화",
    );
  });

  it("replaces a previous manual edit with a newly selected screenshot OCR result", async () => {
    const user = userEvent.setup();
    vi.mocked(extractTextFromImage).mockResolvedValue(
      "A: 새 캡처 내용\nB: 확인했어",
    );

    render(
      <ThemeProvider>
        <App />
      </ThemeProvider>,
    );

    await user.click(
      screen.getByRole("button", { name: /증거 캡처 제출하기/ }),
    );
    await user.type(
      screen.getByLabelText("분석할 대화 내용"),
      "이전 수동 입력",
    );

    const file = new File(["new image bytes"], "new-chat.png", {
      type: "image/png",
    });
    await user.upload(screen.getByLabelText("캡처 이미지 선택"), file);

    await waitFor(() => {
      expect(screen.getByLabelText("분석할 대화 내용")).toHaveValue(
        "A: 새 캡처 내용\nB: 확인했어",
      );
    });
  });

  it("does not replace a manual edit made after screenshot OCR starts", async () => {
    const user = userEvent.setup();
    let resolveOcr: (text: string) => void = () => undefined;
    vi.mocked(extractTextFromImage).mockReturnValue(
      new Promise((resolve) => {
        resolveOcr = resolve;
      }),
    );

    render(
      <ThemeProvider>
        <App />
      </ThemeProvider>,
    );

    await user.click(
      screen.getByRole("button", { name: /증거 캡처 제출하기/ }),
    );

    const file = new File(["image bytes"], "slow-chat.png", {
      type: "image/png",
    });
    await user.upload(screen.getByLabelText("캡처 이미지 선택"), file);
    await user.type(
      screen.getByLabelText("분석할 대화 내용"),
      "OCR 기다리다 직접 입력",
    );

    resolveOcr("A: 늦게 도착한 OCR");

    await waitFor(() => {
      expect(screen.getByText("선택됨: slow-chat.png")).toBeInTheDocument();
    });
    expect(screen.getByLabelText("분석할 대화 내용")).toHaveValue(
      "OCR 기다리다 직접 입력",
    );
  });

  it("replaces a previous manual edit when a new screenshot resolves to the same OCR text", async () => {
    const user = userEvent.setup();
    const repeatedOcrText = "A: 같은 OCR 내용\nB: 다시 확인";
    vi.mocked(extractTextFromImage).mockResolvedValue(repeatedOcrText);

    render(
      <ThemeProvider>
        <App />
      </ThemeProvider>,
    );

    await user.click(
      screen.getByRole("button", { name: /증거 캡처 제출하기/ }),
    );

    await user.upload(
      screen.getByLabelText("캡처 이미지 선택"),
      new File(["first image bytes"], "first-chat.png", { type: "image/png" }),
    );
    await waitFor(() => {
      expect(screen.getByLabelText("분석할 대화 내용")).toHaveValue(
        repeatedOcrText,
      );
    });

    await user.clear(screen.getByLabelText("분석할 대화 내용"));
    await user.type(
      screen.getByLabelText("분석할 대화 내용"),
      "직접 고친 내용",
    );

    await user.upload(
      screen.getByLabelText("캡처 이미지 선택"),
      new File(["second image bytes"], "second-chat.png", {
        type: "image/png",
      }),
    );

    await waitFor(() => {
      expect(screen.getByLabelText("분석할 대화 내용")).toHaveValue(
        repeatedOcrText,
      );
    });
  });

  it("keeps home visible when a stale analysis resolves after going back", async () => {
    const user = userEvent.setup();
    let resolveAnalyze: (
      value: Awaited<ReturnType<typeof analyzeWithRules>>,
    ) => void = () => undefined;

    vi.mocked(analyzeWithRules).mockReturnValue(
      new Promise((resolve) => {
        resolveAnalyze = resolve;
      }),
    );

    render(
      <ThemeProvider>
        <App />
      </ThemeProvider>,
    );

    await user.click(
      screen.getByRole("button", { name: /카톡 싸움 붙여넣기/ }),
    );
    await user.click(screen.getByRole("button", { name: "판정 받기" }));
    await user.click(screen.getByRole("button", { name: "돌아가기" }));

    resolveAnalyze({
      verdict: "A가 55% 정도 더 선 넘었어요",
      partyAPercent: 55,
      partyBPercent: 45,
      reasons: ["첫 번째 이유", "두 번째 이유", "세 번째 이유"],
      advice: "천천히 다시 이야기해 보세요.",
      safetyLevel: "normal",
    });

    await waitFor(() => {
      expect(screen.getByText("미스터 노우")).toBeInTheDocument();
    });

    expect(screen.queryByText("임시 판정 결과")).not.toBeInTheDocument();
  });
});
