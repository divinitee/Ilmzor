// Goals: the cascade from mission to next action, as drill-down columns.

import { store } from '../store.js';
import { ui } from '../ui.js';
import * as M from '../model.js';
import { HORIZON } from '../schema.js';
import { esc } from '../util.js';
import { bar, createBtn, dueChip } from '../ui/fields.js';

const COLS = [
  { id: 'direction', label: 'Direction', sub: 'long-term & 3-year goals', match: (x) => x.type === 'goal', create: 'goal' },
  { id: 'year', label: 'Annual', sub: 'objectives', match: (x) => x.type === 'objective' && x.horizon === 'year', create: 'objective' },
  { id: 'quarter', label: 'Quarterly', sub: 'objectives', match: (x) => x.type === 'objective' && x.horizon === 'quarter', create: 'objective' },
  { id: 'month', label: 'Monthly', sub: 'targets', match: (x) => x.type === 'objective' && x.horizon === 'month', create: 'objective' },
  { id: 'week', label: 'Weekly', sub: 'outcomes', match: (x) => x.type === 'objective' && x.horizon === 'week', create: 'objective' },
  { id: 'projects', label: 'Projects', sub: 'that drive them', match: (x) => x.type === 'project', create: 'project' },
  { id: 'actions', label: 'Next actions', sub: 'what to do', match: (x) => x.type === 'task' && x.isNext, create: 'task' },
];

function ancestorsOf(x) {
  const out = new Set();
  const seen = new Set();
  let cur = x;
  // Walk both the "why" chain and a project's objective link.
  const stack = [x];
  while (stack.length) {
    cur = stack.pop();
    if (!cur || seen.has(cur.id)) continue;
    seen.add(cur.id);
    out.add(cur.id);
    const pid = M.whyParentId(cur);
    if (pid) stack.push(store.get(pid));
    if (cur.type === 'project' && cur.objectiveId) stack.push(store.get(cur.objectiveId));
    if (cur.type === 'task' && cur.objectiveId) stack.push(store.get(cur.objectiveId));
  }
  return out;
}

export function renderGoals() {
  const path = ui.goalsPath || {};
  const showClosed = false;
  const pool = [...store.data.goals, ...store.data.objectives, ...store.data.projects, ...store.data.tasks].filter((x) => showClosed || M.isOpen(x));
  const cols = COLS.map((c, i) => {
    // The deepest selection in any column to the left filters this one.
    let anchor = null;
    for (let j = i - 1; j >= 0; j--) if (path[COLS[j].id] && store.get(path[COLS[j].id])) { anchor = path[COLS[j].id]; break; }
    let items = pool.filter(c.match);
    if (anchor) items = items.filter((x) => ancestorsOf(x).has(anchor));
    if (c.id === 'projects' && !anchor) items = items.filter(M.isActiveProject);
    return { ...c, items, anchor };
  });
  const m = store.data.mission;
  const column = (c) => {
    const anchorItem = store.get(c.anchor);
    const defaults = {};
    if (anchorItem) {
      if (c.create === 'objective') { defaults.parentId = anchorItem.type === 'goal' || anchorItem.type === 'objective' ? anchorItem.id : null; defaults.horizon = c.id; }
      if (c.create === 'project') { if (anchorItem.type === 'objective' || anchorItem.type === 'goal') defaults.objectiveId = anchorItem.id; else if (anchorItem.type === 'project') defaults.parentId = anchorItem.id; defaults.areaId = M.areaIdOf(anchorItem); }
      if (c.create === 'task' && anchorItem.type === 'project') defaults.projectId = anchorItem.id;
    } else if (c.create === 'objective') defaults.horizon = c.id;
    return `<div class="gcol ${c.items.length ? '' : 'is-empty'}">
      <div class="gcol-h"><b>${c.label}</b><em>${c.sub}</em><span>${c.items.length}</span></div>
      <div class="gcol-list">
        ${c.items.map((x) => {
          const on = path[c.id] === x.id;
          const f = x.type === 'project' ? M.projectFlags(x) : null;
          return `<button class="gcard ${on ? 'on' : ''} t-${x.type}" data-act="goal-pick" data-col="${c.id}" data-id="${esc(x.id)}" style="--c:${esc(M.colorOf(x))}">
            <span class="gcard-t"><i class="adot" style="--c:${esc(M.colorOf(x))}"></i>${esc(x.title)}</span>
            <span class="gcard-m">${x.type === 'goal' ? `<em>${esc(HORIZON[x.horizon]?.label || '')}</em>` : ''}${M.areaOf(x) ? `<em>${esc(M.areaOf(x).title)}</em>` : ''}${x.deadline ? dueChip(x.deadline) : ''}${f && f.noNext ? '<em class="warn">⚠ no next action</em>' : ''}${f && f.blocked ? '<em class="bad">blocked</em>' : ''}${x.type === 'task' ? `<em>${esc(M.titleOf(x.projectId))}</em>` : ''}</span>
            ${x.type !== 'task' ? bar(M.progress(x)) : ''}
          </button>`;
        }).join('')}
        ${!c.items.length ? `<p class="gempty">${anchorItem ? `Nothing ${c.label.toLowerCase()} under <b>${esc(anchorItem.title)}</b> yet.` : `No ${c.label.toLowerCase()} ${c.sub} yet.`}</p>` : ''}
        ${createBtn(`+ ${c.create === 'task' ? 'Action' : c.create === 'objective' ? c.label + ' ' + (c.sub === 'objectives' ? 'objective' : c.sub.replace(/s$/, '')) : c.create === 'goal' ? 'Goal' : 'Project'}`, c.create, defaults, 'ghost sm add')}
      </div>
    </div>`;
  };
  return `
  <header class="vhead">
    <div><div class="eyebrow">Goals</div><h1>From mission to next action</h1><p class="lede">Select anything to see only what supports it, all the way down to the next action.</p></div>
    <div class="vhead-actions">${Object.keys(path).length ? '<button class="btn ghost sm" data-act="goal-clear">Clear selection</button>' : ''}</div>
  </header>
  <button class="mission-strip" data-act="select" data-id="mission"><em>Mission</em><span>${esc(m.statement || 'Define your mission →')}</span>${m.vision ? `<small>${esc(m.vision)}</small>` : ''}</button>
  <div class="gcols" data-scroll>${cols.map(column).join('<i class="gsep">›</i>')}</div>`;
}
