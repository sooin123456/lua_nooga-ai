import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";

const repoDir =
  process.env.PRECEDENT_REPO_DIR ??
  path.resolve(process.cwd(), "../../.data/precedent-kr");
const outputPath =
  process.env.PRECEDENT_INDEX_PATH ??
  path.resolve(process.cwd(), "data/precedents.json");

const maxBodyChars = Number(process.env.PRECEDENT_MAX_BODY_CHARS ?? 2400);
const maxRecords = Number(process.env.PRECEDENT_MAX_RECORDS ?? 20000);

async function* walkMarkdownFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const entryPath = path.join(dir, entry.name);

    if (entry.name === ".git") {
      continue;
    }

    if (entry.isDirectory()) {
      yield* walkMarkdownFiles(entryPath);
      continue;
    }

    if (entry.isFile() && entry.name.endsWith(".md")) {
      yield entryPath;
    }
  }
}

function compactContent(content) {
  return content
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/[#>*_\-[\]()`]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxBodyChars);
}

const precedents = [];

for await (const filePath of walkMarkdownFiles(repoDir)) {
  if (precedents.length >= maxRecords) {
    break;
  }

  const raw = await readFile(filePath, "utf8");
  const parsed = matter(raw);
  const data = parsed.data;

  precedents.push({
    title: String(data["사건명"] ?? path.basename(filePath, ".md")),
    court: String(data["법원명"] ?? "미분류"),
    decidedAt: String(data["선고일자"] ?? ""),
    sourceUrl: typeof data["출처"] === "string" ? data["출처"] : undefined,
    summary: compactContent(parsed.content),
  });
}

await mkdir(path.dirname(outputPath), { recursive: true });
await writeFile(outputPath, JSON.stringify(precedents, null, 2));

console.log(
  `Indexed ${precedents.length} precedents to ${outputPath} (maxRecords=${maxRecords}, maxBodyChars=${maxBodyChars})`,
);
