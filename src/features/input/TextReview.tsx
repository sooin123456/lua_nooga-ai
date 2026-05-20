import { Button, Top } from "@toss/tds-mobile";
import { useState } from "react";

type TextReviewProps = {
  initialText: string;
  helperText?: string;
  onAnalyze(text: string): void;
  onBack(): void;
};

export function TextReview({
  initialText,
  helperText,
  onAnalyze,
  onBack,
}: TextReviewProps) {
  const [text, setText] = useState(initialText);
  const [error, setError] = useState("");

  const handleSubmit = () => {
    const trimmedText = text.trim();

    if (trimmedText.length === 0) {
      setError("판정할 내용을 먼저 입력해주세요.");
      return;
    }

    setError("");
    onAnalyze(trimmedText);
  };

  return (
    <main className="screen screen--review">
      <Top
        title={<Top.TitleParagraph size={22}>내용 확인</Top.TitleParagraph>}
        subtitleBottom={
          <Top.SubtitleParagraph size={15}>
            판정 전에 대화 내용을 확인하고 고칠 수 있어요.
          </Top.SubtitleParagraph>
        }
      />

      {helperText ? <p className="notice">{helperText}</p> : null}

      <section className="text-review" aria-label="대화 내용 확인">
        <label htmlFor="analysis-text">분석할 대화 내용</label>
        <textarea
          id="analysis-text"
          aria-label="분석할 대화 내용"
          value={text}
          onChange={(event) => {
            setText(event.target.value);
            if (error) {
              setError("");
            }
          }}
          rows={12}
          placeholder="A: 어떤 말이 오갔는지 붙여넣어 주세요."
        />
        {error ? <p className="form-error">{error}</p> : null}
      </section>

      <div className="action-row">
        <Button type="button" variant="weak" onClick={onBack}>
          돌아가기
        </Button>
        <Button type="button" onClick={handleSubmit}>
          판정 받기
        </Button>
      </div>
    </main>
  );
}
