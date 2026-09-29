// Application shell: routing, render loop, central action + binding handlers, keyboard.

import { store } from './store.js';
import { ui, loadUI, setUI, saveUI, bus } from './ui.js';
import * as M from './model.js';
import { TYPES } from './schema.js';
import { esc, uid, today, addDays, weekStart, download, pickFile, isTypingTarget, fmtHours, truncate, plural } from './util.js';
import { exampleData } from './seed.js';
import { computeLayout } from './graph/layout.js';
import { createGraph } from './graph/graph.js';
import { renderInspector, openDetails } from './ui/inspector.js';
import { openCreate, openRelationship, confirmDialog, pickItem, modalOpen, openModal } from './ui/dialogs.js';
import { openPalette } from './ui/palette.js';
import { toast } from './ui/toast.js';
import { renderToday, toggleNextList } from './views/today.js';
import { renderWeek } from './views/week.js';
import { renderGoals } from './views/goals.js';
import { renderProjects } from './views/projects.js';
import { renderWaiting } from './views/waiting.js';
import { renderCapacity } from './views/capacity.js';
import { renderReview, newDraft } from './views/review.js';
import { mountOnboarding } from './views/onboarding.js';

const VIEWS = [
  { id: 'map', label: 'Life Map', glyph: '◎', key: '1' },
  { id: 'today', label: 'Today', glyph: '◐', key: '2' },
  { id: 'week', label: 'This Week', glyph: '▦', key: '3' },
  { id: 'goals', label: 'Goals', glyph: '◉', key: '4' },
  { id: 'projects', label: 'Projects', glyph: '▣', key: '5' },
  { id: 'waiting', label: 'Waiting', glyph: '⧗', key: '6' },
  { id: 'capacity', label: 'Capacity', glyph: '◷', key: '7' },
  { id: 'review', label: 'Weekly Review', glyph: '↻', key: '8' },
];
const RENDER = { today: renderToday, week: renderWeek, goals: renderGoals, projects: renderProjects, waiting: renderWaiting, capacity: renderCapacity, review: renderReview };
const MODES = [
  ['map', 'Structure', 'Domains → goals → projects → actions'],
  ['relationships', 'Relationships', 'How your life systems affect each other'],
  ['resources', 'Resources', 'Where time, money, energy and attention flow'],
  ['execution', 'Execution', 'Active projects and their next actions'],
];

let graph = null;
let lastLayout = null;
let selectedEdge = null;
let onbHost = null;

const $ = (s) => document.querySelector(s);

// ---------------------------------------------------------------- boot

function boot() {
  store.load();
  loadUI();
  document.body.innerHTML = shell();
  graph = createGraph($('#graph'), {
    onSelect: graphSelect,
    onToggle: toggleExpand,
    onSelectEdge: (e) => {
      if (e.kind === 'rel' && e.rel) { selectedEdge = null; select(e.rel.id); }
      else { selectedEdge = e; setUI({ selected: null, inspectorOpen: true }); schedule(); }
    },
    onBackground: () => { if (ui.linkFrom) return cancelLink(); selectedEdge = null; setUI({ selected: null }); schedule(); },
    onDragEnd: (id, pos) => {
      const nd = lastLayout && lastLayout.nodes.find((n) => n.id === id);
      const parent = nd && nd.parent && lastLayout.nodes.find((n) => n.id === nd.parent);
      const off = parent ? { x: pos.x - parent.x, y: pos.y - parent.y } : pos;
      store.setOffset(id, off);
    },
    onCheck: (id) => act.complete({ id }),
  });
  store.subscribe(onChange);
  store.onSave(({ ok }) => {
    document.body.classList.remove('just-saved');
    void document.body.offsetWidth;
    if (ok) document.body.classList.add('just-saved');
    else toast('Could not save — browser storage is full or blocked.', { kind: 'bad' });
  });
  bus.on('ui', () => schedule());
  wireEvents();
  window.addEventListener('resize', () => { applyInsets(); });
  if (!store.data.meta.onboardedAt && !store.data.areas.length) showOnboarding();
  renderAll();
  requestAnimationFrame(() => { applyInsets(); graph.fit({ animate: false }); });
  window.__lifeos = { store, ui, M, graph: () => graph }; // handy for debugging in the console
}

function shell() {
  return `
  <div class="app" id="app">
    <nav class="rail">
      <div class="brand">LIFE <i>OS</i></div>
      <button class="search-btn" data-act="palette"><span>⌕</span>Search<kbd>/</kbd></button>
      <div class="nav" id="nav"></div>
      <div class="rail-foot">
        <button class="btn primary new-btn" data-act="new"><span>＋</span> New<kbd>N</kbd></button>
        <button class="rail-link" data-act="data-menu">⋯ Data & settings</button>
      </div>
    </nav>
    <main class="main">
      <section class="stage" id="stage">
        <svg id="graph" class="graph" aria-label="Life graph"></svg>
        <div class="hud-top">
          <div class="hud-title"><h1>Life Map</h1><p id="mode-desc"></p><div class="res-switch" id="res-switch"></div></div>
          <div class="modes" id="modes">${MODES.map(([k, l]) => `<button data-act="mode" data-mode="${k}">${l}</button>`).join('')}</div>
        </div>
        <div class="hud-link" id="hud-link"></div>
        <div class="hud-empty" id="hud-empty"></div>
        <div class="hud-bl"><button class="hud-btn" data-act="legend">Legend</button><div class="legend" id="legend"></div></div>
        <div class="hud-br">
          <button class="hud-btn" data-act="expand-all" title="Expand everything">Expand all</button>
          <button class="hud-btn" data-act="collapse-all" title="Collapse to domains">Collapse</button>
          <button class="hud-btn" data-act="reset-layout" title="Forget dragged positions">Auto-layout</button>
          <span class="zoom"><button data-act="zoom-out" title="Zoom out (−)">−</button><button data-act="fit" title="Fit (F)">◎</button><button data-act="zoom-in" title="Zoom in (+)">+</button></span>
        </div>
      </section>
      <section class="view" id="view"></section>
      <footer class="pulse" id="pulse"></footer>
    </main>
    <aside class="inspector" id="inspector"></aside>
  </div>`;
}

