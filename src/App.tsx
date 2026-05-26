import type { ChangeEvent, ClipboardEvent } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button, Top } from "@toss/tds-mobile";
import "./App.css";
import { analyzeWithAi } from "./features/analyzer/freeJudgmentAdapter";
import { analyzeWithRules } from "./features/analyzer/ruleBasedAnalyzer";
import type {
  JudgmentResult,
  UserPerspective,
} from "./features/analyzer/types";
import {
  audioTranscriptionFailureMessage,
  transcribeAudioFile,
} from "./features/audio/audioAdapter";
import { RecordingControl } from "./features/audio/RecordingControl";
import { EvidenceInputScreen } from "./features/input/EvidenceInputScreen";
import { InputHome } from "./features/input/InputHome";
import { IntroScreen } from "./features/input/IntroScreen";
import { inputMethods, type InputMethod } from "./features/input/inputMethods";
import type {
  IncidentIntakeInput,
  IncidentIntakeSummary,
} from "./features/intake/incidentIntake";
import { IncidentJournalScreen } from "./features/intake/IncidentJournalScreen";
import { LuaIntakeLoadingScreen } from "./features/intake/LuaIntakeLoadingScreen";
import { prepareIncidentIntake } from "./features/intake/incidentIntakeAdapter";
import {
  extractTextFromImage,
  ocrFailureMessage,
} from "./features/ocr/ocrAdapter";
import { PrecedentJudgmentScreen } from "./features/precedent/PrecedentJudgmentScreen";
import { requestPrecedentEntitlement } from "./features/precedent/precedentEntitlementAdapter";
import {
  requestPrecedentJudgment,
  type PrecedentJudgmentReport,
} from "./features/precedent/precedentJudgmentAdapter";
import { requestPremiumVerdict } from "./features/premium/premiumAdapter";
import { ResultScreen } from "./features/result/ResultScreen";
import { RewardChatScreen } from "./features/rewards/RewardChatScreen";
import { createConfiguredResultShareService } from "./features/resultShare/resultShareAdapter";
import { getSharedResultIdFromSearch } from "./features/resultShare/resultLinks";
import {
  createConfiguredRoomService,
  formatRoomTranscript,
  getRemainingSeconds,
} from "./features/rooms/roomAdapter";
import {
  createRoomInviteUrl,
  getRoomAccessSecretFromSearch,
  getRoomIdFromSearch,
} from "./features/rooms/roomLinks";
import { RoomScreen } from "./features/rooms/RoomScreen";
import type {
  EphemeralRoom,
  RoomMessage,
  RoomParticipant,
  RoomUnsubscribe,
} from "./features/rooms/types";

type AppState =
  | { screen: "intro" }
  | { screen: "home" }
  | {
      screen: "shared-result";
      resultId: string;
      isLoading: boolean;
      errorMessage: string | null;
    }
  | {
      screen: "room";
      room: EphemeralRoom | null;
      messages: RoomMessage[];
      participants: RoomParticipant[];
      currentParticipant: RoomParticipant | null;
      remainingSeconds: number;
      isLoading: boolean;
      isExploding: boolean;
      errorMessage: string | null;
      inviteStatus: string | null;
    }
  | {
      screen: "review";
      reviewId: number;
      inputMethod: InputMethod;
      initialText: string;
      helperText?: string;
      isOcrPending?: boolean;
      ocrFileName?: string;
      screenshotPreviewUrl?: string;
      audioFileName?: string;
      ocrSyncKey?: number;
      ocrDeliveredSyncKey?: number;
    }
  | {
      screen: "intake-loading";
      reviewId: number;
      input: IncidentIntakeInput;
      inputMethod: InputMethod;
    }
  | {
      screen: "journal";
      reviewId: number;
      input: IncidentIntakeInput;
      summary: IncidentIntakeSummary;
      fallbackMessage?: string | null;
    }
  | {
      screen: "result";
      result: JudgmentResult;
      sourceText: string;
      sharedResultId?: string;
    }
  | {
      screen: "reward-chat";
      result: JudgmentResult;
      sourceText: string;
      sharedResultId?: string;
    }
  | {
      screen: "precedent-result";
      result: JudgmentResult;
      sourceText: string;
      sharedResultId?: string;
      report: PrecedentJudgmentReport;
      disclaimer: string;
    };

const starterSampleText = `A: 너는 항상 내 말은 안 듣잖아.
B: 미안해. 말이 셌던 건 인정해.
A: 됐고, 네 탓이야.
B: 다시 차분히 이야기하자.`;

