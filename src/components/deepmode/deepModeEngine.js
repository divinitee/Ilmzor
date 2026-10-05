// Deep Mode word map engine (VT-38). Plain DOM + SVG, driven by one
// requestAnimationFrame loop: nodes ease toward layout targets, links are
// redrawn from the current node positions, and the camera eases toward a
// fitted view. Ported from the approved prototype (5 Oct 2026).
import { fill } from "./deepModeMapCopy";

const SVGNS = "http://www.w3.org/2000/svg";
// Root/etymology was dropped (Tee, 5 Oct 2026): no trusted source, and a
// wrong origin is worse than none.
const ORDER = ["meaning", "syn", "ant", "forms", "context", "affixes"];
const CAT = {
  meaning: { c: "var(--c-meaning)", hex: "#9DBBFF" },
  syn: { c: "var(--c-syn)", hex: "#6CCFD6" },
  ant: { c: "var(--c-ant)", hex: "#C98BDB" },
  forms: { c: "var(--c-forms)", hex: "#7E9BFF" },
  context: { c: "var(--c-context)", hex: "#5DB6EC" },
  root: { c: "var(--c-root)", hex: "#AAB6D3" },
  affixes: { c: "var(--c-affixes)", hex: "#A58DF6" },
  core: { c: "var(--blue-hi)", hex: "#8FB2FF" },
};
const R1 = 215, R2 = 420, R3 = 660;

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
function highlight(text, words) {
  const sorted = [...words].sort((a, b) => b.length - a.length);
  const re = new RegExp("\\b(" + sorted.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|") + ")(s|d|ed|ing)?\\b", "gi");
  return esc(text).replace(re, (m) => `<mark>${m}</mark>`);
}

function buildTree(W, c) {
  const N = {};
  const add = (id, o) => { N[id] = { id, kids: [], ...o }; if (o.parent) N[o.parent].kids.push(id); return N[id]; };
  add("core", { type: "core", cat: "core" });
  for (const b of ORDER) {
    let count = "";
    if (b === "forms") count = fill(c.of4, { n: Object.values(W.forms).filter(Boolean).length });
    if (b === "syn") count = W.syn.length;
    if (b === "ant") count = W.ant.length || "0";
    if (b === "affixes") count = W.affixes.length || "0";
    add("b:" + b, { type: "branch", cat: b, parent: "core", label: c.branches[b], count });
  }
  add("l:meaning:def", { type: "leaf", cat: "meaning", parent: "b:meaning", k: fill(c.atLevel, { level: W.level }), html: `<p>${esc(W.meaning)}</p>` });
  add("l:meaning:tr", { type: "leaf", cat: "meaning", parent: "b:meaning", k: c.inLang, html: `<div class="lang"><b>UZ</b><span>${esc(W.tr.uz)}</span><b>RU</b><span>${esc(W.tr.ru)}</span></div>` });
  for (const pos of ["noun", "verb", "adjective", "adverb"]) {
    const f = W.forms[pos]; const id = "i:forms:" + pos; const posLabel = c.pos[pos];
    if (!f) { add(id, { type: "missing", cat: "forms", parent: "b:forms", k: posLabel, v: c.noForm }); continue; }
    add(id, { type: "item", cat: "forms", parent: "b:forms", k: posLabel, v: f.w });
    add(id + ":def", { type: "leaf", cat: "forms", parent: id, k: fill(c.formMeaning, { pos: posLabel }), html: `<p>${esc(f.def)}</p>` });
    add(id + ":ex", { type: "leaf", cat: "forms", parent: id, k: c.example, html: `<p class="ex">${highlight(f.ex, [f.w])}</p>` });
  }
  if (!W.affixes.length) add("i:affixes:none", { type: "missing", cat: "affixes", parent: "b:affixes", k: c.branches.affixes, v: c.noAffix });
  W.affixes.forEach((a, i) => {
    const id = "i:affixes:" + i;
    const kind = a.kind === "prefix" ? c.prefix : a.kind === "suffixIn" ? fill(c.suffixIn, { w: a.inWord }) : c.suffix;
    add(id, { type: "item", cat: "affixes", parent: "b:affixes", k: kind, v: a.a, pct: a.m });
    add(id + ":also", { type: "leaf", cat: "affixes", parent: id, k: fill(c.alsoIn, { a: a.a, m: a.m }), html: `<div class="tags">${a.also.map((w) => `<span>${esc(w)}</span>`).join("")}</div>` });
  });
  W.syn.forEach((s, i) => {
    const id = "i:syn:" + i; const rel = s.s <= 0.6;
    add(id, { type: "item", cat: "syn", parent: "b:syn", k: rel ? c.related : c.synonym, v: s.w, pct: Math.round(s.s * 100) + "%" });
    add(id + ":note", { type: "leaf", cat: "syn", parent: id, k: rel ? c.howDiffers : c.howClose, html: `<p>${esc(s.note)}</p>` });
  });
  if (!W.ant.length) add("i:ant:none", { type: "missing", cat: "ant", parent: "b:ant", k: c.opposite, v: c.noAntonym });
  W.ant.forEach((a, i) => {
    const id = "i:ant:" + i;
    add(id, { type: "item", cat: "ant", parent: "b:ant", k: c.opposite, v: a.w });
    add(id + ":note", { type: "leaf", cat: "ant", parent: id, k: c.note, html: `<p>${esc(a.note)}</p>` });
  });
  add("l:context", { type: "leaf", cat: "context", parent: "b:context", k: c.contextCard, wide: true, html: `<p class="ex">${highlight(W.context, W.hl)}</p>` });
  return N;
}

