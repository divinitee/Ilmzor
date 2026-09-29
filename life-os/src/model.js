// Business logic. Pure reads over the store: hierarchy, "why", impact, capacity, execution.

import { store, BUFFER } from './store.js';
import { TYPES, REL_TYPES, HORIZON, STATUSES } from './schema.js';
import { today, weekStart, weekEnd, addDays, isoDow, daysBetween, round1 } from './util.js';

const CLOSED = new Set(['done', 'complete', 'achieved', 'received', 'dropped', 'cancelled', 'archived', 'resolved']);
const NEUTRAL = '#9aa6b4';

export const get = (id) => store.get(id);
export const isOpen = (x) => !!x && !CLOSED.has(x.status);
export const isDone = (x) => !!x && (x.status === 'done' || x.status === 'complete' || x.status === 'achieved' || x.status === 'received');
export const titleOf = (id) => (get(id) ? get(id).title : '');
export const typeLabel = (x) => {
  if (!x) return '';
  if (x.type === 'task' && x.isNext && isOpen(x)) return 'Next action';
  if (x.type === 'objective' || x.type === 'goal') return `${HORIZON[x.horizon] ? HORIZON[x.horizon].label + ' ' : ''}${TYPES[x.type].label}`;
  if (x.type === 'relationship') return REL_TYPES[x.kind] ? REL_TYPES[x.kind].category : 'Relationship';
  return TYPES[x.type] ? TYPES[x.type].label : x.type;
};
export const statusLabel = (x) => {
  const list = STATUSES[x.type] || [];
  const hit = list.find(([k]) => k === x.status);
  return hit ? hit[1] : '';
};

// ---------- hierarchy ----------

export function areaIdOf(x, depth = 0) {
  if (!x || depth > 12) return null;
  if (x.type === 'area') return x.id;
  if (x.areaId) return x.areaId;
  const p = get(x.projectId) || get(x.parentId) || get(x.objectiveId) || (x.type === 'constraint' ? null : null);
  return p ? areaIdOf(p, depth + 1) : null;
}
export const areaOf = (x) => get(areaIdOf(x));
export const colorOf = (x) => {
  if (!x) return NEUTRAL;
  if (x.type === 'area') return x.color || NEUTRAL;
  const a = areaOf(x);
  return a ? a.color || NEUTRAL : NEUTRAL;
};

// The "why" parent: the thing this item exists to serve.
export function whyParentId(x) {
  if (!x) return null;
  switch (x.type) {
    case 'area': case 'resource': return 'mission';
    case 'goal': case 'objective': return x.parentId || x.areaId || 'mission';
    case 'project': return x.parentId || x.objectiveId || x.areaId || 'mission';
    case 'task': return x.projectId || x.objectiveId || x.areaId || null;
    case 'waiting': return x.projectId || x.areaId || null;
    case 'habit': case 'responsibility': return x.areaId || 'mission';
    case 'constraint': return x.areaId || x.resourceId || 'mission';
    default: return null;
  }
}

// The graph parent. Same as "why", except a project that serves an objective in
// another domain stays in its own domain (and gets a "serves" edge instead).
export function graphParentId(x) {
  if (!x) return null;
  if (x.type === 'project' && !x.parentId && x.objectiveId && x.areaId) {
    const ob = get(x.objectiveId);
    if (ob && areaIdOf(ob) !== x.areaId) return x.areaId;
  }
  if (x.type === 'person' || x.type === 'relationship' || x.type === 'allocation' || x.type === 'review') return null;
  return whyParentId(x);
}

export function whyChain(id) {
  const chain = [];
  const seen = new Set();
  let cur = get(id);
  while (cur && !seen.has(cur.id)) {
    seen.add(cur.id);
    chain.unshift(cur);
    const pid = whyParentId(cur);
    // Surface the domain a top-level goal belongs to.
    cur = get(pid);
  }
  return chain;
}