const reviewHelpers: Partial<Record<InputMethod, string>> = {
  screenshot:
    "캡처 이미지를 선택하면 글자를 읽어볼게요. 필요하면 직접 고칠 수 있어요.",
  record:
    "음성 변환 전에도 판독할 텍스트 확인이 필요해요. 지금은 대화를 직접 입력해 주세요.",
  "audio-file":
    "녹음 파일 변환 전에도 텍스트 확인이 필요해요. 지금은 대화를 직접 입력해 주세요.",
};

const ocrSuccessMessage =
  "캡처에서 글자를 읽었어요. 내용을 확인하고 고쳐 주세요.";
const ocrPendingMessage = "캡처에서 글자를 읽고 있어요.";
const introCompleteStorageKey = "lua-nooga-intro-complete";

function hasCompletedIntro() {
  if (typeof window === "undefined") {
    return false;
  }

  try {
    return window.localStorage.getItem(introCompleteStorageKey) === "true";
  } catch {
    return false;
  }
}

function markIntroComplete() {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(introCompleteStorageKey, "true");
  } catch {
    // Intro persistence is non-critical; still allow app entry.
  }
}

function getInitialRoomId() {
  if (typeof window === "undefined") {
    return null;
  }

  return getRoomIdFromSearch(window.location.search);
}

function getInitialRoomAccessSecret() {
  if (typeof window === "undefined") {
    return null;
  }

  return getRoomAccessSecretFromSearch(window.location.search);
}

function getInitialSharedResultId() {
  if (typeof window === "undefined") {
    return null;
  }

  return getSharedResultIdFromSearch(window.location.search);
}

function createInitialState(): AppState {
  const sharedResultId = getInitialSharedResultId();
  if (sharedResultId) {
    return {
      screen: "shared-result",
      resultId: sharedResultId,
      isLoading: true,
      errorMessage: null,
    };
  }

  const roomId = getInitialRoomId();

  if (!roomId) {
    return hasCompletedIntro() ? { screen: "home" } : { screen: "intro" };
  }

  return {
    screen: "room",
    room: null,
    messages: [],
    participants: [],
    currentParticipant: null,
    remainingSeconds: 60,
    isLoading: true,
    isExploding: false,
    errorMessage: null,
    inviteStatus: null,
  };
}

