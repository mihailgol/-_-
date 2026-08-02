# Analysis Report: Express Server Routes & API Integration (Milestone 3)

**Author**: Explorer 3  
**Target Path**: `c:\Users\мишка\Desktop\сайтик_бахчасарай`  
**Working Folder**: `c:\Users\мишка\Desktop\сайтик_бахчасарай\.agents\explorer_m3_3`  
**Date**: 2026-08-02  

---

## 1. Executive Summary

This report presents an in-depth analysis of Express server routes (`/api/catalog/subjects` and related endpoints), SQLite database schema and seeding logic (`server/db.js`, `server/seed.js`, `server/routes/catalog.js`), and frontend data fetching modules (`js/app.js`, `js/modules/catalog.js`, `js/data.js`).

### Key Findings
1. **Duplicate Subject Display (`subjects` vs `otherSubjects`)**: `server/routes/catalog.js` returns a hardcoded `OTHER_SUBJECTS` array containing subjects (`russian`, `math`, `social`, `history`, `physics`, `informatics`, `english`, `literature`) that are already active in the SQLite `subjects` table. This causes the SPA frontend to render these 8 subjects **twice** on the main catalog screen and modal (once as active courses and once as locked "Скоро" cards).
2. **Locked Premium Topics Omit `questions` Array**: When a topic is locked for non-premium users, `server/routes/catalog.js` returns `questions: undefined`. This causes `js/modules/catalog.js` (`renderSubjectQuizzes`) to skip rendering the quiz card entirely, breaking the UI feature designed to display locked premium quiz previews with a "👑 Premium" badge and upgrade modal trigger.
3. **Seeding Strategy Uses `INSERT OR IGNORE`**: `server/seed.js` uses `INSERT OR IGNORE` when populating SQLite from `js/data.js`. If existing records are present in `data/examhub.db`, updates to theory content, videos, or questions in `js/data.js` are ignored on server startup.
4. **Field Mapping & Naming Consistency**: Field property names (`colorHex`, `bgGradient`, `youtubeId`, `options`, `correctIndex`, `explanation`) between backend queries and frontend expectations match correctly across all object models.

---

## 2. Express Server Routes & SQLite Database Architecture

### 2.1 Route Handler Inspection
- Entry point: `server/index.js` mounts catalog routes at `/api/catalog`:
  ```javascript
  app.use("/api/catalog", catalogRoutes);
  ```
- File: `server/routes/catalog.js`:
  - Route: `GET /api/catalog/subjects`
  - Handler: `buildCatalog(req.user)` with `optionalAuth` middleware.
  - Queries active subjects from DB:
    ```javascript
    const rows = db.prepare("SELECT * FROM subjects WHERE is_active = 1 ORDER BY sort_order").all();
    ```
  - For each subject, queries `topics` table sorted by `sort_order`.
  - For each topic, queries `videos` table (`WHERE topic_id = ?`) and `questions` table (`WHERE topic_id = ? ORDER BY sort_order`).

### 2.2 Database Schema (`server/db.js`)
- `subjects`: `id` (TEXT PK), `title` (TEXT), `icon` (TEXT), `color` (TEXT), `color_hex` (TEXT), `bg_gradient` (TEXT), `is_active` (INTEGER), `sort_order` (INTEGER)
- `topics`: `id` (TEXT PK), `subject_id` (TEXT FK), `title` (TEXT), `is_premium` (INTEGER), `duration` (TEXT), `theory` (TEXT), `sort_order` (INTEGER)
- `videos`: `id` (TEXT PK), `topic_id` (TEXT FK UNIQUE), `title` (TEXT), `instructor` (TEXT), `duration` (TEXT), `youtube_id` (TEXT), `views` (TEXT), `thumbnail` (TEXT)
- `questions`: `id` (TEXT PK), `topic_id` (TEXT FK), `type` (TEXT), `question` (TEXT), `options_json` (TEXT), `correct_index` (INTEGER), `explanation` (TEXT), `sort_order` (INTEGER)

