import { openURL } from "@apps-in-toss/web-framework";
import { Flame, Gift, History, Home, MessageCirclePlus } from "lucide-react";
import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import { EvidenceMethodCard } from "./EvidenceMethodCard";
import { inputMethods, type InputMethod } from "./inputMethods";
import {
  createConfiguredResultShareService,
  type createResultShareService,
} from "../resultShare/resultShareAdapter";
import type { HotBattle } from "../resultShare/types";

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

  const submitLeaderboardComment = (
    event: FormEvent<HTMLFormElement>,
    itemId: string,
  ) => {
    event.preventDefault();

    const nextComment = commentDraft.trim();
    if (!nextComment) {
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
          <button className="home-detail-back" type="button" onClick={goHomeTab}>
            홈으로 돌아가기
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
    return (
      <main className="screen screen--home">
        <section className="home-dashboard" aria-label="핫 Battle 상세">
          <button
            className="home-detail-back"
            type="button"
            onClick={() => {
              setSelectedBattleId(null);
              setCommentDraft("");
              setActiveTab("hot");
            }}
          >
            핫 Battle로 돌아가기
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
              <span>좋아요 {selectedBattle.likes}</span>
            </div>
            <p className="home-battle-detail__privacy">
              공개 Battle은 개인정보를 제외한 익명 요약으로 보여줘요.
            </p>
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
              {latestComments[selectedBattle.id] ? (
                <li>{latestComments[selectedBattle.id]}</li>
              ) : null}
              {selectedBattle.commentsPreview.map((comment) => (
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
              <button type="submit" disabled={commentDraft.trim().length === 0}>
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
    return (
      <main className="screen screen--home">
        <section className="home-dashboard home-dashboard--page" aria-label="핫 Battle 목록">
          <button className="home-detail-back" type="button" onClick={goHomeTab}>
            홈으로 돌아가기
          </button>
          <div className="home-page-heading">
            <span>오늘의 핫 Battle 🔥</span>
            <h1>Top 3</h1>
            <p>{leaderboardStatus}</p>
          </div>
          <section className="home-leaderboard home-leaderboard--page" aria-label="Top 3">
            {leaderboardItems.slice(0, 3).map((item) => (
              <article className="home-leaderboard__item" key={item.id}>
                <span className="home-leaderboard__rank">
                  <span aria-hidden="true">
                    {leaderboardIcons[item.rank - 1] ?? "🏅"}
                  </span>
                  {item.rank}위
                </span>
                <div>
                  <strong>{item.title}</strong>
                  <p>
                    {item.verdict} · 댓글 {commentCounts[item.id] ?? item.comments} · 좋아요{" "}
                    {item.likes}
                  </p>
                  {latestComments[item.id] ? (
                    <em>최근 댓글: {latestComments[item.id]}</em>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedBattleId(item.id);
                    setCommentDraft("");
                    setActiveTab("hot");
                  }}
                >
                  자세히 보기
                </button>
              </article>
            ))}
          </section>
          <section className="home-battle-feed" aria-label="올라온 Battle">
            <h2>올라온 리스트</h2>
            {leaderboardItems.map((item) => (
              <button
                type="button"
                key={item.id}
                onClick={() => {
                  setSelectedBattleId(item.id);
                  setCommentDraft("");
                  setActiveTab("hot");
                }}
              >
                <strong>{item.title}</strong>
                <span>댓글 {commentCounts[item.id] ?? item.comments} · 좋아요 {item.likes}</span>
              </button>
            ))}
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

        <article className="home-tip-card">
          <span aria-hidden="true">🔥</span>
          <div>
            <strong>오늘의 핫 Battle 🔥</strong>
            <p>{leaderboardStatus}</p>
          </div>
          <button type="button" onClick={openHotBattleTab}>
            보러가기
          </button>
        </article>

        <button className="home-reward-card" type="button" onClick={() => void openRandomReward()}>
          <span>
            <Gift size={20} strokeWidth={2.5} />
          </span>
          <div>
            <strong>루아가 직접 화해의 상품을 추천해요</strong>
            <p>누르면 랜덤으로 {randomRewardLabel} 같은 보상을 토스 쇼핑에서 찾아요.</p>
          </div>
        </button>

        <div className="home-quick-actions">
          <button type="button" onClick={createRoomFromHome}>
            <span>
              <MessageCirclePlus size={20} strokeWidth={2.5} />
            </span>
            <strong>실시간 판정방 만들기</strong>
            <em>초대 링크로 상대를 부르고 대화는 60초 뒤 사라져요.</em>
          </button>
        </div>

        <div className="method-grid">
          {inputMethods.map(({ id, title, description, Icon }, index) => (
            <EvidenceMethodCard
              Icon={Icon}
              description={description}
              key={id}
              index={index}
              title={title}
              onClick={() => onSelect(id)}
            />
          ))}
        </div>

        <article className="home-status-card" id="home-recent-card">
          <div>
            <strong>최근 판정</strong>
            <p>아직 저장된 판정이 없어요. 첫 사건을 접수해 보세요.</p>
          </div>
          <span>0건</span>
        </article>

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
