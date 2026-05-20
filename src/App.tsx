import { useRef, useState } from "react";
import "./App.css";
import { analyzeWithRules } from "./features/analyzer/ruleBasedAnalyzer";
import type { JudgmentResult } from "./features/analyzer/types";
import { InputHome } from "./features/input/InputHome";
import { inputMethods, type InputMethod } from "./features/input/inputMethods";
import { TextReview } from "./features/input/TextReview";
import { ResultScreen } from "./features/result/ResultScreen";

type AppState =
  | { screen: "home" }
  | {
      screen: "review";
      reviewId: number;
      initialText: string;
      helperText?: string;
    }
  | { screen: "result"; result: JudgmentResult };

const starterSampleText = `A: 너는 항상 내 말은 안 듣잖아.
B: 미안해. 말이 셌던 건 인정해.
A: 됐고, 네 탓이야.
B: 다시 차분히 이야기하자.`;

const reviewHelpers: Partial<Record<InputMethod, string>> = {
  screenshot:
    "OCR은 다음 단계에서 붙을 예정이에요. 지금은 캡처 속 대화를 직접 붙여넣어 주세요.",
  record: "음성 변환 전에도 판정할 텍스트 확인이 필요해요. 지금은 대화를 직접 입력해 주세요.",
  "audio-file":
    "녹음 파일 변환 전에도 텍스트 확인이 필요해요. 지금은 대화를 직접 입력해 주세요.",
};

function App() {
  const [state, setState] = useState<AppState>({ screen: "home" });
  const activeReviewIdRef = useRef(0);

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
      initialText: method === "text" ? starterSampleText : "",
      helperText:
        method === "text"
          ? selectedMethod?.description
          : reviewHelpers[method] ?? selectedMethod?.description,
    });
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
        helperText={state.helperText}
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
