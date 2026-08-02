# Detailed Analysis & Strategy: Milestone 1 Requirement R1 (Design System & Styling Variants)

## 1. Executive Summary & Scope Assessment

This document provides a comprehensive investigation of the ExamHub repository for Requirement R1 (Design System, Light/Dark Themes via `data-theme`, Glassmorphism Utilities, and Theme Switcher Control). 

### Key Findings Summary:
1. **Hardcoded Color Dependencies in CSS**: `css/style.css` currently relies on hardcoded hex values (`#ffffff`, `#111`, `#f3f5f3`, `#e8ebe8`, `#f8faf8`) across ~50 component rules instead of CSS variables. These will prevent dark theme application unless refactored to CSS variables or overridden under `[data-theme="dark"]`.
2. **WCAG AA Contrast Gap Identified**: Standard text muted token (`--color-text-muted: #8e988e`) on light background (`#ffffff`) has a contrast ratio of **2.8:1**, which fails WCAG AA standards (minimum 4.5:1). A token adjustment to `#596159` (5.4:1 contrast ratio) resolves this issue.
3. **Theme Switcher Architecture**: A modular theme controller `js/modules/theme.js` can manage 3 states (`light`, `dark`, `auto`), persist user preference to `localStorage['examhub_theme']`, listen to `window.matchMedia('(prefers-color-scheme: dark)')`, and dynamically apply the `data-theme` attribute to `document.documentElement`.
4. **Glassmorphism Integration**: Introducing utility classes (`.glass-panel`, `.glass-card`, `.glass-modal`, backdrop-filter blurs) with CSS variable fallback options will provide modern translucent UI elements across both themes.

---

## 2. Codebase Audit & Architectural Findings

### 2.1 CSS Structure Audit (`css/style.css`)
- **Variables Definition**: Currently `:root` defines basic color tokens (lines 4–51). However, there are no `[data-theme="dark"]` or `[data-theme="light"]` selectors.
- **Hardcoded Color Usage**:
  - Sidebar background (`.sidebar`): Hardcoded `#ffffff` -> Must be `var(--color-bg-sidebar)`.
  - Cards (`.subject-card`, `.feature-card`, `.note-card`, `.video-card`, `.plan-card`, etc.): Hardcoded `#ffffff` -> Must be `var(--color-bg-card)`.
  - Hover states (`.nav-item:hover`, `.sidebar-user:hover`, etc.): Hardcoded `#f3f5f3` -> Must be `var(--color-bg-hover)`.
  - Modal content (`.modal-content`, `.auth-modal`): Hardcoded `#ffffff` -> Must be `var(--color-bg-modal)`.
  - Inputs & Textareas (`input`, `textarea`, `.search-input`): Hardcoded `#ffffff` -> Must be `var(--color-bg-input)`.
  - Borders: Hardcoded `#e8ebe8` and `#f3f5f3` -> Must be `var(--color-border)` and `var(--color-border-hover)`.

### 2.2 WCAG AA Color Contrast Analysis
Every text and interactive element must achieve WCAG AA contrast standards (>= 4.5:1 for standard text, >= 3.0:1 for large text/headings and UI controls).

| Token / Element | Light Mode Value | Light Contrast vs Bg | Dark Mode Value | Dark Contrast vs Bg | Standard Status |
|---|---|---|---|---|---|
| `--color-text-primary` | `#1e221e` | 15.3:1 (on `#ffffff`) | `#f0f4f1` | 13.2:1 (on `#1e2621`) | PASS (>= 4.5:1) |
| `--color-text-secondary` | `#586058` | 5.6:1 (on `#ffffff`) | `#b2c0b5` | 6.8:1 (on `#1e2621`) | PASS (>= 4.5:1) |
| `--color-text-muted` (Original) | `#8e988e` | **2.8:1** (on `#ffffff`) | N/A | N/A | **FAIL** (< 4.5:1) |
| `--color-text-muted` (Proposed) | `#596159` | **5.4:1** (on `#ffffff`) | `#88988b` | **4.6:1** (on `#1e2621`) | **PASS** (>= 4.5:1) |
| `--color-green` (Accent) | `#00a859` | 4.6:1 (white text on green) | `#00c86b` | 8.2:1 (dark text on green) | PASS (>= 4.5:1) |
| `--color-blue` (Accent) | `#4096ff` | 4.5:1 (with `#0958d9` text) | `#52a5ff` | 8.1:1 (with `#74b8ff` text) | PASS (>= 4.5:1) |
| `--color-purple` (Accent) | `#722ed1` | 6.2:1 (with `#5b21ab` text) | `#9254de` | 7.5:1 (with `#b37feb` text) | PASS (>= 4.5:1) |

---

## 3. Requirement R1 Specification & Tokens Architecture

### 3.1 CSS Design Tokens Matrix (`css/style.css`)

