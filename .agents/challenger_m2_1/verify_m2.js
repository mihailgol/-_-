import fs from "fs";
import path from "path";
import vm from "vm";

const projectRoot = "c:\\Users\\мишка\\Desktop\\сайтик_бахчасарай";
const dataFilePath = path.join(projectRoot, "js", "data.js");

// Read and parse data.js using node:vm
const code = fs.readFileSync(dataFilePath, "utf8");
const sandbox = { window: {} };
vm.runInNewContext(code, sandbox);

const EXAM_DATA = sandbox.window.EXAM_DATA;

if (!EXAM_DATA || !EXAM_DATA.subjects) {
  console.error("CRITICAL: Failed to load EXAM_DATA from js/data.js");
  process.exit(1);
}

const targetSubjects = ["math", "informatics", "russian", "social", "history"];
const allSubjectKeys = Object.keys(EXAM_DATA.subjects);

console.log("=== M2 DATASET CHALLENGE & INTEGRITY AUDIT ===");
console.log(`Loaded subjects in EXAM_DATA: ${allSubjectKeys.join(", ")}`);
console.log(`Target M2 subjects: ${targetSubjects.join(", ")}\n`);

const report = {
  summary: {
    totalSubjects: allSubjectKeys.length,
    m2SubjectsCount: 0,
    m2TopicsCount: 0,
    m2QuestionsCount: 0,
    m2VideosCount: 0,
    errorsCount: 0,
    warningsCount: 0,
  },
  globalChecks: {
    duplicateTopicIds: [],
    duplicateQuestionIds: [],
  },
  m2SubjectDetails: {},
  anomalies: [],
};

// 1. Global ID Uniqueness Checks across ALL subjects
const globalTopicIds = new Map(); // id -> { subjectId, topicTitle }
const globalQuestionIds = new Map(); // id -> { subjectId, topicId, questionText }

for (const [subjId, subject] of Object.entries(EXAM_DATA.subjects)) {
  if (!subject.topics || !Array.isArray(subject.topics)) continue;

  for (const topic of subject.topics) {
    // Topic ID uniqueness
    if (globalTopicIds.has(topic.id)) {
      report.globalChecks.duplicateTopicIds.push({
        id: topic.id,
        firstFoundIn: globalTopicIds.get(topic.id),
        secondFoundIn: { subjectId: subjId, topicTitle: topic.title },
      });
      report.summary.errorsCount++;
    } else {
      globalTopicIds.set(topic.id, { subjectId: subjId, topicTitle: topic.title });
    }

    // Question ID uniqueness
    if (topic.questions && Array.isArray(topic.questions)) {
      for (const q of topic.questions) {
        if (globalQuestionIds.has(q.id)) {
          report.globalChecks.duplicateQuestionIds.push({
            id: q.id,
            firstFoundIn: globalQuestionIds.get(q.id),
            secondFoundIn: { subjectId: subjId, topicId: topic.id, questionText: q.question },
          });
          report.summary.errorsCount++;
        } else {
          globalQuestionIds.set(q.id, { subjectId: subjId, topicId: topic.id, questionText: q.question });
        }
      }
    }
  }
}

