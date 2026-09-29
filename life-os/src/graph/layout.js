// Graph layout: which nodes are visible, where they sit, and which edges connect them.
// Pure function of (data, mode, expansion). The renderer only animates toward these targets.

import { store } from '../store.js';
import { graphParentId, isOpen, isActiveProject, areaIdOf, timeSummary } from '../model.js';
import { REL_TYPES } from '../schema.js';

export const SIZES = {
  mission: { shape: 'circle', r: 60 },
  area: { shape: 'circle', r: 46 },
  resource: { shape: 'hex', r: 30 },
  goal: { shape: 'circle', r: 26 },
  objective: { shape: 'circle', r: 19 },
  project: { shape: 'rect', w: 184, h: 50 },
  task: { shape: 'rect', w: 170, h: 30 },
  waiting: { shape: 'rect', w: 170, h: 30 },
  responsibility: { shape: 'rect', w: 170, h: 30 },
  habit: { shape: 'circle', r: 15 },
  constraint: { shape: 'tri', r: 20 },
};

// Footprint used for spacing, including labels drawn under round nodes.
export function footprint(type) {
  const s = SIZES[type] || SIZES.task;
  if (s.shape === 'rect') return { w: s.w, h: s.h };
  return { w: Math.max(2 * s.r, 124), h: 2 * s.r + 34 };
}

const TYPE_ORDER = { goal: 0, objective: 1, project: 2, responsibility: 3, habit: 4, waiting: 5, task: 6, constraint: 7 };
const RES_ANGLE = { time: -Math.PI / 2, attention: 0, money: Math.PI / 2, energy: Math.PI };

function included(x, mode, showCompleted) {
  if (!x) return false;
  if (x.status === 'dropped' || x.status === 'cancelled') return false;
  if (!showCompleted && !isOpen(x) && x.type !== 'resource') return false;
  if (mode === 'execution') {
    if (x.type === 'area' || x.type === 'resource') return true;
    if (x.type === 'project') return isActiveProject(x);
    if (x.type === 'task') return isOpen(x) && x.isNext;
    if (x.type === 'waiting') return isOpen(x);
    return false;
  }
  return ['area', 'resource', 'goal', 'objective', 'project', 'task', 'waiting', 'responsibility', 'habit', 'constraint'].includes(x.type);
}

function modeParent(x, mode) {
  if (mode === 'execution' && x.type !== 'area' && x.type !== 'resource') {
    if (x.type === 'project') return x.parentId || areaIdOf(x) || 'mission';
    if (x.type === 'task' || x.type === 'waiting') return x.projectId || areaIdOf(x) || null;
  }
  return graphParentId(x);
}

