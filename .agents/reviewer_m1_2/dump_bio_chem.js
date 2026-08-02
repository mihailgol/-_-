import fs from 'fs';
import path from 'path';

const dataPath = path.resolve('js/data.js');
const code = fs.readFileSync(dataPath, 'utf8');

const functionBody = code + '\nreturn EXAM_DATA;';
const getExamData = new Function(functionBody);
const examData = getExamData();

['biology', 'chemistry'].forEach(subjKey => {
  const subj = examData.subjects[subjKey];
  console.log(`\n==================================================`);
  console.log(`SUBJECT: ${subj.title.toUpperCase()} (${subjKey})`);
  console.log(`==================================================`);

  subj.topics.forEach((topic, tIdx) => {
    console.log(`\n--- Topic ${tIdx + 1}: [${topic.id}] "${topic.title}" ---`);
    topic.questions.forEach((q, qIdx) => {
      console.log(`  Q${qIdx + 1} (${q.id}): ${q.question}`);
      console.log(`    Options: ${JSON.stringify(q.options)}`);
      console.log(`    Correct [${q.correctIndex}]: "${q.options[q.correctIndex]}"`);
      console.log(`    Explanation: ${q.explanation}`);
    });
  });
});
