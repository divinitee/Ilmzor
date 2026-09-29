// Weekly review: a guided pass that ends with an actual execution plan for the week.

import { store } from '../store.js';
import { ui } from '../ui.js';
import * as M from '../model.js';
import { HORIZON } from '../schema.js';
import { esc, today, addDays, weekStart, isoDow, fmtDate, fmtHours, plural } from '../util.js';
import { row, btn, empty, dueChip, quickAdd } from '../ui/fields.js';
import { projectRow } from '../ui/inspector.js';

export const STEPS = [
  ['done', 'Completed', 'What did I complete?'],
  ['open', 'Open & overdue', 'What remains open? What is overdue?'],
  ['projects', 'Projects', 'Does every project have a next action?'],
  ['waiting', 'Waiting', 'What am I waiting for?'],
  ['changes', 'Changes', 'What changed? What became irrelevant?'],
  ['capacity', 'Capacity', 'How much capacity do I have next week?'],
  ['outcomes', 'Outcomes', 'What are my 3–5 outcomes for the week?'],
];

export function targetWeek() {
  return isoDow(today()) >= 5 ? addDays(weekStart(), 7) : weekStart();
}

export function newDraft() {
  return { step: 0, wins: '', changed: '', irrelevant: '', outcomes: Array.from({ length: 5 }, () => ({ title: '', serves: '' })), startedAt: new Date().toISOString(), weekOf: targetWeek() };
}

export function renderReview() {
  const r = ui.review;
  if (r && r.viewId) return summary(store.get(r.viewId), true);
  if (!r || r.step === undefined) return intro();
  const step = Math.max(0, Math.min(STEPS.length - 1, r.step));
  const [key, label, q] = STEPS[step];
  const pills = STEPS.map(([k, l], i) => `<button class="rstep ${i === step ? 'on' : ''} ${i < step ? 'past' : ''}" data-act="review-step" data-step="${i}"><i>${i < step ? '✓' : i + 1}</i>${l}</button>`).join('');
  return `
  <header class="vhead">
    <div><div class="eyebrow">Weekly review · planning week of ${esc(fmtDate(r.weekOf))}</div><h1>${esc(q)}</h1></div>
    <div class="vhead-actions">${btn('Discard review', 'review-cancel', {}, 'ghost sm')}</div>
  </header>
  <div class="rsteps">${pills}</div>
  <div class="rbody" data-step="${key}">${STEP_BODY[key](r)}</div>
  <footer class="rfoot">
    ${step > 0 ? btn('← Back', 'review-step', { step: step - 1 }, 'ghost') : '<span></span>'}
    <span class="muted sm">${step + 1} of ${STEPS.length} · ${esc(label)}</span>
    ${step < STEPS.length - 1 ? btn('Next →', 'review-step', { step: step + 1 }, 'primary') : btn('Finish & create weekly plan', 'review-finish', {}, 'primary')}
  </footer>`;
}

function intro() {
  const rs = M.reviewStatus();
  const past = [...store.data.reviews].sort((a, b) => String(b.completedAt).localeCompare(String(a.completedAt)));
  return `
  <header class="vhead"><div><div class="eyebrow">Weekly review</div><h1>Close the loops. Choose the week.</h1>
    <p class="lede">${rs.last ? `Last review ${rs.days === 0 ? 'today' : `${rs.days} days ago`}.` : 'You have not run a review yet.'} Around 20 minutes. You finish with 3–5 outcomes and a capacity-checked plan.</p></div></header>
  <div class="review-intro">
    <ol class="rsteps-list">${STEPS.map(([, l, q]) => `<li><b>${l}</b><span>${esc(q)}</span></li>`).join('')}</ol>
    ${btn(rs.due ? 'Start weekly review' : 'Start another review', 'review-start', {}, 'primary')}
  </div>
  ${past.length ? `<section class="blk"><h3>Past reviews</h3><div class="rows">${past.map((v) => `<button class="rv-row" data-act="review-view" data-id="${esc(v.id)}"><b>Week of ${esc(fmtDate(v.weekOf))}</b><em>${plural((v.outcomeIds || []).length, 'outcome')} · ${v.stats && v.stats.completed !== undefined ? `${v.stats.completed} completed` : ''}</em><span>${esc(fmtDate((v.completedAt || '').slice(0, 10)))}</span></button>`).join('')}</div></section>` : ''}`;
}

const draftArea = (field, value, placeholder, rows = 3) => `<textarea class="draft" data-review="${field}" rows="${rows}" placeholder="${esc(placeholder)}">${esc(value || '')}</textarea>`;