// ---------------------------------------------------------------- render loop

let pending = null;
let pendingBindOnly = true;
function onChange(change) {
  if (change.kind === 'replace') { lastLayout = null; graph.refit(); }
  schedule({ bindOnly: change.origin === 'bind' });
}

function schedule({ bindOnly = false } = {}) {
  if (!bindOnly) pendingBindOnly = false;
  if (pending) return;
  pending = requestAnimationFrame(() => {
    const onlyBind = pendingBindOnly;
    pending = null;
    pendingBindOnly = true;
    if (onlyBind) { renderPulse(); renderGraph(); renderRail(); } else renderAll();
  });
}

function renderAll() {
  const app = $('#app');
  if (!app) return;
  app.className = `app v-${ui.view} ${ui.inspectorOpen ? 'insp-open' : 'insp-closed'}`;
  renderRail();
  renderPulse();
  renderView();
  renderInsp();
  renderGraph();
}

const KEY_ATTRS = ['data-bind', 'data-quick', 'data-review', 'data-review-out', 'data-alloc-target', 'data-bd', 'data-ms-bind', 'data-ms-date'];
function keyOf(el) {
  if (!el || !el.getAttribute) return null;
  for (const a of KEY_ATTRS) if (el.hasAttribute(a)) return [a, el.getAttribute(a)];
  return null;
}

// Re-render a container but keep focus, caret and scroll where the user left them.
function patch(el, html) {
  const active = document.activeElement;
  const inside = active && el.contains(active);
  const key = inside ? keyOf(active) : null;
  let sel = null;
  try { sel = key && active.selectionStart !== undefined ? [active.selectionStart, active.selectionEnd] : null; } catch { sel = null; }
  // Text the user is mid-way through typing must survive a re-render triggered elsewhere.
  const typed = key && (active.tagName === 'TEXTAREA' || (active.tagName === 'INPUT' && active.type !== 'checkbox')) ? active.value : null;
  const scrollers = [el, ...el.querySelectorAll('[data-scroll]')].map((s) => [s.scrollTop, s.scrollLeft]);
  el.innerHTML = html;
  [el, ...el.querySelectorAll('[data-scroll]')].forEach((s, i) => { if (scrollers[i]) { s.scrollTop = scrollers[i][0]; s.scrollLeft = scrollers[i][1]; } });
  if (key) {
    const next = el.querySelector(`[${key[0]}="${CSS.escape(key[1])}"]`);
    if (next) {
      if (typed !== null && next.value !== typed) next.value = typed;
      next.focus({ preventScroll: true });
      if (sel) try { next.setSelectionRange(sel[0], sel[1]); } catch { /* not a text input */ }
    }
  }
  el.querySelectorAll('[data-autogrow]').forEach(autogrow);
}

function autogrow(t) {
  t.style.height = 'auto';
  t.style.height = t.scrollHeight + 'px';
}

function renderRail() {
  const p = M.pulse();
  const plan = M.todayPlan();
  const badge = {
    today: plan.top3.filter(M.isOpen).length + plan.dueOrOverdue.length || '',
    projects: p.noNext ? `<b class="warn">${p.noNext}</b>` : '',
    waiting: p.followUps ? `<b class="warn">${p.followUps}</b>` : '',
    capacity: p.time.over ? '<b class="bad">!</b>' : '',
    review: p.review.due ? '<b class="dotb"></b>' : '',
  };
  $('#nav').innerHTML = VIEWS.map((v) => `<button class="nav-i ${ui.view === v.id ? 'on' : ''}" data-act="open-view" data-view="${v.id}"><i>${v.glyph}</i><span>${v.label}</span><em>${badge[v.id] || ''}</em></button>`).join('');
}

function renderPulse() {
  const m = store.data.mission;
  const p = M.pulse();
  const t = p.time;
  const focus = store.get(m.focusAreaId);
  const cell = (label, value, act, data = '', cls = '') => `<button class="pc ${cls}" data-act="${act}" ${data}><em>${label}</em><b>${value}</b></button>`;
  $('#pulse').innerHTML = [
    cell('Mission', esc(truncate(m.statement || 'Define your mission', 60)), 'select', 'data-id="mission"', 'wide'),
    cell('Focus', focus ? `<i class="adot" style="--c:${esc(focus.color)}"></i>${esc(truncate(m.focus || focus.title, 34))}` : esc(m.focus || '—'), focus ? 'select' : 'select', `data-id="${focus ? focus.id : 'mission'}"`),
    cell('Capacity', t.over ? `${fmtHours(t.overBy)} over` : `${fmtHours(t.unallocated)} free of ${fmtHours(t.available)}`, 'open-view', 'data-view="capacity"', t.over ? 'bad' : ''),
    cell('Next', p.next ? esc(truncate(p.next.title, 42)) : 'No next action', p.next ? 'select' : 'open-view', p.next ? `data-id="${p.next.id}"` : 'data-view="projects"', p.next ? 'next' : 'warn'),
    cell('Waiting', p.followUps ? `${p.followUps} to chase` : `${p.waitingOpen} open`, 'open-view', 'data-view="waiting"', p.followUps ? 'warn' : ''),
    cell('Blocked', p.blocked ? `${p.blocked}` : 'none', 'open-view', 'data-view="week"', p.blocked ? 'bad' : ''),
    cell('Review', p.review.due ? (p.review.last ? `due · ${p.review.days}d ago` : 'not yet run') : `done · ${p.review.days}d ago`, 'open-view', 'data-view="review"', p.review.due ? 'warn' : ''),
  ].join('') + '<span class="saved-ind" title="Saved to this browser">● saved</span>';
}

