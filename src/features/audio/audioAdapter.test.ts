import { describe, expect, it } from "vitest";
import {
  createManualTranscriptionMessage,
  manualTranscriptionAdapter,
} from "./audioAdapter";

describe("manualTranscriptionAdapter", () => {
  it("returns recording helper text for recording sources", async () => {
    await expect(
      manualTranscriptionAdapter.transcribe({ source: "recording" }),
    ).resolves.toContain("녹음");
  });

  it("returns helper text with the selected audio file name", async () => {
    const file = new File(["audio bytes"], "argument.m4a", {
      type: "audio/mp4",
    });

    await expect(
      manualTranscriptionAdapter.transcribe({ source: "file", file }),
    ).resolves.toContain("argument.m4a");
  });
});

describe("createManualTranscriptionMessage", () => {
  it("mentions direct entry for recording fallback", () => {
    expect(createManualTranscriptionMessage("recording")).toContain("직접");
  });
});
