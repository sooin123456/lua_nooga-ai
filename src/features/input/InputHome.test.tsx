import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { InputHome } from "./InputHome";

describe("InputHome", () => {
  it("shows the main dashboard trust and status cards", () => {
    render(
      <InputHome
        resultShareService={null}
        onCreateRoom={vi.fn()}
        onSelect={vi.fn()}
      />,
    );

    expect(screen.getByText("루아 AI")).toBeInTheDocument();
    expect(screen.getByText("오늘의 핫 Battle 🔥")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "랭킹 보기" })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
    expect(
      screen.queryByText("연락 늦게 봤다 vs 말투가 셌다"),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("둘이 같이 판정받기")).not.toBeInTheDocument();
    expect(screen.queryByText("60초 안에 각자 말하고 결과만 남겨요.")).not.toBeInTheDocument();
    expect(screen.getByText("최근 판정")).toBeInTheDocument();
    expect(screen.queryByText("억울하면 판례로 다시 따지기")).not.toBeInTheDocument();
    expect(screen.getByText(/현재 무료 판독은 입력 내용을/)).toBeInTheDocument();
    expect(screen.getByText(/재미용 판독이며/)).toBeInTheDocument();
  });

  it("renders the approved input method buttons", () => {
    render(
      <InputHome
        resultShareService={null}
        onCreateRoom={vi.fn()}
        onSelect={vi.fn()}
      />,
    );

    expect(screen.getAllByRole("button").length).toBeGreaterThanOrEqual(5);
    expect(
      screen.getByRole("button", { name: /카톡 싸움 붙여넣기/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /증거 캡처 제출하기/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /현장 녹음 시작/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /녹음 파일 불러오기/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /실시간 판정방 만들기/ }),
    ).toBeInTheDocument();
  });

  it("opens hot battle ranking through a toggle", async () => {
    const user = userEvent.setup();

    render(
      <InputHome
        resultShareService={null}
        onCreateRoom={vi.fn()}
        onSelect={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { name: "랭킹 보기" }));

    expect(screen.getByRole("button", { name: "닫기" })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
    expect(screen.getByText("1위")).toBeInTheDocument();
    expect(screen.getByText("2위")).toBeInTheDocument();
    expect(screen.getByText("3위")).toBeInTheDocument();
    expect(screen.getByText("🥇")).toBeInTheDocument();
    expect(screen.getByText("🥈")).toBeInTheDocument();
    expect(screen.getByText("🥉")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "댓글달기" })).toHaveLength(3);
  });

  it("shows a floating bottom tabbar for the home dashboard", () => {
    render(
      <InputHome
        resultShareService={null}
        onCreateRoom={vi.fn()}
        onSelect={vi.fn()}
      />,
    );

    const tabbar = screen.getByRole("navigation", { name: "하단 탭" });

    expect(tabbar).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "홈" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("button", { name: "판정방" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "핫 Battle" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "최근" })).toBeInTheDocument();
  });

  it("opens hot battle ranking from the bottom tabbar", async () => {
    const user = userEvent.setup();

    render(
      <InputHome
        resultShareService={null}
        onCreateRoom={vi.fn()}
        onSelect={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { name: "핫 Battle" }));

    expect(screen.getByRole("button", { name: "핫 Battle" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByText("1위")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "댓글달기" })).toHaveLength(3);
  });

  it("starts the judgment room from the bottom tabbar", async () => {
    const user = userEvent.setup();
    const onCreateRoom = vi.fn();

    render(
      <InputHome
        resultShareService={null}
        onCreateRoom={onCreateRoom}
        onSelect={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { name: "판정방" }));

    expect(onCreateRoom).toHaveBeenCalledOnce();
  });

  it("moves from a hot battle detail back to home through the bottom tabbar", async () => {
    const user = userEvent.setup();

    render(
      <InputHome
        resultShareService={null}
        onCreateRoom={vi.fn()}
        onSelect={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { name: "핫 Battle" }));
    await user.click(screen.getAllByRole("button", { name: "댓글달기" })[0]);
    await user.click(screen.getByRole("button", { name: "홈" }));

    expect(screen.getByText("오늘의 핫 Battle 🔥")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "대화 내용" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "홈" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  it("opens a hot battle detail page with the result, conversation, and comments", async () => {
    const user = userEvent.setup();

    render(
      <InputHome
        resultShareService={null}
        onCreateRoom={vi.fn()}
        onSelect={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { name: "랭킹 보기" }));
    await user.click(screen.getAllByRole("button", { name: "댓글달기" })[1]);

    expect(screen.getByRole("heading", { name: "루아 판정" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "대화 내용" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "댓글쓰기" })).toBeInTheDocument();
    expect(
      screen.getByText("공개 Battle은 개인정보를 제외한 익명 요약으로 보여줘요."),
    ).toBeInTheDocument();
    expect(screen.getByText("A: 거의 다 왔어?")) .toBeInTheDocument();
    expect(screen.getByText("B: 미안, 20분 늦을 것 같아.")) .toBeInTheDocument();

    await user.type(screen.getByLabelText("핫 Battle 댓글"), "이건 B가 좀 셌다");
    await user.click(screen.getByRole("button", { name: "등록" }));

    expect(screen.getByText(/댓글 6/)).toBeInTheDocument();
    expect(screen.getByText("이건 B가 좀 셌다")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "핫 Battle로 돌아가기" }),
    ).toBeInTheDocument();
  });

  it("shows hot Battle detail in conversation, verdict, comments order", async () => {
    const user = userEvent.setup();

    render(
      <InputHome
        resultShareService={null}
        onCreateRoom={vi.fn()}
        onSelect={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { name: "핫 Battle" }));
    await user.click(screen.getAllByRole("button", { name: "댓글달기" })[0]);

    const conversationHeading = screen.getByRole("heading", { name: "대화 내용" });
    const verdictHeading = screen.getByRole("heading", { name: "루아 판정" });
    const commentsHeading = screen.getByRole("heading", { name: "댓글쓰기" });

    expect(
      conversationHeading.compareDocumentPosition(verdictHeading) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      verdictHeading.compareDocumentPosition(commentsHeading) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it('calls onSelect with "screenshot" when the screenshot method is clicked', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();

    render(
      <InputHome
        resultShareService={null}
        onCreateRoom={vi.fn()}
        onSelect={onSelect}
      />,
    );

    await user.click(screen.getByRole("button", { name: /증거 캡처 제출하기/ }));

    expect(onSelect).toHaveBeenCalledWith("screenshot");
  });

  it("calls onCreateRoom when the room action is clicked", async () => {
    const user = userEvent.setup();
    const onCreateRoom = vi.fn();

    render(
      <InputHome
        resultShareService={null}
        onCreateRoom={onCreateRoom}
        onSelect={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { name: /실시간 판정방 만들기/ }));

    expect(onCreateRoom).toHaveBeenCalledOnce();
  });

  it("loads hot battle ranking from the result share service", async () => {
    const resultShareService = {
      createSharedResult: vi.fn(),
      getSharedResult: vi.fn(),
      listComments: vi.fn(),
      addComment: vi.fn(),
      getLikeState: vi.fn(),
      setLiked: vi.fn(),
      listHotBattles: vi.fn().mockResolvedValue([
        {
          id: "hot-1",
          result: {
            verdict: "B가 73% 선넘었어요",
            partyAPercent: 27,
            partyBPercent: 73,
            reasons: ["지각 설명이 늦었어요", "사과가 부족했어요", "말투가 셌어요"],
            advice: "먼저 늦은 이유부터 짧게 말해요.",
            safetyLevel: "normal",
          },
          createdAt: "2026-05-21T00:00:00.000Z",
          expiresAt: "2026-05-28T00:00:00.000Z",
          commentCount: 4,
          likeCount: 9,
          score: 30,
        },
        {
          id: "hot-2",
          result: {
            verdict: "A가 66% 선넘었어요",
            partyAPercent: 66,
            partyBPercent: 34,
            reasons: ["말투가 공격적이었어요", "상대 설명을 끊었어요", "사과가 늦었어요"],
            advice: "먼저 한 문장으로 인정하고 넘어가요.",
            safetyLevel: "normal",
          },
          createdAt: "2026-05-21T00:00:00.000Z",
          expiresAt: "2026-05-28T00:00:00.000Z",
          commentCount: 2,
          likeCount: 5,
          score: 20,
        },
        {
          id: "hot-3",
          result: {
            verdict: "B가 58% 선넘었어요",
            partyAPercent: 42,
            partyBPercent: 58,
            reasons: ["약속을 바꿨어요", "설명이 부족했어요", "농담이 오해를 키웠어요"],
            advice: "변명보다 다음 약속을 먼저 제안해요.",
            safetyLevel: "normal",
          },
          createdAt: "2026-05-21T00:00:00.000Z",
          expiresAt: "2026-05-28T00:00:00.000Z",
          commentCount: 1,
          likeCount: 3,
          score: 10,
        },
        {
          id: "hot-4",
          result: {
            verdict: "A가 51% 선넘었어요",
            partyAPercent: 51,
            partyBPercent: 49,
            reasons: ["표현이 짧았어요", "맥락이 부족했어요", "답장이 늦었어요"],
            advice: "짧게라도 상황을 먼저 공유해요.",
            safetyLevel: "normal",
          },
          createdAt: "2026-05-21T00:00:00.000Z",
          expiresAt: "2026-05-28T00:00:00.000Z",
          commentCount: 0,
          likeCount: 1,
          score: 5,
        },
      ]),
    };

    render(
      <InputHome
        resultShareService={resultShareService}
        onCreateRoom={vi.fn()}
        onSelect={vi.fn()}
      />,
    );

    expect(await screen.findByText("실시간 공유 결과 기준으로 집계했어요.")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "랭킹 보기" }));

    expect(screen.getByText("B가 73% 선넘었어요")).toBeInTheDocument();
    expect(screen.getByText(/댓글 4/)).toBeInTheDocument();
    expect(screen.getByText(/좋아요 9/)).toBeInTheDocument();
    expect(screen.queryByText("A가 51% 선넘었어요")).not.toBeInTheDocument();
  });
});
