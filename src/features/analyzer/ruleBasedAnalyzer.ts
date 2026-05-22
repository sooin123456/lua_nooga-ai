import { detectSafetyLevel } from "../safety/safety";
import type { AnalyzeInput, Analyzer, JudgmentResult } from "./types";

const partyAPattern = /(^|\n)\s*(A|나|남친|상대1)\s*[:：]/i;
const partyBPattern = /(^|\n)\s*(B|상대|여친|상대2)\s*[:：]/i;

const blamePatterns = [/항상/g, /절대/g, /네 탓/g, /너 때문/g, /이기적/g, /됐고/g, /내 말만/g];
const apologyPatterns = [/미안/g, /사과/g, /내가.*잘못/g, /말이.*셌/g, /다시.*이야기/g];
const dismissPatterns = [/그만해/g, /시끄러/g, /상관없/g, /알아서 해/g, /됐어/g];
const repairPatterns = [/다시/g, /같이/g, /해결/g, /이야기하/g, /정리하/g, /생각해보/g];

function countMatches(text: string, patterns: RegExp[]) {
  return patterns.reduce((count, pattern) => count + (text.match(pattern)?.length ?? 0), 0);
}

function splitPartyText(text: string) {
  const lines = text.split(/\n+/);
  const aLines: string[] = [];
  const bLines: string[] = [];
  const sharedLines: string[] = [];

  for (const line of lines) {
    if (/^\s*(A|나|남친|상대1)\s*[:：]/i.test(line)) {
      aLines.push(line);
    } else if (/^\s*(B|상대|여친|상대2)\s*[:：]/i.test(line)) {
      bLines.push(line);
    } else {
      sharedLines.push(line);
    }
  }

  return {
    aText: aLines.length > 0 ? aLines.join("\n") : sharedLines.join("\n"),
    bText: bLines.length > 0 ? bLines.join("\n") : sharedLines.join("\n"),
  };
}

function scoreParty(text: string) {
  const blame = countMatches(text, blamePatterns);
  const dismiss = countMatches(text, dismissPatterns);
  const apology = countMatches(text, apologyPatterns);
  const repair = countMatches(text, repairPatterns);
  return Math.max(1, 12 + blame * 16 + dismiss * 12 - apology * 10 - repair * 5);
}

function clampPercent(value: number) {
  return Math.min(95, Math.max(5, value));
}

export async function analyzeWithRules(input: AnalyzeInput): Promise<JudgmentResult> {
  const text = input.text.trim();
  const safetyLevel = detectSafetyLevel(text);

  if (safetyLevel === "urgent") {
    return {
      verdict: "지금은 판정보다 안전이 먼저예요",
      partyAPercent: 50,
      partyBPercent: 50,
      reasons: [
        "폭력, 협박, 스토킹처럼 보일 수 있는 표현이 포함돼 있어요.",
        "이 상황은 재미용 승패 판정보다 안전 확보가 우선이에요.",
        "혼자 해결하려 하기보다 믿을 수 있는 사람이나 기관에 도움을 요청하는 편이 좋아요.",
      ],
      advice: "위협이 계속된다면 대화를 멈추고 안전한 장소와 도움을 먼저 확보하세요.",
      safetyLevel,
    };
  }

  if (safetyLevel === "caution") {
    return {
      verdict: "안전 확인이 먼저 필요한 대화예요",
      partyAPercent: 50,
      partyBPercent: 50,
      reasons: [
        "휴대폰 검사, 허락 요구, 통제처럼 보일 수 있는 표현이 포함돼 있어요.",
        "이런 신호가 있을 때는 누가 더 잘못했는지보다 안전한 거리와 선택권이 중요해요.",
        "입력된 대화만으로 단정할 수 없어서 승패식 판정은 하지 않을게요.",
      ],
      advice:
        "불편함이 반복되면 혼자 설득하려 하기보다 믿을 수 있는 사람이나 전문 기관에 도움을 요청하세요.",
      safetyLevel,
    };
  }

  const { aText, bText } = splitPartyText(text);
  const hasPartyMarkers = partyAPattern.test(text) || partyBPattern.test(text);

  const aScore = scoreParty(aText);
  const bScore = scoreParty(bText);
  const rawAPercent = hasPartyMarkers ? Math.round((aScore / (aScore + bScore)) * 100) : 55;
  const partyAPercent = clampPercent(rawAPercent);
  const partyBPercent = 100 - partyAPercent;
  const leadingParty = partyAPercent >= partyBPercent ? "A" : "B";
  const leadingPercent = Math.max(partyAPercent, partyBPercent);

  return {
    verdict: `${leadingParty}가 ${leadingPercent}% 선넘었어요`,
    partyAPercent,
    partyBPercent,
    reasons: [
      "비난 표현과 단정적인 말투가 판정 점수에 크게 반영됐어요.",
      "사과, 인정, 해결 제안이 있는 쪽은 잘못 비율이 낮아졌어요.",
      "입력된 대화 기준이라 빠진 맥락이 있으면 결과가 달라질 수 있어요.",
    ],
    advice:
      leadingParty === "A"
        ? "A는 먼저 말투를 인정하고, B가 들은 감정을 한 문장으로 되짚어 주세요."
        : "B는 먼저 말투를 인정하고, A가 들은 감정을 한 문장으로 되짚어 주세요.",
    safetyLevel,
  };
}

export const ruleBasedAnalyzer: Analyzer = {
  analyze: analyzeWithRules,
};
