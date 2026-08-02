import fs from 'fs';
import path from 'path';

const dataPath = path.resolve('js/data.js');
const code = fs.readFileSync(dataPath, 'utf8');

let evalScope = {};
const functionBody = code + '\nreturn EXAM_DATA;';
const getExamData = new Function(functionBody);
const examData = getExamData();

const subjects = ['biology', 'chemistry', 'physics'];

let totalErrors = 0;
let totalWarnings = 0;

subjects.forEach(subjKey => {
  const subj = examData.subjects[subjKey];
  console.log(`\n==================================================`);
  console.log(`SUBJECT: ${subj.title.toUpperCase()} (${subjKey})`);
  console.log(`==================================================`);

  if (!subj.topics || subj.topics.length === 0) {
    console.error(`ERROR: Subject ${subjKey} has no topics!`);
    totalErrors++;
    return;
  }

  subj.topics.forEach((topic, tIdx) => {
    console.log(`\n--- Topic ${tIdx + 1}: [${topic.id}] "${topic.title}" ---`);
    console.log(`Duration: ${topic.duration}, Premium: ${topic.isPremium}`);

    // 1. Verify theory HTML tags
    const theory = topic.theory || '';
    const openTags = theory.match(/<([a-z1-6]+)[^>]*>/gi) || [];
    const closeTags = theory.match(/<\/([a-z1-6]+)>/gi) || [];
    
    const tagCounts = {};
    openTags.forEach(t => {
      const tag = t.replace(/<([a-z1-6]+).*/i, '$1').toLowerCase();
      if (['br', 'hr', 'img', 'input', 'meta', 'link'].includes(tag)) return;
      tagCounts[tag] = (tagCounts[tag] || 0) + 1;
    });
    closeTags.forEach(t => {
      const tag = t.replace(/<\/([a-z1-6]+)>/i, '$1').toLowerCase();
      tagCounts[tag] = (tagCounts[tag] || 0) - 1;
    });
    
    const unbalanced = Object.entries(tagCounts).filter(([_, count]) => count !== 0);
    if (unbalanced.length > 0) {
      console.error(`  [HTML ERROR] Unbalanced HTML tags in ${topic.id}:`, unbalanced);
      totalErrors++;
    } else {
      console.log(`  [HTML OK] All HTML tags balanced.`);
    }

    // 2. Check Video object
    if (!topic.video || !topic.video.title || !topic.video.youtubeId) {
      console.error(`  [VIDEO ERROR] Missing or incomplete video in ${topic.id}`);
      totalErrors++;
    } else {
      console.log(`  [VIDEO OK] "${topic.video.title}"`);
    }

    // 3. Check Questions
    if (!topic.questions || topic.questions.length === 0) {
      console.error(`  [QUESTIONS ERROR] No questions in ${topic.id}`);
      totalErrors++;
    } else {
      console.log(`  Questions count: ${topic.questions.length}`);
      topic.questions.forEach((q, qIdx) => {
        console.log(`    Q${qIdx + 1} (${q.id}): "${q.question}"`);
        console.log(`      Options (${q.options.length}): ${JSON.stringify(q.options)}`);
        
        if (q.correctIndex === undefined || q.correctIndex < 0 || q.correctIndex >= q.options.length) {
          console.error(`      [INDEX ERROR] correctIndex (${q.correctIndex}) out of bounds!`);
          totalErrors++;
        } else {
          console.log(`      Correct [${q.correctIndex}]: "${q.options[q.correctIndex]}"`);
        }
        
        if (!q.explanation || q.explanation.trim() === '') {
          console.error(`      [EXPLANATION ERROR] Missing explanation in ${q.id}`);
          totalErrors++;
        } else {
          console.log(`      Explanation: "${q.explanation}"`);
        }
      });
    }
  });
});

console.log(`\n==================================================`);
console.log(`VERIFICATION SUMMARY: ${totalErrors} Errors, ${totalWarnings} Warnings`);
console.log(`==================================================`);
