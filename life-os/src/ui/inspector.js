// Inspector: the object detail panel. Most important information first,
// secondary fields behind disclosure. Every input persists through data-bind.

import { store } from '../store.js';
import * as M from '../model.js';
import { HORIZONS, HORIZON, REL_TYPES, PRIORITIES, ENERGY, RESOURCE_KINDS } from '../schema.js';
import { esc, fmtDate, relDay, today, DOW_SHORT, fmtHours } from '../util.js';
import { textField, selectField, dateField, numberField, statusOptions, typeChip, dot, row, whyTrail, empty, btn, createBtn, quickAdd, bar, dueChip } from './fields.js';

export const openDetails = new Set();

function section(title, body, { key = null, extra = '' } = {}) {
  return `<section class="is-sec" ${key ? `data-sec="${key}"` : ''}><h4>${title}${extra ? `<span class="sec-x">${extra}</span>` : ''}</h4>${body}</section>`;
}
function more(key, title, body) {
  return `<details class="more" data-key="${key}" ${openDetails.has(key) ? 'open' : ''}><summary>${title}</summary><div class="more-body">${body}</div></details>`;
}
function list(items, fn, { max = 8, emptyText = '' } = {}) {
  if (!items.length) return emptyText ? `<p class="muted sm">${emptyText}</p>` : '';
  const shown = items.slice(0, max).map(fn).join('');
  return `<div class="rows">${shown}</div>${items.length > max ? `<p class="muted sm">+ ${items.length - max} more</p>` : ''}`;
}
const opts = (arr) => arr.map((x) => [x.id, x.title]);

export function renderInspector(id, edge = null) {
  if (edge && edge.kind !== 'rel') return edgeInfo(edge);
  const x = store.get(id);
  if (!x) return home();
  const head = header(x);
  let body = '';
  switch (x.type) {
    case 'mission': body = mission(x); break;
    case 'area': body = area(x); break;
    case 'goal': case 'objective': body = direction(x); break;
    case 'project': body = project(x); break;
    case 'task': body = task(x); break;
    case 'waiting': body = waiting(x); break;
    case 'responsibility': body = responsibility(x); break;
    case 'habit': body = habit(x); break;
    case 'resource': body = resource(x); break;
    case 'constraint': body = constraint(x); break;
    case 'person': body = person(x); break;
    case 'relationship': body = relationship(x); break;
    default: body = '';
  }
  const imp = ['mission', 'relationship', 'person'].includes(x.type) ? '' : impactBlock(x);
  return `<div class="insp" data-insp="${esc(x.id)}">${head}<div class="insp-body">${body}${imp}${footer(x)}</div></div>`;
}

function header(x) {
  const statusSel = x.type !== 'mission' && x.type !== 'relationship' && statusOptions(x.type).length > 1
    ? `<span class="st-sel st-${esc(x.status)}">${selectField(x.id, 'status', x.status, statusOptions(x.type))}</span>` : '';
  const title = x.type === 'relationship'
    ? `<h2 class="insp-rel">${esc(M.titleOf(x.from))} <em class="verb f-${REL_TYPES[x.kind].family}">${esc(REL_TYPES[x.kind].verb)}</em> ${esc(M.titleOf(x.to))}</h2>`
    : x.type === 'mission' ? '<h2 class="insp-mission">Mission</h2>'
      : `<textarea class="insp-title" rows="1" data-bind="${esc(x.id)}|title" data-autogrow>${esc(x.title)}</textarea>`;
  const trail = ['mission', 'relationship', 'person', 'resource'].includes(x.type) ? '' : whyTrail(x);
  return `<header class="insp-head">
    <div class="insp-top">${x.type === 'mission' ? '<span class="tchip fam-direction"><i>✦</i>Mission</span>' : typeChip(x)}${statusSel}<span class="saved-dot" title="Saved locally"></span><button class="x" data-act="inspector-close" title="Close (Esc)">×</button></div>
    ${title}
    ${trail ? `<div class="trail-wrap"><em class="trail-label">Why this exists</em>${trail}</div>` : ''}
  </header>`;
}

function footer(x) {
  if (x.type === 'mission') return '';
  const b = [];
  if (['area', 'goal', 'objective', 'project', 'task', 'resource', 'waiting', 'habit', 'responsibility', 'constraint'].includes(x.type)) b.push(btn('◎ Show on map', 'focus-graph', { id: x.id }, 'ghost sm'));
  if (x.type !== 'relationship') b.push(btn('⟶ Link…', 'link', { id: x.id }, 'ghost sm'));
  if (x.type !== 'resource') b.push(btn('Delete', 'delete', { id: x.id }, 'ghost sm danger'));
  return `<footer class="insp-foot">${b.join('')}</footer>`;
}

