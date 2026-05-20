import type { ChangeEvent, ClipboardEvent } from "react";
import { useEffect, useRef, useState } from "react";
import "./App.css";
import { analyzeWithRules } from "./features/analyzer/ruleBasedAnalyzer";
import type { JudgmentResult } from "./features/analyzer/types";
import {
  manualTranscriptionAdapter,
  type TranscriptionSource,
} from "./features/audio/audioAdapter";
import { InputHome } from "./features/input/InputHome";
import { inputMethods, type InputMethod } from "./features/input/inputMethods";
import { TextReview } from "./features/input/TextReview";
import {
  extractTextFromImage,
  ocrFailureMessage,
} from "./features/ocr/ocrAdapter";
import { ResultScreen } from "./features/result/ResultScreen";

type AppState =
  | { screen: "home" }
  | {
      screen: "review";
      reviewId: number;
      inputMethod: InputMethod;
      initialText: string;
      helperText?: string;
      isOcrPending?: boolean;
      ocrFileName?: string;
      screenshotPreviewUrl?: string;
      audioFileName?: string;
      ocrSyncKey?: number;
      ocrDeliveredSyncKey?: number;
    }
  | { screen: "result"; result: JudgmentResult };

const starterSampleText = `A: 너는 항상 내 말은 안 듣잖아.
B: 미안해. 말이 셌던 건 인정해.
A: 됐고, 네 탓이야.
B: 다시 차분히 이야기하자.`;

const reviewHelpers: Partial<Record<InputMethod, string>> = {
  screenshot:
    "캡처 이미지를 선택하면 글자를 읽어볼게요. 필요하면 직접 고칠 수 있어요.",
  record:
    "음성 변환 전에도 판정할 텍스트 확인이 필요해요. 지금은 대화를 직접 입력해 주세요.",
  "audio-file":
    "녹음 파일 변환 전에도 텍스트 확인이 필요해요. 지금은 대화를 직접 입력해 주세요.",
};

const ocrSuccessMessage =
  "캡처에서 글자를 읽었어요. 내용을 확인하고 고쳐 주세요.";
const ocrPendingMessage = "캡처에서 글자를 읽고 있어요.";

