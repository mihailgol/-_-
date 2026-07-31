import { readFileSync, existsSync, readdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import vm from "node:vm";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const errors = [];

// 1. Local asset references in index.html exist
const html = readFileSync(resolve(root, "index.html"), "utf8");
const refs = [...html.matchAll(/(?:src|href)="((?!https?:\/\/|#|mailto:|tel:)[^"]+)"/g)].map((m) => m[1]);
for (const ref of refs) {
  const clean = ref.split("?")[0];
  if (!existsSync(resolve(root, clean))) {
    errors.push(`Missing asset referenced in index.html: ${clean}`);
  }
}
console.log(`[build] index.html: ${refs.length} local asset(s) checked`);

// 2. Syntax check of runtime JS files
const jsRoot = resolve(root, "js");
const jsFiles = readdirSync(jsRoot, { recursive: true })
  .filter((f) => f.endsWith(".js") && !f.endsWith("lucide.min.js"))
  .map((f) => resolve(jsRoot, f));
for (const f of jsFiles) {
  try {
    execFileSync(process.execPath, ["--check", f], { stdio: "pipe" });
    console.log(`[build] syntax OK: ${f}`);
  } catch (e) {
    errors.push(`Syntax error in ${f}: ${e.stdout?.toString() || e.message}`);
  }
}

// 3. Data integrity: EXAM_DATA structure
try {
  const dataSrc = readFileSync(resolve(root, "js/data.js"), "utf8");
  const sandbox = { window: {}, console };
  vm.runInNewContext(dataSrc, sandbox, { filename: "data.js" });
  const data = sandbox.window.EXAM_DATA;
  if (!data || typeof data !== "object") {
    errors.push("js/data.js: EXAM_DATA missing on window");
  } else {
    const subjects = data.subjects ?? {};
    const count = Object.keys(subjects).length;
    console.log(`[build] EXAM_DATA OK: ${count} subject(s)`);
    if (count === 0) errors.push("js/data.js: no subjects defined");
  }
} catch (e) {
  errors.push(`js/data.js: evaluation failed -> ${e.message}`);
}

if (errors.length) {
  console.error("\nBUILD FAILED:");
  for (const e of errors) console.error(" - " + e);
  process.exit(1);
}
console.log("\nBUILD OK");