function stateBlock(x, { current = 'Current state', desired = 'Desired state' } = {}) {
  return `<div class="states">
    <label class="fld state"><span>${current}</span><textarea rows="2" data-bind="${esc(x.id)}|current" placeholder="Where it is now">${esc(x.current || '')}</textarea></label>
    <i class="state-arr">→</i>
    <label class="fld state"><span>${desired}</span><textarea rows="2" data-bind="${esc(x.id)}|desired" placeholder="What good looks like">${esc(x.desired || '')}</textarea></label>
  </div>`;
}

// ---------- impact: upstream / downstream ----------

function impactBlock(x) {
  const { up, down } = M.impact(x.id);
  const li = (e) => `<button class="imp" data-act="select" data-id="${esc(e.rel ? e.rel.id : e.item.id)}" style="--c:${esc(M.colorOf(e.item))}"><em>${esc(e.label)}</em><span>${esc(e.item.id === 'mission' ? 'Mission' : e.item.title)}</span>${e.rel ? '<i class="rel-mark">⟶</i>' : ''}</button>`;
  const col = (title, sub, arr, none) => `<div class="imp-col"><h5>${title}<small>${sub}</small></h5>${arr.length ? arr.slice(0, 9).map(li).join('') + (arr.length > 9 ? `<p class="muted sm">+${arr.length - 9} more</p>` : '') : `<p class="muted sm">${none}</p>`}</div>`;
  return section('Impact', `<div class="impact">${col('Upstream', 'what affects this', up, 'Nothing feeds this yet.')}${col('Downstream', 'what this affects', down, 'Nothing depends on this yet.')}</div>`, { extra: btn('+ Relationship', 'link', { id: x.id }, 'ghost xs') });
}

// ---------- per type ----------

function mission(x) {
  const areas = store.data.areas;
  return `
    ${textField('mission', 'statement', x.statement, { label: 'Mission · why your life system exists', multiline: true, rows: 3, placeholder: 'One or two sentences.' })}
    ${textField('mission', 'vision', x.vision, { label: 'Long-term direction', multiline: true, rows: 3, placeholder: 'Where you are heading over years.' })}
    <div class="grid2">
      ${textField('mission', 'focus', x.focus, { label: 'Current focus' })}
      ${selectField('mission', 'focusAreaId', x.focusAreaId, opts(areas), { label: 'Focus domain', empty: 'None' })}
    </div>
    ${section('Domains', list(areas, (a) => {
      const s = M.areaStats(a.id);
      return row(a, { path: false, meta: `${s.projects ? `<span class="chip">${s.projects} proj</span>` : ''}${s.noNext ? `<span class="chip warn">${s.noNext} ⚠</span>` : ''}` });
    }, { max: 20, emptyText: 'No domains yet.' }), { extra: createBtn('+ Domain', 'area') })}
    ${section('Goals', list(store.data.goals.filter((g) => M.isOpen(g)), (g) => row(g, { meta: bar(M.progress(g)) }), { emptyText: 'No goals yet. Goals describe where you are going.' }), { extra: createBtn('+ Goal', 'goal') })}`;
}

function area(x) {
  const goals = store.data.goals.filter((g) => g.areaId === x.id && M.isOpen(g));
  const projects = store.data.projects.filter((p) => M.areaIdOf(p) === x.id && M.isOpen(p));
  const next = M.nextActions({ includeBlocked: true }).filter((t) => M.areaIdOf(t) === x.id);
  const resp = store.data.responsibilities.filter((r) => r.areaId === x.id);
  const habits = store.data.habits.filter((h) => h.areaId === x.id);
  const wait = store.data.waiting.filter((w) => M.isOpen(w) && M.areaIdOf(w) === x.id);
  const loose = store.data.tasks.filter((t) => M.isOpen(t) && t.areaId === x.id && !t.projectId);
  const t = M.timeSummary();
  const fixed = t.fixedByArea.get(x.id) || 0, alloc = t.effectiveByArea.get(x.id) || 0;
  const over = t.overAreas.find((o) => o.areaId === x.id);
  let guide = '';
  if (!x.desired) guide = `<div class="guide"><b>Define your desired state first.</b><span>What does this domain look like when it is working?</span></div>`;
  else if (!goals.length && !projects.length) guide = `<div class="guide"><b>No goals or projects yet.</b><span>Turn the desired state into a goal, then a project with a next action.</span><div>${createBtn('+ Goal', 'goal', { areaId: x.id }, 'sm')}${createBtn('+ Project', 'project', { areaId: x.id }, 'sm')}</div></div>`;
  return `
    ${textField(x.id, 'why', x.why, { label: 'Why this matters', placeholder: 'The purpose of this domain' })}
    ${stateBlock(x)}
    ${guide}
    <div class="kpis">
      <button class="kpi" data-act="open-view" data-view="capacity"><em>Fixed</em><b>${fmtHours(fixed)}</b></button>
      <button class="kpi" data-act="open-view" data-view="capacity"><em>Allocated</em><b>${fmtHours(alloc)}</b></button>
      <div class="kpi ${over ? 'bad' : ''}"><em>Status</em><b>${over ? 'Over' : 'OK'}</b></div>
    </div>
    ${over ? `<p class="alert bad">${esc(over.reason)}</p>` : ''}
    ${section('Next actions', list(next, (tk) => row(tk, { sub: esc(M.titleOf(tk.projectId)), meta: tk.estimate ? `<span class="chip">${fmtHours(tk.estimate)}</span>` : '' }), { emptyText: 'No next actions in this domain.' }))}
    ${section('Goals', list(goals, (g) => row(g, { path: false, meta: bar(M.progress(g)) }), { emptyText: 'No goals yet.' }), { extra: createBtn('+ Goal', 'goal', { areaId: x.id }) })}
    ${section('Projects', list(projects, projectRow, { max: 10, emptyText: 'No active projects yet.' }), { extra: createBtn('+ Project', 'project', { areaId: x.id }) })}
    ${loose.length ? section('Loose actions', list(loose, (tk) => row(tk, { path: false }))) : ''}
    ${section('Recurring', list([...resp, ...habits], (r) => row(r, { path: false, meta: r.type === 'responsibility' ? `<span class="chip">${fmtHours(M.weeklyHoursOf(r))}/wk</span>` : `<span class="chip">${M.habitWeek(r).count}/${r.targetPerWeek}</span>` }), { emptyText: 'No responsibilities or habits.' }), { extra: createBtn('+ Responsibility', 'responsibility', { areaId: x.id }) + createBtn('+ Habit', 'habit', { areaId: x.id }) })}
    ${wait.length ? section('Waiting', list(wait, (w) => row(w, { path: false, meta: dueChip(w.followUpAt, { label: 'follow up' }) }))) : ''}
    ${more('area-more-' + x.id, 'Notes & appearance', `${textField(x.id, 'notes', x.notes, { label: 'Notes', multiline: true, rows: 4 })}${numberField(x.id, 'order', x.order, { label: 'Order on map', step: 1 })}`)}`;
}

