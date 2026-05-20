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
        title={<Top.TitleParagraph size={28}>미스터 노우</Top.TitleParagraph>}
        subtitleBottom={
          <Top.SubtitleParagraph size={15}>
            싸움의 증거를 내면, 귀여운 심판이 퍼센티지로 판정해요.
          </Top.SubtitleParagraph>
        }
      />

      <section className="hero-panel" aria-label="미스터 노우 소개">
        <MrKnowMascot />
        <div>
          <p className="eyebrow">오늘의 판정 대기 중</p>
          <h1>누가 얼마나 선 넘었는지 볼까요?</h1>
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
