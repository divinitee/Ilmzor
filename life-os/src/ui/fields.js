// HTML fragments shared by inspector and views. Inputs carry data-bind="id|field"
// and are persisted by one central handler in app.js.

import { esc, relDay, fmtDate, today } from '../util.js';
import { TYPES, STATUSES, HORIZON } from '../schema.js';
import * as M from '../model.js';

export function attrs(obj) {
  return Object.entries(obj)
    .filter(([, v]) => v !== undefined && v !== null && v !== false)
    .map(([k, v]) => (v === true ? k : `${k}="${esc(v)}"`))
    .join(' ');
}

export function textField(id, key, value, { label, placeholder = '', multiline = false, rows = 2, cls = '', big = false } = {}) {
  const common = attrs({ 'data-bind': `${id}|${key}`, placeholder, class: big ? 'big' : '' });
  const input = multiline
    ? `<textarea ${common} rows="${rows}">${esc(value || '')}</textarea>`
    : `<input type="text" ${common} value="${esc(value || '')}">`;
  return label ? `<label class="fld ${cls}"><span>${esc(label)}</span>${input}</label>` : input;
}

export function selectField(id, key, value, options, { label, empty = null, cls = '', kind = 'select' } = {}) {
  const opts = (empty !== null ? [['', empty]] : []).concat(options);
  const sel = `<select ${attrs({ 'data-bind': `${id}|${key}`, 'data-kind': kind })}>${opts
    .map(([v, l]) => `<option value="${esc(v)}" ${String(v) === String(value ?? '') ? 'selected' : ''}>${esc(l)}</option>`)
    .join('')}</select>`;
  return label ? `<label class="fld ${cls}"><span>${esc(label)}</span>${sel}</label>` : sel;
}

export function dateField(id, key, value, { label, cls = '' } = {}) {
  const input = `<input type="date" ${attrs({ 'data-bind': `${id}|${key}`, 'data-kind': 'date' })} value="${esc(value || '')}">`;
  return label ? `<label class="fld ${cls}"><span>${esc(label)}</span>${input}</label>` : input;
}

export function numberField(id, key, value, { label, step = 0.5, min = 0, cls = '', suffix = '' } = {}) {
  const input = `<input type="number" ${attrs({ 'data-bind': `${id}|${key}`, 'data-kind': 'number', step, min })} value="${value === null || value === undefined ? '' : esc(value)}">`;
  const inner = suffix ? `<span class="with-suffix">${input}<i>${esc(suffix)}</i></span>` : input;
  return label ? `<label class="fld ${cls}"><span>${esc(label)}</span>${inner}</label>` : inner;
}

export function statusOptions(type) {
  return STATUSES[type] || [];
}

export function typeChip(x) {
  if (!x) return '';
  const t = TYPES[x.type] || {};
  return `<span class="tchip fam-${t.family || 'x'}"><i>${t.glyph || '•'}</i>${esc(M.typeLabel(x))}</span>`;
}

export function dot(x, extra = '') {
  return `<span class="adot ${extra}" style="--c:${esc(M.colorOf(x))}"></span>`;
}

export function statusChip(x) {
  if (!x || !x.status) return '';
  const label = M.statusLabel(x);
  if (!label) return '';
  return `<span class="schip st-${esc(x.status)}">${esc(label)}</span>`;
}