export function computeLayout({ mode = 'map', expanded = [], execCollapsed = [], showCompleted = false, flowRes = 'rc_time' }) {
  const d = store.data;
  const exp = new Set(expanded);
  const execCol = new Set(execCollapsed);
  const pool = [...d.areas, ...d.resources, ...d.goals, ...d.objectives, ...d.projects, ...d.tasks, ...d.waiting, ...d.responsibilities, ...d.habits, ...d.constraints];
  const inc = new Map();
  for (const x of pool) if (included(x, mode, showCompleted)) inc.set(x.id, x);

  const parentOf = new Map();
  const kids = new Map([['mission', []]]);
  for (const x of inc.values()) {
    let p = modeParent(x, mode);
    let guard = 0;
    while (p && p !== 'mission' && !inc.has(p) && guard++ < 20) {
      const px = store.get(p);
      p = px ? modeParent(px, mode) : null;
    }
    if (!p) continue; // unattached inbox items are not part of the map
    parentOf.set(x.id, p);
    if (!kids.has(p)) kids.set(p, []);
    kids.get(p).push(x.id);
  }
  for (const list of kids.values()) {
    list.sort((a, b) => {
      const A = inc.get(a), B = inc.get(b);
      const t = (TYPE_ORDER[A.type] ?? 9) - (TYPE_ORDER[B.type] ?? 9);
      if (t) return t;
      if (A.type === 'area') return (A.order ?? 0) - (B.order ?? 0);
      return String(A.createdAt || '').localeCompare(String(B.createdAt || '')) || (A.order || 0) - (B.order || 0);
    });
  }

  const isExp = (id) => {
    if (id === 'mission') return true;
    if (mode === 'execution') {
      const x = inc.get(id);
      return !!x && (x.type === 'area' || x.type === 'project') && !execCol.has(id);
    }
    return exp.has(id);
  };

  // ---- visibility ----
  const vis = new Set(['mission']);
  const depth = new Map([['mission', 0]]);
  const queue = ['mission'];
  while (queue.length) {
    const id = queue.shift();
    if (!isExp(id)) continue;
    for (const c of kids.get(id) || []) {
      vis.add(c);
      depth.set(c, depth.get(id) + 1);
      queue.push(c);
    }
  }
  const visKids = (id) => (isExp(id) ? (kids.get(id) || []).filter((c) => vis.has(c)) : []);

  // ---- default positions (P0) ----
  const P0 = new Map([['mission', { x: 0, y: 0 }]]);
  const topKids = kids.get('mission') || [];
  const ring = topKids.filter((id) => inc.get(id).type !== 'resource');
  const resources = topKids.filter((id) => inc.get(id).type === 'resource');
  const n = Math.max(ring.length, 1);
  const R = Math.max(310, n * 54);
  ring.forEach((id, i) => {
    const th = -Math.PI / 2 + ((i + 0.5) * 2 * Math.PI) / n;
    P0.set(id, { x: Math.cos(th) * R, y: Math.sin(th) * R });
    layoutSubtree(id, th, R, (2 * Math.PI) / n);
  });
  resources.forEach((id, i) => {
    const x = inc.get(id);
    const th = RES_ANGLE[x.kind] ?? (i * Math.PI) / 2;
    const rr = 158;
    P0.set(id, { x: Math.cos(th) * rr, y: Math.sin(th) * rr });
    layoutSubtree(id, th, rr, Math.PI / 3);
  });

  function layoutSubtree(rootId, th, R0, sector) {
    const levels = [];
    const leaves = new Map();
    const countLeaves = (id) => {
      const k = visKids(id);
      const v = k.length ? k.reduce((s, c) => s + countLeaves(c), 0) : 1;
      leaves.set(id, v);
      return v;
    };
    const L = countLeaves(rootId);
    if (!visKids(rootId).length) return;
    const collect = (id, dd) => {
      for (const c of visKids(id)) {
        (levels[dd] = levels[dd] || []).push(c);
        collect(c, dd + 1);
      }
    };
    collect(rootId, 1);
    const cos = Math.abs(Math.cos(th)), sin = Math.abs(Math.sin(th));
    const radial = (id) => { const f = footprint(inc.get(id).type); return f.w * cos + f.h * sin; };
    const tang = (id) => { const f = footprint(inc.get(id).type); return f.w * sin + f.h * cos + 18; };
    const rootType = inc.get(rootId).type;
    const r = [R0];
    let prevExt = footprint(rootType).w * cos + footprint(rootType).h * sin;
    for (let dd = 1; dd < levels.length; dd++) {
      const ext = Math.max(...levels[dd].map(radial));
      r[dd] = r[dd - 1] + prevExt / 2 + ext / 2 + 44;
      prevExt = ext;
    }
    const D = levels.length - 1;
    const sMax = Math.max(...levels.slice(1).flat().map(tang));
    const Smax = sector * 0.92;
    const W = Math.min(Smax, (L * sMax) / r[D]);
    const ang = new Map();
    const assign = (id, a0, a1) => {
      const k = visKids(id);
      const total = k.reduce((s, c) => s + leaves.get(c), 0);
      let cur = a0;
      for (const c of k) {
        const w = ((a1 - a0) * leaves.get(c)) / total;
        ang.set(c, cur + w / 2);
        assign(c, cur, cur + w);
        cur += w;
      }
    };
    assign(rootId, th - W / 2, th + W / 2);
    // Push crowded rings outward until neighbours no longer overlap.
    for (let dd = 1; dd <= D; dd++) {
      const lv = levels[dd].map((id) => ang.get(id)).sort((a, b) => a - b);
      let g = Infinity;
      for (let i = 1; i < lv.length; i++) g = Math.min(g, lv[i] - lv[i - 1]);
      const s = Math.max(...levels[dd].map(tang));
      if (Number.isFinite(g) && g > 0) r[dd] = Math.max(r[dd], s / g);
      if (dd > 1) {
        const minGap = Math.max(...levels[dd - 1].map(radial)) / 2 + Math.max(...levels[dd].map(radial)) / 2 + 40;
        r[dd] = Math.max(r[dd], r[dd - 1] + minGap);
      }
    }
    // Keep the same direction relative to the root's own position.
    const rootP = P0.get(rootId);
    const base = { x: Math.cos(th) * R0, y: Math.sin(th) * R0 };
    for (let dd = 1; dd <= D; dd++) {
      for (const id of levels[dd]) {
        const a = ang.get(id);
        P0.set(id, { x: Math.cos(a) * r[dd] - base.x + rootP.x, y: Math.sin(a) * r[dd] - base.y + rootP.y });
      }
    }
  }

  // ---- apply user offsets relative to parents ----
  const offsets = (d.layout && d.layout.offsets) || {};
  const pos = new Map();
  const mo = offsets.mission;
  pos.set('mission', mo ? { x: mo.x, y: mo.y } : { x: 0, y: 0 });
  const order = [...vis].sort((a, b) => depth.get(a) - depth.get(b));
  for (const id of order) {
    if (id === 'mission') continue;
    const p = parentOf.get(id);
    const pp = pos.get(p) || { x: 0, y: 0 };
    const off = offsets[id];
    const p0 = P0.get(id) || { x: 0, y: 0 };
    const pp0 = P0.get(p) || { x: 0, y: 0 };
    pos.set(id, off ? { x: pp.x + off.x, y: pp.y + off.y } : { x: pp.x + (p0.x - pp0.x), y: pp.y + (p0.y - pp0.y) });
  }

  // ---- nodes ----
  const nodes = order.map((id) => {
    const item = id === 'mission' ? d.mission : inc.get(id);
    const all = kids.get(id) || [];
    return {
      id, item, type: item.type, parent: parentOf.get(id) || null, depth: depth.get(id),
      x: pos.get(id).x, y: pos.get(id).y,
      childCount: all.length, expanded: isExp(id) && all.length > 0,
    };
  });

  // ---- edges ----
  const climb = (id) => {
    let cur = id;
    for (let i = 0; i < 24 && cur; i++) {
      if (vis.has(cur)) return cur;
      const x = store.get(cur);
      cur = parentOf.get(cur) || (x ? modeParent(x, mode) : null);
    }
    return null;
  };
  const edges = [];
  for (const nd of nodes) {
    if (nd.id === 'mission' || nd.type === 'resource') continue;
    edges.push({ id: 'h:' + nd.id, kind: 'hier', from: nd.parent, to: nd.id, family: 'hier' });
  }
  const relSeen = new Map();
  for (const r of d.relationships) {
    const def = REL_TYPES[r.kind];
    if (!def) continue;
    const a = climb(r.from), b = climb(r.to);
    if (!a || !b || a === b || a === 'mission' || b === 'mission') continue;
    const lifted = a !== r.from || b !== r.to;
    // Parent/child pairs already read as structure; a lifted edge along it adds only noise.
    if (lifted && (parentOf.get(a) === b || parentOf.get(b) === a)) continue;
    const key = lifted ? `L:${a}|${b}|${r.kind}` : r.id;
    if (relSeen.has(key)) { relSeen.get(key).count++; continue; }
    const e = { id: key, kind: 'rel', relKind: r.kind, family: def.family, from: a, to: b, rel: r, lifted, count: 1, symmetric: !!def.symmetric };
    relSeen.set(key, e);
    edges.push(e);
  }
  for (const nd of nodes) {
    const x = nd.item;
    if (x.type === 'project' && x.objectiveId && nd.parent !== x.objectiveId) {
      const b = climb(x.objectiveId);
      if (b && b !== nd.parent && b !== nd.id && b !== 'mission') edges.push({ id: 's:' + nd.id, kind: 'serves', from: nd.id, to: b, family: 'serves' });
    }
  }
  if (mode === 'resources') addFlows(edges, vis, climb, flowRes);

  // Parallel edges between the same pair bend apart.
  const pairCount = new Map();
  for (const e of edges) {
    if (e.kind === 'hier') continue;
    const k = [e.from, e.to].sort().join('|');
    const i = pairCount.get(k) || 0;
    e.bend = i;
    pairCount.set(k, i + 1);
  }
  return { nodes, edges, vis, parentOf };
}

