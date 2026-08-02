# Adversarial Dataset Challenge Report — Milestone 2
**Target Subjects**: Math (`math`), Informatics (`informatics`), Russian (`russian`), Social Studies (`social`), History (`history`)
**Target File**: `js/data.js`
**Date**: 2026-08-02

---

## 1. Executive Summary & Risk Assessment

**Overall Risk Level**: **LOW** (Passes all automated & empirical dataset integrity checks)

Empirical adversarial verification was conducted on the dataset in `js/data.js` for all 5 subjects included in **Milestone 2** (Math, Informatics, Russian, Social Studies, History). 

All 5 subjects, their 20 constituent topics, 100 practice questions, and 20 video metadata records were audited programmatically and via static structure analysis for:
- Topic ID and Question ID uniqueness
- `correctIndex` bounds validation
- Theory HTML well-formedness & structure
- Video metadata completeness (title, duration, instructor, youtubeId)

---

## 2. Empirical Test Results by Dimension

### 2.1 Topic ID and Question ID Uniqueness

- **Topic IDs Audit**:
  - Total topics audited in Milestone 2: **20 topics** (4 per subject).
  - Duplicate Topic IDs found: **0**.
  - All Topic IDs are formatted cleanly using lowercase snake_case (e.g., `math_trigonometry`, `inf_num_systems`, `rus_orthoepy_lexic`, `soc_human_society`, `hist_ancient_rus`).

- **Question IDs Audit**:
  - Total questions audited in Milestone 2: **100 questions** (5 per topic).
  - Duplicate Question IDs found in M2: **0**.
  - Duplicate Question IDs found across the entire `EXAM_DATA` object: **0**.
  - All Question IDs follow a predictable naming convention (`[subj]_[topic_abbrev]_q[1-5]`).

---

### 2.2 Question & Option Integrity (`correctIndex` Validation)

- **Total Questions Audited**: 100 questions.
- **Options Array Length**: Exactly 4 options for all 100 questions.
- **`correctIndex` Range**: All `correctIndex` values are strictly integers in the range `0 <= correctIndex <= 3`.
- **Out-of-Bounds `correctIndex` Count**: **0**.
- **Empty Option Strings**: **0**.
- **Duplicate Option Values within same Question**: **0**.
- **Explanation Field Presence**: 100% of questions contain detailed, non-empty `explanation` strings explaining the correct answer.

---

### 2.3 Theory HTML Well-Formedness

- **Total Theory Strings Audited**: 20 HTML theory strings.
- **Non-Empty Check**: 20 / 20 non-empty strings (> 1500 characters per theory block).
- **Tag Balance Audit**: 
  - Checked opening and closing pair symmetry for container tags (`<div>`, `<p>`, `<h3>`, `<h4>`, `<table>`, `<thead>`, `<tbody>`, `<tr>`, `<td>`, `<th>`, `<ul>`, `<ol>`, `<li>`, `<strong>`, `<em>`, `<code>`, `<pre>`, `<span>`).
  - Unclosed HTML tags: **0**.
  - Mismatched HTML tags: **0**.
- **Placeholder Leak Audit**:
  - Checked for raw JS placeholder leaks (`undefined`, `null`, `NaN`, `[object Object]`).
  - Placeholder leaks found: **0**.
- **Math Formatting**: LaTeX / MathJax inline (`$...$`) and display (`$$...$$`) delimiters are properly escaped (`\\sin`, `\\cos`, `\\frac`) without unescaped syntax errors.

---

### 2.4 Video Metadata Objects

- **Total Video Objects Audited**: 20 video metadata objects (1 per topic).
- **Mandatory Fields Audit**:
  - `title`: 20 / 20 non-empty strings.
  - `duration`: 20 / 20 non-empty strings (formatted as `MM:SS`).
  - `instructor`: 20 / 20 non-empty strings.
  - `youtubeId`: 20 / 20 non-empty strings.
- **Instructor Breakdown**:
  - **Russian**: *Анастасия Русская* (4 topics)
  - **Math**: *Михаил Профиль* (2 topics), *Анна Геометриня* (1 topic), *Елена Вероятность* (1 topic)
  - **Social Studies**: *Елена Общество* (4 topics)
  - **History**: *Проф. Михаил Историков* (3 topics), *Д-р Ольга Лебедева* (1 topic)
  - **Informatics**: *Сергей Кодер* (4 topics)

---

## 3. Dataset Audit Matrix for Milestone 2

| Subject | Subject ID | Topics Count | Questions Count | Videos Count | Duplicate IDs | Bad `correctIndex` | Broken Theory HTML | Incomplete Video Metadata | Status |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Русский язык** | `russian` | 4 | 20 | 4 | 0 | 0 | 0 | 0 | **PASS** |
| **Математика** | `math` | 4 | 20 | 4 | 0 | 0 | 0 | 0 | **PASS** |
| **Обществознание** | `social` | 4 | 20 | 4 | 0 | 0 | 0 | 0 | **PASS** |
| **История** | `history` | 4 | 20 | 4 | 0 | 0 | 0 | 0 | **PASS** |
| **Информатика** | `informatics` | 4 | 20 | 4 | 0 | 0 | 0 | 0 | **PASS** |
| **TOTAL (M2)** | — | **20** | **100** | **20** | **0** | **0** | **0** | **0** | **PASS** |

---

## 4. Anomalies & Edge Cases Noted

1. **YouTube ID Reuse**:
   - All 20 video metadata objects currently use the standard Rickroll placeholder YouTube ID `"dQw4w9WgXcQ"`. 
   - *Assessment*: Acceptable for seed mock data, but production deployment with external video player integration will require replacing placeholder IDs with actual video content URLs.

2. **Math Expressions Escaping**:
   - Backslashes in LaTeX formulas within template strings (e.g. `\\sin`, `\\frac`, `\\mathbb{Z}`) are correctly double-escaped (`\\`) so that runtime evaluation in JS yields single backslashes without syntax error.

3. **Database Seed Alignment (`server/seed.js`)**:
   - `server/seed.js` loads `js/data.js` via `node:vm` and inserts topics, questions, and videos into SQLite tables `topics`, `questions`, and `videos`. The structure in `js/data.js` matches the database schema expected by `server/seed.js`.

---

## 5. Verification Commands

To re-verify the dataset integrity programmatically:

```bash
# 1. Run Vitest Unit Tests
npx vitest run tests/unit/data.test.js

# 2. Run Full Project Verification Suite
npm run check
```

**Verification Status**: All 100 questions, 20 topics, 20 videos, and 5 subjects in Milestone 2 pass all empirical challenge checks without error.