function renderView() {
  const v = $('#view');
  if (ui.view === 'map') { v.innerHTML = ''; return; }
  const fn = RENDER[ui.view] || renderToday;
  patch(v, `<div class="view-inner">${fn()}</div>`);
}

function renderInsp() {
  const el = $('#inspector');
  if (!ui.inspectorOpen) { el.innerHTML = ''; return; }
  const id = ui.selected && store.get(ui.selected) ? ui.selected : null;
  if (ui.selected && !id) ui.selected = null;
  patch(el, `<div class="insp-scroll" data-scroll>${renderInspector(id, !id ? selectedEdge : null)}</div>`);
}

function renderGraph() {
  if (ui.view !== 'map') return;
  const layout = computeLayout({ mode: ui.mode, expanded: ui.expanded, execCollapsed: ui.execCollapsed, showCompleted: store.data.settings.showCompleted, flowRes: ui.flowRes });
  lastLayout = layout;
  graph.update(layout, { mode: ui.mode, selected: ui.selected, linking: !!ui.linkFrom, linkFrom: ui.linkFrom, flowRes: ui.flowRes });
  const rs = $('#res-switch');
  rs.classList.toggle('on', ui.mode === 'resources');
  rs.innerHTML = ui.mode === 'resources' ? store.data.resources.map((r) => `<button class="${ui.flowRes === r.id ? 'on' : ''}" data-act="flow-res" data-id="${esc(r.id)}">${esc(r.title)}</button>`).join('') : '';
  document.querySelectorAll('#modes button').forEach((b) => b.classList.toggle('on', b.dataset.mode === ui.mode));
  $('#mode-desc').textContent = (MODES.find((m) => m[0] === ui.mode) || MODES[0])[2];
  $('#hud-link').innerHTML = ui.linkFrom ? `<span>Linking from <b>${esc(M.titleOf(ui.linkFrom))}</b> — click the node it affects</span><button class="btn ghost xs" data-act="link-list">Choose from list</button><button class="btn ghost xs" data-act="link-cancel">Cancel</button>` : '';
  $('#hud-link').classList.toggle('on', !!ui.linkFrom);
  $('#hud-empty').innerHTML = store.data.areas.length ? '' : `<div class="empty-map"><b>Your map is empty</b><p>Start with the domains of your life. Everything else hangs off them.</p><div><button class="btn primary sm" data-act="onboarding">Run setup</button><button class="btn ghost sm" data-act="create" data-type="area">+ Domain</button></div></div>`;
  $('#legend').innerHTML = ui.legend ? legendHtml() : '';
  $('#legend').classList.toggle('on', !!ui.legend);
}

function legendHtml() {
  return `<div class="lg-grid">
    <span><i class="lg lg-area"></i>Domain</span><span><i class="lg lg-goal"></i>Goal</span><span><i class="lg lg-obj"></i>Objective</span>
    <span><i class="lg lg-proj"></i>Project</span><span><i class="lg lg-task"></i>Action</span><span><i class="lg lg-wait"></i>Waiting</span>
    <span><i class="lg lg-res"></i>Resource</span><span><i class="lg lg-habit"></i>Habit</span><span><i class="lg lg-con"></i>Constraint</span>
  </div><div class="lg-lines">
    <span><i class="ln f-enable"></i>enables / supports / builds</span><span><i class="ln f-flow"></i>funds / produces</span>
    <span><i class="ln f-resource"></i>resource dependency</span><span><i class="ln f-dependency"></i>blocks</span>
    <span><i class="ln f-conflict"></i>competes</span><span><i class="ln f-serves"></i>serves (cross-domain)</span>
  </div><p>Double-click to expand. ⚠ = project with no next action.</p>`;
}

function applyInsets() {
  const insp = $('#inspector');
  const w = ui.view === 'map' && ui.inspectorOpen && insp ? insp.getBoundingClientRect().width + 24 : 0;
  graph.setInsets({ right: w, top: 70, bottom: 50, left: 0 });
}

// ---------------------------------------------------------------- navigation & selection

function setView(v) {
  if (!VIEWS.some((x) => x.id === v)) return;
  const was = ui.view;
  setUI({ view: v });
  renderAll();
  if (v === 'map' && was !== 'map') requestAnimationFrame(() => { applyInsets(); if (ui.selected && graph.has(ui.selected)) graph.focus(ui.selected); else graph.fit(); });
  const view = $('#view');
  if (view) view.scrollTop = 0;
}

function select(id, { focus = false } = {}) {
  if (id && !store.get(id)) return;
  selectedEdge = null;
  setUI({ selected: id, inspectorOpen: true });
  if (focus && ui.view === 'map') reveal(id);
  renderAll();
  applyInsets();
  if (focus && ui.view === 'map') requestAnimationFrame(() => focusChain(id));
}

// Frame the path from mission to the item so an action never appears disconnected.
function focusChain(id) {
  if (!lastLayout) return graph.focus(id);
  const ids = [];
  for (let cur = id, i = 0; cur && i < 20; i++) { ids.push(cur); cur = lastLayout.parentOf.get(cur); }
  if (ids.length < 3) return graph.focus(id);
  graph.fit({ ids, maxK: 1.05 });
}

