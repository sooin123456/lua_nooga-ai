import { openURL } from "@apps-in-toss/web-framework";
import { ArrowLeft, Flame, History, Home, MessageCirclePlus } from "lucide-react";
import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import { EvidenceMethodCard } from "./EvidenceMethodCard";
import { inputMethods, type InputMethod } from "./inputMethods";
import {
  createConfiguredResultShareService,
  type createResultShareService,
} from "../resultShare/resultShareAdapter";
import type { HotBattle, ResultComment, ResultLikeState } from "../resultShare/types";

type InputHomeProps = {
  resultShareService?: ReturnType<typeof createResultShareService> | null;
  onCreateRoom(): void;
  onSelect(method: InputMethod): void;
};

type LeaderboardItem = {
  id: string;
  rank: number;
  title: string;
  verdict: string;
  likes: number;
  comments: number;
  summary: string;
  conversation: string[];
  commentsPreview: string[];
};

type HomeTab = "home" | "hot" | "recent";

type HomeTabBarProps = {
  activeTab: HomeTab;
  onCreateRoom(): void;
  onHome(): void;
  onHotBattle(): void;
  onRecent(): void;
};

const fallbackLeaderboardItems: LeaderboardItem[] = [
  {
    id: "late-reply",
    rank: 1,
    title: "연락 늦게 봤다 vs 말투가 셌다",
    verdict: "A가 62% 선넘었어요",
    likes: 21,
    comments: 8,
    summary:
      "A는 늦게 본 이유를 설명했지만, 이후 대화에서 방어적인 말투가 반복됐어요.",
    conversation: [
      "A: 이제 봤어. 뭐가 그렇게 급해?",
      "B: 기다리고 있었는데 말이라도 해줬으면 좋았잖아.",
      "A: 나도 바빴어. 꼭 내가 다 잘못한 것처럼 말하네.",
    ],
    commentsPreview: ["말투가 더 문제였던 듯", "늦게 본 건 설명하면 끝인데"],
  },
  {
    id: "late-date",
    rank: 2,
    title: "약속 시간 20분 지각 사건",
    verdict: "B가 71% 선넘었어요",
    likes: 14,
    comments: 5,
    summary:
      "B는 지각 자체보다 미리 말하지 않은 점과 사과가 늦은 점이 크게 잡혔어요.",
    conversation: [
      "A: 거의 다 왔어?",
      "B: 미안, 20분 늦을 것 같아.",
      "A: 지금 말하면 나는 여기서 계속 기다리라는 거야?",
      "B: 그렇게 화낼 일은 아니잖아.",
    ],
    commentsPreview: ["20분이면 미리 말했어야지", "사과 타이밍이 늦었다"],
  },
  {
    id: "gift-misread",
    rank: 3,
    title: "선물 취향 안 맞았다 사건",
    verdict: "A가 56% 선넘었어요",
    likes: 11,
    comments: 3,
    summary:
      "선물 자체보다 고맙다는 표현 없이 실망부터 말한 점이 크게 보였어요.",
    conversation: [
      "B: 네가 좋아할 줄 알고 골랐어.",
      "A: 근데 이건 내 취향 아닌 거 알지 않았어?",
      "B: 그래도 마음은 생각해줬으면 좋겠어.",
    ],
    commentsPreview: ["고맙다는 말 먼저 했으면 끝났을 듯", "선물은 마음이지"],
  },
];

const leaderboardIcons = ["🥇", "🥈", "🥉"];
const reconciliationProducts = [
  "편의점 커피 쿠폰",
  "달달한 마카롱 세트",
  "미니 꽃다발",
  "귀여운 키링",
  "치킨 쿠폰",
] as const;

function createShoppingSearchUrl(query: string) {
  return `https://service.toss.im/shopping-discovery/search?keyword=${encodeURIComponent(query)}`;
}

function HomeTabBar({
  activeTab,
  onCreateRoom,
  onHome,
  onHotBattle,
  onRecent,
}: HomeTabBarProps) {
  return (
    <nav className="home-tabbar" aria-label="하단 탭">
      <button
        type="button"
        aria-current={activeTab === "home" ? "page" : undefined}
        onClick={onHome}
      >
        <Home size={18} strokeWidth={2.4} />
        <span>홈</span>
      </button>
      <button type="button" onClick={onCreateRoom}>
        <MessageCirclePlus size={18} strokeWidth={2.4} />
        <span>판정방</span>
      </button>
      <button
        type="button"
        aria-current={activeTab === "hot" ? "page" : undefined}
        onClick={onHotBattle}
      >
        <Flame size={18} strokeWidth={2.4} />
        <span>핫 Battle</span>
      </button>
      <button
        type="button"
        aria-current={activeTab === "recent" ? "page" : undefined}
        onClick={onRecent}
      >
        <History size={18} strokeWidth={2.4} />
        <span>최근</span>
      </button>
    </nav>
  );
}

