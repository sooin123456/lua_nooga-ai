import type { SafetyLevel } from "../analyzer/types";

const urgentPatterns = [
  /죽여/,
  /때리/,
  /폭행/,
  /협박/,
  /집\s*앞/,
  /스토킹/,
  /몰래\s*촬영/,
  /불법\s*촬영/,
  /자해/,
  /죽고\s*싶/,
];

const cautionPatterns = [
  /휴대폰\s*검사/,
  /허락받/,
  /통제/,
  /감시/,
  /강요/,
  /협박하듯/,
  /미성년/,
];

export function detectSafetyLevel(text: string): SafetyLevel {
  const compactText = text.replace(/\s+/g, " ").trim();

  if (urgentPatterns.some((pattern) => pattern.test(compactText))) {
    return "urgent";
  }

  if (cautionPatterns.some((pattern) => pattern.test(compactText))) {
    return "caution";
  }

  return "normal";
}
