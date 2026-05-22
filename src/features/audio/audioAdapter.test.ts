import { describe, expect, it, vi } from "vitest";
import {
  audioTranscriptionFailureMessage,
  createManualTranscriptionMessage,
  manualTranscriptionAdapter,
  transcribeAudioFile,
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

describe("transcribeAudioFile", () => {
  it("sends an audio file to the transcription endpoint", async () => {
    const fetcher = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ status: "ready", text: "A: 미안해\nB: 괜찮아" }),
    });
    const file = new File(["audio bytes"], "fight.webm", {
      type: "audio/webm",
    });

    await expect(
      transcribeAudioFile({
        file,
        endpointUrl: "/api/test-transcribe",
        fetcher: fetcher as never,
      }),
    ).resolves.toEqual({
      status: "ready",
      text: "A: 미안해\nB: 괜찮아",
    });
    expect(fetcher).toHaveBeenCalledWith("/api/test-transcribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: expect.stringContaining("fight.webm"),
    });
  });

  it("returns a friendly failure for empty audio", async () => {
    const file = new File([], "empty.webm", { type: "audio/webm" });

    await expect(transcribeAudioFile({ file })).resolves.toEqual({
      status: "failed",
      message: audioTranscriptionFailureMessage,
    });
  });
});
