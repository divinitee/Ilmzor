// Graph renderer: keyed SVG nodes/edges, tweened motion, camera, pointer interaction.
// It never owns data; it animates toward whatever layout it is given.

import { SIZES } from './layout.js';
import { store } from '../store.js';
import * as M from '../model.js';
import { HORIZON, REL_TYPES } from '../schema.js';
import { wrap, truncate, round1, clamp } from '../util.js';

const NS = 'http://www.w3.org/2000/svg';
const REDUCED = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
const EASE = REDUCED ? 1 : 0.2;
const CAM_EASE = REDUCED ? 1 : 0.16;

const FAMILY_COLOR = {
  enable: '#8fe3c4', flow: '#e6c27a', resource: '#7fcfdc', dependency: '#ff8f8f',
  constraint: '#f0a868', conflict: '#ff8f8f', related: '#9aa6b4', serves: '#8fe3c4', hier: '#ffffff',
};

function mk(tag, attrs, parent) {
  const e = document.createElementNS(NS, tag);
  if (attrs) for (const k in attrs) if (attrs[k] !== undefined && attrs[k] !== null) e.setAttribute(k, attrs[k]);
  if (parent) parent.appendChild(e);
  return e;
}
function txt(parent, x, y, s, cls, attrs = {}) {
  const t = mk('text', { x, y, class: cls, ...attrs }, parent);
  t.textContent = s;
  return t;
}
function multiline(parent, lines, x, y0, lh, cls, anchor = 'middle') {
  const t = mk('text', { class: cls, 'text-anchor': anchor }, parent);
  lines.forEach((l, i) => {
    const sp = mk('tspan', { x, y: y0 + i * lh }, t);
    sp.textContent = l;
  });
  return t;
}
function hexPoints(r) {
  const pts = [];
  for (let i = 0; i < 6; i++) {
    const a = Math.PI / 6 + (i * Math.PI) / 3;
    pts.push(`${(Math.cos(a) * r).toFixed(1)},${(Math.sin(a) * r).toFixed(1)}`);
  }
  return pts.join(' ');
}

