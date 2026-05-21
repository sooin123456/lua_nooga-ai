import { Flame, History, Home, MessageCirclePlus } from "lucide-react";
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
  const [isHotBattleOpen, setIsHotBattleOpen] = useState(false);
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
    setIsHotBattleOpen(false);
    setCommentDraft("");
    setActiveTab("home");
  };

  const openHotBattleTab = () => {
    setSelectedBattleId(null);
    setIsHotBattleOpen(true);
    setCommentDraft("");
    setActiveTab("hot");
  };

  const openRecentTab = () => {
    setSelectedBattleId(null);
    setIsHotBattleOpen(false);
    setCommentDraft("");
    setActiveTab("recent");

    window.requestAnimationFrame(() => {
      document
        .getElementById("home-recent-card")
        ?.scrollIntoView?.({ block: "center" });
    });
  };

  const createRoomFromHome = () => {
    setActiveTab("home");
    onCreateRoom();
  };

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
              <h2>판정 결과</h2>
              <strong>{selectedBattle.title}</strong>
              <p>{selectedBattle.verdict}</p>
            </div>
            <p>{selectedBattle.summary}</p>
            <div className="home-battle-detail__meta">
              <span>댓글 {commentCounts[selectedBattle.id]}</span>
              <span>좋아요 {selectedBattle.likes}</span>
            </div>
          </article>

          <section className="home-battle-transcript" aria-label="대화 내용">
            <h2>대화 내용</h2>
            <ol>
              {selectedBattle.conversation.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ol>
          </section>

          <section className="home-battle-comments" aria-label="댓글">
            <h2>댓글</h2>
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
          <button
            type="button"
            aria-expanded={isHotBattleOpen}
            onClick={() =>
              setIsHotBattleOpen((isOpen) => {
                const nextIsOpen = !isOpen;
                setActiveTab(nextIsOpen ? "hot" : "home");
                return nextIsOpen;
              })
            }
          >
            {isHotBattleOpen ? "닫기" : "랭킹 보기"}
          </button>
        </article>

        {isHotBattleOpen ? (
          <section className="home-leaderboard" aria-label="오늘의 핫 Battle">
            <div className="home-leaderboard__header">
              <strong>Top 3</strong>
              <span>댓글이 많이 달린 판정만 모았어요.</span>
            </div>
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
                    {item.verdict} · 댓글 {commentCounts[item.id]} · 좋아요{" "}
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
                  댓글달기
                </button>
              </article>
            ))}
          </section>
        ) : null}

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
