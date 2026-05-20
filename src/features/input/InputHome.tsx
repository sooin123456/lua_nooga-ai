import { Link2, MessageCircle, Plus } from "lucide-react";
import { Top } from "@toss/tds-mobile";
import { EvidenceMethodCard } from "./EvidenceMethodCard";
import { inputMethods, type InputMethod } from "./inputMethods";

type InputHomeProps = {
  onSelect(method: InputMethod): void;
};

export function InputHome({ onSelect }: InputHomeProps) {
  return (
    <main className="screen screen--home">
      <Top
        title={<Top.TitleParagraph size={28}>누가 잘못 AI</Top.TitleParagraph>}
      />

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
            <strong>오늘의 싸움 판독소</strong>
            <p>대화, 캡처, 녹음 중 편한 증거부터 제출해 주세요.</p>
          </div>
        </article>

        <div className="home-dashboard__heading">
          <strong>친구들과 함께</strong>
          <p>AI 판정방을 만들어보세요.</p>
        </div>

        <div className="home-quick-actions" aria-hidden="true">
          <div>
            <span>
              <MessageCircle size={16} strokeWidth={2.4} />
            </span>
            <strong>초대</strong>
          </div>
          <div>
            <span>
              <Link2 size={16} strokeWidth={2.4} />
            </span>
            <strong>공유</strong>
          </div>
          <div>
            <span>
              <Plus size={17} strokeWidth={2.5} />
            </span>
            <strong>판정방 만들기</strong>
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

        <article className="home-status-card">
          <div>
            <strong>최근 판정</strong>
            <p>아직 저장된 판정이 없어요. 첫 사건을 접수해 보세요.</p>
          </div>
          <span>0건</span>
        </article>

        <article className="home-premium-card">
          <div>
            <strong>990원 판례 판독</strong>
            <p>서버 연결 후 유사 판례 근거를 더 자세히 보여줄 예정이에요.</p>
          </div>
          <span>준비 중</span>
        </article>

        <p className="home-privacy-note">
          현재 무료 판독은 입력 내용을 이 기기 안에서만 가볍게 분석해요.
        </p>

        <p className="home-legal-note">
          재미용 판독이며 법률 상담이나 실제 법적 판단이 아니에요.
        </p>
      </section>
    </main>
  );
}
