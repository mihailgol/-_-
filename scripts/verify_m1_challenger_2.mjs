import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { initDb, db } from '../server/db.js';

console.log('=== STARTING CHALLENGER 2 ADVERSARIAL CHECKS FOR MILESTONE 1 ===\n');

// Load js/data.js
const dataJsPath = path.resolve('js/data.js');
const code = fs.readFileSync(dataJsPath, 'utf8');
const sandbox = { window: {} };
vm.createContext(sandbox);
vm.runInContext(code, sandbox);

const EXAM_DATA = sandbox.window.EXAM_DATA;

const questionIdMap = new Map(); // id -> array of locations
const duplicateQuestionIds = [];
const duplicateOptionsList = [];
let totalPracticeQuestionsChecked = 0;
let totalMockQuestionsChecked = 0;

// 1. Audit Practice Questions in js/data.js
for (const [subjectKey, subject] of Object.entries(EXAM_DATA.subjects)) {
  if (!subject.topics) continue;
  for (const topic of subject.topics) {
    if (!topic.questions) continue;
    for (let qIdx = 0; qIdx < topic.questions.length; qIdx++) {
      const q = topic.questions[qIdx];
      totalPracticeQuestionsChecked++;
      const location = `Practice [${subjectKey} -> ${topic.id} -> Q#${qIdx + 1} (id: ${q.id})]`;

      // Check ID duplication
      if (q.id) {
        if (!questionIdMap.has(q.id)) {
          questionIdMap.set(q.id, []);
        }
        questionIdMap.get(q.id).push(location);
      } else {
        duplicateQuestionIds.push({ issue: 'MISSING_ID', location, question: q.question });
      }

      // Check Duplicate Choices in options array
      if (Array.isArray(q.options)) {
        const seenOptions = new Map();
        for (let i = 0; i < q.options.length; i++) {
          const opt = String(q.options[i]).trim();
          if (seenOptions.has(opt)) {
            duplicateOptionsList.push({
              location,
              questionId: q.id,
              questionText: q.question,
              duplicatedOption: opt,
              firstIndex: seenOptions.get(opt),
              secondIndex: i,
              allOptions: q.options
            });
          } else {
            seenOptions.set(opt, i);
          }
        }
      }
    }
  }
}

// 2. Audit Mock Exam Questions in server/seed.js / SQLite DB
initDb();
const mockExams = db.prepare('SELECT id, subject_id, exam_type, questions_json FROM mock_exams').all();

for (const mock of mockExams) {
  let questions;
  try {
    questions = JSON.parse(mock.questions_json);
  } catch (e) {
    console.error(`Failed to parse questions_json for mock exam ${mock.id}: ${e.message}`);
    continue;
  }

  for (let qIdx = 0; qIdx < questions.length; qIdx++) {
    const q = questions[qIdx];
    totalMockQuestionsChecked++;
    const location = `Mock Exam [${mock.id} (${mock.subject_id} ${mock.exam_type}) -> Q#${qIdx + 1} (id: ${q.id})]`;

    // Check ID duplication
    if (q.id) {
      if (!questionIdMap.has(q.id)) {
        questionIdMap.set(q.id, []);
      }
      questionIdMap.get(q.id).push(location);
    } else {
      duplicateQuestionIds.push({ issue: 'MISSING_ID', location, question: q.question });
    }

    // Check Duplicate Choices in options array
    if (Array.isArray(q.options)) {
      const seenOptions = new Map();
      for (let i = 0; i < q.options.length; i++) {
        const opt = String(q.options[i]).trim();
        if (seenOptions.has(opt)) {
          duplicateOptionsList.push({
            location,
            questionId: q.id,
            questionText: q.question,
            duplicatedOption: opt,
            firstIndex: seenOptions.get(opt),
            secondIndex: i,
            allOptions: q.options
          });
        } else {
          seenOptions.set(opt, i);
        }
      }
    }
  }
}

// Find all IDs with >1 occurrences
for (const [id, locations] of questionIdMap.entries()) {
  if (locations.length > 1) {
    duplicateQuestionIds.push({ id, occurrences: locations.length, locations });
  }
}

console.log(`Audited ${totalPracticeQuestionsChecked} practice questions in js/data.js.`);
console.log(`Audited ${totalMockQuestionsChecked} mock exam questions in database / server/seed.js.`);
console.log(`Total questions audited: ${totalPracticeQuestionsChecked + totalMockQuestionsChecked}\n`);

console.log('--- 1. DUPLICATE QUESTION ID CHECK ---');
if (duplicateQuestionIds.length === 0) {
  console.log('✅ PASSED: Zero duplicate question IDs found across all practice topics and mock exams.');
} else {
  console.error(`❌ FAILED: Found ${duplicateQuestionIds.length} duplicate or invalid question ID issues:`);
  console.error(JSON.stringify(duplicateQuestionIds, null, 2));
}

console.log('\n--- 2. DUPLICATE CHOICES IN OPTIONS ARRAYS CHECK ---');
if (duplicateOptionsList.length === 0) {
  console.log('✅ PASSED: Zero duplicate choices found in options arrays across all questions.');
} else {
  console.error(`❌ FAILED: Found ${duplicateOptionsList.length} duplicate choice issues in options arrays:`);
  console.error(JSON.stringify(duplicateOptionsList, null, 2));
}

console.log('\n=== SUMMARY ===');
if (duplicateQuestionIds.length === 0 && duplicateOptionsList.length === 0) {
  console.log('✅ ALL ADVERSARIAL CHECKS PASSED!');
  process.exit(0);
} else {
  console.error('❌ ADVERSARIAL CHECKS FAILED!');
  process.exit(1);
}
