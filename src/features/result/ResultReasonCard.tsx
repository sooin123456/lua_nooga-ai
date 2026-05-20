import type { CSSProperties } from "react";

type ResultReasonCardProps = {
  reason: string;
  index: number;
};

export function ResultReasonCard({ reason, index }: ResultReasonCardProps) {
  return (
    <li
      className="result-reason-card"
      style={{ "--stagger-index": index } as CSSProperties}
    >
      <strong>증거 {index + 1}</strong>
      <span>{reason}</span>
    </li>
  );
}