export function projectRow(p) {
  const f = M.projectFlags(p);
  const meta = [
    f.blocked ? '<span class="chip bad">blocked</span>' : '',
    f.noNext ? '<span class="chip warn">no next action</span>' : '',
    p.deadline ? dueChip(p.deadline) : '',
    bar(M.progress(p)),
  ].join('');
  return row(p, { path: false, sub: f.next ? `→ ${esc(f.next.title)}` : '', meta });
}

function direction(x) {
  const isGoal = x.type === 'goal';
  const horizons = HORIZONS.filter((h) => h.kind === x.type).map((h) => [h.id, h.label]);
  const kids = M.childrenOf(x.id).filter((c) => M.isOpen(c) || c.status === 'achieved');
  const objectives = kids.filter((c) => c.type === 'objective' || c.type === 'goal');
  const projects = [...kids.filter((c) => c.type === 'project'), ...store.data.projects.filter((p) => p.objectiveId === x.id && p.parentId && M.isOpen(p))];
  const uniqProjects = [...new Map(projects.map((p) => [p.id, p])).values()];
  const parentOpts = [...store.data.goals, ...store.data.objectives]
    .filter((g) => g.id !== x.id && M.isOpen(g) && (HORIZON[g.horizon]?.rank ?? 0) <= (HORIZON[x.horizon]?.rank ?? 9))
    .map((g) => [g.id, `${HORIZON[g.horizon] ? HORIZON[g.horizon].short : ''} · ${g.title}`]);
  const childHorizon = HORIZONS.slice((HORIZON[x.horizon]?.rank ?? 0) + 1).find((h) => h.kind === 'objective');
  return `
    <div class="grid2">
      ${selectField(x.id, 'horizon', x.horizon, horizons, { label: 'Horizon' })}
      ${dateField(x.id, 'deadline', x.deadline, { label: 'Deadline' })}
    </div>
    ${textField(x.id, 'desired', x.desired, { label: 'Desired state · success looks like', multiline: true })}
    ${textField(x.id, 'why', x.why, { label: 'Why this matters', multiline: true, placeholder: 'What changes in your life when this is achieved?' })}
    <div class="prog-line"><em>Progress</em>${bar(M.progress(x))}<b>${Math.round(M.progress(x) * 100)}%</b></div>
    ${section(isGoal ? 'Objectives' : 'Supporting objectives', list(objectives, (o) => row(o, { path: false, meta: `<span class="chip">${esc(HORIZON[o.horizon]?.short || '')}</span>${bar(M.progress(o))}` }), { emptyText: childHorizon ? `No ${childHorizon.label.toLowerCase()} objectives yet.` : 'Nothing below this yet.' }), { extra: childHorizon ? createBtn('+ Objective', 'objective', { parentId: x.id, horizon: childHorizon.id }) : '' })}
    ${section('Projects driving this', list(uniqProjects, projectRow, { emptyText: 'No projects serve this yet. Projects make objectives real.' }), { extra: createBtn('+ Project', 'project', { objectiveId: x.id, areaId: M.areaIdOf(x) }) })}
    ${more('dir-more-' + x.id, 'Placement & notes', `
      <div class="grid2">
        ${selectField(x.id, 'parentId', x.parentId, parentOpts, { label: 'Supports', empty: 'Nothing (top level)' })}
        ${selectField(x.id, 'areaId', x.areaId, opts(store.data.areas), { label: 'Domain', empty: M.areaOf(x) ? `Inherited: ${M.areaOf(x).title}` : 'None' })}
      </div>
      ${stateBlock(x)}
      ${x.horizon === 'week' ? dateField(x.id, 'weekOf', x.weekOf, { label: 'Week of (Monday)' }) : ''}
      ${textField(x.id, 'notes', x.notes, { label: 'Notes', multiline: true, rows: 3 })}`)}`;
}

