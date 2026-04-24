#!/usr/bin/env node
/**
 * Capture annotated screenshots from a target URL using Playwright.
 *
 * For each "shot" config: navigate, scroll, inject a document-coord overlay
 * that outlines the relevant DOM nodes and adds caption + label tags, then
 * take a screenshot. The overlay is removed before the next shot.
 *
 * Annotations are positioned in document coordinates (page.scrollHeight)
 * — not viewport — so fullpage screenshots correctly stick the outlines
 * to their target elements throughout the scrolled height.
 *
 * Usage:
 *   node scripts/annotate-shots.mjs                 # all shots
 *   node scripts/annotate-shots.mjs <shotName...>   # only the named shots
 */

import { chromium } from "playwright";
import fs from "node:fs/promises";
import path from "node:path";

const TARGET_URL = "https://www.bottegaveneta.com/de-de/kaschmirpullover-navy-811456V4WD04121.html";
const OUT_DIR = path.resolve("public/thumbnails");
const VIEWPORT = { width: 1280, height: 800 };

const SHOTS = [
  {
    name: "bottega-evidence-vertical-stack",
    scrollY: 0,
    fullpage: true,
    title: "Pattern 01 · Vertical Block Image Stack",
    caption: "Volle Bildbreite, ein Block pro Image. Kein Carousel. Kein Thumbnail-Strip. Der User scrollt durch das Produkt wie durch eine Magazinstrecke. Editorial-Pacing statt Konfigurator.",
    annotations: [
      { selector: '[class*="topblockimages__imagecontainer"]', color: "#404e3e", label: "BLOCK · zwei-up auf Desktop" },
      { selector: '[class*="bottomblockimages__wrapper"]', color: "#404e3e", label: "BLOCK · weiter im Scroll" },
    ],
  },
  {
    name: "bottega-evidence-sticky-cta",
    scrollY: 2400,
    title: "Pattern 02 · Sticky Purchase Sheet",
    caption: "CTA, Größe und Preis bleiben anchored während der Bilderstapel passiert. Conversion entkoppelt von Discovery — Scroll-Tiefe und Add-to-Cart konkurrieren nicht mehr.",
    annotations: [
      { selector: '.l-product__stickyctawrapper, .l-pdp__bottom__sheet, [class*="stickyctawrapper"], [class*="bottom__sheet"]', color: "#b45309", label: "STICKY · fixed bottom sheet" },
    ],
  },
  {
    name: "bottega-evidence-twoup-block",
    scrollY: 200,
    title: "Pattern 03 · Two-Up Block on Desktop",
    caption: "Auf Desktop pairt das obere Bild-Stack zu einem Zwei-Spalten-Block (`c-pdp__blockimages--twoimages`). Mobile bleibt single-column. Same data, responsive composition.",
    annotations: [
      { selector: '.c-pdp__topblockimages__imagecontainer, [class*="topblockimages__imagecontainer"]', color: "#404e3e", label: "TWO-UP · CSS-Grid auf @lg" },
      { selector: '.c-pdp__topblockimages__image, [class*="topblockimages__image"]', color: "#1e5a82", label: "IMG · full-bleed" },
    ],
  },
];

const wanted = new Set(process.argv.slice(2));
const shots = wanted.size ? SHOTS.filter(s => wanted.has(s.name)) : SHOTS;
if (!shots.length) {
  console.error(`no matching shot. Known: ${SHOTS.map(s => s.name).join(", ")}`);
  process.exit(2);
}

await fs.mkdir(OUT_DIR, { recursive: true });

const browser = await chromium.launch({ headless: true });

