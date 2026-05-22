import type { JudgmentResult, SafetyLevel } from "../analyzer/types";
import type { PrecedentBasis } from "./precedentAdapter";

export type PrecedentJudgmentReport = {
  verdict: string;
  partyAPercent: number;
  partyBPercent: number;
  reasons: [string, string, string];
  advice: string;
  safetyLevel: SafetyLevel;
  precedentIssues: string[];
  rebuttalPoints: string[];
  reconciliationSuggestion: string;
  precedents: PrecedentBasis[];
};

export type PrecedentJudgmentResult =
  | {
      status: "ready";
      report: PrecedentJudgmentReport;
      disclaimer: string;
      message: "판례 AI 분석이 완료됐어요.";
    }
  | {
      status: "notConfigured";
      message: "판례 분석 결제 확인이 필요해요.";
    }
  | {
      status: "failed";
      message: string;
    };

type RequestPrecedentJudgmentInput = {
  text: string;
  originalResult: JudgmentResult;
  entitlementToken?: string;
  endpointUrl?: string;
  fetcher?: typeof fetch;
};

function normalizeReport(payload: PrecedentJudgmentReport): PrecedentJudgmentReport {
  return {
    ...payload,
    reasons: payload.reasons.slice(0, 3) as [string, string, string],
    precedentIssues: payload.precedentIssues ?? [],
    rebuttalPoints: payload.rebuttalPoints ?? [],
    precedents: payload.precedents ?? [],
  };
}

export async function requestPrecedentJudgment({
  text,
  originalResult,
  entitlementToken,
  endpointUrl = "/api/ai/precedent-judgment",
  fetcher = fetch,
}: RequestPrecedentJudgmentInput): Promise<PrecedentJudgmentResult> {
  if (!entitlementToken) {
    return {
      status: "notConfigured",
      message: "판례 분석 결제 확인이 필요해요.",
    };
  }

  try {
    const response = await fetcher(endpointUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Precedent-Entitlement": entitlementToken,
      },
      body: JSON.stringify({ text, originalResult }),
    });
    const payload = (await response.json()) as {
      report?: PrecedentJudgmentReport;
      disclaimer?: string;
      message?: string;
    };

    if (!response.ok || !payload.report || !payload.disclaimer) {
      return {
        status: "failed",
        message: payload.message ?? "판례 AI 분석을 완료하지 못했어요.",
      };
    }

    return {
      status: "ready",
      report: normalizeReport(payload.report),
      disclaimer: payload.disclaimer,
      message: "판례 AI 분석이 완료됐어요.",
    };
  } catch {
    return {
      status: "failed",
      message: "판례 AI 분석을 완료하지 못했어요.",
    };
  }
}