// Make sure an item is visible on the map: expand its ancestors (switch mode if needed).
function reveal(id) {
  const chain = [];
  let cur = store.get(id);
  for (let i = 0; i < 20 && cur; i++) {
    const pid = M.graphParentId(cur);
    if (!pid || pid === 'mission') break;
    chain.push(pid);
    cur = store.get(pid);
  }
  const ex = new Set(ui.expanded);
  chain.forEach((c) => ex.add(c));
  const patchUI = { expanded: [...ex] };
  const x = store.get(id);
  if (x && ui.mode === 'execution' && !['area', 'project', 'task', 'waiting', 'resource'].includes(x.type)) patchUI.mode = 'map';
  if (x && !M.isOpen(x) && !store.data.settings.showCompleted) store.updateSettings({ showCompleted: true });
  setUI(patchUI);
}

function graphSelect(id) {
  if (ui.linkFrom) {
    const from = ui.linkFrom;
    ui.linkFrom = null;
    if (from !== id) openRelationship({ from, to: id }, (r) => { if (r) { toast('Relationship created'); select(r.id); } });
    schedule();
    return;
  }
  const x = store.get(id);
  if (ui.mode === 'resources' && x && x.type === 'resource') ui.flowRes = id;
  select(id);
}

function toggleExpand(id) {
  if (ui.mode === 'execution') {
    const s = new Set(ui.execCollapsed);
    s.has(id) ? s.delete(id) : s.add(id);
    setUI({ execCollapsed: [...s] });
  } else {
    const s = new Set(ui.expanded);
    const opening = !s.has(id);
    opening ? s.add(id) : s.delete(id);
    setUI({ expanded: [...s], selected: id });
    if (opening) {
      renderAll();
      const kids = lastLayout.nodes.filter((n) => n.parent === id).map((n) => n.id);
      if (kids.length) setTimeout(() => graph.fit({ ids: [id, ...kids], maxK: Math.max(0.9, graph.camera.k) }), 60);
      return;
    }
  }
  renderAll();
}

function cancelLink() {
  ui.linkFrom = null;
  schedule();
}

function contextDefaults() {
  const x = store.get(ui.selected);
  if (x) {
    if (x.type === 'area') return ['project', { areaId: x.id }];
    if (x.type === 'project') return ['task', { projectId: x.id }];
    if (x.type === 'goal' || x.type === 'objective') return ['objective', { parentId: x.id }];
    if (x.type === 'task' && x.projectId) return ['task', { projectId: x.projectId }];
  }
  return ({ today: ['task', { plannedFor: today() }], waiting: ['waiting', {}], goals: ['goal', {}], projects: ['project', {}], capacity: ['responsibility', {}] })[ui.view] || ['task', {}];
}

function created(item) {
  if (!item) return;
  toast(`${TYPES[item.type].label} created`);
  if (ui.view === 'map') reveal(item.id);
  select(item.id, { focus: ui.view === 'map' });
}

// ---------------------------------------------------------------- mutations

function withUndo(label, fn) {
  const snap = store.snapshot();
  fn();
  toast(label, { action: { label: 'Undo', fn: () => { store.restore(snap); toast('Undone'); } } });
}

function setAllocation(resourceId, targetId, amount) {
  const existing = store.data.allocations.find((a) => a.resourceId === resourceId && a.targetId === targetId && a.direction !== 'in');
  const v = Math.max(0, Math.round((Number(amount) || 0) * 100) / 100);
  if (!v) { if (existing) store.removeMany([existing.id]); return; }
  if (existing) {
    const patch = { amount: v };
    if (existing.breakdown && existing.breakdown.length === 0) patch.breakdown = [];
    store.update(existing.id, patch);
  } else store.create('allocation', { resourceId, targetId, amount: v });
}

function promoteNext(task) {
  if (!task.projectId) return null;
  const next = M.openTasksOf(task.projectId).find((t) => t.id !== task.id);
  if (next) { store.update(next.id, { isNext: true }); return next; }
  return null;
}

