export type SafetyLevel = "normal" | "caution" | "urgent";

export type JudgmentResult = {
  verdict: string;
  partyAPercent: number;
  partyBPercent: number;
  reasons: [string, string, string];
  advice: string;
  safetyLevel: SafetyLevel;
};

export type AnalyzeInput = {
  text: string;
  partyALabel?: string;
  partyBLabel?: string;
};

export type Analyzer = {
  analyze(input: AnalyzeInput): Promise<JudgmentResult>;
};
