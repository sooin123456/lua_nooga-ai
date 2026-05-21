import type { JudgmentResult } from "../analyzer/types";

export type SharedJudgmentResult = {
  id: string;
  result: JudgmentResult;
  createdAt: string;
  expiresAt: string;
};

export type HotBattle = SharedJudgmentResult & {
  commentCount: number;
  likeCount: number;
  score: number;
};

export type ResultComment = {
  id: string;
  resultId: string;
  body: string;
  createdAt: string;
};

export type ResultLikeState = {
  likeCount: number;
  hasLiked: boolean;
};

export type ResultShareGateway = {
  createSharedResult(result: JudgmentResult): Promise<SharedJudgmentResult>;
  getSharedResult(resultId: string): Promise<SharedJudgmentResult | null>;
  listComments(resultId: string): Promise<ResultComment[]>;
  addComment(resultId: string, body: string): Promise<ResultComment>;
  getLikeState(resultId: string): Promise<ResultLikeState>;
  setLiked(resultId: string, liked: boolean): Promise<ResultLikeState>;
  listHotBattles(limit?: number): Promise<HotBattle[]>;
};
