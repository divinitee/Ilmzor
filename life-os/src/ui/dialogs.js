// Modal dialogs: create, relationship, confirm, picker. One modal at a time.

import { store } from '../store.js';
import * as M from '../model.js';
import { TYPES, HORIZONS, HORIZON, REL_TYPES, AREA_COLORS } from '../schema.js';
import { esc, today, addDays, weekStart, DOW_SHORT } from '../util.js';

let current = null;

export function openModal(html, { onMount, onClose, wide = false } = {}) {
  closeModal();
  const host = document.createElement('div');
  host.className = 'modal';
  host.innerHTML = `<div class="dialog ${wide ? 'wide' : ''}" role="dialog" aria-modal="true">${html}</div>`;
  document.body.appendChild(host);
  requestAnimationFrame(() => host.classList.add('open'));
  const close = () => {
    if (current !== ctl) return;
    current = null;
    host.classList.remove('open');
    setTimeout(() => host.remove(), 180);
    onClose && onClose();
  };
  const ctl = { host, close };
  current = ctl;
  host.addEventListener('pointerdown', (e) => { if (e.target === host) close(); });
  host.addEventListener('keydown', (e) => { if (e.key === 'Escape') { e.stopPropagation(); close(); } });
  onMount && onMount(host.querySelector('.dialog'), close);
  const first = host.querySelector('[autofocus]') || host.querySelector('input,select,textarea,button');
  if (first) { first.focus(); setTimeout(() => { if (!host.contains(document.activeElement)) first.focus(); }, 30); }
  return ctl;
}

export function closeModal() {
  if (current) current.close();
}
export const modalOpen = () => !!current;

// ---------- option lists ----------

const areaOpts = () => store.data.areas.map((a) => [a.id, a.title]);
const directionOpts = () => [
  ...store.data.goals.filter(M.isOpen).map((g) => [g.id, `${HORIZON[g.horizon] ? HORIZON[g.horizon].short : ''} · ${g.title}`]),
  ...store.data.objectives.filter(M.isOpen).sort((a, b) => (HORIZON[a.horizon]?.rank || 0) - (HORIZON[b.horizon]?.rank || 0)).map((o) => [o.id, `${HORIZON[o.horizon] ? HORIZON[o.horizon].short : ''} · ${o.title}`]),
];
const projectOpts = () => store.data.projects.filter(M.isOpen).map((p) => [p.id, `${M.areaOf(p) ? M.areaOf(p).title + ' · ' : ''}${p.title}`]);
const opt = (list, value, empty) => (empty !== undefined ? `<option value="">${esc(empty)}</option>` : '') + list.map(([v, l]) => `<option value="${esc(v)}" ${v === value ? 'selected' : ''}>${esc(l)}</option>`).join('');

const TYPE_GROUPS = [
  ['Direction', ['goal', 'objective']],
  ['Execution', ['project', 'task', 'waiting']],
  ['Systems', ['area', 'responsibility', 'habit']],
  ['Context', ['constraint', 'person']],
];

const PLACEHOLDER = {
  goal: 'e.g. Enter the Finance industry', objective: 'e.g. Obtain first relevant Finance role', project: 'e.g. Finance CV',
  task: 'e.g. Rewrite CV experience section', waiting: 'What are you waiting for?', area: 'e.g. Health', responsibility: 'e.g. Teach B1 class',
  habit: 'e.g. Train', constraint: 'e.g. Weekday evenings are fixed', person: 'Name',
};
const HINT = {
  goal: 'An outcome you want in your life. Not a to-do.', objective: 'A time-boxed result that moves a goal forward.',
  project: 'A finite effort with a clear outcome and a next action.', task: 'One visible, physical step you can do in one sitting.',
  waiting: 'An open loop someone else owns. You own the follow-up.', area: 'A domain of life you keep running.',
  responsibility: 'Recurring, fixed commitment. It consumes capacity every week.', habit: 'A repeated behaviour you track by week.',
  constraint: 'A hard or soft limit that shapes decisions.', person: 'Someone you wait on or work with.',
};

function lowerHorizon(parentId) {
  const p = store.get(parentId);
  if (!p || !HORIZON[p.horizon]) return 'year';
  const idx = HORIZONS.findIndex((h) => h.id === p.horizon);
  const next = HORIZONS.slice(idx + 1).find((h) => h.kind === 'objective');
  return next ? next.id : 'week';
}