// "Finance Career → Career Launch" style path, excluding mission and the item itself.
export function pathLabel(x) {
  if (!x) return '';
  if (x.type === 'relationship') return `${titleOf(x.from)} → ${titleOf(x.to)}`;
  return whyChain(x.id).filter((c) => c.id !== 'mission' && c.id !== x.id).map((c) => c.title).join(' → ');
}

export function childrenOf(id) {
  return store.all().filter((x) => whyParentId(x) === id);
}

export function descendants(id) {
  const out = [];
  const stack = [id];
  const seen = new Set([id]);
  while (stack.length) {
    const cur = stack.pop();
    for (const c of childrenOf(cur)) {
      if (seen.has(c.id)) continue;
      seen.add(c.id);
      out.push(c);
      stack.push(c.id);
    }
  }
  return out;
}

// ---------- relationships & impact ----------

export function relsOf(id) {
  return store.data.relationships.filter((r) => r.from === id || r.to === id);
}

export function blockersOf(id) {
  return store.data.relationships
    .filter((r) => r.kind === 'blocks' && r.to === id)
    .map((r) => get(r.from))
    .filter((b) => b && isOpen(b));
}
export function blocksOf(id) {
  return store.data.relationships.filter((r) => r.kind === 'blocks' && r.from === id).map((r) => get(r.to)).filter(Boolean);
}
export const isBlocked = (x) => !!x && isOpen(x) && (x.status === 'blocked' || blockersOf(x.id).length > 0);

// Upstream: what affects this. Downstream: what this affects.
export function impact(id) {
  const x = get(id);
  const up = [];
  const down = [];
  for (const r of store.data.relationships) {
    const def = REL_TYPES[r.kind];
    if (!def) continue;
    if (r.to === id) (def.symmetric ? down : up).push({ item: get(r.from), label: def.symmetric ? def.verb : def.inverse, rel: r });
    else if (r.from === id) down.push({ item: get(r.to), label: def.verb, rel: r });
  }
  if (!x) return { up, down };
  // Structural: drivers below push this upward; the parent is what this serves.
  const drivers = childrenOf(id).filter((c) => isOpen(c) && ['goal', 'objective', 'project', 'task', 'waiting'].includes(c.type));
  for (const c of drivers.slice(0, 8)) up.push({ item: c, label: c.type === 'waiting' ? 'waiting on' : 'driven by', structural: true });
  const pid = whyParentId(x);
  if (pid && pid !== 'mission') down.push({ item: get(pid), label: 'serves', structural: true });
  if (x.type === 'project' && x.objectiveId && graphParentId(x) !== x.objectiveId && pid !== x.objectiveId) {
    down.push({ item: get(x.objectiveId), label: 'serves', structural: true });
  }
  // Time flows into every domain that has fixed or allocated hours.
  if (x.type === 'area') {
    const t = timeSummary();
    const h = (t.fixedByArea.get(id) || 0) + (t.effectiveByArea.get(id) || 0);
    if (h > 0 && !up.some((u) => u.item && u.item.kind === 'time')) up.push({ item: get('rc_time'), label: `uses ${round1(h)}h/week of`, structural: true });
  }
  if (x.type === 'resource' && x.kind === 'time') {
    const t = timeSummary();
    for (const a of store.data.areas) {
      const h = (t.fixedByArea.get(a.id) || 0) + (t.effectiveByArea.get(a.id) || 0);
      if (h > 0 && !down.some((d) => d.item && d.item.id === a.id)) down.push({ item: a, label: `${round1(h)}h/week →`, structural: true });
    }
  }
  return { up: up.filter((u) => u.item), down: down.filter((d) => d.item) };
}

// ---------- projects & tasks ----------

export function tasksOf(projectId) {
  return store.data.tasks.filter((t) => t.projectId === projectId);
}
export function openTasksOf(projectId) {
  return tasksOf(projectId).filter(isOpen).sort((a, b) => (a.order || 0) - (b.order || 0));
}
export function nextActionOf(projectId) {
  return openTasksOf(projectId).find((t) => t.isNext) || null;
}
export const isActiveProject = (p) => p && (p.status === 'active' || p.status === 'not_started' || p.status === 'blocked' || p.status === 'waiting');

