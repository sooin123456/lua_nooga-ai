export type TranscriptionSource =
  | { source: "recording" }
  | { source: "file"; file: File };

export type TranscriptionAdapter = {
  transcribe(input: TranscriptionSource): Promise<string>;
};

export type AudioTranscriptionResult =
  | {
      status: "ready";
      text: string;
    }
  | {
      status: "notConfigured" | "failed";
      message: string;
    };

type TranscribeAudioFileInput = {
  file: File;
  endpointUrl?: string;
  fetcher?: typeof fetch;
};

export const audioTranscriptionFailureMessage =
  "음성을 텍스트로 바꾸지 못했어요. 직접 입력해 주세요.";

export function createManualTranscriptionMessage(
  source: TranscriptionSource["source"],
  file?: File,
): string {
  if (source === "file") {
    const fileName = file?.name ?? "선택한 녹음 파일";
    return `${fileName} 내용을 들은 뒤 대화를 직접 입력해 주세요. 아직 자동 음성 변환은 지원하지 않아요.`;
  }

  return "녹음 흐름을 시작했어요. 방금 들은 대화를 직접 입력해 주세요. 아직 자동 음성 변환은 지원하지 않아요.";
}

export const manualTranscriptionAdapter: TranscriptionAdapter = {
  async transcribe(input) {
    if (input.source === "file") {
      return createManualTranscriptionMessage(input.source, input.file);
    }

    return createManualTranscriptionMessage(input.source);
  },
};

function arrayBufferToBase64(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary);
}

export async function transcribeAudioFile({
  file,
  endpointUrl = "/api/ai/transcribe-audio",
  fetcher = fetch,
}: TranscribeAudioFileInput): Promise<AudioTranscriptionResult> {
  if (file.size === 0) {
    return {
      status: "failed",
      message: audioTranscriptionFailureMessage,
    };
  }

  try {
    const response = await fetcher(endpointUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fileName: file.name || "recording.webm",
        mimeType: file.type || "audio/webm",
        audioBase64: arrayBufferToBase64(await file.arrayBuffer()),
      }),
    });
    const payload = (await response.json()) as {
      status?: AudioTranscriptionResult["status"];
      text?: string;
      message?: string;
    };

    if (response.status === 503 || payload.status === "notConfigured") {
      return {
        status: "notConfigured",
        message:
          payload.message ?? "음성 인식 서버 설정이 아직 연결되지 않았어요.",
      };
    }

    if (!response.ok || !payload.text?.trim()) {
      return {
        status: "failed",
        message: payload.message ?? audioTranscriptionFailureMessage,
      };
    }

    return {
      status: "ready",
      text: payload.text,
    };
  } catch {
    return {
      status: "failed",
      message: audioTranscriptionFailureMessage,
    };
  }
}
