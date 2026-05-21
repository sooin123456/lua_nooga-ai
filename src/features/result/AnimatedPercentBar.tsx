import type { CSSProperties } from "react";

type AnimatedPercentBarProps = {
  partyAPercent: number;
  partyBPercent: number;
};

export function AnimatedPercentBar({
  partyAPercent,
  partyBPercent,
}: AnimatedPercentBarProps) {
  return (
    <div
      className="animated-percent-bar"
      aria-label={`A ${partyAPercent}%, B ${partyBPercent}%`}
      style={
        {
          "--party-a": `${partyAPercent}%`,
          "--party-b": `${partyBPercent}%`,
        } as CSSProperties
      }
    >
      <div className="animated-percent-bar__labels" aria-hidden="true">
        <strong>A {partyAPercent}%</strong>
        <strong>B {partyBPercent}%</strong>
      </div>
      <div className="animated-percent-bar__track" aria-hidden="true">
        <span className="animated-percent-bar__fill animated-percent-bar__fill--a" />
        <span className="animated-percent-bar__fill animated-percent-bar__fill--b" />
      </div>
      <div
        className="animated-percent-bar__court-effect"
        aria-label="판례를 두드리는 망치 판정 이펙트"
        role="img"
      >
        <span className="animated-percent-bar__case-card animated-percent-bar__case-card--a">
          판례
        </span>
        <span className="animated-percent-bar__gavel">
          <span />
        </span>
        <span className="animated-percent-bar__impact" />
        <span className="animated-percent-bar__case-card animated-percent-bar__case-card--b">
          판결
        </span>
      </div>
    </div>
  );
}