function formFor(type, d) {
  const f = [];
  const title = `<label class="fld wide"><span>${type === 'task' ? 'Next physical action' : type === 'person' ? 'Name' : 'Title'}</span><input name="title" autofocus required placeholder="${esc(PLACEHOLDER[type] || '')}" value="${esc(d.title || '')}"></label>`;
  f.push(title);
  switch (type) {
    case 'goal':
      f.push(`<label class="fld"><span>Domain</span><select name="areaId">${opt(areaOpts(), d.areaId, 'None (directly under mission)')}</select></label>`);
      f.push(`<label class="fld"><span>Horizon</span><select name="horizon">${opt(HORIZONS.filter((h) => h.kind === 'goal').map((h) => [h.id, h.label]), d.horizon || '3y')}</select></label>`);
      f.push(`<label class="fld wide"><span>Desired state · what does success look like?</span><input name="desired" value="${esc(d.desired || '')}"></label>`);
      break;
    case 'objective': {
      const parent = d.parentId || '';
      f.push(`<label class="fld wide"><span>Supports</span><select name="parentId">${opt(directionOpts(), parent, 'Choose a goal or objective…')}</select></label>`);
      f.push(`<label class="fld"><span>Horizon</span><select name="horizon">${opt(HORIZONS.filter((h) => h.kind === 'objective').map((h) => [h.id, h.label]), d.horizon || lowerHorizon(parent))}</select></label>`);
      f.push(`<label class="fld"><span>Deadline</span><input type="date" name="deadline" value="${esc(d.deadline || '')}"></label>`);
      f.push(`<label class="fld wide"><span>Desired state</span><input name="desired" value="${esc(d.desired || '')}"></label>`);
      break;
    }
    case 'project':
      f.push(`<label class="fld"><span>Domain</span><select name="areaId">${opt(areaOpts(), d.areaId || (M.areaOf(store.get(d.objectiveId || d.parentId)) || {}).id, 'Choose…')}</select></label>`);
      f.push(`<label class="fld"><span>Serves objective</span><select name="objectiveId">${opt(directionOpts(), d.objectiveId, 'None yet')}</select></label>`);
      f.push(`<label class="fld"><span>Sub-project of</span><select name="parentId">${opt(projectOpts(), d.parentId, 'None')}</select></label>`);
      f.push(`<label class="fld"><span>Deadline</span><input type="date" name="deadline" value="${esc(d.deadline || '')}"></label>`);
      f.push(`<label class="fld wide"><span>Outcome · done looks like</span><input name="desired" value="${esc(d.desired || '')}"></label>`);
      f.push(`<label class="fld wide"><span>First next action <em>optional</em></span><input name="nextAction" placeholder="The very next physical step"></label>`);
      break;
    case 'task': {
      const hasNext = d.projectId && M.nextActionOf(d.projectId);
      f.push(`<label class="fld"><span>Project</span><select name="projectId">${opt(projectOpts(), d.projectId, 'No project')}</select></label>`);
      f.push(`<label class="fld"><span>Domain <em>if no project</em></span><select name="areaId">${opt(areaOpts(), d.areaId, 'Inbox (unsorted)')}</select></label>`);
      f.push(`<label class="fld"><span>Due</span><input type="date" name="due" value="${esc(d.due || '')}"></label>`);
      f.push(`<label class="fld"><span>Estimate (hours)</span><input type="number" step="0.25" min="0" name="estimate" value="${esc(d.estimate || '')}"></label>`);
      f.push(`<label class="chk wide"><input type="checkbox" name="isNext" ${d.isNext === false ? '' : hasNext ? '' : 'checked'}> This is the project's <b>next action</b></label>`);
      f.push(`<label class="chk wide"><input type="checkbox" name="today" ${d.plannedFor ? 'checked' : ''}> Put it on <b>Today</b></label>`);
      break;
    }
    case 'waiting':
      f.push(`<label class="fld"><span>Waiting on</span><input name="who" placeholder="Person or organisation" value="${esc(d.who || '')}"></label>`);
      f.push(`<label class="fld"><span>Related project</span><select name="projectId">${opt(projectOpts(), d.projectId, 'None')}</select></label>`);
      f.push(`<label class="fld"><span>Expected by</span><input type="date" name="expectedAt" value="${esc(d.expectedAt || '')}"></label>`);
      f.push(`<label class="fld"><span>Follow up on</span><input type="date" name="followUpAt" value="${esc(d.followUpAt || addDays(today(), 3))}"></label>`);
      f.push(`<label class="fld wide"><span>Next follow-up action</span><input name="followUpAction" placeholder="e.g. Email to ask for an ETA" value="${esc(d.followUpAction || '')}"></label>`);
      break;
    case 'area': {
      const used = new Set(store.data.areas.map((a) => a.color));
      const pick = d.color || AREA_COLORS.find((c) => !used.has(c)) || AREA_COLORS[0];
      f.push(`<label class="fld wide"><span>Why this domain matters</span><input name="why" value="${esc(d.why || '')}"></label>`);
      f.push(`<label class="fld wide"><span>Desired state</span><input name="desired" value="${esc(d.desired || '')}"></label>`);
      f.push(`<div class="fld wide"><span>Colour</span><div class="swatches">${AREA_COLORS.map((c) => `<label class="sw" style="--c:${c}"><input type="radio" name="color" value="${c}" ${c === pick ? 'checked' : ''}><i></i></label>`).join('')}</div></div>`);
      break;
    }
    case 'responsibility':
      f.push(`<label class="fld"><span>Domain</span><select name="areaId">${opt(areaOpts(), d.areaId, 'Choose…')}</select></label>`);
      f.push(`<label class="fld"><span>Start time</span><input type="time" name="start" value="${esc(d.start || '')}"></label>`);
      f.push(`<div class="fld wide"><span>Days</span><div class="days">${DOW_SHORT.map((l, i) => `<label class="day"><input type="checkbox" name="day" value="${i + 1}"><i>${l}</i></label>`).join('')}</div></div>`);
      f.push(`<label class="fld"><span>Hours each time</span><input type="number" step="0.25" min="0" name="duration" value="${esc(d.duration || 1)}"></label>`);
      f.push(`<label class="fld"><span>…or hours per week</span><input type="number" step="0.5" min="0" name="hoursPerWeek" placeholder="if no fixed days" value="${esc(d.hoursPerWeek || '')}"></label>`);
      break;
    case 'habit':
      f.push(`<label class="fld"><span>Domain</span><select name="areaId">${opt(areaOpts(), d.areaId, 'Choose…')}</select></label>`);
      f.push(`<label class="fld"><span>Times per week</span><input type="number" min="1" max="7" name="targetPerWeek" value="${esc(d.targetPerWeek || 3)}"></label>`);
      break;
    case 'constraint':
      f.push(`<label class="fld"><span>Domain</span><select name="areaId">${opt(areaOpts(), d.areaId, 'None')}</select></label>`);
      f.push(`<label class="fld"><span>Resource</span><select name="resourceId">${opt(store.data.resources.map((r) => [r.id, r.title]), d.resourceId, 'None')}</select></label>`);
      f.push(`<label class="fld"><span>Severity</span><select name="severity">${opt([['hard', 'Hard limit'], ['soft', 'Soft limit']], d.severity || 'hard')}</select></label>`);
      f.push(`<label class="fld wide"><span>Description</span><input name="description" value="${esc(d.description || '')}"></label>`);
      break;
    case 'person':
      f.push(`<label class="fld"><span>Role</span><input name="role" value="${esc(d.role || '')}"></label>`);
      break;
  }
  return f.join('');
}