const act = {
  select: ({ id }) => select(id, { focus: ui.view === 'map' }),
  'open-view': ({ view }) => setView(view),
  palette: () => openPalette({
    onPick: (id) => { if (ui.view === 'map') { reveal(id); select(id, { focus: true }); } else select(id); },
    onView: setView,
    onCreate: (type, title) => openCreate(type, { title }, created),
  }),
  new: () => { const [t, d] = contextDefaults(); openCreate(t, d, created); },
  create: ({ type, defaults }) => openCreate(type, defaults ? JSON.parse(defaults) : {}, created),
  complete: ({ id }) => {
    const x = store.get(id);
    if (!x) return;
    const done = M.isDone(x);
    const next = { task: done ? 'open' : 'done', project: done ? 'active' : 'complete', objective: done ? 'active' : 'achieved', goal: done ? 'active' : 'achieved', waiting: done ? 'open' : 'received' }[x.type];
    if (!next) return;
    const snap = store.snapshot();
    let msg = done ? `Reopened: ${truncate(x.title, 40)}` : `Done: ${truncate(x.title, 40)}`;
    if (x.type === 'task' && !done && x.isNext) {
      store.update(id, { status: 'done', isNext: false });
      const p = promoteNext(x);
      const proj = store.get(x.projectId);
      if (p) msg = `Done. Next action → ${truncate(p.title, 40)}`;
      else if (proj && M.isActiveProject(proj)) msg = `Done. ${truncate(proj.title, 30)} has no next action — add one`;
    } else store.update(id, { status: next });
    toast(msg, { action: { label: 'Undo', fn: () => store.restore(snap) } });
  },
  'toggle-next': ({ id }) => {
    const x = store.get(id);
    if (!x) return;
    if (x.isNext) store.update(id, { isNext: false });
    else {
      if (x.projectId) for (const t of M.openTasksOf(x.projectId)) if (t.isNext && t.id !== id) t.isNext = false;
      store.update(id, { isNext: true });
      toast('Marked as next action');
    }
  },
  plan: ({ id, when, prio }) => {
    const x = store.get(id);
    if (!x) return;
    const t = today();
    const date = when === 'today' ? t : when === 'tomorrow' ? addDays(t, 1) : when === 'nextweek' ? addDays(weekStart(), 7) : null;
    store.update(id, { plannedFor: date, plannedPriority: date ? prio || 'must' : null });
    if (when === 'today' && prio === 'must') {
      const n = M.todayPlan().top3.length;
      toast(n > 3 ? 'Added to Must happen (top 3 is full)' : 'Added to today’s top outcomes');
    } else if (date) toast(`Planned for ${when === 'nextweek' ? 'next week' : when}`);
  },
  delete: async ({ id }) => {
    const x = store.get(id);
    if (!x) return;
    const desc = ['relationship', 'allocation'].includes(x.type) ? [] : M.descendants(id);
    const ok = await confirmDialog({
      title: `Delete ${TYPES[x.type].label.toLowerCase()} “${truncate(x.type === 'relationship' ? M.pathLabel(x) : x.title, 50)}”?`,
      body: desc.length ? `This also deletes ${plural(desc.length, 'item')} inside it (${[...new Set(desc.map((d) => TYPES[d.type].label.toLowerCase()))].join(', ')}). You can undo right after.` : 'You can undo right after.',
      confirm: 'Delete', danger: true,
    });
    if (!ok) return;
    const el = document.querySelector(`#graph [data-id="${CSS.escape(id)}"]`);
    if (el) el.classList.add('is-exiting');
    withUndo(`Deleted ${truncate(x.title || 'relationship', 40)}`, () => {
      store.removeMany([id, ...desc.map((d) => d.id)]);
      setUI({ selected: null });
    });
  },
  'delete-quiet': ({ id }) => store.removeMany([id]),
  link: ({ id }) => {
    if (ui.view === 'map' && graph.has(id)) { ui.linkFrom = id; schedule(); toast('Click the node this one affects', { ms: 2000 }); }
    else openRelationship({ from: id }, (r) => { if (r) { toast('Relationship created'); select(r.id); } });
  },
  'link-list': () => { const from = ui.linkFrom; ui.linkFrom = null; openRelationship({ from }, (r) => { if (r) { toast('Relationship created'); select(r.id); } }); schedule(); },
  'link-cancel': cancelLink,
  'focus-graph': ({ id }) => { reveal(id); setView('map'); select(id, { focus: true }); },
  followup: ({ id }) => {
    const x = store.get(id);
    const log = [...(x.log || []), { date: today(), note: x.followUpAction || 'Followed up' }];
    store.update(id, { log, followUpAt: addDays(today(), 3) });
    toast('Logged. Next follow-up in 3 days.');
  },
  received: ({ id }) => {
    const x = store.get(id);
    const snap = store.snapshot();
    store.update(id, { status: 'received' });
    const p = store.get(x.projectId);
    toast(`Received: ${truncate(x.title, 36)}`, p ? { action: { label: 'Next action for project', fn: () => select(p.id) } } : { action: { label: 'Undo', fn: () => store.restore(snap) } });
  },
  'habit-toggle': ({ id, date }) => {
    const x = store.get(id);
    const log = new Set(x.log || []);
    log.has(date) ? log.delete(date) : log.add(date);
    store.update(id, { log: [...log].sort() });
  },
  'ms-toggle': ({ id, ms }) => {
    const p = store.get(id);
    store.update(id, { milestones: p.milestones.map((m) => (m.id === ms ? { ...m, done: !m.done } : m)) });
  },
  'ms-del': ({ id, ms }) => { const p = store.get(id); store.update(id, { milestones: p.milestones.filter((m) => m.id !== ms) }); },
  'alloc-step': ({ res, target, delta }) => {
    const cur = store.data.allocations.find((a) => a.resourceId === res && a.targetId === target && a.direction !== 'in');
    setAllocation(res, target, (cur ? Number(cur.amount) : 0) + Number(delta));
  },
  'bd-add': ({ alloc }) => { const a = store.get(alloc); store.update(alloc, { breakdown: [...(a.breakdown || []), { id: uid('bd'), label: '', amount: 0 }] }); },
  'bd-del': ({ alloc, bdId }) => { const a = store.get(alloc); store.update(alloc, { breakdown: a.breakdown.filter((b) => b.id !== bdId) }); },
  'rel-swap': ({ id }) => { const r = store.get(id); store.update(id, { from: r.to, to: r.from }); },
  'rel-edit': ({ id }) => openRelationship({ rel: store.get(id) }, (r) => { if (!r) setUI({ selected: null }); }),
  'add-blocker': async ({ id }) => {
    const b = await pickItem({ title: 'What blocks this?', types: ['task', 'project', 'waiting', 'objective'], exclude: [id] });
    if (!b) return;
    store.create('relationship', { from: b, to: id, kind: 'blocks', note: `${M.titleOf(id)} cannot move until ${M.titleOf(b)} is done.` });
    toast('Dependency added');
  },
  'edit-parent': async ({ id }) => {
    const x = store.get(id);
    if (!x) return;
    if (x.type !== 'task' && x.type !== 'waiting') return select(id);
    const p = await pickItem({ title: `Where does “${truncate(x.title, 40)}” belong?`, types: ['project', 'area', 'objective'] });
    if (!p) return;
    const t = store.get(p);
    store.update(id, t.type === 'project' ? { projectId: p, areaId: null } : t.type === 'area' ? { areaId: p, projectId: null } : { objectiveId: p });
    toast(`Connected to ${t.title}`);
  },
  'inspector-close': () => { selectedEdge = null; setUI({ inspectorOpen: false, selected: null }); renderAll(); applyInsets(); },
  'toggle-day': ({ id, day }) => {
    const x = store.get(id);
    const s = new Set(x.days || []);
    const d = Number(day);
    s.has(d) ? s.delete(d) : s.add(d);
    store.update(id, { days: [...s].sort() });
  },
  'cap-tab': ({ tab }) => setUI({ capTab: tab }),
  'cap-open': ({ id }) => { const s = new Set(ui.capOpen || []); s.has(id) ? s.delete(id) : s.add(id); setUI({ capOpen: [...s] }); },
  'open-cap': ({ tab }) => { setUI({ capTab: tab }); setView('capacity'); },
  'money-add': ({ dir }) => { const a = store.data.areas[0]; if (!a) return toast('Create a domain first'); store.create('allocation', { resourceId: 'rc_money', targetId: a.id, amount: 0, direction: dir, note: '' }); },
  'proj-area': ({ area }) => setUI({ projectArea: area }),
  'goal-pick': ({ col, id }) => {
    const order = ['direction', 'year', 'quarter', 'month', 'week', 'projects', 'actions'];
    const path = {};
    for (const c of order) { if (c === col) break; if (ui.goalsPath[c]) path[c] = ui.goalsPath[c]; }
    if (ui.goalsPath[col] !== id) path[col] = id;
    setUI({ goalsPath: path, selected: id, inspectorOpen: true });
    renderAll();
    const cols = [...document.querySelectorAll('.gcol')];
    const next = cols[order.indexOf(col) + 1];
    if (next) next.scrollIntoView({ behavior: 'smooth', inline: 'nearest', block: 'nearest' });
  },
  'goal-clear': () => setUI({ goalsPath: {} }),
  'review-start': () => setUI({ review: newDraft() }),
  'review-step': ({ step }) => { setUI({ review: { ...ui.review, step: Number(step) } }); const v = $('#view'); if (v) v.scrollTop = 0; },
  'review-cancel': async () => { if (await confirmDialog({ title: 'Discard this review?', confirm: 'Discard', danger: true })) setUI({ review: null }); },
  'review-view': ({ id }) => setUI({ review: { viewId: id } }),
  'review-close': () => setUI({ review: null }),
  'review-suggest': ({ id }) => {
    const r = { ...ui.review, outcomes: ui.review.outcomes.map((o) => ({ ...o })) };
    const slot = r.outcomes.find((o) => !o.title.trim());
    if (!slot) return toast('All five outcome slots are used');
    const x = store.get(id);
    slot.title = x.type === 'project' ? `${x.title}: ${M.nextActionOf(x.id) ? M.nextActionOf(x.id).title : 'move forward'}` : x.title;
    slot.serves = x.type === 'project' ? x.objectiveId || '' : x.id;
    setUI({ review: r });
  },
  'review-finish': () => {
    const r = ui.review;
    const outs = r.outcomes.filter((o) => o.title.trim());
    if (outs.length < 1) { toast('Add at least one outcome for the week'); return; }
    const t = M.timeSummary();
    const ids = outs.map((o) => {
      const parent = store.get(o.serves);
      return store.create('objective', { title: o.title.trim(), horizon: 'week', weekOf: r.weekOf, parentId: parent && (parent.type === 'goal' || parent.type === 'objective') ? parent.id : null, areaId: parent ? null : null }).id;
    });
    const rv = store.create('review', {
      title: `Week of ${r.weekOf}`, weekOf: r.weekOf, completedAt: new Date().toISOString(), outcomeIds: ids,
      answers: { wins: r.wins, changed: r.changed, irrelevant: r.irrelevant },
      stats: { completed: M.completedSince(addDays(today(), -7)).length, openProjects: store.data.projects.filter(M.isActiveProject).length, waiting: store.data.waiting.filter(M.isOpen).length },
      capacity: { available: t.available, allocated: t.allocated, over: t.over },
    });
    store.updateMeta({ lastReviewAt: new Date().toISOString() });
    setUI({ review: { viewId: rv.id } });
    toast('Weekly plan created');
  },
  drop: ({ id }) => {
    const x = store.get(id);
    const status = x.type === 'project' ? 'archived' : 'dropped';
    withUndo(`Dropped: ${truncate(x.title, 40)}`, () => store.update(id, { status, isNext: false }));
  },
  'set-status': ({ id, status }) => store.update(id, { status }),
  'toggle-next-list': () => { toggleNextList(); renderView(); },
  'close-day': () => { store.setDay(today(), { closedAt: new Date().toISOString() }); toast('Day closed. Good work.'); },
  'reopen-day': () => store.setDay(today(), { closedAt: null }),
  'carry-tomorrow': () => {
    const p = M.todayPlan();
    const open = [...p.top3, ...p.must, ...p.optional].filter(M.isOpen);
    withUndo(`Moved ${plural(open.length, 'item')} to tomorrow`, () => { for (const t of open) store.update(t.id, { plannedFor: addDays(today(), 1) }); });
  },
  mode: ({ mode }) => { setUI({ mode }); renderAll(); if (mode === 'execution' || mode === 'resources') setTimeout(() => graph.fit(), 80); },
  'zoom-in': () => graph.zoomAt(1.25),
  'zoom-out': () => graph.zoomAt(0.8),
  fit: () => graph.fit(),
  'expand-all': () => {
    const ids = [...store.data.areas, ...store.data.goals, ...store.data.objectives, ...store.data.projects, ...store.data.resources].map((x) => x.id);
    setUI({ expanded: ids, execCollapsed: [] });
    renderAll();
    setTimeout(() => graph.fit(), 120);
  },
  'collapse-all': () => { setUI({ expanded: [], execCollapsed: [...store.data.areas.map((a) => a.id)] }); renderAll(); setTimeout(() => graph.fit(), 120); },
  'reset-layout': () => { withUndo('Positions reset to auto-layout', () => store.clearOffsets()); setTimeout(() => graph.fit(), 200); },
  legend: () => setUI({ legend: !ui.legend }),
  'flow-res': ({ id }) => setUI({ flowRes: id }),
  onboarding: () => showOnboarding(),
  'data-menu': () => dataMenu(),
};

