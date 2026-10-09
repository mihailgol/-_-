import { Router } from "express";
import { writeFileSync, mkdirSync } from "node:fs";
import { resolve, join } from "node:path";
import { config } from "../config.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

const UPLOADS_DIR = resolve(config.root, "uploads");
try {
  mkdirSync(UPLOADS_DIR, { recursive: true });
} catch {
  void 0;
}

router.post("/", requireAuth, (req, res) => {
  try {
    const { image } = req.body || {};
    if (!image || typeof image !== "string") {
      return res.status(400).json({ error: "Передайте файл или изображение" });
    }

    let extension = "jpg";
    let base64Data = image;

    if (image.startsWith("data:")) {
      const matches = image.match(/^data:image\/([a-zA-Z0-9+-]+);base64,(.+)$/);
      if (matches) {
        extension = matches[1] === "jpeg" ? "jpg" : matches[1];
        base64Data = matches[2];
      } else {
        return res.status(400).json({ error: "Неверный формат изображения Data URL" });
      }
    }

    const ALLOWED_EXTS = new Set(["jpg", "jpeg", "png", "webp", "gif"]);
    extension = extension.toLowerCase();
    if (!ALLOWED_EXTS.has(extension)) {
      extension = "jpg";
    }

    const buffer = Buffer.from(base64Data, "base64");
    if (buffer.length > 8 * 1024 * 1024) {
      return res.status(400).json({ error: "Размер файла не должен превышать 8 МБ" });
    }

    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 10000);
    const safeName = `work_${timestamp}_${random}.${extension}`;
    const filePath = join(UPLOADS_DIR, safeName);

    writeFileSync(filePath, buffer);

    const publicUrl = `/uploads/${safeName}`;
    res.json({ success: true, url: publicUrl });
  } catch (err) {
    console.error("Error in POST /api/upload:", err);
    res.status(500).json({ error: "Ошибка при сохранении изображения" });
  }
});

export default router;