function project(x) {
  const f = M.projectFlags(x);
  const open = M.openTasksOf(x.id);
  const done = M.tasksOf(x.id).filter((t) => t.status === 'done');
  const waits = store.data.waiting.filter((w) => w.projectId === x.id && M.isOpen(w));
  const subs = store.data.projects.filter((p) => p.parentId === x.id && M.isOpen(p));
  const blockers = M.blockersOf(x.id);
  const blocks = M.blocksOf(x.id).filter(M.isOpen);
  const alloc = store.data.allocations.find((a) => a.resourceId === 'rc_time' && a.targetId === x.id);
  const nextBlock = f.next
    ? `<div class="next-card">${row(f.next, { path: false, meta: f.next.estimate ? `<span class="chip">${fmtHours(f.next.estimate)}</span>` : '', actions: btn('Today', 'plan', { id: f.next.id, when: 'today', prio: 'must' }, 'ghost xs') })}</div>`
    : `<div class="next-card missing"><b>⚠ No next action</b><span>A project without a next action does not move.</span>${quickAdd('task', { projectId: x.id, isNext: true }, 'Type the very next physical step, press Enter')}</div>`;
  const ms = x.milestones || [];
  return `
    ${textField(x.id, 'desired', x.desired, { label: 'Outcome · done looks like', multiline: true, placeholder: 'Describe the finished result' })}
    <h4 class="lbl">Next action</h4>
    ${nextBlock}
    <div class="grid3">
      ${dateField(x.id, 'deadline', x.deadline, { label: 'Deadline' })}
      ${selectField(x.id, 'priority', x.priority, PRIORITIES, { label: 'Priority' })}
      <label class="fld"><span>Time · h/week</span><input type="number" min="0" step="0.5" data-alloc-target="${esc(x.id)}" data-res="rc_time" value="${alloc ? esc(alloc.amount) : ''}" placeholder="0"></label>
    </div>
    <div class="prog-line"><em>Progress</em>${bar(M.progress(x))}<b>${Math.round(M.progress(x) * 100)}%</b></div>
    ${blockers.length ? `<p class="alert bad">Blocked by ${blockers.map((b) => `<button class="linklike" data-act="select" data-id="${esc(b.id)}">${esc(b.title)}</button>`).join(', ')}</p>` : ''}
    ${section(`Actions <small>${open.length} open · ${done.length} done</small>`, `${list(open, (t) => row(t, { path: false, meta: `${t.due ? dueChip(t.due) : ''}${t.estimate ? `<span class="chip">${fmtHours(t.estimate)}</span>` : ''}`, actions: t.isNext ? '' : btn('Make next', 'toggle-next', { id: t.id }, 'ghost xs') }), { max: 12 })}${quickAdd('task', { projectId: x.id }, 'Add an action…')}`)}
    ${section('Milestones', `<div class="ms-list">${ms.map((m) => `<div class="ms ${m.done ? 'on' : ''}"><button class="cbox ${m.done ? 'on' : ''}" data-act="ms-toggle" data-id="${esc(x.id)}" data-ms="${esc(m.id)}">${m.done ? '✓' : ''}</button><input data-ms-bind="${esc(x.id)}|${esc(m.id)}" value="${esc(m.title)}"><input type="date" data-ms-date="${esc(x.id)}|${esc(m.id)}" value="${esc(m.date || '')}"><button class="x sm" data-act="ms-del" data-id="${esc(x.id)}" data-ms="${esc(m.id)}">×</button></div>`).join('')}</div>${quickAdd('milestone', { projectId: x.id }, 'Add a milestone…')}`)}
    ${subs.length ? section('Sub-projects', list(subs, projectRow)) : ''}
    ${section('Dependencies', `
      <div class="deps"><div><em>Blocked by</em>${blockers.length ? blockers.map((b) => row(b, { path: false })).join('') : '<p class="muted sm">Nothing.</p>'}</div>
      <div><em>Blocks</em>${blocks.length ? blocks.map((b) => row(b, { path: false })).join('') : '<p class="muted sm">Nothing.</p>'}</div></div>`, { extra: btn('+ Blocker', 'add-blocker', { id: x.id }, 'ghost xs') })}
    ${section('Waiting on', list(waits, (w) => row(w, { path: false, meta: dueChip(w.followUpAt, { label: 'follow up' }) }), { emptyText: 'No open loops.' }), { extra: createBtn('+ Waiting', 'waiting', { projectId: x.id }) })}
    ${more('proj-more-' + x.id, 'Context, placement & notes', `
      ${stateBlock(x, { desired: 'Desired state' })}
      ${textField(x.id, 'why', x.why, { label: 'Why this matters', multiline: true })}
      <div class="grid2">
        ${selectField(x.id, 'areaId', x.areaId, opts(store.data.areas), { label: 'Domain', empty: 'None' })}
        ${selectField(x.id, 'objectiveId', x.objectiveId, [...store.data.goals, ...store.data.objectives].filter(M.isOpen).map((o) => [o.id, `${HORIZON[o.horizon]?.short || ''} · ${o.title}`]), { label: 'Serves objective', empty: 'None' })}
        ${selectField(x.id, 'parentId', x.parentId, store.data.projects.filter((p) => p.id !== x.id && M.isOpen(p)).map((p) => [p.id, p.title]), { label: 'Sub-project of', empty: 'None' })}
        ${textField(x.id, 'owner', x.owner, { label: 'Owner', placeholder: 'Me' })}
      </div>
      ${alloc && alloc.breakdown && alloc.breakdown.length ? `<p class="muted sm">Time split: ${alloc.breakdown.map((b) => `${esc(b.label)} ${fmtHours(b.amount)}`).join(' · ')}</p>` : ''}
      ${textField(x.id, 'notes', x.notes, { label: 'Notes', multiline: true, rows: 4 })}`)}`;
}

