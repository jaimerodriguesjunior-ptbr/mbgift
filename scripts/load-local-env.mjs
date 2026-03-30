import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

function parseEnvFile(content) {
  const lines = content.split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex <= 0) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const rawValue = trimmed.slice(separatorIndex + 1).trim();
    const value =
      (rawValue.startsWith('"') && rawValue.endsWith('"')) ||
      (rawValue.startsWith("'") && rawValue.endsWith("'"))
        ? rawValue.slice(1, -1)
        : rawValue;

    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

export function loadLocalEnv() {
  const candidates = [".env.local", ".env"];

  for (const candidate of candidates) {
    const filePath = resolve(process.cwd(), candidate);

    if (!existsSync(filePath)) {
      continue;
    }

    parseEnvFile(readFileSync(filePath, "utf8"));
  }
}
