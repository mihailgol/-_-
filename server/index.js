import express from "express";
import cookieParser from "cookie-parser";
import { config } from "./config.js";
import { initDb, resetDb } from "./db.js";
import authRoutes from "./routes/auth.js";
import catalogRoutes from "./routes/catalog.js";
import progressRoutes from "./routes/progress.js";
import premiumRoutes from "./routes/premium.js";

const app = express();

app.disable("x-powered-by");
app.use(express.json({ limit: "512kb" }));
app.use(cookieParser());

app.get("/api/health", (_req, res) => res.json({ ok: true, version: "2.0.0" }));
app.use("/api/auth", authRoutes);
app.use("/api/catalog", catalogRoutes);
app.use("/api/progress", progressRoutes);
app.use("/api/premium", premiumRoutes);

app.use(express.static(config.root));

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: "Внутренняя ошибка сервера" });
});

if (config.isTest) {
  resetDb();
}
initDb();

app.listen(config.port, config.host, () => {
  console.log(`ExamHub server: http://localhost:${config.port} (${config.isProd ? "production" : "development"})`);
});