for (const shot of shots) {
  console.log(`shot: ${shot.name}${shot.fullpage ? " · fullpage" : ` · scrollY=${shot.scrollY}`}`);

  const ctx = await browser.newContext({
    viewport: VIEWPORT,
    userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
    locale: "de-DE",
    deviceScaleFactor: 2,
  });
  const page = await ctx.newPage();
  await page.goto(TARGET_URL, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(2500);

  if (!shot.skipBannerDismiss) {
    await dismissBanners(page);
    await page.waitForTimeout(800);
  }

  // Prime lazyload by stepping through the page top→bottom
  if (shot.fullpage) {
    await primeLazyload(page);
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
    await page.waitForTimeout(1200);
  } else {
    await page.evaluate((y) => window.scrollTo({ top: y, behavior: "instant" }), shot.scrollY);
    await page.waitForTimeout(900);
  }

  await injectOverlay(page, shot);
  await page.waitForTimeout(300);

  const out = path.join(OUT_DIR, `${shot.name}.png`);
  await page.screenshot({
    path: out,
    fullPage: !!shot.fullpage,
    type: "png",
  });
  console.log(`  → ${path.relative(path.resolve("."), out)}`);

  await ctx.close();
}

await browser.close();
console.log("done.");

async function dismissBanners(page) {
  const candidates = [
    "#onetrust-accept-btn-handler",
    'button[aria-label*="ccept"]',
    'button[aria-label*="kzeptier"]',
    'button:has-text("Annehmen")',
    'button:has-text("Accept")',
    'button:has-text("Alles akzeptieren")',
    'button:has-text("Alle akzeptieren")',
  ];
  for (const sel of candidates) {
    try {
      const el = await page.$(sel);
      if (el && (await el.isVisible())) {
        await el.click({ delay: 60 });
        console.log(`  dismissed banner: ${sel}`);
        await page.waitForTimeout(800);
        return;
      }
    } catch { /* ignore */ }
  }
}

async function primeLazyload(page) {
  await page.evaluate(async () => {
    const total = document.documentElement.scrollHeight;
    const step = window.innerHeight * 0.7;
    let y = 0;
    while (y < total) {
      window.scrollTo({ top: y, behavior: "instant" });
      await new Promise(r => setTimeout(r, 220));
      y += step;
    }
    window.scrollTo({ top: total, behavior: "instant" });
    await new Promise(r => setTimeout(r, 600));
  });
}

async function injectOverlay(page, shot) {
  await page.evaluate((shot) => {
    const HOST_ID = "__pat-overlay__";
    let host = document.getElementById(HOST_ID);
    if (host) host.remove();

    host = document.createElement("div");
    host.id = HOST_ID;
    Object.assign(host.style, {
      position: "absolute",
      top: "0",
      left: "0",
      width: document.documentElement.scrollWidth + "px",
      height: document.documentElement.scrollHeight + "px",
      pointerEvents: "none",
      zIndex: "2147483646",
      fontFamily: "JetBrains Mono, ui-monospace, Menlo, Consolas, monospace",
    });
    document.body.appendChild(host);

    // Caption ribbon — pinned to current viewport top in document coords
    const ribbon = document.createElement("div");
    Object.assign(ribbon.style, {
      position: "absolute",
      top: window.scrollY + "px",
      left: "0",
      width: document.documentElement.scrollWidth + "px",
      padding: "18px 28px 20px",
      background: "rgba(255,255,255,0.97)",
      borderBottom: "2px solid #0f0f0f",
      color: "#0f0f0f",
      boxShadow: "0 8px 20px rgba(0,0,0,0.08)",
    });
    const t = document.createElement("div");
    t.textContent = shot.title;
    Object.assign(t.style, {
      fontSize: "12px",
      letterSpacing: "0.24em",
      textTransform: "uppercase",
      color: "#3a3a3a",
      marginBottom: "8px",
      fontFamily: "JetBrains Mono, ui-monospace, Menlo, monospace",
    });
    ribbon.appendChild(t);
    const c = document.createElement("div");
    c.textContent = shot.caption;
    Object.assign(c.style, {
      fontSize: "15px",
      lineHeight: "1.5",
      color: "#0f0f0f",
      maxWidth: "920px",
      fontFamily: "Inter, system-ui, sans-serif",
    });
    ribbon.appendChild(c);
    host.appendChild(ribbon);

    // Outline boxes — document-absolute coords so they survive fullpage capture
    const docY0 = window.scrollY;
    const docX0 = window.scrollX;
    let n = 0;
    for (const ann of shot.annotations || []) {
      let nodes;
      try { nodes = document.querySelectorAll(ann.selector); }
      catch { continue; }
      for (const m of nodes) {
        const r = m.getBoundingClientRect();
        if (r.width < 50 || r.height < 50) continue;
        const top = r.top + docY0;
        const left = r.left + docX0;

        const box = document.createElement("div");
        Object.assign(box.style, {
          position: "absolute",
          left: left + "px",
          top: top + "px",
          width: r.width + "px",
          height: r.height + "px",
          outline: `3px solid ${ann.color}`,
          outlineOffset: "-2px",
          background: ann.color + "1a",
          boxShadow: "0 0 0 1px rgba(255,255,255,0.7) inset",
        });
        host.appendChild(box);

        const tag = document.createElement("div");
        tag.textContent = ann.label;
        Object.assign(tag.style, {
          position: "absolute",
          left: left + "px",
          top: (top - 26) + "px",
          padding: "4px 10px",
          background: ann.color,
          color: "#fff",
          fontFamily: "JetBrains Mono, ui-monospace, Menlo, monospace",
          fontSize: "11px",
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          fontWeight: "500",
          whiteSpace: "nowrap",
        });
        host.appendChild(tag);
        n++;
        if (n > 8) break;
      }
    }
  }, shot);
}
