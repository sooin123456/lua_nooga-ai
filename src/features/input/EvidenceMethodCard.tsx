import type { CSSProperties } from "react";
import type { InputMethodIcon } from "./inputMethods";

type EvidenceMethodCardProps = {
  title: string;
  description: string;
  icon: InputMethodIcon;
  index: number;
  onClick(): void;
};

export function EvidenceMethodCard({
  title,
  description,
  icon,
  index,
  onClick,
}: EvidenceMethodCardProps) {
  return (
    <button
      className="method-card method-card--evidence"
      style={{ "--stagger-index": index } as CSSProperties}
      type="button"
      onClick={onClick}
    >
      <span
        className={`object-icon object-icon--${icon} method-card__icon`}
        aria-hidden="true"
      />
      <span className="method-card__copy">
        <strong>{title}</strong>
        <span>{description}</span>
      </span>
    </button>
  );
}
