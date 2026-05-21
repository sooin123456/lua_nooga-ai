import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { RoomScreen } from "./RoomScreen";
import type { EphemeralRoom, RoomMessage, RoomParticipant } from "./types";

const room: EphemeralRoom = {
  id: "room-1",
  status: "open",
  hostLabel: "A",
  createdAt: "2026-05-20T12:00:00.000Z",
  startedAt: "2026-05-20T12:00:00.000Z",
  expiresAt: "2026-05-20T12:01:00.000Z",
  result: null,
};

const participantA: RoomParticipant = {
  id: "p1",
  roomId: "room-1",
  role: "A",
  nickname: "루아",
  clientKey: "client-a",
  joinedAt: "2026-05-20T12:00:01.000Z",
};

const participantB: RoomParticipant = {
  id: "p2",
  roomId: "room-1",
  role: "B",
  nickname: "친구",
  clientKey: "client-b",
  joinedAt: "2026-05-20T12:00:02.000Z",
};

describe("RoomScreen", () => {
  it("asks for a nickname before entering the room", async () => {
    const user = userEvent.setup();
    const onJoinRoom = vi.fn();

    render(
      <RoomScreen
        currentParticipant={null}
        errorMessage={null}
        isExploding={false}
        isLoading={false}
        messages={[]}
        participants={[]}
        remainingSeconds={60}
        room={{ ...room, startedAt: null }}
        onBack={vi.fn()}
        onExplodeNow={vi.fn()}
        onJoinRoom={onJoinRoom}
        onSendMessage={vi.fn()}
      />,
    );

    await user.type(screen.getByLabelText("판정방 닉네임"), "수인");
    await user.click(screen.getByRole("button", { name: "입장하기" }));

    expect(onJoinRoom).toHaveBeenCalledWith({ nickname: "수인" });
    expect(screen.getByText("대기")).toBeInTheDocument();
  });

  it("lets participants add messages before the room explodes", async () => {
    const user = userEvent.setup();
    const onSendMessage = vi.fn();

    render(
      <RoomScreen
        currentParticipant={participantA}
        errorMessage={null}
        isExploding={false}
        isLoading={false}
        messages={[]}
        participants={[participantA, participantB]}
        remainingSeconds={60}
        room={room}
        onBack={vi.fn()}
        onExplodeNow={vi.fn()}
        onJoinRoom={vi.fn()}
        onSendMessage={onSendMessage}
      />,
    );

    await user.type(screen.getByLabelText("판정방 메시지"), "그 말은 선 넘었어");
    await user.click(screen.getByRole("button", { name: "보내기" }));

    expect(onSendMessage).toHaveBeenCalledWith({
      body: "그 말은 선 넘었어",
    });
  });

  it("lets spectators watch without sending messages", () => {
    const spectator: RoomParticipant = {
      id: "p3",
      roomId: "room-1",
      role: "spectator",
      nickname: "구경꾼",
      clientKey: "client-c",
      joinedAt: "2026-05-20T12:00:03.000Z",
    };

    render(
      <RoomScreen
        currentParticipant={spectator}
        errorMessage={null}
        isExploding={false}
        isLoading={false}
        messages={[]}
        participants={[participantA, participantB, spectator]}
        remainingSeconds={42}
        room={room}
        onBack={vi.fn()}
        onExplodeNow={vi.fn()}
        onJoinRoom={vi.fn()}
        onSendMessage={vi.fn()}
      />,
    );

    expect(screen.getByLabelText("판정방 메시지")).toBeDisabled();
    expect(screen.getByPlaceholderText("관전자는 읽기만 가능해요")).toBeInTheDocument();
    expect(screen.getByText(/관전 구경꾼/)).toBeInTheDocument();
  });

  it("shows the explosion state when the countdown reaches zero", () => {
    const messages: RoomMessage[] = [
      {
        id: "m1",
        roomId: "room-1",
        author: "B",
        nickname: "친구",
        body: "미안해. 다시 말할게.",
        createdAt: "2026-05-20T12:00:12.000Z",
      },
    ];

    render(
      <RoomScreen
        currentParticipant={participantA}
        errorMessage={null}
        isExploding
        isLoading={false}
        messages={messages}
        participants={[participantA, participantB]}
        remainingSeconds={0}
        room={room}
        onBack={vi.fn()}
        onExplodeNow={vi.fn()}
        onJoinRoom={vi.fn()}
        onSendMessage={vi.fn()}
      />,
    );

    expect(screen.getByText("대화 폭발 중")).toBeInTheDocument();
    expect(screen.getByText("미안해. 다시 말할게.")).toBeInTheDocument();
  });

  it("lets the host copy the invite link", async () => {
    const user = userEvent.setup();
    const onCopyInvite = vi.fn();

    render(
      <RoomScreen
        currentParticipant={participantA}
        errorMessage={null}
        inviteStatus="초대 링크를 복사해서 상대를 바로 부를 수 있어요."
        inviteUrl="http://localhost:5173/?room=room-1"
        isExploding={false}
        isLoading={false}
        messages={[]}
        participants={[participantA]}
        remainingSeconds={60}
        room={{ ...room, startedAt: null }}
        onBack={vi.fn()}
        onCopyInvite={onCopyInvite}
        onExplodeNow={vi.fn()}
        onJoinRoom={vi.fn()}
        onSendMessage={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { name: "초대 링크 복사" }));

    expect(onCopyInvite).toHaveBeenCalledOnce();
    expect(
      screen.getByText("초대 링크를 복사해서 상대를 바로 부를 수 있어요."),
    ).toBeInTheDocument();
  });
});
