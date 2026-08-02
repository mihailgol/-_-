import fs from 'fs';
import path from 'path';

// Read js/data.js file content
const dataPath = path.resolve('js/data.js');
const code = fs.readFileSync(dataPath, 'utf8');

// We can evaluate EXAM_DATA by stripping export or wrapped const
// Since js/data.js has `const EXAM_DATA = ...;`
let evalScope = {};
const functionBody = code + '\nreturn EXAM_DATA;';
const getExamData = new Function(functionBody);
const examData = getExamData();

const subjects = ['biology', 'chemistry', 'physics'];

console.log("=== EXAM_DATA Science Subjects Analysis ===");

subjects.forEach(subjKey => {
  const subj = examData.subjects[subjKey];
  if (!subj) {
    console.error(`ERROR: Subject ${subjKey} missing!`);
    return;
  }
  console.log(`\nSubject: ${subj.title} (${subj.id}) - Icon: ${subj.icon}, ColorHex: ${subj.colorHex}`);
  console.log(`Topics count: ${subj.topics ? subj.topics.length : 0}`);
  
  subj.topics.forEach((topic, tIdx) => {
    console.log(`  Topic ${tIdx + 1}: ${topic.title} (${topic.id})`);
    console.log(`    Theory length: ${topic.theory ? topic.theory.length : 0} chars`);
    console.log(`    Video: "${topic.video ? topic.video.title : 'None'}"`);
    console.log(`    Questions count: ${topic.questions ? topic.questions.length : 0}`);
    
    // Check HTML tag balance in theory
    const theory = topic.theory || '';
    const openTags = theory.match(/<([a-z1-6]+)[^>]*>/gi) || [];
    const closeTags = theory.match(/<\/([a-z1-6]+)>/gi) || [];
    
    // Count tag frequencies
    const tagCounts = {};
    openTags.forEach(t => {
      const tag = t.replace(/<([a-z1-6]+).*/i, '$1').toLowerCase();
      if (['br', 'hr', 'img', 'input'].includes(tag)) return; // self-closing
      tagCounts[tag] = (tagCounts[tag] || 0) + 1;
    });
    closeTags.forEach(t => {
      const tag = t.replace(/<\/([a-z1-6]+)>/i, '$1').toLowerCase();
      tagCounts[tag] = (tagCounts[tag] || 0) - 1;
    });
    
    const unbalanced = Object.entries(tagCounts).filter(([_, count]) => count !== 0);
    if (unbalanced.length > 0) {
      console.warn(`    WARNING: Unbalanced HTML tags in topic ${topic.id}:`, unbalanced);
    } else {
      console.log(`    HTML tags: BALANCED`);
    }

    // Check questions correctIndex & option range
    topic.questions.forEach((q, qIdx) => {
      if (q.correctIndex === undefined || q.correctIndex < 0 || q.correctIndex >= q.options.length) {
        console.error(`    ERROR in question ${q.id} (Q${qIdx + 1}): correctIndex ${q.correctIndex} out of bounds (options len: ${q.options.length})`);
      }
      const correctOptText = q.options[q.correctIndex];
      // Print question details for manual scientific review
      console.log(`      Q${qIdx + 1} (${q.id}): ${q.question}`);
      console.log(`        Options: ${JSON.stringify(q.options)}`);
      console.log(`        Correct [${q.correctIndex}]: "${correctOptText}"`);
      console.log(`        Explanation: ${q.explanation}`);
    });
  });
});