const STEP_BODY = {
  done(r) {
    const since = addDays(today(), -7);
    const items = M.completedSince(since);
    const groups = [['task', 'Actions'], ['project', 'Projects'], ['objective', 'Objectives'], ['goal', 'Goals'], ['waiting', 'Received']];
    return `${items.length ? groups.map(([t, l]) => {
      const list = items.filter((x) => x.type === t);
      return list.length ? `<div class="group"><div class="group-h">${l} <small>${list.length}</small></div><div class="rows">${list.map((x) => row(x)).join('')}</div></div>` : '';
    }).join('') : empty('Nothing marked complete in the last 7 days', 'That happens. Note anything you did that the system does not know about.')}
    <label class="fld wide"><span>Wins, lessons, anything worth remembering</span>${draftArea('wins', r.wins, 'What went well? What did you learn?')}</label>`;
  },
  open() {
    const t = today();
    const overdue = store.data.tasks.filter((x) => M.isOpen(x) && x.due && x.due < t);
    const stale = store.data.tasks.filter((x) => M.isOpen(x) && x.plannedFor && x.plannedFor < t && !overdue.includes(x));
    const late = [...store.data.projects, ...store.data.objectives].filter((x) => M.isOpen(x) && x.deadline && x.deadline < t);
    const acts = (x) => `${btn('Done', 'complete', { id: x.id }, 'ghost xs')}${x.type === 'task' ? btn('Next week', 'plan', { id: x.id, when: 'nextweek', prio: 'must' }, 'ghost xs') : ''}${btn('Drop', 'drop', { id: x.id }, 'ghost xs')}`;
    const all = [...overdue, ...late, ...stale];
    return all.length ? `
      ${overdue.length ? `<div class="group"><div class="group-h bad">Overdue actions</div><div class="rows">${overdue.map((x) => row(x, { meta: dueChip(x.due), actions: acts(x) })).join('')}</div></div>` : ''}
      ${late.length ? `<div class="group"><div class="group-h bad">Past deadline</div><div class="rows">${late.map((x) => row(x, { meta: dueChip(x.deadline), actions: `${btn('Edit', 'select', { id: x.id }, 'ghost xs')}${btn('Drop', 'drop', { id: x.id }, 'ghost xs')}` })).join('')}</div></div>` : ''}
      ${stale.length ? `<div class="group"><div class="group-h">Planned but not done</div><div class="rows">${stale.map((x) => row(x, { actions: acts(x) })).join('')}</div></div>` : ''}`
      : empty('Nothing overdue or carried over', 'Clean. Move on.');
  },
  projects() {
    const ps = store.data.projects.filter(M.isActiveProject);
    const missing = ps.filter((p) => M.projectFlags(p).noNext);
    return `${missing.length ? `<div class="group"><div class="group-h warn">No next action · ${missing.length}</div>${missing.map((p) => `<div class="rv-proj">${projectRow(p)}${quickAdd('task', { projectId: p.id, isNext: true }, `Next action for ${p.title}…`)}</div>`).join('')}</div>` : '<p class="ok">✓ Every active project has a next action.</p>'}
      <div class="group"><div class="group-h">All active projects · ${ps.length}</div><div class="rows">${ps.filter((p) => !missing.includes(p)).map((p) => projectRow(p)).join('')}</div></div>
      <p class="muted sm">Click a project to change its status, archive it, or rewrite its next action.</p>`;
  },
  waiting() {
    const open = store.data.waiting.filter(M.isOpen);
    return open.length ? `<div class="rows">${open.map((w) => row(w, { sub: esc(`${w.who || '—'} · ${w.followUpAction || 'no follow-up action'}`), meta: dueChip(w.followUpAt, { label: 'follow up' }), actions: `${btn('Received', 'received', { id: w.id }, 'ghost xs')}${btn('Followed up', 'followup', { id: w.id }, 'ghost xs')}` })).join('')}</div>`
      : empty('Not waiting on anything', 'Anything you asked for and have not received yet? Capture it.', btn('+ Waiting item', 'create', { type: 'waiting' }, 'sm'));
  },
  changes(r) {
    const active = [...store.data.objectives, ...store.data.projects].filter((x) => M.isOpen(x) && x.status !== 'complete');
    return `<div class="grid2">
      <label class="fld wide"><span>What changed this week?</span>${draftArea('changed', r.changed, 'New information, priorities, circumstances…')}</label>
      <label class="fld wide"><span>What became irrelevant?</span>${draftArea('irrelevant', r.irrelevant, 'Things you no longer need to do or care about')}</label></div>
      <div class="group"><div class="group-h">Drop or pause what no longer matters</div><div class="rows">${active.map((x) => row(x, { meta: x.type === 'objective' ? `<span class="chip">${esc(HORIZON[x.horizon]?.short || '')}</span>` : '', actions: `${x.type === 'project' ? btn('Pause', 'set-status', { id: x.id, status: 'not_started' }, 'ghost xs') : ''}${btn('Drop', 'drop', { id: x.id }, 'ghost xs')}` })).join('')}</div></div>`;
  },
  capacity() {
    const t = M.timeSummary();
    return `<div class="cap-kpis">
      <label class="ckpi edit"><em>Committable hours next week</em><span><input type="number" min="0" data-bind="settings|weeklyHours" data-kind="number" value="${esc(t.total)}"><i>h</i></span></label>
      <div class="ckpi"><em>Fixed</em><b>${fmtHours(t.fixed)}</b></div>
      <div class="ckpi"><em>Available</em><b>${fmtHours(t.available)}</b></div>
      <div class="ckpi ${t.over ? 'bad' : 'ok'}"><em>${t.over ? 'Overallocated' : 'Unallocated'}</em><b>${fmtHours(Math.abs(t.unallocated))}</b></div></div>
      ${t.over ? `<div class="verdict bad"><b>Overallocated by ${fmtHours(t.overBy)}</b><span>Lower a budget below before choosing outcomes.</span></div>` : ''}
      <div class="rv-alloc">${store.data.areas.map((a) => {
        const v = t.areaAlloc.get(a.id) || 0;
        const over = t.overAreas.find((o) => o.areaId === a.id);
        return `<div class="share ${over ? 'over' : ''}" style="--c:${esc(a.color)}"><span><i class="adot" style="--c:${esc(a.color)}"></i>${esc(a.title)}${t.fixedByArea.get(a.id) ? `<em>+${fmtHours(t.fixedByArea.get(a.id))} fixed</em>` : ''}</span><span class="stepper"><button data-act="alloc-step" data-res="rc_time" data-target="${esc(a.id)}" data-delta="-1">−</button><input type="number" min="0" data-alloc-target="${esc(a.id)}" data-res="rc_time" value="${v || ''}" placeholder="0"><i>h</i><button data-act="alloc-step" data-res="rc_time" data-target="${esc(a.id)}" data-delta="1">+</button></span>${over ? `<em class="bad sm">${esc(over.reason)}</em>` : ''}</div>`;
      }).join('')}</div>
      ${btn('Open full capacity planner', 'open-view', { view: 'capacity' }, 'ghost sm')}`;
  },
  outcomes(r) {
    const serves = [...store.data.objectives.filter((o) => M.isOpen(o) && o.horizon !== 'week'), ...store.data.goals.filter(M.isOpen)]
      .sort((a, b) => (HORIZON[b.horizon]?.rank || 0) - (HORIZON[a.horizon]?.rank || 0));
    const sugg = [
      ...store.data.objectives.filter((o) => M.isOpen(o) && (o.horizon === 'month' || o.horizon === 'quarter')),
      ...store.data.projects.filter((p) => M.isActiveProject(p) && (p.priority === 'high' || (p.deadline && p.deadline <= addDays(today(), 14)))),
    ].slice(0, 8);
    return `<p class="muted">Outcomes are results, not tasks: “CV experience section drafted”, not “work on CV”. Link each to what it serves.</p>
      <div class="outs">${r.outcomes.map((o, i) => `<div class="out-row"><span class="top-n">${i + 1}</span><input data-review-out="${i}|title" value="${esc(o.title)}" placeholder="${i < 3 ? 'Outcome' : 'Optional outcome'}"><select data-review-out="${i}|serves"><option value="">Serves…</option>${serves.map((s) => `<option value="${esc(s.id)}" ${s.id === o.serves ? 'selected' : ''}>${esc(HORIZON[s.horizon]?.short || '')} · ${esc(s.title)}</option>`).join('')}</select></div>`).join('')}</div>
      ${sugg.length ? `<div class="sugg-wrap"><em>Suggestions from active objectives and urgent projects</em>${sugg.map((s) => `<button class="sugg" data-act="review-suggest" data-id="${esc(s.id)}"><span>+</span>${esc(s.title)}<em>${esc(M.typeLabel(s))}</em></button>`).join('')}</div>` : ''}
      <p class="muted sm">Finishing creates these as weekly objectives linked to what they serve, saves the review, and shows your weekly plan.</p>`;
  },
};

