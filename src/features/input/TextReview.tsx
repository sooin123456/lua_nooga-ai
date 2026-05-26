import { Button } from "@toss/tds-mobile";
import type { ClipboardEvent, ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import type { UserPerspective } from "../analyzer/types";
import type {
  IncidentIntakeInput,
  IncidentIntakeSummary,
  IncidentTopic,
} from "../intake/incidentIntake";
import { topicLabels } from "../intake/incidentIntake";

type TextReviewProps = {
  initialText: string;
  initialTextSyncKey?: number;
  draftSyncKey?: number;
  helperText?: string;
  mediaControl?: ReactNode;
  onPaste?: (event: ClipboardEvent<HTMLElement>) => void;
  onAnalyze(
    text: string,
    userPerspective: UserPerspective,
  ): void | Promise<void>;
  onPrepareIncident?(
    input: IncidentIntakeInput,
  ): Promise<IncidentIntakeSummary>;
  onBack(): void;
};

const submitFailureMessage =
  "판독 중 문제가 생겼어요. 잠시 후 다시 시도해주세요.";
const intakeFailureMessage =
  "사건 정리 중 문제가 생겼어요. 잠시 후 다시 시도해주세요.";

const intakeTopics: Array<{ id: IncidentTopic; label: string }> = [
  { id: "reply", label: "연락" },
  { id: "schedule", label: "약속/시간" },
  { id: "tone", label: "말투" },
  { id: "money", label: "돈/선물" },
  { id: "jealousy", label: "질투/오해" },
  { id: "family", label: "가족/친구" },
  { id: "other", label: "기타" },
];

export function TextReview({
  initialText,
  initialTextSyncKey,
  draftSyncKey,
  helperText,
  mediaControl,
  onPaste,
  onAnalyze,
  onPrepareIncident,
  onBack,
}: TextReviewProps) {
  const [text, setText] = useState(initialText);
  const [extraContext, setExtraContext] = useState("");
  const [topic, setTopic] = useState<IncidentTopic>("unspecified");
  const [summary, setSummary] = useState<IncidentIntakeSummary | null>(null);
  const [error, setError] = useState("");
  const [pendingAction, setPendingAction] = useState<
    "intake" | "analyze" | null
  >(null);
  const [hasUserEditedDraft, setHasUserEditedDraft] = useState(false);
  const [userPerspective, setUserPerspective] =
    useState<UserPerspective>("unknown");
  const isMountedRef = useRef(true);
  const lastInitialTextRef = useRef(initialText);
  const lastInitialTextSyncKeyRef = useRef(initialTextSyncKey);
  const lastUserEditSyncKeyRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    isMountedRef.current = true;

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
        setSummary(null);
      }

      return;
    }

    if (!hasUserEditedDraft) {
      setText(initialText);
      setSummary(null);
    }
  }, [hasUserEditedDraft, initialText, initialTextSyncKey]);

  const handleSubmit = async () => {
    if (pendingAction) {
      return;
    }

    const trimmedText = text.trim();

    if (trimmedText.length === 0) {
      setError("판독할 내용을 먼저 입력해주세요.");
      return;
    }

    setError("");
    setPendingAction("intake");

    try {
      const nextSummary = onPrepareIncident
        ? await onPrepareIncident({
            text: trimmedText,
            topic,
            extraContext,
            userPerspective,
          })
        : ({
            title: "루아가 접수한 싸움",
            topic,
            partyA: "첫 번째 사람",
            partyB: "두 번째 사람",
            partyAClaim: "첫 번째 사람의 입장을 확인했어요.",
            partyBClaim: "두 번째 사람의 입장을 확인했어요.",
            issues: ["대화 맥락", "말투", "사과 타이밍"],
            missingQuestions: [],
            completeness: "needs_context",
            normalizedDialogue: trimmedText
              .split("\n")
              .filter(Boolean)
              .slice(0, 6),
            judgeText: trimmedText,
          } satisfies IncidentIntakeSummary);

      if (isMountedRef.current) {
        setSummary(nextSummary);
      }
    } catch {
      if (isMountedRef.current) {
        setError(intakeFailureMessage);
      }
    } finally {
      if (isMountedRef.current) {
        setPendingAction(null);
      }
    }
  };

  const handleAnalyze = async () => {
    if (pendingAction) {
      return;
    }

    const trimmedText = text.trim();

    if (!summary && trimmedText.length === 0) {
      setError("판독할 내용을 먼저 입력해주세요.");
      return;
    }

    setError("");
    setPendingAction("analyze");

    try {
      await onAnalyze(
        summary?.judgeText.trim() || trimmedText,
        userPerspective,
      );
    } catch {
      if (isMountedRef.current) {
        setError(submitFailureMessage);
      }
    } finally {
      if (isMountedRef.current) {
        setPendingAction(null);
      }
    }
  };

  const errorId = error ? "analysis-text-error" : undefined;

  return (
    <main className="screen screen--review" onPaste={onPaste}>
      <header className="review-brief">
        <button className="review-brief__back" type="button" onClick={onBack}>
          돌아가기
        </button>
        <p>루아 사건 접수실</p>
        <h1>싸움 자료를 넣어주세요</h1>
        <span>
          정리하지 말고 그대로 넣어도 돼요. 루아가 사건 카드로 바꿔드릴게요.
        </span>
      </header>

      <div className="review-progress-note" aria-label="루아 판독 진행 안내">
        <strong>먼저 사건을 접수해요</strong>
        <span>
          대화, 캡처, 녹음을 루아가 A/B 주장과 핵심 쟁점으로 정리해요.
        </span>
      </div>

      <section className="text-review" aria-label="대화 내용 확인">
        <div className="incident-topic-picker" aria-label="싸움 주제 선택">
          <strong>어떤 싸움이에요?</strong>
          <div>
            {intakeTopics.map(({ id, label }) => (
              <button
                type="button"
                aria-pressed={topic === id}
                key={id}
                onClick={() => {
                  setTopic(id);
                  setSummary(null);
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="text-review__header">
          <label htmlFor="analysis-text">싸움 자료</label>
          <span>{text.trim().length}자</span>
        </div>
        {mediaControl}
        {helperText ? <p className="notice">{helperText}</p> : null}
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
            setSummary(null);
            if (error) {
              setError("");
            }
          }}
          rows={12}
          placeholder="카톡 대화, 상황 설명, 음성 변환 텍스트를 그대로 넣어주세요. 이름과 시간표시는 루아가 정리해요."
        />
        <label className="extra-context-field" htmlFor="incident-extra-context">
          <span>카톡에 안 나온 맥락이 있나요?</span>
          <textarea
            id="incident-extra-context"
            aria-label="추가 맥락"
            rows={3}
            value={extraContext}
            onChange={(event) => {
              setExtraContext(event.target.value);
              setSummary(null);
              if (error) {
                setError("");
              }
            }}
            placeholder="예: 이전에도 같은 일로 다퉜어요. 상대가 먼저 사과하긴 했어요."
          />
        </label>
        {error ? (
          <p className="form-error" id="analysis-text-error">
            {error}
          </p>
        ) : null}
      </section>

      <div
        className="perspective-selector"
        aria-label="내가 누구인지 선택"
        title="이 대화에서 나는 누구예요?"
      >
        <button
          type="button"
          aria-pressed={userPerspective === "first"}
          onClick={() => setUserPerspective("first")}
        >
          나는 첫 번째 사람이에요
        </button>
        <button
          type="button"
          aria-pressed={userPerspective === "second"}
          onClick={() => setUserPerspective("second")}
        >
          나는 두 번째 사람이에요
        </button>
        <button
          type="button"
          aria-pressed={userPerspective === "unknown"}
          onClick={() => setUserPerspective("unknown")}
        >
          잘 모르겠어요
        </button>
      </div>

      {summary ? (
        <section
          className="incident-summary-card"
          aria-label="루아가 정리한 사건"
        >
          <div className="incident-summary-card__header">
            <span>{topicLabels[summary.topic]}</span>
            <h2>루아가 정리한 사건</h2>
            <p>{summary.title}</p>
          </div>
          <div className="incident-claims">
            <article>
              <strong>{summary.partyA}</strong>
              <p>{summary.partyAClaim}</p>
            </article>
            <article>
              <strong>{summary.partyB}</strong>
              <p>{summary.partyBClaim}</p>
            </article>
          </div>
          <div className="incident-issues">
            <strong>핵심 쟁점</strong>
            <ol>
              {summary.issues.map((issue) => (
                <li key={issue}>{issue}</li>
              ))}
            </ol>
          </div>
          {summary.missingQuestions.length > 0 ? (
            <div className="incident-missing">
              <strong>더 정확해지려면</strong>
              <ul>
                {summary.missingQuestions.map((question) => (
                  <li key={question}>{question}</li>
                ))}
              </ul>
            </div>
          ) : null}
          {summary.normalizedDialogue.length > 0 ? (
            <div className="incident-dialogue-preview">
              <strong>루아가 정돈한 대화</strong>
              <ul>
                {summary.normalizedDialogue.slice(0, 5).map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </div>
          ) : null}
          <div className="incident-summary-actions">
            <button type="button" onClick={() => setSummary(null)}>
              수정하기
            </button>
            <button
              type="button"
              disabled={pendingAction === "analyze"}
              onClick={() => void handleAnalyze()}
            >
              {pendingAction === "analyze" ? "판독 중..." : "이대로 판독하기"}
            </button>
          </div>
        </section>
      ) : null}

      <div className="action-row">
        <Button
          type="button"
          disabled={Boolean(pendingAction)}
          onClick={summary ? handleAnalyze : handleSubmit}
        >
          {pendingAction === "intake"
            ? "루아가 정리 중..."
            : pendingAction === "analyze"
              ? "판독 중..."
              : summary
                ? "무료 판독 받기"
                : "루아가 사건 정리하기"}
        </Button>
      </div>
    </main>
  );
}
