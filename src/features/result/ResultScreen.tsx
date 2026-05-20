import { Button, Top } from "@toss/tds-mobile";
import { useState } from "react";
import type { JudgmentResult } from "../analyzer/types";
import { createPremiumProduct, requestPremiumVerdict } from "../premium/premiumAdapter";
import { precedentDisclaimer } from "../precedent/precedentAdapter";
import {
  createRewardRecommendation,
  type RewardRecommendation,
} from "../rewards/rewardAdapter";
import { AnimatedPercentBar } from "./AnimatedPercentBar";
import { ResultReasonCard } from "./ResultReasonCard";
import { VerdictSummaryCard } from "./VerdictSummaryCard";

type ResultScreenProps = {
  result: JudgmentResult;
  onRestart(): void;
};

export function ResultScreen({ result, onRestart }: ResultScreenProps) {
  const [rewardWish, setRewardWish] = useState("");
  const [rewardRecommendation, setRewardRecommendation] =
    useState<RewardRecommendation | null>(null);
  const [premiumMessage, setPremiumMessage] = useState<string | null>(null);
  const [isPremiumPending, setIsPremiumPending] = useState(false);
  const premiumProduct = createPremiumProduct();
  const isSafetyResult = result.safetyLevel !== "normal";
  const safetyLabel = result.safetyLevel === "urgent" ? "긴급 안전 확인" : "주의 필요";
  const handleRewardSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setRewardRecommendation(createRewardRecommendation(rewardWish));
  };

  return (
    <main className="screen screen--result">
      <Top
        title={<Top.TitleParagraph size={22}>판독 결과</Top.TitleParagraph>}
        subtitleBottom={
          <Top.SubtitleParagraph size={15}>
            입력한 대화를 기준으로 가볍게 참고해 주세요.
          </Top.SubtitleParagraph>
        }
      />

      <section
        className={`result-panel${isSafetyResult ? " result-panel--safety" : ""}`}
        aria-label="판독 결과"
      >
        {isSafetyResult ? <p className="result-safety-badge">{safetyLabel}</p> : null}

        <VerdictSummaryCard
          isSafetyResult={isSafetyResult}
          verdict={result.verdict}
        />

        <AnimatedPercentBar
          partyAPercent={result.partyAPercent}
          partyBPercent={result.partyBPercent}
        />

        <section
          className="result-section result-section--reasons"
          aria-labelledby="result-reasons-title"
        >
          <h2 id="result-reasons-title">근거 3개</h2>
          <ol className="result-reasons">
            {result.reasons.slice(0, 3).map((reason, index) => (
              <ResultReasonCard index={index} key={reason} reason={reason} />
            ))}
          </ol>
        </section>

        <section
          className="result-section result-section--advice"
          aria-labelledby="result-advice-title"
        >
          <h2 id="result-advice-title">한 줄 조언</h2>
          <p className="result-advice">{result.advice}</p>
        </section>

        {!isSafetyResult ? (
          <section
            className="result-section reward-box result-section--reward"
            aria-labelledby="reward-title"
          >
            <h2 id="reward-title">이긴 사람 보상 추천</h2>
            <label className="reward-box__label" htmlFor="reward-wish">
              이긴 사람이 받고 싶은 것
            </label>
            <form className="reward-box__input-row" onSubmit={handleRewardSubmit}>
              <input
                id="reward-wish"
                value={rewardWish}
                placeholder="예: 달달한 거, 커피, 귀여운 거"
                onChange={(event) => {
                  setRewardWish(event.currentTarget.value);
                  setRewardRecommendation(null);
                }}
              />
              <button type="submit">
                보상 추천 받기
              </button>
            </form>
            {rewardRecommendation ? (
              <div className="reward-result" role="status">
                <strong>{rewardRecommendation.category}</strong>
                <p>{rewardRecommendation.searchTerms.join(" · ")}</p>
                <span>{rewardRecommendation.reason}</span>
                <button type="button" disabled>
                  토스 쇼핑 연결 준비 중
                </button>
              </div>
            ) : null}
          </section>
        ) : null}

        {!isSafetyResult ? (
          <section className="premium-panel" aria-labelledby="premium-title">
            <div>
              <p className="eyebrow">판례 근거는 나중에 서버로 연결</p>
              <h2 id="premium-title">{premiumProduct.title}</h2>
              <p>{premiumProduct.description}</p>
              <p>아직 결제되지 않아요. 결제 연결 전 준비 화면이에요.</p>
            </div>
            <button
              type="button"
              disabled={isPremiumPending}
              onClick={async () => {
                if (isPremiumPending) {
                  return;
                }

                setIsPremiumPending(true);
                setPremiumMessage("준비 상태 확인 중");

                try {
                  const paymentState = await requestPremiumVerdict();
                  setPremiumMessage(paymentState.message);
                } catch {
                  setPremiumMessage("준비 상태 확인에 실패했어요");
                } finally {
                  setIsPremiumPending(false);
                }
              }}
            >
              {isPremiumPending
                ? "준비 상태 확인 중"
                : "결제 없이 판례 판독 미리보기"}
            </button>
            {premiumMessage ? (
              <div className="premium-panel__status" role="status">
                <strong>{premiumMessage}</strong>
                <span>판례 검색 서버 연결 예정</span>
                <p>{precedentDisclaimer}</p>
              </div>
            ) : null}
          </section>
        ) : null}
      </section>

      <p className="result-disclaimer">
        입력된 내용 기준의 재미용 판독이에요. 법적, 의료적, 심리적 판단이나
        상담이 아니에요.
      </p>

      <Button type="button" onClick={onRestart}>
        다시 판독하기
      </Button>
    </main>
  );
}