function task(x) {
  const p = store.get(x.projectId);
  const blockers = M.blockersOf(x.id);
  const t = today();
  const planned = x.plannedFor === t ? (x.plannedPriority === 'must' ? 'must' : 'optional') : x.plannedFor ? 'later' : '';
  const planBtn = (label, when, prio, on) => `<button class="seg ${on ? 'on' : ''}" data-act="plan" data-id="${esc(x.id)}" data-when="${when}" data-prio="${prio}">${label}</button>`;
  return `
    <div class="task-actions">
      <button class="btn ${M.isDone(x) ? '' : 'primary'}" data-act="complete" data-id="${esc(x.id)}">${M.isDone(x) ? '↺ Reopen' : '✓ Complete'}</button>
      ${p ? `<button class="btn ghost ${x.isNext ? 'on-next' : ''}" data-act="toggle-next" data-id="${esc(x.id)}">${x.isNext ? '→ Next action' : 'Make next action'}</button>` : ''}
    </div>
    <h4 class="lbl">Plan</h4>
    <div class="segs">${planBtn('Must today', 'today', 'must', planned === 'must')}${planBtn('Optional today', 'today', 'optional', planned === 'optional')}${planBtn('Tomorrow', 'tomorrow', 'must', x.plannedFor && x.plannedFor > t)}${planBtn('Unplanned', 'none', '', !x.plannedFor)}</div>
    ${x.plannedFor && x.plannedFor !== t ? `<p class="muted sm">Planned for ${esc(fmtDate(x.plannedFor, { weekday: true }))}${x.plannedFor < t ? ' · carried over' : ''}</p>` : ''}
    <div class="grid3">
      ${dateField(x.id, 'due', x.due, { label: 'Due' })}
      ${numberField(x.id, 'estimate', x.estimate, { label: 'Estimate', step: 0.25, suffix: 'h' })}
      ${selectField(x.id, 'energy', x.energy, ENERGY, { label: 'Energy', empty: '—' })}
    </div>
    ${selectField(x.id, 'projectId', x.projectId, store.data.projects.filter((pp) => M.isOpen(pp) || pp.id === x.projectId).map((pp) => [pp.id, `${M.areaOf(pp) ? M.areaOf(pp).title + ' · ' : ''}${pp.title}`]), { label: 'Project', empty: 'No project' })}
    ${!x.projectId ? selectField(x.id, 'areaId', x.areaId, opts(store.data.areas), { label: 'Domain', empty: 'Inbox (unsorted)' }) : ''}
    ${blockers.length ? `<p class="alert bad">Blocked by ${blockers.map((b) => `<button class="linklike" data-act="select" data-id="${esc(b.id)}">${esc(b.title)}</button>`).join(', ')}</p>` : ''}
    ${textField(x.id, 'notes', x.notes, { label: 'Notes', multiline: true, rows: 3 })}
    ${more('task-more-' + x.id, 'Dependencies', `${btn('+ Blocked by…', 'add-blocker', { id: x.id }, 'ghost sm')}
      ${selectField(x.id, 'objectiveId', x.objectiveId, [...store.data.objectives].filter(M.isOpen).map((o) => [o.id, o.title]), { label: 'Directly serves objective', empty: 'Via project' })}`)}`;
}

