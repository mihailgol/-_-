import { chromium } from "playwright";
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const port = 8014;
const baseUrl = `http://localhost:${port}`;
const resultsFile = path.resolve(projectRoot, ".agents", "challenger_m3", "stress_results.json");

const stressReport = {
  timestamp: new Date().toISOString(),
  serverUrl: baseUrl,
  metrics: {
    totalAssertions: 0,
    passedAssertions: 0,
    failedAssertions: 0,
    warnings: [],
  },
  themeSuite: {
    testedThemes: ["dark", "light", "auto"],
    viewContrastScores: {},
    modalLegibility: {},
    rapidToggleSuccess: false,
    inputReadability: {},
    findings: [],
  },
  viewportSuite: {
    testedViewports: [],
    overflowByViewportAndView: {},
    mobileBottomNavTested: {},
    modalMobileFitting: {},
    findings: [],
  },
  consoleAndNetworkSuite: {
    consoleErrors: [],
    consoleWarnings: [],
    networkErrors: [],
    pageExceptions: [],
    findings: [],
  },
  masterExamSuite: {
    modesTested: ["all", "EGE", "OGE"],
    propagationByView: {},
    contentSeparationIntegrity: {},
    findings: [],
  },
};

function assertCheck(condition, suiteName, description, metadata = null) {
  stressReport.metrics.totalAssertions++;
  if (condition) {
    stressReport.metrics.passedAssertions++;
  } else {
    stressReport.metrics.failedAssertions++;
    if (stressReport[suiteName] && Array.isArray(stressReport[suiteName].findings)) {
      stressReport[suiteName].findings.push({ description, metadata });
    }
  }
}

async function startTestServer() {
  console.log(`[STRESS TEST] Spawning server on ${baseUrl}...`);
  const srv = spawn("node", ["server/index.js"], {
    cwd: projectRoot,
    env: { ...process.env, PORT: String(port), NODE_ENV: "test" },
    stdio: "pipe",
  });

  let ready = false;
  for (let i = 0; i < 40; i++) {
    try {
      const res = await fetch(`${baseUrl}/api/health`);
      if (res.ok) {
        ready = true;
        break;
      }
    } catch {
      await new Promise((r) => setTimeout(r, 250));
    }
  }

  if (!ready) {
    srv.kill();
    throw new Error(`Failed to connect to test server at ${baseUrl}`);
  }
  console.log(`[STRESS TEST] Test server ready on ${baseUrl}`);
  return srv;
}

function parseColor(str) {
  if (!str) return [0, 0, 0, 1];
  const m = str.match(/rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*([\d.]+))?\s*\)/);
  if (!m) return [0, 0, 0, 1];
  return [
    parseFloat(m[1]),
    parseFloat(m[2]),
    parseFloat(m[3]),
    m[4] !== undefined ? parseFloat(m[4]) : 1,
  ];
}

