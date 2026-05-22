import { useRef, useState } from "react";

type RecordingControlProps = {
  disabled?: boolean;
  onAudioReady(file: File): void | Promise<void>;
};

export function RecordingControl({ disabled, onAudioReady }: RecordingControlProps) {
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [status, setStatus] = useState("현장 녹음을 시작하면 끝난 뒤 자동으로 텍스트를 채워요.");

  const stopTracks = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  };

  const stopRecording = () => {
    recorderRef.current?.stop();
  };

  const startRecording = async () => {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setStatus("이 브라우저에서는 녹음을 지원하지 않아요. 녹음 파일을 불러와 주세요.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      streamRef.current = stream;
      chunksRef.current = [];
      recorderRef.current = recorder;

      recorder.addEventListener("dataavailable", (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      });
      recorder.addEventListener("stop", () => {
        const blob = new Blob(chunksRef.current, {
          type: recorder.mimeType || "audio/webm",
        });
        const file = new File([blob], `lua-recording-${Date.now()}.webm`, {
          type: blob.type || "audio/webm",
        });

        stopTracks();
        setIsRecording(false);
        setStatus("녹음을 텍스트로 바꾸는 중이에요.");
        void onAudioReady(file);
      });

      recorder.start();
      setIsRecording(true);
      setStatus("녹음 중이에요. 다 말했으면 종료를 눌러주세요.");
    } catch {
      setStatus("마이크 권한을 받지 못했어요. 녹음 파일을 불러와 주세요.");
      stopTracks();
      setIsRecording(false);
    }
  };

  return (
    <div className="media-control">
      <button
        className="media-button"
        type="button"
        disabled={disabled}
        onClick={isRecording ? stopRecording : () => void startRecording()}
      >
        {isRecording ? "녹음 종료하고 텍스트 변환" : "녹음 시작하기"}
      </button>
      <p className="media-control__status">{status}</p>
    </div>
  );
}
