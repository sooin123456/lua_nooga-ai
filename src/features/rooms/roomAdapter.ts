import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { JudgmentResult } from "../analyzer/types";
import type {
  CreateRoomInput,
  EphemeralRoom,
  ExplodeRoomInput,
  JoinRoomInput,
  RoomEvent,
  RoomGateway,
  RoomMessage,
  RoomParticipant,
  RoomRole,
  RoomUnsubscribe,
  SendRoomMessageInput,
} from "./types";

const roomDurationMs = 60_000;
const waitingRoomDurationMs = 10 * 60_000;
let configuredRoomService:
  | ReturnType<typeof createEphemeralRoomService>
  | null
  | undefined;

type RoomRow = {
  id: string;
  access_secret?: string | null;
  status: EphemeralRoom["status"];
  host_label: EphemeralRoom["hostLabel"];
  created_at: string;
  started_at: string | null;
  expires_at: string;
  result_json: JudgmentResult | null;
};

type ParticipantRow = {
  id: string;
  room_id: string;
  role: RoomRole;
  nickname: string;
  client_key: string;
  joined_at: string;
};

type MessageRow = {
  id: string;
  room_id: string;
  author: RoomMessage["author"];
  nickname: string | null;
  client_key?: string | null;
  body: string;
  created_at: string;
};

type JoinRoomRpcRow = {
  participant_id: string;
  participant_role: RoomRole;
  participant_nickname: string;
  participant_client_key: string;
  participant_joined_at: string;
  room_id: string;
  room_access_secret?: string | null;
  room_status: EphemeralRoom["status"];
  room_host_label: EphemeralRoom["hostLabel"];
  room_created_at: string;
  room_started_at: string | null;
  room_expires_at: string;
  room_result_json: JudgmentResult | null;
};

type RoomServiceOptions = {
  gateway: RoomGateway;
  now?: () => Date;
};

type CreateEphemeralRoomOptions = {
  hostLabel: EphemeralRoom["hostLabel"];
};

function mapRoomRow(row: RoomRow): EphemeralRoom {
  return {
    id: row.id,
    accessSecret: row.access_secret ?? undefined,
    status: row.status,
    hostLabel: row.host_label,
    createdAt: row.created_at,
    startedAt: row.started_at,
    expiresAt: row.expires_at,
    result: row.result_json,
  };
}

function mapParticipantRow(row: ParticipantRow): RoomParticipant {
  return {
    id: row.id,
    roomId: row.room_id,
    role: row.role,
    nickname: row.nickname,
    clientKey: row.client_key,
    joinedAt: row.joined_at,
  };
}

function mapMessageRow(row: MessageRow): RoomMessage {
  return {
    id: row.id,
    roomId: row.room_id,
    author: row.author,
    nickname: row.nickname ?? row.author,
    clientKey: row.client_key ?? undefined,
    body: row.body,
    createdAt: row.created_at,
  };
}

function mapJoinRoomRpcRow(row: JoinRoomRpcRow) {
  return {
    participant: {
      id: row.participant_id,
      roomId: row.room_id,
      role: row.participant_role,
      nickname: row.participant_nickname,
      clientKey: row.participant_client_key,
      joinedAt: row.participant_joined_at,
    },
    room: {
      id: row.room_id,
      accessSecret: row.room_access_secret ?? undefined,
      status: row.room_status,
      hostLabel: row.room_host_label,
      createdAt: row.room_created_at,
      startedAt: row.room_started_at,
      expiresAt: row.room_expires_at,
      result: row.room_result_json,
    },
  };
}

function assertSupabaseResult<T>(
  data: T | null,
  error: { message?: string } | null,
): T {
  if (error) {
    throw new Error(error.message ?? "Supabase 요청에 실패했어요.");
  }

  if (data === null) {
    throw new Error("Supabase 응답이 비어 있어요.");
  }

  return data;
}

