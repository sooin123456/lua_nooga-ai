export const ocrFailureMessage =
  "이미지에서 글자를 읽지 못했어요. 직접 입력해 주세요.";

export type OcrRecognizer = (file: File) => Promise<string>;

type TesseractRecognizeResult = {
  data?: {
    text?: string;
  };
};

async function defaultRecognizer(file: File): Promise<string> {
  const tesseract = await import("tesseract.js");
  const recognize = tesseract.recognize;

  if (typeof recognize !== "function") {
    throw new Error(ocrFailureMessage);
  }

  const result = (await recognize(file, "kor+eng")) as TesseractRecognizeResult;
  return result.data?.text ?? "";
}

export async function extractTextFromImage(
  file: File,
  recognizer: OcrRecognizer = defaultRecognizer,
): Promise<string> {
  if (file.size === 0) {
    throw new Error(ocrFailureMessage);
  }

  try {
    const text = await recognizer(file);

    if (text.trim().length === 0) {
      throw new Error(ocrFailureMessage);
    }

    return text;
  } catch {
    throw new Error(ocrFailureMessage);
  }
}