// ---------------------------------------------------------------- data menu, import/export, onboarding

function exportData() {
  download(`life-os-${today()}.json`, store.exportJSON());
  toast('Exported full system as JSON');
}

async function importData(text) {
  if (!text) return;
  let raw;
  try { raw = JSON.parse(text); } catch { toast('That file is not valid JSON', { kind: 'bad' }); return; }
  const hasData = store.data.areas.length > 0;
  if (hasData && !(await confirmDialog({ title: 'Replace your current system?', body: 'Importing replaces everything currently stored in this browser. Export first if you want a backup.', confirm: 'Replace', danger: true }))) return;
  try {
    const snap = store.snapshot();
    store.replace(raw);
    if (!store.data.meta.onboardedAt) store.updateMeta({ onboardedAt: new Date().toISOString() });
    hideOnboarding();
    setUI({ selected: null, expanded: [], goalsPath: {}, review: null });
    renderAll();
    requestAnimationFrame(() => graph.fit());
    toast(`Imported ${store.data.areas.length} domains, ${store.data.projects.length} projects`, { action: { label: 'Undo', fn: () => store.restore(snap) } });
  } catch (err) {
    toast('Import failed: ' + err.message, { kind: 'bad', ms: 5000 });
  }
}

function loadExample() {
  store.replace(exampleData());
  hideOnboarding();
  setUI({ selected: null, expanded: ['ar_career'], goalsPath: {}, review: null, view: 'map', mode: 'map' });
  renderAll();
  requestAnimationFrame(() => { applyInsets(); graph.fit(); });
  toast('Example system loaded');
}