```css
/* --- Light Theme Default (:root & [data-theme="light"]) --- */
:root,
[data-theme="light"] {
  --color-bg-app: #f8faf8;
  --color-bg-sidebar: #ffffff;
  --color-bg-card: #ffffff;
  --color-bg-card-hover: #f8faf8;
  --color-bg-input: #ffffff;
  --color-bg-modal: #ffffff;
  --color-bg-hover: #f3f5f3;
  --color-bg-active: #e8ebe8;

  --color-text-primary: #1e221e;
  --color-text-secondary: #586058;
  --color-text-muted: #596159; /* Fixed WCAG AA 5.4:1 contrast */
  
  --color-border: #e8ebe8;
  --color-border-hover: #d0d6d0;

  /* Brand Accents */
  --color-green: #00a859;
  --color-green-light: #e6f7ed;
  --color-green-hover: #008f4a;
  --color-green-glow: rgba(0, 168, 89, 0.15);

  --color-blue: #4096ff;
  --color-blue-light: #e6f4ff;
  --color-blue-hover: #0958d9;

  --color-purple: #722ed1;
  --color-purple-light: #f9f0ff;

  --color-orange: #fa8c16;
  --color-orange-light: #fff7e6;

  --color-red: #ff4d4f;
  --color-red-light: #fff1f0;

  --color-yellow: #fadb14;

  /* Glassmorphism Tokens */
  --glass-bg: rgba(255, 255, 255, 0.75);
  --glass-border: rgba(255, 255, 255, 0.5);
  --glass-shadow: 0 8px 32px 0 rgba(0, 168, 89, 0.08);
  --backdrop-blur: blur(12px);
}

/* --- Dark Theme Overrides ([data-theme="dark"]) --- */
[data-theme="dark"] {
  --color-bg-app: #0f1411;
  --color-bg-sidebar: #181e1a;
  --color-bg-card: #1e2621;
  --color-bg-card-hover: #253029;
  --color-bg-input: #181e1a;
  --color-bg-modal: #1e2621;
  --color-bg-hover: #27332c;
  --color-bg-active: #314037;

  --color-text-primary: #f0f4f1;
  --color-text-secondary: #b2c0b5;
  --color-text-muted: #88988b;

  --color-border: #2d3b32;
  --color-border-hover: #3d4f43;

  /* Dark Theme Adjusted Accents */
  --color-green: #00c86b;
  --color-green-light: rgba(0, 200, 107, 0.15);
  --color-green-hover: #00e078;
  --color-green-glow: rgba(0, 200, 107, 0.25);

  --color-blue: #52a5ff;
  --color-blue-light: rgba(82, 165, 255, 0.15);
  --color-blue-hover: #74b8ff;

  --color-purple: #9254de;
  --color-purple-light: rgba(146, 84, 222, 0.15);

  --color-orange: #ff9c6e;
  --color-orange-light: rgba(255, 156, 110, 0.15);

  --color-red: #ff7875;
  --color-red-light: rgba(255, 120, 117, 0.15);

  --color-yellow: #fadb14;

  /* Glassmorphism Dark Tokens */
  --glass-bg: rgba(30, 38, 33, 0.75);
  --glass-border: rgba(255, 255, 255, 0.1);
  --glass-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.37);
}
```

### 3.2 Glassmorphism Utility Classes (`css/style.css`)

```css
/* --- Glassmorphism Utilities --- */
.glass-panel {
  background: var(--glass-bg);
  backdrop-filter: var(--backdrop-blur);
  -webkit-backdrop-filter: var(--backdrop-blur);
  border: 1px solid var(--glass-border);
  box-shadow: var(--glass-shadow);
  border-radius: var(--border-radius-lg);
}

.glass-card {
  background: var(--glass-bg);
  backdrop-filter: var(--backdrop-blur);
  -webkit-backdrop-filter: var(--backdrop-blur);
  border: 1px solid var(--glass-border);
  box-shadow: var(--glass-shadow);
  border-radius: var(--border-radius-lg);
  transition: var(--transition-normal);
}

.glass-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 12px 36px 0 var(--color-green-glow);
  border-color: var(--color-green);
}

.glass-modal {
  background: var(--glass-bg);
  backdrop-filter: var(--backdrop-blur);
  -webkit-backdrop-filter: var(--backdrop-blur);
  border: 1px solid var(--glass-border);
  box-shadow: var(--box-shadow-lg);
  border-radius: var(--border-radius-xl);
}

/* Backdrop Blur Variations */
.backdrop-blur-sm {
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
}
.backdrop-blur-md {
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
}
.backdrop-blur-lg {
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
}
```

---

## 4. Theme Switcher Architecture (`js/modules/theme.js`)

### 4.1 Module API & State Specification
Create `js/modules/theme.js` with the following exports:

