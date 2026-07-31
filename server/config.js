import "dotenv/config";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

export const config = {
  root,
  port: parseInt(process.env.PORT || "8000", 10),
  host: process.env.HOST || "0.0.0.0",
  dbPath:
    process.env.DB_PATH ||
    resolve(root, "data", process.env.NODE_ENV === "test" ? "examhub.test.db" : "examhub.db"),
  sessionTtlDays: parseInt(process.env.SESSION_TTL_DAYS || "30", 10),
  cookieName: "examhub_session",
  isProd: process.env.NODE_ENV === "production",
  isTest: process.env.NODE_ENV === "test",
};
