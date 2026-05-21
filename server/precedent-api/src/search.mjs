const fallbackKeywords = [
  "사과",
  "모욕",
  "협박",
  "손해배상",
  "명예훼손",
  "폭행",
  "기망",
  "계약",
  "사실혼",
  "위자료",
];

function tokenize(value) {
  const tokens = value
    .toLowerCase()
    .replace(/[^\p{Letter}\p{Number}\s]/gu, " ")
    .split(/\s+/)
    .filter((token) => token.length >= 2);

  if (tokens.length === 0) {
    return fallbackKeywords;
  }

  return [...new Set(tokens.flatMap(expandToken))];
}

function expandToken(token) {
  const keywordMatches = fallbackKeywords.filter((keyword) =>
    token.includes(keyword),
  );

  return keywordMatches.length > 0 ? [token, ...keywordMatches] : [token];
}

function scorePrecedent(precedent, tokens) {
  const haystack = `${precedent.title} ${precedent.court} ${precedent.summary}`.toLowerCase();

  return getMatchedTokens({ haystack, tokens }).reduce((score, token) => {
    return score + Math.min(token.length, 8);
  }, 0);
}

function getMatchedTokens({ haystack, tokens }) {
  return tokens.filter((token) => {
    if (!haystack.includes(token)) {
      return false;
    }

    return true;
  });
}

function createSimilarityReason(precedent, tokens) {
  const haystack = `${precedent.title} ${precedent.court} ${precedent.summary}`.toLowerCase();
  const matchedTokens = getMatchedTokens({ haystack, tokens }).slice(0, 3);

  if (matchedTokens.length === 0) {
    return "직접 겹치는 단어는 적지만, 다툼 책임 판단에 참고할 수 있는 판례예요.";
  }

  return `입력 대화의 "${matchedTokens.join(", ")}" 표현과 유사한 맥락이 판례 요지에서 확인됐어요.`;
}

export function searchPrecedents({ precedents, text, limit = 3 }) {
  const tokens = tokenize(text);
  const scoredPrecedents = precedents
    .map((precedent) => ({
      precedent,
      score: scorePrecedent(precedent, tokens),
    }))
    .sort((left, right) => right.score - left.score);
  const matches = scoredPrecedents.filter(({ score }) => score > 0);
  const selectedPrecedents = (matches.length > 0 ? matches : scoredPrecedents)
    .slice(0, limit);

  return selectedPrecedents
    .map(({ precedent }) => ({
      title: precedent.title,
      court: precedent.court,
      decidedAt: precedent.decidedAt,
      summary: precedent.summary.slice(0, 180),
      similarityReason: createSimilarityReason(precedent, tokens),
      sourceUrl: precedent.sourceUrl,
    }));
}