export function getRemainingSeconds({
  expiresAt,
  startedAt = "started",
  now = new Date(),
}: {
  expiresAt: string;
  startedAt?: string | null;
  now?: Date;
}) {
  if (!startedAt) {
    return Math.ceil(roomDurationMs / 1000);
  }

  return Math.max(0, Math.ceil((Date.parse(expiresAt) - now.getTime()) / 1000));
}

export function formatRoomTranscript(messages: RoomMessage[]) {
  return messages
    .map(({ author, body }) => `${author}: ${body.trim()}`)
    .filter((line) => !line.endsWith(":"))
    .join("\n");
}

function chooseRoomRole(participants: RoomParticipant[]): RoomRole {
  const takenRoles = new Set(participants.map(({ role }) => role));

  if (!takenRoles.has("A")) {
    return "A";
  }

  if (!takenRoles.has("B")) {
    return "B";
  }

  return "spectator";
}

function hasBothParties(participants: RoomParticipant[]) {
  const roles = new Set(participants.map(({ role }) => role));
  return roles.has("A") && roles.has("B");
}

export function createEphemeralRoomService({
  gateway,
  now = () => new Date(),
}: RoomServiceOptions) {
  return {
    createRoom({ hostLabel }: CreateEphemeralRoomOptions) {
      return gateway.createRoom({
        hostLabel,
        expiresAt: new Date(now().getTime() + waitingRoomDurationMs).toISOString(),
      });
    },
    getRoom: gateway.getRoom,
    listParticipants: gateway.listParticipants,
    async joinRoom(input: JoinRoomInput) {
      if (gateway.joinRoom) {
        return gateway.joinRoom(input);
      }

      const participants = await gateway.listParticipants(
        input.roomId,
        input.accessSecret,
      );
      const existingParticipant = participants.find(
        ({ clientKey }) => clientKey === input.clientKey,
      );
      const participant =
        existingParticipant ??
        (await gateway.joinParticipant({
          ...input,
          role: chooseRoomRole(participants),
        }));
      const nextParticipants = existingParticipant
        ? participants
        : [...participants, participant];
      let room = await gateway.getRoom(input.roomId, input.accessSecret);

      if (room && !room.startedAt && hasBothParties(nextParticipants)) {
        const startedAt = now().toISOString();
        room = await gateway.startRoomCountdown({
          roomId: input.roomId,
          accessSecret: input.accessSecret,
          startedAt,
          expiresAt: new Date(now().getTime() + roomDurationMs).toISOString(),
        });
      }

      if (!room) {
        throw new Error("판정방을 찾지 못했어요.");
      }

      return { participant, room };
    },
    listMessages: gateway.listMessages,
    sendMessage: gateway.sendMessage,
    explodeRoom: gateway.explodeRoom,
    cleanupExpiredMessages: gateway.cleanupExpiredMessages,
    subscribe: gateway.subscribe,
  };
}

