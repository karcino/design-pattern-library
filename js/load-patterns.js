import { renderTile } from "./render-tile.js";

const grid = document.getElementById("grid");
const chipsEl = document.getElementById("chips");
const metaEl = document.getElementById("meta");

let activeTags = new Set();
let allPatterns = [];

try {
  const res = await fetch("public/data/patterns.json", { cache: "no-store" });
  if (!res.ok) throw new Error(`patterns.json HTTP ${res.status}`);
  const manifest = await res.json();
  allPatterns = manifest.patterns || [];
  renderChips(allPatterns);
  renderGrid();
  updateMeta(manifest);
} catch (err) {
  console.error(err);
  grid.replaceChildren();
  const div = document.createElement("div");
  div.className = "empty-state";
  const strong = document.createElement("strong");
  strong.textContent = "patterns.json konnte nicht geladen werden";
  div.appendChild(strong);
  div.appendChild(document.createTextNode(err.message));
  grid.appendChild(div);
}

function renderChips(patterns) {
  const tags = new Set();
  patterns.forEach(p => (p.tags || []).forEach(t => tags.add(t)));
  chipsEl.replaceChildren();
  for (const t of [...tags].sort()) {
    const btn = document.createElement("button");
    btn.className = "chip";
    btn.textContent = t;
    btn.addEventListener("click", () => {
      if (activeTags.has(t)) activeTags.delete(t); else activeTags.add(t);
      btn.classList.toggle("on");
      renderGrid();
    });
    chipsEl.appendChild(btn);
  }
}

function renderGrid() {
  grid.replaceChildren();
  if (!allPatterns.length) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    const strong = document.createElement("strong");
    strong.textContent = "Noch keine Patterns";
    empty.appendChild(strong);
    empty.appendChild(document.createTextNode("Füge in der Notion-DB einen Eintrag hinzu, dann run scripts/ingest-from-notion.mjs"));
    grid.appendChild(empty);
    return;
  }
  const visible = allPatterns.filter(p => {
    if (!activeTags.size) return true;
    return [...activeTags].every(t => (p.tags || []).includes(t));
  });
  if (!visible.length) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = "Keine Patterns mit dieser Tag-Kombination.";
    grid.appendChild(empty);
    return;
  }
  for (const p of visible) grid.appendChild(renderTile(p));
}

function updateMeta(manifest) {
  metaEl.replaceChildren();
  const left = document.createElement("span");
  left.textContent = `${(manifest.patterns || []).length} Patterns · generiert ${manifest.generated || "—"}`;
  const right = document.createElement("span");
  right.textContent = `Schema v${manifest.schema_version || "1.0"}`;
  metaEl.appendChild(left);
  metaEl.appendChild(right);
}
