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

      <section className="method-grid" aria-label="입력 방식 선택">
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
      </section>
    </main>
  );
}
