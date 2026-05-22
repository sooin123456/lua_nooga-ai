import { Button, Top } from "@toss/tds-mobile";
import type { PrecedentJudgmentReport } from "./precedentJudgmentAdapter";

type PrecedentJudgmentScreenProps = {
  report: PrecedentJudgmentReport;
  disclaimer: string;
  onBack(): void;
  onHome(): void;
};

export function PrecedentJudgmentScreen({
  report,
  disclaimer,
  onBack,
  onHome,
}: PrecedentJudgmentScreenProps) {
  return (
    <main className="screen precedent-result-screen">
      <Top
        title={<Top.TitleParagraph size={22}>판례 AI 판독 완료</Top.TitleParagraph>}
        subtitleBottom={
          <Top.SubtitleParagraph size={15}>
            유사 판례 근거로 한 번 더 따져봤어요.
          </Top.SubtitleParagraph>
        }
      />

      <section className="precedent-result-card precedent-result-card--verdict">
        <span>990원 이의제기 결과</span>
        <h1>{report.verdict}</h1>
        <div className="precedent-result-percentages" aria-label={`A ${report.partyAPercent}%, B ${report.partyBPercent}%`}>
          <strong>A {report.partyAPercent}%</strong>
          <div>
            <span style={{ width: `${report.partyAPercent}%` }} />
          </div>
          <strong>B {report.partyBPercent}%</strong>
        </div>
      </section>

      <section className="precedent-result-card">
        <h2>판례 기준 근거</h2>
        <ol className="precedent-result-list">
          {report.reasons.map((reason) => (
            <li key={reason}>{reason}</li>
          ))}
        </ol>
      </section>

      <section className="precedent-result-card">
        <h2>유사 판례 {report.precedents.length}</h2>
        <ol className="premium-precedents">
          {report.precedents.map((precedent) => (
            <li key={`${precedent.title}-${precedent.decidedAt}`}>
              <strong>{precedent.title}</strong>
              <span>
                {precedent.court} · {precedent.decidedAt}
              </span>
              <p>{precedent.summary}</p>
              <p>{precedent.similarityReason}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="precedent-result-card">
        <h2>판례상 쟁점</h2>
        <ul className="precedent-result-tags">
          {report.precedentIssues.map((issue) => (
            <li key={issue}>{issue}</li>
          ))}
        </ul>
      </section>

      <section className="precedent-result-card">
        <h2>반박 포인트</h2>
        <ol className="precedent-result-list">
          {report.rebuttalPoints.map((point) => (
            <li key={point}>{point}</li>
          ))}
        </ol>
      </section>

      <section className="precedent-result-card precedent-result-card--advice">
        <h2>화해 제안</h2>
        <p>{report.reconciliationSuggestion}</p>
        <p>{report.advice}</p>
      </section>

      <p className="precedent-result-disclaimer">{disclaimer}</p>

      <div className="reward-navigation-actions">
        <Button className="reward-back-button" type="button" onClick={onBack}>
          판정 결과로 돌아가기
        </Button>
        <Button className="reward-home-button" type="button" onClick={onHome}>
          홈으로 돌아가기
        </Button>
      </div>
    </main>
  );
}
