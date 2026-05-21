import { Button, Top } from "@toss/tds-mobile";
import { openURL } from "@apps-in-toss/web-framework";
import { useEffect, useMemo, useState } from "react";
import type { JudgmentResult } from "../analyzer/types";
import { createSharedResultUrl } from "../resultShare/resultLinks";
import {
  createConfiguredResultShareService,
  type createResultShareService,
} from "../resultShare/resultShareAdapter";
import type { ResultComment } from "../resultShare/types";
import { moderatePublicComment } from "../safety/safety";
import { AnimatedPercentBar } from "./AnimatedPercentBar";
import { ResultReasonCard } from "./ResultReasonCard";
import { VerdictSummaryCard } from "./VerdictSummaryCard";

type ResultScreenProps = {
  result: JudgmentResult;
  sourceText?: string;
  sharedResultId?: string;
  resultShareService?: ReturnType<typeof createResultShareService> | null;
  onRestart(): void;
  onOpenRewardChat?(): void;
};

export function ResultScreen({
  result,
  sharedResultId,
  resultShareService,
  onRestart,
  onOpenRewardChat,
}: ResultScreenProps) {
  const [commentDraft, setCommentDraft] = useState("");
  const [comments, setComments] = useState<ResultComment[]>([]);
  const [likeCount, setLikeCount] = useState(0);
  const [hasLiked, setHasLiked] = useState(false);
  const [shareMessage, setShareMessage] = useState<string | null>(null);
  const [commentMessage, setCommentMessage] = useState<string | null>(null);
  const [isPrecedentConfirmationOpen, setIsPrecedentConfirmationOpen] =
    useState(false);
  const [hasPrecedentConsent, setHasPrecedentConsent] = useState(false);
  const [activeSharedResultId, setActiveSharedResultId] = useState(
    sharedResultId ?? null,
  );
  const [isReactionPending, setIsReactionPending] = useState(false);
  const configuredResultShareService = useMemo(
    () =>
      resultShareService === undefined
        ? createConfiguredResultShareService()
        : resultShareService,
    [resultShareService],
  );
  const isSafetyResult = result.safetyLevel !== "normal";
  const safetyLabel = result.safetyLevel === "urgent" ? "긴급 안전 확인" : "주의 필요";

  useEffect(() => {
    if (!sharedResultId || !configuredResultShareService) {
      return;
    }

    let isCurrent = true;
    setActiveSharedResultId(sharedResultId);

    Promise.all([
      configuredResultShareService.listComments(sharedResultId),
      configuredResultShareService.getLikeState(sharedResultId),
    ])
      .then(([nextComments, nextLikeState]) => {
        if (!isCurrent) {
          return;
        }

        setComments(nextComments);
        setLikeCount(nextLikeState.likeCount);
        setHasLiked(nextLikeState.hasLiked);
      })
      .catch(() => {
        if (isCurrent) {
          setShareMessage("공유 결과 반응을 불러오지 못했어요.");
        }
      });

    return () => {
      isCurrent = false;
    };
  }, [configuredResultShareService, sharedResultId]);

  const ensureSharedResult = async () => {
    if (activeSharedResultId) {
      return activeSharedResultId;
    }

    if (!configuredResultShareService) {
      return null;
    }

    const sharedResult = await configuredResultShareService.createSharedResult(result);
    setActiveSharedResultId(sharedResult.id);
    return sharedResult.id;
  };

  const handleCommentSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const nextComment = commentDraft.trim();
    if (!nextComment) {
      return;
    }

    const moderation = moderatePublicComment(nextComment);
    if (!moderation.isAllowed) {
      setCommentMessage(moderation.message ?? "선넘었어요. 댓글을 다시 확인해 주세요.");
      return;
    }

    if (!configuredResultShareService) {
      setComments((currentComments) => [
        {
          id: `local-${Date.now()}`,
          resultId: "local",
          body: moderation.sanitizedText,
          createdAt: new Date().toISOString(),
        },
        ...currentComments,
      ].slice(0, 5));
      setCommentDraft("");
      setCommentMessage(null);
      return;
    }

    try {
      setIsReactionPending(true);
      const resultId = await ensureSharedResult();
      if (!resultId) {
        return;
      }

      const comment = await configuredResultShareService.addComment(
        resultId,
        moderation.sanitizedText,
      );
      setComments((currentComments) => [comment, ...currentComments].slice(0, 20));
    } catch {
      setShareMessage("댓글을 저장하지 못했어요. 다시 시도해 주세요.");
      return;
    } finally {
      setIsReactionPending(false);
    }

    setCommentDraft("");
    setCommentMessage(null);
  };

  const handleLike = async () => {
    const nextLiked = !hasLiked;

    if (!configuredResultShareService) {
      setHasLiked(nextLiked);
      setLikeCount((currentLikeCount) =>
        nextLiked ? currentLikeCount + 1 : Math.max(0, currentLikeCount - 1),
      );
      return;
    }

    try {
      setIsReactionPending(true);
      const resultId = await ensureSharedResult();
      if (!resultId) {
        return;
      }

      const nextLikeState = await configuredResultShareService.setLiked(
        resultId,
        nextLiked,
      );
      setHasLiked(nextLikeState.hasLiked);
      setLikeCount(nextLikeState.likeCount);
    } catch {
      setShareMessage("좋아요를 저장하지 못했어요. 다시 시도해 주세요.");
    } finally {
      setIsReactionPending(false);
    }
  };

  const createShareText = (shareUrl: string | null) =>
    [
      "누가 잘못 AI 판독 결과",
      result.verdict,
      `A ${result.partyAPercent}% · B ${result.partyBPercent}%`,
      result.advice,
      shareUrl,
    ].filter(Boolean).join("\n");

  const createShareUrl = async () => {
    let shareUrl: string | null = null;

    try {
      const resultId = await ensureSharedResult();
      if (resultId && typeof window !== "undefined") {
        shareUrl = createSharedResultUrl({
          href: window.location.href,
          resultId,
        });
      }
    } catch {
      setShareMessage("공유 링크를 만들지 못했어요. 다시 시도해 주세요.");
      return null;
    }

    return shareUrl;
  };

  const handleShare = async () => {
    const shareUrl = await createShareUrl();
    if (shareUrl === null && configuredResultShareService) {
      return;
    }
    const shareText = createShareText(shareUrl);
    try {
      if (navigator.share) {
        await navigator.share({
          title: "누가 잘못 AI 판독 결과",
          text: shareText,
          url: shareUrl ?? undefined,
        });
      } else {
        await navigator.clipboard.writeText(shareText);
      }
      setShareMessage(
        shareUrl
          ? "공유 가능한 판독 결과 링크를 준비했어요."
          : "판독 결과를 공유할 수 있게 준비했어요.",
      );
    } catch {
      setShareMessage("공유를 완료하지 못했어요. 다시 시도해 주세요.");
    }
  };

  const handleChannelShare = async (channel: "kakao" | "telegram" | "link") => {
    const shareUrl = await createShareUrl();
    if (shareUrl === null && configuredResultShareService) {
      return;
    }
    const shareText = createShareText(shareUrl);

    try {
      if (channel === "telegram") {
        await openURL(
          `https://t.me/share/url?url=${encodeURIComponent(
            shareUrl ?? window.location.href,
          )}&text=${encodeURIComponent(shareText)}`,
        );
        setShareMessage("텔레그램으로 보낼 링크를 열었어요.");
        return;
      }

      await navigator.clipboard.writeText(shareText);
      setShareMessage(
        channel === "kakao"
          ? "카톡에 붙여넣을 판정 링크를 복사했어요."
          : "공유 링크를 복사했어요.",
      );
    } catch {
      setShareMessage("공유를 완료하지 못했어요. 다시 시도해 주세요.");
    }
  };

  return (
    <main className="screen screen--result">
      <Top
        title={<Top.TitleParagraph size={22}>판정 완료</Top.TitleParagraph>}
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

        <VerdictSummaryCard isSafetyResult={isSafetyResult} verdict={result.verdict}>
          <AnimatedPercentBar
            partyAPercent={result.partyAPercent}
            partyBPercent={result.partyBPercent}
          />
        </VerdictSummaryCard>

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

      </section>

      <p className="result-disclaimer">
        입력된 내용 기준의 재미용 판독이에요. 법적, 의료적, 심리적 판단이나
        상담이 아니에요.
      </p>

      <div className="result-primary-actions" aria-label="다음 행동">
        {!isSafetyResult ? (
          <Button
            className="result-primary-action result-primary-action--reward"
            type="button"
            onClick={onOpenRewardChat}
            disabled={!onOpenRewardChat}
          >
            보상받기
          </Button>
        ) : null}
        <Button
          className="result-primary-action result-primary-action--restart"
          type="button"
          onClick={onRestart}
        >
          다시 판독하기
        </Button>
      </div>

      {!isSafetyResult ? (
        <button
          className="result-objection-cta"
          type="button"
          aria-expanded={isPrecedentConfirmationOpen}
          aria-controls="precedent-objection-confirmation"
          onClick={() => {
            setIsPrecedentConfirmationOpen((isOpen) => {
              if (isOpen) {
                setHasPrecedentConsent(false);
              }

              return !isOpen;
            });
          }}
        >
          억울하면 유사 판례로 한 번 더 따져보기
        </button>
      ) : null}

      {!isSafetyResult && isPrecedentConfirmationOpen ? (
        <section
          id="precedent-objection-confirmation"
          className="precedent-confirmation-panel"
          aria-label="판례 분석 결제 전 확인"
        >
          <div className="precedent-confirmation-panel__header">
            <h2>판례로 한 번 더 확인하기</h2>
            <strong>990원</strong>
          </div>
          <p>
            결제 후 판독 대화 텍스트를 서버로 보내 유사 판례와 비교해요.
          </p>
          <p>
            법률 상담이 아닌 참고용 분석이에요. 상황과 쟁점에 따라 유사 판례가
            없을 수 있어요.
          </p>
          <label className="precedent-confirmation-panel__consent">
            <input
              type="checkbox"
              checked={hasPrecedentConsent}
              onChange={(event) => {
                setHasPrecedentConsent(event.currentTarget.checked);
              }}
            />
            <span>서버 전송과 참고용 분석에 동의합니다.</span>
          </label>
          <button type="button" disabled={!hasPrecedentConsent}>
            동의하고 분석하기
          </button>
        </section>
      ) : null}

      {!isSafetyResult ? (
        <section className="result-comments-board" aria-label="판정 댓글">
          <div className="result-comments-board__title-row">
            <h2>
              <strong>{comments.length}</strong>개의 댓글
            </h2>
            <button
              type="button"
              onClick={handleLike}
              className={hasLiked ? "is-liked" : ""}
              aria-pressed={hasLiked}
              disabled={isReactionPending}
            >
              선넘었어요 {likeCount}
            </button>
          </div>
          <h3>댓글쓰기</h3>
          <form className="result-comment-form" onSubmit={handleCommentSubmit}>
            <textarea
              aria-label="판정 댓글"
              value={commentDraft}
              placeholder="타인을 배려하는 마음을 담아 댓글을 남겨주세요."
              onChange={(event) => {
                setCommentDraft(event.currentTarget.value);
                setCommentMessage(null);
              }}
            />
            <button
              type="submit"
              disabled={commentDraft.trim().length === 0 || isReactionPending}
            >
              등록
            </button>
          </form>
          {commentMessage ? (
            <p className="result-share-status" role="alert">
              {commentMessage}
            </p>
          ) : null}
          <ol className="result-comments">
            {comments.map((comment) => (
              <li key={comment.id}>
                <p>{comment.body}</p>
              </li>
            ))}
          </ol>
          {comments.length === 0 ? (
            <p className="result-comments-empty">
              아직 댓글이 없어요. 판독 결과에 한마디를 남겨보세요.
            </p>
          ) : null}
          <div className="result-share-actions" aria-label="판정 공유 방법">
            <button type="button" disabled={isReactionPending} onClick={() => void handleChannelShare("kakao")}>
              카톡 보내기
            </button>
            <button type="button" disabled={isReactionPending} onClick={() => void handleChannelShare("telegram")}>
              텔레그램 보내기
            </button>
            <button type="button" disabled={isReactionPending} onClick={() => void handleChannelShare("link")}>
              링크 보내기
            </button>
          </div>
          <button
            className="result-share-button"
            type="button"
            disabled={isReactionPending}
            onClick={handleShare}
          >
            기본 공유 열기
          </button>
          {shareMessage ? <p className="result-share-status">{shareMessage}</p> : null}
        </section>
      ) : null}
    </main>
  );
}
