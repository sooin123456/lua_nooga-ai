import { createPrecedentEntitlement } from "../_entitlement.js";

function parseOrderId(request) {
  if (!request.body) {
    return "";
  }

  if (typeof request.body === "string") {
    try {
      const parsed = JSON.parse(request.body);
      return typeof parsed.orderId === "string" ? parsed.orderId : "";
    } catch {
      return "";
    }
  }

  return typeof request.body.orderId === "string" ? request.body.orderId : "";
}

export default async function handler(request, response) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    response.status(405).json({ error: "method not allowed" });
    return;
  }

  const orderId = parseOrderId(request).trim();
  if (!orderId) {
    response.status(400).json({ error: "orderId is required" });
    return;
  }

  const entitlementToken = createPrecedentEntitlement({ orderId });
  if (!entitlementToken) {
    response.status(503).json({
      error: "entitlement secret is not configured",
    });
    return;
  }

  response.status(200).json({ entitlementToken });
}