export function openCreate(type = 'task', defaults = {}, onCreated) {
  let cur = type;
  const html = `
    <header class="dlg-head"><div><div class="eyebrow">Create</div><h2>New <span class="dlg-type"></span></h2></div><button class="x" data-close>×</button></header>
    <div class="type-grid">${TYPE_GROUPS.map(([g, ts]) => `<div class="tg"><em>${g}</em>${ts.map((t) => `<button type="button" data-type="${t}" class="tbtn fam-${TYPES[t].family}"><i>${TYPES[t].glyph}</i>${TYPES[t].label}</button>`).join('')}</div>`).join('')}</div>
    <p class="dlg-hint"></p>
    <form class="dlg-form"><div class="grid2"></div><footer class="dlg-foot"><span class="kbd-hint">Enter to create · Esc to cancel</span><button type="button" class="btn ghost" data-close>Cancel</button><button type="submit" class="btn primary">Create</button></footer></form>`;
  openModal(html, {
    onMount(dlg, close) {
      const form = dlg.querySelector('form');
      const draw = () => {
        dlg.querySelectorAll('.tbtn').forEach((b) => b.classList.toggle('on', b.dataset.type === cur));
        dlg.querySelector('.dlg-type').textContent = TYPES[cur].label.toLowerCase();
        dlg.querySelector('.dlg-hint').textContent = HINT[cur] || '';
        form.querySelector('.grid2').innerHTML = formFor(cur, defaults);
        setTimeout(() => { const t = form.querySelector('[name=title]'); t && t.focus(); }, 10);
        if (cur === 'objective') {
          const ps = form.querySelector('[name=parentId]');
          ps.onchange = () => { form.querySelector('[name=horizon]').value = lowerHorizon(ps.value); };
        }
        if (cur === 'task') {
          const ps = form.querySelector('[name=projectId]');
          ps.onchange = () => { form.querySelector('[name=isNext]').checked = !!ps.value && !M.nextActionOf(ps.value); };
        }
      };
      dlg.querySelectorAll('.tbtn').forEach((b) => (b.onclick = () => {
        const t = form.querySelector('[name=title]');
        if (t && t.value) defaults = { ...defaults, title: t.value };
        cur = b.dataset.type; draw();
      }));
      dlg.querySelectorAll('[data-close]').forEach((b) => (b.onclick = close));
      draw();
      form.onsubmit = (e) => {
        e.preventDefault();
        const fd = new FormData(form);
        const title = String(fd.get('title') || '').trim();
        if (!title) { form.querySelector('[name=title]').focus(); return; }
        const item = createFromForm(cur, fd, defaults);
        close();
        onCreated && onCreated(item);
      };
    },
  });
}