export function projectFlags(p) {
  const t = today();
  const next = nextActionOf(p.id);
  const openWaiting = store.data.waiting.filter((w) => w.projectId === p.id && isOpen(w));
  // A parent project moves through its sub-projects; it needs no action of its own.
  const hasActiveSubs = store.data.projects.some((s) => s.parentId === p.id && isActiveProject(s));
  return {
    noNext: isActiveProject(p) && p.status !== 'waiting' && !next && !openWaiting.length && !hasActiveSubs,
    overdue: isOpen(p) && p.deadline && p.deadline < t,
    blocked: isBlocked(p),
    waiting: p.status === 'waiting' || openWaiting.length > 0,
    next,
  };
}

export function progress(x) {
  if (!x) return 0;
  if (isDone(x)) return 1;
  if (x.type === 'project') {
    const tasks = tasksOf(x.id).filter((t) => t.status !== 'dropped');
    const ms = x.milestones || [];
    const total = tasks.length + ms.length;
    if (!total) return 0;
    return (tasks.filter(isDone).length + ms.filter((m) => m.done).length) / total;
  }
  if (x.type === 'goal' || x.type === 'objective' || x.type === 'area') {
    const kids = childrenOf(x.id).filter((c) => ['objective', 'project', 'goal'].includes(c.type) && c.status !== 'dropped' && c.status !== 'archived');
    if (!kids.length) return 0;
    return kids.reduce((s, k) => s + progress(k), 0) / kids.length;
  }
  return 0;
}

// Score for surfacing next actions: deadlines, priority, focus domain.
function actionScore(t) {
  const now = today();
  const p = get(t.projectId);
  let s = 0;
  const due = t.due || (p && p.deadline);
  if (due) {
    const d = daysBetween(now, due);
    s += d < 0 ? 60 : d <= 2 ? 40 : d <= 7 ? 20 : 5;
  }
  const pr = (p && p.priority) || 'medium';
  s += pr === 'high' ? 25 : pr === 'medium' ? 10 : 0;
  if (areaIdOf(t) && areaIdOf(t) === store.data.mission.focusAreaId) s += 15;
  if (t.plannedFor && t.plannedFor <= now) s += 10;
  return s;
}

export function nextActions({ includeBlocked = false } = {}) {
  return store.data.tasks
    .filter((t) => isOpen(t) && t.isNext)
    .filter((t) => {
      const p = get(t.projectId);
      return !p || isActiveProject(p);
    })
    .filter((t) => includeBlocked || !isBlocked(t))
    .sort((a, b) => actionScore(b) - actionScore(a));
}

// ---------- capacity & resources ----------

export function weeklyHoursOf(r) {
  if (!r || r.status === 'paused') return 0;
  if (Array.isArray(r.days) && r.days.length && Number(r.duration) > 0) return r.days.length * Number(r.duration);
  return Number(r.hoursPerWeek) || 0;
}

export function allocationsFor(resourceId) {
  return store.data.allocations.filter((a) => a.resourceId === resourceId);
}

