// Capacity: "what do I realistically have room for?" Never silently accepts an impossible plan.

import { store } from '../store.js';
import { ui } from '../ui.js';
import * as M from '../model.js';
import { esc, fmtHours, round1 } from '../util.js';
import { btn, createBtn, empty } from '../ui/fields.js';

const TABS = [['time', 'Time', 'h / week'], ['money', 'Money', 'per month'], ['energy', 'Energy', '% of capacity'], ['attention', 'Attention', '% of focus']];

export function renderCapacity() {
  const tab = ui.capTab || 'time';
  const body = tab === 'time' ? timeTab() : tab === 'money' ? moneyTab() : shareTab(tab);
  return `
  <header class="vhead">
    <div><div class="eyebrow">Capacity & resources</div><h1>What do I realistically have room for?</h1><p class="lede">Resources are finite. Everything that uses them competes for them.</p></div>
  </header>
  <div class="tabs">${TABS.map(([k, l, u]) => `<button class="tab ${tab === k ? 'on' : ''}" data-act="cap-tab" data-tab="${k}"><b>${l}</b><em>${u}</em></button>`).join('')}</div>
  ${body}`;
}

function stepper(res, target, value, { step = 1, suffix = 'h' } = {}) {
  return `<span class="stepper"><button data-act="alloc-step" data-res="${res}" data-target="${esc(target)}" data-delta="${-step}">−</button><input type="number" min="0" step="${step}" data-alloc-target="${esc(target)}" data-res="${res}" value="${value ? esc(round1(value)) : ''}" placeholder="0"><i>${suffix}</i><button data-act="alloc-step" data-res="${res}" data-target="${esc(target)}" data-delta="${step}">+</button></span>`;
}

