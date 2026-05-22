import type { JudgmentResult } from "../analyzer/types";

export type RoomAuthor = "A" | "B";
export type RoomRole = RoomAuthor | "spectator";

export type EphemeralRoomStatus = "open" | "exploded";

export type EphemeralRoom = {
  id: string;
  accessSecret?: string;
  status: EphemeralRoomStatus;
  hostLabel: RoomAuthor;
  createdAt: string;
  startedAt: string | null;
  expiresAt: string;
  result: JudgmentResult | null;
};

export type RoomParticipant = {
  id: string;
  roomId: string;
  role: RoomRole;
  nickname: string;
  clientKey: string;
  joinedAt: string;
};

export type RoomMessage = {
  id: string;
  roomId: string;
  author: RoomAuthor;
  nickname: string;
  clientKey?: string;
  body: string;
  createdAt: string;
};

export type RoomEvent =
  | { type: "message"; message: RoomMessage }
  | { type: "room"; room: EphemeralRoom }
  | { type: "participant"; participant: RoomParticipant };

export type RoomUnsubscribe = () => void;

export type CreateRoomInput = {
  hostLabel: RoomAuthor;
  expiresAt: string;
};

export type SendRoomMessageInput = {
  roomId: string;
  accessSecret?: string;
  author: RoomAuthor;
  nickname: string;
  clientKey?: string;
  body: string;
};

export type JoinRoomInput = {
  roomId: string;
  accessSecret?: string;
  nickname: string;
  clientKey: string;
};

export type StartRoomCountdownInput = {
  roomId: string;
  accessSecret?: string;
  startedAt: string;
  expiresAt: string;
};

export type ExplodeRoomInput = {
  roomId: string;
  accessSecret?: string;
  clientKey?: string;
  result: JudgmentResult;
};

export type RoomGateway = {
  createRoom(input: CreateRoomInput): Promise<EphemeralRoom>;
  getRoom(roomId: string, accessSecret?: string): Promise<EphemeralRoom | null>;
  listParticipants(roomId: string, accessSecret?: string): Promise<RoomParticipant[]>;
  joinRoom?(
    input: JoinRoomInput,
  ): Promise<{ participant: RoomParticipant; room: EphemeralRoom }>;
  joinParticipant(input: JoinRoomInput & { role: RoomRole }): Promise<RoomParticipant>;
  startRoomCountdown(input: StartRoomCountdownInput): Promise<EphemeralRoom>;
  listMessages(roomId: string, accessSecret?: string): Promise<RoomMessage[]>;
  sendMessage(input: SendRoomMessageInput): Promise<RoomMessage>;
  explodeRoom(input: ExplodeRoomInput): Promise<EphemeralRoom>;
  cleanupExpiredMessages(): Promise<number>;
  subscribe(roomId: string, onEvent: (event: RoomEvent) => void): RoomUnsubscribe;
};
