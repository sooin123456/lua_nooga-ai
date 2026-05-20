import { Button, Top } from "@toss/tds-mobile";
import type { ClipboardEvent, ReactNode } from "react";
import { useEffect, useRef, useState } from "react";

type TextReviewProps = {
  initialText: string;
  initialTextSyncKey?: number;
  draftSyncKey?: number;
  helperText?: string;
  mediaControl?: ReactNode;
  onPaste?: (event: ClipboardEvent<HTMLElement>) => void;
  onAnalyze(text: string): void | Promise<void>;
  onBack(): void;
};

const submitFailureMessage =
  "판독 중 문제가 생겼어요. 잠시 후 다시 시도해주세요.";

export function TextReview({
  initialText,
  initialTextSyncKey,
  draftSyncKey,
  helperText,
  mediaControl,
  onPaste,
  onAnalyze,
  onBack,
}: TextReviewProps) {
  const [text, setText] = useState(initialText);
  const [error, setError] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [hasUserEditedDraft, setHasUserEditedDraft] = useState(false);
  const isMountedRef = useRef(true);
  const lastInitialTextRef = useRef(initialText);
  const lastInitialTextSyncKeyRef = useRef(initialTextSyncKey);
  const lastUserEditSyncKeyRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    const syncKeyChanged =
      lastInitialTextSyncKeyRef.current !== initialTextSyncKey;
    lastInitialTextRef.current = initialText;
    lastInitialTextSyncKeyRef.current = initialTextSyncKey;

    if (initialTextSyncKey !== undefined) {
      if (
        syncKeyChanged &&
        lastUserEditSyncKeyRef.current !== initialTextSyncKey
      ) {
        setText(initialText);
        setHasUserEditedDraft(false);
      }

      return;
    }

    if (!hasUserEditedDraft) {
      setText(initialText);
    }
  }, [hasUserEditedDraft, initialText, initialTextSyncKey]);

  const handleSubmit = async () => {
    if (isPending) {
      return;
    }

    const trimmedText = text.trim();

    if (trimmedText.length === 0) {
      setError("판독할 내용을 먼저 입력해주세요.");
      return;
    }

    setError("");
    setIsPending(true);

    try {
      await onAnalyze(trimmedText);
    } catch {
      if (isMountedRef.current) {
        setError(submitFailureMessage);
      }
    } finally {
      if (isMountedRef.current) {
        setIsPending(false);
      }
    }
  };

  const errorId = error ? "analysis-text-error" : undefined;

  return (
    <main className="screen screen--review" onPaste={onPaste}>
      <Top
        title={
          <Top.TitleParagraph size={22}>
            미스 노짱이 판독할 대화
          </Top.TitleParagraph>
        }
        subtitleBottom={
          <Top.SubtitleParagraph size={15}>
            판독 전에 대화 내용을 확인하고 고칠 수 있어요.
          </Top.SubtitleParagraph>
        }
      />

      {helperText ? <p className="notice">{helperText}</p> : null}

      <section className="text-review" aria-label="대화 내용 확인">
        <label htmlFor="analysis-text">분석할 대화 내용</label>
        {mediaControl}
        <textarea
          id="analysis-text"
          aria-label="분석할 대화 내용"
          aria-describedby={errorId}
          aria-invalid={error ? "true" : undefined}
          value={text}
          onChange={(event) => {
            lastUserEditSyncKeyRef.current = draftSyncKey;
            setHasUserEditedDraft(true);
            setText(event.target.value);
            if (error) {
              setError("");
            }
          }}
          rows={12}
          placeholder="A: 어떤 말이 오갔는지 붙여넣어 주세요."
        />
        {error ? (
          <p className="form-error" id="analysis-text-error">
            {error}
          </p>
        ) : null}
      </section>

      <div className="action-row">
        <Button type="button" variant="weak" onClick={onBack}>
          돌아가기
        </Button>
        <Button type="button" disabled={isPending} onClick={handleSubmit}>
          {isPending ? "판독 중..." : "무료 판독 받기"}
        </Button>
      </div>
    </main>
  );
}
