import type { CSSProperties } from "react";
import type { LucideIcon } from "lucide-react";

type EvidenceMethodCardProps = {
  title: string;
  description: string;
  Icon: LucideIcon;
  index: number;
  onClick(): void;
};

export function EvidenceMethodCard({
  title,
  description,
  Icon,
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
      <span className="method-card__icon" aria-hidden="true">
        <Icon size={22} strokeWidth={2.2} />
      </span>
      <span className="method-card__copy">
        <strong>{title}</strong>
        <span>{description}</span>
      </span>
    </button>
  );
}
