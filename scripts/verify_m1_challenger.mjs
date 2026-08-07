import fs from 'fs';
import path from 'path';
import vm from 'vm';
import { initDb, db } from '../server/db.js';

const results = {
  passed: 0,
  failed: 0,
  errors: []
};

function assert(condition, message) {
  if (condition) {
    results.passed++;
  } else {
    results.failed++;
    results.errors.push(message);
    console.error(`❌ FAIL: ${message}`);
  }
}

console.log('=== STARTING EMPIRICAL VERIFICATION FOR MILESTONE 1 ===\n');

// 1. Load js/data.js using vm context
const dataJsPath = path.resolve('js/data.js');
assert(fs.existsSync(dataJsPath), `js/data.js exists at ${dataJsPath}`);

const code = fs.readFileSync(dataJsPath, 'utf8');
const sandbox = { window: {} };
vm.createContext(sandbox);
vm.runInContext(code, sandbox);

const EXAM_DATA = sandbox.window.EXAM_DATA;
assert(Boolean(EXAM_DATA && EXAM_DATA.subjects), 'EXAM_DATA.subjects is defined');

const requiredSubjects = [
  'math',
  'russian',
  'social',
  'biology',
  'chemistry',
  'physics',
  'informatics',
  'history'
];

console.log('--- 1. Subject Coverage & Structure Check ---');
const actualSubjects = Object.keys(EXAM_DATA.subjects);
console.log(`Found ${actualSubjects.length} subjects in js/data.js: ${actualSubjects.join(', ')}`);

for (const subId of requiredSubjects) {
  const sub = EXAM_DATA.subjects[subId];
  assert(Boolean(sub), `Subject '${subId}' exists in EXAM_DATA.subjects`);
  if (sub) {
    assert(typeof sub.id === 'string' && sub.id === subId, `Subject '${subId}' has correct id`);
    assert(typeof sub.title === 'string' && sub.title.length > 0, `Subject '${subId}' has title (${sub.title})`);
    assert(typeof sub.icon === 'string', `Subject '${subId}' has icon`);
    assert(Array.isArray(sub.topics) && sub.topics.length >= 4, `Subject '${subId}' has at least 4 topics (found ${sub.topics?.length})`);
  }
}

console.log('\n--- 2. Topic Theory & HTML Tag Balance Check ---');
let totalTopics = 0;
let totalPracticeQuestions = 0;
const questionIds = new Set();

const VOID_TAGS = new Set(['br', 'hr', 'img', 'input', 'meta', 'link']);

function checkHtmlTagBalance(html, topicId) {
  const tagRegex = /<\/?([a-zA-Z0-9]+)(\s+[^>]*)?>/g;
  const stack = [];
  let match;
  
  while ((match = tagRegex.exec(html)) !== null) {
    const fullTag = match[0];
    const tagName = match[1].toLowerCase();
    
    if (VOID_TAGS.has(tagName) || fullTag.endsWith('/>')) {
      continue;
    }
    
    const isClosing = fullTag.startsWith('</');
    if (isClosing) {
      if (stack.length === 0) {
        return `Unexpected closing tag </${tagName}> without matching opening tag in topic ${topicId}`;
      }
      const last = stack.pop();
      if (last !== tagName) {
        return `Mismatched closing tag </${tagName}>, expected </${last}> in topic ${topicId}`;
      }
    } else {
      stack.push(tagName);
    }
  }
  
  if (stack.length > 0) {
    return `Unclosed tag(s) <${stack.join('>, <')}> in topic ${topicId}`;
  }
  return null;
}

for (const subId of requiredSubjects) {
  const sub = EXAM_DATA.subjects[subId];
  if (!sub) continue;
  
  for (const topic of sub.topics) {
    totalTopics++;
    assert(typeof topic.id === 'string' && topic.id.length > 0, `Topic has valid id in ${subId}`);
    assert(typeof topic.title === 'string' && topic.title.length > 0, `Topic '${topic.id}' has valid title`);
    assert(typeof topic.theory === 'string' && topic.theory.length > 100, `Topic '${topic.id}' has non-empty theory`);
    
    // HTML tag balance
    const tagErr = checkHtmlTagBalance(topic.theory, topic.id);
    assert(tagErr === null, `HTML tag balance in topic '${topic.id}': ${tagErr || 'OK'}`);
    
    // Presence of note-info-box and data-table
    const hasInfoBox = topic.theory.includes('note-info-box');
    assert(hasInfoBox, `Topic '${topic.id}' includes <div class="note-info-box">`);
    
    const hasDataTable = topic.theory.includes('data-table');
    assert(hasDataTable, `Topic '${topic.id}' includes <table class="data-table">`);
    
    // Practice Questions
    assert(Array.isArray(topic.questions) && topic.questions.length >= 5, `Topic '${topic.id}' has at least 5 practice questions`);
    
    if (Array.isArray(topic.questions)) {
      for (const q of topic.questions) {
        totalPracticeQuestions++;
        assert(typeof q.id === 'string' && q.id.length > 0, `Question id is non-empty string in topic ${topic.id}`);
        assert(!questionIds.has(q.id), `Question id '${q.id}' is unique`);
        questionIds.add(q.id);
        
        assert(typeof q.question === 'string' && q.question.trim().length > 0, `Question text non-empty in '${q.id}'`);
        assert(Array.isArray(q.options) && q.options.length >= 4, `Question '${q.id}' has at least 4 options (found ${q.options?.length})`);
        
        assert(
          typeof q.correctIndex === 'number' && 
          Number.isInteger(q.correctIndex) && 
          q.correctIndex >= 0 && 
          q.correctIndex < q.options.length,
          `Question '${q.id}' correctIndex (${q.correctIndex}) is within options bounds [0, ${q.options.length - 1}]`
        );
        
        assert(typeof q.explanation === 'string' && q.explanation.trim().length >= 20, `Question '${q.id}' has detailed explanation (>=20 chars)`);
      }
    }
  }
}

