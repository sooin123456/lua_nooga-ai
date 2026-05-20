import { describe, expect, it, vi } from "vitest";
import { extractTextFromImage, ocrFailureMessage } from "./ocrAdapter";

describe("extractTextFromImage", () => {
  it("rejects empty files with a friendly message", async () => {
    const file = new File([], "empty.png", { type: "image/png" });

    await expect(extractTextFromImage(file)).rejects.toThrow(ocrFailureMessage);
  });

  it("uses the injected recognizer with the image file", async () => {
    const file = new File(["image bytes"], "chat.png", { type: "image/png" });
    const recognizer = vi.fn().mockResolvedValue("A: 안녕\nB: hello");

    await expect(extractTextFromImage(file, recognizer)).resolves.toBe(
      "A: 안녕\nB: hello",
    );
    expect(recognizer).toHaveBeenCalledWith(file);
  });

  it("rejects whitespace OCR output with a friendly message", async () => {
    const file = new File(["image bytes"], "blank-chat.png", {
      type: "image/png",
    });
    const recognizer = vi.fn().mockResolvedValue(" \n\t ");

    await expect(extractTextFromImage(file, recognizer)).rejects.toThrow(
      ocrFailureMessage,
    );
  });
});
