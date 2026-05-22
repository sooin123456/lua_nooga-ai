import { readFile } from "node:fs/promises";
import path from "node:path";
import cors from "@fastify/cors";
import Fastify from "fastify";
import { searchPrecedents } from "./search.mjs";

const indexPath =
  process.env.PRECEDENT_INDEX_PATH ??
  path.resolve(process.cwd(), "data/precedents.json");
const port = Number(process.env.PORT ?? 8787);
const allowedOrigin = process.env.ALLOWED_ORIGIN ?? true;

const app = Fastify({ logger: true });
const precedents = JSON.parse(await readFile(indexPath, "utf8"));

await app.register(cors, {
  origin: allowedOrigin,
});

app.get("/health", async () => ({
  ok: true,
  precedents: precedents.length,
}));

app.post("/precedents/search", async (request, reply) => {
  const body = request.body;

  if (!body || typeof body.text !== "string" || body.text.trim().length === 0) {
    return reply.code(400).send({
      error: "text is required",
    });
  }

  return {
    precedents: searchPrecedents({
      precedents,
      text: body.text,
    }),
  };
});

await app.listen({ host: "0.0.0.0", port });
