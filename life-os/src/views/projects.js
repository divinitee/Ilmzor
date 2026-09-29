// Projects: status-grouped, with the next action (or its absence) front and centre.

import { store } from '../store.js';
import { ui } from '../ui.js';
import * as M from '../model.js';
import { esc, fmtHours } from '../util.js';
import { empty, dueChip, bar, createBtn, quickAdd } from '../ui/fields.js';

const GROUPS = [
  ['active', 'Active'], ['blocked', 'Blocked'], ['waiting', 'Waiting'], ['not_started', 'Not started'], ['complete', 'Complete'], ['archived', 'Archived'],
];

export function renderProjects() {
  const areaF = ui.projectArea || 'all';
  const showClosed = !!ui.projectShowClosed;
  const all = store.data.projects.filter((p) => areaF === 'all' || M.areaIdOf(p) === areaF);
  const flagged = all.filter((p) => M.isActiveProject(p) && M.projectFlags(p).noNext);
  const alloc = new Map(store.data.allocations.filter((a) => a.resourceId === 'rc_time').map((a) => [a.targetId, a.amount]));

  const card = (p) => {
    const f = M.projectFlags(p);
    const a = M.areaOf(p);
    const effStatus = f.blocked && p.status !== 'blocked' ? 'blocked' : p.status;
    return `<article class="pcard ${f.noNext ? 'flag' : ''} ${f.blocked ? 'blocked' : ''}" style="--c:${esc(M.colorOf(p))}">
      <div class="pcard-h" data-act="select" data-id="${esc(p.id)}">
        <b>${esc(p.title)}</b>
        <span class="pcard-meta">${a ? `<em><i class="adot" style="--c:${esc(a.color)}"></i>${esc(a.title)}</em>` : ''}${p.deadline ? dueChip(p.deadline) : ''}${alloc.get(p.id) ? `<em>${fmtHours(alloc.get(p.id))}/wk</em>` : ''}${p.priority === 'high' ? '<em class="hi">high</em>' : ''}</span>
      </div>
      ${p.desired ? `<p class="pcard-out">${esc(p.desired)}</p>` : `<p class="pcard-out muted">No outcome defined.</p>`}
      ${f.next ? `<div class="pcard-next"><button class="cbox next" data-act="complete" data-id="${esc(f.next.id)}"></button><span data-act="select" data-id="${esc(f.next.id)}">→ ${esc(f.next.title)}</span></div>`
        : f.noNext ? `<div class="pcard-next missing">${quickAdd('task', { projectId: p.id, isNext: true }, '⚠ No next action — type one, Enter')}</div>`
          : f.blocked ? `<div class="pcard-next bad">⛔ Blocked by ${esc(M.blockersOf(p.id).map((b) => b.title).join(', ') || 'status')}</div>` : f.waiting ? '<div class="pcard-next warn">⧗ Waiting on someone</div>' : ''}
      <div class="pcard-foot">${bar(M.progress(p))}<span>${Math.round(M.progress(p) * 100)}%</span>${effStatus !== p.status ? '<em class="bad">has blocker</em>' : ''}</div>
    </article>`;
  };

  const groups = GROUPS.filter(([k]) => showClosed || (k !== 'complete' && k !== 'archived'))
    .map(([k, label]) => [k, label, all.filter((p) => p.status === k)])
    .filter(([, , list]) => list.length);

  return `
  <header class="vhead">
    <div><div class="eyebrow">Projects</div><h1>Finite efforts, each with a next action</h1>
      <p class="lede">${all.filter(M.isActiveProject).length} active${flagged.length ? ` · <span class="warn">${flagged.length} without a next action</span>` : ''}</p></div>
    <div class="vhead-actions">${createBtn('+ Project', 'project', areaF !== 'all' ? { areaId: areaF } : {}, 'primary sm')}</div>
  </header>
  <div class="filters">
    <button class="fchip ${areaF === 'all' ? 'on' : ''}" data-act="proj-area" data-area="all">All</button>
    ${store.data.areas.map((a) => `<button class="fchip ${areaF === a.id ? 'on' : ''}" data-act="proj-area" data-area="${esc(a.id)}"><i class="adot" style="--c:${esc(a.color)}"></i>${esc(a.title)}</button>`).join('')}
    <span class="grow"></span>
    <label class="toggle"><input type="checkbox" data-act="proj-closed" ${showClosed ? 'checked' : ''}> Show complete & archived</label>
  </div>
  ${groups.length ? groups.map(([k, label, list]) => `<section class="pgroup"><h3><span class="schip st-${k}">${label}</span><small>${list.length}</small></h3><div class="pgrid">${list.map(card).join('')}</div></section>`).join('')
    : empty('No projects here yet', 'A project is a finite effort with an outcome. Give each one a next physical action.', createBtn('Create a project', 'project', areaF !== 'all' ? { areaId: areaF } : {}, 'primary sm'))}`;
}

