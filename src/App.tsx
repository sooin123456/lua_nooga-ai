import type { ChangeEvent } from "react";
import { useRef, useState } from "react";
import "./App.css";
import { analyzeWithRules } from "./features/analyzer/ruleBasedAnalyzer";
import type { JudgmentResult } from "./features/analyzer/types";
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

  const goHome = () => {
    activeReviewIdRef.current += 1;
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

  const handleScreenshotFileChange = async (
    event: ChangeEvent<HTMLInputElement>,
    reviewId: number,
  ) => {
    const file = event.currentTarget.files?.[0];

    if (!file) {
      return;
    }

    const ocrSyncKey = ocrSyncKeyRef.current + 1;
    ocrSyncKeyRef.current = ocrSyncKey;

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
        ocrFileName: file.name,
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

  const renderScreenshotPicker = (
    reviewId: number,
    isOcrPending?: boolean,
    ocrFileName?: string,
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
      </div>
    );
  };

  const handleAnalyze = async (text: string, reviewId: number) => {
    const result = await analyzeWithRules({ text });

    if (reviewId !== activeReviewIdRef.current) {
      return;
    }

    setState({ screen: "result", result });
  };

  if (state.screen === "review") {
    return (
      <TextReview
        initialText={state.initialText}
        initialTextSyncKey={state.ocrDeliveredSyncKey}
        draftSyncKey={state.ocrSyncKey}
        helperText={state.helperText}
        mediaControl={
          state.inputMethod === "screenshot"
            ? renderScreenshotPicker(
                state.reviewId,
                state.isOcrPending,
                state.ocrFileName,
              )
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
