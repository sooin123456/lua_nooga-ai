import type { ReactNode } from "react";

type VerdictSummaryCardProps = {
  verdict: string;
  isSafetyResult: boolean;
  children?: ReactNode;
};

export function VerdictSummaryCard({
  verdict,
  isSafetyResult,
  children,
}: VerdictSummaryCardProps) {
  return (
    <div className="verdict-summary-card">
      <div>
        <p>오늘의 판정</p>
        <strong>{verdict}</strong>
      </div>
      {children}
      {!isSafetyResult ? (
        <div className="verdict-gavel" aria-hidden="true">
          <span />
        </div>
      ) : null}
    </div>
  );
}
