import { describe, expect, it } from "vitest";
import { detectSafetyLevel } from "./safety";

describe("detectSafetyLevel", () => {
  it("marks violence and stalking language as urgent", () => {
    expect(detectSafetyLevel("때리겠다 죽여버리겠다 집 앞에서 기다린다")).toBe("urgent");
  });

  it("marks coercive control language as caution", () => {
    expect(detectSafetyLevel("휴대폰 검사하고 누구 만나는지 매번 허락받으라고 했어")).toBe("caution");
  });

  it("returns normal for ordinary conflict", () => {
    expect(detectSafetyLevel("서로 말투 때문에 서운해서 다퉜어")).toBe("normal");
  });
});
