import { readdirSync, readFileSync, statSync } from "node:fs";
import { extname, join, relative } from "node:path";

const strict = process.argv.includes("--strict");
const roots = process.argv
  .slice(2)
  .filter((arg) => !arg.startsWith("--"));

const scanRoots = roots.length > 0 ? roots : ["src"];
const allowedExtensions = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".css", ".md", ".html"]);
const ignoredDirectories = new Set(["node_modules", ".next", "dist", "out"]);
const ignoredFiles = new Set([
  "scripts/check-quality.mjs",
  "supabase/README.md"
]);

const rules = [
  {
    id: "branding",
    description: "Marca fixa de Le Blanc encontrada fora do tenant dinâmico",
    regex: /\b(?:Le Blanc|LEBLANC|LeBlanc|LeBlanc-POS-App)\b/g
  },
  {
    id: "mojibake",
    description: "Possível texto degradado por encoding/mojibake",
    regex: /(Ã.|Â.|â€œ|â€|â€”|ðŸ|�)/g
  },
  {
    id: "copy-review",
    description: "Possível grafia PT-BR degradada em texto visível",
    regex: /\b(?:Gestao|Relatorios|Configuracoes|Observacoes|Nao definido|Nao\b)\b/g
  }
];

function walk(directory, files = []) {
  for (const entry of readdirSync(directory)) {
    if (ignoredDirectories.has(entry)) {
      continue;
    }

    const fullPath = join(directory, entry);
    const stats = statSync(fullPath);

    if (stats.isDirectory()) {
      walk(fullPath, files);
      continue;
    }

    if (allowedExtensions.has(extname(fullPath))) {
      files.push(fullPath);
    }
  }

  return files;
}

function getLineAndColumn(content, index) {
  const before = content.slice(0, index);
  const lines = before.split(/\r?\n/);
  const line = lines.length;
  const column = lines.at(-1).length + 1;
  return { line, column };
}

function formatExcerpt(lineText) {
  return lineText.trim().replace(/\s+/g, " ").slice(0, 160);
}

const issues = [];

for (const root of scanRoots) {
  for (const file of walk(root)) {
    const relativePath = relative(process.cwd(), file).replace(/\\/g, "/");
    if (ignoredFiles.has(relativePath)) {
      continue;
    }

    const content = readFileSync(file, "utf8");

    for (const rule of rules) {
      for (const match of content.matchAll(rule.regex)) {
        const index = match.index ?? 0;
        const { line, column } = getLineAndColumn(content, index);
        const lineText = content.split(/\r?\n/)[line - 1] ?? "";

        issues.push({
          rule: rule.id,
          description: rule.description,
          file: relative(process.cwd(), file),
          line,
          column,
          match: match[0],
          excerpt: formatExcerpt(lineText)
        });
      }
    }
  }
}

if (issues.length === 0) {
  console.log("Nenhum problema de branding/ortografia/encoding encontrado nos diretórios analisados.");
  process.exit(0);
}

console.log(`Foram encontrados ${issues.length} problemas potenciais.`);
console.log("");

for (const issue of issues) {
  console.log(`[${issue.rule}] ${issue.file}:${issue.line}:${issue.column}`);
  console.log(`  ocorrência: ${issue.match}`);
  console.log(`  contexto: ${issue.excerpt}`);
}

if (strict) {
  process.exit(1);
}

console.log("");
console.log("Relatório em modo audit-only. Use --strict para falhar o comando quando houver ocorrências.");
