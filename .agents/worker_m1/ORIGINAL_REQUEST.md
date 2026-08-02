## 2026-08-01T09:03:59Z
You are Worker 1 for ExamHub Milestone 1 (R1: Design System & Styling Variants).

Your working directory is: `c:\Users\мишка\Desktop\сайтик_бахчасарай\.agents\worker_m1`
The project root is: `c:\Users\мишка\Desktop\сайтик_бахчасарай`

## Task Instructions:
Implement Requirement R1 (Design System & Styling Variants):
1. **Update `css/style.css`**:
   - Define complete color token sets under `:root, [data-theme="light"]` and `[data-theme="dark"]`.
   - Update `--color-text-muted` to `#596159` in light mode and `#88988b` in dark mode to pass WCAG AA contrast standard (4.5:1 ratio).
   - Replace hardcoded hex background/text colors in UI components with CSS variables (`var(--color-bg)`, `var(--color-surface)`, `var(--color-border)`, `var(--color-text)`, etc.).
   - Add glassmorphism classes (`.glass-panel`, `.glass-card`, `.glass-modal`, backdrop blur utilities) using CSS variables `--glass-bg`, `--glass-border`, `--glass-shadow`.
2. **Create `js/modules/theme.js`**:
   - Pure ES module managing `light`, `dark`, and `auto` themes.
   - Read/write `localStorage.getItem('examhub_theme')`.
   - Listen to `window.matchMedia('(prefers-color-scheme: dark)')` for `auto` mode.
   - Apply `data-theme` attribute to `document.documentElement`.
   - Export `initTheme()`, `setTheme(theme)`, `getTheme()`, `toggleTheme()`.
3. **Update `index.html` & `js/app.js`**:
   - Add theme toggle segmented control / button in `.top-bar-actions` in `index.html`.
   - Import `initTheme` in `js/app.js` and call it during initialization.
   - Note: Do NOT format `js/app.js` or `index.html` via Prettier (they are in `.prettierignore`).
4. **Project Rules**:
   - DO NOT ADD CODE COMMENTS without explicit user request.
   - All text/labels in UI must be in Russian. Variable names/CSS classes in English.
   - Run `npm run check` and ensure 100% green passing results for all 4 steps (ESLint, validate-project, Vitest, Playwright).
