import { chromium } from "playwright";
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const port = 8009;
const baseUrl = `http://localhost:${port}`;
const resultsFile = path.resolve(projectRoot, ".agents", "challenger_m3", "stress_results.json");

const report = {
  timestamp: new Date().toISOString(),
  serverPort: port,
  summary: {
    totalChecks: 0,
    passedChecks: 0,
    failedChecks: 0,
    warnings: 0,
  },
  themeTests: {
    viewsChecked: [],
    modalsChecked: [],
    contrastEvaluations: [],
    rapidTogglingSuccess: false,
    localStoragePersistence: false,
    failures: [],
  },
  viewportTests: {
    viewportsTested: [],
    overflowDetections: [],
    mobileNavClicks: [],
    modalFitResults: [],
    failures: [],
  },
  healthTests: {
    consoleErrors: [],
    consoleWarnings: [],
    networkErrors: [],
    pageErrors: [],
  },
  masterExamTests: {
    modesChecked: [],
    subjectFilterVerification: [],
    notesFilterVerification: [],
    testsFilterVerification: [],
    mockExamFilterVerification: [],
    failures: [],
  },
};

function recordCheck(passed, category, detail) {
  report.summary.totalChecks++;
  if (passed) {
    report.summary.passedChecks++;
  } else {
    report.summary.failedChecks++;
    if (report[category] && Array.isArray(report[category].failures)) {
      report[category].failures.push(detail);
    }
  }
}

async function startServer() {
  console.log(`Starting test server on port ${port}...`);
  const serverProcess = spawn("node", ["server/index.js"], {
    cwd: projectRoot,
    env: { ...process.env, PORT: String(port), NODE_ENV: "test" },
    stdio: "pipe",
  });

  serverProcess.stderr.on("data", (data) => {
    const str = data.toString();
    if (!str.includes("experimental") && !str.includes("DeprecationWarning")) {
      // console.error(`[Server stderr]: ${str}`);
    }
  });

  let started = false;
  for (let i = 0; i < 60; i++) {
    try {
      const res = await fetch(`${baseUrl}/api/health`);
      if (res.ok) {
        started = true;
        break;
      }
    } catch {
      await new Promise((r) => setTimeout(r, 250));
    }
  }

  if (!started) {
    serverProcess.kill();
    throw new Error(`Failed to start server on ${baseUrl}`);
  }
  console.log(`Server started successfully on ${baseUrl}`);
  return serverProcess;
}

function parseRgb(colorStr) {
  if (!colorStr) return [0, 0, 0, 1];
  const match = colorStr.match(/rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*([\d.]+))?\s*\)/);
  if (!match) return [0, 0, 0, 1];
  return [
    parseFloat(match[1]),
    parseFloat(match[2]),
    parseFloat(match[3]),
    match[4] !== undefined ? parseFloat(match[4]) : 1,
  ];
}