export function createSupabaseRoomGateway(
  supabase: SupabaseClient,
): RoomGateway {
  return {
    async createRoom(input: CreateRoomInput) {
      const { data, error } = await supabase.rpc("create_judgment_room", {
        p_host_label: input.hostLabel,
        p_expires_at: input.expiresAt,
      }).single<RoomRow>();

      return mapRoomRow(assertSupabaseResult(data, error));
    },

    async getRoom(roomId: string, accessSecret?: string) {
      const { data, error } = await supabase.rpc("get_judgment_room", {
        p_room_id: roomId,
        p_access_secret: accessSecret ?? "",
      }).maybeSingle<RoomRow>();

      if (error) {
        throw new Error(error.message);
      }

      return data ? mapRoomRow(data) : null;
    },

    async listParticipants(roomId: string, accessSecret?: string) {
      const { data, error } = await supabase.rpc("list_room_participants", {
        p_room_id: roomId,
        p_access_secret: accessSecret ?? "",
      }).returns<ParticipantRow[]>();

      return assertSupabaseResult(data, error).map(mapParticipantRow);
    },

    async joinParticipant(input: JoinRoomInput & { role: RoomRole }) {
      const { data, error } = await supabase.rpc("join_judgment_room", {
        p_room_id: input.roomId,
        p_access_secret: input.accessSecret ?? "",
        p_nickname: input.nickname,
        p_client_key: input.clientKey,
      }).single<JoinRoomRpcRow>();

      const { participant } = mapJoinRoomRpcRow(assertSupabaseResult(data, error));
      return participant;
    },

    async joinRoom(input: JoinRoomInput) {
      const { data, error } = await supabase.rpc("join_judgment_room", {
        p_room_id: input.roomId,
        p_access_secret: input.accessSecret ?? "",
        p_nickname: input.nickname,
        p_client_key: input.clientKey,
      }).single<JoinRoomRpcRow>();

      return mapJoinRoomRpcRow(assertSupabaseResult(data, error));
    },

    async startRoomCountdown(input) {
      const { data, error } = await supabase.rpc("start_judgment_room_countdown", {
        p_room_id: input.roomId,
        p_access_secret: input.accessSecret ?? "",
        p_started_at: input.startedAt,
        p_expires_at: input.expiresAt,
      }).single<RoomRow>();

      return mapRoomRow(assertSupabaseResult(data, error));
    },

    async listMessages(roomId: string, accessSecret?: string) {
      const { data, error } = await supabase.rpc("list_room_messages", {
        p_room_id: roomId,
        p_access_secret: accessSecret ?? "",
      }).returns<MessageRow[]>();

      return assertSupabaseResult(data, error).map(mapMessageRow);
    },

    async sendMessage(input: SendRoomMessageInput) {
      const { data, error } = await supabase.rpc("send_room_message", {
        p_room_id: input.roomId,
        p_access_secret: input.accessSecret ?? "",
        p_client_key: input.clientKey ?? "",
        p_body: input.body,
      }).single<MessageRow>();

      return mapMessageRow(assertSupabaseResult(data, error));
    },

    async explodeRoom(input: ExplodeRoomInput) {
      const { data, error } = await supabase.rpc("explode_judgment_room", {
        p_room_id: input.roomId,
        p_access_secret: input.accessSecret ?? "",
        p_client_key: input.clientKey ?? "",
        p_result_json: input.result,
      }).single<RoomRow>();

      return mapRoomRow(assertSupabaseResult(data, error));
    },

    async cleanupExpiredMessages() {
      return 0;
    },

    subscribe(roomId: string, onEvent: (event: RoomEvent) => void): RoomUnsubscribe {
      const channel = supabase
        .channel(`judgment-room:${roomId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "room_messages",
            filter: `room_id=eq.${roomId}`,
          },
          (payload) => onEvent({ type: "message", message: mapMessageRow(payload.new as MessageRow) }),
        )
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "judgment_rooms",
            filter: `id=eq.${roomId}`,
          },
          (payload) => onEvent({ type: "room", room: mapRoomRow(payload.new as RoomRow) }),
        )
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "room_participants",
            filter: `room_id=eq.${roomId}`,
          },
          (payload) =>
            onEvent({
              type: "participant",
              participant: mapParticipantRow(payload.new as ParticipantRow),
            }),
        )
        .subscribe();

      return () => {
        void supabase.removeChannel(channel);
      };
    },
  };
}

export function createConfiguredRoomService() {
  if (configuredRoomService !== undefined) {
    return configuredRoomService;
  }

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const supabaseAnonKey = import.meta.env
    .VITE_SUPABASE_ANON_KEY as string | undefined;

  if (!supabaseUrl || !supabaseAnonKey) {
    configuredRoomService = null;
    return configuredRoomService;
  }

  configuredRoomService = createEphemeralRoomService({
    gateway: createSupabaseRoomGateway(createClient(supabaseUrl, supabaseAnonKey)),
  });
  return configuredRoomService;
}