function timeTab() {
  const t = M.timeSummary();
  const areas = store.data.areas;
  const scale = Math.max(t.total, t.fixed + t.allocated, 1);
  const pct = (h) => `${(100 * h) / scale}%`;
  const segs = [];
  for (const a of areas) { const h = t.fixedByArea.get(a.id) || 0; if (h) segs.push(`<i class="seg fixed" style="width:${pct(h)};--c:${esc(a.color)}" title="${esc(a.title)} · fixed ${fmtHours(h)}"></i>`); }
  if (t.fixedByArea.get('none')) segs.push(`<i class="seg fixed" style="width:${pct(t.fixedByArea.get('none'))};--c:#9aa6b4"></i>`);
  for (const a of areas) { const h = t.effectiveByArea.get(a.id) || 0; if (h) segs.push(`<i class="seg alloc" style="width:${pct(h)};--c:${esc(a.color)}" title="${esc(a.title)} · allocated ${fmtHours(h)}"></i>`); }
  if (t.buffer) segs.push(`<i class="seg buffer" style="width:${pct(t.buffer)}" title="Buffer ${fmtHours(t.buffer)}"></i>`);
  const marker = `<b class="cap-marker" style="left:${pct(t.total)}"><em>${fmtHours(t.total)} committable</em></b>`;

  const verdict = t.fixedOverTotal
    ? `<div class="verdict bad"><b>Fixed commitments alone exceed your committable hours.</b><span>${fmtHours(t.fixed)} fixed vs ${fmtHours(t.total)} committable. Something structural has to change.</span></div>`
    : t.over
      ? `<div class="verdict bad"><b>OVERALLOCATED by ${fmtHours(t.overBy)}</b><span>You have planned ${fmtHours(t.allocated)} into ${fmtHours(t.available)} of available time. Reduce an allocation, drop a project, or accept that something will slip.</span></div>`
      : t.overAreas.length
        ? `<div class="verdict warn"><b>Total fits, but ${t.overAreas.length === 1 ? 'one domain is' : `${t.overAreas.length} domains are`} over budget.</b><span>${t.overAreas.map((o) => `${esc(M.titleOf(o.areaId))}: ${esc(o.reason)}`).join(' · ')}</span></div>`
        : `<div class="verdict ok"><b>${fmtHours(t.unallocated)} unallocated</b><span>Your plan fits in the time you actually have.</span></div>`;

  const conf = M.conflicts();
  const rowsHtml = areas.map((a) => {
    const fixed = t.fixedByArea.get(a.id) || 0;
    const aAlloc = t.areaAlloc.get(a.id) || 0;
    const pAlloc = t.projectAlloc.get(a.id) || 0;
    const demand = t.demandByArea.get(a.id) || 0;
    const over = t.overAreas.find((o) => o.areaId === a.id);
    const open = (ui.capOpen || []).includes(a.id);
    const projects = store.data.projects.filter((p) => M.areaIdOf(p) === a.id && M.isActiveProject(p));
    return `<div class="ctr ${over ? 'over' : ''} ${open ? 'open' : ''}" style="--c:${esc(a.color)}">
      <button class="ctr-name" data-act="cap-open" data-id="${esc(a.id)}"><i class="caret">${open ? '▾' : '▸'}</i><i class="adot" style="--c:${esc(a.color)}"></i><b>${esc(a.title)}</b>${projects.length ? `<em>${projects.length} proj</em>` : ''}</button>
      <span class="num">${fixed ? fmtHours(fixed) : '—'}</span>
      <span>${stepper('rc_time', a.id, aAlloc)}</span>
      <span class="num ${pAlloc > aAlloc && aAlloc ? 'bad' : ''}">${pAlloc ? fmtHours(pAlloc) : '—'}</span>
      <span class="num ${demand > Math.max(aAlloc, pAlloc) ? 'bad' : ''}">${demand ? fmtHours(demand) : '—'}</span>
      <span class="st">${over ? `<em class="bad" title="${esc(over.reason)}">Over</em>` : aAlloc || pAlloc || fixed ? '<em class="ok">OK</em>' : '<em class="muted">—</em>'}</span>
    </div>
    ${open ? `<div class="ctr-sub">${projects.length ? projects.map((p) => projectAlloc(p)).join('') : `<p class="muted sm">No active projects. ${createBtn('+ Project', 'project', { areaId: a.id }, 'ghost xs')}</p>`}${over ? `<p class="alert bad">${esc(over.reason)}</p>` : ''}</div>` : ''}`;
  }).join('');

  const fixedList = store.data.responsibilities;
  return `
  <div class="cap-kpis">
    <label class="ckpi edit"><em>Committable hours / week</em><span><input type="number" min="0" step="1" data-bind="settings|weeklyHours" data-kind="number" value="${esc(t.total)}"><i>h</i></span><small>waking hours you can realistically commit</small></label>
    <div class="ckpi"><em>Fixed commitments</em><b>${fmtHours(t.fixed)}</b><small>${fixedList.length} recurring</small></div>
    <div class="ckpi"><em>Available</em><b>${fmtHours(t.available)}</b><small>committable − fixed</small></div>
    <div class="ckpi"><em>Allocated</em><b>${fmtHours(t.allocated)}</b><small>incl. buffer ${fmtHours(t.buffer)}</small></div>
    <div class="ckpi ${t.over ? 'bad' : 'ok'}"><em>${t.over ? 'Overallocated' : 'Unallocated'}</em><b>${fmtHours(Math.abs(t.unallocated))}</b><small>${t.over ? 'plan exceeds reality' : 'room left'}</small></div>
  </div>
  <div class="capbar-wrap"><div class="capbar ${t.over ? 'over' : ''}">${segs.join('')}</div>${marker}
    <div class="caplegend"><span><i class="fixed"></i>Fixed</span><span><i class="alloc"></i>Allocated</span><span><i class="buffer"></i>Buffer</span><span><i class="free"></i>Free</span>${t.over ? '<span class="bad"><i class="overflow"></i>Beyond capacity</span>' : ''}</div>
  </div>
  ${verdict}
  <div class="cols">
    <div class="col-main">
      <section class="blk"><h3>Weekly allocation <small>set a budget per domain, split it across projects</small></h3>
        <div class="ctable">
          <div class="ctr head"><span>Domain</span><span>Fixed</span><span>Budget</span><span>Projects</span><span>Next-action demand</span><span></span></div>
          ${rowsHtml || empty('No domains yet')}
          <div class="ctr buffer"><span class="ctr-name"><b>Buffer</b><em>for the unexpected</em></span><span></span><span>${stepper('rc_time', 'buffer', t.buffer)}</span><span></span><span></span><span></span></div>
        </div>
        <p class="muted sm">Budget: hours you give the domain. Projects: hours claimed by its projects (can't exceed the budget). Demand: estimates of this week's next actions and planned work.</p>
      </section>
    </div>
    <aside class="col-side">
      <section class="blk"><h3>Conflicts <small>what competes for the same hours</small></h3>
        ${conf.length ? conf.map((c) => `<div class="conflict ${c.severity}">
          <div class="cf-pair"><button data-act="select" data-id="${esc(c.a.id)}"><i class="adot" style="--c:${esc(M.colorOf(c.a))}"></i>${esc(c.a.title)}<em>${fmtHours(c.ha)}</em></button><span class="vs">vs</span><button data-act="select" data-id="${esc(c.b.id)}"><i class="adot" style="--c:${esc(M.colorOf(c.b))}"></i>${esc(c.b.title)}<em>${fmtHours(c.hb)}</em></button></div>
          ${c.note ? `<p>${esc(c.note)}</p>` : ''}${c.severity === 'high' ? '<small class="bad">Active: capacity is short</small>' : '<small>Watch</small>'}
        </div>`).join('') : '<p class="muted sm">No conflicts recorded. Link two domains with “Competes with” to track one.</p>'}
      </section>
      <section class="blk"><h3>Fixed commitments</h3>
        ${fixedList.length ? `<div class="rows">${fixedList.map((r) => `<button class="fixrow" data-act="select" data-id="${esc(r.id)}" style="--c:${esc(M.colorOf(r))}"><i class="adot" style="--c:${esc(M.colorOf(r))}"></i><b>${esc(r.title)}</b><em>${fmtHours(M.weeklyHoursOf(r))}/wk</em></button>`).join('')}</div>` : '<p class="muted sm">None yet. Teaching hours, lectures, shifts — anything that happens regardless.</p>'}
        ${createBtn('+ Fixed commitment', 'responsibility', {}, 'ghost sm')}
      </section>
    </aside>
  </div>`;
}