export function dueChip(date, { label = '' } = {}) {
  if (!date) return '';
  const t = today();
  const cls = date < t ? 'bad' : date === t ? 'warn' : date <= addDaysLocal(t, 3) ? 'soon' : '';
  return `<span class="due ${cls}" title="${esc(fmtDate(date))}">${label ? esc(label) + ' ' : ''}${esc(relDay(date))}</span>`;
}
function addDaysLocal(s, n) {
  const d = new Date(s + 'T00:00:00');
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

export function bar(p, { cls = '' } = {}) {
  const v = Math.round(Math.max(0, Math.min(1, p)) * 100);
  return `<span class="pbar ${cls}"><i style="width:${v}%"></i></span>`;
}

export function empty(title, body = '', actions = '') {
  return `<div class="empty"><b>${esc(title)}</b>${body ? `<p>${body}</p>` : ''}${actions ? `<div class="empty-actions">${actions}</div>` : ''}</div>`;
}

export function btn(label, act, data = {}, cls = '') {
  const d = Object.entries(data).map(([k, v]) => `data-${k}="${esc(v)}"`).join(' ');
  return `<button type="button" class="btn ${cls}" data-act="${esc(act)}" ${d}>${label}</button>`;
}

export function createBtn(label, type, defaults = {}, cls = 'ghost sm') {
  return `<button type="button" class="btn ${cls}" data-act="create" data-type="${esc(type)}" data-defaults="${esc(JSON.stringify(defaults))}">${label}</button>`;
}

export function quickAdd(type, defaults, placeholder) {
  return `<div class="quick"><span>+</span><input type="text" data-quick="${esc(type)}" data-defaults="${esc(JSON.stringify(defaults))}" placeholder="${esc(placeholder)}"></div>`;
}

export function horizonLabel(h) {
  return HORIZON[h] ? HORIZON[h].label : '';
}

// A compact, clickable row for any item. Tasks and waiting items get a completion box.
export function row(x, { path = true, meta = '', actions = '', sub = '', cls = '' } = {}) {
  if (!x) return '';
  const checkable = x.type === 'task' || x.type === 'waiting' || x.type === 'project' || x.type === 'objective';
  const done = M.isDone(x);
  const box = checkable
    ? `<button class="cbox ${done ? 'on' : ''} ${x.type === 'task' && x.isNext ? 'next' : ''}" data-act="complete" data-id="${esc(x.id)}" title="${done ? 'Reopen' : 'Mark complete'}">${done ? '✓' : ''}</button>`
    : `<span class="rglyph">${(TYPES[x.type] || {}).glyph || '•'}</span>`;
  const p = path ? M.pathLabel(x) : '';
  return `<div class="row ${done ? 'is-done' : ''} ${cls}" data-row="${esc(x.id)}">
    ${box}
    <div class="row-main" data-act="select" data-id="${esc(x.id)}">
      <div class="row-title">${dot(x)}<span>${esc(x.title || '(untitled)')}</span></div>
      ${sub ? `<div class="row-sub">${sub}</div>` : p ? `<div class="row-sub path">${esc(p)}</div>` : ''}
    </div>
    ${meta ? `<div class="row-meta">${meta}</div>` : ''}
    ${actions ? `<div class="row-actions">${actions}</div>` : ''}
  </div>`;
}

// Breadcrumb from mission down to the item: the "why does this exist?" trace.
export function whyTrail(x, { compact = false } = {}) {
  const chain = M.whyChain(x.id);
  if (compact) {
    if (!chain.length || chain[0].id !== 'mission') return '<div class="why-line warn">⚠ Not connected to a project or goal</div>';
    const mid = chain.slice(1, -1);
    return `<div class="why-line" title="${esc(mid.map((c) => c.title).join(' → '))}">${mid.map((c) => `<span style="--c:${esc(M.colorOf(c))}">${esc(c.title)}</span>`).join('<i>→</i>')}</div>`;
  }
  if (!chain.length || chain[0].id !== 'mission') {
    return `<div class="why orphan"><span class="why-warn">⚠ Not connected to any goal, project or domain.</span> <button class="linklike" data-act="edit-parent" data-id="${esc(x.id)}">Connect it</button></div>`;
  }
  const parts = chain.map((c, i) => {
    const last = i === chain.length - 1;
    const label = c.id === 'mission' ? 'Mission' : c.title;
    const kind = c.id === 'mission' ? '' : `<em>${esc(M.typeLabel(c))}</em>`;
    return `<button class="why-step ${last ? 'cur' : ''}" data-act="select" data-id="${esc(c.id)}" style="--c:${esc(M.colorOf(c))}">${kind}<span>${esc(compact ? label.slice(0, 26) : label)}</span></button>`;
  });
  return `<div class="why">${parts.join('<i class="why-arr">→</i>')}</div>`;
}
