// This week: outcomes, capacity, deadlines, projects, what's stuck.

import { store } from '../store.js';
import * as M from '../model.js';
import { esc, fmtDate, fmtHours, weekNumber, plural } from '../util.js';
import { row, btn, empty, dueChip } from '../ui/fields.js';
import { projectRow } from '../ui/inspector.js';

export function renderWeek() {
  const w = M.weekPlan();
  const t = M.timeSummary();
  const rv = M.reviewStatus();
  const byArea = new Map();
  for (const p of w.projects) {
    const a = M.areaIdOf(p) || 'none';
    if (!byArea.has(a)) byArea.set(a, []);
    byArea.get(a).push(p);
  }
  const areasOrdered = [...store.data.areas.map((a) => a.id), 'none'].filter((id) => byArea.has(id));
  const pct = (h) => (t.available ? Math.min(100, (100 * h) / Math.max(t.available, t.allocated)) : 0);

  return `
  <header class="vhead">
    <div><div class="eyebrow">Week ${weekNumber(w.ws)} · ${esc(fmtDate(w.ws))} – ${esc(fmtDate(w.we))}</div><h1>This week</h1>
      <p class="lede">${w.outcomes.length ? `${plural(w.outcomes.length, 'outcome')} · ` : ''}${plural(w.projects.length, 'active project')} · ${plural(w.deadlines.length, 'deadline')}${w.blocked.length ? ` · <span class="bad">${w.blocked.length} blocked</span>` : ''}</p></div>
    <div class="vhead-actions">${rv.due ? btn(rv.last ? `Weekly review · ${rv.days}d since last` : 'Run your first weekly review', 'open-view', { view: 'review' }, 'primary sm') : btn('Review done ✓', 'open-view', { view: 'review' }, 'ghost sm')}</div>
  </header>
  <div class="cols">
    <div class="col-main">
      <section class="blk"><h3>Weekly outcomes <small>what this week is for</small></h3>
        ${w.outcomes.length ? `<div class="outcomes">${w.outcomes.map((o) => `<div class="outcome ${M.isDone(o) ? 'done' : ''}"><button class="cbox ${M.isDone(o) ? 'on' : ''}" data-act="complete" data-id="${esc(o.id)}">${M.isDone(o) ? '✓' : ''}</button><div data-act="select" data-id="${esc(o.id)}"><b>${esc(o.title)}</b><em>${esc(M.pathLabel(o))}</em></div></div>`).join('')}</div>`
          : empty('No outcomes set for this week', 'The weekly review turns your goals into 3–5 concrete outcomes.', btn('Start weekly review', 'open-view', { view: 'review' }, 'primary sm'))}
      </section>
      <section class="blk"><h3>Deadlines <small>overdue and this week</small></h3>
        ${w.deadlines.length ? `<div class="rows">${w.deadlines.map((d) => row(d.item, { meta: dueChip(d.date, { label: d.what }) })).join('')}</div>` : '<p class="muted sm">No deadlines this week.</p>'}
      </section>
      <section class="blk"><h3>Active projects <small>grouped by domain</small></h3>
        ${areasOrdered.length ? areasOrdered.map((aid) => {
          const a = store.get(aid);
          return `<div class="group"><div class="group-h">${a ? `<span class="adot" style="--c:${esc(a.color)}"></span>${esc(a.title)}` : 'No domain'}</div><div class="rows">${byArea.get(aid).map(projectRow).join('')}</div></div>`;
        }).join('') : empty('No active projects', '', btn('+ Project', 'create', { type: 'project' }, 'sm'))}
      </section>
    </div>
    <aside class="col-side">
      <section class="blk"><h3>Capacity</h3>
        <button class="capmini ${t.over ? 'over' : ''}" data-act="open-view" data-view="capacity">
          <div class="capmini-bar"><i style="width:${pct(t.allocated)}%"></i></div>
          <div class="capmini-n"><span>${fmtHours(t.allocated)} allocated</span><span>${fmtHours(t.available)} available</span></div>
          <b>${t.over ? `Overallocated by ${fmtHours(t.overBy)}` : `${fmtHours(t.unallocated)} unallocated`}</b>
          ${t.overAreas.length ? `<em>${t.overAreas.map((o) => esc(M.titleOf(o.areaId))).join(', ')} over budget</em>` : ''}
        </button>
      </section>
      ${w.blocked.length ? `<section class="blk"><h3>Blocked</h3><div class="rows">${w.blocked.map((x) => row(x, { sub: M.blockersOf(x.id).length ? `blocked by ${esc(M.blockersOf(x.id).map((b) => b.title).join(', '))}` : 'status: blocked' })).join('')}</div></section>` : ''}
      <section class="blk"><h3>Unfinished <small>planned, still open</small></h3>
        ${w.unfinished.length ? `<div class="rows">${w.unfinished.map((x) => row(x, { actions: btn('Today', 'plan', { id: x.id, when: 'today', prio: 'must' }, 'ghost xs') })).join('')}</div>` : '<p class="muted sm">Nothing carried over.</p>'}
      </section>
      <section class="blk"><h3>Follow-ups this week</h3>
        ${w.waiting.length ? `<div class="rows">${w.waiting.map((x) => row(x, { meta: dueChip(x.followUpAt) })).join('')}</div>` : '<p class="muted sm">None scheduled.</p>'}
      </section>
      <section class="blk"><h3>Inbox <small>captured, not yet placed</small></h3>
        ${w.inbox.length ? `<div class="rows">${w.inbox.map((x) => row(x, { path: false, actions: btn('Place…', 'edit-parent', { id: x.id }, 'ghost xs') })).join('')}</div>` : '<p class="muted sm">Inbox zero.</p>'}
      </section>
    </aside>
  </div>`;
}

