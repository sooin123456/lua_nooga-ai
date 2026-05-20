import { Top } from "@toss/tds-mobile";
import { EvidenceMethodCard } from "./EvidenceMethodCard";
import { inputMethods, type InputMethod } from "./inputMethods";
import { MotionHomeHero } from "./MotionHomeHero";

type InputHomeProps = {
  onSelect(method: InputMethod): void;
};

export function InputHome({ onSelect }: InputHomeProps) {
  return (
    <main className="screen screen--home">
      <Top
        title={<Top.TitleParagraph size={28}>누가 잘못 AI</Top.TitleParagraph>}
      />

      <MotionHomeHero />

      <section className="home-dashboard" aria-label="입력 방식 선택">
        <article className="home-profile-card">
          <img
            src="/lua-ai-judge.png"
            width={52}
            height={52}
            alt=""
            aria-hidden="true"
          />
          <div>
            <strong>루아 AI</strong>
            <p>안녕하세요! 오늘의 싸움 기록을 판독해볼게요.</p>
          </div>
        </article>

        <article className="home-tip-card">
          <span aria-hidden="true">⚖</span>
          <div>
            <strong>내 마음대로 바꾸는 AI 판정소</strong>
            <p>대화, 캡처, 녹음 중 편한 증거부터 제출해 주세요.</p>
          </div>
        </article>

        <div className="home-dashboard__heading">
          <strong>친구들과 함께</strong>
          <p>AI 판정방을 만들어보세요.</p>
        </div>

        <div className="home-quick-actions" aria-hidden="true">
          <div>
            <span>카톡</span>
            <strong>초대</strong>
          </div>
          <div>
            <span>링크</span>
            <strong>공유</strong>
          </div>
          <div>
            <span>ID</span>
            <strong>추가</strong>
          </div>
        </div>

        <div className="method-grid">
          {inputMethods.map(({ id, title, description, Icon }, index) => (
            <EvidenceMethodCard
              Icon={Icon}
              description={description}
              key={id}
              index={index}
              title={title}
              onClick={() => onSelect(id)}
            />
          ))}
        </div>
      </section>
    </main>
  );
}