function waiting(x) {
  const log = x.log || [];
  return `
    <div class="task-actions">
      ${M.isOpen(x) ? btn('✓ Received', 'received', { id: x.id }, 'primary') + btn('↻ Followed up', 'followup', { id: x.id }, 'ghost') : btn('↺ Reopen', 'complete', { id: x.id })}
    </div>
    <div class="grid2">
      ${textField(x.id, 'who', x.who, { label: 'Waiting on', placeholder: 'Person or organisation' })}
      ${selectField(x.id, 'personId', x.personId, opts(store.data.people), { label: 'Person record', empty: '—' })}
      ${dateField(x.id, 'requestedAt', x.requestedAt, { label: 'Requested' })}
      ${dateField(x.id, 'expectedAt', x.expectedAt, { label: 'Expected' })}
      ${dateField(x.id, 'followUpAt', x.followUpAt, { label: 'Follow up on' })}
      ${selectField(x.id, 'projectId', x.projectId, store.data.projects.filter(M.isOpen).map((p) => [p.id, p.title]), { label: 'Related project', empty: 'None' })}
    </div>
    ${textField(x.id, 'followUpAction', x.followUpAction, { label: 'Next follow-up action', placeholder: 'e.g. Call the office' })}
    ${x.requestedAt ? `<p class="muted sm">Open for ${Math.max(0, Math.round((new Date(today()) - new Date(x.requestedAt)) / 86400000))} days${x.expectedAt ? ` · expected ${esc(relDay(x.expectedAt))}` : ''}</p>` : ''}
    ${log.length ? section('Follow-up log', `<ul class="log">${log.map((l) => `<li>${esc(fmtDate(l.date))} · ${esc(l.note || 'Followed up')}</li>`).join('')}</ul>`) : ''}
    ${textField(x.id, 'notes', x.notes, { label: 'Notes', multiline: true })}`;
}

function responsibility(x) {
  const days = new Set(x.days || []);
  return `
    ${selectField(x.id, 'areaId', x.areaId, opts(store.data.areas), { label: 'Domain', empty: 'None' })}
    <div class="fld"><span>Days</span><div class="days">${DOW_SHORT.map((l, i) => `<button class="day ${days.has(i + 1) ? 'on' : ''}" data-act="toggle-day" data-id="${esc(x.id)}" data-day="${i + 1}"><i>${l}</i></button>`).join('')}</div></div>
    <div class="grid3">
      <label class="fld"><span>Start</span><input type="time" data-bind="${esc(x.id)}|start" data-kind="date" value="${esc(x.start || '')}"></label>
      ${numberField(x.id, 'duration', x.duration, { label: 'Hours each', step: 0.25, suffix: 'h' })}
      ${numberField(x.id, 'hoursPerWeek', x.hoursPerWeek, { label: 'or h/week', step: 0.5, suffix: 'h' })}
    </div>
    <div class="kpis"><div class="kpi"><em>Weekly load</em><b>${fmtHours(M.weeklyHoursOf(x))}</b></div><div class="kpi"><em>Counts as</em><b>Fixed</b></div></div>
    ${textField(x.id, 'why', x.why, { label: 'Why this matters' })}
    ${textField(x.id, 'notes', x.notes, { label: 'Notes', multiline: true })}`;
}

function habit(x) {
  const w = M.habitWeek(x);
  return `
    <div class="fld"><span>This week · ${w.count}/${x.targetPerWeek}</span><div class="days">${w.days.map((d, i) => `<button class="day ${d.done ? 'on' : ''} ${d.date === today() ? 'today' : ''}" data-act="habit-toggle" data-id="${esc(x.id)}" data-date="${d.date}"><i>${DOW_SHORT[i]}</i></button>`).join('')}</div></div>
    <div class="grid2">
      ${numberField(x.id, 'targetPerWeek', x.targetPerWeek, { label: 'Target per week', step: 1, min: 1 })}
      ${selectField(x.id, 'areaId', x.areaId, opts(store.data.areas), { label: 'Domain', empty: 'None' })}
    </div>
    ${textField(x.id, 'why', x.why, { label: 'Why this matters' })}
    ${textField(x.id, 'notes', x.notes, { label: 'Notes', multiline: true })}`;
}