export function createGraph(svg, cb) {
  svg.innerHTML = `
  <defs>
    ${Object.entries(FAMILY_COLOR).map(([f, c]) => `<marker id="m-${f}" viewBox="0 0 10 10" refX="8.5" refY="5" markerWidth="7" markerHeight="7" markerUnits="userSpaceOnUse" orient="auto-start-reverse"><path d="M0,1 L9,5 L0,9 z" fill="${c}"/></marker>`).join('')}
    <filter id="f-glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="7" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    <radialGradient id="g-mission"><stop offset="0" stop-color="#8fe3c4" stop-opacity=".22"/><stop offset=".6" stop-color="#8fe3c4" stop-opacity=".04"/><stop offset="1" stop-color="#8fe3c4" stop-opacity="0"/></radialGradient>
    <pattern id="p-grid" width="56" height="56" patternUnits="userSpaceOnUse"><path d="M56 0H0V56" fill="none" stroke="rgba(255,255,255,.022)"/></pattern>
  </defs>
  <rect class="bg-grid" x="-20000" y="-20000" width="40000" height="40000" fill="url(#p-grid)"/>
  <g class="world"><g class="g-edges"></g><g class="g-nodes"></g><g class="g-labels"></g></g>`;
  const world = svg.querySelector('.world');
  const grid = svg.querySelector('.bg-grid');
  const gEdges = svg.querySelector('.g-edges');
  const gNodes = svg.querySelector('.g-nodes');
  const gLabels = svg.querySelector('.g-labels');

  const nodes = new Map();
  const edges = new Map();
  let layout = { nodes: [], edges: [], parentOf: new Map() };
  let opts = { mode: 'map', selected: null, linking: false };
  const cam = { x: 0, y: 0, k: 1 };
  const camT = { x: 0, y: 0, k: 1 };
  let insets = { left: 0, right: 0, top: 0, bottom: 0 };
  let raf = null;
  let hoverId = null;
  let hoverEdge = null;
  let drag = null;
  let lastClick = { id: null, t: 0 };
  let related = new Set();
  let whyIds = new Set();
  let firstFit = true;

  // ---------- node views ----------

  function nodeView(nd) {
    const x = nd.item;
    const v = { t: x.type, title: x.title, status: x.status, c: M.colorOf(x), cc: nd.childCount, ex: nd.expanded, mode: opts.mode };
    if (x.type === 'mission') v.statement = x.statement;
    if (x.type === 'area') {
      const s = M.areaStats(x.id);
      v.stats = s;
      if (opts.mode === 'resources') {
        const t = M.timeSummary();
        v.hours = round1((t.fixedByArea.get(x.id) || 0) + (t.effectiveByArea.get(x.id) || 0));
        v.overArea = t.overAreas.some((o) => o.areaId === x.id);
      }
    }
    if (x.type === 'project') {
      const f = M.projectFlags(x);
      v.next = f.next ? f.next.title : '';
      v.noNext = f.noNext; v.blocked = f.blocked; v.waiting = f.waiting; v.overdue = f.overdue;
      v.p = Math.round(M.progress(x) * 100);
    }
    if (x.type === 'task') { v.next = !!x.isNext; v.blocked = M.isBlocked(x); v.due = x.due; }
    if (x.type === 'goal' || x.type === 'objective') { v.h = x.horizon; v.p = Math.round(M.progress(x) * 100); }
    if (x.type === 'waiting') { v.who = x.who || M.titleOf(x.personId); v.late = (x.followUpAt && x.followUpAt <= new Date().toISOString().slice(0, 10)); }
    if (x.type === 'responsibility') v.hrs = M.weeklyHoursOf(x);
    if (x.type === 'habit') { const w = M.habitWeek(x); v.cnt = w.count; v.tgt = x.targetPerWeek; }
    if (x.type === 'resource') {
      v.kind = x.kind;
      if (x.kind === 'time') { const t = M.timeSummary(); v.val = t.over ? `${t.overBy}h over` : `${t.unallocated}h free`; v.bad = t.over; }
      else if (x.kind === 'money') { const m = M.moneySummary(); v.val = m.inflow || m.outflow ? `${m.net >= 0 ? '+' : '−'}${Math.abs(Math.round(m.net))}/mo` : 'not set'; v.bad = m.over; }
      else { const s = M.shareSummary(x.id); v.val = s.used ? `${s.free}% free` : 'not set'; v.bad = s.over; }
    }
    return v;
  }

  function badge(g, x, y, nd) {
    if (!nd.childCount) return;
    const b = mk('g', { class: 'expander', transform: `translate(${x} ${y})` }, g);
    mk('circle', { r: 9 }, b);
    txt(b, 0, 3.5, nd.expanded ? '−' : String(nd.childCount), 'exp-t', { 'text-anchor': 'middle' });
  }

  function buildNode(n, nd, v) {
    const g = n.body;
    while (g.firstChild) g.firstChild.remove();
    const S = SIZES[v.t] || SIZES.task;
    const c = v.c;
    g.style.setProperty('--c', c);
    switch (v.t) {
      case 'mission': {
        mk('circle', { r: S.r + 46, fill: 'url(#g-mission)', class: 'halo' }, g);
        mk('circle', { r: S.r + 11, class: 'orbit' }, g);
        mk('circle', { r: S.r, class: 'shape' }, g);
        txt(g, 0, -2, 'LIFE', 'm-title', { 'text-anchor': 'middle' });
        txt(g, 0, 14, 'MISSION', 'cap', { 'text-anchor': 'middle' });
        if (v.statement) multiline(g, wrap(v.statement, 38, 2), 0, S.r + 26, 13, 'm-sub');
        else txt(g, 0, S.r + 26, 'Define your mission', 'm-sub dim-t', { 'text-anchor': 'middle' });
        break;
      }
      case 'area': {
        mk('circle', { r: S.r + 16, class: 'halo' }, g);
        mk('circle', { r: S.r, class: 'shape' }, g);
        mk('circle', { r: S.r - 7, class: 'inner' }, g);
        const lines = wrap(v.title, 11, 2);
        multiline(g, lines, 0, lines.length === 1 ? 4.5 : -3, 14, 'a-title');
        txt(g, 0, S.r + 16, 'DOMAIN', 'cap', { 'text-anchor': 'middle' });
        const s = v.stats;
        const t = mk('text', { x: 0, y: S.r + 30, class: 'sub', 'text-anchor': 'middle' }, g);
        if (v.mode === 'resources' && v.hours !== undefined) {
          const sp = mk('tspan', { class: v.overArea ? 'bad' : '' }, t);
          sp.textContent = `${v.hours}h / week${v.overArea ? ' · over' : ''}`;
        } else {
          const a = mk('tspan', {}, t);
          a.textContent = s.projects ? `${s.projects} project${s.projects === 1 ? '' : 's'}` : 'no projects';
          if (s.noNext) { const w = mk('tspan', { class: 'warn' }, t); w.textContent = ` · ${s.noNext} ⚠`; }
          if (s.blocked) { const w = mk('tspan', { class: 'bad' }, t); w.textContent = ` · ${s.blocked} blocked`; }
        }
        badge(g, S.r * 0.74, -S.r * 0.74, nd);
        break;
      }
      case 'resource': {
        mk('polygon', { points: hexPoints(S.r + 10), class: 'halo' }, g);
        mk('polygon', { points: hexPoints(S.r), class: 'shape' }, g);
        txt(g, 0, 5, { time: '◷', money: '¤', energy: 'ϟ', attention: '◈' }[v.kind] || '⬡', 'r-glyph', { 'text-anchor': 'middle' });
        txt(g, 0, S.r + 16, v.title.toUpperCase(), 'r-title', { 'text-anchor': 'middle' });
        txt(g, 0, S.r + 29, v.val, 'sub' + (v.bad ? ' bad' : ''), { 'text-anchor': 'middle' });
        badge(g, S.r * 0.8, -S.r * 0.8, nd);
        break;
      }
      case 'goal': {
        mk('circle', { r: S.r + 10, class: 'halo' }, g);
        mk('circle', { r: S.r, class: 'shape' }, g);
        mk('circle', { r: S.r * 0.62, class: 'ring2' }, g);
        mk('circle', { r: S.r * 0.24, class: 'core' }, g);
        multiline(g, wrap(v.title, 20, 2), 0, S.r + 15, 12.5, 'n-title');
        txt(g, 0, S.r + 15 + wrap(v.title, 20, 2).length * 12.5 + 1, `${(HORIZON[v.h] || {}).short || ''} GOAL`, 'cap', { 'text-anchor': 'middle' });
        badge(g, S.r * 0.78, -S.r * 0.78, nd);
        break;
      }
      case 'objective': {
        mk('circle', { r: S.r + 8, class: 'halo' }, g);
        mk('circle', { r: S.r, class: 'shape' }, g);
        mk('circle', { r: S.r * 0.34, class: 'core' }, g);
        const arc = 2 * Math.PI * (S.r + 3.5);
        if (v.p > 0) mk('circle', { r: S.r + 3.5, class: 'prog', 'stroke-dasharray': `${(arc * v.p) / 100} ${arc}`, transform: 'rotate(-90)' }, g);
        const lines = wrap(v.title, 20, 2);
        multiline(g, lines, 0, S.r + 16, 12.5, 'n-title');
        txt(g, 0, S.r + 16 + lines.length * 12.5 + 1, `${(HORIZON[v.h] || {}).short || ''} OBJECTIVE`, 'cap', { 'text-anchor': 'middle' });
        badge(g, S.r * 0.8, -S.r * 0.8, nd);
        break;
      }
      case 'project': {
        const w = S.w, h = S.h;
        mk('rect', { x: -w / 2 - 8, y: -h / 2 - 8, width: w + 16, height: h + 16, rx: 16, class: 'halo' }, g);
        mk('rect', { x: -w / 2, y: -h / 2, width: w, height: h, rx: 11, class: 'shape' }, g);
        mk('rect', { x: -w / 2 + 1, y: -h / 2 + 10, width: 3, height: h - 20, rx: 1.5, class: 'accent' }, g);
        txt(g, -w / 2 + 2, -h / 2 - 6, 'PROJECT', 'cap');
        txt(g, -w / 2 + 14, -4, truncate(v.title, 25), 'p-title');
        let sub = '', cls = 'p-sub';
        if (v.status === 'complete') { sub = '✓ Complete'; cls += ' ok'; }
        else if (v.blocked) { sub = '⛔ Blocked'; cls += ' bad'; }
        else if (v.noNext) { sub = '⚠ No next action'; cls += ' warn'; }
        else if (v.next) { sub = '→ ' + truncate(v.next, 27); cls += ' next'; }
        else if (v.waiting) { sub = '⧗ Waiting'; cls += ' warn'; }
        txt(g, -w / 2 + 14, 13, sub, cls);
        mk('rect', { x: -w / 2 + 12, y: h / 2 - 5, width: w - 24, height: 2, rx: 1, class: 'track' }, g);
        if (v.p) mk('rect', { x: -w / 2 + 12, y: h / 2 - 5, width: ((w - 24) * v.p) / 100, height: 2, rx: 1, class: 'fill' }, g);
        badge(g, w / 2, 0, nd);
        break;
      }
      case 'task': {
        const w = S.w, h = S.h;
        mk('rect', { x: -w / 2 - 6, y: -h / 2 - 6, width: w + 12, height: h + 12, rx: h / 2 + 6, class: 'halo' }, g);
        mk('rect', { x: -w / 2, y: -h / 2, width: w, height: h, rx: h / 2, class: 'shape' }, g);
        const cbx = mk('g', { class: 'check', 'data-check': '1', transform: `translate(${-w / 2 + 16} 0)` }, g);
        mk('rect', { x: -6, y: -6, width: 12, height: 12, rx: 3.5 }, cbx);
        if (v.status === 'done') txt(cbx, 0, 3.5, '✓', 'chk-t', { 'text-anchor': 'middle' });
        txt(g, -w / 2 + 30, 4, truncate(v.title, 24), 't-title');
        if (v.next && v.status === 'open') txt(g, w / 2 - 12, 4, '→', 'next-glyph', { 'text-anchor': 'middle' });
        txt(g, -w / 2 + 4, -h / 2 - 5, v.next ? 'NEXT ACTION' : 'ACTION', 'cap');
        break;
      }
      case 'waiting': {
        const w = S.w, h = S.h;
        mk('rect', { x: -w / 2 - 6, y: -h / 2 - 6, width: w + 12, height: h + 12, rx: h / 2 + 6, class: 'halo' }, g);
        mk('rect', { x: -w / 2, y: -h / 2, width: w, height: h, rx: h / 2, class: 'shape' }, g);
        txt(g, -w / 2 + 14, 4.5, '⧗', 'w-glyph');
        txt(g, -w / 2 + 30, 4, truncate(v.title + (v.who ? ' · ' + v.who : ''), 24), 't-title');
        txt(g, -w / 2 + 4, -h / 2 - 5, v.late ? 'WAITING · FOLLOW UP' : 'WAITING', 'cap' + (v.late ? ' warn' : ''));
        break;
      }
      case 'responsibility': {
        const w = S.w, h = S.h;
        mk('rect', { x: -w / 2 - 6, y: -h / 2 - 6, width: w + 12, height: h + 12, rx: 12, class: 'halo' }, g);
        mk('rect', { x: -w / 2, y: -h / 2, width: w, height: h, rx: 7, class: 'shape' }, g);
        txt(g, -w / 2 + 13, 4.5, '↻', 'w-glyph');
        txt(g, -w / 2 + 28, 4, truncate(v.title, 18), 't-title');
        txt(g, w / 2 - 10, 4, v.hrs ? `${round1(v.hrs)}h` : '', 'hrs', { 'text-anchor': 'end' });
        txt(g, -w / 2 + 4, -h / 2 - 5, 'RESPONSIBILITY', 'cap');
        break;
      }
      case 'habit': {
        mk('circle', { r: S.r + 8, class: 'halo' }, g);
        mk('circle', { r: S.r, class: 'shape' }, g);
        const arc = 2 * Math.PI * S.r;
        const p = Math.min(1, v.cnt / Math.max(1, v.tgt));
        if (p > 0) mk('circle', { r: S.r, class: 'prog', 'stroke-dasharray': `${arc * p} ${arc}`, transform: 'rotate(-90)' }, g);
        txt(g, 0, 4, p >= 1 ? '✓' : `${v.cnt}`, 'h-t', { 'text-anchor': 'middle' });
        multiline(g, wrap(v.title, 18, 2), 0, S.r + 14, 12, 'n-title');
        txt(g, 0, S.r + 14 + wrap(v.title, 18, 2).length * 12, `HABIT ${v.cnt}/${v.tgt}`, 'cap', { 'text-anchor': 'middle' });
        break;
      }
      case 'constraint': {
        const r = S.r;
        mk('path', { d: `M0 ${-r} L${r * 0.95} ${r * 0.7} L${-r * 0.95} ${r * 0.7} Z`, class: 'halo' }, g);
        mk('path', { d: `M0 ${-r} L${r * 0.95} ${r * 0.7} L${-r * 0.95} ${r * 0.7} Z`, class: 'shape' }, g);
        txt(g, 0, 6, '!', 'c-t', { 'text-anchor': 'middle' });
        const lines = wrap(v.title, 20, 2);
        multiline(g, lines, 0, r + 14, 12, 'n-title');
        txt(g, 0, r + 14 + lines.length * 12, 'CONSTRAINT', 'cap warn', { 'text-anchor': 'middle' });
        break;
      }
      default:
        mk('circle', { r: 16, class: 'shape' }, g);
        txt(g, 0, 30, truncate(v.title, 20), 'n-title', { 'text-anchor': 'middle' });
    }
  }

  function nodeClasses(nd, v) {
    const cls = ['node', 't-' + nd.type, 's-' + (nd.item.status || 'active')];
    if (v.noNext) cls.push('flag-nonext');
    if (v.blocked) cls.push('flag-blocked');
    if (v.t === 'task' && v.next) cls.push('is-next');
    if (v.t === 'resource' && v.bad) cls.push('flag-over');
    if (v.overArea) cls.push('flag-over');
    return cls;
  }

  // ---------- update ----------

  function update(newLayout, newOpts = {}) {
    layout = newLayout;
    opts = { ...opts, ...newOpts };
    svg.classList.toggle('linking', !!opts.linking);
    svg.dataset.mode = opts.mode;
    const seen = new Set();
    for (const nd of layout.nodes) {
      seen.add(nd.id);
      let n = nodes.get(nd.id);
      const v = nodeView(nd);
      const sig = JSON.stringify(v);
      if (!n) {
        const el = mk('g', { 'data-id': nd.id }, gNodes);
        const body = mk('g', { class: 'body' }, el);
        const parent = nodes.get(nd.parent);
        const sx = parent ? parent.x : nd.x, sy = parent ? parent.y : nd.y;
        n = { id: nd.id, el, body, x: sx, y: sy, tx: nd.x, ty: nd.y, s: parent ? 0.35 : 0.85, ts: 1, o: 0, to: 1, sig: '', nd };
        nodes.set(nd.id, n);
      }
      n.exiting = false;
      n.nd = nd;
      n.tx = nd.x; n.ty = nd.y; n.to = 1; n.ts = 1;
      if (drag && drag.type === 'node' && drag.moved && (drag.id === nd.id || drag.desc.has(nd.id))) { n.tx = n.x; n.ty = n.y; }
      if (n.sig !== sig) { buildNode(n, nd, v); n.sig = sig; }
      n.cls = nodeClasses(nd, v);
    }
    for (const [id, n] of nodes) {
      if (seen.has(id)) continue;
      if (!n.exiting) {
        n.exiting = true;
        const p = nodes.get(n.nd.parent);
        if (p && seen.has(p.id)) { n.tx = p.tx; n.ty = p.ty; }
        n.to = 0; n.ts = 0.35;
      }
    }
    const eseen = new Set();
    for (const e of layout.edges) {
      eseen.add(e.id);
      let E = edges.get(e.id);
      if (!E) {
        const g = mk('g', { class: 'edge', 'data-edge': e.id }, gEdges);
        const vis = mk('path', { class: 'vis' }, g);
        const hit = mk('path', { class: 'edge-hit' }, g);
        const lab = mk('g', { class: 'elabel' }, gLabels);
        const bg = mk('rect', { rx: 5, height: 16, y: -9 }, lab);
        const t = mk('text', { 'text-anchor': 'middle', y: 3 }, lab);
        E = { id: e.id, g, vis, hit, lab, bg, t, o: 0 };
        edges.set(e.id, E);
      }
      E.e = e;
      E.dead = false;
      const label = e.kind === 'rel' ? (e.flowLabel ? `${REL_TYPES[e.relKind].label} · ${e.flowLabel}` : REL_TYPES[e.relKind].label) + (e.count > 1 ? ` ×${e.count}` : '') : e.kind === 'serves' ? 'Serves' : e.kind === 'flow' ? e.flowLabel : '';
      if (E.label !== label) {
        E.t.textContent = label.toUpperCase();
        E.label = label;
        E.bw = label.length * 5.6 + 14;
        E.bg.setAttribute('width', E.bw);
        E.bg.setAttribute('x', -E.bw / 2);
      }
      const fam = e.family;
      const marker = (e.kind === 'rel' && !e.symmetric) || e.kind === 'flow' || e.kind === 'serves' ? `url(#m-${fam === 'serves' ? 'serves' : fam})` : null;
      if (marker) E.vis.setAttribute('marker-end', marker); else E.vis.removeAttribute('marker-end');
      const w = flowWidth(e);
      E.vis.style.strokeWidth = w ? w + 'px' : '';
    }
    for (const [id, E] of edges) if (!eseen.has(id)) E.dead = true;
    applyState();
    if (firstFit && layout.nodes.length) { firstFit = false; fit({ animate: false }); }
    kick();
  }

  function flowWidth(e) {
    if (!e.amount) return 0;
    if (e.resKind === 'money') return clamp(1.2 + e.amount / 250, 1.2, 8);
    if (e.resKind === 'energy' || e.resKind === 'attention') return clamp(1.2 + e.amount / 8, 1.2, 8);
    return clamp(1.2 + e.amount / 3, 1.2, 9);
  }

  function edgeVisible(e) {
    const m = opts.mode;
    const sel = opts.selected;
    const touch = (id) => id && (e.from === id || e.to === id);
    if (touch(sel) || touch(hoverId)) return true;
    if (e.kind === 'hier') return true;
    if (e.kind === 'flow') return m === 'resources';
    if (e.kind === 'serves') return m === 'map' || m === 'relationships';
    const fam = e.family;
    const involvesResource = [e.from, e.to].some((id) => { const x = store.get(id); return x && x.type === 'resource'; });
    if (m === 'relationships') return true;
    if (m === 'resources') {
      const fr = opts.flowRes || 'rc_time';
      return e.from === fr || e.to === fr || (fr === 'rc_money' && e.relKind === 'funds');
    }
    if (m === 'execution') return fam === 'dependency';
    // Structure mode: only the quiet "how domains help each other" layer; the rest lives in Relationships.
    return !involvesResource && !e.lifted && (fam === 'enable' || fam === 'flow');
  }

  function computeRelated() {
    related = new Set();
    whyIds = new Set();
    const sel = opts.selected;
    if (!sel || !nodes.has(sel)) return;
    related.add(sel);
    for (const e of layout.edges) {
      if (!edgeVisible(e)) continue;
      if (e.from === sel) related.add(e.to);
      if (e.to === sel) related.add(e.from);
    }
    let cur = sel;
    for (let i = 0; i < 20 && cur; i++) {
      whyIds.add(cur);
      related.add(cur);
      cur = layout.parentOf.get(cur);
    }
    whyIds.add('mission');
  }

  let flowTouched = new Set();
  function applyState() {
    computeRelated();
    flowTouched = new Set(['mission']);
    if (opts.mode === 'resources') for (const e of layout.edges) if (e.kind !== 'hier' && edgeVisible(e)) { flowTouched.add(e.from); flowTouched.add(e.to); }
    const sel = opts.selected;
    const hasSel = sel && nodes.has(sel);
    for (const n of nodes.values()) {
      if (!n.cls) continue;
      const c = [...n.cls];
      if (n.id === sel) c.push('is-selected');
      if (n.id === hoverId) c.push('is-hover');
      if (hasSel && !related.has(n.id)) c.push('is-dim');
      if (hasSel && related.has(n.id) && n.id !== sel) c.push('is-related');
      if (!hasSel && opts.mode === 'resources' && !flowTouched.has(n.id)) c.push('is-muted');
      if (opts.linking && n.id === opts.linkFrom) c.push('is-linksrc');
      if (n.exiting) c.push('is-exiting');
      n.el.setAttribute('class', c.join(' '));
    }
    const showAllLabels = opts.mode === 'relationships' || opts.mode === 'resources';
    for (const E of edges.values()) {
      if (!E.e) continue;
      const e = E.e;
      const visible = !E.dead && edgeVisible(e);
      const hot = (sel && (e.from === sel || e.to === sel)) || (hoverId && (e.from === hoverId || e.to === hoverId)) || hoverEdge === e.id || (sel && sel === (e.rel && e.rel.id));
      const why = e.kind === 'hier' && hasSel && whyIds.has(e.to) && whyIds.has(e.from);
      const cls = ['edge', 'k-' + e.kind, 'f-' + e.family];
      if (!visible) cls.push('is-hidden');
      if (hot) cls.push('is-hot');
      if (why) cls.push('is-why');
      if (hasSel && !hot && !why) cls.push('is-dim');
      if (e.lifted) cls.push('lifted');
      if (opts.mode === 'resources' && (e.kind === 'flow' || e.family === 'resource')) cls.push('flowing');
      E.g.setAttribute('class', cls.join(' '));
      const showLabel = visible && E.label && e.kind !== 'hier' && (hot || (showAllLabels && (e.kind !== 'serves')));
      E.lab.setAttribute('class', 'elabel f-' + e.family + (showLabel ? ' show' : '') + (hasSel && !hot ? ' dim' : ''));
    }
  }

  // ---------- geometry ----------

  function boundary(n, ux, uy) {
    const S = SIZES[n.nd.type] || SIZES.task;
    if (S.shape === 'rect') {
      const ax = Math.abs(ux) || 1e-6, ay = Math.abs(uy) || 1e-6;
      return Math.min(S.w / 2 / ax, S.h / 2 / ay) + 4;
    }
    return (S.r || 20) + 5;
  }

  function edgeGeom(e, a, b) {
    const ax = a.x, ay = a.y, bx = b.x, by = b.y;
    const dx = bx - ax, dy = by - ay;
    const dist = Math.hypot(dx, dy) || 1;
    if (e.kind === 'hier') {
      if (a.id === 'mission') return { d: `M${ax},${ay} L${bx},${by}`, mx: (ax + bx) / 2, my: (ay + by) / 2 };
      const la = Math.hypot(ax, ay) || 1, lb = Math.hypot(bx, by) || 1;
      const k = dist * 0.38;
      const c1x = ax + (ax / la) * k, c1y = ay + (ay / la) * k;
      const c2x = bx - (bx / lb) * k, c2y = by - (by / lb) * k;
      return { d: `M${ax},${ay} C${c1x},${c1y} ${c2x},${c2y} ${bx},${by}`, mx: (ax + bx) / 2, my: (ay + by) / 2 };
    }
    const mx = (ax + bx) / 2, my = (ay + by) / 2;
    let nx = -dy / dist, ny = dx / dist;
    // Bow toward the centre: the inside of the domain ring is open space, while the
    // outside of a chord runs straight through the domains between its endpoints.
    if (nx * mx + ny * my > 0) { nx = -nx; ny = -ny; }
    const i = e.bend || 0;
    const sign = i % 2 === 0 ? 1 : -1;
    const off = dist * (0.16 + 0.1 * Math.ceil(i / 2)) * sign;
    const cx = mx + nx * off, cy = my + ny * off;
    let ux = cx - ax, uy = cy - ay; let l = Math.hypot(ux, uy) || 1; ux /= l; uy /= l;
    const sa = boundary(a, ux, uy);
    let vx = bx - cx, vy = by - cy; l = Math.hypot(vx, vy) || 1; vx /= l; vy /= l;
    const sb = boundary(b, vx, vy);
    const x0 = ax + ux * sa, y0 = ay + uy * sa;
    const x1 = bx - vx * sb, y1 = by - vy * sb;
    return { d: `M${x0},${y0} Q${cx},${cy} ${x1},${y1}`, mx: 0.25 * x0 + 0.5 * cx + 0.25 * x1, my: 0.25 * y0 + 0.5 * cy + 0.25 * y1 };
  }

  // ---------- frame loop ----------

  function kick() {
    if (!raf) raf = requestAnimationFrame(frame);
  }

  function frame() {
    raf = null;
    let moving = false;
    for (const [id, n] of nodes) {
      const dx = n.tx - n.x, dy = n.ty - n.y;
      if (Math.abs(dx) > 0.15 || Math.abs(dy) > 0.15) { n.x += dx * EASE; n.y += dy * EASE; moving = true; } else { n.x = n.tx; n.y = n.ty; }
      if (Math.abs(n.to - n.o) > 0.01) { n.o += (n.to - n.o) * EASE; moving = true; } else n.o = n.to;
      if (Math.abs(n.ts - n.s) > 0.005) { n.s += (n.ts - n.s) * EASE; moving = true; } else n.s = n.ts;
      n.el.setAttribute('transform', `translate(${n.x.toFixed(2)} ${n.y.toFixed(2)})`);
      n.body.setAttribute('transform', n.s === 1 ? '' : `scale(${n.s.toFixed(3)})`);
      n.el.style.opacity = n.o >= 0.999 ? '' : n.o.toFixed(3);
      if (n.exiting && n.o < 0.03) { n.el.remove(); nodes.delete(id); }
    }
    for (const [id, E] of edges) {
      const a = nodes.get(E.e.from), b = nodes.get(E.e.to);
      const target = E.dead || !a || !b || a.exiting || b.exiting ? 0 : 1;
      if (Math.abs(target - E.o) > 0.01) { E.o += (target - E.o) * EASE; moving = true; } else E.o = target;
      if (!a || !b || (E.dead && E.o < 0.03)) { E.g.remove(); E.lab.remove(); edges.delete(id); continue; }
      const gm = edgeGeom(E.e, a, b);
      E.vis.setAttribute('d', gm.d);
      E.hit.setAttribute('d', gm.d);
      E.g.style.opacity = E.o >= 0.999 ? '' : E.o.toFixed(3);
      E.lab.setAttribute('transform', `translate(${gm.mx.toFixed(1)} ${gm.my.toFixed(1)})`);
    }
    for (const k of ['x', 'y', 'k']) {
      const d = camT[k] - cam[k];
      if (Math.abs(d) > (k === 'k' ? 0.0005 : 0.1)) { cam[k] += d * CAM_EASE; moving = true; } else cam[k] = camT[k];
    }
    applyCam();
    if (moving) kick();
  }

  function applyCam() {
    world.setAttribute('transform', `translate(${cam.x.toFixed(2)} ${cam.y.toFixed(2)}) scale(${cam.k.toFixed(4)})`);
    grid.setAttribute('transform', `translate(${cam.x.toFixed(2)} ${cam.y.toFixed(2)}) scale(${cam.k.toFixed(4)})`);
    svg.style.setProperty('--zoom', cam.k.toFixed(3));
    svg.classList.toggle('zoomed-out', cam.k < 0.55);
  }

  // ---------- camera ----------

  function viewport() {
    const r = svg.getBoundingClientRect();
    return { w: r.width, h: r.height, left: r.left, top: r.top, sx: insets.left, sy: insets.top, sw: Math.max(200, r.width - insets.left - insets.right), sh: Math.max(200, r.height - insets.top - insets.bottom) };
  }

  function fit({ ids = null, animate = true, maxK = 1.1 } = {}) {
    const list = layout.nodes.filter((n) => !ids || ids.includes(n.id));
    if (!list.length) return;
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const n of list) {
      const S = SIZES[n.type] || SIZES.task;
      const hw = S.shape === 'rect' ? S.w / 2 : Math.max(S.r, 62);
      const hh = S.shape === 'rect' ? S.h / 2 : S.r + 36;
      x0 = Math.min(x0, n.x - hw); x1 = Math.max(x1, n.x + hw);
      y0 = Math.min(y0, n.y - hh); y1 = Math.max(y1, n.y + hh + 20);
    }
    const vp = viewport();
    const pad = 40;
    const k = clamp(Math.min((vp.sw - pad * 2) / (x1 - x0), (vp.sh - pad * 2) / (y1 - y0)), 0.18, maxK);
    camT.k = k;
    camT.x = vp.sx + vp.sw / 2 - ((x0 + x1) / 2) * k;
    camT.y = vp.sy + vp.sh / 2 - ((y0 + y1) / 2) * k;
    if (!animate) Object.assign(cam, camT);
    kick();
  }

  function focus(id, { zoom = null } = {}) {
    const nd = layout.nodes.find((n) => n.id === id);
    if (!nd) return;
    const vp = viewport();
    const k = zoom || Math.max(camT.k, 0.85);
    camT.k = k;
    camT.x = vp.sx + vp.sw / 2 - nd.x * k;
    camT.y = vp.sy + vp.sh / 2 - nd.y * k;
    kick();
  }

  function zoomAt(factor, sx, sy) {
    const vp = viewport();
    if (sx === undefined) { sx = vp.sx + vp.sw / 2; sy = vp.sy + vp.sh / 2; }
    const k = clamp(camT.k * factor, 0.15, 2.8);
    const wx = (sx - camT.x) / camT.k, wy = (sy - camT.y) / camT.k;
    camT.k = k;
    camT.x = sx - wx * k;
    camT.y = sy - wy * k;
    kick();
  }

  function toWorld(clientX, clientY) {
    const r = svg.getBoundingClientRect();
    return { x: (clientX - r.left - cam.x) / cam.k, y: (clientY - r.top - cam.y) / cam.k };
  }

  // ---------- pointer ----------

  function descendantsOf(id) {
    const out = new Set();
    const stack = [id];
    while (stack.length) {
      const cur = stack.pop();
      for (const [cid, p] of layout.parentOf) if (p === cur && !out.has(cid) && nodes.has(cid)) { out.add(cid); stack.push(cid); }
    }
    return out;
  }

  svg.addEventListener('pointerdown', (ev) => {
    if (ev.button !== 0) return;
    const nodeEl = ev.target.closest('.node');
    const edgeEl = ev.target.closest('.edge');
    const chk = ev.target.closest('[data-check]');
    const base = { sx: ev.clientX, sy: ev.clientY, moved: false, pid: ev.pointerId };
    if (nodeEl) {
      const id = nodeEl.getAttribute('data-id');
      const n = nodes.get(id);
      const w = toWorld(ev.clientX, ev.clientY);
      drag = { ...base, type: 'node', id, gx: w.x - n.x, gy: w.y - n.y, check: !!chk, desc: descendantsOf(id), start: { x: n.x, y: n.y } };
    } else if (edgeEl && !edgeEl.classList.contains('is-hidden')) {
      drag = { ...base, type: 'edge', id: edgeEl.getAttribute('data-edge') };
    } else {
      drag = { ...base, type: 'pan', cx: camT.x, cy: camT.y };
      svg.classList.add('panning');
    }
    try { svg.setPointerCapture(ev.pointerId); } catch { /* ignore */ }
  });

  svg.addEventListener('pointermove', (ev) => {
    if (!drag) return;
    const dx = ev.clientX - drag.sx, dy = ev.clientY - drag.sy;
    if (!drag.moved && Math.hypot(dx, dy) > 4) drag.moved = true;
    if (!drag.moved) return;
    if (drag.type === 'pan') {
      camT.x = cam.x = drag.cx + dx;
      camT.y = cam.y = drag.cy + dy;
      applyCam();
    } else if (drag.type === 'node') {
      const n = nodes.get(drag.id);
      if (!n) return;
      const w = toWorld(ev.clientX, ev.clientY);
      const nx = w.x - drag.gx, ny = w.y - drag.gy;
      const ddx = nx - n.x, ddy = ny - n.y;
      n.x = n.tx = nx; n.y = n.ty = ny;
      for (const cid of drag.desc) { const c = nodes.get(cid); if (c) { c.tx += ddx; c.ty += ddy; } }
      svg.classList.add('dragging');
      kick();
    }
  });

  function endPointer(ev) {
    if (!drag) return;
    const d = drag;
    drag = null;
    svg.classList.remove('panning', 'dragging');
    try { svg.releasePointerCapture(ev.pointerId); } catch { /* ignore */ }
    if (ev.type === 'pointercancel') return;
    if (d.moved) {
      if (d.type === 'node') {
        const n = nodes.get(d.id);
        if (n) cb.onDragEnd && cb.onDragEnd(d.id, { x: n.x, y: n.y });
      }
      return;
    }
    if (d.type === 'node') {
      const now = performance.now();
      const dbl = lastClick.id === d.id && now - lastClick.t < 340;
      lastClick = { id: dbl ? null : d.id, t: now };
      if (d.check) { cb.onCheck && cb.onCheck(d.id); return; }
      if (dbl) cb.onToggle && cb.onToggle(d.id);
      else cb.onSelect && cb.onSelect(d.id);
    } else if (d.type === 'edge') {
      const E = edges.get(d.id);
      if (E && cb.onSelectEdge) cb.onSelectEdge(E.e);
    } else {
      cb.onBackground && cb.onBackground();
    }
  }
  svg.addEventListener('pointerup', endPointer);
  svg.addEventListener('pointercancel', endPointer);

  svg.addEventListener('pointerover', (ev) => {
    const nodeEl = ev.target.closest('.node');
    const edgeEl = !nodeEl && ev.target.closest('.edge');
    const id = nodeEl ? nodeEl.getAttribute('data-id') : null;
    const eid = edgeEl ? edgeEl.getAttribute('data-edge') : null;
    if (id !== hoverId || eid !== hoverEdge) {
      hoverId = id;
      hoverEdge = eid;
      applyState();
    }
  });
  svg.addEventListener('pointerleave', () => { hoverId = null; hoverEdge = null; applyState(); });

  svg.addEventListener('wheel', (ev) => {
    ev.preventDefault();
    const r = svg.getBoundingClientRect();
    const delta = ev.deltaMode === 1 ? ev.deltaY * 16 : ev.deltaY;
    const f = Math.exp(-delta * (ev.ctrlKey ? 0.01 : 0.0016));
    zoomAt(f, ev.clientX - r.left, ev.clientY - r.top);
  }, { passive: false });

  return {
    update,
    select(id) { opts.selected = id; applyState(); },
    setOpts(o) { opts = { ...opts, ...o }; svg.classList.toggle('linking', !!opts.linking); applyState(); },
    fit, focus, zoomAt,
    setInsets(i) { insets = { ...insets, ...i }; },
    refit() { firstFit = true; },
    has: (id) => nodes.has(id),
    screenPos(id) {
      const n = nodes.get(id);
      if (!n) return null;
      const r = svg.getBoundingClientRect();
      return { x: r.left + cam.x + n.tx * cam.k, y: r.top + cam.y + n.ty * cam.k };
    },
    edgeScreenPos(id) {
      const E = edges.get(id);
      if (!E) return null;
      const r = svg.getBoundingClientRect();
      const len = E.hit.getTotalLength();
      const p = E.hit.getPointAtLength(len / 2);
      return { x: r.left + cam.x + p.x * cam.k, y: r.top + cam.y + p.y * cam.k };
    },
    get camera() { return { ...camT }; },
  };
}
