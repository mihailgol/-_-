# ExamHub Project Execution Plan

## Objectives
1. Expand educational content across all 8 catalog subjects (Math, Russian, Social Studies, Biology, Chemistry, Physics, Informatics, History) with new topics, theoretical breakdowns, tables, formulas, practice tests with answers/explanations for both ЕГЭ and ОГЭ.
2. Integrate expanded content into `js/data.js`, SQLite database (`server/database.sqlite`), API endpoints (`/api/catalog/subjects`), and client filtering by exam type.
3. Validate quality across 100% of lint, unit, and E2E tests (`npm run check`).
4. Commit and push all changes to GitHub main branch (`mihailgol/-_-`).

## Phase 0: Survey & Discovery
- [ ] Dispatch 3 parallel Explorers to survey data schema, SQLite seeds, server routes, existing tests, and subject content requirements.
- [ ] Aggregate findings into `PROJECT.md` (Feature Inventory, Milestones, Code Layout, Interface Contracts).

## Phase 1: Content Generation (Milestone 1)
- [ ] Methodical generation of rich educational materials for all 8 subjects.
- [ ] Coverage of theory notes, formulas/tables, problem sets, and test variants for ЕГЭ and ОГЭ.

## Phase 2: DB & API Integration (Milestone 2)
- [ ] Update `js/data.js` seed data structure.
- [ ] Update SQLite DB schema / seed scripts (`server/database.sqlite`).
- [ ] Ensure `/api/catalog/subjects` returns all new content filtered correctly by exam type (ЕГЭ/ОГЭ).

## Phase 3: Verification & Quality Assurance (Milestone 3)
- [ ] Run full check suite (`npm run check` -> ESLint, validator, Vitest, Playwright E2E).
- [ ] Verify test suite against non-hardcoding rules and layout compliance.

## Phase 4: Release & Deployment (Milestone 4)
- [ ] Git commit with informative message.
- [ ] Git push to origin main.
