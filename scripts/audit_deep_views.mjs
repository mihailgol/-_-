import { chromium } from "@playwright/test";
import fs from "fs";
import path from "path";

const VIEWPORTS = [
  { name: "iPhone_SE_320", width: 320, height: 568 },
  { name: "iPhone_12_390", width: 390, height: 844 },
  { name: "Android_360", width: 360, height: 800 },
  { name: "iPad_768", width: 768, height: 1024 },
  { name: "iPad_Air_820", width: 820, height: 1180 },
  { name: "iPad_Pro_1024", width: 1024, height: 1366 },
  { name: "Landscape_Phone_844x390", width: 844, height: 390 },
];

const VIEWS = [
  "subjects",
  "notes",
  "videos",
  "tests",
  "mock-exam",
  "plan",
  "analytics",
  "cart",
  "profile",
  "support",
  "teacher",
];

const MODALS = [
  "teacherModal",
  "referenceMaterialsModal",
  "authModal",
  "premiumModal",
  "videoModal",
  "allSubjectsModal",
  "adminModal",
  "adminLoginModal",
  "createMockModal",
  "selfAssessmentModal",
  "teacherReviewModal",
];

const outDir = path.resolve("test-results/deep-audit");
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

async function runDeepAudit() {
  const browser = await chromium.launch({ headless: true });
  const results = [];

  for (const vp of VIEWPORTS) {
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      hasTouch: true,
      isMobile: vp.width <= 900,
    });
    const page = await context.newPage();
    await page.goto("http://localhost:8000", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(500);

    const vpResult = {
      viewport: vp.name,
      viewsIssues: {},
      modalsIssues: {},
    };

    // Check views
    for (const view of VIEWS) {
      await page.evaluate(async (v) => {
        const { switchView } = await import("/js/modules/navigation.js");
        switchView(v);
      }, view);
      await page.waitForTimeout(300);

      const issue = await page.evaluate((v) => {
        const viewEl = document.getElementById(`view-${v}`);
        if (!viewEl) return { error: "View element not found" };

        const doc = document.documentElement;
        const hScroll = doc.scrollWidth > window.innerWidth;
        const _viewRect = viewEl.getBoundingClientRect();

        // Check if view content is hidden behind bottom nav
        const bNav = document.querySelector(".mobile-bottom-nav");
        let contentCoveredByNav = false;
        let lastElementOverlap = null;
        if (bNav && window.getComputedStyle(bNav).display !== "none") {
          const bRect = bNav.getBoundingClientRect();
          const lastEl = viewEl.querySelector("button:last-of-type, .btn:last-of-type, p:last-of-type, div:last-child");
          if (lastEl) {
            const lRect = lastEl.getBoundingClientRect();
            // check if last element sits underneath the nav
            if (lRect.bottom > bRect.top && lRect.top < bRect.bottom) {
              contentCoveredByNav = true;
              lastElementOverlap = {
                element: lastEl.tagName + (lastEl.className ? "." + lastEl.className : ""),
                lBottom: lRect.bottom,
                bNavTop: bRect.top,
              };
            }
          }
        }

        // Check overflowing children inside view
        const overflowing = [];
        const children = viewEl.querySelectorAll("*");
        for (const c of children) {
          const r = c.getBoundingClientRect();
          if (r.right > window.innerWidth + 2 && r.width > 0 && r.height > 0) {
            const s = window.getComputedStyle(c);
            if (s.display !== "none" && s.visibility !== "hidden") {
              overflowing.push({
                tag: c.tagName,
                id: c.id,
                className: c.className ? String(c.className).slice(0, 40) : "",
                width: Math.round(r.width),
                right: Math.round(r.right),
              });
            }
          }
        }

        // Check for buttons with insufficient touch target (<44px in both dims)
        const touchTargets = [];
        const buttons = viewEl.querySelectorAll("button, .btn, a, input, select");
        for (const btn of buttons) {
          const r = btn.getBoundingClientRect();
          if (r.width > 0 && r.height > 0 && (r.width < 44 || r.height < 44)) {
            const s = window.getComputedStyle(btn);
            if (s.display !== "none" && s.visibility !== "hidden") {
              touchTargets.push({
                text: (btn.innerText || "").trim().slice(0, 15),
                tag: btn.tagName,
                className: btn.className ? String(btn.className).slice(0, 30) : "",
                w: Math.round(r.width),
                h: Math.round(r.height),
              });
            }
          }
        }

        return {
          hScroll,
          docScrollWidth: doc.scrollWidth,
          innerWidth: window.innerWidth,
          overflowingCount: overflowing.length,
          overflowing: overflowing.slice(0, 5),
          contentCoveredByNav,
          lastElementOverlap,
          touchTargetsCount: touchTargets.length,
          smallTouchTargets: touchTargets.slice(0, 5),
        };
      }, view);

      vpResult.viewsIssues[view] = issue;

      // Save screenshot for each view on mobile 320, 390, tablet 768, landscape
      if (["iPhone_SE_320", "iPhone_12_390", "iPad_768", "Landscape_Phone_844x390"].includes(vp.name)) {
        await page.screenshot({
          path: path.join(outDir, `${vp.name}_view_${view}.png`),
        });
      }
    }

    // Check modals
    for (const mId of MODALS) {
      await page.evaluate((id) => {
        const m = document.getElementById(id);
        if (m) m.classList.add("active");
      }, mId);
      await page.waitForTimeout(150);

      const mIssue = await page.evaluate((id) => {
        const m = document.getElementById(id);
        if (!m) return { notFound: true };
        const card = m.querySelector(".modal-card");
        if (!card) return { noCard: true };
        const r = card.getBoundingClientRect();
        const _style = window.getComputedStyle(card);
        const _modalStyle = window.getComputedStyle(m);

        const clippedTop = r.top < 0;
        const clippedBottom = r.bottom > window.innerHeight;
        const clippedLeft = r.left < 0;
        const clippedRight = r.right > window.innerWidth;
        const tooWide = r.width > window.innerWidth;
        const tooTall = r.height > window.innerHeight;

        // Check if close button is accessible
        const closeBtn = card.querySelector(".modal-close-btn, [data-close-modal]");
        let closeBtnAccessible = false;
        if (closeBtn) {
          const cbRect = closeBtn.getBoundingClientRect();
          closeBtnAccessible = cbRect.top >= 0 && cbRect.bottom <= window.innerHeight && cbRect.left >= 0 && cbRect.right <= window.innerWidth;
        }

        return {
          clippedTop,
          clippedBottom,
          clippedLeft,
          clippedRight,
          tooWide,
          tooTall,
          cardWidth: Math.round(r.width),
          cardHeight: Math.round(r.height),
          cardTop: Math.round(r.top),
          viewportW: window.innerWidth,
          viewportH: window.innerHeight,
          closeBtnAccessible,
          hasScroll: card.scrollHeight > card.clientHeight || m.scrollHeight > m.clientHeight,
        };
      }, mId);

      vpResult.modalsIssues[mId] = mIssue;

      if (["iPhone_SE_320", "iPhone_12_390", "Landscape_Phone_844x390"].includes(vp.name) && (mIssue.clippedBottom || mIssue.tooTall || mIssue.clippedTop)) {
        await page.screenshot({
          path: path.join(outDir, `${vp.name}_modal_${mId}.png`),
        });
      }

      await page.evaluate((id) => {
        const m = document.getElementById(id);
        if (m) m.classList.remove("active");
      }, mId);
    }

    results.push(vpResult);
    await context.close();
  }

  await browser.close();
  fs.writeFileSync(path.join(outDir, "deep_audit_summary.json"), JSON.stringify(results, null, 2));
  console.log("Deep audit completed!");
}

runDeepAudit().catch((e) => {
  console.error("Deep audit error:", e);
  process.exit(1);
});
