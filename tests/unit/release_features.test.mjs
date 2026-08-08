import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { app } from "../../server/index.js";

describe("Release Features Verification (Profile & Geography OGE)", () => {
  let server;
  let baseUrl;

  beforeAll(async () => {
    await new Promise((resolve) => {
      server = app.listen(0, () => {
        const port = server.address().port;
        baseUrl = `http://localhost:${port}`;
        resolve();
      });
    });
  });

  afterAll(async () => {
    if (server) server.close();
  });

  it("should list geography in active catalog subjects", async () => {
    const res = await fetch(`${baseUrl}/api/catalog/subjects`);
    const data = await res.json();
    expect(res.status).toBe(200);

    const geo = data.subjects.find((s) => s.id === "geography");
    expect(geo).toBeDefined();
    expect(geo.title).toBe("География");
    expect(geo.topics.length).toBeGreaterThanOrEqual(3);
  });

  it("should retrieve Geography OGE mock exam with 5 questions", async () => {
    const res = await fetch(`${baseUrl}/api/mock-exams/mock_geo_oge_1`);
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.id).toBe("mock_geo_oge_1");
    expect(data.examType).toBe("OGE");
    expect(data.questions.length).toBe(5);
  });

  it("should successfully submit Geography OGE attempt and calculate grade", async () => {
    const res = await fetch(`${baseUrl}/api/mock-exams/mock_geo_oge_1/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        answers: { gmoq1: 0, gmoq2: 0, gmoq3: 0, gmoq4: 0, gmoq5: 0 },
        timeSpentSeconds: 180,
      }),
    });
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.primaryScore).toBe(5);
    expect(data.secondaryScore).toBe(5);
  });
});
