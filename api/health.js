import { readFile } from "node:fs/promises";
import path from "node:path";

let cachedCount;

async function getPrecedentCount() {
  if (cachedCount !== undefined) {
    return cachedCount;
  }

  const filePath = path.join(process.cwd(), "api/precedents/precedents.json");
  const precedents = JSON.parse(await readFile(filePath, "utf8"));
  cachedCount = precedents.length;
  return cachedCount;
}

export default async function handler(_request, response) {
  response.status(200).json({
    ok: true,
    precedents: await getPrecedentCount(),
  });
}
