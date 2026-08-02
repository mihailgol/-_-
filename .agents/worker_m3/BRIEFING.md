# BRIEFING — 2026-08-02T19:15:20Z

## Mission
Milestone 3: DB Sync & API Integration (update `server/db.js`, `server/seed.js`, `server/routes/catalog.js`, verify seed & run tests).

## 🔒 My Identity
- Archetype: implementer, qa, specialist
- Roles: implementer, qa, specialist
- Working directory: c:\Users\мишка\Desktop\сайтик_бахчасарай\.agents\worker_m3
- Original parent: e673ff19-9024-4136-8a23-ecd878887588
- Milestone: Milestone 3

## 🔒 Key Constraints
- Minimal change principle. No hardcoding or cheating.
- Must run `npm run check` or `npm run lint` & `npm run test` before completing.
- All interface/content in Russian, code in English.
- Log bugs in `.agent/bugs.md` if any found.

## Current Parent
- Conversation ID: e673ff19-9024-4136-8a23-ecd878887588
- Updated: 2026-08-02T19:15:20Z

## Task Summary
- **What to build**: 
  1. `server/db.js`: Update transaction isolation (`BEGIN IMMEDIATE`), add missing columns conditionally, add FK performance indexes.
  2. `server/seed.js`: Replace `INSERT OR IGNORE` with SQLite `UPSERT` syntax (`ON CONFLICT(id) DO UPDATE SET ...`) for subjects, topics, videos, questions, mock_exams.
  3. `server/routes/catalog.js`: Exclude active DB subjects from `OTHER_SUBJECTS` to prevent card duplicates on SPA frontend.
  4. Run `node server/seed.js` and verify database population.
  5. Run tests (`npm run lint`, `npm run test`, `npm run check`).
- **Success criteria**: All DB features properly updated, seed works with UPSERT without deleting user attempts, no duplicate subject cards, tests pass.
- **Interface contracts**: `/api/catalog/subjects` returns DB subjects + other subjects cleanly without duplication.

## Key Decisions Made
- [TBD]

## Artifact Index
- `.agents/worker_m3/ORIGINAL_REQUEST.md` — Original prompt and requirements
- `.agents/worker_m3/progress.md` — Progress tracker and heartbeat
- `.agents/worker_m3/handoff.md` — Final handoff report

## Change Tracker
- **Files modified**: None yet
- **Build status**: Untested
- **Pending issues**: None

## Quality Status
- **Build/test result**: Untested
- **Lint status**: Untested
- **Tests added/modified**: TBD

## Loaded Skills
- None
