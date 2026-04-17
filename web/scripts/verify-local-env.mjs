import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const envPath = join(root, ".env.local");

const required = [
  "NEXT_PUBLIC_AZURE_AD_CLIENT_ID",
  "NEXT_PUBLIC_AZURE_AD_REDIRECT_URI",
  "SHAREPOINT_SITE_ID",
  "SHAREPOINT_LIST_DAILY_REPORTS_ID",
  "SHAREPOINT_LIST_WORK_INSTRUCTIONS_ID",
];

function parseEnvFile(text) {
  const map = new Map();
  for (const line of text.split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq <= 0) continue;
    const key = t.slice(0, eq).trim();
    let val = t.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    map.set(key, val);
  }
  return map;
}

if (!existsSync(envPath)) {
  console.error("[verify:env] .env.local がありません。先に npm run bootstrap:local を実行してください。");
  process.exit(1);
}

let text;
try {
  text = readFileSync(envPath, "utf8");
} catch {
  console.error("[verify:env] .env.local を読めませんでした。");
  process.exit(1);
}

const map = parseEnvFile(text);
let bad = 0;

for (const key of required) {
  const v = map.get(key);
  if (v == null || String(v).trim() === "") {
    console.log(`[verify:env] 未設定: ${key}`);
    bad++;
  }
}

if (bad === 0) {
  console.log("[verify:env] 必須項目はすべて空ではありません（値の正しさまでは未検証）。");
  process.exit(0);
}

console.log("");
console.log(`[verify:env] 上記 ${bad} 件を .env.local に設定してから npm run dev してください。`);
process.exit(1);
