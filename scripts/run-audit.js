import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

process.env.UX_AUDIT = "1";

const isWindows = process.platform === "win32";
const npxCmd = isWindows ? "npx.cmd" : "npx";

console.log("🤖 Запуск интеллектуального автономного UX-аудитора ExamHub...");
console.log("📹 Запись видео сессий, трейсов и Zero-Error мониторинг активированы.\n");

const child = spawn(
  npxCmd,
  ["playwright", "test", "tests/e2e/ux_bot_audit.spec.js"],
  {
    cwd: rootDir,
    stdio: "inherit",
    shell: true,
    env: { ...process.env, UX_AUDIT: "1" },
  }
);

child.on("close", (code) => {
  if (code === 0) {
    console.log("\n✅ UX-аудит успешно завершен без ошибок консоли и сетевых сбоев!");
    console.log("📊 Интерактивный визуальный отчет сформирован в папке audit-report/");
    console.log("💡 Для просмотра отчета выполните: npm run audit:report\n");
  } else {
    console.error(`\n❌ UX-аудит обнаружил ошибки (код выхода ${code}).`);
    console.error("📊 Подробный отчет с видео и трейсами доступен в папке audit-report/\n");
  }
  process.exit(code || 0);
});