function createLeaderboardItemFromHotBattle(
  battle: HotBattle,
  index: number,
): LeaderboardItem {
  return {
    id: battle.id,
    rank: index + 1,
    title: battle.result.verdict,
    verdict: battle.result.verdict,
    likes: battle.likeCount,
    comments: battle.commentCount,
    summary: battle.result.reasons.slice(0, 2).join(" "),
    conversation: [
      `A: ${battle.result.reasons[0] ?? "내 입장도 들어줘."}`,
      `B: ${battle.result.reasons[1] ?? "그 말은 조금 서운했어."}`,
      `루아 AI: ${battle.result.advice}`,
    ],
    commentsPreview: [battle.result.advice],
  };
}

export function InputHome({
  resultShareService,
  onCreateRoom,
  onSelect,
}: InputHomeProps) {
  const [selectedBattleId, setSelectedBattleId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<HomeTab>("home");
  const [commentDraft, setCommentDraft] = useState("");
  const [leaderboardItems, setLeaderboardItems] = useState<LeaderboardItem[]>(
    fallbackLeaderboardItems,
  );
  const [leaderboardStatus, setLeaderboardStatus] = useState<string>(
    "서버 연결 전에는 샘플 Battle을 보여드려요.",
  );
  const configuredResultShareService = useMemo(
    () =>
      resultShareService === undefined
        ? createConfiguredResultShareService()
        : resultShareService,
    [resultShareService],
  );
  const [commentCounts, setCommentCounts] = useState<Record<string, number>>(
    () =>
      Object.fromEntries(
        fallbackLeaderboardItems.map(({ id, comments }) => [id, comments]),
      ),
  );
  const [latestComments, setLatestComments] = useState<Record<string, string>>({});
  const [battleComments, setBattleComments] = useState<Record<string, ResultComment[]>>({});
  const [battleLikeStates, setBattleLikeStates] = useState<
    Record<string, ResultLikeState>
  >({});
  const [battleActionStatus, setBattleActionStatus] = useState("");
  const [pendingBattleAction, setPendingBattleAction] = useState<
    "comment" | "like" | "report" | null
  >(null);
  const [randomRewardLabel, setRandomRewardLabel] = useState(reconciliationProducts[0]);

  useEffect(() => {
    if (!configuredResultShareService) {
      return;
    }

    let isCurrent = true;
    configuredResultShareService
      .listHotBattles(5)
      .then((hotBattles) => {
        if (!isCurrent) {
          return;
        }

        if (hotBattles.length === 0) {
          setLeaderboardItems(fallbackLeaderboardItems);
          setLeaderboardStatus("아직 공개된 Battle이 없어 샘플을 보여드려요.");
          return;
        }

        const nextItems = hotBattles
          .slice(0, 3)
          .map(createLeaderboardItemFromHotBattle);
        setLeaderboardItems(nextItems);
        setCommentCounts(
          Object.fromEntries(nextItems.map(({ id, comments }) => [id, comments])),
        );
        setLeaderboardStatus("실시간 공유 결과 기준으로 집계했어요.");
      })
      .catch(() => {
        if (isCurrent) {
          setLeaderboardItems(fallbackLeaderboardItems);
          setLeaderboardStatus("핫 Battle을 불러오지 못해 샘플을 보여드려요.");
        }
      });

    return () => {
      isCurrent = false;
    };
  }, [configuredResultShareService]);

  useEffect(() => {
    if (!selectedBattleId || !configuredResultShareService) {
      return;
    }

    let isCurrent = true;
    setBattleActionStatus("댓글과 반응을 불러오고 있어요.");

    Promise.all([
      configuredResultShareService.listComments(selectedBattleId),
      configuredResultShareService.getLikeState(selectedBattleId),
    ])
      .then(([comments, likeState]) => {
        if (!isCurrent) {
          return;
        }

        setBattleComments((currentComments) => ({
          ...currentComments,
          [selectedBattleId]: comments,
        }));
        setBattleLikeStates((currentStates) => ({
          ...currentStates,
          [selectedBattleId]: likeState,
        }));
        setBattleActionStatus("실시간 댓글과 반응을 불러왔어요.");
      })
      .catch(() => {
        if (isCurrent) {
          setBattleActionStatus("댓글을 불러오지 못해 기본 댓글을 보여드려요.");
        }
      });

    return () => {
      isCurrent = false;
    };
  }, [configuredResultShareService, selectedBattleId]);

  const submitLeaderboardComment = async (
    event: FormEvent<HTMLFormElement>,
    itemId: string,
  ) => {
    event.preventDefault();

    const nextComment = commentDraft.trim();
    if (!nextComment) {
      return;
    }

    if (configuredResultShareService) {
      setPendingBattleAction("comment");
      setBattleActionStatus("댓글을 등록하고 있어요.");

      try {
        const comment = await configuredResultShareService.addComment(
          itemId,
          nextComment,
        );
        setBattleComments((currentComments) => ({
          ...currentComments,
          [itemId]: [comment, ...(currentComments[itemId] ?? [])],
        }));
        setCommentCounts((currentCounts) => ({
          ...currentCounts,
          [itemId]: (currentCounts[itemId] ?? 0) + 1,
        }));
        setCommentDraft("");
        setBattleActionStatus("댓글이 등록됐어요.");
      } catch {
        setBattleActionStatus("댓글 등록에 실패했어요. 잠시 후 다시 시도해주세요.");
      } finally {
        setPendingBattleAction(null);
      }

      return;
    }

    setCommentCounts((currentCounts) => ({
      ...currentCounts,
      [itemId]: (currentCounts[itemId] ?? 0) + 1,
    }));
    setLatestComments((currentComments) => ({
      ...currentComments,
      [itemId]: nextComment,
    }));
    setCommentDraft("");
  };

  const toggleBattleLike = async (itemId: string) => {
    const currentItem = leaderboardItems.find(({ id }) => id === itemId);
    const currentState = battleLikeStates[itemId] ?? {
      likeCount: currentItem?.likes ?? 0,
      hasLiked: false,
    };

    if (!configuredResultShareService) {
      setBattleLikeStates((currentStates) => ({
        ...currentStates,
        [itemId]: {
          likeCount: currentState.hasLiked
            ? Math.max(0, currentState.likeCount - 1)
            : currentState.likeCount + 1,
          hasLiked: !currentState.hasLiked,
        },
      }));
      return;
    }

    setPendingBattleAction("like");
    setBattleActionStatus("반응을 남기고 있어요.");

    try {
      const nextState = await configuredResultShareService.setLiked(
        itemId,
        !currentState.hasLiked,
      );
      setBattleLikeStates((currentStates) => ({
        ...currentStates,
        [itemId]: nextState,
      }));
      setBattleActionStatus(
        nextState.hasLiked ? "선넘었어요 반응을 남겼어요." : "반응을 취소했어요.",
      );
    } catch {
      setBattleActionStatus("반응 저장에 실패했어요. 잠시 후 다시 시도해주세요.");
    } finally {
      setPendingBattleAction(null);
    }
  };

  const reportBattle = async (itemId: string) => {
    if (!configuredResultShareService) {
      setBattleActionStatus("신고가 접수됐어요.");
      return;
    }

    setPendingBattleAction("report");
    setBattleActionStatus("신고를 접수하고 있어요.");

    try {
      await configuredResultShareService.reportResult(itemId, "inappropriate");
      setBattleActionStatus("신고가 접수됐어요. 검토 후 노출을 조정할게요.");
    } catch {
      setBattleActionStatus("신고 접수에 실패했어요. 잠시 후 다시 시도해주세요.");
    } finally {
      setPendingBattleAction(null);
    }
  };

  const selectedBattle = leaderboardItems.find(
    (item) => item.id === selectedBattleId,
  );

  const goHomeTab = () => {
    setSelectedBattleId(null);
    setCommentDraft("");
    setActiveTab("home");
  };

  const openHotBattleTab = () => {
    setSelectedBattleId(null);
    setCommentDraft("");
    setActiveTab("hot");
  };

  const openRecentTab = () => {
    setSelectedBattleId(null);
    setCommentDraft("");
    setActiveTab("recent");
  };

  const createRoomFromHome = () => {
    setActiveTab("home");
    onCreateRoom();
  };

  const openRandomReward = async () => {
    const nextProduct =
      reconciliationProducts[
        Math.floor(Math.random() * reconciliationProducts.length)
      ];
    setRandomRewardLabel(nextProduct);
    await openURL(createShoppingSearchUrl(nextProduct));
  };

  if (activeTab === "recent") {
    return (
      <main className="screen screen--home">
        <section className="home-dashboard home-dashboard--page" aria-label="최근 판정">
          <button
            className="home-detail-back"
            type="button"
            aria-label="홈으로 돌아가기"
            onClick={goHomeTab}
          >
            <ArrowLeft size={18} strokeWidth={2.5} />
          </button>
          <div className="home-page-heading">
            <span>최근</span>
            <h1>최근 판정 기록</h1>
            <p>이 기기에서 이어서 볼 판정 기록을 모아둘 공간이에요.</p>
          </div>
          <article className="home-recent-empty">
            <strong>아직 저장된 판정이 없어요</strong>
            <p>첫 판정을 마치면 결과, 보상 추천, 공유 링크를 여기서 다시 볼 수 있게 연결할 예정이에요.</p>
          </article>
        </section>
        <HomeTabBar
          activeTab={activeTab}
          onCreateRoom={createRoomFromHome}
          onHome={goHomeTab}
          onHotBattle={openHotBattleTab}
          onRecent={openRecentTab}
        />
      </main>
    );
  }

  if (selectedBattle) {
    const likeState = battleLikeStates[selectedBattle.id] ?? {
      likeCount: selectedBattle.likes,
      hasLiked: false,
    };
    const serverComments = battleComments[selectedBattle.id];
    const visibleComments =
      serverComments && serverComments.length > 0
        ? serverComments.map((comment) => comment.body)
        : [
            ...(latestComments[selectedBattle.id]
              ? [latestComments[selectedBattle.id]]
              : []),
            ...selectedBattle.commentsPreview,
          ];

    return (
      <main className="screen screen--home">
        <section className="home-dashboard" aria-label="핫 Battle 상세">
          <button
            className="home-detail-back"
            type="button"
            aria-label="핫 Battle로 돌아가기"
            onClick={() => {
              setSelectedBattleId(null);
              setCommentDraft("");
              setActiveTab("hot");
            }}
          >
            <ArrowLeft size={18} strokeWidth={2.5} />
          </button>

          <article className="home-battle-detail">
            <span className="home-leaderboard__rank">
              <span aria-hidden="true">
                {leaderboardIcons[selectedBattle.rank - 1] ?? "🏅"}
              </span>
              {selectedBattle.rank}위
            </span>
            <div>
              <h1>{selectedBattle.title}</h1>
              <p>댓글과 좋아요가 많이 모인 공개 Battle이에요.</p>
            </div>
            <div className="home-battle-detail__meta">
              <span>댓글 {commentCounts[selectedBattle.id]}</span>
              <button
                className="home-battle-reaction"
                type="button"
                aria-pressed={likeState.hasLiked}
                disabled={pendingBattleAction === "like"}
                onClick={() => void toggleBattleLike(selectedBattle.id)}
              >
                선넘었어요 {likeState.likeCount}
              </button>
              <button
                className="home-battle-report"
                type="button"
                disabled={pendingBattleAction === "report"}
                onClick={() => void reportBattle(selectedBattle.id)}
              >
                신고
              </button>
            </div>
            <p className="home-battle-detail__privacy">
              공개 Battle은 개인정보를 제외한 익명 요약으로 보여줘요.
            </p>
            {battleActionStatus ? (
              <p className="home-battle-detail__status">{battleActionStatus}</p>
            ) : null}
          </article>

          <section className="home-battle-transcript" aria-label="대화 내용">
            <h2>대화 내용</h2>
            <ol>
              {selectedBattle.conversation.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ol>
          </section>

          <article className="home-battle-verdict">
            <h2>루아 판정</h2>
            <strong>{selectedBattle.verdict}</strong>
            <p>{selectedBattle.summary}</p>
          </article>

          <section className="home-battle-comments" aria-label="댓글쓰기">
            <h2>댓글쓰기</h2>
            <ol>
              {visibleComments.map((comment) => (
                <li key={comment}>{comment}</li>
              ))}
            </ol>
            <form
              className="home-leaderboard__comment"
              onSubmit={(event) =>
                submitLeaderboardComment(event, selectedBattle.id)
              }
            >
              <label className="sr-only" htmlFor="battle-detail-comment">
                핫 Battle 댓글
              </label>
              <input
                id="battle-detail-comment"
                maxLength={40}
                value={commentDraft}
                placeholder="이 판정에 한마디 남기기"
                onChange={(event) => setCommentDraft(event.currentTarget.value)}
              />
              <button
                type="submit"
                disabled={
                  commentDraft.trim().length === 0 ||
                  pendingBattleAction === "comment"
                }
              >
                등록
              </button>
            </form>
          </section>
        </section>
        <HomeTabBar
          activeTab={activeTab}
          onCreateRoom={createRoomFromHome}
          onHome={goHomeTab}
          onHotBattle={openHotBattleTab}
          onRecent={openRecentTab}
        />
      </main>
    );
  }

  if (activeTab === "hot") {
    const mainBattle = leaderboardItems[0] ?? fallbackLeaderboardItems[0];
    const talkItems = leaderboardItems.flatMap((item) => [
      {
        id: `${item.id}-title`,
        battleId: item.id,
        label: item.title,
        count: commentCounts[item.id] ?? item.comments,
      },
      {
        id: `${item.id}-advice`,
        battleId: item.id,
        label: item.summary,
        count: item.likes,
      },
    ]);

    return (
      <main className="screen screen--home">
        <section className="home-dashboard home-dashboard--page hot-board" aria-label="핫 Battle 목록">
          <button
            className="home-detail-back"
            type="button"
            aria-label="홈으로 돌아가기"
            onClick={goHomeTab}
          >
            <ArrowLeft size={18} strokeWidth={2.5} />
          </button>

          <div className="hot-board__tabs" aria-label="핫 Battle 섹션">
            <strong>오늘의 판</strong>
            <span>루아의 선택 명예의 전당</span>
          </div>
          <p className="hot-board__status">{leaderboardStatus}</p>

          <header className="hot-board__date">
            <button type="button" aria-label="이전 날짜">‹</button>
            <h1>2026.05.21</h1>
            <button type="button" aria-label="다음 날짜">›</button>
          </header>

          <article className="hot-board__pick">
            <span className="hot-board__badge">오늘의 판</span>
            <div className="hot-board__thumb" aria-hidden="true" />
            <div>
              <strong>{mainBattle.title}</strong>
              <p>
                {mainBattle.verdict} · 댓글 {commentCounts[mainBattle.id] ?? mainBattle.comments}
              </p>
            </div>
          </article>

          <section className="hot-board__talk" aria-label="오늘의 톡">
            <div className="hot-board__talk-heading">
              <h2>오늘의 톡</h2>
              <span>2026.05.21</span>
            </div>
            <div className="hot-board__talk-grid">
              {talkItems.slice(0, 8).map((item) => (
                <button
                  type="button"
                  key={item.id}
                  onClick={() => {
                    const battle = leaderboardItems.find(
                      ({ id }) => id === item.battleId,
                    );
                    if (!battle) {
                      return;
                    }
                    setSelectedBattleId(battle.id);
                    setCommentDraft("");
                    setActiveTab("hot");
                  }}
                >
                  <span>{item.label}</span>
                  <em>({item.count})</em>
                </button>
              ))}
            </div>
          </section>
        </section>
        <HomeTabBar
          activeTab={activeTab}
          onCreateRoom={createRoomFromHome}
          onHome={goHomeTab}
          onHotBattle={openHotBattleTab}
          onRecent={openRecentTab}
        />
      </main>
    );
  }

  return (
    <main className="screen screen--home">
      <section className="home-dashboard" aria-label="입력 방식 선택">
        <article className="home-profile-card">
          <img
            src="/lua-ai-judge.png"
            width={52}
            height={52}
            alt=""
            aria-hidden="true"
          />
          <div>
            <strong>루아 AI</strong>
            <p>안녕하세요! 오늘의 싸움 기록을 판독해볼게요.</p>
          </div>
        </article>

        <div className="method-grid">
          {inputMethods.map(({ id, title, description, icon }, index) => (
            <EvidenceMethodCard
              description={description}
              icon={icon}
              key={id}
              index={index}
              title={title}
              onClick={() => onSelect(id)}
            />
          ))}
        </div>

        <button className="home-reward-card" type="button" onClick={() => void openRandomReward()}>
          <div className="home-reward-card__copy">
            <span>화해 추천</span>
            <strong>루아가 직접 화해의 상품을 추천해요</strong>
            <p>누르면 {randomRewardLabel} 같은 보상을 토스 쇼핑에서 찾아요.</p>
          </div>
          <span className="home-reward-card__art" aria-hidden="true" />
        </button>

        <p className="home-privacy-note">
          현재 무료 판독은 입력 내용을 이 기기 안에서만 가볍게 분석해요.
        </p>

        <p className="home-legal-note">
          재미용 판독이며 법률 상담이나 실제 법적 판단이 아니에요.
        </p>
      </section>
      <HomeTabBar
        activeTab={activeTab}
        onCreateRoom={createRoomFromHome}
        onHome={goHomeTab}
        onHotBattle={openHotBattleTab}
        onRecent={openRecentTab}
      />
    </main>
  );
}
