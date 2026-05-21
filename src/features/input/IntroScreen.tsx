import { MotionHomeHero } from "./MotionHomeHero";

type IntroScreenProps = {
  onStart(): void;
};

export function IntroScreen({ onStart }: IntroScreenProps) {
  return (
    <main className="screen screen--intro">
      <div className="intro-title">
        <h1>루아 법정에 오신 걸 환영해요</h1>
        <p>증거를 제출하세요. 누가 선 넘었는지 루아가 판독해드릴게요.</p>
      </div>

      <MotionHomeHero />

      <button className="intro-start-button" type="button" onClick={onStart}>
        판정 시작하기
      </button>
    </main>
  );
}