// Simple HTML Tag Balancer & Sanity Checker
function checkHtmlWellFormed(html) {
  if (typeof html !== "string") return { valid: false, reason: "Theory is not a string" };
  if (html.trim().length === 0) return { valid: false, reason: "Theory string is empty" };

  const errors = [];
  const warnings = [];

  // Check for raw placeholder leak
  if (/undefined|null|NaN|\[object Object\]/.test(html)) {
    errors.push("Theory HTML contains raw JS placeholder (undefined, null, NaN, [object Object])");
  }

  // Check HTML Tag Balance for container tags
  const tagsToBalance = ["div", "p", "h1", "h2", "h3", "h4", "h5", "h6", "table", "thead", "tbody", "tr", "td", "th", "ul", "ol", "li", "strong", "em", "code", "pre", "span"];
  const stack = [];
  const tagRegex = /<\/?([a-zA-Z0-9]+)(\s+[^>]*>|>)/g;
  let match;

  while ((match = tagRegex.exec(html)) !== null) {
    const fullTag = match[0];
    const tagName = match[1].toLowerCase();
    const isClosing = fullTag.startsWith("</");
    const isSelfClosing = fullTag.endsWith("/>") || ["img", "br", "hr", "input"].includes(tagName);

    if (isSelfClosing) continue;

    if (tagsToBalance.includes(tagName)) {
      if (!isClosing) {
        stack.push({ tag: tagName, index: match.index });
      } else {
        if (stack.length === 0) {
          errors.push(`Closing tag </${tagName}> without opening tag near index ${match.index}`);
        } else {
          const top = stack.pop();
          if (top.tag !== tagName) {
            errors.push(`Mismatched closing tag </${tagName}>, expected </${top.tag}> (opened at index ${top.index})`);
          }
        }
      }
    }
  }

  while (stack.length > 0) {
    const unclosed = stack.pop();
    errors.push(`Unclosed opening tag <${unclosed.tag}> at index ${unclosed.index}`);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

// 2. M2 Subject Specific Checks
for (const targetSubjId of targetSubjects) {
  const subject = EXAM_DATA.subjects[targetSubjId];

  if (!subject) {
    report.anomalies.push({
      type: "MISSING_SUBJECT",
      subjectId: targetSubjId,
      message: `Subject '${targetSubjId}' was not found in EXAM_DATA.subjects!`,
    });
    report.summary.errorsCount++;
    continue;
  }

  report.summary.m2SubjectsCount++;

  const subjDetail = {
    id: subject.id,
    title: subject.title,
    icon: subject.icon,
    topicsCount: subject.topics ? subject.topics.length : 0,
    questionsCount: 0,
    videosCount: 0,
    issues: [],
  };

  if (!subject.topics || !Array.isArray(subject.topics) || subject.topics.length === 0) {
    subjDetail.issues.push({
      severity: "CRITICAL",
      message: `Subject '${targetSubjId}' has no topics array or topics array is empty.`,
    });
    report.summary.errorsCount++;
    report.m2SubjectDetails[targetSubjId] = subjDetail;
    continue;
  }

  for (let tIdx = 0; tIdx < subject.topics.length; tIdx++) {
    const topic = subject.topics[tIdx];
    report.summary.m2TopicsCount++;

    const topicContext = `${subject.title} (${subject.id}) -> Topic #${tIdx + 1} '${topic.title}' [ID: ${topic.id}]`;

    // Topic Basic Fields
    if (!topic.id || typeof topic.id !== "string" || topic.id.trim() === "") {
      subjDetail.issues.push({ severity: "ERROR", topicId: topic.id, message: `${topicContext}: Empty or missing topic ID` });
      report.summary.errorsCount++;
    }

    if (!topic.title || typeof topic.title !== "string" || topic.title.trim() === "") {
      subjDetail.issues.push({ severity: "ERROR", topicId: topic.id, message: `${topicContext}: Empty or missing topic title` });
      report.summary.errorsCount++;
    }

    if (topic.isPremium === undefined || typeof topic.isPremium !== "boolean") {
      subjDetail.issues.push({ severity: "WARNING", topicId: topic.id, message: `${topicContext}: isPremium is missing or not a boolean` });
      report.summary.warningsCount++;
    }

    if (!topic.duration || typeof topic.duration !== "string" || topic.duration.trim() === "") {
      subjDetail.issues.push({ severity: "WARNING", topicId: topic.id, message: `${topicContext}: Empty or missing topic duration` });
      report.summary.warningsCount++;
    }

    // Theory HTML Check
    const theoryRes = checkHtmlWellFormed(topic.theory);
    if (!theoryRes.valid) {
      for (const err of theoryRes.errors) {
        subjDetail.issues.push({ severity: "ERROR", topicId: topic.id, message: `${topicContext} Theory HTML error: ${err}` });
        report.summary.errorsCount++;
      }
    }

    // Video Metadata Check
    if (topic.video) {
      subjDetail.videosCount++;
      report.summary.m2VideosCount++;

      const v = topic.video;
      const videoFields = ["title", "duration", "instructor", "youtubeId"];
      for (const f of videoFields) {
        if (!v[f] || typeof v[f] !== "string" || v[f].trim() === "") {
          subjDetail.issues.push({
            severity: "ERROR",
            topicId: topic.id,
            message: `${topicContext} Video metadata field '${f}' is missing or empty!`,
          });
          report.summary.errorsCount++;
        }
      }
    } else {
      subjDetail.issues.push({
        severity: "INFO",
        topicId: topic.id,
        message: `${topicContext}: Topic does not have video metadata.`,
      });
    }

    // Questions Check
    if (topic.questions && Array.isArray(topic.questions)) {
      if (topic.questions.length === 0) {
        subjDetail.issues.push({ severity: "WARNING", topicId: topic.id, message: `${topicContext}: Questions array is empty` });
        report.summary.warningsCount++;
      }

      for (let qIdx = 0; qIdx < topic.questions.length; qIdx++) {
        const q = topic.questions[qIdx];
        subjDetail.questionsCount++;
        report.summary.m2QuestionsCount++;

        const qContext = `${topicContext} -> Question #${qIdx + 1} [ID: ${q.id}]`;

        if (!q.id || typeof q.id !== "string" || q.id.trim() === "") {
          subjDetail.issues.push({ severity: "ERROR", topicId: topic.id, questionId: q.id, message: `${qContext}: Missing or empty question ID` });
          report.summary.errorsCount++;
        }

        if (!q.question || typeof q.question !== "string" || q.question.trim() === "") {
          subjDetail.issues.push({ severity: "ERROR", topicId: topic.id, questionId: q.id, message: `${qContext}: Missing or empty question text` });
          report.summary.errorsCount++;
        }

        if (!Array.isArray(q.options) || q.options.length < 2) {
          subjDetail.issues.push({ severity: "ERROR", topicId: topic.id, questionId: q.id, message: `${qContext}: Options is not an array or has less than 2 items` });
          report.summary.errorsCount++;
        } else {
          // Check options array contents
          for (let oIdx = 0; oIdx < q.options.length; oIdx++) {
            const opt = q.options[oIdx];
            if (typeof opt !== "string" || opt.trim() === "") {
              subjDetail.issues.push({ severity: "ERROR", topicId: topic.id, questionId: q.id, message: `${qContext}: Option #${oIdx} is empty or not a string` });
              report.summary.errorsCount++;
            }
          }

          // Check duplicate options in same question
          const uniqueOptions = new Set(q.options.map(o => String(o).trim()));
          if (uniqueOptions.size !== q.options.length) {
            subjDetail.issues.push({ severity: "WARNING", topicId: topic.id, questionId: q.id, message: `${qContext}: Duplicate option values present in question` });
            report.summary.warningsCount++;
          }

          // Check correctIndex range strictly: 0 <= correctIndex <= options.length - 1
          if (typeof q.correctIndex !== "number" || !Number.isInteger(q.correctIndex)) {
            subjDetail.issues.push({ severity: "ERROR", topicId: topic.id, questionId: q.id, message: `${qContext}: correctIndex (${q.correctIndex}) is not an integer` });
            report.summary.errorsCount++;
          } else if (q.correctIndex < 0 || q.correctIndex >= q.options.length) {
            subjDetail.issues.push({
              severity: "ERROR",
              topicId: topic.id,
              questionId: q.id,
              message: `${qContext}: INVALID correctIndex ${q.correctIndex}! Must be between 0 and ${q.options.length - 1}.`,
            });
            report.summary.errorsCount++;
          }
        }

        if (!q.explanation || typeof q.explanation !== "string" || q.explanation.trim() === "") {
          subjDetail.issues.push({ severity: "ERROR", topicId: topic.id, questionId: q.id, message: `${qContext}: Missing or empty explanation` });
          report.summary.errorsCount++;
        }
      }
    } else {
      subjDetail.issues.push({ severity: "WARNING", topicId: topic.id, message: `${topicContext}: No questions array found` });
      report.summary.warningsCount++;
    }
  }

  report.m2SubjectDetails[targetSubjId] = subjDetail;
}

console.log("=== RESULTS SUMMARY ===");
console.log(JSON.stringify(report.summary, null, 2));

console.log("\n=== GLOBAL DUPLICATE ID CHECKS ===");
console.log(`Duplicate Topic IDs: ${report.globalChecks.duplicateTopicIds.length}`);
console.log(`Duplicate Question IDs: ${report.globalChecks.duplicateQuestionIds.length}`);

if (report.globalChecks.duplicateTopicIds.length > 0) {
  console.log("Duplicate Topic IDs Details:", JSON.stringify(report.globalChecks.duplicateTopicIds, null, 2));
}

if (report.globalChecks.duplicateQuestionIds.length > 0) {
  console.log("Duplicate Question IDs Details:", JSON.stringify(report.globalChecks.duplicateQuestionIds, null, 2));
}

console.log("\n=== M2 SUBJECT DETAILS ===");
for (const [sId, detail] of Object.entries(report.m2SubjectDetails)) {
  const errors = detail.issues.filter(i => i.severity === "ERROR" || i.severity === "CRITICAL");
  const warnings = detail.issues.filter(i => i.severity === "WARNING");
  console.log(`\nSubject: ${detail.title} (${sId})`);
  console.log(`- Topics: ${detail.topicsCount}`);
  console.log(`- Questions: ${detail.questionsCount}`);
  console.log(`- Videos: ${detail.videosCount}`);
  console.log(`- Errors: ${errors.length}, Warnings: ${warnings.length}`);

  if (errors.length > 0) {
    console.log("  ERRORS:");
    errors.forEach(e => console.log(`   ❌ ${e.message}`));
  }
  if (warnings.length > 0) {
    console.log("  WARNINGS:");
    warnings.forEach(w => console.log(`   ⚠️ ${w.message}`));
  }
}

// Write raw JSON report to workspace
fs.writeFileSync(
  path.join("c:\\Users\\мишка\\Desktop\\сайтик_бахчасарай\\.agents\\challenger_m2_1", "audit_raw_results.json"),
  JSON.stringify(report, null, 2),
  "utf8"
);

console.log("\nRaw audit results saved to audit_raw_results.json");
