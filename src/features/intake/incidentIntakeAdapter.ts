import type {
  IncidentIntakeInput,
  IncidentIntakeSummary,
} from "./incidentIntake";
import { createLocalIncidentSummary } from "./incidentIntake";

export type IncidentIntakeResult =
  | {
      status: "ready";
      summary: IncidentIntakeSummary;
    }
  | {
      status: "fallback";
      summary: IncidentIntakeSummary;
      message: string;
    };

type PrepareIncidentIntakeOptions = IncidentIntakeInput & {
  endpointUrl?: string;
  fetcher?: typeof fetch;
};

const fallbackMessage =
  "AI 사건 접수 서버가 불안정해서 기기 안에서 먼저 정리했어요.";

function isIncidentIntakeSummary(
  value: unknown,
): value is IncidentIntakeSummary {
  if (!value || typeof value !== "object") {
    return false;
  }

  const summary = value as Partial<IncidentIntakeSummary>;
  return (
    typeof summary.title === "string" &&
    typeof summary.partyAClaim === "string" &&
    typeof summary.partyBClaim === "string" &&
    Array.isArray(summary.issues) &&
    Array.isArray(summary.normalizedDialogue)
  );
}

export async function prepareIncidentIntake({
  endpointUrl = "/api/ai/incident-intake",
  fetcher = fetch,
  ...input
}: PrepareIncidentIntakeOptions): Promise<IncidentIntakeResult> {
  const localSummary = createLocalIncidentSummary(input);

  try {
    const response = await fetcher(endpointUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    const payload = (await response.json()) as {
      summary?: IncidentIntakeSummary;
    };

    if (!response.ok || !isIncidentIntakeSummary(payload.summary)) {
      throw new Error("invalid incident intake response");
    }

    return {
      status: "ready",
      summary: payload.summary,
    };
  } catch {
    return {
      status: "fallback",
      summary: localSummary,
      message: fallbackMessage,
    };
  }
}
