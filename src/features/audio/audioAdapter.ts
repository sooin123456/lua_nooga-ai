export type TranscriptionSource =
  | { source: "recording" }
  | { source: "file"; file: File };

export type TranscriptionAdapter = {
  transcribe(input: TranscriptionSource): Promise<string>;
};

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
