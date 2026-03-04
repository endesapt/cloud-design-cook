import fs from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();
const docsDir = path.join(repoRoot, "docs");

function walk(dir: string): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...walk(fullPath));
      continue;
    }

    if (entry.isFile() && entry.name.endsWith(".md")) {
      files.push(fullPath);
    }
  }

  return files;
}

function fail(message: string): never {
  console.error(`docs:check failed - ${message}`);
  process.exit(1);
}

if (!fs.existsSync(docsDir)) {
  fail("docs directory is missing");
}

const markdownFiles = walk(docsDir);
if (markdownFiles.length === 0) {
  fail("no markdown files found in docs/");
}

const requiredCoreFiles = [
  "docs/index.md",
  "docs/architecture.md",
  "docs/api.md",
  "docs/quality.md",
  "docs/data-model.md",
  "docs/invariants.md",
  "docs/ui-guidelines.md",
];

for (const file of requiredCoreFiles) {
  const full = path.join(repoRoot, file);
  if (!fs.existsSync(full)) {
    fail(`required file missing: ${file}`);
  }
}

for (const file of markdownFiles) {
  const relative = path.relative(repoRoot, file);
  const content = fs.readFileSync(file, "utf8");
  const head = content.split("\n").slice(0, 25).join("\n");

  if (!head.includes("Status:")) {
    fail(`${relative} is missing Status metadata`);
  }
  if (!head.includes("Owner:")) {
    fail(`${relative} is missing Owner metadata`);
  }
  if (!head.includes("Last Verified:")) {
    fail(`${relative} is missing Last Verified metadata`);
  }

  const linkRegex = /\[[^\]]+\]\(([^)]+)\)/g;
  let match: RegExpExecArray | null;
  while ((match = linkRegex.exec(content)) !== null) {
    const target = match[1];

    if (target.startsWith("http://") || target.startsWith("https://") || target.startsWith("#")) {
      continue;
    }

    const resolved = path.resolve(path.dirname(file), target);
    if (!fs.existsSync(resolved)) {
      fail(`${relative} has broken link: ${target}`);
    }
  }
}

console.log(`docs:check passed (${markdownFiles.length} markdown files)`);
