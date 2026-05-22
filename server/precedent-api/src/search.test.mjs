import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { searchPrecedents } from "./search.mjs";

const precedents = [
  {
    title: "모욕 손해배상 사건",
    court: "대법원",
    decidedAt: "2020-01-01",
    summary: "반복적인 모욕 표현과 사과 여부는 위자료 책임 판단에 영향을 줄 수 있다.",
    sourceUrl: "https://example.com/1",
  },
  {
    title: "계약 해제 사건",
    court: "서울중앙지방법원",
    decidedAt: "2019-02-02",
    summary: "계약 이행 지연과 기망 여부를 따져 손해배상 책임을 판단한다.",
    sourceUrl: "https://example.com/2",
  },
  {
    title: "일상 다툼 사건",
    court: "부산지방법원",
    decidedAt: "2018-03-03",
    summary: "갈등 상황의 책임 비율은 각자의 행위와 이후 태도를 함께 본다.",
    sourceUrl: "https://example.com/3",
  },
];

describe("searchPrecedents", () => {
  it("returns the most similar precedent with a reason based on matched terms", () => {
    const result = searchPrecedents({
      precedents,
      text: "A가 모욕적인 말을 반복했고 사과를 하지 않았어",
    });

    assert.equal(result[0].title, "모욕 손해배상 사건");
    assert.match(result[0].similarityReason, /모욕|사과/);
  });

  it("falls back to useful precedents when no token directly matches", () => {
    const result = searchPrecedents({
      precedents,
      text: "완전히새로운표현",
    });

    assert.equal(result.length, 3);
    assert.match(result[0].similarityReason, /참고할 수 있는 판례/);
  });
});