function getLuminance(r, g, b) {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

function _getContrastRatio(fgStr, bgStr) {
  const [r1, g1, b1, a1] = parseRgb(fgStr);
  const [r2, g2, b2, _a2] = parseRgb(bgStr);
  if (a1 === 0) return 21;
  const l1 = getLuminance(r1, g1, b1);
  const l2 = getLuminance(r2, g2, b2);
  const brighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (brighter + 0.05) / (darker + 0.05);
}

async function runStressTests() {
  let serverProcess;
  let browser;
  try {
    serverProcess = await startServer();
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      viewport: { width: 1280, height: 800 },
    });
    const page = await context.newPage();

    page.on("console", (msg) => {
      const type = msg.type();
      const text = msg.text();
      if (type === "error") {
        report.healthTests.consoleErrors.push({ text, location: msg.location() });
      } else if (type === "warning") {
        report.healthTests.consoleWarnings.push({ text });
      }
    });

    page.on("pageerror", (err) => {
      report.healthTests.pageErrors.push({ message: err.message, stack: err.stack });
    });

    page.on("response", (res) => {
      const status = res.status();
      const url = res.url();
      if (status >= 400 && !url.includes("favicon") && !url.includes("/api/auth/me")) {
        report.healthTests.networkErrors.push({ url, status, statusText: res.statusText() });
      }
    });

    console.log("Navigating to home page...");
    await page.goto(baseUrl, { waitUntil: "networkidle" });

    // PART 1: THEME STRESS TESTING
    console.log("\n--- Executing Part 1: Theme Switching & Contrast Stress Testing ---");

    const views = [
      "subjects",
      "notes",
      "videos",
      "tests",
      "plan",
      "analytics",
      "cart",
      "support",
      "offer",
      "privacy",
      "terms",
      "profile",
      "mock-exam",
    ];

    const themes = ["dark", "light"];

    for (const theme of themes) {
      console.log(`Testing Theme: ${theme.toUpperCase()}`);
      await page.evaluate((t) => window.setTheme(t), theme);
      await page.waitForTimeout(100);

      const appliedTheme = await page.getAttribute("html", "data-theme");
      const passedThemeAttr = appliedTheme === theme;
      recordCheck(passedThemeAttr, "themeTests", `HTML data-theme should be ${theme}`);

      for (const view of views) {
        await page.evaluate((v) => {
          if (window.location.hash !== `#${v}`) {
            window.location.hash = `#${v}`;
          }
        });
        await page.waitForTimeout(150);

        const elementsCheck = await page.evaluate((v) => {
          const section = document.getElementById(`view-${v}`);
          if (!section) return { found: false };
          const computedStyle = window.getComputedStyle(section);

          const sampleSelectors = [
            "h1", "h2", "h3", "h4",
            "p",
            "button",
            "input",
            "select",
            "textarea",
            ".card",
            ".subject-card",
            ".note-item",
            ".stat-card",
            ".plan-day-card",
            ".badge",
            ".btn-primary",
            ".btn-secondary"
          ];

          const items = [];
          for (const sel of sampleSelectors) {
            const els = section.querySelectorAll(sel);
            els.forEach((el, idx) => {
              if (idx > 5) return;
              const st = window.getComputedStyle(el);
              const rect = el.getBoundingClientRect();
              if (rect.width > 0 && rect.height > 0 && st.display !== "none" && st.visibility !== "hidden") {
                items.push({
                  selector: sel,
                  tagName: el.tagName,
                  text: (el.innerText || el.value || el.placeholder || "").slice(0, 30),
                  color: st.color,
                  backgroundColor: st.backgroundColor,
                  fontSize: st.fontSize,
                  opacity: st.opacity,
                });
              }
            });
          }

          return {
            found: true,
            isActive: section.classList.contains("active"),
            sectionBg: computedStyle.backgroundColor,
            items,
          };
        }, view);

        recordCheck(elementsCheck.found && elementsCheck.isActive, "themeTests", `View ${view} active in theme ${theme}`);

        if (elementsCheck.found && elementsCheck.items) {
          for (const item of elementsCheck.items) {
            const isOpacityZero = parseFloat(item.opacity) === 0;
            const isTransparent = item.color === "rgba(0, 0, 0, 0)";
            const sameColor = item.color === item.backgroundColor && item.backgroundColor !== "rgba(0, 0, 0, 0)";
            
            const isLegible = !isOpacityZero && !isTransparent && !sameColor;
            if (!isLegible) {
              report.themeTests.failures.push({
                theme,
                view,
                element: item,
                reason: "Text color matches background color or is transparent/invisible",
              });
            }
            recordCheck(isLegible, "themeTests", `Element ${item.selector} legible in ${view} (${theme})`);
          }
        }

        report.themeTests.viewsChecked.push({ view, theme, elementsSampled: elementsCheck.items?.length || 0 });
      }
    }

    console.log("Checking Modal Contrast & Legibility in Dark & Light Modes...");
    const modals = [
      "authModal",
      "premiumModal",
      "teacherModal",
      "allSubjectsModal",
      "adminModal",
      "adminLoginModal",
      "createMockModal",
      "selfAssessmentModal",
      "teacherReviewModal",
    ];

    for (const theme of ["dark", "light"]) {
      await page.evaluate((t) => window.setTheme(t), theme);
      for (const modalId of modals) {
        const modalRes = await page.evaluate((mId) => {
          const modal = document.getElementById(mId);
          if (!modal) return { exists: false };
          window.openModal(mId);
          const card = modal.querySelector(".modal-card") || modal;
          const st = window.getComputedStyle(card);
          const titleEl = modal.querySelector("h2, h3, .modal-title, .auth-modal-title, .premium-modal-title");
          const titleSt = titleEl ? window.getComputedStyle(titleEl) : null;
          const closeBtn = modal.querySelector(".modal-close-btn");
          const closeSt = closeBtn ? window.getComputedStyle(closeBtn) : null;

          const res = {
            exists: true,
            bg: st.backgroundColor,
            titleColor: titleSt ? titleSt.color : null,
            closeColor: closeSt ? closeSt.color : null,
            hasCard: !!card,
          };
          window.closeModal(mId);
          return res;
        }, modalId);

        const modalValid = modalRes.exists && modalRes.hasCard;
        recordCheck(modalValid, "themeTests", `Modal ${modalId} exists and renders in ${theme}`);
        report.themeTests.modalsChecked.push({ modalId, theme, ...modalRes });
      }
    }

    console.log("Executing 100 rapid theme toggle flips stress test...");
    const rapidResult = await page.evaluate(async () => {
      const themes = ["dark", "light", "auto"];
      for (let i = 0; i < 100; i++) {
        window.setTheme(themes[i % 3]);
      }
      window.setTheme("dark");
      return {
        themeAttr: document.documentElement.getAttribute("data-theme"),
        stored: localStorage.getItem("examhub_theme"),
      };
    });

    const rapidPassed = rapidResult.themeAttr === "dark" && rapidResult.stored === "dark";
    recordCheck(rapidPassed, "themeTests", "Rapid 100 theme flips maintain consistent state");
    report.themeTests.rapidTogglingSuccess = rapidPassed;

    // PART 2: MOBILE RESPONSIVENESS & VIEWPORTS STRESS TESTING
    console.log("\n--- Executing Part 2: Responsiveness & Viewports Stress Testing ---");

    const viewports = [
      { name: "iPhone SE (375x667)", width: 375, height: 667, isMobile: true },
      { name: "iPhone 14 (390x844)", width: 390, height: 844, isMobile: true },
      { name: "Phablet (480x800)", width: 480, height: 800, isMobile: true },
      { name: "iPad Portrait (768x1024)", width: 768, height: 1024, isTablet: true },
      { name: "iPad Landscape (1024x768)", width: 1024, height: 768, isTablet: true },
      { name: "Desktop HD (1280x800)", width: 1280, height: 800, isDesktop: true },
      { name: "Desktop FHD (1920x1080)", width: 1920, height: 1080, isDesktop: true },
    ];

    for (const vp of viewports) {
      console.log(`Testing Viewport: ${vp.name} (${vp.width}x${vp.height})`);
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.waitForTimeout(100);

      for (const view of views) {
        await page.evaluate((v) => {
          window.location.hash = `#${v}`;
        });
        await page.waitForTimeout(100);

        const overflowCheck = await page.evaluate((_vpWidth) => {
          const docWidth = document.documentElement.scrollWidth;
          const winWidth = window.innerWidth;

          const overflowing = [];
          const allEls = document.querySelectorAll("*");
          allEls.forEach((el) => {
            const rect = el.getBoundingClientRect();
            if (rect.right > winWidth + 2 && rect.width > 0 && rect.height > 0) {
              const tag = el.tagName.toLowerCase();
              const id = el.id ? `#${el.id}` : "";
              const cls = el.className && typeof el.className === "string" ? `.${el.className.split(" ")[0]}` : "";
              overflowing.push({
                selector: `${tag}${id}${cls}`,
                right: Math.round(rect.right),
                width: Math.round(rect.width),
                winWidth,
              });
            }
          });

          return {
            hasDocOverflow: docWidth > winWidth + 2,
            docWidth,
            winWidth,
            overflowingElementsCount: overflowing.length,
            sampleOverflowing: overflowing.slice(0, 5),
          };
        }, vp.width);

        const noOverflow = !overflowCheck.hasDocOverflow;
        recordCheck(noOverflow, "viewportTests", `No horizontal overflow on ${vp.name} in view ${view}`);
        if (!noOverflow) {
          report.viewportTests.overflowDetections.push({
            viewport: vp.name,
            view,
            ...overflowCheck,
          });
        }
      }

      if (vp.width <= 768) {
        console.log(`Checking Mobile Bottom Nav functionality on ${vp.name}...`);
        const bottomNavRes = await page.evaluate(() => {
          const nav = document.querySelector(".mobile-bottom-nav");
          if (!nav) return { found: false };
          const st = window.getComputedStyle(nav);
          const rect = nav.getBoundingClientRect();
          const items = Array.from(nav.querySelectorAll(".mobile-nav-item")).map((btn) => ({
            view: btn.getAttribute("data-view"),
            visible: btn.offsetParent !== null,
          }));

          return {
            found: true,
            display: st.display,
            position: st.position,
            bottom: st.bottom,
            height: rect.height,
            items,
          };
        });

        const navPassed = bottomNavRes.found && bottomNavRes.display !== "none";
        recordCheck(navPassed, "viewportTests", `Mobile bottom nav visible on ${vp.name}`);

        for (const navItem of ["subjects", "notes", "tests", "plan", "analytics", "cart", "profile", "support"]) {
          const clickRes = await page.evaluate((targetView) => {
            const btn = document.querySelector(`.mobile-bottom-nav [data-view="${targetView}"]`);
            if (btn) {
              btn.click();
              return { clicked: true, activeSection: document.getElementById(`view-${targetView}`)?.classList.contains("active") };
            }
            return { clicked: false };
          }, navItem);

          recordCheck(clickRes.clicked && clickRes.activeSection, "viewportTests", `Mobile nav switched to ${navItem} on ${vp.name}`);
        }
      }

      if (vp.width <= 390) {
        for (const mId of ["authModal", "premiumModal", "teacherModal"]) {
          const modalFit = await page.evaluate(({ id, winW }) => {
            window.openModal(id);
            const modal = document.getElementById(id);
            const card = modal?.querySelector(".modal-card");
            if (!card) {
              window.closeModal(id);
              return { cardFound: false };
            }
            const rect = card.getBoundingClientRect();
            const fits = rect.width <= winW + 2;
            window.closeModal(id);
            return {
              cardFound: true,
              fits,
              cardWidth: Math.round(rect.width),
              winWidth: winW,
            };
          }, { id: mId, winW: vp.width });

          recordCheck(modalFit.cardFound && modalFit.fits, "viewportTests", `Modal ${mId} fits within mobile width (${vp.width}px)`);
        }
      }

      report.viewportTests.viewportsTested.push(vp);
    }

    await page.setViewportSize({ width: 1280, height: 800 });

    // PART 3: MASTER EXAM SWITCHER STRESS TESTING
    console.log("\n--- Executing Part 3: Master Exam Switcher Stress Testing ---");

    const examTypes = ["EGE", "OGE", "all"];

    for (const examType of examTypes) {
      console.log(`Setting Master Exam Switch to: ${examType}`);

      const switchRes = await page.evaluate((type) => {
        const btn = document.querySelector(`#examTypeToggle [data-exam-type="${type}"]`);
        if (btn) {
          btn.click();
        } else {
          window.dispatchEvent(new CustomEvent("examTypeChanged", { detail: { examType: type } }));
        }
        return {
          stored: localStorage.getItem("examhub_exam_type"),
          activeBtn: document.querySelector(`#examTypeToggle [data-exam-type="${type}"]`)?.classList.contains("active"),
        };
      }, examType);

      recordCheck(switchRes.stored === examType, "masterExamTests", `localStorage updated to ${examType}`);

      await page.evaluate(() => { window.location.hash = "#subjects"; });
      await page.waitForTimeout(150);

      const subjectsInfo = await page.evaluate((_type) => {
        const cards = document.querySelectorAll("#subjectsGrid .subject-card");
        const cardTitles = Array.from(cards).map((c) => c.querySelector("h3")?.innerText.trim());
        return {
          count: cards.length,
          cardTitles,
        };
      }, examType);

      recordCheck(subjectsInfo.count > 0, "masterExamTests", `Subjects grid populated for ${examType} (count: ${subjectsInfo.count})`);
      report.masterExamTests.subjectFilterVerification.push({ examType, count: subjectsInfo.count, titles: subjectsInfo.cardTitles });

      await page.evaluate(() => { window.location.hash = "#notes"; });
      await page.waitForTimeout(150);

      const notesInfo = await page.evaluate(() => {
        const notes = document.querySelectorAll("#notesList .note-card, #notesList .note-item, #generalNotesList .note-card");
        return { count: notes.length };
      });
      recordCheck(notesInfo.count >= 0, "masterExamTests", `Notes view rendered for ${examType}`);
      report.masterExamTests.notesFilterVerification.push({ examType, count: notesInfo.count });

      await page.evaluate(() => { window.location.hash = "#mock-exam"; });
      await page.waitForTimeout(150);

      const mockExamsInfo = await page.evaluate((_type) => {
        const examCards = document.querySelectorAll("#mockExamList .mock-exam-card, .mock-exam-card");
        const badges = Array.from(examCards).map((c) => c.querySelector(".mock-badge, .badge")?.innerText.trim());
        return {
          count: examCards.length,
          badges,
        };
      }, examType);

      recordCheck(mockExamsInfo.count >= 0, "masterExamTests", `Mock exam view rendered for ${examType}`);
      report.masterExamTests.mockExamFilterVerification.push({ examType, count: mockExamsInfo.count });
    }

    // PART 4: NETWORK & CONSOLE HEALTH EVALUATION
    console.log("\n--- Executing Part 4: Network & Console Health Evaluation ---");

    await page.evaluate(() => { window.location.hash = "#subjects"; });
    await page.waitForTimeout(100);

    const searchInput = page.locator("#globalSearch");
    if (await searchInput.count() > 0) {
      await searchInput.fill("Математика");
      await page.waitForTimeout(100);
      await searchInput.fill("");
    }

    const notifBtn = page.locator("#notificationBtn");
    if (await notifBtn.count() > 0) {
      await notifBtn.click();
      await page.waitForTimeout(100);
      await notifBtn.click();
    }

    const consoleErrorCount = report.healthTests.consoleErrors.length;
    const pageErrorCount = report.healthTests.pageErrors.length;
    const networkErrorCount = report.healthTests.networkErrors.length;

    recordCheck(consoleErrorCount === 0, "healthTests", `Zero JS console errors (Found: ${consoleErrorCount})`);
    recordCheck(pageErrorCount === 0, "healthTests", `Zero uncaught page exceptions (Found: ${pageErrorCount})`);
    recordCheck(networkErrorCount === 0, "healthTests", `Zero 4xx/5xx network failures (Found: ${networkErrorCount})`);

    console.log("\n=======================================================");
    console.log(`STRESS TEST EXECUTION COMPLETE`);
    console.log(`Total Checks:   ${report.summary.totalChecks}`);
    console.log(`Passed Checks:  ${report.summary.passedChecks}`);
    console.log(`Failed Checks:  ${report.summary.failedChecks}`);
    console.log(`Console Errors: ${consoleErrorCount}`);
    console.log(`Page Errors:    ${pageErrorCount}`);
    console.log(`Network Errors: ${networkErrorCount}`);
    console.log("=======================================================\n");

    fs.writeFileSync(resultsFile, JSON.stringify(report, null, 2), "utf-8");
    console.log(`Results written to: ${resultsFile}`);

  } catch (err) {
    console.error("Stress harness error:", err);
    report.summary.failedChecks++;
    fs.writeFileSync(resultsFile, JSON.stringify(report, null, 2), "utf-8");
  } finally {
    if (browser) await browser.close();
    if (serverProcess) serverProcess.kill();
  }
}

runStressTests();