function createFromForm(type, fd, defaults) {
  const g = (k) => { const v = fd.get(k); return v === null ? undefined : String(v).trim(); };
  const base = { title: g('title') };
  let item;
  switch (type) {
    case 'goal': item = store.create('goal', { ...base, areaId: g('areaId') || null, horizon: g('horizon') || '3y', desired: g('desired') || '', parentId: defaults.parentId || null }); break;
    case 'objective': {
      const parentId = g('parentId') || null;
      const horizon = g('horizon') || 'quarter';
      item = store.create('objective', { ...base, parentId, horizon, deadline: g('deadline') || '', desired: g('desired') || '', areaId: parentId ? null : defaults.areaId || null, weekOf: horizon === 'week' ? weekStart() : null });
      break;
    }
    case 'project': {
      item = store.create('project', { ...base, areaId: g('areaId') || null, objectiveId: g('objectiveId') || null, parentId: g('parentId') || null, deadline: g('deadline') || '', desired: g('desired') || '' }, { silent: !!g('nextAction') });
      if (g('nextAction')) store.create('task', { title: g('nextAction'), projectId: item.id, isNext: true });
      break;
    }
    case 'task': {
      const projectId = g('projectId') || null;
      const isNext = fd.get('isNext') === 'on';
      if (isNext && projectId) for (const t of M.openTasksOf(projectId)) if (t.isNext) t.isNext = false;
      item = store.create('task', { ...base, projectId, areaId: projectId ? null : g('areaId') || null, due: g('due') || '', estimate: g('estimate') ? Number(g('estimate')) : null, isNext, plannedFor: fd.get('today') === 'on' ? today() : null, plannedPriority: fd.get('today') === 'on' ? 'must' : null, objectiveId: defaults.objectiveId || null });
      break;
    }
    case 'waiting': item = store.create('waiting', { ...base, who: g('who') || '', projectId: g('projectId') || null, areaId: defaults.areaId || null, expectedAt: g('expectedAt') || '', followUpAt: g('followUpAt') || '', followUpAction: g('followUpAction') || '' }); break;
    case 'area': item = store.create('area', { ...base, why: g('why') || '', desired: g('desired') || '', color: g('color') || AREA_COLORS[store.data.areas.length % AREA_COLORS.length] }); break;
    case 'responsibility': item = store.create('responsibility', { ...base, areaId: g('areaId') || null, start: g('start') || '', days: fd.getAll('day').map(Number), duration: Number(g('duration')) || 1, hoursPerWeek: g('hoursPerWeek') ? Number(g('hoursPerWeek')) : null }); break;
    case 'habit': item = store.create('habit', { ...base, areaId: g('areaId') || null, targetPerWeek: Number(g('targetPerWeek')) || 3 }); break;
    case 'constraint': item = store.create('constraint', { ...base, areaId: g('areaId') || null, resourceId: g('resourceId') || null, severity: g('severity') || 'hard', description: g('description') || '' }); break;
    case 'person': item = store.create('person', { ...base, role: g('role') || '' }); break;
  }
  return item;
}

