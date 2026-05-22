import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { JudgmentResult } from "../analyzer/types";
import type {
  HotBattle,
  ResultComment,
  ResultLikeState,
  ResultShareGateway,
  SharedJudgmentResult,
} from "./types";

let configuredResultShareService:
  | ReturnType<typeof createResultShareService>
  | null
  | undefined;

type ResultRow = {
  id: string;
  result_json: JudgmentResult;
  created_at: string;
  expires_at: string;
};

type HotBattleRow = ResultRow & {
  comment_count: number;
  like_count: number;
  score: number;
};

type CommentRow = {
  id: string;
  result_id: string;
  body: string;
  created_at: string;
};

type ResultShareServiceOptions = {
  gateway: ResultShareGateway;
  publicSummaryEndpointUrl?: string;
  fetcher?: typeof fetch;
};

type CreateSharedResultOptions = {
  sourceText?: string;
};

function mapResultRow(row: ResultRow): SharedJudgmentResult {
  return {
    id: row.id,
    result: row.result_json,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
  };
}

function mapHotBattleRow(row: HotBattleRow): HotBattle {
  return {
    ...mapResultRow(row),
    commentCount: row.comment_count,
    likeCount: row.like_count,
    score: row.score,
  };
}

function mapCommentRow(row: CommentRow): ResultComment {
  return {
    id: row.id,
    resultId: row.result_id,
    body: row.body,
    createdAt: row.created_at,
  };
}

function assertSupabaseData<T>(
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

function createClientKey() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `client-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function getResultReactionClientKey() {
  const storageKey = "lua-nooga-ai-result-client-key";

  if (typeof window === "undefined") {
    return createClientKey();
  }

  const existingKey = window.localStorage.getItem(storageKey);
  if (existingKey) {
    return existingKey;
  }

  const nextKey = createClientKey();
  window.localStorage.setItem(storageKey, nextKey);
  return nextKey;
}

export function createResultShareService({
  gateway,
  publicSummaryEndpointUrl = "/api/ai/public-summary",
  fetcher = fetch,
}: ResultShareServiceOptions) {
  const createPublicResult = async (
    result: JudgmentResult,
    options?: CreateSharedResultOptions,
  ) => {
    const sourceText = options?.sourceText?.trim();

    if (!sourceText) {
      return result;
    }

    try {
      const response = await fetcher(publicSummaryEndpointUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ result, sourceText }),
      });
      const payload = (await response.json()) as { result?: JudgmentResult };

      if (response.ok && payload.result) {
        return payload.result;
      }
    } catch {
      // Sharing should remain available locally even when the summary API is unavailable.
    }

    return result;
  };

  return {
    async createSharedResult(
      result: JudgmentResult,
      options?: CreateSharedResultOptions,
    ) {
      return gateway.createSharedResult(await createPublicResult(result, options));
    },
    getSharedResult: gateway.getSharedResult,
    listComments: gateway.listComments,
    addComment: gateway.addComment,
    getLikeState: gateway.getLikeState,
    setLiked: gateway.setLiked,
    reportResult: gateway.reportResult,
    listHotBattles: gateway.listHotBattles,
  };
}

export function createSupabaseResultShareGateway(
  supabase: SupabaseClient,
): ResultShareGateway {
  const clientKey = getResultReactionClientKey();
  const getLikeState = async (resultId: string): Promise<ResultLikeState> => {
    const { data, error } = await supabase.rpc("get_result_like_state", {
      p_result_id: resultId,
      p_client_key: clientKey,
    }).single<{ like_count: number; has_liked: boolean }>();

    const likeState = assertSupabaseData(data, error);

    return {
      likeCount: likeState.like_count,
      hasLiked: likeState.has_liked,
    };
  };

  return {
    async createSharedResult(result: JudgmentResult) {
      const { data, error } = await supabase.rpc("create_shared_result", {
        p_result_json: result,
        p_expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      }).single<ResultRow>();

      return mapResultRow(assertSupabaseData(data, error));
    },

    async getSharedResult(resultId: string) {
      const { data, error } = await supabase.rpc("get_shared_result", {
        p_result_id: resultId,
      }).maybeSingle<ResultRow>();

      if (error) {
        throw new Error(error.message);
      }

      return data ? mapResultRow(data) : null;
    },

    async listComments(resultId: string) {
      const { data, error } = await supabase.rpc("list_result_comments", {
        p_result_id: resultId,
        p_limit: 20,
      }).returns<CommentRow[]>();

      return assertSupabaseData(data, error).map(mapCommentRow);
    },

    async addComment(resultId: string, body: string) {
      const { data, error } = await supabase.rpc("add_result_comment", {
        p_result_id: resultId,
        p_body: body,
      }).single<CommentRow>();

      return mapCommentRow(assertSupabaseData(data, error));
    },

    getLikeState,

    async setLiked(resultId: string, liked: boolean): Promise<ResultLikeState> {
      const { data, error } = await supabase.rpc("set_result_like", {
        p_result_id: resultId,
        p_client_key: clientKey,
        p_liked: liked,
      }).single<{ like_count: number; has_liked: boolean }>();

      const likeState = assertSupabaseData(data, error);
      return {
        likeCount: likeState.like_count,
        hasLiked: likeState.has_liked,
      };
    },

    async reportResult(resultId: string, reason: string) {
      const { error } = await supabase.rpc("report_result", {
        p_result_id: resultId,
        p_client_key: clientKey,
        p_reason: reason,
      });

      if (error) {
        throw new Error(error.message);
      }
    },

    async listHotBattles(limit = 5) {
      const { data, error } = await supabase.rpc("list_hot_battles", {
        p_limit: limit,
      }).returns<HotBattleRow[]>();

      return assertSupabaseData(data, error).map(mapHotBattleRow);
    },
  };
}

export function createConfiguredResultShareService() {
  if (configuredResultShareService !== undefined) {
    return configuredResultShareService;
  }

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const supabaseAnonKey = import.meta.env
    .VITE_SUPABASE_ANON_KEY as string | undefined;

  if (!supabaseUrl || !supabaseAnonKey) {
    configuredResultShareService = null;
    return configuredResultShareService;
  }

  configuredResultShareService = createResultShareService({
    gateway: createSupabaseResultShareGateway(
      createClient(supabaseUrl, supabaseAnonKey),
    ),
  });
  return configuredResultShareService;
}