function projectAlloc(p) {
  const al = store.data.allocations.find((a) => a.resourceId === 'rc_time' && a.targetId === p.id);
  const parts = (al && al.breakdown) || [];
  const sum = parts.reduce((s, b) => s + (Number(b.amount) || 0), 0);
  return `<div class="palloc">
    <div class="palloc-h"><button class="linklike" data-act="select" data-id="${esc(p.id)}">${esc(p.title)}</button>${stepper('rc_time', p.id, al ? al.amount : 0, { step: 0.5 })}${al ? btn('+ Split', 'bd-add', { alloc: al.id }, 'ghost xs') : ''}</div>
    ${parts.length ? `<div class="bd">${parts.map((b) => `<div class="bd-row"><input data-bd="${esc(al.id)}|${esc(b.id)}|label" value="${esc(b.label)}" placeholder="e.g. Engineering"><span class="with-suffix"><input type="number" min="0" step="0.5" data-bd="${esc(al.id)}|${esc(b.id)}|amount" value="${esc(b.amount)}"><i>h</i></span><button class="x sm" data-act="bd-del" data-alloc="${esc(al.id)}" data-bd-id="${esc(b.id)}">×</button></div>`).join('')}
      <p class="bd-sum ${Math.abs(sum - (Number(al.amount) || 0)) > 0.01 ? 'warn' : 'ok'}">Split ${fmtHours(sum)} of ${fmtHours(al.amount)}${Math.abs(sum - (Number(al.amount) || 0)) > 0.01 ? ` · ${sum > al.amount ? 'over' : 'unassigned'} ${fmtHours(Math.abs(sum - al.amount))}` : ' ✓'}</p></div>` : ''}
  </div>`;
}