function resource(x) {
  let body = '';
  if (x.kind === 'time') {
    const t = M.timeSummary();
    body = `<div class="kpis">
      <div class="kpi"><em>Committable</em><b>${fmtHours(t.total)}</b></div>
      <div class="kpi"><em>Fixed</em><b>${fmtHours(t.fixed)}</b></div>
      <div class="kpi"><em>Available</em><b>${fmtHours(t.available)}</b></div>
      <div class="kpi ${t.over ? 'bad' : ''}"><em>${t.over ? 'Overallocated' : 'Unallocated'}</em><b>${fmtHours(Math.abs(t.unallocated))}</b></div></div>
      ${t.over ? `<p class="alert bad">You have planned ${fmtHours(t.allocated)} into ${fmtHours(t.available)} of available time.</p>` : ''}
      ${btn('Open capacity planner', 'open-view', { view: 'capacity' }, 'primary sm')}`;
  } else if (x.kind === 'money') {
    const m = M.moneySummary();
    body = `<div class="kpis"><div class="kpi"><em>In / month</em><b>${Math.round(m.inflow)}</b></div><div class="kpi"><em>Out / month</em><b>${Math.round(m.outflow)}</b></div><div class="kpi ${m.over ? 'bad' : ''}"><em>Net</em><b>${Math.round(m.net)}</b></div></div>${btn('Open money plan', 'open-cap', { tab: 'money' }, 'primary sm')}`;
  } else {
    const s = M.shareSummary(x.id);
    body = `<div class="kpis"><div class="kpi"><em>Assigned</em><b>${s.used}%</b></div><div class="kpi ${s.over ? 'bad' : ''}"><em>${s.over ? 'Over' : 'Free'}</em><b>${Math.abs(s.free)}%</b></div></div>${btn(`Open ${x.title.toLowerCase()} plan`, 'open-cap', { tab: x.kind }, 'primary sm')}`;
  }
  const cons = store.data.constraints.filter((c) => c.resourceId === x.id && M.isOpen(c));
  return `<p class="muted">${esc(RESOURCE_KINDS[x.kind] ? RESOURCE_KINDS[x.kind].label : '')} is a finite resource. Everything that uses it competes for it.</p>
    ${body}
    ${section('Constraints', list(cons, (c) => row(c, { path: false }), { emptyText: 'None recorded.' }), { extra: createBtn('+ Constraint', 'constraint', { resourceId: x.id }) })}
    ${textField(x.id, 'notes', x.notes, { label: 'Notes', multiline: true })}`;
}

function constraint(x) {
  return `
    ${textField(x.id, 'description', x.description, { label: 'What it limits', multiline: true })}
    <div class="grid3">
      ${selectField(x.id, 'severity', x.severity, [['hard', 'Hard limit'], ['soft', 'Soft limit']], { label: 'Severity' })}
      ${selectField(x.id, 'areaId', x.areaId, opts(store.data.areas), { label: 'Domain', empty: 'None' })}
      ${selectField(x.id, 'resourceId', x.resourceId, opts(store.data.resources), { label: 'Resource', empty: 'None' })}
    </div>
    ${textField(x.id, 'notes', x.notes, { label: 'Notes', multiline: true })}`;
}

function person(x) {
  const waits = store.data.waiting.filter((w) => w.personId === x.id || (w.who && w.who.toLowerCase() === x.title.toLowerCase()));
  return `
    ${textField(x.id, 'role', x.role, { label: 'Role' })}
    ${section('Waiting on them', list(waits, (w) => row(w, { meta: dueChip(w.followUpAt, { label: 'follow up' }) }), { emptyText: 'Nothing open.' }), { extra: createBtn('+ Waiting', 'waiting', { who: x.title }) })}
    ${textField(x.id, 'notes', x.notes, { label: 'Notes', multiline: true, rows: 4 })}`;
}

function relationship(x) {
  const def = REL_TYPES[x.kind];
  const ends = (id, label) => { const it = store.get(id); return `<button class="rel-end" data-act="select" data-id="${esc(id)}" style="--c:${esc(M.colorOf(it))}"><em>${label}</em>${typeChip(it)}<b>${esc(M.titleOf(id))}</b></button>`; };
  return `
    <div class="rel-card f-${def.family}">
      ${ends(x.from, 'Upstream')}
      <div class="rel-mid"><i></i><span>${esc(def.category.toUpperCase())}</span><i></i></div>
      ${ends(x.to, 'Downstream')}
    </div>
    ${textField(x.id, 'note', x.note, { label: 'Explanation', multiline: true, rows: 3, placeholder: def.template(M.titleOf(x.from), M.titleOf(x.to)) })}
    <div class="grid2">
      ${selectField(x.id, 'kind', x.kind, Object.entries(REL_TYPES).map(([k, r]) => [k, r.label]), { label: 'Relationship type' })}
      <div class="fld"><span>Direction</span><button class="btn ghost sm" data-act="rel-swap" data-id="${esc(x.id)}">⇄ Swap</button></div>
    </div>
    <p class="muted sm">${esc(def.symmetric ? 'Symmetric: both sides pull on the same thing.' : `Reads: ${M.titleOf(x.from)} ${def.verb} ${M.titleOf(x.to)}.`)}</p>
    <footer class="insp-foot">${btn('Edit in dialog', 'rel-edit', { id: x.id }, 'ghost sm')}${btn('Delete relationship', 'delete', { id: x.id }, 'ghost sm danger')}</footer>`;
}

