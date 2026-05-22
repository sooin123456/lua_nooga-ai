import crypto from "node:crypto";

const entitlementTtlMs = 10 * 60 * 1000;

function getSecret() {
  return process.env.PRECEDENT_ENTITLEMENT_SECRET;
}

function signPayload(payload) {
  const secret = getSecret();
  if (!secret) {
    return null;
  }

  return crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("base64url");
}

export function createPrecedentEntitlement({ orderId }) {
  const expiresAt = Date.now() + entitlementTtlMs;
  const payload = JSON.stringify({ orderId, expiresAt });
  const encodedPayload = Buffer.from(payload).toString("base64url");
  const signature = signPayload(encodedPayload);

  if (!signature) {
    return null;
  }

  return `${encodedPayload}.${signature}`;
}

export function verifyPrecedentEntitlement(token) {
  if (!token || typeof token !== "string") {
    return false;
  }

  const [encodedPayload, signature] = token.split(".");
  if (!encodedPayload || !signature) {
    return false;
  }

  const expectedSignature = signPayload(encodedPayload);
  if (!expectedSignature) {
    return false;
  }

  try {
    if (
      !crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature),
      )
    ) {
      return false;
    }
  } catch {
    return false;
  }

  try {
    const payload = JSON.parse(
      Buffer.from(encodedPayload, "base64url").toString("utf8"),
    );
    return typeof payload.expiresAt === "number" && payload.expiresAt > Date.now();
  } catch {
    return false;
  }
}
