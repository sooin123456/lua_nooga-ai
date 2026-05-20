import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { InputHome } from "./InputHome";

describe("InputHome", () => {
  it("renders the approved input method buttons", () => {
    render(<InputHome onSelect={vi.fn()} />);

    expect(screen.getAllByRole("button")).toHaveLength(4);
    expect(screen.getByText("미스터 노우")).toBeInTheDocument();
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
  });

  it('calls onSelect with "screenshot" when the screenshot method is clicked', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();

    render(<InputHome onSelect={onSelect} />);

    await user.click(screen.getByRole("button", { name: /증거 캡처 제출하기/ }));

    expect(onSelect).toHaveBeenCalledWith("screenshot");
  });
});