function edgeInfo(e) {
  const a = store.get(e.from), b = store.get(e.to);
  let title = '', expl = '', kind = '';
  if (e.kind === 'hier') { kind = 'Structure'; title = `${b ? b.title : ''} is part of ${a ? (a.id === 'mission' ? 'your mission' : a.title) : ''}`; expl = 'Parent/child: the child exists to serve the parent. Change it from the child’s placement fields.'; }
  else if (e.kind === 'serves') { kind = 'Serves'; title = `${a.title} serves ${b.title}`; expl = 'This project lives in its own domain but moves an objective in another domain forward. That is a cross-domain dependency.'; }
  else if (e.kind === 'flow') { kind = 'Resource flow'; title = `${a.title} → ${b.title}`; expl = a.kind === 'time' ? `${b.title} uses ${e.flowLabel} per week of your time (fixed commitments + allocations).` : `Allocated ${e.flowLabel} from the ${a.type === 'resource' ? a.title : b.title} plan.`; }
  return `<div class="insp"><header class="insp-head"><div class="insp-top"><span class="tchip fam-link"><i>⟶</i>${esc(kind)}</span><span class="grow"></span><button class="x" data-act="inspector-close">×</button></div><h2 class="insp-rel">${esc(title)}</h2></header>
    <div class="insp-body"><p class="muted">${esc(expl)}</p>
    <div class="rel-card f-${e.family}">${a ? `<button class="rel-end" data-act="select" data-id="${esc(a.id)}"><em>From</em>${typeChip(a)}<b>${esc(a.id === 'mission' ? 'Mission' : a.title)}</b></button>` : ''}<div class="rel-mid"><i></i><span>${esc(kind.toUpperCase())}</span><i></i></div>${b ? `<button class="rel-end" data-act="select" data-id="${esc(b.id)}"><em>To</em>${typeChip(b)}<b>${esc(b.title)}</b></button>` : ''}</div>
    ${e.kind === 'flow' ? btn('Open capacity planner', 'open-view', { view: 'capacity' }, 'ghost sm') : ''}</div></div>`;
}

function home() {
  const m = store.data.mission;
  const p = M.pulse();
  const plan = M.todayPlan();
  const t = p.time;
  const focus = store.get(m.focusAreaId);
  return `<div class="insp home">
    <header class="insp-head"><div class="insp-top"><span class="tchip fam-direction"><i>✦</i>Command</span><span class="grow"></span><button class="x" data-act="inspector-close">×</button></div>
    <h2 class="insp-mission">${esc(m.statement ? 'Where you are going' : 'Start with your mission')}</h2></header>
    <div class="insp-body">
      <button class="mission-card" data-act="select" data-id="mission"><em>Mission</em><p>${esc(m.statement || 'Click to define why your life system exists.')}</p>${focus || m.focus ? `<small>Focus · ${esc(m.focus || '')}${focus ? ` <span style="--c:${esc(focus.color)}" class="adot"></span>${esc(focus.title)}` : ''}</small>` : ''}</button>
      <div class="kpis">
        <button class="kpi ${t.over ? 'bad' : ''}" data-act="open-view" data-view="capacity"><em>${t.over ? 'Overallocated' : 'Unallocated'}</em><b>${fmtHours(Math.abs(t.unallocated))}</b></button>
        <button class="kpi ${p.noNext ? 'warn' : ''}" data-act="open-view" data-view="projects"><em>No next action</em><b>${p.noNext}</b></button>
        <button class="kpi ${p.followUps ? 'warn' : ''}" data-act="open-view" data-view="waiting"><em>Follow-ups due</em><b>${p.followUps}</b></button>
      </div>
      ${section('Do next', plan.top3.length || plan.next.length ? list([...plan.top3, ...plan.dueOrOverdue, ...plan.next].slice(0, 5), (tk) => row(tk, { meta: tk.plannedFor === today() ? '<span class="chip ok">today</span>' : '' })) : empty('Nothing queued', 'Add a project with a next action and it will surface here.'), { extra: btn('Today →', 'open-view', { view: 'today' }, 'ghost xs') })}
      ${p.blocked ? `<p class="alert bad">${p.blocked} item${p.blocked === 1 ? ' is' : 's are'} blocked. <button class="linklike" data-act="open-view" data-view="week">See what</button></p>` : ''}
      ${section('Read the map', `<ul class="howto"><li><b>Click</b> a node to inspect it. <b>Double-click</b> to expand or collapse.</li><li><b>Drag</b> nodes to arrange them. Drag empty space to pan, scroll to zoom.</li><li><b>Click a line</b> to see what the relationship means.</li><li>Shapes carry meaning: <span class="lg lg-area"></span> domain · <span class="lg lg-goal"></span> goal · <span class="lg lg-proj"></span> project · <span class="lg lg-task"></span> action · <span class="lg lg-res"></span> resource.</li></ul>`)}
    </div></div>`;
}

export function renderHome() {
  return home();
}

