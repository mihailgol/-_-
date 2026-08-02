const fs = require('fs');
const vm = require('vm');
const path = require('path');

const dataPath = path.join(__dirname, '..', '..', 'js', 'data.js');
const code = fs.readFileSync(dataPath, 'utf8');
const sandbox = {};
vm.createContext(sandbox);
vm.runInContext(code, sandbox);

const EXAM_DATA = sandbox.EXAM_DATA;
console.log('Subjects found:', Object.keys(EXAM_DATA.subjects));

const scienceSubjects = ['biology', 'chemistry', 'physics'];
const report = [];

for (const subId of scienceSubjects) {
  const sub = EXAM_DATA.subjects[subId];
  if (!sub) {
    console.error('MISSING SUBJECT:', subId);
    report.push(`MISSING SUBJECT: ${subId}`);
    continue;
  }
  console.log(`\n=== SUBJECT: ${sub.title} (${sub.id}) ===`);
  console.log(`Icon: ${sub.icon}, Color: ${sub.colorHex}, Topics count: ${sub.topics ? sub.topics.length : 0}`);
  
  if (!sub.topics || sub.topics.length === 0) {
    console.error(`Subject ${subId} has no topics!`);
    continue;
  }

  sub.topics.forEach((t, i) => {
    console.log(`  Topic ${i+1}: ${t.id} - ${t.title}`);
    console.log(`    isPremium: ${t.isPremium}, duration: ${t.duration}`);
    console.log(`    theory length: ${t.theory ? t.theory.length : 0} chars`);
    console.log(`    video: ${t.video ? t.video.title + ' (' + t.video.duration + ')' : 'NONE'}`);
    console.log(`    questions count: ${t.questions ? t.questions.length : 0}`);
    
    // Check theory quality
    if (!t.theory || t.theory.trim().length < 200) {
      console.error(`    [WARNING/FAIL] Theory is empty or too short (<200 chars)!`);
    }

    // Check placeholders or suspicious strings
    const suspiciousPatterns = [/placeholder/i, /todo/i, /lorem ipsum/i, /stub/i, /fixme/i];
    suspiciousPatterns.forEach(pattern => {
      if (t.theory && pattern.test(t.theory)) {
        console.error(`    [FAIL] Theory contains suspicious pattern: ${pattern}`);
      }
    });

    if (t.questions) {
      t.questions.forEach((q, qi) => {
        const validIdx = Number.isInteger(q.correctIndex) && q.correctIndex >= 0 && q.correctIndex < (q.options ? q.options.length : 0);
        console.log(`      Q${qi+1} (${q.id}): options=${q.options ? q.options.length : 0}, correctIdx=${q.correctIndex} (valid: ${validIdx})`);
        if (!validIdx) console.error(`        [FAIL] INVALID CORRECT INDEX in Q ${q.id}!`);
        if (!q.question || q.question.trim().length === 0) console.error(`        [FAIL] Question text empty in Q ${q.id}!`);
        if (!q.explanation || q.explanation.trim().length === 0) console.error(`        [FAIL] Explanation text empty in Q ${q.id}!`);
        if (!q.options || q.options.length < 2) console.error(`        [FAIL] Options less than 2 in Q ${q.id}!`);
      });
    } else {
      console.error(`    [FAIL] No questions array in topic ${t.id}!`);
    }
  });
}
