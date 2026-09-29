// Waiting: every open loop someone else owns, with a follow-up date so none disappear.

import { store } from '../store.js';
import * as M from '../model.js';
import { esc, today, relDay, daysBetween, fmtDate } from '../util.js';
import { btn, empty, createBtn } from '../ui/fields.js';

export function renderWaiting() {
  const t = today();
  const open = store.data.waiting.filter(M.isOpen);
  const now = open.filter((w) => (w.followUpAt && w.followUpAt <= t) || (w.expectedAt && w.expectedAt < t) || !w.followUpAt);
  const later = open.filter((w) => !now.includes(w)).sort((a, b) => String(a.followUpAt).localeCompare(String(b.followUpAt)));
  const closed = store.data.waiting.filter((w) => !M.isOpen(w)).sort((a, b) => String(b.completedAt).localeCompare(String(a.completedAt))).slice(0, 10);

  const tr = (w) => {
    const p = store.get(w.projectId);
    const age = w.requestedAt ? daysBetween(w.requestedAt, t) : null;
    const late = w.expectedAt && w.expectedAt < t;
    return `<div class="wrow ${late ? 'late' : ''} ${M.isOpen(w) ? '' : 'is-done'}" style="--c:${esc(M.colorOf(w))}">
      <div class="w-who" data-act="select" data-id="${esc(w.id)}"><b>${esc(w.who || M.titleOf(w.personId) || '—')}</b><em>${age !== null ? `${age}d open` : ''}</em></div>
      <div class="w-what" data-act="select" data-id="${esc(w.id)}"><b>${esc(w.title)}</b>${p ? `<em><i class="adot" style="--c:${esc(M.colorOf(p))}"></i>${esc(p.title)}</em>` : ''}</div>
      <div class="w-dates"><span title="Requested">${w.requestedAt ? esc(fmtDate(w.requestedAt)) : '—'}</span><span class="${late ? 'bad' : ''}" title="Expected">${w.expectedAt ? `exp. ${esc(relDay(w.expectedAt))}` : 'no ETA'}</span></div>
      <div class="w-fu"><span class="${w.followUpAt && w.followUpAt <= t ? 'warn' : ''}">${w.followUpAt ? `follow up ${esc(relDay(w.followUpAt))}` : '<span class="warn">no follow-up date</span>'}</span><em>${esc(w.followUpAction || '')}</em></div>
      <div class="w-act">${M.isOpen(w) ? `${btn('Followed up', 'followup', { id: w.id }, 'ghost xs')}${btn('Received', 'received', { id: w.id }, 'ghost xs')}` : btn('Reopen', 'complete', { id: w.id }, 'ghost xs')}</div>
    </div>`;
  };
  const head = '<div class="whead"><span>Waiting on</span><span>What</span><span>Requested · expected</span><span>Follow-up</span><span></span></div>';
  return `
  <header class="vhead">
    <div><div class="eyebrow">Waiting</div><h1>Open loops you don’t control</h1><p class="lede">${open.length} open · ${now.length ? `<span class="warn">${now.length} need a follow-up now</span>` : 'nothing to chase today'}</p></div>
    <div class="vhead-actions">${createBtn('+ Waiting item', 'waiting', {}, 'primary sm')}</div>
  </header>
  ${open.length ? '' : empty('Nothing you are waiting on', 'When you hand something to someone else — a document, a reply, a payment — capture it here with a follow-up date.', createBtn('Add a waiting item', 'waiting', {}, 'primary sm'))}
  ${now.length ? `<section class="blk"><h3>Follow up now</h3><div class="wtable">${head}${now.map(tr).join('')}</div></section>` : ''}
  ${later.length ? `<section class="blk"><h3>Upcoming</h3><div class="wtable">${head}${later.map(tr).join('')}</div></section>` : ''}
  ${closed.length ? `<section class="blk"><h3>Recently received</h3><div class="wtable">${closed.map(tr).join('')}</div></section>` : ''}`;
}