### 2.3 Data Seeding (`server/seed.js`)
- Reads `js/data.js` using Node.js `vm.runInNewContext`.
- Iterates over `EXAM_DATA.subjects` and inserts subjects, topics, videos, and questions into SQLite via `INSERT OR IGNORE`.
- `js/data.js` contains 10 subjects: `biology`, `chemistry`, `russian`, `math`, `social`, `history`, `physics`, `informatics`, `english`, `literature`.

---

## 3. Frontend Data Fetching & Payload Comparison

### 3.1 Data Flow (`js/app.js` & `js/modules/catalog.js`)
1. On `DOMContentLoaded`, `js/app.js` executes `loadAppData()`:
   ```javascript
   const catalog = await api("/api/catalog/subjects");
   const subjectsMap = {};
   catalog.subjects.forEach((s) => { subjectsMap[s.id] = s; });
   window.EXAM_DATA = { subjects: subjectsMap, otherSubjects: catalog.otherSubjects };
   ```
2. Frontend renders views using `window.EXAM_DATA`:
   - Catalog Grid (`renderSubjects`): iterates `window.EXAM_DATA.subjects` (active) and `window.EXAM_DATA.otherSubjects` (locked).
   - Subject Detail (`loadSubjectDetail`): renders notes via `renderSubjectNotes`, videos via `renderSubjectVideos`, quizzes via `renderSubjectQuizzes`.
   - General Notes & Videos (`renderGeneralNotes`, `renderGeneralVideos`): iterates all topics across all subjects in `window.EXAM_DATA.subjects`.

### 3.2 Detailed Property Mapping Matrix

| Entity | Backend DB Column | `/api/catalog/subjects` JSON Property | Frontend Expectation | Status |
|---|---|---|---|---|
| Subject | `id` | `id` | `sub.id` | ✅ Matched |
| Subject | `title` | `title` | `sub.title` | ✅ Matched |
| Subject | `icon` | `icon` | `sub.icon` | ✅ Matched |
| Subject | `color` | `color` | `sub.color` | ✅ Matched |
| Subject | `color_hex` | `colorHex` | `sub.colorHex` | ✅ Matched |
| Subject | `bg_gradient` | `bgGradient` | `sub.bgGradient` | ✅ Matched |
| Topic | `id` | `id` | `topic.id` | ✅ Matched |
| Topic | `title` | `title` | `topic.title` | ✅ Matched |
| Topic | `is_premium` | `isPremium` (boolean) | `topic.isPremium` | ✅ Matched |
| Topic | `duration` | `duration` | `topic.duration` | ✅ Matched |
| Topic | `theory` | `theory` (`null` if locked) | `topic.theory` | ⚠️ Handled via overlay |
| Video | `title` | `video.title` | `v.title` | ✅ Matched |
| Video | `instructor` | `video.instructor` | `v.instructor` | ✅ Matched |
| Video | `duration` | `video.duration` | `v.duration` | ✅ Matched |
| Video | `youtube_id` | `video.youtubeId` | `v.youtubeId` | ✅ Matched |
| Video | `views` | `video.views` | `v.views` | ✅ Matched |
| Video | `thumbnail` | `video.thumbnail` | `v.thumbnail` | ✅ Matched |
| Question | `id` | `q.id` | `q.id` | ✅ Matched |
| Question | `type` | `q.type` | `q.type` | ✅ Matched |
| Question | `question` | `q.question` | `q.question` | ✅ Matched |
| Question | `options_json` | `q.options` (parsed JSON array) | `q.options` | ✅ Matched |
| Question | `correct_index` | `q.correctIndex` | `q.correctIndex` | ✅ Matched |
| Question | `explanation` | `q.explanation` | `q.explanation` | ✅ Matched |

---

## 4. Identified Discrepancies & Issues

