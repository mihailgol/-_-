import { db } from "../server/db.js";

const rows = db
  .prepare(
    "SELECT id, subject_id, title, exam_type, duration_minutes, total_questions, is_premium, questions_json, conversion_table_json FROM mock_exams"
  )
  .all();

console.log("Total mock exams count:", rows.length);

const subjects = [
  "math",
  "russian",
  "social",
  "biology",
  "chemistry",
  "physics",
  "informatics",
  "history",
];
const examTypes = ["EGE", "OGE"];

const countsBySubject = {};
subjects.forEach((s) => {
  countsBySubject[s] = { EGE: 0, OGE: 0 };
});

let errors = [];

rows.forEach((row) => {
  if (!subjects.includes(row.subject_id)) {
    errors.push(`Unknown subject_id: ${row.subject_id} in exam ${row.id}`);
  }
  if (!examTypes.includes(row.exam_type)) {
    errors.push(`Invalid exam_type: ${row.exam_type} in exam ${row.id}`);
  }
  if (countsBySubject[row.subject_id] && examTypes.includes(row.exam_type)) {
    countsBySubject[row.subject_id][row.exam_type]++;
  }

  // Validate JSON questions_json
  let qJson;
  try {
    qJson = JSON.parse(row.questions_json);
    if (!Array.isArray(qJson)) {
      errors.push(`questions_json is not an array in exam ${row.id}`);
    } else {
      if (qJson.length < 5) {
        errors.push(
          `Exam ${row.id} has ${qJson.length} questions, expected >= 5`
        );
      }
      if (row.total_questions !== qJson.length) {
        errors.push(
          `Exam ${row.id} total_questions field (${row.total_questions}) does not match questions_json length (${qJson.length})`
        );
      }
      qJson.forEach((q, idx) => {
        if (
          !q.id ||
          !q.question ||
          !Array.isArray(q.options) ||
          q.options.length < 4 ||
          q.correctIndex === undefined ||
          !q.explanation
        ) {
          errors.push(
            `Exam ${row.id} question at index ${idx} has missing or invalid properties`
          );
        }
      });
    }
  } catch (e) {
    errors.push(`Invalid questions_json format in exam ${row.id}: ${e.message}`);
  }

  // Validate conversion_table_json
  try {
    const convJson = JSON.parse(row.conversion_table_json);
    if (typeof convJson !== "object" || convJson === null) {
      errors.push(`conversion_table_json is not an object in exam ${row.id}`);
    }
  } catch (e) {
    errors.push(
      `Invalid conversion_table_json format in exam ${row.id}: ${e.message}`
    );
  }
});

console.log(
  "Counts by subject and exam_type:",
  JSON.stringify(countsBySubject, null, 2)
);

if (errors.length > 0) {
  console.error("Validation errors found:");
  errors.forEach((e) => console.error(" - " + e));
  process.exit(1);
} else {
  console.log("ALL DB VERIFICATIONS PASSED SUCCESSFULLY!");
}
