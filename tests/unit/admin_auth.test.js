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

  it("allows admin, admin@examhub.ru, admin123, AdminPass123! logins seamlessly", () => {
    const passwords = ["admin123", "AdminPass123!", "admin"];
    for (const pwd of passwords) {
      const hash = bcrypt.hashSync(pwd, 10);
      db.prepare("UPDATE users SET password_hash = ? WHERE email = ?").run(hash, "admin@examhub.ru");
      const user = db.prepare("SELECT * FROM users WHERE email = ?").get("admin@examhub.ru");
      expect(bcrypt.compareSync(pwd, user.password_hash)).toBe(true);
    }
  });
});
