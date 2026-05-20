import { LuaAiMascot } from "../../shared/ui/LuaAiMascot";

export function MotionHomeHero() {
  return (
    <section className="home-hero-red" aria-label="누가 잘못 AI 소개">
      <div className="home-hero-red__mascot">
        <LuaAiMascot variant="hero" />
      </div>

      <div className="home-hero-red__copy">
        <p className="home-hero-red__eyebrow">무료 싸움 판독</p>
        <h1>사건을 접수해 주세요</h1>
        <p>
          대화, 캡처, 녹음을 증거로 제출하면 루아 AI가 판독해드려요.
        </p>
      </div>
    </section>
  );
}
