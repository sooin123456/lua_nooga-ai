const defaultReason = "대화의 표현과 맥락을 함께 봤어요.";
const defaultAdvice = "서로 한 문장씩만 낮춰서 다시 말해보세요.";

function isOneOf(value, allowedValues) {
  return allowedValues.includes(value);
}

function getTrimmedString(value) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function getTrimmedStringArray(value, limit) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map(getTrimmedString).filter(Boolean).slice(0, limit);
}

function assignIfValid(target, key, value) {
  if (value !== undefined) {
    target[key] = value;
  }
}

export function clampPercent(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    return 50;
  }

  return Math.max(0, Math.min(100, Math.round(number)));
}

export function normalizeJudgmentResult(payload = {}) {
  const partyAPercent = clampPercent(payload.partyAPercent);
  const partyBPercent = 100 - partyAPercent;
  const reasons = getTrimmedStringArray(payload.reasons, 3);

  while (reasons.length < 3) {
    reasons.push(defaultReason);
  }

  const safetyLevel = isOneOf(payload.safetyLevel, [
    "normal",
    "caution",
    "urgent",
  ])
    ? payload.safetyLevel
    : "normal";
  const result = {
    verdict:
      getTrimmedString(payload.verdict) ?? `A가 ${partyAPercent}% 선넘었어요`,
    partyAPercent,
    partyBPercent,
    reasons,
    advice: getTrimmedString(payload.advice) ?? defaultAdvice,
    safetyLevel,
  };

  assignIfValid(
    result,
    "winner",
    isOneOf(payload.winner, ["A", "B", "draw"]) ? payload.winner : undefined,
  );
  assignIfValid(
    result,
    "blamedParty",
    isOneOf(payload.blamedParty, ["A", "B", "both", "unknown"])
      ? payload.blamedParty
      : undefined,
  );
  assignIfValid(
    result,
    "userPerspective",
    isOneOf(payload.userPerspective, ["first", "second", "unknown"])
      ? payload.userPerspective
      : undefined,
  );
  assignIfValid(
    result,
    "userPerspectiveVerdict",
    getTrimmedString(payload.userPerspectiveVerdict),
  );
  assignIfValid(
    result,
    "tone",
    isOneOf(payload.tone, ["light", "serious", "safety"])
      ? payload.tone
      : undefined,
  );
  assignIfValid(
    result,
    "rewardTier",
    isOneOf(payload.rewardTier, ["small", "medium", "large"])
      ? payload.rewardTier
      : undefined,
  );
  assignIfValid(result, "publicTitle", getTrimmedString(payload.publicTitle));
  assignIfValid(result, "issueSummary", getTrimmedString(payload.issueSummary));

  const anonymizedDialogueSummary = getTrimmedStringArray(
    payload.anonymizedDialogueSummary,
    2,
  );
  if (anonymizedDialogueSummary.length > 0) {
    result.anonymizedDialogueSummary = anonymizedDialogueSummary;
  }

  assignIfValid(result, "shareSummary", getTrimmedString(payload.shareSummary));

  return result;
}

export function parseJsonFromModelText(text) {
  if (typeof text !== "string") {
    throw new Error("model output is not text");
  }

  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);

  return JSON.parse(fenced ? fenced[1].trim() : trimmed);
}
