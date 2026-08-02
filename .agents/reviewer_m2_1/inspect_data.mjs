import { catalogData } from '../../js/data.js';

const M2_SUBJECTS = ['math', 'informatics', 'russian', 'social', 'history'];

console.log('--- STARTING MILESTONE 2 REVIEW INSPECTION ---');

const results = {
  subjectsChecked: [],
  errors: [],
  warnings: [],
  stats: {}
};

for (const subId of M2_SUBJECTS) {
  const subject = catalogData.subjects[subId];
  if (!subject) {
    results.errors.push(`Subject '${subId}' missing from catalogData.subjects`);
    continue;
  }

  results.subjectsChecked.push(subId);
  const topics = subject.topics || [];
  
  results.stats[subId] = {
    title: subject.title,
    topicCount: topics.length,
    topicsDetail: []
  };

  if (topics.length !== 4) {
    results.errors.push(`Subject '${subId}' has ${topics.length} topics (expected 4)`);
  }

  // Check distinct topic IDs and titles
  const topicIds = new Set();
  const topicTitles = new Set();

  topics.forEach((topic, tIdx) => {
    if (topicIds.has(topic.id)) {
      results.errors.push(`Subject '${subId}' duplicate topic ID: ${topic.id}`);
    }
    topicIds.add(topic.id);

    if (topicTitles.has(topic.title)) {
      results.errors.push(`Subject '${subId}' duplicate topic title: ${topic.title}`);
    }
    topicTitles.add(topic.title);

    const tDetail = {
      id: topic.id,
      title: topic.title,
      theoryLength: (topic.theory || '').length,
      hasH3: /<h3[^>]*>/i.test(topic.theory || ''),
      hasH4: /<h4[^>]*>/i.test(topic.theory || ''),
      hasInfoBox: /class="[^"]*note-info-box[^"]*"/i.test(topic.theory || ''),
      hasTable: /<table[^>]*class="[^"]*data-table[^"]*"/i.test(topic.theory || '') || /<table[^>]*>/i.test(topic.theory || ''),
      hasPreCode: /<pre><code>/i.test(topic.theory || '') || /<code>/i.test(topic.theory || ''),
      videoUrl: topic.videoUrl || (topic.video && topic.video.url) || null,
      videoTitle: topic.videoTitle || (topic.video && topic.video.title) || null,
      videoDuration: topic.videoDuration || (topic.video && topic.video.duration) || null,
      questionCount: (topic.questions || []).length,
      questionIssues: []
    };

    // Verify theory HTML tags
    if (!tDetail.hasH3) results.errors.push(`Subject '${subId}' topic '${topic.id}' missing <h3> in theory`);
    if (!tDetail.hasH4) results.errors.push(`Subject '${subId}' topic '${topic.id}' missing 4 in theory`);
    if (!tDetail.hasInfoBox) results.errors.push(`Subject '${subId}' topic '${topic.id}' missing <div class="note-info-box"> in theory`);
    if (!tDetail.hasTable) results.errors.push(`Subject '${subId}' topic '${topic.id}' missing <table class="data-table"> in theory`);
    if (subId === 'informatics' && !tDetail.hasPreCode) {
      results.warnings.push(`Informatics topic '${topic.id}' does not have <pre><code> (or code tag)`);
    }

    // Verify video metadata
    if (!tDetail.videoUrl && !topic.videoId) {
      results.errors.push(`Subject '${subId}' topic '${topic.id}' missing video metadata (videoUrl/videoId)`);
    }

    // Verify questions
    const questions = topic.questions || [];
    if (questions.length !== 5) {
      results.errors.push(`Subject '${subId}' topic '${topic.id}' has ${questions.length} questions (expected 5)`);
    }

    const questionTexts = new Set();

    questions.forEach((q, qIdx) => {
      const qNum = qIdx + 1;
      if (!q.text || q.text.trim().length < 5) {
        results.errors.push(`Subject '${subId}' topic '${topic.id}' Q${qNum} text is missing or too short`);
      }
      if (questionTexts.has(q.text)) {
        results.errors.push(`Subject '${subId}' topic '${topic.id}' Q${qNum} duplicate question text`);
      }
      questionTexts.add(q.text);

      if (!Array.isArray(q.options) || q.options.length < 2) {
        results.errors.push(`Subject '${subId}' topic '${topic.id}' Q${qNum} options invalid (length ${q.options ? q.options.length : 0})`);
      } else {
        q.options.forEach((opt, oIdx) => {
          if (typeof opt !== 'string' || opt.trim().length === 0) {
            results.errors.push(`Subject '${subId}' topic '${topic.id}' Q${qNum} option ${oIdx} is empty`);
          }
        });
      }

      if (typeof q.correctIndex !== 'number' || q.correctIndex < 0 || q.correctIndex >= (q.options ? q.options.length : 0)) {
        results.errors.push(`Subject '${subId}' topic '${topic.id}' Q${qNum} correctIndex ${q.correctIndex} out of bounds (options count: ${q.options ? q.options.length : 0})`);
      }

      if (!q.explanation || typeof q.explanation !== 'string' || q.explanation.trim().length < 10) {
        results.errors.push(`Subject '${subId}' topic '${topic.id}' Q${qNum} explanation missing or too short`);
      }

      // Check for placeholder text / cheat detection
      const textLower = (q.text + ' ' + (q.explanation || '')).toLowerCase();
      if (textLower.includes('lorem ipsum') || textLower.includes('todo') || textLower.includes('placeholder')) {
        results.errors.push(`INTEGRITY VIOLATION: Subject '${subId}' topic '${topic.id}' Q${qNum} contains placeholder text`);
      }
    });

    results.stats[subId].topicsDetail.push(tDetail);
  });
}

console.log(JSON.stringify(results, null, 2));