export function timeSummary() {
  const s = store.data.settings;
  const total = Number(s.weeklyHours) || 0;
  const fixedByArea = new Map();
  let fixed = 0;
  for (const r of store.data.responsibilities) {
    const h = weeklyHoursOf(r);
    if (!h) continue;
    fixed += h;
    const a = areaIdOf(r) || 'none';
    fixedByArea.set(a, (fixedByArea.get(a) || 0) + h);
  }
  const available = Math.max(0, total - fixed);
  const allocs = allocationsFor('rc_time');
  const areaAlloc = new Map();
  const projectAlloc = new Map(); // areaId -> sum of project allocations
  let buffer = 0;
  for (const a of allocs) {
    const t = get(a.targetId);
    const amt = Number(a.amount) || 0;
    if (!t) continue;
    if (t === BUFFER) buffer += amt;
    else if (t.type === 'area') areaAlloc.set(t.id, (areaAlloc.get(t.id) || 0) + amt);
    else {
      const aid = areaIdOf(t) || 'none';
      projectAlloc.set(aid, (projectAlloc.get(aid) || 0) + amt);
    }
  }
  const effectiveByArea = new Map();
  for (const id of new Set([...areaAlloc.keys(), ...projectAlloc.keys()])) {
    effectiveByArea.set(id, Math.max(areaAlloc.get(id) || 0, projectAlloc.get(id) || 0));
  }
  let allocated = buffer;
  for (const v of effectiveByArea.values()) allocated += v;

  // Demand: estimated hours of this week's next actions and planned work.
  const ws = weekStart(), we = weekEnd();
  const demandByArea = new Map();
  for (const t of store.data.tasks) {
    if (!isOpen(t) || !Number(t.estimate)) continue;
    const planned = t.plannedFor && t.plannedFor >= ws && t.plannedFor <= we;
    if (!t.isNext && !planned) continue;
    const a = areaIdOf(t) || 'none';
    demandByArea.set(a, (demandByArea.get(a) || 0) + Number(t.estimate));
  }

  const overAreas = [];
  for (const area of store.data.areas) {
    const alloc = areaAlloc.get(area.id) || 0;
    const proj = projectAlloc.get(area.id) || 0;
    const eff = effectiveByArea.get(area.id) || 0;
    const demand = demandByArea.get(area.id) || 0;
    if (alloc > 0 && proj > alloc) overAreas.push({ areaId: area.id, need: proj, have: alloc, reason: `Projects claim ${round1(proj)}h of a ${round1(alloc)}h budget` });
    else if (demand > eff + 0.01) overAreas.push({ areaId: area.id, need: demand, have: eff, reason: eff ? `Next actions need ${round1(demand)}h, ${round1(eff)}h allocated` : `${round1(demand)}h of next actions, no time allocated` });
  }
  const unallocated = round1(available - allocated);
  return {
    total, fixed: round1(fixed), fixedByArea, available: round1(available), allocated: round1(allocated),
    unallocated, over: unallocated < 0, overBy: round1(-unallocated), buffer, areaAlloc, projectAlloc,
    effectiveByArea, demandByArea, overAreas, fixedOverTotal: fixed > total,
  };
}

export function moneySummary() {
  const allocs = allocationsFor('rc_money');
  let inflow = 0, outflow = 0;
  for (const a of allocs) {
    const v = Number(a.amount) || 0;
    if (a.direction === 'in') inflow += v; else outflow += v;
  }
  return { inflow, outflow, net: inflow - outflow, over: outflow > inflow, allocs };
}

export function shareSummary(resourceId) {
  const res = get(resourceId);
  const cap = Number(res && res.capacity) || 100;
  const allocs = allocationsFor(resourceId);
  const used = allocs.reduce((s, a) => s + (Number(a.amount) || 0), 0);
  return { capacity: cap, used, free: cap - used, over: used > cap, allocs };
}

// Conflicts: explicit "competes" relationships, enriched with hours, plus overload.
export function conflicts() {
  const t = timeSummary();
  const hoursOf = (x) => {
    if (!x) return 0;
    if (x.type === 'area') return (t.fixedByArea.get(x.id) || 0) + (t.effectiveByArea.get(x.id) || 0);
    return store.data.allocations.filter((a) => a.targetId === x.id && a.resourceId === 'rc_time').reduce((s, a) => s + (Number(a.amount) || 0), 0);
  };
  const overSet = new Set(t.overAreas.map((o) => o.areaId));
  const out = store.data.relationships
    .filter((r) => r.kind === 'competes')
    .map((r) => {
      const a = get(r.from), b = get(r.to);
      const hot = t.over || overSet.has(areaIdOf(a)) || overSet.has(areaIdOf(b));
      return { id: r.id, rel: r, a, b, ha: hoursOf(a), hb: hoursOf(b), severity: hot ? 'high' : 'watch', note: r.note };
    });
  if (t.over && !out.length) {
    const ranked = [...t.effectiveByArea.entries()].filter(([id]) => get(id)).sort((x, y) => y[1] - x[1]);
    if (ranked.length >= 2) {
      const a = get(ranked[0][0]), b = get(ranked[1][0]);
      out.push({ id: 'derived', a, b, ha: ranked[0][1], hb: ranked[1][1], severity: 'high', note: 'Largest flexible allocations while overallocated.', derived: true });
    }
  }
  return out;
}

