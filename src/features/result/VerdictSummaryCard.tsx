type VerdictSummaryCardProps = {
  verdict: string;
  isSafetyResult: boolean;
};

export function VerdictSummaryCard({
  verdict,
  isSafetyResult,
}: VerdictSummaryCardProps) {
  return (
    <div className="verdict-summary-card">
      <div>
        <p>오늘의 판결</p>
        <strong>{verdict}</strong>
      </div>
      {!isSafetyResult ? (
        <div className="verdict-gavel" aria-hidden="true">
          <span />
        </div>
      ) : null}
    </div>
  );
}