function App() {
  const [state, setState] = useState<AppState>(createInitialState);
  const activeReviewIdRef = useRef(0);
  const ocrSyncKeyRef = useRef(0);
  const screenshotPreviewUrlRef = useRef<string | undefined>(undefined);
  const roomServiceRef =
    useRef<ReturnType<typeof createConfiguredRoomService>>();
  const resultShareServiceRef =
    useRef<ReturnType<typeof createConfiguredResultShareService>>();
  const initialRoomLoadRef = useRef(false);
  const initialSharedResultLoadRef = useRef(false);

  if (roomServiceRef.current === undefined) {
    roomServiceRef.current = createConfiguredRoomService();
  }
  if (resultShareServiceRef.current === undefined) {
    resultShareServiceRef.current = createConfiguredResultShareService();
  }
  const roomUnsubscribeRef = useRef<RoomUnsubscribe | null>(null);

  const getRoomClientKey = () => {
    if (typeof window === "undefined") {
      return "server-client";
    }

    const storageKey = "lua-nooga-room-client-key";
    const existingKey = window.localStorage.getItem(storageKey);

    if (existingKey) {
      return existingKey;
    }

    const nextKey =
      typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `client-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    window.localStorage.setItem(storageKey, nextKey);
    return nextKey;
  };

  const revokeScreenshotPreviewUrl = () => {
    if (screenshotPreviewUrlRef.current) {
      URL.revokeObjectURL(screenshotPreviewUrlRef.current);
      screenshotPreviewUrlRef.current = undefined;
    }
  };

  const createScreenshotPreviewUrl = (file: File) => {
    if (typeof URL.createObjectURL !== "function") {
      return undefined;
    }

    revokeScreenshotPreviewUrl();

    const previewUrl = URL.createObjectURL(file);
    screenshotPreviewUrlRef.current = previewUrl;
    return previewUrl;
  };

  useEffect(() => revokeScreenshotPreviewUrl, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const pushBackGuard = () => {
      window.history.pushState(
        { luaNoogaBackGuard: true },
        "",
        window.location.href,
      );
    };

    pushBackGuard();

    const handlePopState = () => {
      activeReviewIdRef.current += 1;
      roomUnsubscribeRef.current?.();
      roomUnsubscribeRef.current = null;
      revokeScreenshotPreviewUrl();

      if (window.location.search) {
        window.history.replaceState(
          { luaNoogaBackGuard: true },
          "",
          window.location.pathname,
        );
      }

      setState({ screen: "home" });
      window.setTimeout(pushBackGuard, 0);
    };

    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, []);

  const goHome = () => {
    activeReviewIdRef.current += 1;
    roomUnsubscribeRef.current?.();
    roomUnsubscribeRef.current = null;
    revokeScreenshotPreviewUrl();
    if (typeof window !== "undefined") {
      window.history.replaceState(null, "", window.location.pathname);
    }
    setState({ screen: "home" });
  };

  const enterHomeFromIntro = () => {
    markIntroComplete();
    setState({ screen: "home" });
  };

  const loadSharedResult = useCallback(async (resultId: string) => {
    setState({
      screen: "shared-result",
      resultId,
      isLoading: true,
      errorMessage: null,
    });

    const resultShareService = resultShareServiceRef.current;
    if (!resultShareService) {
      setState({
        screen: "shared-result",
        resultId,
        isLoading: false,
        errorMessage: "공유 결과 서버가 아직 연결되지 않았어요.",
      });
      return;
    }

    try {
      const sharedResult = await resultShareService.getSharedResult(resultId);
      if (!sharedResult) {
        setState({
          screen: "shared-result",
          resultId,
          isLoading: false,
          errorMessage: "공유 결과를 찾지 못했어요.",
        });
        return;
      }

      setState({
        screen: "result",
        result: sharedResult.result,
        sourceText: "",
        sharedResultId: sharedResult.id,
      });
    } catch {
      setState({
        screen: "shared-result",
        resultId,
        isLoading: false,
        errorMessage: "공유 결과를 불러오지 못했어요.",
      });
    }
  }, []);

  const handleSelect = (method: InputMethod) => {
    const selectedMethod = inputMethods.find(({ id }) => id === method);
    const reviewId = activeReviewIdRef.current + 1;
    activeReviewIdRef.current = reviewId;

    setState({
      screen: "review",
      reviewId,
      inputMethod: method,
      initialText: method === "text" ? starterSampleText : "",
      helperText:
        method === "text"
          ? selectedMethod?.description
          : (reviewHelpers[method] ?? selectedMethod?.description),
    });
  };

  const subscribeToRoom = (room: EphemeralRoom) => {
    roomUnsubscribeRef.current?.();
    roomUnsubscribeRef.current =
      roomServiceRef.current?.subscribe(room.id, (event) => {
        setState((currentState) => {
          if (currentState.screen !== "room") {
            return currentState;
          }

          if (event.type === "room") {
            return {
              ...currentState,
              room: event.room,
              remainingSeconds: getRemainingSeconds({
                expiresAt: event.room.expiresAt,
                startedAt: event.room.startedAt,
              }),
            };
          }

          if (event.type === "participant") {
            if (
              currentState.participants.some(
                (participant) => participant.id === event.participant.id,
              )
            ) {
              return currentState;
            }

            return {
              ...currentState,
              participants: [...currentState.participants, event.participant],
            };
          }

          if (
            currentState.messages.some(
              (message) => message.id === event.message.id,
            )
          ) {
            return currentState;
          }

          return {
            ...currentState,
            messages: [...currentState.messages, event.message],
          };
        });
      }) ?? null;
  };

  const loadRoom = useCallback(
    async (roomId: string, accessSecret?: string | null) => {
      setState({
        screen: "room",
        room: null,
        messages: [],
        participants: [],
        currentParticipant: null,
        remainingSeconds: 60,
        isLoading: true,
        isExploding: false,
        errorMessage: null,
        inviteStatus: null,
      });

      const roomService = roomServiceRef.current;

      if (!roomService) {
        setState({
          screen: "room",
          room: null,
          messages: [],
          participants: [],
          currentParticipant: null,
          remainingSeconds: 60,
          isLoading: false,
          isExploding: false,
          errorMessage:
            "Supabase URL과 anon key를 넣으면 실시간 판정방에 들어갈 수 있어요.",
          inviteStatus: null,
        });
        return;
      }

      try {
        await roomService.cleanupExpiredMessages();
        const room = await roomService.getRoom(
          roomId,
          accessSecret ?? undefined,
        );

        if (!room) {
          setState({
            screen: "room",
            room: null,
            messages: [],
            participants: [],
            currentParticipant: null,
            remainingSeconds: 0,
            isLoading: false,
            isExploding: false,
            errorMessage: "판정방을 찾지 못했어요. 새 방을 열어주세요.",
            inviteStatus: null,
          });
          return;
        }

        const messages = await roomService.listMessages(
          room.id,
          room.accessSecret,
        );
        const participants = await roomService.listParticipants(
          room.id,
          room.accessSecret,
        );
        subscribeToRoom(room);
        setState({
          screen: "room",
          room,
          messages,
          participants,
          currentParticipant:
            participants.find(
              ({ clientKey }) => clientKey === getRoomClientKey(),
            ) ?? null,
          remainingSeconds: getRemainingSeconds({
            expiresAt: room.expiresAt,
            startedAt: room.startedAt,
          }),
          isLoading: false,
          isExploding: false,
          errorMessage: null,
          inviteStatus: "초대 링크로 판정방에 들어왔어요.",
        });
      } catch {
        setState({
          screen: "room",
          room: null,
          messages: [],
          participants: [],
          currentParticipant: null,
          remainingSeconds: 60,
          isLoading: false,
          isExploding: false,
          errorMessage:
            "판정방에 들어가지 못했어요. 링크를 다시 확인해 주세요.",
          inviteStatus: null,
        });
      }
    },
    [],
  );

  const startRoom = async () => {
    setState({
      screen: "room",
      room: null,
      messages: [],
      participants: [],
      currentParticipant: null,
      remainingSeconds: 60,
      isLoading: true,
      isExploding: false,
      errorMessage: null,
      inviteStatus: null,
    });

    const roomService = roomServiceRef.current;

    if (!roomService) {
      setState({
        screen: "room",
        room: null,
        messages: [],
        participants: [],
        currentParticipant: null,
        remainingSeconds: 60,
        isLoading: false,
        isExploding: false,
        errorMessage:
          "Supabase URL과 anon key를 넣으면 실시간 판정방이 열려요.",
        inviteStatus: null,
      });
      return;
    }

    try {
      await roomService.cleanupExpiredMessages();
      const room = await roomService.createRoom({ hostLabel: "A" });
      const messages = await roomService.listMessages(
        room.id,
        room.accessSecret,
      );
      const participants = await roomService.listParticipants(
        room.id,
        room.accessSecret,
      );
      subscribeToRoom(room);
      if (typeof window !== "undefined") {
        window.history.replaceState(
          null,
          "",
          createRoomInviteUrl({
            href: window.location.href,
            roomId: room.id,
            accessSecret: room.accessSecret,
          }),
        );
      }
      setState({
        screen: "room",
        room,
        messages,
        participants,
        currentParticipant: null,
        remainingSeconds: getRemainingSeconds({
          expiresAt: room.expiresAt,
          startedAt: room.startedAt,
        }),
        isLoading: false,
        isExploding: false,
        errorMessage: null,
        inviteStatus: "초대 링크를 복사해서 상대를 바로 부를 수 있어요.",
      });
    } catch {
      setState({
        screen: "room",
        room: null,
        messages: [],
        participants: [],
        currentParticipant: null,
        remainingSeconds: 60,
        isLoading: false,
        isExploding: false,
        errorMessage: "판정방을 열지 못했어요. 서버 설정을 확인해 주세요.",
        inviteStatus: null,
      });
    }
  };

  const copyRoomInvite = async () => {
    if (
      state.screen !== "room" ||
      !state.room ||
      typeof window === "undefined"
    ) {
      return;
    }

    const inviteUrl = createRoomInviteUrl({
      href: window.location.href,
      roomId: state.room.id,
      accessSecret: state.room.accessSecret,
    });

    try {
      await navigator.clipboard.writeText(inviteUrl);
      setState((currentState) =>
        currentState.screen === "room"
          ? { ...currentState, inviteStatus: "초대 링크를 복사했어요." }
          : currentState,
      );
    } catch {
      setState((currentState) =>
        currentState.screen === "room"
          ? {
              ...currentState,
              inviteStatus:
                "복사가 막혔어요. 주소창 링크를 직접 공유해 주세요.",
            }
          : currentState,
      );
    }
  };

  const explodeRoom = useCallback(async () => {
    if (
      state.screen !== "room" ||
      !state.room ||
      !state.currentParticipant ||
      state.currentParticipant.role === "spectator" ||
      state.isExploding
    ) {
      return;
    }

    const room = state.room;
    const messages = state.messages;
    const transcript = formatRoomTranscript(messages);

    setState((currentState) =>
      currentState.screen === "room"
        ? { ...currentState, isExploding: true, remainingSeconds: 0 }
        : currentState,
    );

    const aiJudgment = await analyzeWithAi({
      text: transcript,
      userPerspective: "unknown",
    });
    const result =
      aiJudgment.status === "ready" || aiJudgment.status === "fallback"
        ? aiJudgment.result
        : await analyzeWithRules({ text: transcript });

    try {
      await roomServiceRef.current?.explodeRoom({
        roomId: room.id,
        accessSecret: room.accessSecret,
        clientKey: getRoomClientKey(),
        result,
      });
    } finally {
      roomUnsubscribeRef.current?.();
      roomUnsubscribeRef.current = null;
      setState({ screen: "result", result, sourceText: transcript });
    }
  }, [state]);

  const joinRoomWithNickname = async ({ nickname }: { nickname: string }) => {
    if (state.screen !== "room" || !state.room) {
      return;
    }

    const roomService = roomServiceRef.current;
    if (!roomService) {
      setState((currentState) =>
        currentState.screen === "room"
          ? {
              ...currentState,
              errorMessage: "실시간 서버가 아직 연결되지 않았어요.",
            }
          : currentState,
      );
      return;
    }

    try {
      const { participant, room } = await roomService.joinRoom({
        roomId: state.room.id,
        accessSecret: state.room.accessSecret,
        nickname,
        clientKey: getRoomClientKey(),
      });
      const participants = await roomService.listParticipants(
        state.room.id,
        room.accessSecret,
      );

      setState((currentState) =>
        currentState.screen === "room"
          ? {
              ...currentState,
              room,
              participants,
              currentParticipant: participant,
              remainingSeconds: getRemainingSeconds({
                expiresAt: room.expiresAt,
                startedAt: room.startedAt,
              }),
              inviteStatus:
                participant.role === "spectator"
                  ? "관전자로 입장했어요. 대화는 읽기만 가능해요."
                  : `${participant.role}로 입장했어요. 상대가 들어오면 카운트가 시작돼요.`,
            }
          : currentState,
      );
    } catch {
      setState((currentState) =>
        currentState.screen === "room"
          ? {
              ...currentState,
              errorMessage:
                "판정방에 입장하지 못했어요. 닉네임을 다시 확인해 주세요.",
            }
          : currentState,
      );
    }
  };

  const sendRoomMessage = async ({ body }: { body: string }) => {
    if (
      state.screen !== "room" ||
      !state.room ||
      !state.currentParticipant ||
      state.currentParticipant.role === "spectator"
    ) {
      return;
    }

    const roomService = roomServiceRef.current;
    if (!roomService) {
      setState((currentState) =>
        currentState.screen === "room"
          ? {
              ...currentState,
              errorMessage: "실시간 서버가 아직 연결되지 않았어요.",
            }
          : currentState,
      );
      return;
    }

    try {
      const message = await roomService.sendMessage({
        roomId: state.room.id,
        accessSecret: state.room.accessSecret,
        author: state.currentParticipant.role,
        nickname: state.currentParticipant.nickname,
        clientKey: state.currentParticipant.clientKey,
        body,
      });

      setState((currentState) => {
        if (currentState.screen !== "room") {
          return currentState;
        }

        if (
          currentState.messages.some(
            (currentMessage) => currentMessage.id === message.id,
          )
        ) {
          return currentState;
        }

        return {
          ...currentState,
          messages: [...currentState.messages, message],
        };
      });
    } catch {
      setState((currentState) =>
        currentState.screen === "room"
          ? {
              ...currentState,
              errorMessage: "메시지를 보내지 못했어요. 다시 시도해 주세요.",
            }
          : currentState,
      );
    }
  };

  useEffect(() => {
    if (initialSharedResultLoadRef.current) {
      return;
    }

    const sharedResultId = getInitialSharedResultId();
    if (!sharedResultId) {
      return;
    }

    initialSharedResultLoadRef.current = true;
    void loadSharedResult(sharedResultId);
  }, [loadSharedResult]);

  useEffect(() => {
    if (initialRoomLoadRef.current) {
      return;
    }

    if (getInitialSharedResultId()) {
      return;
    }

    const roomId = getInitialRoomId();
    if (!roomId) {
      return;
    }

    initialRoomLoadRef.current = true;
    void loadRoom(roomId, getInitialRoomAccessSecret());
  }, [loadRoom]);

  useEffect(() => {
    if (state.screen !== "room" || !state.room || state.isExploding) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setState((currentState) => {
        if (currentState.screen !== "room" || !currentState.room) {
          return currentState;
        }

        return {
          ...currentState,
          remainingSeconds: getRemainingSeconds({
            expiresAt: currentState.room.expiresAt,
            startedAt: currentState.room.startedAt,
          }),
        };
      });
    }, 250);

    return () => window.clearInterval(intervalId);
  }, [explodeRoom, state]);

  useEffect(() => {
    if (
      state.screen === "room" &&
      state.room &&
      state.room.startedAt &&
      state.remainingSeconds === 0 &&
      !state.isExploding &&
      state.currentParticipant &&
      state.currentParticipant.role !== "spectator" &&
      state.messages.length > 0
    ) {
      void explodeRoom();
    }
  }, [explodeRoom, state]);

  const processScreenshotImage = async (file: File, reviewId: number) => {
    const ocrSyncKey = ocrSyncKeyRef.current + 1;
    ocrSyncKeyRef.current = ocrSyncKey;
    const screenshotPreviewUrl = createScreenshotPreviewUrl(file);

    setState((currentState) => {
      if (
        currentState.screen !== "review" ||
        currentState.reviewId !== reviewId
      ) {
        return currentState;
      }

      return {
        ...currentState,
        helperText: ocrPendingMessage,
        isOcrPending: true,
        ocrFileName: file.name || "붙여넣은 이미지",
        screenshotPreviewUrl,
        ocrSyncKey,
      };
    });

    try {
      const extractedText = await extractTextFromImage(file);

      if (reviewId !== activeReviewIdRef.current) {
        return;
      }

      setState((currentState) => {
        if (
          currentState.screen !== "review" ||
          currentState.reviewId !== reviewId ||
          currentState.ocrSyncKey !== ocrSyncKey
        ) {
          return currentState;
        }

        return {
          ...currentState,
          initialText: extractedText,
          helperText: ocrSuccessMessage,
          isOcrPending: false,
          ocrDeliveredSyncKey: ocrSyncKey,
        };
      });
    } catch {
      if (reviewId !== activeReviewIdRef.current) {
        return;
      }

      setState((currentState) => {
        if (
          currentState.screen !== "review" ||
          currentState.reviewId !== reviewId ||
          currentState.ocrSyncKey !== ocrSyncKey
        ) {
          return currentState;
        }

        return {
          ...currentState,
          helperText: ocrFailureMessage,
          isOcrPending: false,
        };
      });
    }
  };

  const handleScreenshotFileChange = async (
    event: ChangeEvent<HTMLInputElement>,
    reviewId: number,
  ) => {
    const file = event.currentTarget.files?.[0];

    if (!file) {
      return;
    }

    await processScreenshotImage(file, reviewId);
  };

  const handleScreenshotPaste = (
    event: ClipboardEvent<HTMLElement>,
    reviewId: number,
  ) => {
    const pastedImageItem = Array.from(event.clipboardData.items).find(
      (item) => item.kind === "file" && item.type.startsWith("image/"),
    );
    const file = pastedImageItem?.getAsFile();

    if (!file) {
      return;
    }

    event.preventDefault();
    void processScreenshotImage(file, reviewId);
  };

  const updateAudioTranscript = async (reviewId: number, file: File) => {
    const audioSyncKey = ocrSyncKeyRef.current + 1;
    ocrSyncKeyRef.current = audioSyncKey;

    setState((currentState) => {
      if (
        currentState.screen !== "review" ||
        currentState.reviewId !== reviewId
      ) {
        return currentState;
      }

      return {
        ...currentState,
        helperText: "음성을 텍스트로 바꾸는 중이에요.",
        audioFileName: file.name || "녹음 파일",
        isOcrPending: true,
        ocrSyncKey: audioSyncKey,
      };
    });

    const transcription = await transcribeAudioFile({ file });

    if (reviewId !== activeReviewIdRef.current) {
      return;
    }

    setState((currentState) => {
      if (
        currentState.screen !== "review" ||
        currentState.reviewId !== reviewId ||
        currentState.ocrSyncKey !== audioSyncKey
      ) {
        return currentState;
      }

      if (transcription.status !== "ready") {
        return {
          ...currentState,
          helperText: transcription.message || audioTranscriptionFailureMessage,
          isOcrPending: false,
        };
      }

      return {
        ...currentState,
        initialText: transcription.text,
        helperText:
          "음성을 텍스트로 바꿨어요. 필요하면 말투만 살짝 다듬어 주세요.",
        isOcrPending: false,
        ocrDeliveredSyncKey: audioSyncKey,
      };
    });
  };

  const renderScreenshotPicker = (
    reviewId: number,
    isOcrPending?: boolean,
    ocrFileName?: string,
    screenshotPreviewUrl?: string,
  ) => {
    const inputId = `screenshot-file-${reviewId}`;

    return (
      <div className="media-control">
        <label className="media-picker" htmlFor={inputId}>
          캡처 이미지 선택
        </label>
        <input
          id={inputId}
          className="media-picker__input"
          type="file"
          accept="image/*"
          aria-label="캡처 이미지 선택"
          disabled={isOcrPending}
          onChange={(event) => handleScreenshotFileChange(event, reviewId)}
        />
        {ocrFileName ? (
          <p className="media-control__status">
            {isOcrPending ? "읽는 중" : "선택됨"}: {ocrFileName}
          </p>
        ) : null}
        {screenshotPreviewUrl ? (
          <img
            className="media-preview"
            src={screenshotPreviewUrl}
            alt="선택한 캡처 미리보기"
          />
        ) : null}
      </div>
    );
  };

  const renderRecordingControl = (reviewId: number, isPending?: boolean) => (
    <RecordingControl
      disabled={isPending}
      onAudioReady={(file) => void updateAudioTranscript(reviewId, file)}
    />
  );

  const renderAudioFilePicker = (reviewId: number, audioFileName?: string) => {
    const inputId = `audio-file-${reviewId}`;

    return (
      <div className="media-control">
        <label className="media-picker" htmlFor={inputId}>
          녹음 파일 선택
        </label>
        <input
          id={inputId}
          className="media-picker__input"
          type="file"
          accept="audio/*"
          aria-label="녹음 파일 선택"
          onChange={(event) => {
            const file = event.currentTarget.files?.[0];

            if (!file) {
              return;
            }

            void updateAudioTranscript(reviewId, file);
          }}
        />
        {audioFileName ? (
          <p className="media-control__status">선택됨: {audioFileName}</p>
        ) : null}
      </div>
    );
  };

  const handleAnalyze = async (
    text: string,
    userPerspective: UserPerspective,
    reviewId: number,
  ) => {
    const aiJudgment = await analyzeWithAi({ text, userPerspective });

    if (reviewId !== activeReviewIdRef.current) {
      return;
    }

    if (aiJudgment.status === "limited") {
      setState((currentState) =>
        currentState.screen === "journal" && currentState.reviewId === reviewId
          ? { ...currentState, fallbackMessage: aiJudgment.message }
          : currentState,
      );
      return;
    }

    revokeScreenshotPreviewUrl();
    setState({ screen: "result", result: aiJudgment.result, sourceText: text });
  };

  const prepareIncidentForReview = async (
    input: IncidentIntakeInput,
    reviewId: number,
  ) => {
    const startedAt = Date.now();
    const intake = await prepareIncidentIntake(input);
    const elapsed = Date.now() - startedAt;
    const minimumLoadingMs = 1000;

    if (elapsed < minimumLoadingMs) {
      await new Promise((resolve) =>
        window.setTimeout(resolve, minimumLoadingMs - elapsed),
      );
    }

    if (reviewId !== activeReviewIdRef.current) {
      return;
    }

    setState({
      screen: "journal",
      reviewId,
      input,
      summary: intake.summary,
      fallbackMessage:
        intake.status === "fallback"
          ? "AI 정리가 불안정해서 간단 정리로 먼저 진행할게요."
          : null,
    });
  };

  const handleSubmitEvidence = (
    input: IncidentIntakeInput,
    reviewId: number,
    inputMethod: InputMethod,
  ) => {
    setState({ screen: "intake-loading", reviewId, input, inputMethod });

    window.setTimeout(() => {
      void prepareIncidentForReview(input, reviewId);
    }, 0);
  };

  const handlePrecedentJudgment = async () => {
    if (state.screen !== "result") {
      return;
    }

    const { result, sourceText, sharedResultId } = state;
    const payment = await requestPremiumVerdict();
    if (payment.status !== "paid") {
      throw new Error(payment.message);
    }

    const entitlement = await requestPrecedentEntitlement({
      orderId: payment.orderId,
    });
    if (entitlement.status !== "ready" || !entitlement.entitlementToken) {
      throw new Error(entitlement.message);
    }

    const precedentJudgment = await requestPrecedentJudgment({
      text: sourceText,
      originalResult: result,
      entitlementToken: entitlement.entitlementToken,
    });
    if (precedentJudgment.status !== "ready") {
      throw new Error(precedentJudgment.message);
    }

    setState({
      screen: "precedent-result",
      result,
      sourceText,
      sharedResultId,
      report: precedentJudgment.report,
      disclaimer: precedentJudgment.disclaimer,
    });
  };

  const renderMediaControl = () => {
    if (state.screen !== "review") {
      return undefined;
    }

    if (state.inputMethod === "screenshot") {
      return renderScreenshotPicker(
        state.reviewId,
        state.isOcrPending,
        state.ocrFileName,
        state.screenshotPreviewUrl,
      );
    }

    if (state.inputMethod === "record") {
      return renderRecordingControl(state.reviewId, state.isOcrPending);
    }

    if (state.inputMethod === "audio-file") {
      return renderAudioFilePicker(state.reviewId, state.audioFileName);
    }

    return undefined;
  };

  if (state.screen === "review") {
    return (
      <EvidenceInputScreen
        initialText={state.initialText}
        initialTextSyncKey={state.ocrDeliveredSyncKey}
        draftSyncKey={state.ocrSyncKey}
        helperText={state.helperText}
        mediaControl={renderMediaControl()}
        onPaste={
          state.inputMethod === "screenshot"
            ? (event) => handleScreenshotPaste(event, state.reviewId)
            : undefined
        }
        onSubmitEvidence={(input) =>
          handleSubmitEvidence(input, state.reviewId, state.inputMethod)
        }
        onBack={goHome}
      />
    );
  }

  if (state.screen === "intake-loading") {
    return (
      <LuaIntakeLoadingScreen
        onBack={() => {
          const nextReviewId = activeReviewIdRef.current + 1;
          activeReviewIdRef.current = nextReviewId;
          setState({
            screen: "review",
            reviewId: nextReviewId,
            inputMethod: state.inputMethod,
            initialText: state.input.text,
            helperText: reviewHelpers[state.inputMethod],
          });
        }}
      />
    );
  }

  if (state.screen === "journal") {
    return (
      <IncidentJournalScreen
        summary={state.summary}
        originalText={state.input.text}
        extraContext={state.input.extraContext}
        userPerspective={state.input.userPerspective}
        fallbackMessage={state.fallbackMessage}
        onAnalyze={(text, userPerspective) =>
          handleAnalyze(text, userPerspective, state.reviewId)
        }
        onBack={() =>
          setState({
            screen: "review",
            reviewId: state.reviewId,
            inputMethod: "text",
            initialText: state.input.text,
            helperText: undefined,
          })
        }
      />
    );
  }

  if (state.screen === "result") {
    return (
      <ResultScreen
        result={state.result}
        sourceText={state.sourceText}
        sharedResultId={state.sharedResultId}
        resultShareService={resultShareServiceRef.current}
        onRestart={goHome}
        onOpenRewardChat={() =>
          setState({
            screen: "reward-chat",
            result: state.result,
            sourceText: state.sourceText,
            sharedResultId: state.sharedResultId,
          })
        }
        onRequestPrecedentJudgment={handlePrecedentJudgment}
      />
    );
  }

  if (state.screen === "reward-chat") {
    return (
      <RewardChatScreen
        result={state.result}
        onHome={goHome}
        onBack={() =>
          setState({
            screen: "result",
            result: state.result,
            sourceText: state.sourceText,
            sharedResultId: state.sharedResultId,
          })
        }
      />
    );
  }

  if (state.screen === "precedent-result") {
    return (
      <PrecedentJudgmentScreen
        report={state.report}
        disclaimer={state.disclaimer}
        onHome={goHome}
        onBack={() =>
          setState({
            screen: "result",
            result: state.result,
            sourceText: state.sourceText,
            sharedResultId: state.sharedResultId,
          })
        }
      />
    );
  }

  if (state.screen === "shared-result") {
    return (
      <main className="screen screen--result">
        <Top
          title={
            <Top.TitleParagraph size={22}>공유 판독 결과</Top.TitleParagraph>
          }
          subtitleBottom={
            <Top.SubtitleParagraph size={15}>
              {state.isLoading
                ? "판독 결과를 불러오고 있어요."
                : (state.errorMessage ?? "결과를 열 수 없어요.")}
            </Top.SubtitleParagraph>
          }
        />
        <Button type="button" onClick={goHome}>
          처음으로
        </Button>
      </main>
    );
  }

  if (state.screen === "room") {
    return (
      <RoomScreen
        errorMessage={state.errorMessage}
        isExploding={state.isExploding}
        isLoading={state.isLoading}
        messages={state.messages}
        participants={state.participants}
        currentParticipant={state.currentParticipant}
        remainingSeconds={state.remainingSeconds}
        room={state.room}
        inviteStatus={state.inviteStatus}
        inviteUrl={
          state.room && typeof window !== "undefined"
            ? createRoomInviteUrl({
                href: window.location.href,
                roomId: state.room.id,
                accessSecret: state.room.accessSecret,
              })
            : undefined
        }
        onBack={goHome}
        onCopyInvite={copyRoomInvite}
        onExplodeNow={explodeRoom}
        onJoinRoom={joinRoomWithNickname}
        onSendMessage={sendRoomMessage}
      />
    );
  }

  if (state.screen === "intro") {
    return <IntroScreen onStart={enterHomeFromIntro} />;
  }

  return (
    <InputHome onCreateRoom={() => void startRoom()} onSelect={handleSelect} />
  );
}

export default App;
