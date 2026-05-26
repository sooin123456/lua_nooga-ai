import { Button } from "@toss/tds-mobile";
import { useMemo, useState } from "react";
import type { UserPerspective } from "../analyzer/types";
import type { IncidentIntakeSummary } from "./incidentIntake";
import {
  buildJudgeText,
  createJournalItemsFromSummary,
  normalizeJournalItems,
  type IncidentJournalItem,
} from "./incidentJournal";

type IncidentJournalScreenProps = {
  summary: IncidentIntakeSummary;
  originalText: string;
  extraContext: string;
  userPerspective: UserPerspective;
  fallbackMessage?: string | null;
  onAnalyze(text: string, userPerspective: UserPerspective): void | Promise<void>;
  onBack(): void;
};

const submitFailureMessage =
  "판독 중 문제가 생겼어요. 잠시 후 다시 시도해주세요.";

export function IncidentJournalScreen({
  summary,
  originalText,
  extraContext,
  userPerspective,
  fallbackMessage,
  onAnalyze,
  onBack,
}: IncidentJournalScreenProps) {
  const initialItems = useMemo(
    () => createJournalItemsFromSummary(summary),
    [summary],
  );
  const [items, setItems] = useState<IncidentJournalItem[]>(initialItems);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState("");

  const updateItem = (id: string, text: string) => {
    setItems((currentItems) =>
      currentItems.map((item) => (item.id === id ? { ...item, text } : item)),
    );
    if (error) {
      setError("");
    }
  };

  const deleteItem = (id: string) => {
    setItems((currentItems) => currentItems.filter((item) => item.id !== id));
    if (error) {
      setError("");
    }
  };

  const addItem = () => {
    setItems((currentItems) => [
      ...currentItems,
      { id: `custom-${Date.now()}`, text: "" },
    ]);
  };

  const submit = async () => {
    const normalizedItems = normalizeJournalItems(items);

    if (normalizedItems.length === 0) {
      setError("판독할 싸움 일지를 하나 이상 남겨주세요.");
      return;
    }

    setError("");
    setIsPending(true);

    try {
      await onAnalyze(
        buildJudgeText({
          summary,
          journalItems: normalizedItems,
          originalText,
          extraContext,
        }),
        userPerspective,
      );
    } catch {
      setError(submitFailureMessage);
    } finally {
      setIsPending(false);
    }
  };

  return (
    <main className="screen incident-journal-screen">
      <header className="review-brief">
        <button className="review-brief__back" type="button" onClick={onBack}>
          돌아가기
        </button>
        <p>루아 사건 접수</p>
        <h1>루아가 정리한 싸움 일지</h1>
        <span>틀린 부분은 고치고, 빠진 내용은 한 줄 더 추가해 주세요.</span>
      </header>

      {fallbackMessage ? <p className="notice">{fallbackMessage}</p> : null}

      <section className="incident-journal-list" aria-label="싸움 일지 확인">
        {items.map((item, index) => (
          <article className="incident-journal-item" key={item.id}>
            <span>{index + 1}.</span>
            <textarea
              aria-label={`${index + 1}번 싸움 일지`}
              value={item.text}
              rows={2}
              onChange={(event) => updateItem(item.id, event.target.value)}
            />
            <button
              type="button"
              aria-label="항목 삭제"
              onClick={() => deleteItem(item.id)}
            >
              삭제
            </button>
          </article>
        ))}
      </section>

      {summary.missingQuestions.length > 0 ? (
        <details className="incident-journal-questions">
          <summary>더 정확해지려면</summary>
          <ul>
            {summary.missingQuestions.map((question) => (
              <li key={question}>{question}</li>
            ))}
          </ul>
        </details>
      ) : null}

      {error ? <p className="form-error">{error}</p> : null}

      <div className="incident-journal-actions">
        <button type="button" onClick={addItem}>
          항목 추가
        </button>
        <Button type="button" disabled={isPending} onClick={() => void submit()}>
          {isPending ? "판독 중..." : "이대로 판독하기"}
        </Button>
      </div>
    </main>
  );
}
