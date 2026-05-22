const maxAudioBytes = 25 * 1024 * 1024;
const supportedMimeTypes = new Set([
  "audio/mpeg",
  "audio/mp3",
  "audio/mp4",
  "audio/mpga",
  "audio/m4a",
  "audio/wav",
  "audio/webm",
  "video/mp4",
]);

function sendJson(response, statusCode, payload) {
  response.statusCode = statusCode;
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.end(JSON.stringify(payload));
}

function readJsonBody(request) {
  return new Promise((resolve, reject) => {
    let body = "";

    request.on("data", (chunk) => {
      body += chunk;

      if (body.length > maxAudioBytes * 2) {
        request.destroy();
        reject(new Error("payload too large"));
      }
    });
    request.on("end", () => {
      try {
        resolve(JSON.parse(body || "{}"));
      } catch (error) {
        reject(error);
      }
    });
    request.on("error", reject);
  });
}

function normalizeFileName(fileName, mimeType) {
  const cleanName =
    typeof fileName === "string" && fileName.trim()
      ? fileName.trim().replace(/[^\w.\-가-힣]/g, "_")
      : "recording.webm";

  if (cleanName.includes(".")) {
    return cleanName;
  }

  if (mimeType === "audio/wav") {
    return `${cleanName}.wav`;
  }

  if (mimeType === "audio/mp4" || mimeType === "video/mp4") {
    return `${cleanName}.mp4`;
  }

  return `${cleanName}.webm`;
}

export default async function handler(request, response) {
  if (request.method !== "POST") {
    sendJson(response, 405, { message: "POST 요청만 지원해요." });
    return;
  }

  if (!process.env.OPENAI_API_KEY) {
    sendJson(response, 503, {
      status: "notConfigured",
      message: "OPENAI_API_KEY가 없어 음성 인식을 실행하지 못했어요.",
    });
    return;
  }

  let payload;

  try {
    payload = await readJsonBody(request);
  } catch {
    sendJson(response, 400, { message: "음성 요청 형식이 올바르지 않아요." });
    return;
  }

  const mimeType =
    typeof payload.mimeType === "string" && payload.mimeType.trim()
      ? payload.mimeType.trim()
      : "audio/webm";
  const audioBase64 =
    typeof payload.audioBase64 === "string" ? payload.audioBase64 : "";
  const audioBuffer = Buffer.from(audioBase64, "base64");

  if (audioBuffer.length === 0 || audioBuffer.length > maxAudioBytes) {
    sendJson(response, 400, {
      message: "25MB 이하의 음성 파일만 판독할 수 있어요.",
    });
    return;
  }

  if (!supportedMimeTypes.has(mimeType)) {
    sendJson(response, 400, {
      message: "mp3, mp4, m4a, wav, webm 음성만 지원해요.",
    });
    return;
  }

  const formData = new FormData();
  formData.append(
    "file",
    new Blob([audioBuffer], { type: mimeType }),
    normalizeFileName(payload.fileName, mimeType),
  );
  formData.append(
    "model",
    process.env.OPENAI_AUDIO_TRANSCRIPTION_MODEL ?? "gpt-4o-mini-transcribe",
  );
  formData.append("language", "ko");

  try {
    const transcriptionResponse = await fetch(
      "https://api.openai.com/v1/audio/transcriptions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: formData,
      },
    );
    const transcriptionPayload = await transcriptionResponse.json();

    if (!transcriptionResponse.ok || !transcriptionPayload.text?.trim()) {
      sendJson(response, 502, {
        message: "음성 인식 서버가 응답하지 않았어요.",
      });
      return;
    }

    sendJson(response, 200, {
      status: "ready",
      text: transcriptionPayload.text,
    });
  } catch {
    sendJson(response, 502, {
      message: "음성 인식 중 문제가 생겼어요.",
    });
  }
}
