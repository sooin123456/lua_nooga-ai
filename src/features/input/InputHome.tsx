import { Top } from "@toss/tds-mobile";
import { MrKnowMascot } from "../../shared/ui/MrKnowMascot";
import { inputMethods, type InputMethod } from "./inputMethods";

type InputHomeProps = {
  onSelect(method: InputMethod): void;
};

export function InputHome({ onSelect }: InputHomeProps) {
  return (
    <main className="screen screen--home">
      <Top
        title={<Top.TitleParagraph size={28}>누가 잘못 AI</Top.TitleParagraph>}
        subtitleBottom={
          <Top.SubtitleParagraph size={15}>
            미스 노짱이 판독해드립니다
          </Top.SubtitleParagraph>
        }
      />

      <section className="hero-panel" aria-label="누가 잘못 AI 소개">
        <MrKnowMascot />
        <div>
          <p className="eyebrow">싸움 판독 자체는 무료예요</p>
          <h1>990원 내면 판례까지 뒤져드립니다</h1>
          <p className="hero-panel__note">
            무료로는 가볍게, 유료로는 더 그럴듯하게.
          </p>
        </div>
      </section>

      <section className="method-grid" aria-label="입력 방식 선택">
        {inputMethods.map(({ id, title, description, Icon }) => (
          <button
            className="method-card"
            key={id}
            type="button"
            onClick={() => onSelect(id)}
          >
            <span className="method-card__icon" aria-hidden="true">
              <Icon size={22} strokeWidth={2.2} />
            </span>
            <span className="method-card__copy">
              <strong>{title}</strong>
              <span>{description}</span>
            </span>
          </button>
        ))}
      </section>
    </main>
  );
}