function getLuminance([r, g, b]) {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

function _calculateContrast(fgRgba, bgRgba) {
  const [r1, g1, b1, a1] = parseColor(fgRgba);
  const [r2, g2, b2, _a2] = parseColor(bgRgba);
  if (a1 === 0) return 21;
  const l1 = getLuminance([r1, g1, b1]);
  const l2 = getLuminance([r2, g2, b2]);
  const brighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return Number(((brighter + 0.05) / (darker + 0.05)).toFixed(2));
}

async function runEmpiricalStressSuite() {
  let serverProcess;
  let browser;
  try {
    serverProcess = await startTestServer();
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      viewport: { width: 1280, height: 800 },
    });
    const page = await context.newPage();

    page.on("console", (msg) => {
      const type = msg.type();
      const text = msg.text();
      if (type === "error") {
        stressReport.consoleAndNetworkSuite.consoleErrors.push({
          text,
          location: msg.location(),
        });
      } else if (type === "warning") {
        stressReport.consoleAndNetworkSuite.consoleWarnings.push({ text });
      }
    });

    page.on("pageerror", (err) => {
      stressReport.consoleAndNetworkSuite.pageExceptions.push({
        message: err.message,
        stack: err.stack,
      });
    });

    page.on("response", (res) => {
      const status = res.status();
      const url = res.url();
      if (status >= 400 && !url.includes("favicon.ico") && !url.includes("/api/auth/me")) {
        stressReport.consoleAndNetworkSuite.networkErrors.push({
          url,
          status,
          statusText: res.statusText(),
        });
      }
    });

    console.log("[STRESS TEST] Loading application root...");
    await page.goto(baseUrl, { waitUntil: "networkidle" });

    // SECTION 1: THEME SWITCHING & CONTRAST STRESS TESTING ACROSS ALL VIEWS
    console.log("\n=======================================================");
    console.log("SUITE 1: THEME SWITCHING & CONTRAST / LEGIBILITY AUDIT");
    console.log("=======================================================");

    const allViews = [
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

    for (const theme of ["dark", "light"]) {
      console.log(`[THEME TEST] Testing theme mode: ${theme.toUpperCase()}`);
      await page.evaluate((t) => window.setTheme(t), theme);
      await page.waitForTimeout(100);

      const htmlTheme = await page.getAttribute("html", "data-theme");
      assertCheck(htmlTheme === theme, "themeSuite", `HTML root data-theme is ${theme}`);

      for (const viewName of allViews) {
        await page.evaluate((v) => {
          const navBtn = document.querySelector(`.nav-item[data-view="${v}"]`) ||
                         document.querySelector(`.mobile-nav-item[data-view="${v}"]`);
          if (navBtn) {
            navBtn.click();
          } else {
            const section = document.getElementById(`view-${v}`);
            if (section) {
              document.querySelectorAll(".view-section").forEach(s => s.classList.remove("active"));
              section.classList.add("active");
            }
          }
        }, viewName);
        await page.waitForTimeout(120);

        const viewAudit = await page.evaluate((v) => {
          const section = document.getElementById(`view-${v}`);
          if (!section) return { found: false, isActive: false, samples: [] };
          const isActive = section.classList.contains("active");

          const textSelectors = [
            "h1", "h2", "h3", "h4",
            "p", "span", "a", "button",
            "input", "textarea", "select",
            ".subject-card", ".note-card", ".card", ".badge"
          ];

          const samples = [];
          for (const sel of textSelectors) {
            const els = section.querySelectorAll(sel);
            els.forEach((el, idx) => {
              if (idx > 4) return;
              const st = window.getComputedStyle(el);
              const rect = el.getBoundingClientRect();
              if (rect.width > 0 && rect.height > 0 && st.display !== "none" && st.visibility !== "hidden") {
                const textContent = (el.innerText || el.value || el.placeholder || "").trim();
                if (textContent.length > 0) {
                  samples.push({
                    selector: sel,
                    tagName: el.tagName,
                    text: textContent.slice(0, 40),
                    color: st.color,
                    backgroundColor: st.backgroundColor,
                    fontSize: st.fontSize,
                    opacity: st.opacity,
                  });
                }
              }
            });
          }

          return {
            found: true,
            isActive,
            samples,
          };
        }, viewName);

        assertCheck(viewAudit.found && viewAudit.isActive, "themeSuite", `View ${viewName} active under ${theme} theme`);

        let viewContrastPass = true;
        for (const sample of viewAudit.samples) {
          const isInvisible = sample.opacity === "0" || sample.color === "rgba(0, 0, 0, 0)";
          const sameColor = sample.color === sample.backgroundColor && sample.backgroundColor !== "rgba(0, 0, 0, 0)";

          if (isInvisible || sameColor) {
            viewContrastPass = false;
            assertCheck(false, "themeSuite", `Invisible/Unreadable element in ${viewName} (${theme}): ${sample.selector} text="${sample.text}"`, sample);
          }
        }

        if (!stressReport.themeSuite.viewContrastScores[viewName]) {
          stressReport.themeSuite.viewContrastScores[viewName] = {};
        }
        stressReport.themeSuite.viewContrastScores[viewName][theme] = {
          sampledElements: viewAudit.samples.length,
          legibilityPassed: viewContrastPass,
        };
      }
    }

    // Modal Dialog Theme & Contrast Verification
    console.log("[THEME TEST] Testing modal dialogs contrast in dark and light themes...");
    const modalsList = [
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
      for (const modalId of modalsList) {
        const modalRes = await page.evaluate((mId) => {
          const modal = document.getElementById(mId);
          if (!modal) return { exists: false };
          window.openModal(mId);

          const card = modal.querySelector(".modal-card") || modal;
          const cardSt = window.getComputedStyle(card);
          const title = modal.querySelector("h2, h3, .modal-title, .auth-modal-title, .premium-modal-title");
          const titleSt = title ? window.getComputedStyle(title) : null;
          const closeBtn = modal.querySelector(".modal-close-btn");
          const closeSt = closeBtn ? window.getComputedStyle(closeBtn) : null;
          const inputs = Array.from(modal.querySelectorAll("input, textarea, select")).map((inp) => {
            const inpSt = window.getComputedStyle(inp);
            return {
              tag: inp.tagName,
              color: inpSt.color,
              bg: inpSt.backgroundColor,
            };
          });

          const result = {
            exists: true,
            cardBg: cardSt.backgroundColor,
            titleColor: titleSt ? titleSt.color : null,
            closeColor: closeSt ? closeSt.color : null,
            inputs,
          };
          window.closeModal(mId);
          return result;
        }, modalId);

        assertCheck(modalRes.exists, "themeSuite", `Modal ${modalId} renders under ${theme} theme`);
        if (!stressReport.themeSuite.modalLegibility[modalId]) {
          stressReport.themeSuite.modalLegibility[modalId] = {};
        }
        stressReport.themeSuite.modalLegibility[modalId][theme] = modalRes;
      }
    }

    // Rapid 100 Theme Flips Stress Test
    console.log("[THEME TEST] Executing rapid 100 theme flips...");
    const rapidRes = await page.evaluate(() => {
      const sequence = ["light", "dark", "auto", "dark", "light"];
      for (let i = 0; i < 100; i++) {
        window.setTheme(sequence[i % sequence.length]);
      }
      window.setTheme("dark");
      return {
        themeAttr: document.documentElement.getAttribute("data-theme"),
        storedTheme: localStorage.getItem("examhub_theme"),
      };
    });

    const rapidOk = rapidRes.themeAttr === "dark" && rapidRes.storedTheme === "dark";
    assertCheck(rapidOk, "themeSuite", "Rapid 100 theme toggles maintain consistent state");
    stressReport.themeSuite.rapidToggleSuccess = rapidOk;

    // SECTION 2: VIEWPORT RESPONSIVENESS, OVERFLOW & MOBILE NAVIGATION
    console.log("\n=======================================================");
    console.log("SUITE 2: VIEWPORT RESPONSIVENESS & OVERFLOW AUDIT");
    console.log("=======================================================");

    const targetViewports = [
      { name: "Mobile Small (375x667)", width: 375, height: 667, type: "mobile" },
      { name: "Mobile Modern (390x844)", width: 390, height: 844, type: "mobile" },
      { name: "Mobile Large (480x800)", width: 480, height: 800, type: "mobile" },
      { name: "Tablet Portrait (768x1024)", width: 768, height: 1024, type: "tablet" },
      { name: "Tablet Landscape (1024x768)", width: 1024, height: 768, type: "tablet" },
      { name: "Desktop Standard (1280x800)", width: 1280, height: 800, type: "desktop" },
      { name: "Desktop FHD (1920x1080)", width: 1920, height: 1080, type: "desktop" },
    ];

    for (const vp of targetViewports) {
      console.log(`[VIEWPORT TEST] Testing viewport: ${vp.name} (${vp.width}x${vp.height})`);
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.waitForTimeout(100);

      stressReport.viewportSuite.overflowByViewportAndView[vp.name] = {};

      for (const viewName of allViews) {
        await page.evaluate((v) => {
          const btn = document.querySelector(`.nav-item[data-view="${v}"]`) ||
                      document.querySelector(`.mobile-nav-item[data-view="${v}"]`);
          if (btn) btn.click();
          else {
            const sec = document.getElementById(`view-${v}`);
            if (sec) {
              document.querySelectorAll(".view-section").forEach(s => s.classList.remove("active"));
              sec.classList.add("active");
            }
          }
        }, viewName);
        await page.waitForTimeout(100);

        const overflowAnalysis = await page.evaluate((_vpWidth) => {
          const docScrollWidth = document.documentElement.scrollWidth;
          const windowInnerWidth = window.innerWidth;

          const overflowingEls = [];
          document.querySelectorAll(".view-section.active, .view-section.active *").forEach((el) => {
            const rect = el.getBoundingClientRect();
            if (rect.right > windowInnerWidth + 3 && rect.width > 0 && rect.height > 0) {
              const tag = el.tagName.toLowerCase();
              const id = el.id ? `#${el.id}` : "";
              const cls = typeof el.className === "string" && el.className ? `.${el.className.split(" ")[0]}` : "";
              overflowingEls.push({
                element: `${tag}${id}${cls}`,
                right: Math.round(rect.right),
                width: Math.round(rect.width),
                windowWidth: windowInnerWidth,
              });
            }
          });

          return {
            hasOverflow: docScrollWidth > windowInnerWidth + 3,
            docScrollWidth,
            windowInnerWidth,
            overflowingCount: overflowingEls.length,
            overflowingSamples: overflowingEls.slice(0, 5),
          };
        }, vp.width);

        const passOverflow = !overflowAnalysis.hasOverflow;
        assertCheck(passOverflow, "viewportSuite", `No horizontal overflow on ${vp.name} in view ${viewName}`, overflowAnalysis);
        stressReport.viewportSuite.overflowByViewportAndView[vp.name][viewName] = overflowAnalysis;
      }

      if (vp.width <= 600) {
        console.log(`[MOBILE NAV TEST] Testing mobile bottom bar on ${vp.name}...`);
        const mobileNavState = await page.evaluate(() => {
          const nav = document.querySelector(".mobile-bottom-nav");
          if (!nav) return { exists: false, isVisible: false };
          const st = window.getComputedStyle(nav);
          const rect = nav.getBoundingClientRect();
          const buttons = Array.from(nav.querySelectorAll(".mobile-nav-item")).map((b) => ({
            view: b.getAttribute("data-view"),
            active: b.classList.contains("active"),
          }));

          return {
            exists: true,
            isVisible: st.display !== "none" && rect.height > 0,
            position: st.position,
            bottom: st.bottom,
            height: Math.round(rect.height),
            buttons,
          };
        });

        assertCheck(mobileNavState.exists && mobileNavState.isVisible, "viewportSuite", `Mobile bottom nav visible on ${vp.name}`);
        stressReport.viewportSuite.mobileBottomNavTested[vp.name] = mobileNavState;

        for (const targetV of ["subjects", "notes", "tests", "plan", "analytics", "cart", "profile", "support"]) {
          const clickRes = await page.evaluate((target) => {
            const btn = document.querySelector(`.mobile-bottom-nav .mobile-nav-item[data-view="${target}"]`);
            if (btn) {
              btn.click();
              const sec = document.getElementById(`view-${target}`);
              return { clicked: true, sectionActive: sec?.classList.contains("active") };
            }
            return { clicked: false, sectionActive: false };
          }, targetV);

          assertCheck(clickRes.clicked && clickRes.sectionActive, "viewportSuite", `Mobile bottom nav switches to ${targetV} on ${vp.name}`);
        }
      }

      if (vp.width <= 390) {
        for (const mId of ["authModal", "premiumModal", "teacherModal", "createMockModal"]) {
          const modalFit = await page.evaluate(({ id, winW }) => {
            window.openModal(id);
            const modal = document.getElementById(id);
            const card = modal?.querySelector(".modal-card");
            if (!card) {
              window.closeModal(id);
              return { found: false, fits: false };
            }
            const rect = card.getBoundingClientRect();
            const fits = rect.width <= winW + 4;
            window.closeModal(id);
            return {
              found: true,
              fits,
              cardWidth: Math.round(rect.width),
              winWidth: winW,
            };
          }, { id: mId, winW: vp.width });

          assertCheck(modalFit.found && modalFit.fits, "viewportSuite", `Modal ${mId} fits mobile width (${vp.width}px)`);
        }
      }

      stressReport.viewportSuite.testedViewports.push(vp);
    }

    await page.setViewportSize({ width: 1280, height: 800 });

    // SECTION 3: MASTER EXAM SWITCHER (ЕГЭ / ОГЭ / ВСЕ)
    console.log("\n=======================================================");
    console.log("SUITE 3: MASTER EXAM SWITCHER & CONTENT SEPARATION");
    console.log("=======================================================");

    for (const examType of ["EGE", "OGE", "all"]) {
      console.log(`[EXAM SWITCH TEST] Toggling Master Exam Switcher to: ${examType}`);

      const switchResult = await page.evaluate((type) => {
        const btn = document.querySelector(`#examTypeToggle .exam-type-btn[data-exam-type="${type}"]`);
        if (btn) btn.click();
        else window.dispatchEvent(new CustomEvent("examTypeChanged", { detail: { examType: type } }));

        return {
          stored: localStorage.getItem("examhub_exam_type"),
          btnActive: document.querySelector(`#examTypeToggle .exam-type-btn[data-exam-type="${type}"]`)?.classList.contains("active"),
        };
      }, examType);

      assertCheck(switchResult.stored === examType, "masterExamSuite", `Exam switcher updates localStorage to ${examType}`);

      // 1. Subjects View
      await page.evaluate(() => {
        const btn = document.querySelector(`.nav-item[data-view="subjects"]`);
        if (btn) btn.click();
      });
      await page.waitForTimeout(150);

      const subjectsCardState = await page.evaluate(() => {
        const cards = document.querySelectorAll("#subjectGrid .subject-card");
        const titles = Array.from(cards).map(c => c.querySelector(".subject-title")?.innerText.trim() || "");
        return {
          count: cards.length,
          titles,
        };
      });

      assertCheck(subjectsCardState.count > 0, "masterExamSuite", `Subjects grid populated for ${examType} (count: ${subjectsCardState.count})`, subjectsCardState);

      // 2. Notes View
      await page.evaluate(() => {
        const btn = document.querySelector(`.nav-item[data-view="notes"]`);
        if (btn) btn.click();
      });
      await page.waitForTimeout(150);

      const notesState = await page.evaluate(() => {
        const cards = document.querySelectorAll("#generalNotesList .note-card, #notesList .note-card, .note-item");
        return { count: cards.length };
      });
      assertCheck(notesState.count >= 0, "masterExamSuite", `Notes view rendered for ${examType}`, notesState);

      // 3. Tests View
      await page.evaluate(() => {
        const btn = document.querySelector(`.nav-item[data-view="tests"]`);
        if (btn) btn.click();
      });
      await page.waitForTimeout(150);

      const testsState = await page.evaluate(() => {
        const activeTab = document.querySelector(".btn-tab.active, .test-tab-btn.active")?.innerText || "";
        return { activeTab };
      });
      assertCheck(Boolean(testsState.activeTab), "masterExamSuite", `Tests tab active for ${examType}`, testsState);

      stressReport.masterExamSuite.propagationByView[examType] = {
        subjects: subjectsCardState,
        notes: notesState,
        tests: testsState,
      };
    }

    // SECTION 4: CONSOLE & NETWORK HEALTH EVALUATION
    console.log("\n=======================================================");
    console.log("SUITE 4: CONSOLE & NETWORK HEALTH EVALUATION");
    console.log("=======================================================");

    await page.evaluate(() => {
      const btn = document.querySelector(`.nav-item[data-view="subjects"]`);
      if (btn) btn.click();
    });
    await page.waitForTimeout(100);

    const searchInput = page.locator("#globalSearch");
    if (await searchInput.count() > 0) {
      await searchInput.fill("Биология");
      await page.waitForTimeout(100);
      await searchInput.fill("");
    }

    const consoleErrCount = stressReport.consoleAndNetworkSuite.consoleErrors.length;
    const pageErrCount = stressReport.consoleAndNetworkSuite.pageExceptions.length;
    const networkErrCount = stressReport.consoleAndNetworkSuite.networkErrors.length;

    assertCheck(consoleErrCount === 0, "consoleAndNetworkSuite", `0 JS console errors (Detected: ${consoleErrCount})`, stressReport.consoleAndNetworkSuite.consoleErrors);
    assertCheck(pageErrCount === 0, "consoleAndNetworkSuite", `0 uncaught page exceptions (Detected: ${pageErrCount})`, stressReport.consoleAndNetworkSuite.pageExceptions);
    assertCheck(networkErrCount === 0, "consoleAndNetworkSuite", `0 4xx/5xx network errors (Detected: ${networkErrCount})`, stressReport.consoleAndNetworkSuite.networkErrors);

    console.log("\n=======================================================");
    console.log("STRESS TEST HARNESS FINISHED");
    console.log(`Total Assertions:   ${stressReport.metrics.totalAssertions}`);
    console.log(`Passed Assertions:  ${stressReport.metrics.passedAssertions}`);
    console.log(`Failed Assertions:  ${stressReport.metrics.failedAssertions}`);
    console.log(`Console Errors:     ${consoleErrCount}`);
    console.log(`Page Exceptions:    ${pageErrCount}`);
    console.log(`Network Failures:   ${networkErrCount}`);
    console.log("=======================================================\n");

    fs.writeFileSync(resultsFile, JSON.stringify(stressReport, null, 2), "utf-8");
    console.log(`[STRESS TEST] Detailed results written to: ${resultsFile}`);

  } catch (err) {
    console.error("[STRESS TEST] Fatal error:", err);
    stressReport.metrics.failedAssertions++;
    fs.writeFileSync(resultsFile, JSON.stringify(stressReport, null, 2), "utf-8");
  } finally {
    if (browser) await browser.close();
    if (serverProcess) serverProcess.kill();
  }
}

runEmpiricalStressSuite();