### Issue 1: Duplicated Subjects (`subjects` vs `otherSubjects`)
- **Location**: `server/routes/catalog.js`, lines 7-17 & 70.
- **Problem**: `OTHER_SUBJECTS` lists `russian`, `math`, `social`, `history`, `physics`, `informatics`, `english`, `literature`. Because these 8 subjects are now active in SQLite (`subjects` table), they are returned in `catalog.subjects`. Returning them in `catalog.otherSubjects` as well causes the frontend to render them twice in `renderSubjects()` and `renderAllSubjectsModal()`.
- **Impact**: Duplicate cards appear on catalog UI (one interactive, one displaying "Скоро").

### Issue 2: Locked Premium Topics Omit `questions` Array
- **Location**: `server/routes/catalog.js`, line 55.
- **Problem**: `questions: locked ? undefined : questionRows.map(...)`.
- **Impact**: `js/modules/catalog.js` line 245 checks `if (!topic.questions || topic.questions.length === 0) return;`. Because `questions` is `undefined` for locked premium topics, the quiz card is never rendered for non-premium users. However, `renderSubjectQuizzes()` contains explicit logic to render premium quiz cards with a "👑 Premium" badge and open `premiumModal` when clicked. Returning `undefined` suppresses this preview.

### Issue 3: Non-Upserting Seed Strategy (`INSERT OR IGNORE`)
- **Location**: `server/seed.js`, lines 15-34.
- **Problem**: Using `INSERT OR IGNORE` skips existing rows in `data/examhub.db`. If `js/data.js` is updated with new theory HTML, new video links, or new questions for existing topics, the changes will not sync to the SQLite database without resetting the DB file.
- **Impact**: Server DB can become out of sync with updated source data in `js/data.js`.

---

## 5. Recommended API Endpoint & Server Changes

To ensure seamless integration between the SQLite DB API and the SPA frontend, the following precise changes are recommended for implementation:

### 1. Update `server/routes/catalog.js` for Dynamic `otherSubjects`
Modify `buildCatalog` to filter `OTHER_SUBJECTS` so that it excludes any subject `id` already present in the active `subjects` DB query:
```javascript
const activeSubjectIds = new Set(rows.map((s) => s.id));
const filteredOtherSubjects = OTHER_SUBJECTS.filter((sub) => !activeSubjectIds.has(sub.id));
return { subjects, otherSubjects: filteredOtherSubjects };
```

### 2. Sanitize Questions for Locked Topics instead of Omitting
Modify `questions` mapping in `server/routes/catalog.js` so non-premium users still receive question items without sensitive answer keys (`correctIndex` and `explanation`), or receive questions array with question metadata so the frontend can render the premium preview card:
```javascript
questions: locked
  ? questionRows.map((q) => ({
      id: q.id,
      type: q.type,
      question: q.question,
      options: JSON.parse(q.options_json),
      correctIndex: null,
      explanation: "Доступно в Premium",
    }))
  : questionRows.map((q) => ({
      id: q.id,
      type: q.type,
      question: q.question,
      options: JSON.parse(q.options_json),
      correctIndex: q.correct_index,
      explanation: q.explanation,
    }))
```

### 3. Change Seeding Statements to Upsert (`INSERT OR REPLACE`)
Update `server/seed.js` to use `INSERT OR REPLACE INTO` (or `ON CONFLICT DO UPDATE`) for `subjects`, `topics`, `videos`, and `questions` so that content updates in `js/data.js` are immediately reflected in `data/examhub.db` upon server start.

---

## 6. Verification Steps for Implementer

1. Run dev server: `npm run dev`
2. Perform API request: `curl http://localhost:8000/api/catalog/subjects`
3. Verify that `otherSubjects` contains ONLY `geography` (and no active subjects).
4. Verify that `subjects` array contains 10 active subjects with full `topics`, `video`, and `questions`.
5. Open http://localhost:8000 in browser:
   - Check catalog view: no duplicate subject cards.
   - Check subject detail view for a premium topic as guest/non-premium user: confirm premium quiz card renders with "👑 Premium" badge and opens upgrade modal on click.
6. Run full verification suite: `npm run check`.
