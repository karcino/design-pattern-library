const params = new URLSearchParams(location.search);
const slug = params.get("slug");

const els = {
  name: document.getElementById("d-name"),
  tagline: document.getElementById("d-tagline"),
  meta: document.getElementById("d-meta"),
  hero: document.getElementById("d-hero"),
  colors: document.getElementById("d-colors"),
  type: document.getElementById("d-type"),
  spacing: document.getElementById("d-spacing"),
  grid: document.getElementById("d-grid"),
  patterns: document.getElementById("d-patterns"),
  shots: document.getElementById("d-shots"),
  shotsSection: document.getElementById("d-shots-section"),
  notes: document.getElementById("d-notes"),
  stack: document.getElementById("d-stack"),
};

try {
  const res = await fetch("public/data/patterns.json", { cache: "no-store" });
  if (!res.ok) throw new Error(`patterns.json HTTP ${res.status}`);
  const manifest = await res.json();
  const entry = (manifest.patterns || []).find(p => p.slug === slug);
  if (!entry) {
    showError(`Pattern "${slug}" nicht gefunden`);
  } else {
    render(entry);
  }
} catch (err) {
  console.error(err);
  showError(err.message);
}

function render(p) {
  document.title = `${p.name} · Pattern`;
  els.name.textContent = p.name;
  els.tagline.textContent = p.tagline || "";

  els.meta.replaceChildren();
  const metaItems = [];
  if (p.url) metaItems.push({ label: "Source", value: hostname(p.url), href: p.url });
  if (p.notion_url) metaItems.push({ label: "Notion", value: "Eintrag öffnen", href: p.notion_url });
  if (p.extracted_at) metaItems.push({ label: "Extracted", value: p.extracted_at });
  for (const m of metaItems) {
    const span = document.createElement("span");
    if (m.href) {
      const a = document.createElement("a");
      a.href = m.href;
      a.target = "_blank";
      a.rel = "noopener";
      a.textContent = `${m.label}: ${m.value}`;
      span.appendChild(a);
    } else {
      span.textContent = `${m.label}: ${m.value}`;
    }
    els.meta.appendChild(span);
  }

  if (p.screenshot) {
    els.hero.replaceChildren();
    const img = document.createElement("img");
    img.src = p.screenshot;
    img.alt = `${p.name} hero`;
    img.style.width = "100%";
    img.style.maxHeight = "560px";
    img.style.objectFit = "cover";
    img.style.border = "1px solid var(--rule)";
    img.style.background = "var(--bg-alt)";
    els.hero.appendChild(img);
  }

  const colors = p.tokens?.colors || [];
  els.colors.replaceChildren();
  if (!colors.length) {
    els.colors.parentElement.style.display = "none";
  } else {
    for (const c of colors) {
      const sw = document.createElement("div");
      sw.className = "sw";
      const chip = document.createElement("div");
      chip.className = "chip";
      chip.style.background = c.hex;
      sw.appendChild(chip);
      const name = document.createElement("div");
      name.className = "name";
      name.textContent = c.name;
      sw.appendChild(name);
      const hex = document.createElement("span");
      hex.className = "hex";
      hex.textContent = c.hex;
      sw.appendChild(hex);
      const role = document.createElement("div");
      role.className = "role";
      role.textContent = c.role || "";
      sw.appendChild(role);
      els.colors.appendChild(sw);
    }
  }

  const types = p.tokens?.typography || [];
  els.type.replaceChildren();
  if (!types.length) {
    els.type.parentElement.style.display = "none";
  } else {
    for (const t of types) {
      const row = document.createElement("div");
      row.className = "row";
      const left = document.createElement("div");
      left.textContent = t.role;
      row.appendChild(left);
      const right = document.createElement("div");
      right.className = "meta";
      const parts = [];
      if (t.family) parts.push(t.family);
      if (t.size) parts.push(t.size);
      if (t.weight) parts.push(`weight ${t.weight}`);
      if (t.tracking) parts.push(`tracking ${t.tracking}`);
      if (t.case) parts.push(t.case);
      if (t.leading) parts.push(`leading ${t.leading}`);
      right.textContent = parts.join(" · ");
      row.appendChild(right);
      els.type.appendChild(row);
    }
  }

  const spacing = p.tokens?.spacing || [];
  els.spacing.replaceChildren();
  if (!spacing.length) {
    els.spacing.parentElement.style.display = "none";
  } else {
    for (const s of spacing) {
      const stack = document.createElement("div");
      stack.className = "stack";
      const bar = document.createElement("div");
      bar.className = "bar";
      const px = parseInt(s, 10);
      bar.style.height = (Number.isFinite(px) ? Math.max(px, 4) : 4) + "px";
      stack.appendChild(bar);
      const lbl = document.createElement("div");
      lbl.className = "lbl";
      lbl.textContent = s;
      stack.appendChild(lbl);
      els.spacing.appendChild(stack);
    }
  }
  els.grid.textContent = p.tokens?.grid || "";

  const pats = p.patterns || [];
  els.patterns.replaceChildren();
  if (!pats.length) {
    els.patterns.parentElement.style.display = "none";
  } else {
    for (const pp of pats) {
      const card = document.createElement("div");
      card.className = "pattern-card";
      const h = document.createElement("h3");
      h.className = "pname";
      h.textContent = pp.name;
      card.appendChild(h);
      if (pp.purpose) {
        const purpose = document.createElement("p");
        purpose.className = "ppurpose";
        purpose.textContent = pp.purpose;
        card.appendChild(purpose);
      }
      if (pp.evidence) {
        const ev = document.createElement("div");
        ev.className = "pevidence";
        ev.textContent = pp.evidence;
        card.appendChild(ev);
      }
      if (pp.where_to_use) {
        const w = document.createElement("p");
        w.className = "pwhere";
        w.textContent = pp.where_to_use;
        card.appendChild(w);
      }
      els.patterns.appendChild(card);
    }
  }

  const shots = p.evidence_shots || [];
  els.shots.replaceChildren();
  if (!shots.length) {
    els.shotsSection.style.display = "none";
  } else {
    for (const s of shots) {
      const fig = document.createElement("figure");
      fig.className = "shot" + (s.kind === "fullpage" ? " fullpage" : "");
      const a = document.createElement("a");
      a.href = s.image;
      a.target = "_blank";
      a.rel = "noopener";
      const img = document.createElement("img");
      img.src = s.image;
      img.alt = `${p.name} — ${s.ref}`;
      img.loading = "lazy";
      a.appendChild(img);
      fig.appendChild(a);
      const cap = document.createElement("figcaption");
      const ref = document.createElement("span");
      ref.className = "ref";
      ref.textContent = s.ref;
      cap.appendChild(ref);
      const txt = document.createElement("span");
      txt.className = "txt";
      txt.textContent = s.caption;
      cap.appendChild(txt);
      fig.appendChild(cap);
      els.shots.appendChild(fig);
    }
  }

  if (p.notes) {
    els.notes.textContent = p.notes;
  } else {
    els.notes.parentElement.style.display = "none";
  }

  if (p.stack_hint) {
    els.stack.textContent = p.stack_hint;
  } else {
    els.stack.parentElement.style.display = "none";
  }
}

function showError(msg) {
  els.name.textContent = "Pattern nicht gefunden";
  els.tagline.textContent = msg;
}

function hostname(u) {
  try { return new URL(u).hostname.replace(/^www\./, ""); } catch { return u; }
}