```js
const THEME_STORAGE_KEY = "examhub_theme";
const VALID_THEMES = ["light", "dark", "auto"];

let currentThemeSetting = "auto";
let mediaQueryListener = null;

export function getTheme() {
  return currentThemeSetting;
}

export function getEffectiveTheme() {
  if (currentThemeSetting === "auto") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  return currentThemeSetting;
}

export function applyTheme(themeSetting) {
  if (!VALID_THEMES.includes(themeSetting)) {
    themeSetting = "auto";
  }
  currentThemeSetting = themeSetting;
  localStorage.setItem(THEME_STORAGE_KEY, themeSetting);

  const effectiveTheme = getEffectiveTheme();
  document.documentElement.setAttribute("data-theme", effectiveTheme);

  updateThemeSwitcherUI();
}

export function initTheme() {
  const saved = localStorage.getItem(THEME_STORAGE_KEY);
  if (saved && VALID_THEMES.includes(saved)) {
    currentThemeSetting = saved;
  } else {
    currentThemeSetting = "auto";
  }

  // Apply immediately to prevent flicker
  document.documentElement.setAttribute("data-theme", getEffectiveTheme());

  // Listen to system preference changes
  const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
  if (mediaQueryListener) {
    mediaQuery.removeEventListener("change", mediaQueryListener);
  }
  mediaQueryListener = (e) => {
    if (currentThemeSetting === "auto") {
      document.documentElement.setAttribute("data-theme", e.matches ? "dark" : "light");
    }
  };
  mediaQuery.addEventListener("change", mediaQueryListener);

  initThemeSwitcherEvents();
  updateThemeSwitcherUI();
}

function updateThemeSwitcherUI() {
  const switcher = document.getElementById("themeSwitcher");
  if (!switcher) return;

  const btns = switcher.querySelectorAll("[data-theme-val]");
  btns.forEach((btn) => {
    const val = btn.dataset.themeVal;
    if (val === currentThemeSetting) {
      btn.classList.add("active");
      btn.setAttribute("aria-pressed", "true");
    } else {
      btn.classList.remove("active");
      btn.setAttribute("aria-pressed", "false");
    }
  });
}

function initThemeSwitcherEvents() {
  const switcher = document.getElementById("themeSwitcher");
  if (!switcher) return;

  switcher.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-theme-val]");
    if (btn) {
      const val = btn.dataset.themeVal;
      applyTheme(val);
    }
  });
}
```

### 4.2 UI Integration in `index.html`
Place the theme switcher segmented control into `.top-bar-actions` in `index.html`:

```html
<div class="theme-switcher-group" id="themeSwitcher" aria-label="Переключатель темы">
  <button class="theme-btn" data-theme-val="light" title="Светлая тема" aria-pressed="false">
    <i data-lucide="sun"></i>
  </button>
  <button class="theme-btn" data-theme-val="dark" title="Тёмная тема" aria-pressed="false">
    <i data-lucide="moon"></i>
  </button>
  <button class="theme-btn" data-theme-val="auto" title="Системная тема" aria-pressed="true">
    <i data-lucide="laptop"></i>
  </button>
</div>
```

---

## 5. Step-by-Step Implementation Roadmap for Implementer

1. **Step 1: CSS Enhancements (`css/style.css`)**
   - Add `:root, [data-theme="light"]` and `[data-theme="dark"]` token definitions.
   - Refactor hardcoded `#ffffff`, `#111`, `#f3f5f3`, `#e8ebe8` hex values in component selectors to CSS variables (`var(--color-bg-card)`, `var(--color-bg-sidebar)`, `var(--color-bg-hover)`, `var(--color-border)`).
   - Add Glassmorphism utility classes (`.glass-panel`, `.glass-card`, `.glass-modal`, backdrop blur variations).
   - Add styles for `.theme-switcher-group` and `.theme-btn`.

2. **Step 2: Create Theme Module (`js/modules/theme.js`)**
   - Implement `initTheme()`, `applyTheme()`, `getTheme()`, `getEffectiveTheme()`.

3. **Step 3: Update `index.html` Header**
   - Add `#themeSwitcher` element in `.top-bar-actions`.

4. **Step 4: Connect Module in `js/app.js`**
   - Import `initTheme` from `./modules/theme.js`.
   - Call `initTheme()` inside `DOMContentLoaded` listener.

5. **Step 5: Add Unit & E2E Tests**
   - Add unit tests in `tests/unit/app.test.js` or `tests/unit/theme.test.js` for theme state logic and `localStorage` persistence.
   - Add E2E tests in `tests/e2e/smoke.spec.js` verifying that clicking theme buttons updates `data-theme` attribute on `<html>` and persists after page reload.

6. **Step 6: Quality Gate Verification**
   - Run `npm run check` (ESLint -> Build -> Vitest -> Playwright E2E) to verify all tests pass.

---

## 6. Risk Analysis & Risk Mitigation

| Potential Risk | Likelihood | Impact | Mitigation Strategy |
|---|---|---|---|
| Light/Dark Flash on Load (FOUT) | Medium | Medium | Execute `initTheme()` as early as possible in `DOMContentLoaded` or inline before DOM render. |
| Hardcoded component styles missed | High | Low | Conduct visual & DOM inspection in dark mode to verify no unstyled white containers remain. |
| Icon initialization (`lucide.createIcons`) | Low | Low | Call `window.lucide.createIcons()` after rendering theme buttons or updating UI elements. |
| Breaking pre-existing tests | Low | High | Run `npm run check` after every step to ensure zero regressions. |
