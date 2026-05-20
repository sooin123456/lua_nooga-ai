import { MotionHomeHero } from "./MotionHomeHero";

type IntroScreenProps = {
  onStart(): void;
};

export function IntroScreen({ onStart }: IntroScreenProps) {
  return (
    <main className="screen screen--intro">
      <div className="intro-title">
        <p>루아 AI가 판독해드립니다</p>
        <h1>누가 잘못 AI</h1>
      </div>

      <MotionHomeHero />

      <button className="intro-start-button" type="button" onClick={onStart}>
        판정 시작하기
      </button>
    </main>
  );
}
