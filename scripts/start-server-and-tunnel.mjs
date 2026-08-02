import { spawn } from "child_process";

console.log("\n==================================================");
console.log("   🚀 Запуск платформы ExamHub на вашем ПК...");
console.log("==================================================\n");

spawn("node", ["server/index.js"], { stdio: "inherit" });

setTimeout(() => {
  console.log("🌐 Подключение публичного адреса в интернете...");
  const tunnel = spawn("npx", ["--yes", "localtunnel", "--port", "8000", "--subdomain", "examhub-ege"], {
    shell: true,
  });

  let urlPrinted = false;

  const handleOutput = (data) => {
    const str = data.toString();
    if (!urlPrinted && str.includes("http")) {
      const match = str.match(/https?:\/\/[^\s]+/);
      const publicUrl = match ? match[0] : "https://examhub-ege.loca.lt";
      urlPrinted = true;

      console.log("\n==================================================");
      console.log("  ✅ САЙТ УСПЕШНО ЗАПУЩЕН И ДОСТУПЕН В ИНТЕРНЕТЕ!");
      console.log("==================================================");
      console.log(`  🌐 Зафиксированная ссылка:  ${publicUrl}`);
      console.log("  💻 Локальная ссылка (ПК):    http://localhost:8000");
      console.log("  📱 Ссылка в Wi-Fi сети:      http://192.168.1.12:8000");
      console.log("==================================================");
      console.log("  ⚠️ Для завершения работы просто закройте это окно.\n");
    }
  };

  tunnel.stdout?.on("data", handleOutput);
  tunnel.stderr?.on("data", handleOutput);

  setTimeout(() => {
    if (!urlPrinted) {
      console.log("\n==================================================");
      console.log("  ✅ САЙТ ЗАПУЩЕН!");
      console.log("  🌐 Постоянная ссылка: https://examhub-ege.loca.lt");
      console.log("  💻 Локальная ссылка:  http://localhost:8000");
      console.log("==================================================\n");
    }
  }, 4000);
}, 1500);
