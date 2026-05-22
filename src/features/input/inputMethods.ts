export type InputMethod = "text" | "screenshot" | "record" | "audio-file";
export type InputMethodIcon = "paste" | "camera" | "mic" | "upload";

type InputMethodOption = {
  id: InputMethod;
  title: string;
  description: string;
  icon: InputMethodIcon;
};

export const inputMethods: InputMethodOption[] = [
  {
    id: "text",
    title: "카톡 싸움 붙여넣기",
    description: "대화 내용을 붙여넣고 바로 판독해요.",
    icon: "paste",
  },
  {
    id: "screenshot",
    title: "증거 캡처 제출하기",
    description: "캡처 속 글자를 자동으로 읽어볼게요.",
    icon: "camera",
  },
  {
    id: "record",
    title: "현장 녹음 시작",
    description: "방금 벌어진 말싸움을 기록해요.",
    icon: "mic",
  },
  {
    id: "audio-file",
    title: "녹음 파일 불러오기",
    description: "이미 저장한 음성 증거를 가져와요.",
    icon: "upload",
  },
];
