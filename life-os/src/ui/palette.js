// Command palette: search everything, jump anywhere, create from the query.

import * as M from '../model.js';
import { TYPES } from '../schema.js';
import { esc } from '../util.js';
import { openModal } from './dialogs.js';

const VIEWS = [
  ['map', 'Life Map'], ['today', 'Today'], ['week', 'This Week'], ['goals', 'Goals'],
  ['projects', 'Projects'], ['waiting', 'Waiting'], ['capacity', 'Capacity'], ['review', 'Weekly Review'],
];

export function openPalette({ onPick, onView, onCreate }) {
  openModal(`
    <div class="pal">
      <div class="pal-in"><span>⌕</span><input autofocus placeholder="Search domains, goals, projects, actions, people, notes…" spellcheck="false"><kbd>esc</kbd></div>
      <div class="pal-list"></div>
      <div class="pal-foot"><span><kbd>↑</kbd><kbd>↓</kbd> move</span><span><kbd>↵</kbd> open</span><span>Type a new title to create it</span></div>
    </div>`, {
    onMount(dlg, close) {
      dlg.classList.add('pal-dlg');
      const input = dlg.querySelector('input');
      const list = dlg.querySelector('.pal-list');
      let items = [];
      let idx = 0;
      const draw = () => {
        const q = input.value.trim();
        items = [];
        if (!q) {
          const next = M.nextActions().slice(0, 5);
          items.push(...VIEWS.map(([v, l]) => ({ kind: 'view', v, label: l })));
          if (next.length) items.push({ kind: 'head', label: 'Next actions' }, ...next.map((x) => ({ kind: 'item', item: x })));
        } else {
          const hits = M.search(q, { limit: 30 });
          items.push(...hits.map((h) => ({ kind: 'item', item: h.item, snippet: h.snippet })));
          const vHits = VIEWS.filter(([, l]) => l.toLowerCase().includes(q.toLowerCase()));
          items.push(...vHits.map(([v, l]) => ({ kind: 'view', v, label: l })));
          items.push({ kind: 'head', label: 'Create' });
          for (const t of ['task', 'project', 'goal', 'waiting']) items.push({ kind: 'create', t, title: q });
        }
        const selectable = items.filter((i) => i.kind !== 'head');
        idx = Math.min(idx, Math.max(0, selectable.length - 1));
        let n = -1;
        list.innerHTML = items.length
          ? items.map((it) => {
            if (it.kind === 'head') return `<div class="pal-head">${esc(it.label)}</div>`;
            n++;
            const on = n === idx ? 'on' : '';
            if (it.kind === 'view') return `<button class="pal-row ${on}" data-n="${n}"><span class="tchip fam-view"><i>▸</i>View</span><b>${esc(it.label)}</b></button>`;
            if (it.kind === 'create') return `<button class="pal-row ${on}" data-n="${n}"><span class="tchip fam-${TYPES[it.t].family}"><i>+</i>New ${esc(TYPES[it.t].label.toLowerCase())}</span><b>${esc(it.title)}</b></button>`;
            const x = it.item;
            const path = M.pathLabel(x);
            return `<button class="pal-row ${on}" data-n="${n}"><span class="tchip fam-${(TYPES[x.type] || {}).family}"><i>${(TYPES[x.type] || {}).glyph || '•'}</i>${esc(M.typeLabel(x))}</span><span class="pal-main"><b>${esc(x.type === 'relationship' ? path : x.id === 'mission' ? 'Mission' : x.title)}</b>${path && x.type !== 'relationship' ? `<em>${esc(path)}</em>` : ''}${it.snippet ? `<small>${esc(it.snippet)}</small>` : ''}</span>${M.isOpen(x) || x.id === 'mission' ? '' : '<span class="schip st-done">closed</span>'}</button>`;
          }).join('')
          : '<p class="muted pad">Nothing yet.</p>';
        list.querySelectorAll('.pal-row').forEach((b) => (b.onclick = () => choose(Number(b.dataset.n))));
        const on = list.querySelector('.pal-row.on');
        if (on) on.scrollIntoView({ block: 'nearest' });
      };
      const choose = (n) => {
        const it = items.filter((i) => i.kind !== 'head')[n];
        if (!it) return;
        close();
        if (it.kind === 'view') onView(it.v);
        else if (it.kind === 'create') onCreate(it.t, it.title);
        else onPick(it.item.id);
      };
      input.oninput = () => { idx = 0; draw(); };
      input.onkeydown = (e) => {
        const count = items.filter((i) => i.kind !== 'head').length;
        if (e.key === 'ArrowDown') { e.preventDefault(); idx = (idx + 1) % Math.max(1, count); draw(); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); idx = (idx - 1 + count) % Math.max(1, count); draw(); }
        else if (e.key === 'Enter') { e.preventDefault(); choose(idx); }
      };
      draw();
    },
  });
}

