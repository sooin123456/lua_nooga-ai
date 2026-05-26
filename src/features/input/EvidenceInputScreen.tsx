import { Button } from "@toss/tds-mobile";
import type { ClipboardEvent, ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import type { UserPerspective } from "../analyzer/types";
import type {
  IncidentIntakeInput,
  IncidentTopic,
} from "../intake/incidentIntake";

type EvidenceInputScreenProps = {
  initialText: string;
  initialTextSyncKey?: number;
  draftSyncKey?: number;
  helperText?: string;
  mediaControl?: ReactNode;
  onPaste?: (event: ClipboardEvent<HTMLElement>) => void;
  onSubmitEvidence(input: IncidentIntakeInput): void;
  onBack(): void;
};

const intakeTopics: Array<{ id: IncidentTopic; label: string }> = [
  { id: "reply", label: "연락" },
  { id: "schedule", label: "약속/시간" },
  { id: "tone", label: "말투" },
  { id: "money", label: "돈/선물" },
  { id: "jealousy", label: "질투/오해" },
  { id: "family", label: "가족/친구" },
  { id: "other", label: "기타" },
];

export function EvidenceInputScreen({
  initialText,
  initialTextSyncKey,
  draftSyncKey,
  helperText,
  mediaControl,
  onPaste,
  onSubmitEvidence,
  onBack,
}: EvidenceInputScreenProps) {
  const [text, setText] = useState(initialText);
  const [extraContext, setExtraContext] = useState("");
  const [topic, setTopic] = useState<IncidentTopic>("unspecified");
  const [error, setError] = useState("");
  const [hasUserEditedDraft, setHasUserEditedDraft] = useState(false);
  const [userPerspective, setUserPerspective] =
    useState<UserPerspective>("unknown");
  const lastInitialTextSyncKeyRef = useRef(initialTextSyncKey);
  const lastUserEditSyncKeyRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    const syncKeyChanged =
      lastInitialTextSyncKeyRef.current !== initialTextSyncKey;
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

  const submit = () => {
    const trimmedText = text.trim();

    if (!trimmedText) {
      setError("루아에게 보낼 내용을 먼저 넣어주세요.");
      return;
    }

    setError("");
    onSubmitEvidence({
      text: trimmedText,
      topic,
      extraContext: extraContext.trim(),
      userPerspective,
    });
  };

  const errorId = error ? "analysis-text-error" : undefined;

  return (
    <main
      className="screen screen--review evidence-input-screen"
      onPaste={onPaste}
    >
      <header className="review-brief">
        <button className="review-brief__back" type="button" onClick={onBack}>
          돌아가기
        </button>
        <p>루아 사건 접수</p>
        <h1>루아에게 보낼 자료</h1>
        <span>
          카톡 대화나 상황을 그대로 넣어주세요. 정리는 루아가 할게요.
        </span>
      </header>

      <section className="text-review" aria-label="자료 입력">
        <div className="incident-topic-picker" aria-label="싸움 주제 선택">
          <strong>어떤 싸움이에요?</strong>
          <div>
            {intakeTopics.map(({ id, label }) => (
              <button
                type="button"
                aria-pressed={topic === id}
                key={id}
                onClick={() => setTopic(id)}
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
            if (error) {
              setError("");
            }
          }}
          rows={11}
          placeholder="카톡 대화, 상황 설명, 음성 변환 텍스트를 그대로 넣어주세요."
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

      <div className="perspective-selector" aria-label="내가 누구인지 선택">
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

      <div className="action-row">
        <Button type="button" onClick={submit}>
          루아에게 보내기
        </Button>
      </div>
    </main>
  );
}
