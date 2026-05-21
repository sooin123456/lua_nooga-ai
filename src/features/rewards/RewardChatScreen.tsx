import { useState, type FormEvent } from "react";
import { Button, Top } from "@toss/tds-mobile";
import type { JudgmentResult } from "../analyzer/types";
import {
  createRewardChatRecommendation,
  type RewardCandidate,
  type RewardChatRecommendation,
} from "./rewardAdapter";
import { LuaAiMascot } from "../../shared/ui/LuaAiMascot";

type RewardChatScreenProps = {
  result: JudgmentResult;
  onBack: () => void;
  onHome: () => void;
};

function createShareText(candidate: RewardCandidate, recommendation: RewardChatRecommendation) {
  return [
    "루아 AI 보상 판결",
    `${recommendation.blamedParty}가 ${recommendation.blamePercent}% 선넘었어요.`,
    `${candidate.tone}: ${candidate.title} (${candidate.priceHint})`,
    candidate.message,
    candidate.shoppingUrl,
  ].join("\n");
}

function createInquiryText({
  wish,
  recommendation,
  selectedCandidates,
}: {
  wish: string;
  recommendation: RewardChatRecommendation;
  selectedCandidates: RewardCandidate[];
}) {
  return [
    "루아 AI 보상 판결",
    `${recommendation.blamedParty}가 ${recommendation.blamePercent}% 선넘었어요.`,
    `보상 키워드: ${wish.trim() || recommendation.category}`,
    `분류: ${recommendation.severityLabel}`,
    "",
    ...selectedCandidates.map(
      (candidate, index) =>
        `${index + 1}. ${candidate.tone}: ${candidate.title} (${candidate.priceHint})\n토스 상품 추천 · ${candidate.message}\n${candidate.shoppingUrl}`,
    ),
  ].join("\n");
}

export function RewardChatScreen({ result, onBack, onHome }: RewardChatScreenProps) {
  const [wish, setWish] = useState("");
  const [recommendation, setRecommendation] =
    useState<RewardChatRecommendation | null>(null);
  const [selectedTones, setSelectedTones] = useState<RewardCandidate["tone"][]>([]);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const blamedParty = result.partyAPercent >= result.partyBPercent ? "A" : "B";
  const blamePercent = Math.max(result.partyAPercent, result.partyBPercent);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const nextRecommendation = createRewardChatRecommendation({
      wish,
      partyAPercent: result.partyAPercent,
      partyBPercent: result.partyBPercent,
    });
    setRecommendation(nextRecommendation);
    setSelectedTones(nextRecommendation.candidates.map((candidate) => candidate.tone));
    setStatusMessage(null);
  };

  const selectedCandidates = recommendation
    ? recommendation.candidates.filter((candidate) =>
        selectedTones.includes(candidate.tone),
      )
    : [];
  const inquiryMessage = recommendation
    ? createInquiryText({ wish, recommendation, selectedCandidates })
    : "";

  const toggleCandidate = (tone: RewardCandidate["tone"]) => {
    setSelectedTones((currentTones) =>
      currentTones.includes(tone)
        ? currentTones.filter((currentTone) => currentTone !== tone)
        : [...currentTones, tone],
    );
    setStatusMessage(null);
  };

  const handleShare = async () => {
    if (!recommendation) {
      return;
    }

    const text =
      selectedCandidates.length > 0
        ? inquiryMessage
        : createShareText(recommendation.candidates[1], recommendation);

    try {
      if (navigator.share) {
        await navigator.share({
          title: "루아 AI 보상 판결",
          text,
          url: selectedCandidates[0]?.shoppingUrl ?? recommendation.shoppingUrl,
        });
      } else {
        await navigator.clipboard.writeText(text);
      }
      setStatusMessage("상대방에게 보낼 보상 링크를 준비했어요.");
    } catch {
      setStatusMessage("보상 링크를 준비하지 못했어요. 다시 시도해 주세요.");
    }
  };

  return (
    <main className="screen reward-chat-screen">
      <Top
        title={<Top.TitleParagraph size={22}>루아 보상 상담소</Top.TitleParagraph>}
        subtitleBottom={
          <Top.SubtitleParagraph size={15}>
            잘못한 정도에 맞춰 보상 후보를 골라드려요.
          </Top.SubtitleParagraph>
        }
      />

      <section className="reward-chat-hero" aria-label="보상 상담 요약">
        <LuaAiMascot variant="hero" />
        <div className="reward-chat-hero__copy">
          <span>루아의 보상 판결</span>
          <div className="reward-chat-bubble reward-chat-bubble--lua">
            <p>
              이번 판정은 {blamedParty}가 {blamePercent}% 선넘었어요.
            </p>
            <p>원하는 보상을 말해주면, 루아가 토스 쇼핑에서 보상 후보를 골라볼게요.</p>
          </div>
        </div>
      </section>

      <section className="reward-chat-panel" aria-labelledby="reward-chat-input-title">
        <div className="reward-chat-panel__title">
          <h2 id="reward-chat-input-title">받고 싶은 보상</h2>
          <span>작은 선물도 잘못 정도에 맞춰 토스 상품으로 골라드려요.</span>
        </div>
        <form className="reward-chat-form" onSubmit={handleSubmit}>
          <label className="sr-only" htmlFor="reward-chat-wish">
            받고 싶은 보상
          </label>
          <input
            id="reward-chat-wish"
            value={wish}
            placeholder="예: 작은 선물, 달달한 거, 커피, 귀여운 거"
            onChange={(event) => {
              setWish(event.currentTarget.value);
              setRecommendation(null);
              setSelectedTones([]);
              setStatusMessage(null);
            }}
          />
          <button type="submit">루아에게 골라달라 하기</button>
        </form>
      </section>

      {recommendation ? (
        <section className="reward-chat-result" aria-label="루아 추천 결과">
          <div className="reward-composer-heading">
            <div>
              <strong>잘못 정도별 토스 상품 추천</strong>
              <span>{recommendation.severityLabel} · 같은 가격대에서 골랐어요.</span>
            </div>
            <button type="button" onClick={() => setRecommendation(null)}>
              닫기
            </button>
          </div>

          <ol className="reward-candidate-list">
            {recommendation.candidates.map((candidate) => (
              <li className="reward-candidate-card" key={candidate.tone}>
                <label>
                  <input
                    aria-label={`${candidate.tone} 선택`}
                    type="checkbox"
                    checked={selectedTones.includes(candidate.tone)}
                    onChange={() => toggleCandidate(candidate.tone)}
                  />
                  <span className="reward-candidate-card__source">토스 상품 추천</span>
                  <span className="reward-candidate-card__tone">{candidate.tone}</span>
                  <strong>{candidate.title}</strong>
                  <em>{candidate.priceHint}</em>
                  <small>{candidate.message}</small>
                </label>
              </li>
            ))}
          </ol>

          <button
            className="reward-composer-cta"
            type="button"
            disabled={selectedCandidates.length === 0}
            onClick={handleShare}
          >
            {selectedCandidates.length}개 상품 링크 보내기
          </button>
        </section>
      ) : null}

      {statusMessage ? (
        <p className="reward-chat-status" role="status">
          {statusMessage}
        </p>
      ) : null}

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
