import { Button, Top } from "@toss/tds-mobile";
import { useState } from "react";
import "./App.css";
import { analyzeWithRules } from "./features/analyzer/ruleBasedAnalyzer";
import type { JudgmentResult } from "./features/analyzer/types";
import { InputHome } from "./features/input/InputHome";
import { inputMethods, type InputMethod } from "./features/input/inputMethods";
import { TextReview } from "./features/input/TextReview";

type AppState =
  | { screen: "home" }
  | { screen: "review"; initialText: string; helperText?: string }
  | { screen: "result"; submittedText: string; result: JudgmentResult };

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

  const handleSelect = (method: InputMethod) => {
    const selectedMethod = inputMethods.find(({ id }) => id === method);

    setState({
      screen: "review",
      initialText: method === "text" ? starterSampleText : "",
      helperText:
        method === "text"
          ? selectedMethod?.description
          : reviewHelpers[method] ?? selectedMethod?.description,
    });
  };

  const handleAnalyze = async (text: string) => {
    const result = await analyzeWithRules({ text });
    setState({ screen: "result", submittedText: text, result });
  };

  if (state.screen === "review") {
    return (
      <TextReview
        initialText={state.initialText}
        helperText={state.helperText}
        onAnalyze={handleAnalyze}
        onBack={() => setState({ screen: "home" })}
      />
    );
  }

  if (state.screen === "result") {
    return (
      <main className="screen screen--review">
        <Top
          title={<Top.TitleParagraph size={22}>임시 판정 결과</Top.TitleParagraph>}
          subtitleBottom={
            <Top.SubtitleParagraph size={15}>
              결과 화면은 다음 작업에서 다듬을 예정이에요.
            </Top.SubtitleParagraph>
          }
        />
        <section className="text-review" aria-label="임시 판정 결과">
          <pre>
            {JSON.stringify(
              {
                text: state.submittedText,
                result: state.result,
              },
              null,
              2,
            )}
          </pre>
        </section>
        <div className="action-row">
          <Button
            type="button"
            variant="weak"
            onClick={() => setState({ screen: "home" })}
          >
            처음으로
          </Button>
        </div>
      </main>
    );
  }

  return <InputHome onSelect={handleSelect} />;
}

export default App;
