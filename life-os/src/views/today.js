// Today: an execution surface, not a task dump.

import { store } from '../store.js';
import * as M from '../model.js';
import { esc, today, fmtLongDate, fmtHours, addDays, isoDow, plural } from '../util.js';
import { row, btn, empty, dueChip, whyTrail } from '../ui/fields.js';

const expandedNext = { on: false };

function planActions(t) {
  return `${btn('Top 3', 'plan', { id: t.id, when: 'today', prio: 'must' }, 'ghost xs')}${btn('Optional', 'plan', { id: t.id, when: 'today', prio: 'optional' }, 'ghost xs')}`;
}
const est = (t) => (t.estimate ? `<span class="chip">${fmtHours(t.estimate)}</span>` : '');

export function renderToday() {
  const date = today();
  const p = M.todayPlan(date);
  const day = store.data.days[date] || {};
  const closed = !!day.closedAt;
  const tomorrow = addDays(date, 1);
  const tomorrowFixed = store.data.responsibilities.filter((r) => M.occursOn(r, tomorrow));
  const openToday = [...p.top3, ...p.must, ...p.optional].filter(M.isOpen);

  const summary = [
    p.fixed.length ? `${plural(p.fixed.length, 'fixed commitment')} (${fmtHours(p.fixedHours)})` : 'no fixed commitments',
    `${fmtHours(Math.max(0, p.free))} free`,
    p.followUps.length ? `${plural(p.followUps.length, 'follow-up')} due` : '',
  ].filter(Boolean).join(' · ');

  const top = p.top3.length
    ? `<div class="top3">${p.top3.map((t, i) => `<div class="top-card ${M.isDone(t) ? 'done' : ''}">
        <span class="top-n">${i + 1}</span>
        <button class="cbox big ${M.isDone(t) ? 'on' : ''}" data-act="complete" data-id="${esc(t.id)}">${M.isDone(t) ? '✓' : ''}</button>
        <div class="top-main" data-act="select" data-id="${esc(t.id)}"><b>${esc(t.title)}</b>${whyTrail(t, { compact: true })}</div>
        <div class="top-meta">${est(t)}${btn('×', 'plan', { id: t.id, when: 'none' }, 'ghost xs')}</div></div>`).join('')}
        ${p.top3.length < 3 ? `<div class="top-slot">Pick ${3 - p.top3.length} more from next actions below, or leave space.</div>` : ''}</div>`
    : `<div class="top3 emptyish">${empty('What would make today a success?', 'Pick up to three outcomes from your next actions. Everything else is secondary.', p.next.slice(0, 3).map((t) => `<button class="sugg" data-act="plan" data-id="${esc(t.id)}" data-when="today" data-prio="must"><span>+</span>${esc(t.title)}<em>${esc(M.titleOf(t.projectId))}</em></button>`).join(''))}</div>`;

  const nextList = expandedNext.on ? p.next : p.next.slice(0, 6);
  const dueBlock = p.dueOrOverdue.length || p.must.length
    ? `<section class="blk"><h3>Must happen <small>due, overdue, committed</small></h3><div class="rows">${[...p.must, ...p.dueOrOverdue].map((t) => row(t, { meta: `${dueChip(t.due)}${est(t)}`, actions: btn('→ Tomorrow', 'plan', { id: t.id, when: 'tomorrow', prio: 'must' }, 'ghost xs') })).join('')}</div></section>` : '';
  const carried = p.carried.length
    ? `<section class="blk"><h3>Carried over <small>planned earlier, not done</small></h3><div class="rows">${p.carried.map((t) => row(t, { meta: est(t), actions: `${btn('Today', 'plan', { id: t.id, when: 'today', prio: 'must' }, 'ghost xs')}${btn('Unplan', 'plan', { id: t.id, when: 'none' }, 'ghost xs')}` })).join('')}</div></section>` : '';

  const hoursBar = () => {
    const cap = Math.max(p.dailyHours, p.fixedHours + p.plannedHours, 1);
    const w = (h) => `${(100 * h) / cap}%`;
    const over = p.fixedHours + p.plannedHours > p.dailyHours;
    return `<div class="daybar ${over ? 'over' : ''}"><i class="fx" style="width:${w(p.fixedHours)}"></i><i class="pl" style="width:${w(p.plannedHours)}"></i></div>
      <div class="daylegend"><span><i class="fx"></i>Fixed ${fmtHours(p.fixedHours)}</span><span><i class="pl"></i>Planned ${fmtHours(p.plannedHours)}</span><span class="${over ? 'bad' : ''}">${over ? `Over by ${fmtHours(p.fixedHours + p.plannedHours - p.dailyHours)}` : `Free ${fmtHours(p.free)}`}</span><span class="muted">of ${fmtHours(p.dailyHours)} · <label class="inline-num"><input type="number" min="1" max="24" step="0.5" data-bind="settings|dailyHours" data-kind="number" value="${esc(p.dailyHours)}"> h day</label></span></div>`;
  };

  const shutdownChecks = [
    [openToday.length === 0, openToday.length ? `${plural(openToday.length, 'item')} from today still open — complete, move or drop` : 'Today’s plan is cleared'],
    [store.data.tasks.filter((t) => M.isOpen(t) && !t.projectId && !t.areaId).length === 0, 'Inbox processed (captured items have a home)'],
    [p.followUps.length === 0, p.followUps.length ? `${plural(p.followUps.length, 'follow-up')} still due` : 'Follow-ups handled'],
  ];

  return `
  <header class="vhead">
    <div><div class="eyebrow">Today</div><h1>${esc(fmtLongDate(date))}</h1><p class="lede">${esc(summary)}</p></div>
    <div class="vhead-actions">${btn('+ Action', 'create', { type: 'task' }, 'ghost sm')}</div>
  </header>
  <div class="capture"><span>＋</span><input data-quick="task" data-defaults='{"plannedFor":"${date}","plannedPriority":"optional"}' placeholder="Capture something for today… (Enter)"></div>
  <div class="cols">
    <div class="col-main">
      <section class="blk"><h3>Top outcomes <small>max three</small></h3>${top}</section>
      ${dueBlock}
      <section class="blk"><h3>Next actions <small>from active projects · ranked by deadline, priority, focus</small></h3>
        ${p.next.length ? `<div class="rows">${nextList.map((t) => row(t, { sub: esc(M.pathLabel(t)), meta: `${t.due ? dueChip(t.due) : ''}${est(t)}`, actions: planActions(t) })).join('')}</div>${p.next.length > 6 ? `<button class="linklike more-link" data-act="toggle-next-list">${expandedNext.on ? 'Show fewer' : `Show all ${p.next.length}`}</button>` : ''}` : empty('No next actions', 'Projects need a defined next physical action to show up here.', btn('Open projects', 'open-view', { view: 'projects' }, 'sm'))}
        ${p.blocked.length ? `<p class="muted sm">${plural(p.blocked.length, 'next action')} hidden because blocked.</p>` : ''}
      </section>
      ${p.optional.length ? `<section class="blk"><h3>Optional <small>if time allows</small></h3><div class="rows">${p.optional.map((t) => row(t, { meta: est(t), actions: btn('Promote', 'plan', { id: t.id, when: 'today', prio: 'must' }, 'ghost xs') })).join('')}</div></section>` : ''}
      ${carried}
    </div>
    <aside class="col-side">
      <section class="blk"><h3>Fixed <small>${esc(['', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][isoDow(date)])}</small></h3>
        ${p.fixed.length ? `<div class="timeline">${p.fixed.map((r) => `<button class="tl" data-act="select" data-id="${esc(r.id)}" style="--c:${esc(M.colorOf(r))}"><time>${esc(r.start || '—')}</time><b>${esc(r.title)}</b><em>${fmtHours(r.duration)}</em></button>`).join('')}</div>` : '<p class="muted sm">No fixed commitments today.</p>'}
      </section>
      <section class="blk"><h3>Available time</h3>${hoursBar()}</section>
      <section class="blk"><h3>Waiting <small>follow up now</small></h3>
        ${p.followUps.length ? `<div class="rows">${p.followUps.map((w) => row(w, { sub: esc(`${w.who || M.titleOf(w.personId) || '—'} · ${w.followUpAction || 'follow up'}`), actions: `${btn('Followed up', 'followup', { id: w.id }, 'ghost xs')}${btn('Received', 'received', { id: w.id }, 'ghost xs')}` })).join('')}</div>` : '<p class="muted sm">Nothing to chase today.</p>'}
      </section>
      ${p.habits.length ? `<section class="blk"><h3>Habits</h3><div class="habits">${p.habits.map((h) => {
        const w = M.habitWeek(h);
        const on = (h.log || []).includes(date);
        return `<button class="habit ${on ? 'on' : ''}" data-act="habit-toggle" data-id="${esc(h.id)}" data-date="${date}"><i>${on ? '✓' : ''}</i><b>${esc(h.title)}</b><em>${w.count}/${h.targetPerWeek}</em></button>`;
      }).join('')}</div></section>` : ''}
      <section class="blk shutdown ${closed ? 'closed' : ''}"><h3>Shutdown</h3>
        ${closed ? `<p class="ok">Day closed at ${esc(new Date(day.closedAt).toTimeString().slice(0, 5))}. Rest.</p>${btn('Reopen day', 'reopen-day', {}, 'ghost xs')}` : `
        <ul class="checks">${shutdownChecks.map(([ok, label]) => `<li class="${ok ? 'ok' : ''}"><i>${ok ? '✓' : '○'}</i>${esc(label)}</li>`).join('')}
        <li><i>○</i>Tomorrow: ${tomorrowFixed.length ? esc(tomorrowFixed.map((r) => `${r.start || ''} ${r.title}`.trim()).join(', ')) : 'no fixed commitments'}</li></ul>
        ${openToday.length ? btn(`Move ${openToday.length} open to tomorrow`, 'carry-tomorrow', {}, 'ghost sm') : ''}
        ${btn('Close the day', 'close-day', {}, 'primary sm')}`}
      </section>
    </aside>
  </div>`;
}

export function toggleNextList() {
  expandedNext.on = !expandedNext.on;
}

