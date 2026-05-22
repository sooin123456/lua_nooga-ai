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

const privateInfoPatterns = [
  /01[016789][-\s.]?\d{3,4}[-\s.]?\d{4}/,
  /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i,
  /카톡\s*아이디|오픈채팅|주소\s*:/,
];

export type CommentModerationResult = {
  isAllowed: boolean;
  sanitizedText: string;
  message?: string;
};

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

export function moderatePublicComment(text: string): CommentModerationResult {
  const sanitizedText = text.replace(/\s+/g, " ").trim();

  if (privateInfoPatterns.some((pattern) => pattern.test(sanitizedText))) {
    return {
      isAllowed: false,
      sanitizedText,
      message: "선넘었어요. 개인정보는 댓글에 남기지 말아주세요.",
    };
  }

  if (
    urgentPatterns.some((pattern) => pattern.test(sanitizedText)) ||
    cautionPatterns.some((pattern) => pattern.test(sanitizedText))
  ) {
    return {
      isAllowed: false,
      sanitizedText,
      message: "선넘었어요. 댓글은 가볍게 남겨주세요.",
    };
  }

  return { isAllowed: true, sanitizedText };
}
