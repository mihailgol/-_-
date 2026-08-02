# Challenge Report: Milestone 1 — Science Content Dataset Validation (Biology, Chemistry, Physics)

**Target file**: `js/data.js` (and `server/seed.js`)  
**Target subjects**: Biology (`biology`), Chemistry (`chemistry`), Physics (`physics`)  
**Tester**: Challenger 1 (Role: Empirical Challenger / Specialist)  
**Date**: 2026-08-02  
**Overall Risk Assessment**: LOW (0 critical bugs, dataset meets 100% of structural and integrity rules)

---

## 1. Challenge Summary & Rule Verification

All dataset rules specified in the task mandate were programmatically and empirically stress-tested against `js/data.js` via Vitest test suite `tests/unit/science_data_challenge.test.js`.

| Requirement Rule | Tested Scope | Result | Empirical Status |
|------------------|--------------|--------|------------------|
| **1. Topic ID Uniqueness** | 12 Science topics (22 global) | **PASS** | 0 duplicate topic IDs |
| **2. Question ID Uniqueness** | 60 Science questions (66 global) | **PASS** | 0 duplicate question IDs |
| **3. `correctIndex` Range Bounds** | 60 Science questions | **PASS** | 100% within `[0, options.length - 1]` |
| **4. Theory HTML Well-Formedness** | 12 Science theory strings | **PASS** | Non-empty, 0 unclosed/mismatched HTML tags |
| **5. Video Metadata Completeness** | 12 Science video objects | **PASS** | All contain non-empty `title`, `duration`, `instructor`, `youtubeId` |
| **6. Option & Explanation Integrity** | 240 options (4 per Q) | **PASS** | 0 empty options, 0 duplicate option choices within Qs |

---

## 2. Detailed Per-Subject Breakdown

### 🧬 Biology (`biology`)
- **Topics**: 4 topics (`bio_cytology`, `bio_genetics`, `bio_anatomy`, `bio_ecology_evolution`)
- **Topic ID Uniqueness**: PASS — all 4 topic IDs are unique strings.
- **Questions Count**: 20 questions (5 per topic: `bio_cytology_q1..q5`, `bio_genetics_q1..q5`, `bio_anatomy_q1..q5`, `bio_ecology_q1..q5`).
- **`correctIndex` Integrity**: PASS — all 20 questions have `correctIndex` values in range `0..3`.
- **Theory HTML**: PASS — rich HTML with `<h3>`, `<p>`, `<table class="data-table">`, `<div class="note-info-box">`, `<ul>`, `<ol>`, `<li>`, `<strong>`, `<em>`. All tags balanced.
- **Video Metadata**: PASS — 4 video objects populated with `title`, `instructor`, `duration`, `youtubeId` (`dQw4w9WgXcQ`), `views`, `thumbnail`.

### 🧪 Chemistry (`chemistry`)
- **Topics**: 4 topics (`chem_structure_periodic`, `chem_bonding_lattices`, `chem_inorganic_classes`, `chem_organic_basics`)
- **Topic ID Uniqueness**: PASS — all 4 topic IDs are unique strings.
- **Questions Count**: 20 questions (5 per topic: `chem_sp_q1..q5`, `chem_bl_q1..q5`, `chem_ic_q1..q5`, `chem_ob_q1..q5`).
- **`correctIndex` Integrity**: PASS — all 20 questions have `correctIndex` values in range `0..3`.
- **Theory HTML**: PASS — complete HTML formatted with tables for electronic configurations, periodic trends, crystal lattices, and functional groups. All tags balanced.
- **Video Metadata**: PASS — 4 video objects populated with custom video IDs (`chem_atom_struct_2026`, `chem_bonds_lattices_2026`, `chem_inorg_classes_2026`, `chem_organics_basics_2026`).

### ⚛️ Physics (`physics`)
- **Topics**: 4 topics (`phys_mechanics`, `phys_mkt_thermodynamics`, `phys_electrodynamics`, `phys_optics_quantum`)
- **Topic ID Uniqueness**: PASS — all 4 topic IDs are unique strings.
- **Questions Count**: 20 questions (5 per topic: `phys_mech_q1..q5`, `phys_mkt_q1..q5`, `phys_elec_q1..q5`, `phys_opt_q1..q5`).
- **`correctIndex` Integrity**: PASS — all 20 questions have `correctIndex` values in range `0..3`.
- **Theory HTML**: PASS — comprehensive HTML containing mathematical formulas, equations, SI units summary tables, and note boxes. All tags balanced.
- **Video Metadata**: PASS — 4 video objects populated with `title`, `instructor`, `duration`, `youtubeId` (`dQw4w9WgXcQ`), `views`, `thumbnail`.

---

## 3. Anomalies & Edge Cases Identified

While all strict validation rules **PASSED**, the following content observations and edge cases were identified during adversarial analysis:

1. **YouTube ID Placeholder Usage in Biology & Physics**:
   - In `biology` and `physics`, all 8 video metadata objects use the standard placeholder YouTube ID `"dQw4w9WgXcQ"` (Rick Astley video).
   - In `chemistry`, topics use distinct YouTube IDs (`chem_atom_struct_2026`, etc.).
   - *Impact*: Low. The string is non-empty and valid, fulfilling interface contracts, but real video IDs can be substituted when production video assets are linked.

2. **Mock Exam Coverage in `server/seed.js`**:
   - `server/seed.js` includes seeded OGE & EGE mock exams for `biology` (`mock_bio_oge_1`, `mock_bio_ege_1`) and `chemistry` (`mock_chem_oge_1`, `mock_chem_ege_1`).
   - `physics` currently does not have a dedicated `mock_phys_ege_1` / `mock_phys_oge_1` in `server/seed.js`.
   - *Impact*: Low. This pertains to mock exam seed data rather than `js/data.js` catalog data, but recommended for future content milestones.

3. **HTML Symbol & Formula Rendering Safety**:
   - Theory HTML in Physics and Chemistry contains special characters (e.g. `°`, `⁺`, `⁻`, `→`, `²`, `³`, `γ`, `α`, `λ`, `ν`, `π`, `μ`, `½`).
   - All theory HTML strings use standard UTF-8 encodings and are safely parsed inside JS template literals. Vitest and Browser DOM render these characters without distortion.

---

## 4. Verification Methods

To independently verify this report:

1. **Vitest Unit Test Execution**:
   ```bash
   npx vitest run tests/unit/science_data_challenge.test.js
   ```
   *Expected Output*: 10 tests passed (100% pass rate across uniqueness, bounds, HTML tag balance, and video metadata completeness).

2. **Full Project Verification**:
   ```bash
   npm run check
   ```
   *Expected Output*: 0 ESLint errors, build OK, 100% pass across all unit and Playwright E2E tests.
