import { ThemeProvider } from "@toss/tds-mobile";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeAll, describe, expect, it, vi } from "vitest";
import App from "./App";
import { analyzeWithRules } from "./features/analyzer/ruleBasedAnalyzer";

vi.mock("./features/analyzer/ruleBasedAnalyzer", () => ({
  analyzeWithRules: vi.fn(),
}));

beforeAll(() => {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
});

describe("App text review flow", () => {
  it("keeps home visible when a stale analysis resolves after going back", async () => {
    const user = userEvent.setup();
    let resolveAnalyze: (value: Awaited<ReturnType<typeof analyzeWithRules>>) => void =
      () => undefined;

    vi.mocked(analyzeWithRules).mockReturnValue(
      new Promise((resolve) => {
        resolveAnalyze = resolve;
      }),
    );

    render(
      <ThemeProvider>
        <App />
      </ThemeProvider>,
    );

    await user.click(screen.getByRole("button", { name: /카톡 싸움 붙여넣기/ }));
    await user.click(screen.getByRole("button", { name: "판정 받기" }));
    await user.click(screen.getByRole("button", { name: "돌아가기" }));

    resolveAnalyze({
      verdict: "A가 55% 정도 더 선 넘었어요",
      partyAPercent: 55,
      partyBPercent: 45,
      reasons: ["첫 번째 이유", "두 번째 이유", "세 번째 이유"],
      advice: "천천히 다시 이야기해 보세요.",
      safetyLevel: "normal",
    });

    await waitFor(() => {
      expect(screen.getByText("미스터 노우")).toBeInTheDocument();
    });

    expect(screen.queryByText("임시 판정 결과")).not.toBeInTheDocument();
  });
});
