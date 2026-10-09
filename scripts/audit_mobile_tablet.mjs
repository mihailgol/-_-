import { chromium } from "@playwright/test";
import fs from "fs";
import path from "path";
import { spawn } from "child_process";

const VIEWPORTS = [
  { name: "iPhone_SE_320x568", width: 320, height: 568 },
  { name: "iPhone_SE_landscape_568x320", width: 568, height: 320 },
  { name: "iPhone_8_375x667", width: 375, height: 667 },
  { name: "iPhone_8_landscape_667x375", width: 667, height: 375 },
  { name: "iPhone_12_390x844", width: 390, height: 844 },
  { name: "iPhone_12_landscape_844x390", width: 844, height: 390 },
  { name: "iPhone_XR_414x896", width: 414, height: 896 },
  { name: "iPhone_XR_landscape_896x414", width: 896, height: 414 },
  { name: "iPhone_15PM_430x932", width: 430, height: 932 },
  { name: "iPhone_15PM_landscape_932x430", width: 932, height: 430 },
  { name: "Android_360x800", width: 360, height: 800 },
  { name: "Android_landscape_800x360", width: 800, height: 360 },
  { name: "Pixel_412x915", width: 412, height: 915 },
  { name: "Pixel_landscape_915x412", width: 915, height: 412 },
  { name: "iPad_portrait_768x1024", width: 768, height: 1024 },
  { name: "iPad_landscape_1024x768", width: 1024, height: 768 },
  { name: "iPad_Air_820x1180", width: 820, height: 1180 },
  { name: "iPad_Air_landscape_1180x820", width: 1180, height: 820 },
  { name: "iPad_Pro_1024x1366", width: 1024, height: 1366 },
  { name: "iPad_Pro_landscape_1366x1024", width: 1366, height: 1024 },
];

const outDir = path.resolve("test-results/audit-responsive");
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

async function ensureServer() {
  const health = await fetch("http://localhost:8000/api/health").catch(() => null);
  if (!health || health.status !== 200) {
    const _srv = spawn("node", ["server/index.js"], {
      stdio: "pipe",
      env: { ...process.env, PORT: "8000" },
    });
    for (let i = 0; i < 30; i++) {
      await new Promise((r) => setTimeout(r, 500));
      const res = await fetch("http://localhost:8000/api/health").catch(() => null);
      if (res && res.status === 200) break;
    }
  }
}

async function runAudit() {
  await ensureServer();
  const browser = await chromium.launch({ headless: true });
  const findings = [];

  for (const vp of VIEWPORTS) {
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      hasTouch: true,
      isMobile: vp.width <= 900,
    });
    const page = await context.newPage();
    await page.goto("http://localhost:8000", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(600);

    // 1. Check Root Horizontal Overflow
    const overflowInfo = await page.evaluate(() => {
      const doc = document.documentElement;
      const body = document.body;
      const scrollWidth = Math.max(doc.scrollWidth, body.scrollWidth);
      const clientWidth = doc.clientWidth;
      const hasHScroll = scrollWidth > clientWidth;

      // Find overflowing elements
      const overflowingElements = [];
      const all = document.querySelectorAll("*");
      for (const el of all) {
        const rect = el.getBoundingClientRect();
        if (rect.right > clientWidth + 2 && rect.width > 0 && rect.height > 0) {
          const style = window.getComputedStyle(el);
          if (style.display !== "none" && style.visibility !== "hidden") {
            overflowingElements.push({
              tag: el.tagName,
              id: el.id,
              className: el.className,
              rect: { left: rect.left, right: rect.right, width: rect.width },
            });
          }
        }
      }

      // Check Bottom Nav layout
      const bNav = document.querySelector(".mobile-bottom-nav");
      let bottomNavInfo = null;
      if (bNav) {
        const bRect = bNav.getBoundingClientRect();
        const bStyle = window.getComputedStyle(bNav);
        bottomNavInfo = {
          display: bStyle.display,
          visible: bRect.width > 0 && bRect.height > 0,
          top: bRect.top,
          bottom: bRect.bottom,
          height: bRect.height,
          zIndex: bStyle.zIndex,
          paddingBottom: bStyle.paddingBottom,
        };
      }

      // Check Top Bar layout
      const topBar = document.querySelector(".top-bar");
      let topBarInfo = null;
      if (topBar) {
        const tRect = topBar.getBoundingClientRect();
        topBarInfo = {
          width: tRect.width,
          scrollWidth: topBar.scrollWidth,
          overflow: topBar.scrollWidth > tRect.width,
        };
      }

      // Check Touch Target Sizes (< 44x44)
      const smallTargets = [];
      const clickables = document.querySelectorAll("button, a, input, select, .nav-item, .mobile-nav-item, .btn-tab");
      for (const el of clickables) {
        const r = el.getBoundingClientRect();
        const style = window.getComputedStyle(el);
        if (style.display !== "none" && style.visibility !== "hidden" && r.width > 0 && r.height > 0) {
          if (r.width < 44 || r.height < 44) {
            smallTargets.push({
              tag: el.tagName,
              id: el.id,
              text: el.innerText ? el.innerText.trim().slice(0, 20) : "",
              className: el.className,
              width: Math.round(r.width),
              height: Math.round(r.height),
            });
          }
        }
      }

      return {
        hasHScroll,
        scrollWidth,
        clientWidth,
        overflowingCount: overflowingElements.length,
        overflowingElements: overflowingElements.slice(0, 10),
        bottomNavInfo,
        topBarInfo,
        smallTargetsCount: smallTargets.length,
        smallTargets: smallTargets.slice(0, 10),
      };
    });

    findings.push({
      viewport: vp.name,
      ...overflowInfo,
    });

    // Take screenshot of main subjects view
    await page.screenshot({
      path: path.join(outDir, `${vp.name}_subjects.png`),
      fullPage: false,
    });

    // Check modal opening (e.g. Auth modal)
    await page.evaluate(() => {
      const m = document.getElementById("authModal");
      if (m) m.classList.add("active");
    });
    await page.waitForTimeout(200);

    const modalInfo = await page.evaluate(() => {
      const m = document.getElementById("authModal");
      if (!m) return null;
      const card = m.querySelector(".modal-card");
      if (!card) return null;
      const r = card.getBoundingClientRect();
      return {
        top: r.top,
        left: r.left,
        bottom: r.bottom,
        right: r.right,
        width: r.width,
        height: r.height,
        windowHeight: window.innerHeight,
        windowWidth: window.innerWidth,
        exceedsHeight: r.height > window.innerHeight,
        clipped: r.bottom > window.innerHeight || r.top < 0,
      };
    });

    if (modalInfo && modalInfo.clipped) {
      findings[findings.length - 1].authModalClipped = modalInfo;
    }

    await page.screenshot({
      path: path.join(outDir, `${vp.name}_modal_auth.png`),
    });

    await page.evaluate(() => {
      const m = document.getElementById("authModal");
      if (m) m.classList.remove("active");
    });

    await context.close();
  }

  await browser.close();

  fs.writeFileSync(path.join(outDir, "audit_summary.json"), JSON.stringify(findings, null, 2));
  console.log("Audit complete. Summary saved to test-results/audit-responsive/audit_summary.json");
  console.log(JSON.stringify(findings, null, 2));
}

runAudit().catch((err) => {
  console.error("Audit error:", err);
  process.exit(1);
});
