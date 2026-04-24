# Frontend Design Pattern Library

Static site that catalogs frontend design patterns extracted from public web pages.
Source of truth: a Notion database. Screenshots: Hetzner-hosted thumbnailer.
Deploy: Vercel (no build step).

## Layout

```
.
├── index.html               Gallery — header, filter chips, tile grid
├── pattern.html             Detail — tokens · type table · spacing · evidence
├── css/                     tokens.css · layout.css · tile.css
├── js/                      load-patterns.js · render-tile.js · render-detail.js
├── public/
│   ├── data/patterns.json   The manifest — array of pattern entries
│   └── thumbnails/          PNG/WEBP screenshots, one per pattern
├── scripts/
│   ├── ingest-from-notion.mjs  Append new entries from Notion + thumbnailer
│   └── extract-patterns.mjs    Print the prompt+schema for the extraction step
├── vercel.json
└── README.md
```

## Workflow

1. **Add a row to the Notion DB** [📚 Frontend Design Pattern Library](https://www.notion.so/34c34722aadb81f0919ad7cf843adce5)
   with `Name` and `URL` (and `Tags` if you have them).
2. From a Claude Code session, fetch the data source:

   ```
   notion-fetch collection://34c34722-aadb-81aa-a140-000b5270216b
   ```

   Build a JSON array of new rows: `[{ name, url, tags, notion_url }, ...]`.

3. **Ingest the rows** — downloads thumbnails from the Hetzner thumbnailer
   and stubs the entries:

   ```bash
   node scripts/ingest-from-notion.mjs --rows '[{"name":"…","url":"…","tags":["…"],"notion_url":"…"}]'
   ```

   Default thumbnailer base: `https://thumbnailer.kulturradar.org`.
   Override via `THUMBNAILER_BASE=…`.

4. **Extract the patterns**: print the schema prompt and hand it to Claude.

   ```bash
   node scripts/extract-patterns.mjs --url <url> --name <name>
   ```

   Paste Claude's JSON response into the corresponding entry in
   `public/data/patterns.json` (replacing the `tagline`, `tokens`,
   `patterns`, `notes`, `stack_hint` fields).

5. **Commit + push** — Vercel re-deploys automatically.

## Local dev

```
python3 -m http.server 8810
# http://localhost:8810
```

Or via Claude Preview: `pattern-library-dev` (port 8810).

## Schema

```json
{
  "schema_version": "1.0",
  "generated": "2026-04-25",
  "patterns": [
    {
      "slug": "bottega-swipe-vertical",
      "name": "Bottega · Swipe Vertical PDP",
      "url": "https://www.bottegaveneta.com/...",
      "screenshot": "public/thumbnails/bottega-swipe-vertical.webp",
      "extracted_at": "2026-04-25",
      "tags": ["pdp", "luxury-retail"],
      "tagline": "...",
      "tokens": {
        "colors": [{ "name": "ink", "hex": "#000000", "role": "..." }],
        "typography": [{ "role": "h1", "family": "...", "size": "16px", "weight": 400 }],
        "spacing": ["0","8","16","24","40"],
        "radii": ["0"],
        "grid": "..."
      },
      "patterns": [
        { "name": "...", "purpose": "...", "evidence": "...", "where_to_use": "..." }
      ],
      "notes": "...",
      "stack_hint": "..."
    }
  ]
}
```

## Source attribution

- Thumbnails are fetched via [thumbnailer.kulturradar.org](https://thumbnailer.kulturradar.org)
  — proxied through `images.weserv.nl` for resizing.
- Pattern entries link back to their Notion source via `notion_url`.