// ---------- execution: today / week ----------

export function occursOn(r, date) {
  return r.status !== 'paused' && Array.isArray(r.days) && r.days.includes(isoDow(date));
}

export function todayPlan(date = today()) {
  const tasks = store.data.tasks.filter(isOpen);
  const planned = tasks.filter((t) => t.plannedFor === date);
  const must = planned.filter((t) => t.plannedPriority === 'must').sort((a, b) => (a.order || 0) - (b.order || 0));
  const optional = planned.filter((t) => t.plannedPriority !== 'must');
  const plannedIds = new Set(planned.map((t) => t.id));
  const dueOrOverdue = tasks.filter((t) => t.due && t.due <= date && !plannedIds.has(t.id));
  const carried = tasks.filter((t) => t.plannedFor && t.plannedFor < date && !plannedIds.has(t.id) && !(t.due && t.due <= date));
  const fixed = store.data.responsibilities.filter((r) => occursOn(r, date)).sort((a, b) => String(a.start || '99').localeCompare(String(b.start || '99')));
  const fixedHours = fixed.reduce((s, r) => s + (Number(r.duration) || 0), 0);
  const plannedHours = planned.reduce((s, t) => s + (Number(t.estimate) || 0), 0);
  const dailyHours = Number(store.data.settings.dailyHours) || 0;
  const followUps = store.data.waiting.filter((w) => isOpen(w) && ((w.followUpAt && w.followUpAt <= date) || (w.expectedAt && w.expectedAt < date)));
  const exclude = new Set([...plannedIds, ...dueOrOverdue.map((t) => t.id)]);
  const next = nextActions().filter((t) => !exclude.has(t.id));
  const habits = store.data.habits.filter((h) => h.status !== 'paused');
  const blocked = store.data.tasks.filter((t) => isOpen(t) && t.isNext && isBlocked(t));
  return {
    date, top3: must.slice(0, 3), must: must.slice(3), optional, dueOrOverdue, carried, fixed, fixedHours,
    plannedHours, dailyHours, free: round1(dailyHours - fixedHours - plannedHours), followUps, next, habits, blocked,
  };
}

export function habitWeek(h, date = today()) {
  const ws = weekStart(date);
  const days = Array.from({ length: 7 }, (_, i) => addDays(ws, i));
  const log = new Set(h.log || []);
  return { days: days.map((d) => ({ date: d, done: log.has(d) })), count: days.filter((d) => log.has(d)).length };
}

export function weekPlan(date = today()) {
  const ws = weekStart(date), we = weekEnd(date);
  const outcomes = store.data.objectives.filter((o) => o.horizon === 'week' && o.weekOf === ws && o.status !== 'dropped');
  const deadlines = [];
  const add = (item, d, what) => deadlines.push({ item, date: d, what });
  for (const t of store.data.tasks) if (isOpen(t) && t.due && t.due <= we) add(t, t.due, 'due');
  for (const p of store.data.projects) if (isOpen(p) && p.deadline && p.deadline <= we) add(p, p.deadline, 'deadline');
  for (const o of [...store.data.objectives, ...store.data.goals]) if (isOpen(o) && o.deadline && o.deadline <= we) add(o, o.deadline, 'deadline');
  for (const w of store.data.waiting) if (isOpen(w) && w.expectedAt && w.expectedAt <= we) add(w, w.expectedAt, 'expected');
  deadlines.sort((a, b) => a.date.localeCompare(b.date));
  const projects = store.data.projects.filter(isActiveProject);
  const unfinished = store.data.tasks.filter((t) => isOpen(t) && t.plannedFor && t.plannedFor < today());
  const blocked = [...store.data.projects, ...store.data.tasks].filter((x) => isBlocked(x));
  const inbox = store.data.tasks.filter((t) => isOpen(t) && !t.projectId && !t.areaId && !t.objectiveId);
  const waiting = store.data.waiting.filter((w) => isOpen(w) && w.followUpAt && w.followUpAt <= we);
  return { ws, we, outcomes, deadlines, projects, unfinished, blocked, inbox, waiting };
}

