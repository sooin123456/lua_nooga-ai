import { describe, expect, it, vi } from "vitest";
import { createSupabaseResultShareGateway } from "./resultShareAdapter";

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
    expect("from" in supabase).toBe(false);
  });
});