function moneyTab() {
  const m = M.moneySummary();
  const cur = store.data.settings.currency || '';
  const line = (a) => `<div class="mline ${a.direction}">
    <select data-bind="${esc(a.id)}|targetId">${store.data.areas.map((x) => `<option value="${esc(x.id)}" ${x.id === a.targetId ? 'selected' : ''}>${esc(x.title)}</option>`).join('')}</select>
    <input data-bind="${esc(a.id)}|note" value="${esc(a.note || '')}" placeholder="${a.direction === 'in' ? 'Income source' : 'What it pays for'}">
    <span class="with-suffix"><input type="number" min="0" step="10" data-bind="${esc(a.id)}|amount" data-kind="number" value="${esc(a.amount)}"><i>${esc(cur || '/mo')}</i></span>
    <button class="x sm" data-act="delete-quiet" data-id="${esc(a.id)}">×</button></div>`;
  const ins = m.allocs.filter((a) => a.direction === 'in');
  const outs = m.allocs.filter((a) => a.direction !== 'in');
  const scale = Math.max(m.inflow, m.outflow, 1);
  return `
  <div class="cap-kpis">
    <div class="ckpi"><em>Income / month</em><b>${Math.round(m.inflow).toLocaleString()}</b></div>
    <div class="ckpi"><em>Allocated / month</em><b>${Math.round(m.outflow).toLocaleString()}</b></div>
    <div class="ckpi ${m.over ? 'bad' : 'ok'}"><em>${m.over ? 'Shortfall' : 'Unallocated'}</em><b>${Math.abs(Math.round(m.net)).toLocaleString()}</b></div>
    <label class="ckpi edit"><em>Currency label</em><span><input data-bind="settings|currency" value="${esc(cur)}" placeholder="e.g. €"></span></label>
  </div>
  <div class="mbars"><div><em>In</em><i style="width:${(100 * m.inflow) / scale}%"></i></div><div class="${m.over ? 'over' : ''}"><em>Out</em><i style="width:${(100 * m.outflow) / scale}%"></i></div></div>
  ${m.over ? `<div class="verdict bad"><b>Spending plan exceeds income by ${Math.round(-m.net).toLocaleString()}</b><span>Personal Finance should constrain this: cut an allocation or find income.</span></div>` : ''}
  <div class="cols"><div class="col-main">
    <section class="blk"><h3>Income <small>which domains fund your life</small></h3>${ins.map(line).join('') || '<p class="muted sm">No income recorded.</p>'}${btn('+ Income', 'money-add', { dir: 'in' }, 'ghost sm')}</section>
    <section class="blk"><h3>Allocations <small>where money goes</small></h3>${outs.map(line).join('') || '<p class="muted sm">No allocations recorded.</p>'}${btn('+ Allocation', 'money-add', { dir: 'out' }, 'ghost sm')}</section>
  </div></div>`;
}

function shareTab(kind) {
  const resId = 'rc_' + kind;
  const s = M.shareSummary(resId);
  const areas = store.data.areas;
  const cur = new Map(s.allocs.map((a) => [a.targetId, Number(a.amount) || 0]));
  return `
  <div class="cap-kpis">
    <div class="ckpi"><em>Assigned</em><b>${s.used}%</b></div>
    <div class="ckpi ${s.over ? 'bad' : 'ok'}"><em>${s.over ? 'Over capacity' : 'Free'}</em><b>${Math.abs(s.free)}%</b></div>
  </div>
  <p class="muted">${kind === 'energy' ? 'Where does your energy go in a typical week? Rough percentages are enough — the point is to see what drains you.' : 'Which domains hold your attention? Focus spread across too many things is a hidden overload.'}</p>
  ${s.over ? `<div class="verdict bad"><b>${kind === 'energy' ? 'Energy' : 'Attention'} is overcommitted by ${s.used - s.capacity}%</b><span>Something is getting less than you think.</span></div>` : ''}
  <div class="shares">${areas.map((a) => {
    const v = cur.get(a.id) || 0;
    return `<div class="share" style="--c:${esc(a.color)}"><span><i class="adot" style="--c:${esc(a.color)}"></i>${esc(a.title)}</span><div class="share-bar"><i style="width:${Math.min(100, v)}%"></i></div>${stepper(resId, a.id, v, { step: 5, suffix: '%' })}</div>`;
  }).join('')}</div>`;
}
