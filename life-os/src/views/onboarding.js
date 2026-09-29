// First run: five light questions, then the system is live. Depth comes later.

import { store } from '../store.js';
import { DEFAULT_DOMAINS, AREA_COLORS } from '../schema.js';
import { esc } from '../util.js';

const STEPS = ['welcome', 'mission', 'domains', 'focus', 'constraints', 'projects'];

export function mountOnboarding(host, { onFinish, onExample, onImport, onLegacy, hasLegacy }) {
  const d = {
    step: 0, mission: '', vision: '',
    domains: [...DEFAULT_DOMAINS], selected: new Set(DEFAULT_DOMAINS), custom: '',
    focusArea: DEFAULT_DOMAINS[1], focus: '', focusGoal: '',
    weeklyHours: 70, fixed: [{ area: 'Teaching', title: 'Teaching classes', hours: '' }, { area: 'University', title: 'Lectures & seminars', hours: '' }],
    constraints: '', projects: {},
  };
  host.className = 'onb';

  const selected = () => d.domains.filter((x) => d.selected.has(x));

  const views = {
    welcome: () => `
      <div class="onb-hero"><div class="brand big">LIFE <i>OS</i></div>
      <h1>A command center for your whole life.</h1>
      <p>Direction, domains, projects, next actions and the time they compete for — in one connected system. Five short questions to start. Everything else can wait.</p>
      <div class="onb-actions"><button class="btn primary lg" data-go="1">Set up my system →</button></div>
      <div class="onb-alt"><button class="linklike" data-ex>Explore an example system</button><span>·</span><button class="linklike" data-imp>Import a JSON export</button>${hasLegacy ? '<span>·</span><button class="linklike" data-legacy>Import my V3 prototype data</button>' : ''}</div></div>`,
    mission: () => `
      <h2>What is your mission?</h2><p class="onb-q">Why does your life system exist? One or two sentences. You can refine it any time.</p>
      <textarea class="onb-in" data-f="mission" rows="3" placeholder="e.g. Build a stable, self-directed life through Finance, technology and systems thinking.">${esc(d.mission)}</textarea>
      <label class="onb-sub"><span>Long-term direction <em>optional</em></span><textarea class="onb-in sm" data-f="vision" rows="2" placeholder="Where are you heading over the next years?">${esc(d.vision)}</textarea></label>`,
    domains: () => `
      <h2>What are your major life domains?</h2><p class="onb-q">The systems you keep running. Toggle, or add your own.</p>
      <div class="onb-chips">${d.domains.map((x, i) => `<button class="onb-chip ${d.selected.has(x) ? 'on' : ''}" data-dom="${esc(x)}" style="--c:${AREA_COLORS[i % AREA_COLORS.length]}"><i></i>${esc(x)}</button>`).join('')}</div>
      <div class="onb-add"><input data-f="custom" placeholder="Add a domain…" value="${esc(d.custom)}"><button class="btn ghost" data-add-dom>Add</button></div>`,
    focus: () => `
      <h2>What is your current focus?</h2><p class="onb-q">The domain that matters most right now, and what success there looks like.</p>
      <div class="onb-chips">${selected().map((x) => `<button class="onb-chip ${d.focusArea === x ? 'on' : ''}" data-focus="${esc(x)}"><i></i>${esc(x)}</button>`).join('')}</div>
      <label class="onb-sub"><span>In one line, what is the focus?</span><input class="onb-in" data-f="focus" value="${esc(d.focus)}" placeholder="e.g. Career transition into Finance"></label>
      <label class="onb-sub"><span>Turn it into a goal <em>optional</em></span><input class="onb-in" data-f="focusGoal" value="${esc(d.focusGoal)}" placeholder="e.g. Enter the Finance industry"></label>`,
    constraints: () => `
      <h2>What are your major constraints?</h2><p class="onb-q">Time is the one that limits everything. Be honest; the system will warn you when plans exceed it.</p>
      <label class="onb-sub"><span>Hours per week you can realistically commit (work, study, projects)</span><input class="onb-in num" type="number" min="0" data-f="weeklyHours" value="${esc(d.weeklyHours)}"></label>
      <div class="onb-sub"><span>Fixed commitments · recurring, non-negotiable hours</span>
        ${d.fixed.map((f, i) => `<div class="onb-fixed"><select data-fx="${i}|area">${selected().map((x) => `<option ${x === f.area ? 'selected' : ''}>${esc(x)}</option>`).join('')}</select><input data-fx="${i}|title" value="${esc(f.title)}" placeholder="What"><input type="number" min="0" data-fx="${i}|hours" value="${esc(f.hours)}" placeholder="h/week"><button class="x sm" data-fx-del="${i}">×</button></div>`).join('')}
        <button class="linklike" data-fx-add>+ Add fixed commitment</button></div>
      <label class="onb-sub"><span>Other constraints · one per line <em>optional</em></span><textarea class="onb-in sm" data-f="constraints" rows="3" placeholder="e.g. Weekday evenings are fixed teaching time&#10;Thin savings buffer">${esc(d.constraints)}</textarea></label>`,
    projects: () => `
      <h2>What are your current projects?</h2><p class="onb-q">Finite efforts with an outcome — not ongoing areas, not single tasks. Comma-separated. Leave blank if none.</p>
      <div class="onb-projects">${selected().map((x) => `<label class="onb-proj"><span>${esc(x)}</span><input data-proj="${esc(x)}" value="${esc(d.projects[x] || '')}" placeholder="e.g. ${esc(example(x))}"></label>`).join('')}</div>
      <p class="onb-note">Projects start without a next action and will be flagged ⚠ until you give each one. That is deliberate.</p>`,
  };

  function draw() {
    const key = STEPS[d.step];
    host.innerHTML = `<div class="onb-card ${key}">
      ${d.step > 0 ? `<div class="onb-prog">${STEPS.slice(1).map((s, i) => `<i class="${i + 1 <= d.step ? 'on' : ''}"></i>`).join('')}<span>${d.step} / ${STEPS.length - 1}</span></div>` : ''}
      <div class="onb-body">${views[key]()}</div>
      ${d.step > 0 ? `<footer class="onb-foot"><button class="btn ghost" data-go="${d.step - 1}">← Back</button><span class="grow"></span>${d.step < STEPS.length - 1 ? `<button class="btn ghost" data-go="${d.step + 1}">Skip</button><button class="btn primary" data-go="${d.step + 1}">Continue →</button>` : '<button class="btn primary" data-finish>Enter LIFE OS →</button>'}</footer>` : ''}
    </div>`;
    const first = host.querySelector('.onb-in, input');
    if (first && d.step > 0) setTimeout(() => first.focus(), 20);
  }

  host.addEventListener('input', (e) => {
    const t = e.target;
    if (t.dataset.f) d[t.dataset.f] = t.type === 'number' ? Number(t.value) : t.value;
    if (t.dataset.proj) d.projects[t.dataset.proj] = t.value;
    if (t.dataset.fx) { const [i, k] = t.dataset.fx.split('|'); d.fixed[Number(i)][k] = t.value; }
  });
  host.addEventListener('change', (e) => {
    const t = e.target;
    if (t.dataset.fx) { const [i, k] = t.dataset.fx.split('|'); d.fixed[Number(i)][k] = t.value; }
  });
  host.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.target.dataset.f === 'custom') { e.preventDefault(); addDomain(); }
    else if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); if (d.step < STEPS.length - 1) { d.step++; draw(); } else finish(); }
  });
  host.addEventListener('click', (e) => {
    const t = e.target.closest('button');
    if (!t) return;
    if (t.dataset.go !== undefined) { d.step = Number(t.dataset.go); draw(); }
    else if (t.dataset.dom) { const x = t.dataset.dom; d.selected.has(x) ? d.selected.delete(x) : d.selected.add(x); draw(); }
    else if (t.hasAttribute('data-add-dom')) addDomain();
    else if (t.dataset.focus) { d.focusArea = t.dataset.focus; draw(); }
    else if (t.hasAttribute('data-fx-add')) { d.fixed.push({ area: selected()[0] || '', title: '', hours: '' }); draw(); }
    else if (t.dataset.fxDel !== undefined) { d.fixed.splice(Number(t.dataset.fxDel), 1); draw(); }
    else if (t.hasAttribute('data-finish')) finish();
    else if (t.hasAttribute('data-ex')) onExample();
    else if (t.hasAttribute('data-imp')) onImport();
    else if (t.hasAttribute('data-legacy')) onLegacy();
  });

  function addDomain() {
    const v = (d.custom || '').trim();
    if (!v) return;
    if (!d.domains.includes(v)) d.domains.push(v);
    d.selected.add(v);
    d.custom = '';
    draw();
  }

  function finish() {
    store.reset();
    const now = new Date().toISOString();
    store.update('mission', { statement: d.mission.trim(), vision: d.vision.trim(), focus: d.focus.trim() });
    store.updateSettings({ weeklyHours: Number(d.weeklyHours) || 70 });
    const ids = {};
    selected().forEach((name, i) => {
      const a = store.create('area', { title: name, color: AREA_COLORS[d.domains.indexOf(name) % AREA_COLORS.length], order: i });
      ids[name] = a.id;
    });
    if (ids[d.focusArea]) store.update('mission', { focusAreaId: ids[d.focusArea] });
    if (d.focusGoal.trim()) store.create('goal', { title: d.focusGoal.trim(), areaId: ids[d.focusArea] || null, horizon: '3y', desired: d.focus.trim() });
    for (const f of d.fixed) {
      if (!f.title.trim() && !Number(f.hours)) continue;
      store.create('responsibility', { title: f.title.trim() || `${f.area} commitments`, areaId: ids[f.area] || null, hoursPerWeek: Number(f.hours) || 0 });
    }
    for (const line of d.constraints.split('\n').map((s) => s.trim()).filter(Boolean)) store.create('constraint', { title: line, severity: 'hard' });
    for (const [name, list] of Object.entries(d.projects)) {
      if (!ids[name]) continue;
      for (const p of String(list).split(',').map((s) => s.trim()).filter(Boolean)) store.create('project', { title: p, areaId: ids[name] });
    }
    store.updateMeta({ onboardedAt: now });
    onFinish();
  }

  draw();
}

function example(domain) {
  const m = { University: 'Thesis, Graduation tracker', 'Finance Career': 'Finance CV, Job pipeline', Teaching: 'Course materials', VIRORA: 'Grammar engine', 'Personal Finance': 'Monthly budget', Skills: 'SQL for finance', 'Personal Life': 'Admin sweep', Health: 'Training plan' };
  return m[domain] || 'Project name';
}
