import express from "express";
import cookieParser from "cookie-parser";
import { networkInterfaces } from "node:os";
import { config } from "./config.js";
import { initDb, resetDb } from "./db.js";
import authRoutes from "./routes/auth.js";
import catalogRoutes from "./routes/catalog.js";
import progressRoutes from "./routes/progress.js";
import premiumRoutes from "./routes/premium.js";
import aiRoutes from "./routes/ai.js";
import mockExamRoutes from "./routes/mock-exam.js";
import teacherRoutes from "./routes/teacher.js";
import adminRoutes from "./routes/admin.js";
import supportRoutes from "./routes/support.js";

const app = express();

app.disable("x-powered-by");
app.use(express.json({ limit: "512kb" }));
app.use(cookieParser());

app.get("/api/health", (_req, res) => res.json({ ok: true, version: "2.0.0" }));
app.use("/api/auth", authRoutes);
app.use("/api/catalog", catalogRoutes);
app.use("/api/progress", progressRoutes);
app.use("/api/premium", premiumRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/mock-exams", mockExamRoutes);
app.use("/api/teacher", teacherRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/support", supportRoutes);
app.use("/api/site", catalogRoutes);


const FRONTEND_ASSETS = ["/js", "/css", "/index.html"];

app.use((req, res, next) => {
  const pathname = req.path;
  const isFrontend =
    pathname === "/" ||
    FRONTEND_ASSETS.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
  if (!isFrontend) {
    res.status(404).end();
    return;
  }
  next();
});

app.use(express.static(config.root));

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: "Внутренняя ошибка сервера" });
});

if (config.isTest) {
  resetDb();
}
initDb();

const isMain = Boolean(
  process.argv[1] && (process.argv[1].endsWith("index.js") || process.argv[1].endsWith("index.mjs"))
);

if (isMain) {
  app.listen(config.port, config.host, () => {
    console.log(`\n🚀 ExamHub server running:`);
    console.log(`   - Local:   http://localhost:${config.port}`);

    try {
      const nets = networkInterfaces();
      for (const name of Object.keys(nets)) {
        for (const net of nets[name]) {
          if (net.family === "IPv4" && !net.internal) {
            console.log(`   - Network: http://${net.address}:${config.port} (открыть с телефона/планшета в Wi-Fi)`);
          }
        }
      }
    } catch {
      void 0;
    }
    console.log("");
  });
}

export { app };
