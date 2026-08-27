import { getDefaultFIPITemplate } from "../js/modules/test-editor.js";
import { app } from "../server/index.js";
import { initDb, db } from "../server/db.js";

console.log("=================================================");
console.log("  CHALLENGER 1: EMPIRICAL STRESS & FUZZ HARNESS  ");
console.log("=================================================\n");

let passedAsserts = 0;
let failedAsserts = 0;
const errors = [];

function assert(condition, message) {
  if (condition) {
    passedAsserts++;
  } else {
    failedAsserts++;
    errors.push(message);
    console.error(`[FAIL] ${message}`);
  }
}

// --------------------------------------------------------------------------
// 1. Stress Benchmark & Fuzzing for getDefaultFIPITemplate
// --------------------------------------------------------------------------
console.log("[1/2] Fuzzing and Stress-testing getDefaultFIPITemplate (10,000 iterations)...");

const ALL_10_SUBJECTS = [
  "math",
  "russian",
  "biology",
  "chemistry",
  "physics",
  "informatics",
  "social",
  "history",
  "literature",
  "geography",
];

const EXAM_TYPES = ["EGE", "OGE", "ege", "oge", undefined, null, "INVALID_MODE"];

const startTime = performance.now();

// Exhaustive 600 combinations check
for (const subject of ALL_10_SUBJECTS) {
  for (const exam of ["EGE", "OGE"]) {
    for (let task = 1; task <= 30; task++) {
      const tpl = getDefaultFIPITemplate(subject, task, exam);

      assert(typeof tpl.solutionKey === "string" && tpl.solutionKey.length > 10, `Valid solutionKey for ${subject} T${task} ${exam}`);
      assert(typeof tpl.topicTitle === "string" && tpl.topicTitle.length > 3, `Valid topicTitle for ${subject} T${task} ${exam}`);
      assert(typeof tpl.maxPoints === "number" && !isNaN(tpl.maxPoints) && tpl.maxPoints >= 2, `Valid maxPoints for ${subject} T${task} ${exam}`);
      assert(typeof tpl.criteriaText === "string" && tpl.criteriaText.includes("K1:"), `Valid criteriaText for ${subject} T${task} ${exam}`);

      // Criteria Parser verification
      const lines = tpl.criteriaText.split("\n").filter(Boolean);
      assert(lines.length >= 2, `At least 2 criteria lines for ${subject} T${task} ${exam}`);

      lines.forEach((line, idx) => {
        const matchPoints = line.match(/\((\d+)\s*б/i);
        const pts = matchPoints ? parseInt(matchPoints[1], 10) : 1;
        const title = line.replace(/^K\d+:\s*/i, "").trim();

        assert(!isNaN(pts) && pts >= 1, `Clean numeric points (${pts}) for ${subject} T${task} ${exam} Line ${idx + 1}`);
        assert(title.length > 0, `Non-empty criterion title for ${subject} T${task} ${exam} Line ${idx + 1}`);
      });
    }
  }
}

// 10,000 randomized fuzz test
const FUZZ_ITERATIONS = 10000;
const FUZZ_SUBJECTS = [...ALL_10_SUBJECTS, "MATH", "BIO", "Rus", "astronomy", "", null, undefined, "123", "!@#$%"];
const FUZZ_TASKS = [-100, -1, 0, 1, 14, 27, 50, 999, 10000, "1", "27", "invalid", null, undefined, NaN];

for (let i = 0; i < FUZZ_ITERATIONS; i++) {
  const randSub = FUZZ_SUBJECTS[Math.floor(Math.random() * FUZZ_SUBJECTS.length)];
  const randTask = FUZZ_TASKS[Math.floor(Math.random() * FUZZ_TASKS.length)];
  const randExam = EXAM_TYPES[Math.floor(Math.random() * EXAM_TYPES.length)];

  try {
    const tpl = getDefaultFIPITemplate(randSub, randTask, randExam);
    assert(typeof tpl === "object" && tpl !== null, `Fuzz result is object at iteration ${i}`);
    assert(typeof tpl.solutionKey === "string", `Fuzz solutionKey string at iteration ${i}`);
    assert(typeof tpl.topicTitle === "string", `Fuzz topicTitle string at iteration ${i}`);
    assert(typeof tpl.criteriaText === "string", `Fuzz criteriaText string at iteration ${i}`);
    assert(typeof tpl.maxPoints === "number" && !isNaN(tpl.maxPoints) && tpl.maxPoints >= 1, `Fuzz maxPoints valid at iteration ${i}`);
  } catch (err) {
    assert(false, `getDefaultFIPITemplate threw uncaught exception on fuzz (${randSub}, ${randTask}, ${randExam}): ${err.message}`);
  }
}

const fipiElapsed = (performance.now() - startTime).toFixed(2);
console.log(`[PASS] getDefaultFIPITemplate fuzzing completed: ${FUZZ_ITERATIONS + 600} executions in ${fipiElapsed}ms (${( (FUZZ_ITERATIONS + 600) / (fipiElapsed / 1000) ).toFixed(0)} ops/sec)\n`);

// --------------------------------------------------------------------------
// 2. HTTP Server & Admin API Stress Testing
// --------------------------------------------------------------------------
console.log("[2/2] Stress-testing Admin Questions API via HTTP...");

initDb();

const adminToken = "admin_session_token";
const admin = db.prepare("SELECT id FROM users WHERE email = ?").get("admin@examhub.ru");
const expiresAt = new Date(Date.now() + 864e5).toISOString();
db.prepare("INSERT OR REPLACE INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)").run(
  adminToken,
  admin.id,
  expiresAt
);

const server = app.listen(0, async () => {
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}`;

  try {
    // 2.1 Concurrency test (50 parallel requests with diverse filters)
    console.log("  -> Running 50 concurrent GET requests with diverse filter combinations...");
    const filterCombos = [
      "?subjectId=math",
      "?subjectId=russian&taskNumber=27",
      "?subjectId=biology&type=extended",
      "?subjectId=chemistry&q=%D1%80%D0%B5%D0%B0%D0%BA%D1%86%D0%B8%D1%8F",
      "?taskNumber=1",
      "?q=тест",
      "?type=single",
      "?subjectId=all&taskNumber=all&type=all",
      "?subjectId=nonexistent",
      "?taskNumber=invalid",
    ];

    const concurrentRequests = [];
    for (let i = 0; i < 50; i++) {
      const qs = filterCombos[i % filterCombos.length];
      concurrentRequests.push(
        fetch(`${baseUrl}/api/admin/tests/questions${qs}`, {
          headers: { Authorization: `Bearer ${adminToken}` },
        }).then(async (res) => {
          assert(res.status === 200, `Concurrent GET ${qs} returned status 200`);
          const data = await res.json();
          assert(Array.isArray(data.questions), `Concurrent GET ${qs} returned questions array`);
        })
      );
    }
    await Promise.all(concurrentRequests);
    console.log("  -> Concurrency test passed: 50/50 requests succeeded in parallel.");

    // 2.2 Security: Unauthenticated and Forbidden Access
    console.log("  -> Testing Auth & Role security boundaries...");
    const unauthGet = await fetch(`${baseUrl}/api/admin/tests/questions`);
    assert(unauthGet.status === 401, "GET without token returns 401");

    const unauthPatch = await fetch(`${baseUrl}/api/admin/tests/questions/q1`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question: "Unauthorized" }),
    });
    assert(unauthPatch.status === 401, "PATCH without token returns 401");

    // 2.3 404 & Input Validation in PATCH
    console.log("  -> Testing 404 and PATCH edge cases...");
    const notFoundPatch = await fetch(`${baseUrl}/api/admin/tests/questions/non_existent_id_404_test`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${adminToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ question: "Testing 404" }),
    });
    assert(notFoundPatch.status === 404, "PATCH non-existent question returns 404");
    const notFoundData = await notFoundPatch.json();
    assert(notFoundData.error === "Вопрос не найден", "PATCH 404 returns Russian error message");

    // 2.4 End-to-end PATCH verification
    const listRes = await fetch(`${baseUrl}/api/admin/tests/questions`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const listData = await listRes.json();
    const targetQ = listData.questions[0];

    const patchPayload = {
      question: "Проверочный вопрос Challenger 1 с формулой E=mc² и спецсимволами <>&'\"",
      taskNumber: 13,
      type: "extended",
      points: 2,
      maxPoints: 2,
      solutionKey: "1) Обоснованно применен закон сохранения энергии\n2) Получен верный ответ",
      criteria: [
        { code: "K1", title: "Обоснованно получен верный ответ", maxPoints: 2 },
        { code: "K2", title: "Допущена арифметическая погрешность", maxPoints: 1 },
      ],
      explanation: "Разбор задания №13",
    };

    const patchRes = await fetch(`${baseUrl}/api/admin/tests/questions/${targetQ.id}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${adminToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(patchPayload),
    });
    assert(patchRes.status === 200, "PATCH question returns 200");
    const patchResult = await patchRes.json();
    assert(patchResult.ok === true && patchResult.id === targetQ.id, "PATCH response contains { ok: true, id }");

    const getPatchedRes = await fetch(`${baseUrl}/api/admin/tests/questions/${targetQ.id}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const getPatchedData = await getPatchedRes.json();
    assert(getPatchedData.question.question === patchPayload.question, "Patched question text saved correctly");
    assert(getPatchedData.question.task_number === 13, "Patched task_number saved correctly");
    assert(getPatchedData.question.max_points === 2, "Patched max_points saved correctly");
    assert(getPatchedData.question.solution_key === patchPayload.solutionKey, "Patched solution_key saved correctly");

    console.log("\n=================================================");
    console.log(`  SUMMARY: ${passedAsserts} PASSED, ${failedAsserts} FAILED`);
    console.log("=================================================");

    server.close(() => {
      if (failedAsserts > 0) {
        process.exit(1);
      } else {
        process.exit(0);
      }
    });
  } catch (err) {
    console.error("Stress harness error:", err);
    server.close(() => process.exit(1));
  }
});
