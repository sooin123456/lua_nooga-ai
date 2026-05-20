export type PrecedentBasisInput = {
  text: string;
};

export type PrecedentBasis = {
  title: string;
  court: string;
  decidedAt: string;
  summary: string;
  similarityReason: string;
  sourceUrl?: string;
};

export type PrecedentBasisResult = {
  status: "notConfigured";
  precedents: PrecedentBasis[];
  message: "판례 검색 서버 연결 예정";
};

export const precedentDisclaimer =
  "판례는 유사한 참고 자료이며, 실제 법률 판단은 사건의 구체적 사실관계에 따라 달라져요.";

export async function getPrecedentBasis(
  input: PrecedentBasisInput,
): Promise<PrecedentBasisResult> {
  void input;

  return {
    status: "notConfigured",
    precedents: [],
    message: "판례 검색 서버 연결 예정",
  };
}
