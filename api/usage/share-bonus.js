import { grantShareBonusUse } from "../_usageLimit.js";

function parseBody(request) {
  if (!request.body) {
    return {};
  }

  if (typeof request.body === "string") {
    try {
      return JSON.parse(request.body);
    } catch {
      return {};
    }
  }

  return request.body;
}

function getAnonymousUserKey(value) {
  return typeof value === "string" && value.trim() ? value.trim() : "";
}

export default async function handler(request, response) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    response.status(405).json({ message: "method not allowed" });
    return;
  }

  const body = parseBody(request);
  const anonymousUserKey = getAnonymousUserKey(body.anonymousUserKey);

  if (!anonymousUserKey) {
    response.status(400).json({ message: "anonymousUserKey is required" });
    return;
  }

  try {
    const bonus = await (request.testGrantShareBonus ?? grantShareBonusUse)({
      anonymousUserKey,
    });

    response.status(200).json(bonus);
  } catch {
    response.status(503).json({
      message: "공유 보너스를 지급하지 못했어요.",
    });
  }
}