function addFlows(edges, vis, climb, flowRes) {
  const d = store.data;
  const t = timeSummary();
  const findRel = (from, to) => edges.find((e) => e.kind === 'rel' && e.from === from && e.to === to && !e.lifted);
  const push = (from, to, amount, label, resKind) => {
    if (!from || !to || from === to || !amount) return;
    const hit = findRel(from, to);
    if (hit) { hit.amount = (hit.amount || 0) + amount; hit.flowLabel = label; return; }
    const id = `f:${from}|${to}`;
    const prev = edges.find((e) => e.id === id);
    if (prev) { prev.amount += amount; prev.flowLabel = resKind === 'time' ? `${Math.round(prev.amount * 10) / 10}h` : prev.flowLabel; return; }
    edges.push({ id, kind: 'flow', family: 'resource', from, to, amount, flowLabel: label, resKind });
  };
  if (flowRes === 'rc_time' && vis.has('rc_time')) {
    for (const a of d.areas) {
      if (!vis.has(a.id)) continue;
      const h = (t.fixedByArea.get(a.id) || 0) + (t.effectiveByArea.get(a.id) || 0);
      push('rc_time', a.id, h, `${Math.round(h * 10) / 10}h`, 'time');
    }
  }
  for (const al of d.allocations) {
    if (al.resourceId === 'rc_time' || al.resourceId !== flowRes) continue;
    const res = store.get(al.resourceId);
    if (!res || !vis.has(res.id)) continue;
    const target = climb(al.targetId);
    const amt = Number(al.amount) || 0;
    const label = res.kind === 'money' ? `${al.direction === 'in' ? '+' : '−'}${amt}` : `${amt}%`;
    if (al.direction === 'in') push(target, res.id, amt, label, res.kind);
    else push(res.id, target, amt, label, res.kind);
  }
}
