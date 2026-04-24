#!/usr/bin/env node
/**
 * Extract design patterns from a target URL using the frontend-design skill.
 *
 * This is the *prompt-only* half of the workflow. It does not call any
 * language model directly — it produces the prompt that should be handed
 * to a Claude Code session running the `frontend-design` or `design:design-system`
 * skill, plus the schema the model is required to fill.
 *
 * Usage:
 *   node scripts/extract-patterns.mjs --url <url> [--name <name>]
 *
 * The script prints two blocks to stdout:
 *   1. The system/user prompt to give Claude.
 *   2. The JSON schema Claude is expected to return (per pattern entry).
 *
 * Pipe the output into a Claude session, paste the resulting JSON back into
 * the corresponding entry in public/data/patterns.json, then re-deploy.
 */

const args = parseArgs(process.argv.slice(2));
if (!args.url) {
  console.error("usage: node scripts/extract-patterns.mjs --url <url> [--name <name>]");
  process.exit(2);
}

const target = args.url;
const display = args.name || target;

const prompt = `
You are extracting frontend design patterns from a single web page.
Be formal, accurate, pointed. No filler. No marketing language. Treat
this like a code-review of the visual system: claim, evidence, location.

TARGET: ${display}
URL: ${target}

Steps:
1. Fetch the page (or read the rendered DOM if you have a browser tool).
2. Identify the dominant patterns — typography stack, color tokens,
   spacing rhythm, component archetypes (sticky CTA, vertical scroll,
   carousel, hero, etc.).
3. For each pattern, produce a "name", "purpose", "evidence" (DOM /
   selector / inline-CSS / asset path), and "where_to_use".
4. List color tokens you can read off the page (with hex), type tokens
   (role, family, size, weight, tracking, case, leading), and observed
   spacing values (px scale).
5. Write a 2–4 sentence "notes" paragraph that captures what makes this
   page worth studying — what move would you steal.

Output exactly this JSON shape (no surrounding prose, no code fence):

${JSON.stringify(SCHEMA, null, 2)}
`.trim();

console.log(prompt);

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

// Schema lives at the bottom so the prompt at the top reads top-to-bottom.
function getSchema() { return SCHEMA; }
const _SCHEMA_DECL = (() => null)();

var SCHEMA;
SCHEMA = {
  tagline: "<one sentence — what this page does that others don't>",
  tags: ["<lowercase-kebab-tag>", "..."],
  tokens: {
    colors: [
      { name: "<token-name>", hex: "#000000", role: "<usage description>" }
    ],
    typography: [
      { role: "<h1 | body | label | ...>", family: "<font stack>", size: "<px or range>", weight: 400, tracking: "<em>", case: "<title|upper|lower>", leading: "<line-height>" }
    ],
    spacing: ["0", "8", "16", "24"],
    radii: ["0"],
    grid: "<one-line description of layout grid>"
  },
  patterns: [
    {
      name: "<Pattern Name>",
      purpose: "<why it works>",
      evidence: "<DOM/selector/css proof>",
      where_to_use: "<when to steal it>"
    }
  ],
  notes: "<2-4 sentences — sachlich, pointiert>",
  stack_hint: "<framework / cms / cdn detected, optional>"
};