function dataMenu() {
  openModal(`
    <header class="dlg-head"><div><div class="eyebrow">Data & settings</div><h2>Your system lives in this browser</h2></div><button class="x" data-close>×</button></header>
    <p class="dlg-body">Local-first: nothing leaves your device. Export regularly as a backup — the file includes a schema version so future versions can migrate it.</p>
    <div class="menu">
      <button data-m="export"><b>Export JSON</b><em>Full system, schema v${store.data.schemaVersion}</em></button>
      <button data-m="import"><b>Import JSON</b><em>Replaces the current system (V3 prototype exports work too)</em></button>
      <label class="menu-row"><input type="checkbox" data-m="completed" ${store.data.settings.showCompleted ? 'checked' : ''}><b>Show completed items on the map</b></label>
      <button data-m="onboarding"><b>Run setup again</b><em>Starts a fresh system</em></button>
      <button data-m="example"><b>Load example system</b><em>Replaces the current system</em></button>
      <button data-m="reset" class="danger"><b>Erase everything</b><em>Cannot be undone after reload</em></button>
    </div>
    <p class="muted sm">Shortcuts: <kbd>/</kbd> or <kbd>⌘K</kbd> search · <kbd>N</kbd> new · <kbd>1</kbd>–<kbd>8</kbd> views · <kbd>F</kbd> fit map · <kbd>Esc</kbd> close</p>`, {
    onMount(dlg, close) {
      dlg.querySelector('[data-close]').onclick = close;
      dlg.querySelectorAll('[data-m]').forEach((b) => {
        const m = b.dataset.m;
        if (m === 'completed') { b.onchange = () => store.updateSettings({ showCompleted: b.checked }); return; }
        b.onclick = async () => {
          close();
          if (m === 'export') exportData();
          if (m === 'import') importData(await pickFile());
          if (m === 'onboarding') showOnboarding();
          if (m === 'example') { if (!store.data.areas.length || (await confirmDialog({ title: 'Replace your system with the example?', confirm: 'Load example', danger: true }))) loadExample(); }
          if (m === 'reset' && (await confirmDialog({ title: 'Erase everything?', body: 'All domains, goals, projects and history in this browser will be deleted.', confirm: 'Erase', danger: true }))) {
            store.reset();
            setUI({ selected: null, expanded: [], review: null });
            showOnboarding();
          }
        };
      });
    },
  });
}

function showOnboarding() {
  hideOnboarding();
  onbHost = document.createElement('div');
  document.body.appendChild(onbHost);
  mountOnboarding(onbHost, {
    hasLegacy: store.hasLegacy(),
    onFinish: () => {
      hideOnboarding();
      setUI({ view: 'map', mode: 'map', selected: null, expanded: [] });
      renderAll();
      requestAnimationFrame(() => { applyInsets(); graph.fit(); });
      toast('Your system is live. ⚠ marks projects that still need a next action.', { ms: 4500 });
    },
    onExample: loadExample,
    onImport: async () => importData(await pickFile()),
    onLegacy: () => importData(JSON.stringify(store.legacyPayload())),
  });
}
function hideOnboarding() {
  if (onbHost) { onbHost.remove(); onbHost = null; }
}

// ---------------------------------------------------------------- events

function parseValue(el, key) {
  const kind = el.dataset.kind;
  let v = el.type === 'checkbox' ? el.checked : el.value;
  if (kind === 'number') v = v === '' ? null : Number(v);
  if (typeof v === 'string' && /Id$/.test(key) && v === '') v = null;
  return v;
}

