import { describe, it, expect, beforeEach } from "vitest";
import bcrypt from "bcryptjs";
import { db, initDb, seedAdminUser } from "../../server/db.js";

describe("Admin fixed login seeding", () => {
  beforeEach(() => {
    initDb();
  });

  it("seeds admin@examhub.ru with password admin123 synchronously", () => {
    seedAdminUser();
    const admin = db.prepare("SELECT * FROM users WHERE email = ?").get("admin@examhub.ru");
    expect(admin).toBeDefined();
    expect(admin.role).toBe("ADMIN");
    expect(admin.status).toBe("active");
    expect(bcrypt.compareSync("admin123", admin.password_hash)).toBe(true);
  });
});
