import { describe, expect, it } from "vitest";
import { detectSafetyLevel, moderatePublicComment } from "./safety";

describe("detectSafetyLevel", () => {
  it("marks violence and stalking language as urgent", () => {
    expect(detectSafetyLevel("때리겠다 죽여버리겠다 집 앞에서 기다린다")).toBe("urgent");
  });

  it("marks compact stalking location language as urgent", () => {
    expect(detectSafetyLevel("집앞에서 기다릴게")).toBe("urgent");
  });

  it("marks coercive control language as caution", () => {
    expect(detectSafetyLevel("휴대폰 검사하고 누구 만나는지 매번 허락받으라고 했어")).toBe("caution");
  });

  it("returns normal for ordinary conflict", () => {
    expect(detectSafetyLevel("서로 말투 때문에 서운해서 다퉜어")).toBe("normal");
  });
});

describe("moderatePublicComment", () => {
  it("allows short playful public comments", () => {
    expect(moderatePublicComment("이건 인정")).toEqual({
      isAllowed: true,
      sanitizedText: "이건 인정",
    });
  });

  it("blocks comments that cross the line", () => {
    expect(moderatePublicComment("진짜 죽여버려")).toEqual({
      isAllowed: false,
      sanitizedText: "진짜 죽여버려",
      message: "선넘었어요. 댓글은 가볍게 남겨주세요.",
    });
  });

  it("blocks comments that expose private contact details", () => {
    expect(moderatePublicComment("010-1234-5678 여기로 전화해")).toEqual({
      isAllowed: false,
      sanitizedText: "010-1234-5678 여기로 전화해",
      message: "선넘었어요. 개인정보는 댓글에 남기지 말아주세요.",
    });
  });
});
