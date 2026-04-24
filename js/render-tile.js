export function renderTile(p) {
  const a = document.createElement("a");
  a.className = "tile";
  a.href = `pattern.html?slug=${encodeURIComponent(p.slug)}`;

  const thumb = document.createElement("div");
  thumb.className = "thumb";
  if (p.screenshot) {
    const img = document.createElement("img");
    img.loading = "lazy";
    img.src = p.screenshot;
    img.alt = `${p.name} — Screenshot`;
    thumb.appendChild(img);
  } else {
    const ph = document.createElement("div");
    ph.className = "ph";
    ph.textContent = "kein Screenshot";
    thumb.appendChild(ph);
  }
  a.appendChild(thumb);

  const body = document.createElement("div");
  body.className = "body";

  const name = document.createElement("div");
  name.className = "name";
  const nameSpan = document.createElement("span");
  nameSpan.textContent = p.name;
  name.appendChild(nameSpan);
  body.appendChild(name);

  if (p.url) {
    const src = document.createElement("div");
    src.className = "source";
    src.textContent = hostname(p.url);
    body.appendChild(src);
  }

  if (p.tagline) {
    const tg = document.createElement("div");
    tg.className = "tagline";
    tg.textContent = p.tagline;
    body.appendChild(tg);
  }

  const colors = p.tokens && p.tokens.colors ? p.tokens.colors : [];
  if (colors.length) {
    const strip = document.createElement("div");
    strip.className = "colorstrip";
    for (const c of colors) {
      const sp = document.createElement("span");
      sp.style.background = c.hex;
      sp.title = `${c.name} ${c.hex}`;
      strip.appendChild(sp);
    }
    body.appendChild(strip);
  }

  const tags = p.tags || [];
  if (tags.length) {
    const tagsEl = document.createElement("div");
    tagsEl.className = "tags";
    for (const t of tags) {
      const sp = document.createElement("span");
      sp.textContent = t;
      tagsEl.appendChild(sp);
    }
    body.appendChild(tagsEl);
  }

  a.appendChild(body);
  return a;
}

function hostname(u) {
  try { return new URL(u).hostname.replace(/^www\./, ""); } catch { return u; }
}
