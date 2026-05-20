import { Button, Top } from "@toss/tds-mobile";
import type { JudgmentResult } from "../analyzer/types";

type ResultScreenProps = {
  result: JudgmentResult;
  onRestart(): void;
};

export function ResultScreen({ result, onRestart }: ResultScreenProps) {
  const isSafetyResult = result.safetyLevel !== "normal";
  const safetyLabel = result.safetyLevel === "urgent" ? "긴급 안전 확인" : "주의 필요";

  return (
    <main className="screen screen--result">
      <Top
        title={<Top.TitleParagraph size={22}>판정 결과</Top.TitleParagraph>}
        subtitleBottom={
          <Top.SubtitleParagraph size={15}>
            입력한 대화를 기준으로 가볍게 참고해 주세요.
          </Top.SubtitleParagraph>
        }
      />

      <section
        className={`result-panel${isSafetyResult ? " result-panel--safety" : ""}`}
        aria-label="판정 결과"
      >
        {isSafetyResult ? <p className="result-safety-badge">{safetyLabel}</p> : null}

        <div className="result-verdict">
          <p>오늘의 판정</p>
          <strong>{result.verdict}</strong>
        </div>

        <div className="result-percentages" aria-label="A와 B 비율">
          <div>
            <strong>A {result.partyAPercent}%</strong>
          </div>
          <div>
            <strong>B {result.partyBPercent}%</strong>
          </div>
        </div>

        <section className="result-section" aria-labelledby="result-reasons-title">
          <h2 id="result-reasons-title">근거 3개</h2>
          <ol className="result-reasons">
            {result.reasons.slice(0, 3).map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ol>
        </section>

        <section className="result-section" aria-labelledby="result-advice-title">
          <h2 id="result-advice-title">한 줄 조언</h2>
          <p className="result-advice">{result.advice}</p>
        </section>
      </section>

      <p className="result-disclaimer">
        입력된 내용 기준의 재미용 판정이에요. 법적, 의료적, 심리적 판단이 아니에요.
      </p>

      <Button type="button" onClick={onRestart}>
        다시 판정하기
      </Button>
    </main>
  );
}
