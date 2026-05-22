import { describe, expect, it, vi } from "vitest";
import {
  createEphemeralRoomService,
  formatRoomTranscript,
  getRemainingSeconds,
} from "./roomAdapter";
import type { RoomMessage } from "./types";

const fixedNow = new Date("2026-05-20T12:00:00.000Z");

describe("roomAdapter", () => {
  it("formats room messages for the analyzer without extra metadata", () => {
    const messages: RoomMessage[] = [
      {
        id: "m1",
        roomId: "room-1",
        author: "A",
        nickname: "루아",
        body: "왜 내 말을 안 들어?",
        createdAt: "2026-05-20T12:00:03.000Z",
      },
      {
        id: "m2",
        roomId: "room-1",
        author: "B",
        nickname: "친구",
        body: "말투가 너무 세서 놀랐어.",
        createdAt: "2026-05-20T12:00:05.000Z",
      },
    ];

    expect(formatRoomTranscript(messages)).toBe(
      "A: 왜 내 말을 안 들어?\nB: 말투가 너무 세서 놀랐어.",
    );
  });

  it("calculates remaining room seconds from the server expiry time", () => {
    expect(
      getRemainingSeconds({
        expiresAt: "2026-05-20T12:00:35.000Z",
        now: fixedNow,
      }),
    ).toBe(35);
    expect(
      getRemainingSeconds({
        expiresAt: "2026-05-20T11:59:59.000Z",
        now: fixedNow,
      }),
    ).toBe(0);
  });

  it("uses the gateway to create a 60 second ephemeral room", async () => {
    const gateway = {
      createRoom: vi.fn().mockResolvedValue({
        id: "room-1",
        status: "open",
        hostLabel: "A",
        createdAt: "2026-05-20T12:00:00.000Z",
        startedAt: null,
        expiresAt: "2026-05-20T12:10:00.000Z",
        result: null,
      }),
      getRoom: vi.fn(),
      listParticipants: vi.fn(),
      joinParticipant: vi.fn(),
      startRoomCountdown: vi.fn(),
      listMessages: vi.fn(),
      sendMessage: vi.fn(),
      explodeRoom: vi.fn(),
      cleanupExpiredMessages: vi.fn(),
      subscribe: vi.fn(),
    };
    const service = createEphemeralRoomService({
      gateway,
      now: () => fixedNow,
    });

    const room = await service.createRoom({ hostLabel: "A" });

    expect(gateway.createRoom).toHaveBeenCalledWith({
      hostLabel: "A",
      expiresAt: "2026-05-20T12:10:00.000Z",
    });
    expect(room.id).toBe("room-1");
  });

  it("starts the 60 second countdown when the second party joins", async () => {
    const gateway = {
      createRoom: vi.fn(),
      getRoom: vi.fn().mockResolvedValue({
        id: "room-1",
        status: "open",
        hostLabel: "A",
        createdAt: "2026-05-20T12:00:00.000Z",
        startedAt: null,
        expiresAt: "2026-05-20T12:10:00.000Z",
        result: null,
      }),
      listParticipants: vi.fn().mockResolvedValue([
        {
          id: "p1",
          roomId: "room-1",
          role: "A",
          nickname: "루아",
          clientKey: "client-a",
          joinedAt: "2026-05-20T12:00:01.000Z",
        },
      ]),
      joinParticipant: vi.fn().mockResolvedValue({
        id: "p2",
        roomId: "room-1",
        role: "B",
        nickname: "친구",
        clientKey: "client-b",
        joinedAt: "2026-05-20T12:00:02.000Z",
      }),
      startRoomCountdown: vi.fn().mockResolvedValue({
        id: "room-1",
        status: "open",
        hostLabel: "A",
        createdAt: "2026-05-20T12:00:00.000Z",
        startedAt: "2026-05-20T12:00:00.000Z",
        expiresAt: "2026-05-20T12:01:00.000Z",
        result: null,
      }),
      listMessages: vi.fn(),
      sendMessage: vi.fn(),
      explodeRoom: vi.fn(),
      cleanupExpiredMessages: vi.fn(),
      subscribe: vi.fn(),
    };
    const service = createEphemeralRoomService({
      gateway,
      now: () => fixedNow,
    });

    const { participant, room } = await service.joinRoom({
      roomId: "room-1",
      nickname: "친구",
      clientKey: "client-b",
    });

    expect(participant.role).toBe("B");
    expect(gateway.startRoomCountdown).toHaveBeenCalledWith({
      roomId: "room-1",
      startedAt: "2026-05-20T12:00:00.000Z",
      expiresAt: "2026-05-20T12:01:00.000Z",
    });
    expect(room.startedAt).toBe("2026-05-20T12:00:00.000Z");
  });

  it("assigns the third participant as a spectator", async () => {
    const gateway = {
      createRoom: vi.fn(),
      getRoom: vi.fn().mockResolvedValue({
        id: "room-1",
        status: "open",
        hostLabel: "A",
        createdAt: "2026-05-20T12:00:00.000Z",
        startedAt: "2026-05-20T12:00:00.000Z",
        expiresAt: "2026-05-20T12:01:00.000Z",
        result: null,
      }),
      listParticipants: vi.fn().mockResolvedValue([
        {
          id: "p1",
          roomId: "room-1",
          role: "A",
          nickname: "루아",
          clientKey: "client-a",
          joinedAt: "2026-05-20T12:00:01.000Z",
        },
        {
          id: "p2",
          roomId: "room-1",
          role: "B",
          nickname: "친구",
          clientKey: "client-b",
          joinedAt: "2026-05-20T12:00:02.000Z",
        },
      ]),
      joinParticipant: vi.fn().mockResolvedValue({
        id: "p3",
        roomId: "room-1",
        role: "spectator",
        nickname: "구경꾼",
        clientKey: "client-c",
        joinedAt: "2026-05-20T12:00:03.000Z",
      }),
      startRoomCountdown: vi.fn(),
      listMessages: vi.fn(),
      sendMessage: vi.fn(),
      explodeRoom: vi.fn(),
      cleanupExpiredMessages: vi.fn(),
      subscribe: vi.fn(),
    };
    const service = createEphemeralRoomService({
      gateway,
      now: () => fixedNow,
    });

    const { participant } = await service.joinRoom({
      roomId: "room-1",
      nickname: "구경꾼",
      clientKey: "client-c",
    });

    expect(participant.role).toBe("spectator");
    expect(gateway.startRoomCountdown).not.toHaveBeenCalled();
  });
});