console.log(`Audited ${totalTopics} topics and ${totalPracticeQuestions} practice questions across 8 subjects.`);
assert(totalTopics >= 32, `Total topics count is at least 32 (found ${totalTopics})`);
assert(totalPracticeQuestions >= 160, `Total practice questions count is at least 160 (found ${totalPracticeQuestions})`);

console.log('\n--- 3. Database Seeding & Mock Exams Suite Check ---');

// Initialize schema and seed database
initDb();

const mockExamsStmt = db.prepare('SELECT * FROM mock_exams ORDER BY subject_id, exam_type');
const mockExams = mockExamsStmt.all();
console.log(`Found ${mockExams.length} mock exams in database.sqlite.`);

assert(mockExams.length >= 16, `Database contains at least 16 mock exams (found ${mockExams.length})`);

const mockExamBySubAndType = {};

for (const exam of mockExams) {
  assert(typeof exam.id === 'string' && exam.id.length > 0, `Mock exam has valid id: ${exam.id}`);
  assert(typeof exam.subject_id === 'string' && requiredSubjects.includes(exam.subject_id), `Mock exam ${exam.id} belongs to required subject (${exam.subject_id})`);
  assert(['EGE', 'OGE'].includes(exam.exam_type), `Mock exam ${exam.id} has valid exam_type: ${exam.exam_type}`);
  assert(exam.duration_minutes > 0, `Mock exam ${exam.id} duration > 0 (${exam.duration_minutes})`);
  assert(exam.total_questions > 0, `Mock exam ${exam.id} total_questions > 0 (${exam.total_questions})`);
  assert([0, 1].includes(Number(exam.is_premium)), `Mock exam ${exam.id} is_premium is 0 or 1 (${exam.is_premium})`);
  
  // JSON validity check
  let questions = null;
  try {
    questions = JSON.parse(exam.questions_json);
    assert(Array.isArray(questions) && questions.length >= 5, `Mock exam ${exam.id} questions_json parsed array with >=5 questions (found ${questions?.length})`);
  } catch (err) {
    assert(false, `Mock exam ${exam.id} questions_json JSON.parse failed: ${err.message}`);
  }
  
  try {
    const conversionTable = JSON.parse(exam.conversion_table_json);
    assert(Boolean(conversionTable), `Mock exam ${exam.id} conversion_table_json parsed successfully`);
  } catch (err) {
    assert(false, `Mock exam ${exam.id} conversion_table_json JSON.parse failed: ${err.message}`);
  }
  
  if (questions) {
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      assert(typeof q.id === 'string' && q.id.length > 0, `Mock exam ${exam.id} Q${i+1} has valid id`);
      assert(typeof q.question === 'string' && q.question.trim().length > 0, `Mock exam ${exam.id} Q${i+1} has question text`);
      assert(Array.isArray(q.options) && q.options.length >= 4, `Mock exam ${exam.id} Q${i+1} has >= 4 options`);
      assert(
        typeof q.correctIndex === 'number' && 
        Number.isInteger(q.correctIndex) && 
        q.correctIndex >= 0 && 
        q.correctIndex < q.options.length,
        `Mock exam ${exam.id} Q${i+1} correctIndex (${q.correctIndex}) within bounds [0, ${q.options.length - 1}]`
      );
      assert(typeof q.explanation === 'string' && q.explanation.trim().length >= 10, `Mock exam ${exam.id} Q${i+1} has explanation`);
    }
  }
  
  const key = `${exam.subject_id}:${exam.exam_type}`;
  mockExamBySubAndType[key] = (mockExamBySubAndType[key] || 0) + 1;
}

// Verify that every required subject has BOTH OGE and EGE mock exams
for (const subId of requiredSubjects) {
  assert((mockExamBySubAndType[`${subId}:OGE`] || 0) >= 1, `Subject '${subId}' has OGE mock exam`);
  assert((mockExamBySubAndType[`${subId}:EGE`] || 0) >= 1, `Subject '${subId}' has EGE mock exam`);
}

console.log('\n=== EMPIRICAL VERIFICATION SUMMARY ===');
console.log(`Total assertions passed: ${results.passed}`);
console.log(`Total assertions failed: ${results.failed}`);

if (results.failed === 0) {
  console.log('\n✅ ALL VERIFICATION CHECKS PASSED SUCCESSFULLY!');
  process.exit(0);
} else {
  console.error(`\n❌ VERIFICATION FAILED WITH ${results.failed} ERRORS.`);
  process.exit(1);
}