// ---------- relationship ----------

const LINKABLE = ['area', 'resource', 'goal', 'objective', 'project', 'task', 'waiting', 'habit', 'responsibility', 'constraint', 'person'];

function linkOptions(exclude) {
  const groups = [['area', 'Domains'], ['resource', 'Resources'], ['goal', 'Goals'], ['objective', 'Objectives'], ['project', 'Projects'], ['task', 'Actions'], ['waiting', 'Waiting'], ['constraint', 'Constraints'], ['habit', 'Habits'], ['responsibility', 'Responsibilities'], ['person', 'People']];
  return groups.map(([t, label]) => {
    const items = store.list(t).filter((x) => x.id !== exclude && M.isOpen(x));
    if (!items.length) return '';
    return `<optgroup label="${label}">${items.map((x) => `<option value="${esc(x.id)}">${esc(x.title)}</option>`).join('')}</optgroup>`;
  }).join('');
}

export function openRelationship({ from, to = '', kind = null, rel = null } = {}, onSaved) {
  const editing = !!rel;
  let a = rel ? rel.from : from;
  let b = rel ? rel.to : to;
  let k = rel ? rel.kind : kind || guessKind(a, b);
  let touched = editing && !!rel.note;
  const html = `
    <header class="dlg-head"><div><div class="eyebrow">${editing ? 'Edit relationship' : 'New relationship'}</div><h2 class="rel-title"></h2></div><button class="x" data-close>×</button></header>
    <form class="dlg-form">
      <div class="rel-ends">
        <label class="fld"><span>From · upstream</span><select name="from">${linkOptions(null)}</select></label>
        <button type="button" class="btn ghost swap" title="Swap direction">⇄</button>
        <label class="fld"><span>To · downstream</span><select name="to"><option value="">Choose…</option>${linkOptions(null)}</select></label>
      </div>
      <div class="rel-kinds">${Object.entries(REL_TYPES).map(([key, r]) => `<label class="rk f-${r.family}"><input type="radio" name="kind" value="${key}"><b>${esc(r.label)}</b><em>${esc(r.category)}</em></label>`).join('')}</div>
      <label class="fld wide"><span>Explanation · why does this relationship exist?</span><textarea name="note" rows="2"></textarea></label>
      <footer class="dlg-foot">${editing ? '<button type="button" class="btn danger ghost" data-del>Delete</button>' : ''}<span class="grow"></span><button type="button" class="btn ghost" data-close>Cancel</button><button type="submit" class="btn primary">${editing ? 'Save' : 'Create relationship'}</button></footer>
    </form>`;
  openModal(html, {
    wide: true,
    onMount(dlg, close) {
      const form = dlg.querySelector('form');
      const fs = form.from, ts = form.to, note = form.note;
      fs.value = a || '';
      ts.value = b || '';
      const sync = () => {
        a = fs.value; b = ts.value;
        form.querySelectorAll('[name=kind]').forEach((r) => (r.checked = r.value === k));
        const def = REL_TYPES[k];
        dlg.querySelector('.rel-title').innerHTML = `${esc(M.titleOf(a) || '…')} <em class="verb f-${def.family}">${esc(def.verb)}</em> ${esc(M.titleOf(b) || '…')}`;
        if (!touched) note.value = a && b ? def.template(M.titleOf(a), M.titleOf(b)) : '';
      };
      fs.onchange = () => { a = fs.value; if (!rel) k = guessKind(a, ts.value); sync(); };
      ts.onchange = () => { b = ts.value; if (!rel) k = guessKind(fs.value, b); sync(); };
      form.querySelectorAll('[name=kind]').forEach((r) => (r.onchange = () => { k = r.value; sync(); }));
      note.oninput = () => { touched = true; };
      dlg.querySelector('.swap').onclick = () => { const t = fs.value; fs.value = ts.value; ts.value = t; sync(); };
      dlg.querySelectorAll('[data-close]').forEach((x) => (x.onclick = close));
      const del = dlg.querySelector('[data-del]');
      if (del) del.onclick = () => { store.removeMany([rel.id]); close(); onSaved && onSaved(null); };
      sync();
      form.onsubmit = (e) => {
        e.preventDefault();
        if (!fs.value || !ts.value || fs.value === ts.value) { ts.focus(); return; }
        const payload = { from: fs.value, to: ts.value, kind: k, note: note.value.trim() };
        const saved = rel ? store.update(rel.id, payload) : store.create('relationship', payload);
        close();
        onSaved && onSaved(saved);
      };
    },
  });
}