export function summary(v, fromHistory = false) {
  if (!v) return empty('Review not found');
  const outcomes = (v.outcomeIds || []).map((id) => store.get(id)).filter(Boolean);
  return `
  <header class="vhead"><div><div class="eyebrow">Weekly plan</div><h1>Week of ${esc(fmtDate(v.weekOf))}</h1><p class="lede">Reviewed ${esc(fmtDate((v.completedAt || '').slice(0, 10)))} · ${v.stats ? `${v.stats.completed} completed · ${v.stats.openProjects} active projects · ${v.stats.waiting} waiting` : ''}</p></div>
  <div class="vhead-actions">${btn(fromHistory ? '← All reviews' : 'Done', 'review-close', {}, 'ghost sm')}${btn('Open This Week', 'open-view', { view: 'week' }, 'primary sm')}</div></header>
  <section class="blk"><h3>Outcomes</h3>${outcomes.length ? `<div class="rows">${outcomes.map((o) => row(o)).join('')}</div>` : '<p class="muted">No outcomes recorded.</p>'}</section>
  ${v.capacity ? `<section class="blk"><h3>Capacity</h3><p>${fmtHours(v.capacity.allocated)} allocated of ${fmtHours(v.capacity.available)} available${v.capacity.over ? ' · <span class="bad">overallocated</span>' : ''}</p></section>` : ''}
  ${['wins', 'changed', 'irrelevant'].filter((k) => v.answers && v.answers[k]).map((k) => `<section class="blk"><h3>${{ wins: 'Wins & lessons', changed: 'What changed', irrelevant: 'What became irrelevant' }[k]}</h3><p class="prose">${esc(v.answers[k])}</p></section>`).join('')}`;
}