export function completedSince(date) {
  return store.all().filter((x) => x.completedAt && x.completedAt >= date && isDone(x) && x.type !== 'review');
}

export function reviewStatus() {
  const last = store.data.meta.lastReviewAt;
  const days = last ? daysBetween(last.slice(0, 10), today()) : null;
  return { last, days, due: days === null || days >= 7 };
}

// ---------- search ----------

const SEARCH_FIELDS = ['title', 'notes', 'why', 'desired', 'current', 'description', 'who', 'followUpAction', 'role', 'note', 'statement', 'vision', 'focus'];

export function search(q, { limit = 40, types = null } = {}) {
  q = String(q || '').trim().toLowerCase();
  if (!q) return [];
  const words = q.split(/\s+/);
  const out = [];
  for (const x of [store.data.mission, ...store.all()]) {
    if (x.type === 'allocation' || x.type === 'review') continue;
    if (types && !types.includes(x.type)) continue;
    const title = (x.type === 'relationship' ? `${titleOf(x.from)} ${REL_TYPES[x.kind] ? REL_TYPES[x.kind].verb : ''} ${titleOf(x.to)}` : x.title || '').toLowerCase();
    let score = 0;
    let snippet = '';
    let allMatch = true;
    for (const w of words) {
      let hit = 0;
      if (title.startsWith(w)) hit = 30;
      else if (title.includes(' ' + w)) hit = 22;
      else if (title.includes(w)) hit = 15;
      else {
        for (const f of SEARCH_FIELDS) {
          const v = x[f];
          if (f !== 'title' && typeof v === 'string' && v.toLowerCase().includes(w)) {
            hit = 5;
            if (!snippet) {
              const i = v.toLowerCase().indexOf(w);
              snippet = (i > 30 ? '…' : '') + v.slice(Math.max(0, i - 30), i + 60);
            }
            break;
          }
        }
      }
      if (!hit) { allMatch = false; break; }
      score += hit;
    }
    if (!allMatch) continue;
    if (isOpen(x)) score += 3;
    if (x.type === 'area') score += 4;
    out.push({ item: x, score, snippet });
  }
  return out.sort((a, b) => b.score - a.score).slice(0, limit);
}

export function pulse() {
  const t = timeSummary();
  const plan = todayPlan();
  const next = plan.top3[0] || plan.dueOrOverdue[0] || plan.next[0] || null;
  const followUps = plan.followUps.length;
  const noNext = store.data.projects.filter((p) => isActiveProject(p) && projectFlags(p).noNext).length;
  const blocked = [...store.data.projects, ...store.data.tasks].filter(isBlocked).length;
  return { time: t, next, followUps, noNext, blocked, review: reviewStatus(), waitingOpen: store.data.waiting.filter(isOpen).length };
}

export function areaStats(areaId) {
  const projects = store.data.projects.filter((p) => areaIdOf(p) === areaId);
  const active = projects.filter(isActiveProject);
  const flags = active.map(projectFlags);
  return {
    projects: active.length,
    noNext: flags.filter((f) => f.noNext).length,
    blocked: flags.filter((f) => f.blocked).length,
    next: store.data.tasks.filter((t) => isOpen(t) && t.isNext && areaIdOf(t) === areaId).length,
    waiting: store.data.waiting.filter((w) => isOpen(w) && areaIdOf(w) === areaId).length,
  };
}