export function createEngine(els, W, c, { autoOpen = false } = {}) {
  const { stage, world, nodesEl, glowLayer, lineLayer, sky, fitBtn, dock } = els;
  const REDUCED = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const T = buildTree(W, c);
  let openBranch = null, openItem = null, alive = true, raf = 0, skyRaf = 0, dragging = false;
  const timers = [];
  const live = new Map();
  const cam = { x: 0, y: 0, k: 1, tx: 0, ty: 0, tk: 1 };

  const narrow = () => stage.clientWidth < 600;
  const angleOf = (i, n) => ((-90 + (i * 360) / n) * Math.PI) / 180;
  const fan = (center, n, step) => Array.from({ length: n }, (_, i) => center + (i - (n - 1) / 2) * step);
  // Phones: leaf cards line up along the branch's direction instead of side by side.
  function stack(a, r0, ids, pos) {
    const sep = Math.abs(Math.cos(a)) * 255 + Math.abs(Math.sin(a)) * 150;
    ids.forEach((id, i) => { const r = r0 + i * sep; pos[id] = { x: Math.cos(a) * r, y: Math.sin(a) * r, a }; });
  }
  function visibleIds() {
    const ids = ["core", ...ORDER.map((b) => "b:" + b)];
    if (openBranch) for (const k of T[openBranch].kids) { ids.push(k); if (openItem === k) ids.push(...T[k].kids); }
    return ids;
  }
  function targets() {
    const pos = { core: { x: 0, y: 0, a: 0 } };
    ORDER.forEach((b, i) => { const a = angleOf(i, ORDER.length); pos["b:" + b] = { x: Math.cos(a) * R1, y: Math.sin(a) * R1, a }; });
    if (openBranch) {
      const ba = pos[openBranch].a; const kids = T[openBranch].kids;
      const leafy = kids.every((k) => T[k].type === "leaf");
      const r = leafy ? R2 + 40 : R2;
      if (leafy && narrow()) stack(ba, r, kids, pos);
      else {
        const step = leafy ? (T[kids[0]].wide ? 320 : 260) / r : Math.min(0.42, 165 / r);
        fan(ba, kids.length, step).forEach((a, i) => { pos[kids[i]] = { x: Math.cos(a) * r, y: Math.sin(a) * r, a }; });
      }
      if (openItem && pos[openItem]) {
        const ia = pos[openItem].a; const lk = T[openItem].kids;
        if (narrow()) stack(ia, R3, lk, pos);
        else fan(ia, lk.length, 262 / R3).forEach((a, i) => { pos[lk[i]] = { x: Math.cos(a) * R3, y: Math.sin(a) * R3, a }; });
      }
    }
    return pos;
  }

  function nodeHTML(n) {
    const col = CAT[n.cat].c;
    if (n.type === "core") return `<button class="inner core" aria-label="${esc(W.word)}, ${esc(W.level)}. ${esc(c.fit)}"><div><div class="w">${esc(W.word)}</div><div class="m">${esc(c.pos[W.pos] || W.pos)} · <i>${esc(W.level)}</i></div></div></button>`;
    if (n.type === "branch") return `<button class="inner branch" style="--c:${col}" aria-expanded="false"><span class="dot"></span><span class="t">${esc(n.label)}</span><span class="n">${esc(n.count)}</span></button>`;
    if (n.type === "item") return `<button class="inner item" style="--c:${col}" aria-expanded="false"><span class="k">${esc(n.k)}</span><span class="v">${esc(n.v)}${n.pct ? `<span class="pct">${esc(n.pct)}</span>` : ""}</span></button>`;
    if (n.type === "missing") return `<div class="inner item missing" style="--c:${col}"><span class="k">${esc(n.k)}</span><span class="v">${esc(n.v)}</span></div>`;
    return `<div class="inner leaf${n.wide ? " wide" : ""}" style="--c:${col}"><span class="k">${esc(n.k)}</span>${n.html}</div>`;
  }

  // Same light as the Skill Hub tree: a line sweeps in from its parent, then breathes.
  function makeLink(cat, delay) {
    const hex = CAT[cat].hex;
    const mk = (cls, layer) => { const p = document.createElementNS(SVGNS, "path"); p.setAttribute("class", cls); p.setAttribute("stroke", hex); layer.appendChild(p); return p; };
    const glow = mk("lk-glow", glowLayer), core = mk("lk-core", lineLayer), lit = mk("lk-lit", lineLayer);
    [[glow, 0.32, 0.16], [lit, 0.8, 0.48]].forEach(([p, peak, dim]) => {
      p.setAttribute("pathLength", "1");
      if (REDUCED || !p.animate) { p.style.strokeDashoffset = "0"; p.style.strokeOpacity = String(peak); return; }
      p.style.strokeDashoffset = "1";
      const sweep = p.animate([
        { strokeDashoffset: 1, strokeOpacity: 0, offset: 0 },
        { strokeOpacity: peak, offset: 0.12 },
        { strokeDashoffset: 0, strokeOpacity: peak, offset: 1 },
      ], { duration: 900, delay, easing: "cubic-bezier(.22,.8,.3,1)", fill: "forwards" });
      sweep.finished.then(() => {
        if (!p.isConnected) return;
        p.style.strokeDashoffset = "0";
        p.animate([{ strokeOpacity: peak }, { strokeOpacity: dim }, { strokeOpacity: peak }], { duration: 3400, easing: "ease-in-out", iterations: Infinity });
      }).catch(() => {});
    });
    return [glow, core, lit];
  }

  function sync(fit = true) {
    const want = new Set(visibleIds()); const pos = targets(); let order = 0;
    for (const id of want) {
      const n = T[id]; let L = live.get(id);
      if (L && L.leaving) L.leaving = false;
      else if (!L) {
        const el = document.createElement("div"); el.className = "node"; el.innerHTML = nodeHTML(n);
        nodesEl.appendChild(el);
        const from = n.parent && live.get(n.parent) ? live.get(n.parent) : { x: 0, y: 0 };
        const delay = n.type === "branch" ? 140 + order * 70 : order * 55;
        L = { el, x: from.x, y: from.y, s: 0.2, o: 0, start: performance.now() + delay, links: n.parent ? makeLink(n.cat, delay + 60) : null };
        live.set(id, L);
        const btn = el.querySelector("button"); if (btn) btn.addEventListener("click", () => onTap(id));
        order++;
      }
      L.tx = pos[id].x; L.ty = pos[id].y; L.ts = 1; L.to = 1;
    }
    for (const [id, L] of live) {
      if (!want.has(id) && !L.leaving) {
        const p = T[id].parent && live.get(T[id].parent);
        L.leaving = true; L.tx = p ? p.tx : 0; L.ty = p ? p.ty : 0; L.ts = 0.2; L.to = 0; L.start = performance.now();
      }
    }
    for (const [id, L] of live) {
      const n = T[id]; const inner = L.el.firstElementChild; const isOpen = id === openBranch || id === openItem;
      inner.classList.toggle("open", isOpen);
      if (inner.hasAttribute("aria-expanded")) inner.setAttribute("aria-expanded", String(isOpen));
      const dimmed = (openBranch && n.type === "branch" && id !== openBranch) || (openItem && n.parent === openBranch && id !== openItem && n.type !== "leaf");
      L.el.classList.toggle("dim", !!dimmed);
    }
    if (fit) fitCamera();
  }

  function onTap(id) {
    const n = T[id];
    if (n.type === "core") { openBranch = null; openItem = null; }
    else if (n.type === "branch") { if (openBranch === id) { openBranch = null; openItem = null; } else { openBranch = id; openItem = null; } }
    else if (n.type === "item" && n.kids.length) openItem = openItem === id ? null : id;
    sync(true);
  }

  const dockH = () => dock.offsetHeight;
  function fitCamera() {
    const pos = targets();
    const ids = !openBranch ? ["core", ...ORDER.map((b) => "b:" + b)] : openItem ? [openItem, ...T[openItem].kids] : [openBranch, ...T[openBranch].kids];
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const id of ids) {
      const p = pos[id]; if (!p) continue; const L = live.get(id);
      const w = (L ? L.el.firstElementChild.offsetWidth : 160) / 2, h = (L ? L.el.firstElementChild.offsetHeight : 60) / 2;
      x0 = Math.min(x0, p.x - w); x1 = Math.max(x1, p.x + w); y0 = Math.min(y0, p.y - h); y1 = Math.max(y1, p.y + h);
    }
    const sw = stage.clientWidth, sh = stage.clientHeight - dockH(), pad = 28;
    if (!sw || !sh || !isFinite(x0)) return;
    const k = Math.max(0.32, Math.min(1.15, (sw - pad * 2) / (x1 - x0), (sh - pad * 2) / (y1 - y0)));
    cam.tk = k; cam.tx = -((x0 + x1) / 2) * k; cam.ty = -((y0 + y1) / 2) * k - dockH() / 2;
  }

  function curve(a, b) {
    const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2, dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy) || 1;
    const bend = Math.min(40, len * 0.12), cx = mx - (dy / len) * bend, cy = my + (dx / len) * bend;
    return `M${a.x.toFixed(1)},${a.y.toFixed(1)} Q${cx.toFixed(1)},${cy.toFixed(1)} ${b.x.toFixed(1)},${b.y.toFixed(1)}`;
  }
  function tick(now) {
    if (!alive) return;
    const f = REDUCED ? 1 : 0.15;
    for (const [id, L] of live) {
      if (now < L.start) { L.el.style.opacity = 0; if (L.links) L.links.forEach((p) => (p.style.opacity = 0)); continue; }
      L.x += (L.tx - L.x) * f; L.y += (L.ty - L.y) * f; L.s += (L.ts - L.s) * f; L.o += (L.to - L.o) * f;
      L.el.style.transform = `translate(${L.x}px, ${L.y}px) scale(${L.s})`; L.el.style.opacity = L.o;
      if (L.links) {
        const n = T[id]; const P = live.get(n.parent);
        let from = P || { x: 0, y: 0 };
        // Lines start at the edge of the centre word, not under it.
        if (n.parent === "core") { const dx = L.x - from.x, dy = L.y - from.y, len = Math.hypot(dx, dy) || 1, r = Math.min(78, len * 0.6); from = { x: from.x + (dx / len) * r, y: from.y + (dy / len) * r }; }
        const d = curve(from, L); L.links.forEach((p) => { p.setAttribute("d", d); p.style.opacity = L.o; });
      }
      if (L.leaving && L.o < 0.03) { L.el.remove(); if (L.links) L.links.forEach((p) => p.remove()); live.delete(id); }
    }
    const cf = REDUCED || dragging ? 1 : 0.12;
    cam.x += (cam.tx - cam.x) * cf; cam.y += (cam.ty - cam.y) * cf; cam.k += (cam.tk - cam.k) * cf;
    world.style.transform = `translate(${cam.x}px, ${cam.y}px) scale(${cam.k})`;
    raf = requestAnimationFrame(tick);
  }

  // Pan / zoom. A plain mouse wheel keeps scrolling the page; ctrl/cmd + wheel
  // (which is also what a trackpad pinch sends) zooms the map.
  const ptrs = new Map(); let pinch0 = null;
  function zoomAt(sx, sy, k) {
    const r = stage.getBoundingClientRect(); const ox = sx - r.left - r.width / 2, oy = sy - r.top - r.height / 2;
    const wx = (ox - cam.tx) / cam.tk, wy = (oy - cam.ty) / cam.tk;
    cam.tk = k; cam.tx = ox - wx * k; cam.ty = oy - wy * k;
  }
  const onDown = (e) => {
    if (e.target.closest("button, .dock, .soon")) return;
    ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
    try { stage.setPointerCapture(e.pointerId); } catch { /* ignore */ }
    dragging = true; stage.classList.add("dragging");
    if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; pinch0 = { d: Math.hypot(a.x - b.x, a.y - b.y), k: cam.tk }; }
  };
  const onMove = (e) => {
    if (!ptrs.has(e.pointerId)) return;
    const prev = ptrs.get(e.pointerId); const cur = { x: e.clientX, y: e.clientY }; ptrs.set(e.pointerId, cur);
    if (ptrs.size === 2 && pinch0) { const [a, b] = [...ptrs.values()]; zoomAt((a.x + b.x) / 2, (a.y + b.y) / 2, Math.max(0.3, Math.min(2.2, (pinch0.k * Math.hypot(a.x - b.x, a.y - b.y)) / pinch0.d))); }
    else if (ptrs.size === 1) { cam.tx += cur.x - prev.x; cam.ty += cur.y - prev.y; cam.x = cam.tx; cam.y = cam.ty; }
  };
  const onUp = (e) => { ptrs.delete(e.pointerId); if (ptrs.size < 2) pinch0 = null; if (!ptrs.size) { dragging = false; stage.classList.remove("dragging"); } };
  const onWheel = (e) => { if (!(e.ctrlKey || e.metaKey)) return; e.preventDefault(); zoomAt(e.clientX, e.clientY, Math.max(0.3, Math.min(2.2, cam.tk * Math.exp(-e.deltaY * 0.004)))); };
  const onFit = () => { openBranch = null; openItem = null; sync(true); };
  const onKey = (e) => { if (e.key !== "Escape" || !stage.contains(document.activeElement)) return; if (openItem) openItem = null; else openBranch = null; sync(true); };
  // Focusing an off-screen node would scroll the clipped stage; the camera does the moving instead.
  const onScroll = () => { stage.scrollLeft = 0; stage.scrollTop = 0; };
  stage.addEventListener("pointerdown", onDown); stage.addEventListener("pointermove", onMove);
  stage.addEventListener("pointerup", onUp); stage.addEventListener("pointercancel", onUp);
  stage.addEventListener("wheel", onWheel, { passive: false }); stage.addEventListener("scroll", onScroll);
  fitBtn.addEventListener("click", onFit); window.addEventListener("keydown", onKey);

  // Sky: slow drifting motes over a deep-blue glow.
  const ctx = sky.getContext("2d"); let motes = [];
  function sizeSky() {
    const dpr = Math.min(2, window.devicePixelRatio || 1); const w = stage.clientWidth, h = stage.clientHeight;
    sky.width = w * dpr; sky.height = h * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    motes = Array.from({ length: Math.round((w * h) / 9000) }, () => ({ x: Math.random() * w, y: Math.random() * h, r: Math.random() * 1.4 + 0.3, v: Math.random() * 0.12 + 0.03, p: Math.random() * 6.28, g: Math.random() < 0.25 }));
  }
  function drawSky(t) {
    if (!alive) return;
    const w = stage.clientWidth, h = stage.clientHeight; ctx.clearRect(0, 0, w, h);
    const g = ctx.createRadialGradient(w / 2, h * 0.45, 0, w / 2, h * 0.45, Math.max(w, h) * 0.65);
    g.addColorStop(0, "rgba(40,80,190,0.20)"); g.addColorStop(0.45, "rgba(70,48,150,0.09)"); g.addColorStop(1, "rgba(5,8,19,0)");
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    for (const m of motes) {
      if (!REDUCED) { m.y -= m.v; m.x += Math.sin(t / 3000 + m.p) * 0.08; if (m.y < -4) { m.y = h + 4; m.x = Math.random() * w; } }
      const a = 0.25 + 0.35 * (0.5 + 0.5 * Math.sin(t / 900 + m.p));
      ctx.fillStyle = m.g ? `rgba(166,140,245,${a * 0.8})` : `rgba(170,195,255,${a})`;
      ctx.beginPath(); ctx.arc(m.x, m.y, m.r, 0, 6.283); ctx.fill();
    }
    if (!REDUCED) skyRaf = requestAnimationFrame(drawSky);
  }
  const ro = new ResizeObserver(() => { sizeSky(); if (REDUCED) drawSky(performance.now()); fitCamera(); });
  ro.observe(stage);

  // boot
  sizeSky(); skyRaf = requestAnimationFrame(drawSky);
  sync(false); requestAnimationFrame(() => alive && fitCamera());
  raf = requestAnimationFrame(tick);
  if (autoOpen) timers.push(setTimeout(() => { if (alive && !openBranch) { openBranch = "b:forms"; sync(true); } }, 1400));

  return function destroy() {
    alive = false; cancelAnimationFrame(raf); cancelAnimationFrame(skyRaf); timers.forEach(clearTimeout);
    ro.disconnect();
    stage.removeEventListener("pointerdown", onDown); stage.removeEventListener("pointermove", onMove);
    stage.removeEventListener("pointerup", onUp); stage.removeEventListener("pointercancel", onUp);
    stage.removeEventListener("wheel", onWheel); stage.removeEventListener("scroll", onScroll);
    fitBtn.removeEventListener("click", onFit); window.removeEventListener("keydown", onKey);
    nodesEl.innerHTML = ""; glowLayer.innerHTML = ""; lineLayer.innerHTML = "";
  };
}