function App() {
  const [state, setState] = useState<AppState>({ screen: "home" });
  const activeReviewIdRef = useRef(0);
  const ocrSyncKeyRef = useRef(0);
  const screenshotPreviewUrlRef = useRef<string | undefined>(undefined);

  const revokeScreenshotPreviewUrl = () => {
    if (screenshotPreviewUrlRef.current) {
      URL.revokeObjectURL(screenshotPreviewUrlRef.current);
      screenshotPreviewUrlRef.current = undefined;
    }
  };

  const createScreenshotPreviewUrl = (file: File) => {
    if (typeof URL.createObjectURL !== "function") {
      return undefined;
    }

    revokeScreenshotPreviewUrl();

    const previewUrl = URL.createObjectURL(file);
    screenshotPreviewUrlRef.current = previewUrl;
    return previewUrl;
  };

  useEffect(() => revokeScreenshotPreviewUrl, []);

  const goHome = () => {
    activeReviewIdRef.current += 1;
    revokeScreenshotPreviewUrl();
    setState({ screen: "home" });
  };

  const handleSelect = (method: InputMethod) => {
    const selectedMethod = inputMethods.find(({ id }) => id === method);
    const reviewId = activeReviewIdRef.current + 1;
    activeReviewIdRef.current = reviewId;

    setState({
      screen: "review",
      reviewId,
      inputMethod: method,
      initialText: method === "text" ? starterSampleText : "",
      helperText:
        method === "text"
          ? selectedMethod?.description
          : (reviewHelpers[method] ?? selectedMethod?.description),
    });
  };

  const processScreenshotImage = async (file: File, reviewId: number) => {
    const ocrSyncKey = ocrSyncKeyRef.current + 1;
    ocrSyncKeyRef.current = ocrSyncKey;
    const screenshotPreviewUrl = createScreenshotPreviewUrl(file);

    setState((currentState) => {
      if (
        currentState.screen !== "review" ||
        currentState.reviewId !== reviewId
      ) {
        return currentState;
      }

      return {
        ...currentState,
        helperText: ocrPendingMessage,
        isOcrPending: true,
        ocrFileName: file.name || "붙여넣은 이미지",
        screenshotPreviewUrl,
        ocrSyncKey,
      };
    });

    try {
      const extractedText = await extractTextFromImage(file);

      if (reviewId !== activeReviewIdRef.current) {
        return;
      }

      setState((currentState) => {
        if (
          currentState.screen !== "review" ||
          currentState.reviewId !== reviewId ||
          currentState.ocrSyncKey !== ocrSyncKey
        ) {
          return currentState;
        }

        return {
          ...currentState,
          initialText: extractedText,
          helperText: ocrSuccessMessage,
          isOcrPending: false,
          ocrDeliveredSyncKey: ocrSyncKey,
        };
      });
    } catch {
      if (reviewId !== activeReviewIdRef.current) {
        return;
      }

      setState((currentState) => {
        if (
          currentState.screen !== "review" ||
          currentState.reviewId !== reviewId ||
          currentState.ocrSyncKey !== ocrSyncKey
        ) {
          return currentState;
        }

        return {
          ...currentState,
          helperText: ocrFailureMessage,
          isOcrPending: false,
        };
      });
    }
  };

  const handleScreenshotFileChange = async (
    event: ChangeEvent<HTMLInputElement>,
    reviewId: number,
  ) => {
    const file = event.currentTarget.files?.[0];

    if (!file) {
      return;
    }

    await processScreenshotImage(file, reviewId);
  };

  const handleScreenshotPaste = (
    event: ClipboardEvent<HTMLElement>,
    reviewId: number,
  ) => {
    const pastedImageItem = Array.from(event.clipboardData.items).find(
      (item) => item.kind === "file" && item.type.startsWith("image/"),
    );
    const file = pastedImageItem?.getAsFile();

    if (!file) {
      return;
    }

    event.preventDefault();
    void processScreenshotImage(file, reviewId);
  };

  const updateAudioHelper = async (
    reviewId: number,
    input: TranscriptionSource,
  ) => {
    const helperText = await manualTranscriptionAdapter.transcribe(input);

    if (reviewId !== activeReviewIdRef.current) {
      return;
    }

    setState((currentState) => {
      if (
        currentState.screen !== "review" ||
        currentState.reviewId !== reviewId
      ) {
        return currentState;
      }

      return {
        ...currentState,
        helperText,
        audioFileName: input.source === "file" ? input.file.name : undefined,
      };
    });
  };

  const renderScreenshotPicker = (
    reviewId: number,
    isOcrPending?: boolean,
    ocrFileName?: string,
    screenshotPreviewUrl?: string,
  ) => {
    const inputId = `screenshot-file-${reviewId}`;

    return (
      <div className="media-control">
        <label className="media-picker" htmlFor={inputId}>
          캡처 이미지 선택
        </label>
        <input
          id={inputId}
          className="media-picker__input"
          type="file"
          accept="image/*"
          aria-label="캡처 이미지 선택"
          disabled={isOcrPending}
          onChange={(event) => handleScreenshotFileChange(event, reviewId)}
        />
        {ocrFileName ? (
          <p className="media-control__status">
            {isOcrPending ? "읽는 중" : "선택됨"}: {ocrFileName}
          </p>
        ) : null}
        {screenshotPreviewUrl ? (
          <img
            className="media-preview"
            src={screenshotPreviewUrl}
            alt="선택한 캡처 미리보기"
          />
        ) : null}
      </div>
    );
  };

  const renderRecordingControl = (reviewId: number) => (
    <div className="media-control">
      <button
        className="media-button"
        type="button"
        onClick={() =>
          void updateAudioHelper(reviewId, { source: "recording" })
        }
      >
        녹음 흐름 시작하기
      </button>
    </div>
  );

  const renderAudioFilePicker = (reviewId: number, audioFileName?: string) => {
    const inputId = `audio-file-${reviewId}`;

    return (
      <div className="media-control">
        <label className="media-picker" htmlFor={inputId}>
          녹음 파일 선택
        </label>
        <input
          id={inputId}
          className="media-picker__input"
          type="file"
          accept="audio/*"
          aria-label="녹음 파일 선택"
          onChange={(event) => {
            const file = event.currentTarget.files?.[0];

            if (!file) {
              return;
            }

            void updateAudioHelper(reviewId, { source: "file", file });
          }}
        />
        {audioFileName ? (
          <p className="media-control__status">선택됨: {audioFileName}</p>
        ) : null}
      </div>
    );
  };

  const handleAnalyze = async (text: string, reviewId: number) => {
    const result = await analyzeWithRules({ text });

    if (reviewId !== activeReviewIdRef.current) {
      return;
    }

    revokeScreenshotPreviewUrl();
    setState({ screen: "result", result });
  };

  const renderMediaControl = () => {
    if (state.screen !== "review") {
      return undefined;
    }

    if (state.inputMethod === "screenshot") {
      return renderScreenshotPicker(
        state.reviewId,
        state.isOcrPending,
        state.ocrFileName,
        state.screenshotPreviewUrl,
      );
    }

    if (state.inputMethod === "record") {
      return renderRecordingControl(state.reviewId);
    }

    if (state.inputMethod === "audio-file") {
      return renderAudioFilePicker(state.reviewId, state.audioFileName);
    }

    return undefined;
  };

  if (state.screen === "review") {
    return (
      <TextReview
        initialText={state.initialText}
        initialTextSyncKey={state.ocrDeliveredSyncKey}
        draftSyncKey={state.ocrSyncKey}
        helperText={state.helperText}
        mediaControl={renderMediaControl()}
        onPaste={
          state.inputMethod === "screenshot"
            ? (event) => handleScreenshotPaste(event, state.reviewId)
            : undefined
        }
        onAnalyze={(text) => handleAnalyze(text, state.reviewId)}
        onBack={goHome}
      />
    );
  }

  if (state.screen === "result") {
    return <ResultScreen result={state.result} onRestart={goHome} />;
  }

  return <InputHome onSelect={handleSelect} />;
}

export default App;