function applyBind(el, origin) {
  const [id, key] = el.dataset.bind.split('|');
  const v = parseValue(el, key);
  if (id === 'settings') { store.updateSettings({ [key]: v }); return; }
  const x = store.get(id);
  if (!x) return;
  const patchObj = { [key]: v };
  if (key === 'horizon' && v === 'week' && !x.weekOf) patchObj.weekOf = weekStart();
  if (key === 'projectId' && x.type === 'task' && v && x.isNext && M.nextActionOf(v)) patchObj.isNext = false;
  store.update(id, patchObj, { origin });
}

function wireEvents() {
  document.addEventListener('click', (e) => {
    const t = e.target.closest('[data-act]');
    if (!t || t.tagName === 'INPUT') return;
    const name = t.dataset.act;
    const fn = act[name];
    if (!fn) return;
    e.preventDefault();
    fn({ ...t.dataset });
  });

  document.addEventListener('input', (e) => {
    const el = e.target;
    if (el.dataset.bind && (el.tagName === 'TEXTAREA' || (el.tagName === 'INPUT' && (el.type === 'text' || el.type === 'search')))) {
      applyBind(el, 'bind');
      if (el.hasAttribute('data-autogrow')) autogrow(el);
    } else if (el.dataset.review) {
      ui.review = { ...ui.review, [el.dataset.review]: el.value };
      saveUI();
    } else if (el.dataset.reviewOut && el.tagName === 'INPUT') {
      const [i, k] = el.dataset.reviewOut.split('|');
      const outs = ui.review.outcomes.map((o) => ({ ...o }));
      outs[Number(i)][k] = el.value;
      ui.review = { ...ui.review, outcomes: outs };
      saveUI();
    }
  });

  document.addEventListener('change', (e) => {
    const el = e.target;
    if (el.dataset.bind) applyBind(el, 'change');
    else if (el.dataset.allocTarget) setAllocation(el.dataset.res, el.dataset.allocTarget, el.value);
    else if (el.dataset.bd) {
      const [aid, bid, field] = el.dataset.bd.split('|');
      const a = store.get(aid);
      store.update(aid, { breakdown: a.breakdown.map((b) => (b.id === bid ? { ...b, [field]: field === 'amount' ? Number(el.value) || 0 : el.value } : b)) });
    } else if (el.dataset.msBind || el.dataset.msDate) {
      const [pid, mid] = (el.dataset.msBind || el.dataset.msDate).split('|');
      const p = store.get(pid);
      const field = el.dataset.msBind ? 'title' : 'date';
      store.update(pid, { milestones: p.milestones.map((m) => (m.id === mid ? { ...m, [field]: el.value } : m)) });
    } else if (el.dataset.reviewOut && el.tagName === 'SELECT') {
      const [i, k] = el.dataset.reviewOut.split('|');
      const outs = ui.review.outcomes.map((o) => ({ ...o }));
      outs[Number(i)][k] = el.value;
      setUI({ review: { ...ui.review, outcomes: outs } });
    } else if (el.dataset.act === 'proj-closed') setUI({ projectShowClosed: el.checked });
  });

  document.addEventListener('toggle', (e) => {
    const d = e.target;
    if (d.tagName === 'DETAILS' && d.dataset.key) d.open ? openDetails.add(d.dataset.key) : openDetails.delete(d.dataset.key);
  }, true);

  document.addEventListener('keydown', (e) => {
    const el = e.target;
    if (el.dataset && el.dataset.quick && e.key === 'Enter') {
      e.preventDefault();
      quickCreate(el);
      return;
    }
    if (el.classList && el.classList.contains('insp-title') && e.key === 'Enter') { e.preventDefault(); el.blur(); return; }
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); act.palette(); return; }
    if (modalOpen() || onbHost) return;
    if (e.key === 'Escape') {
      if (isTypingTarget(el)) { el.blur(); return; }
      if (ui.linkFrom) return cancelLink();
      if (ui.selected || selectedEdge) { selectedEdge = null; setUI({ selected: null }); return; }
      if (ui.inspectorOpen) act['inspector-close']();
      return;
    }
    if (isTypingTarget(el) || e.metaKey || e.ctrlKey || e.altKey) return;
    const v = VIEWS.find((x) => x.key === e.key);
    if (v) { setView(v.id); return; }
    if (e.key === '/') { e.preventDefault(); act.palette(); }
    else if (e.key === 'n' || e.key === 'N') { e.preventDefault(); act.new(); }
    else if (ui.view === 'map') {
      if (e.key === 'f' || e.key === '0') graph.fit();
      else if (e.key === '+' || e.key === '=') graph.zoomAt(1.25);
      else if (e.key === '-') graph.zoomAt(0.8);
      else if ((e.key === 'e' || e.key === 'Enter') && ui.selected) toggleExpand(ui.selected);
    }
  });
}

function quickCreate(el) {
  const title = el.value.trim();
  if (!title) return;
  const type = el.dataset.quick;
  const d = el.dataset.defaults ? JSON.parse(el.dataset.defaults) : {};
  if (type === 'milestone') {
    const p = store.get(d.projectId);
    store.update(p.id, { milestones: [...(p.milestones || []), { id: uid('ms'), title, done: false, date: '' }] });
  } else if (type === 'task') {
    if (d.isNext && d.projectId) for (const t of M.openTasksOf(d.projectId)) if (t.isNext) t.isNext = false;
    const isNext = d.isNext || (d.projectId && !M.nextActionOf(d.projectId));
    const item = store.create('task', { ...d, title, isNext: !!isNext });
    toast(item.projectId ? (isNext ? 'Next action set' : 'Action added') : item.plannedFor ? 'Captured for today' : 'Captured to inbox');
  }
  el.value = '';
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();