function guessKind(a, b) {
  const A = store.get(a), B = store.get(b);
  if (!A || !B) return 'supports';
  if (A.type === 'resource') return 'requires';
  if (B.type === 'resource') return 'produces';
  if (A.type === 'constraint') return 'constrains';
  if ((A.type === 'task' || A.type === 'project') && (B.type === 'task' || B.type === 'project')) return 'blocks';
  return 'supports';
}

// ---------- confirm & picker ----------

export function confirmDialog({ title, body = '', confirm = 'Confirm', danger = false }) {
  return new Promise((resolve) => {
    let answered = false;
    openModal(`
      <header class="dlg-head"><div><h2>${esc(title)}</h2></div></header>
      ${body ? `<p class="dlg-body">${body}</p>` : ''}
      <footer class="dlg-foot"><span class="grow"></span><button type="button" class="btn ghost" data-no>Cancel</button><button type="button" class="btn ${danger ? 'danger' : 'primary'}" data-yes autofocus>${esc(confirm)}</button></footer>`, {
      onMount(dlg, close) {
        dlg.querySelector('[data-yes]').onclick = () => { answered = true; close(); resolve(true); };
        dlg.querySelector('[data-no]').onclick = () => { answered = true; close(); resolve(false); };
      },
      onClose() { if (!answered) resolve(false); },
    });
  });
}

export function pickItem({ title = 'Choose', types = LINKABLE, exclude = [], allowNone = false, noneLabel = 'None' } = {}) {
  return new Promise((resolve) => {
    let done = false;
    openModal(`
      <header class="dlg-head"><div><h2>${esc(title)}</h2></div><button class="x" data-close>×</button></header>
      <input class="pick-q" placeholder="Filter…" autofocus>
      <div class="pick-list"></div>
      ${allowNone ? `<footer class="dlg-foot"><span class="grow"></span><button class="btn ghost" data-none>${esc(noneLabel)}</button></footer>` : ''}`, {
      onMount(dlg, close) {
        const list = dlg.querySelector('.pick-list');
        const q = dlg.querySelector('.pick-q');
        const items = types.flatMap((t) => store.list(t)).filter((x) => !exclude.includes(x.id) && M.isOpen(x));
        const draw = () => {
          const s = q.value.trim().toLowerCase();
          const hits = items.filter((x) => !s || x.title.toLowerCase().includes(s)).slice(0, 60);
          list.innerHTML = hits.length ? hits.map((x, i) => `<button class="pick ${i === 0 ? 'on' : ''}" data-id="${esc(x.id)}"><span class="tchip fam-${TYPES[x.type].family}"><i>${TYPES[x.type].glyph}</i>${esc(M.typeLabel(x))}</span><b>${esc(x.title)}</b><em>${esc(M.pathLabel(x))}</em></button>`).join('') : '<p class="muted pad">Nothing matches.</p>';
          list.querySelectorAll('.pick').forEach((b) => (b.onclick = () => { done = true; close(); resolve(b.dataset.id); }));
        };
        q.oninput = draw;
        q.onkeydown = (e) => {
          if (e.key === 'Enter') { const f = list.querySelector('.pick'); if (f) f.click(); }
        };
        dlg.querySelectorAll('[data-close]').forEach((x) => (x.onclick = close));
        const none = dlg.querySelector('[data-none]');
        if (none) none.onclick = () => { done = true; close(); resolve(''); };
        draw();
      },
      onClose() { if (!done) resolve(null); },
    });
  });
}

