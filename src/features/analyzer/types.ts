export type SafetyLevel = "normal" | "caution" | "urgent";
export type UserPerspective = "first" | "second" | "unknown";
export type RewardTier = "small" | "medium" | "large";

export type JudgmentResult = {
  verdict: string;
  partyAPercent: number;
  partyBPercent: number;
  reasons: [string, string, string];
  advice: string;
  safetyLevel: SafetyLevel;
  winner?: "A" | "B" | "draw";
  blamedParty?: "A" | "B" | "both" | "unknown";
  userPerspective?: UserPerspective;
  userPerspectiveVerdict?: string;
  tone?: "light" | "serious" | "safety";
  rewardTier?: RewardTier;
  publicTitle?: string;
  issueSummary?: string;
  anonymizedDialogueSummary?: [string, string];
  shareSummary?: string;
};

export type AnalyzeInput = {
  text: string;
  partyALabel?: string;
  partyBLabel?: string;
};

export type Analyzer = {
  analyze(input: AnalyzeInput): Promise<JudgmentResult>;
};
