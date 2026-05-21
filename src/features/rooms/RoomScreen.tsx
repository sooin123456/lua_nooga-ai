import { ArrowLeft, Bomb, Send } from "lucide-react";
import { useState } from "react";
import type { EphemeralRoom, RoomMessage, RoomParticipant } from "./types";

type RoomScreenProps = {
  room: EphemeralRoom | null;
  messages: RoomMessage[];
  participants: RoomParticipant[];
  currentParticipant: RoomParticipant | null;
  remainingSeconds: number;
  isLoading: boolean;
  isExploding: boolean;
  errorMessage: string | null;
  inviteStatus?: string | null;
  inviteUrl?: string;
  onBack(): void;
  onCopyInvite?(): void;
  onExplodeNow(): void;
  onJoinRoom(input: { nickname: string }): void | Promise<void>;
  onSendMessage(input: { body: string }): void | Promise<void>;
};

export function RoomScreen({
  room,
  messages,
  participants,
  currentParticipant,
  remainingSeconds,
  isLoading,
  isExploding,
  errorMessage,
  inviteStatus,
  inviteUrl,
  onBack,
  onCopyInvite,
  onExplodeNow,
  onJoinRoom,
  onSendMessage,
}: RoomScreenProps) {
  const [nickname, setNickname] = useState("");
  const [body, setBody] = useState("");
  const [isJoining, setIsJoining] = useState(false);
  const isCountdownStarted = Boolean(room?.startedAt);
  const isSpectator = currentParticipant?.role === "spectator";
  const isRoomClosed =
    !room || room.status === "exploded" || (isCountdownStarted && remainingSeconds === 0);
  const canChat = Boolean(currentParticipant && !isSpectator && !isRoomClosed);
  const canExplode = Boolean(canChat && isCountdownStarted && messages.length > 0 && !isExploding);
  const isCountdownHot = isCountdownStarted && !isRoomClosed && remainingSeconds > 0 && remainingSeconds <= 5;
  const hasJoined = Boolean(currentParticipant);
  const isInviteStep = Boolean(room && currentParticipant && !isCountdownStarted);

  const submitNickname = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const nextNickname = nickname.trim();
    if (!nextNickname || !room || isJoining) {
      return;
    }

    setIsJoining(true);

    try {
      await onJoinRoom({ nickname: nextNickname });
    } finally {
      setIsJoining(false);
    }
  };

  const submitMessage = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const nextBody = body.trim();
    if (!nextBody || !canChat) {
      return;
    }

    await onSendMessage({ body: nextBody });
    setBody("");
  };

  const participantSummary = participants.length
    ? participants
        .map(({ role, nickname }) => `${role === "spectator" ? "관전" : role} ${nickname}`)
        .join(" · ")
    : "입장한 사람이 아직 없어요.";

  return (
    <main className="screen screen--room">
      <section className="room-shell" aria-label="실시간 판정방">
        <header className="room-header">
          <button className="icon-button" type="button" aria-label="돌아가기" onClick={onBack}>
            <ArrowLeft size={19} />
          </button>
          <div>
            <strong>실시간 폭발 판정방</strong>
            <p>
              {isCountdownStarted
                ? "60초 뒤 대화는 사라지고 결과만 남아요."
                : "A와 B가 모두 입장하면 60초 카운트가 시작돼요."}
            </p>
          </div>
          <div className={`room-timer${isCountdownHot ? " room-timer--hot" : ""}`}>
            {isCountdownStarted ? `${remainingSeconds}s` : "대기"}
          </div>
        </header>

        <article className="room-notice">
          <Bomb size={18} />
          <span>
            {isExploding
              ? "대화 폭발 중"
              : isCountdownStarted
                ? "원문은 판정 직후 삭제돼요"
                : "상대가 입장하면 폭파 타이머가 켜져요"}
          </span>
        </article>

        {errorMessage ? <p className="room-error">{errorMessage}</p> : null}
        {isLoading ? <p className="room-status">판정방을 여는 중이에요.</p> : null}
        {isSpectator ? (
          <p className="room-spectator-note">
            관전 중이에요. 결과가 나온 뒤 댓글로 참여할 수 있어요.
          </p>
        ) : null}
        {isCountdownHot ? (
          <p className="room-countdown-warning" role="status">
            루아가 망치를 들었어요.
          </p>
        ) : null}

        {room && !currentParticipant ? (
          <form className="room-join-card" onSubmit={submitNickname}>
            <strong>닉네임을 정하고 입장해 주세요</strong>
            <p>첫 두 명은 A/B 당사자, 세 번째부터는 관전자로 들어와요.</p>
            <label className="sr-only" htmlFor="room-nickname">
              판정방 닉네임
            </label>
            <input
              id="room-nickname"
              maxLength={12}
              value={nickname}
              placeholder="예: 루아, 수인, 친구"
              onChange={(event) => setNickname(event.currentTarget.value)}
            />
            <button type="submit" disabled={nickname.trim().length === 0 || isJoining}>
              {isJoining ? "입장 중..." : "입장하기"}
            </button>
          </form>
        ) : null}

        {isInviteStep ? (
          <section className="room-invite-step" aria-label="초대 링크 보내기">
            <strong>초대 링크를 보내고 기다려요</strong>
            <p>상대가 입장하면 입장 현황과 채팅 화면이 열리고 60초 카운트가 시작돼요.</p>
            {inviteUrl ? (
              <button className="room-invite-button" type="button" onClick={onCopyInvite}>
                초대 링크 보내기
              </button>
            ) : null}
            {inviteStatus ? <p className="room-status">{inviteStatus}</p> : null}
          </section>
        ) : null}

        {hasJoined && !isInviteStep ? (
          <>
            <div className="room-participants" aria-label="참여자">
              <strong>입장 현황</strong>
              <p>{participantSummary}</p>
            </div>

            <div className="room-messages" aria-live="polite">
              {messages.length === 0 ? (
                <p className="room-empty">
                  {isCountdownStarted
                    ? "A와 B가 각자 할 말을 남겨주세요."
                    : "아직 카운트다운 전이에요. 상대를 기다리는 중입니다."}
                </p>
              ) : (
                messages.map((message) => (
                  <article
                    className={`room-message room-message--${
                      currentParticipant?.role === message.author ? "mine" : "other"
                    }`}
                    key={message.id}
                  >
                    <span>
                      {message.nickname} · {message.author}
                    </span>
                    <p>{message.body}</p>
                  </article>
                ))
              )}
            </div>

            <form className="room-composer" onSubmit={submitMessage}>
              <label className="sr-only" htmlFor="room-message">
                판정방 메시지
              </label>
              <input
                id="room-message"
                value={body}
                disabled={!canChat}
                placeholder={
                  isSpectator
                    ? "관전자는 읽기만 가능해요"
                    : isRoomClosed
                      ? "대화가 폭발했어요"
                      : "할 말을 입력하세요"
                }
                onChange={(event) => setBody(event.currentTarget.value)}
              />
              <button type="submit" disabled={!canChat || body.trim().length === 0}>
                <Send size={16} />
                보내기
              </button>
            </form>

            <button
              className="room-explode-button"
              type="button"
              disabled={!canExplode}
              onClick={onExplodeNow}
            >
              지금 판정하기
            </button>
          </>
        ) : null}
      </section>
    </main>
  );
}
