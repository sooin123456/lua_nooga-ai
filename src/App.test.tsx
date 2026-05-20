import { ThemeProvider } from "@toss/tds-mobile";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
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

async function renderAppHome(user: ReturnType<typeof userEvent.setup>) {
  render(
    <ThemeProvider>
      <App />
    </ThemeProvider>,
  );

  await user.click(screen.getByRole("button", { name: "판정 시작하기" }));
}

describe("App text review flow", () => {
  it("starts on the intro screen before showing the main dashboard", async () => {
    const user = userEvent.setup();

    render(
      <ThemeProvider>
        <App />
      </ThemeProvider>,
    );

    expect(
      screen.getByRole("button", { name: "판정 시작하기" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /카톡 싸움 붙여넣기/ }),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "판정 시작하기" }));

    expect(
      screen.getByRole("button", { name: /카톡 싸움 붙여넣기/ }),
    ).toBeInTheDocument();
    expect(screen.getByText("최근 판정")).toBeInTheDocument();
    expect(screen.getByText("990원 판례 판독")).toBeInTheDocument();
    expect(screen.getByText(/현재 무료 판독은 입력 내용을/)).toBeInTheDocument();
  });

  it("runs OCR for a pasted screenshot image and fills review text", async () => {
    const user = userEvent.setup();
    vi.mocked(extractTextFromImage).mockResolvedValue(
      "A: 붙여넣은 캡처\nB: 확인했어",
    );

    await renderAppHome(user);

    await user.click(
      screen.getByRole("button", { name: /증거 캡처 제출하기/ }),
    );

    const pastedFile = new File(["pasted image bytes"], "pasted-chat.png", {
      type: "image/png",
    });

    fireEvent.paste(screen.getByLabelText("분석할 대화 내용"), {
      clipboardData: {
        items: [
          {
            kind: "file",
            type: "image/png",
            getAsFile: () => pastedFile,
          },
        ],
      },
    });

    expect(extractTextFromImage).toHaveBeenCalledWith(pastedFile);

    await waitFor(() => {
      expect(screen.getByLabelText("분석할 대화 내용")).toHaveValue(
        "A: 붙여넣은 캡처\nB: 확인했어",
      );
    });
    expect(
      screen.getByText(
        "캡처에서 글자를 읽었어요. 내용을 확인하고 고쳐 주세요.",
      ),
    ).toBeInTheDocument();
  });

  it("runs OCR for a selected screenshot and fills review text", async () => {
    const user = userEvent.setup();
    vi.mocked(extractTextFromImage).mockResolvedValue("A: 사과해\nB: 미안해");

    await renderAppHome(user);

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

    await renderAppHome(user);

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

  it("keeps the pasted screenshot preview visible when OCR fails", async () => {
    const user = userEvent.setup();
    vi.mocked(extractTextFromImage).mockRejectedValue(
      new Error(ocrFailureMessage),
    );
    vi.spyOn(URL, "createObjectURL").mockReturnValue(
      "blob:http://localhost/pasted-chat",
    );
    const revokeObjectUrl = vi
      .spyOn(URL, "revokeObjectURL")
      .mockImplementation(() => undefined);

    await renderAppHome(user);

    await user.click(
      screen.getByRole("button", { name: /증거 캡처 제출하기/ }),
    );

    const pastedFile = new File(["pasted image bytes"], "pasted-chat.png", {
      type: "image/png",
    });

    fireEvent.paste(screen.getByLabelText("분석할 대화 내용"), {
      clipboardData: {
        items: [
          {
            kind: "file",
            type: "image/png",
            getAsFile: () => pastedFile,
          },
        ],
      },
    });

    expect(await screen.findByText(ocrFailureMessage)).toBeInTheDocument();
    expect(screen.getByAltText("선택한 캡처 미리보기")).toHaveAttribute(
      "src",
      "blob:http://localhost/pasted-chat",
    );

    await user.type(
      screen.getByLabelText("분석할 대화 내용"),
      "직접 적은 대화",
    );
    expect(screen.getByLabelText("분석할 대화 내용")).toHaveValue(
      "직접 적은 대화",
    );

    await user.click(screen.getByRole("button", { name: "돌아가기" }));

    expect(revokeObjectUrl).toHaveBeenCalledWith(
      "blob:http://localhost/pasted-chat",
    );
  });

  it("replaces a previous manual edit with a newly selected screenshot OCR result", async () => {
    const user = userEvent.setup();
    vi.mocked(extractTextFromImage).mockResolvedValue(
      "A: 새 캡처 내용\nB: 확인했어",
    );

    await renderAppHome(user);

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

    await renderAppHome(user);

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

    await renderAppHome(user);

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

    await renderAppHome(user);

    await user.click(
      screen.getByRole("button", { name: /카톡 싸움 붙여넣기/ }),
    );
    await user.click(
      screen.getByRole("button", { name: /무료\s*판독\s*받기/ }),
    );
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
      expect(screen.getByText("누가 잘못 AI")).toBeInTheDocument();
    });

    expect(screen.queryByText("임시 판독 결과")).not.toBeInTheDocument();
  });

  it("shows free verdict result with reward and premium preview sections", async () => {
    const user = userEvent.setup();
    vi.mocked(analyzeWithRules).mockResolvedValue({
      verdict: "A가 55% 정도 더 선 넘었어요",
      partyAPercent: 55,
      partyBPercent: 45,
      reasons: ["첫 번째 이유", "두 번째 이유", "세 번째 이유"],
      advice: "천천히 다시 이야기해 보세요.",
      safetyLevel: "normal",
    });

    await renderAppHome(user);

    expect(screen.getByText("누가 잘못 AI")).toBeInTheDocument();
    expect(screen.getByText("최근 판정")).toBeInTheDocument();
    expect(screen.getByText("990원 판례 판독")).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: /카톡 싸움 붙여넣기/ }),
    );
    await user.click(
      screen.getByRole("button", { name: /무료\s*판독\s*받기/ }),
    );

    expect(await screen.findByText("오늘의 판결")).toBeInTheDocument();
    expect(screen.getByLabelText("A 55%, B 45%")).toBeInTheDocument();
    expect(screen.getByText("증거 1")).toBeInTheDocument();
    expect(screen.getByText("이긴 사람 보상 추천")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "결제 없이 판례 판독 미리보기" }),
    ).toBeInTheDocument();

    await user.type(screen.getByLabelText("이긴 사람이 받고 싶은 것"), "달달한 거");
    await user.click(screen.getByRole("button", { name: "보상 추천 받기" }));

    expect(screen.getByText("디저트/간식")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "토스 쇼핑 연결 준비 중" }),
    ).toBeDisabled();

    await user.click(
      screen.getByRole("button", { name: "결제 없이 판례 판독 미리보기" }),
    );

    expect(screen.getByText("인앱결제 연결 예정")).toBeInTheDocument();
    expect(screen.getByText("판례 검색 서버 연결 예정")).toBeInTheDocument();
  });

  it("shows a manual transcription message when starting the recording flow", async () => {
    const user = userEvent.setup();

    await renderAppHome(user);

    await user.click(screen.getByRole("button", { name: /현장 녹음 시작/ }));
    await user.click(
      screen.getByRole("button", { name: "녹음 흐름 시작하기" }),
    );

    expect(screen.getByText(/녹음 흐름을 시작했어요/)).toHaveTextContent(
      "직접",
    );

    await user.type(
      screen.getByLabelText("분석할 대화 내용"),
      "A: 녹음 후 직접 입력",
    );
    expect(screen.getByLabelText("분석할 대화 내용")).toHaveValue(
      "A: 녹음 후 직접 입력",
    );
  });

  it("shows a manual transcription message with the selected audio file name", async () => {
    const user = userEvent.setup();

    await renderAppHome(user);

    await user.click(
      screen.getByRole("button", { name: /녹음 파일 불러오기/ }),
    );

    const file = new File(["audio bytes"], "fight-recording.m4a", {
      type: "audio/mp4",
    });
    await user.upload(screen.getByLabelText("녹음 파일 선택"), file);

    expect(
      screen.getByText(/fight-recording\.m4a 내용을 들은 뒤/),
    ).toHaveTextContent("직접");

    await user.type(
      screen.getByLabelText("분석할 대화 내용"),
      "A: 파일 듣고 직접 입력",
    );
    expect(screen.getByLabelText("분석할 대화 내용")).toHaveValue(
      "A: 파일 듣고 직접 입력",
    );
  });
});
