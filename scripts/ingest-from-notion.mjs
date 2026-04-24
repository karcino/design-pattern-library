#!/usr/bin/env node
/**
 * Ingest pattern entries from the Notion DB and append them to public/data/patterns.json.
 *
 * Workflow (called from a Claude Code session):
 *  1. Claude session calls notion-fetch on the data source URL.
 *  2. For each row whose slug isn't already in patterns.json:
 *      a. Hit the Hetzner thumbnailer (/info?url=...) → resolve banner URL.
 *      b. Download the banner to public/thumbnails/<slug>.webp.
 *      c. Use Claude (frontend-design skill) to extract tokens + patterns + notes.
 *      d. Append a new entry.
 *
 * This script handles the deterministic parts: slug derivation, thumbnail
 * download, JSON merge. The pattern-extraction call is delegated to the
 * Claude session that drives this script — see README for the full flow.
 *
 * Usage:
 *   node scripts/ingest-from-notion.mjs --rows '<rows-json>' [--dry-run]
 *
 * Where <rows-json> is a JSON array of { name, url, tags, notion_url }.
 * The Claude session prepares this array from notion-fetch output.
 */

import fs from "node:fs/promises";
import path from "node:path";

const THUMBNAILER_BASE = process.env.THUMBNAILER_BASE || "https://thumbnailer.kulturradar.org";
const PATTERNS_PATH = path.resolve("public/data/patterns.json");
const THUMBS_DIR = path.resolve("public/thumbnails");

const args = parseArgs(process.argv.slice(2));

if (!args.rows) {
  console.error("usage: node scripts/ingest-from-notion.mjs --rows '<json-array>' [--dry-run]");
  process.exit(2);
}

const rows = JSON.parse(args.rows);
if (!Array.isArray(rows) || !rows.length) {
  console.error("no rows to ingest");
  process.exit(0);
}

const manifest = JSON.parse(await fs.readFile(PATTERNS_PATH, "utf8"));
manifest.patterns ??= [];
const existingSlugs = new Set(manifest.patterns.map(p => p.slug));

const stub = [];
for (const row of rows) {
  if (!row.url || !row.name) {
    console.warn("skip — missing url/name:", row);
    continue;
  }
  const slug = slugify(row.name) || slugify(new URL(row.url).hostname);
  if (existingSlugs.has(slug)) {
    console.log(`skip — already ingested: ${slug}`);
    continue;
  }

  const screenshotPath = await fetchThumbnail(row.url, slug);

  const entry = {
    slug,
    name: row.name,
    url: row.url,
    notion_url: row.notion_url || null,
    screenshot: screenshotPath,
    extracted_at: new Date().toISOString().slice(0, 10),
    tags: row.tags || [],
    tagline: "TODO — fill from extract-patterns step",
    tokens: { colors: [], typography: [], spacing: [], radii: [], grid: "" },
    patterns: [],
    notes: "TODO — fill from extract-patterns step",
    stack_hint: ""
  };
  stub.push(entry);
  console.log(`stub ingested: ${slug} (thumbnail → ${screenshotPath})`);
}

if (args["dry-run"]) {
  console.log("--dry-run: would append", stub.length, "entries");
  process.exit(0);
}

manifest.patterns.push(...stub);
manifest.generated = new Date().toISOString().slice(0, 10);
await fs.writeFile(PATTERNS_PATH, JSON.stringify(manifest, null, 2) + "\n", "utf8");
console.log(`wrote ${stub.length} new entries to ${PATTERNS_PATH}`);
console.log("next: run extract-patterns.mjs (or have Claude fill the tokens/patterns fields) and re-deploy.");

async function fetchThumbnail(url, slug) {
  const infoRes = await fetch(`${THUMBNAILER_BASE}/info?url=${encodeURIComponent(url)}&headless=true`);
  if (!infoRes.ok) throw new Error(`thumbnailer /info ${infoRes.status} for ${url}`);
  const info = await infoRes.json();
  const banner = info?.proxy_urls?.banner || info?.best_src;
  if (!banner) throw new Error(`no banner src in thumbnailer response for ${url}`);
  await fs.mkdir(THUMBS_DIR, { recursive: true });
  const ext = banner.includes("output=webp") ? "webp" : path.extname(new URL(banner).pathname).replace(".", "") || "png";
  const out = path.join(THUMBS_DIR, `${slug}.${ext}`);
  const imgRes = await fetch(banner);
  if (!imgRes.ok) throw new Error(`download ${banner} ${imgRes.status}`);
  const buf = Buffer.from(await imgRes.arrayBuffer());
  await fs.writeFile(out, buf);
  return path.relative(path.resolve("."), out);
}

function slugify(s) {
  return String(s)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

function parseArgs(argv) {
  const o = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (next === undefined || next.startsWith("--")) o[key] = true;
      else { o[key] = next; i++; }
    }
  }
  return o;
}
