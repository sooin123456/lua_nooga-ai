import { describe, expect, it, vi } from "vitest";
import {
  createResultShareService,
  createSupabaseResultShareGateway,
} from "./resultShareAdapter";

const result = {
  verdict: "A가 62% 선넘었어요",
  partyAPercent: 62,
  partyBPercent: 38,
  reasons: ["말투가 셌어요", "사과했어요", "대화를 이어갔어요"],
  advice: "서로 한 문장씩만 다시 말해보세요.",
  safetyLevel: "normal" as const,
};

function createRpcSupabaseMock() {
  const rpc = vi.fn((name: string) => {
    const responses = {
      create_shared_result: {
        id: "result-1",
        result_json: result,
        created_at: "2026-05-21T00:00:00.000Z",
        expires_at: "2026-05-28T00:00:00.000Z",
      },
      get_shared_result: {
        id: "result-1",
        result_json: result,
        created_at: "2026-05-21T00:00:00.000Z",
        expires_at: "2026-05-28T00:00:00.000Z",
      },
      list_result_comments: [
        {
          id: "comment-1",
          result_id: "result-1",
          body: "댓글",
          created_at: "2026-05-21T00:00:01.000Z",
        },
      ],
      add_result_comment: {
        id: "comment-2",
        result_id: "result-1",
        body: "새 댓글",
        created_at: "2026-05-21T00:00:02.000Z",
      },
      get_result_like_state: {
        like_count: 3,
        has_liked: false,
      },
      set_result_like: {
        like_count: 4,
        has_liked: true,
      },
      list_hot_battles: [
        {
          id: "result-1",
          result_json: result,
          created_at: "2026-05-21T00:00:00.000Z",
          expires_at: "2026-05-28T00:00:00.000Z",
          comment_count: 2,
          like_count: 4,
          score: 14,
        },
      ],
    } as const;

    return {
      single: vi.fn().mockResolvedValue({
        data: responses[name as keyof typeof responses],
        error: null,
      }),
      maybeSingle: vi.fn().mockResolvedValue({
        data: responses[name as keyof typeof responses],
        error: null,
      }),
      returns: vi.fn().mockResolvedValue({
        data: responses[name as keyof typeof responses],
        error: null,
      }),
    };
  });

  return { rpc };
}

describe("resultShareAdapter", () => {
  it("creates a public-safe summary before saving shared results", async () => {
    const publicResult = {
      ...result,
      publicTitle: "약속 시간 Battle",
      issueSummary: "늦은 설명과 기다린 감정이 부딪혔어요.",
      anonymizedDialogueSummary: [
        "A는 늦은 이유를 설명했어요.",
        "B는 기다린 감정을 말했어요.",
      ],
    };
    const gateway = {
      createSharedResult: vi.fn().mockResolvedValue({
        id: "result-1",
        result: publicResult,
        createdAt: "2026-05-21T00:00:00.000Z",
        expiresAt: "2026-05-28T00:00:00.000Z",
      }),
      getSharedResult: vi.fn(),
      listComments: vi.fn(),
      addComment: vi.fn(),
      getLikeState: vi.fn(),
      setLiked: vi.fn(),
      reportResult: vi.fn(),
      listHotBattles: vi.fn(),
    };
    const fetcher = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ result: publicResult }),
    });
    const service = createResultShareService({
      gateway,
      publicSummaryEndpointUrl: "/api/ai/public-summary",
      fetcher: fetcher as never,
    });

    await service.createSharedResult(result, {
      sourceText: "A: 늦어서 미안\nB: 왜 이제 와",
    });

    expect(fetcher).toHaveBeenCalledWith("/api/ai/public-summary", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        result,
        sourceText: "A: 늦어서 미안\nB: 왜 이제 와",
      }),
    });
    expect(gateway.createSharedResult).toHaveBeenCalledWith(publicResult);
    expect(JSON.stringify(gateway.createSharedResult.mock.calls[0][0])).not.toContain(
      "왜 이제 와",
    );
  });

  it("falls back to the current result when public summary creation fails", async () => {
    const gateway = {
      createSharedResult: vi.fn().mockResolvedValue({
        id: "result-1",
        result,
        createdAt: "2026-05-21T00:00:00.000Z",
        expiresAt: "2026-05-28T00:00:00.000Z",
      }),
      getSharedResult: vi.fn(),
      listComments: vi.fn(),
      addComment: vi.fn(),
      getLikeState: vi.fn(),
      setLiked: vi.fn(),
      reportResult: vi.fn(),
      listHotBattles: vi.fn(),
    };
    const service = createResultShareService({
      gateway,
      fetcher: vi.fn().mockRejectedValue(new Error("offline")) as never,
    });

    await service.createSharedResult(result, {
      sourceText: "A: test",
    });

    expect(gateway.createSharedResult).toHaveBeenCalledWith(result);
  });

  it("uses RPCs for shared result reactions instead of raw table access", async () => {
    const supabase = createRpcSupabaseMock();
    const gateway = createSupabaseResultShareGateway(supabase as never);

    await expect(gateway.createSharedResult(result)).resolves.toMatchObject({
      id: "result-1",
    });
    await expect(gateway.getSharedResult("result-1")).resolves.toMatchObject({
      id: "result-1",
    });
    await expect(gateway.listComments("result-1")).resolves.toHaveLength(1);
    await expect(gateway.addComment("result-1", "새 댓글")).resolves.toMatchObject({
      body: "새 댓글",
    });
    await expect(gateway.getLikeState("result-1")).resolves.toEqual({
      likeCount: 3,
      hasLiked: false,
    });
    await expect(gateway.setLiked("result-1", true)).resolves.toEqual({
      likeCount: 4,
      hasLiked: true,
    });
    await expect(gateway.reportResult("result-1", "inappropriate")).resolves.toBeUndefined();
    await expect(gateway.listHotBattles()).resolves.toEqual([
      expect.objectContaining({
        id: "result-1",
        commentCount: 2,
        likeCount: 4,
        score: 14,
      }),
    ]);

    expect(supabase.rpc).toHaveBeenCalledWith(
      "create_shared_result",
      expect.any(Object),
    );
    expect(supabase.rpc).toHaveBeenCalledWith("set_result_like", {
      p_client_key: expect.any(String),
      p_liked: true,
      p_result_id: "result-1",
    });
    expect(supabase.rpc).toHaveBeenCalledWith("report_result", {
      p_client_key: expect.any(String),
      p_reason: "inappropriate",
      p_result_id: "result-1",
    });
    expect("from" in supabase).toBe(false);
  });
});
