import { readFile } from "node:fs/promises";
import path from "node:path";
import { searchPrecedents } from "../../server/precedent-api/src/search.mjs";
import { verifyPrecedentEntitlement } from "../_entitlement.js";

let cachedPrecedents;

async function getPrecedents() {
  if (cachedPrecedents) {
    return cachedPrecedents;
  }

  const filePath = path.join(process.cwd(), "api/precedents/precedents.json");
  cachedPrecedents = JSON.parse(await readFile(filePath, "utf8"));
  return cachedPrecedents;
}

function parseText(request) {
  if (!request.body) {
    return "";
  }

  if (typeof request.body === "string") {
    try {
      const parsed = JSON.parse(request.body);
      return typeof parsed.text === "string" ? parsed.text : "";
    } catch {
      return "";
    }
  }

  return typeof request.body.text === "string" ? request.body.text : "";
}

export default async function handler(request, response) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    response.status(405).json({ error: "method not allowed" });
    return;
  }

  const entitlementToken =
    request.headers["x-precedent-entitlement"] ??
    request.headers["X-Precedent-Entitlement"];
  if (!verifyPrecedentEntitlement(entitlementToken)) {
    response.status(402).json({ error: "paid entitlement is required" });
    return;
  }

  const text = parseText(request).trim();
  if (!text) {
    response.status(400).json({ error: "text is required" });
    return;
  }

  if (text.length > 4000) {
    response.status(413).json({ error: "text is too long" });
    return;
  }

  response.status(200).json({
    precedents: searchPrecedents({
      precedents: await getPrecedents(),
      text,
    }),
  });
}
