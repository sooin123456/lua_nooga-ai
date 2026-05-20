import { LuaAiMascot } from "../../shared/ui/LuaAiMascot";

export function MotionHomeHero() {
  return (
    <section className="home-hero-red" aria-label="누가 잘못 AI 소개">
      <div className="home-hero-red__graphic" aria-hidden="true">
        <span className="home-hero-red__number home-hero-red__number--ai">
          AI
        </span>
        <span className="home-hero-red__number home-hero-red__number--score">
          62
        </span>
        <span className="home-hero-red__number home-hero-red__number--price">
          990
        </span>
      </div>

      <div className="home-hero-red__mascot">
        <LuaAiMascot variant="hero" />
      </div>

      <div className="home-hero-red__quick-cards" aria-hidden="true">
        <div className="home-hero-red__quick-card">
          <span>무료</span>
          <strong>싸움 판독</strong>
        </div>
        <div className="home-hero-red__quick-card home-hero-red__quick-card--dark">
          <span>AI 판례</span>
          <strong>990원</strong>
        </div>
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
