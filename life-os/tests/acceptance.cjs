// End-to-end acceptance test for LIFE OS (the 21-step checklist + real workflows).
// Usage: node life-os/build.mjs && node life-os/tests/acceptance.cjs
// Needs Playwright (npm i -g playwright, or set PLAYWRIGHT_MODULE to its path).
const path = require('path');
const os = require('os');
const fs = require('fs');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const APP = 'file://' + path.resolve(__dirname, '..', 'Life-OS.html');
const SHOTS = fs.mkdtempSync(path.join(os.tmpdir(), 'lifeos-shots-'));
const results = [];
const ok = (name, cond, detail = '') => { results.push(`${cond ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`); };

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push('PAGEERROR ' + e.message + ' ' + (e.stack || '').split('\n').slice(0, 3).join(' | ')));
  page.on('console', m => { if (m.type() === 'error' && !/fonts|ERR_CERT/.test(m.text())) errs.push('CONSOLE ' + m.text()); });
  const S = (fn, arg) => page.evaluate(fn, arg);
  const wait = (ms = 350) => page.waitForTimeout(ms);
  const shot = (n) => page.screenshot({ path: path.join(SHOTS, n + '.png') });
  const nodePos = (id) => S((id) => window.__lifeos.graph().screenPos(id), id);
  const clickNode = async (id, dbl = false) => { await S((id) => window.__lifeos.graph().focus(id), id); await wait(800); const p = await nodePos(id); if (dbl) await page.mouse.dblclick(p.x, p.y); else await page.mouse.click(p.x, p.y); await wait(400); return p; };
  const findId = (type, title) => S(([type, title]) => { const x = window.__lifeos.store.list(type).find(i => i.title === title); return x && x.id; }, [type, title]);

  await page.goto(APP);
  await wait(500);

  // ---------- onboarding ----------
  await page.click('text=Set up my system');
  await page.fill('[data-f=mission]', 'Build a stable, self-directed life through Finance and technology.');
  await page.click('button:has-text("Continue")');
  await wait(150);
  await page.fill('[data-f=custom]', 'Family');
  await page.keyboard.press('Enter');
  await page.click('button:has-text("Continue")');
  await page.click('.onb-chip:has-text("Finance Career")');
  await page.fill('[data-f=focus]', 'Career transition into Finance');
  await page.click('button:has-text("Continue")');
  await page.fill('[data-f=weeklyHours]', '74');
  await page.fill('[data-fx="0|hours"]', '21');
  await page.fill('[data-fx="1|hours"]', '22');
  await page.fill('[data-f=constraints]', 'Weekday evenings are fixed teaching time');
  await shot('03-onboarding-constraints');
  await page.click('button:has-text("Continue")');
  await page.fill('[data-proj="VIRORA"]', 'Grammar Engine, Landing page');
  await page.fill('[data-proj="Personal Finance"]', 'Monthly Budget');
  await page.click('[data-finish]');
  await wait(900);
  let st = await S(() => ({ areas: window.__lifeos.store.data.areas.length, projects: window.__lifeos.store.data.projects.length, fixed: window.__lifeos.M.timeSummary().fixed, available: window.__lifeos.M.timeSummary().available, onb: !!document.querySelector('.onb') }));
  ok('Onboarding creates system', st.areas === 9 && st.projects === 3 && st.fixed === 43 && !st.onb, JSON.stringify(st));
  await shot('04-after-onboarding');

  // ---------- 1. create a domain ----------
  await page.click('.new-btn');
  await page.click('.tbtn[data-type=area]');
  await page.fill('.dlg-form [name=title]', 'Side Research');
  await page.keyboard.press('Enter');
  await wait(700);
  const domId = await findId('area', 'Side Research');
  ok('1. Create a domain', !!domId && !!(await nodePos(domId)));

  // ---------- 2. goal under it (via Finance Career inspector, workflow 26) ----------
  const careerId = await findId('area', 'Finance Career');
  let p = await clickNode(careerId);
  ok('Click node opens inspector', await S((id) => !!document.querySelector(`.insp[data-insp="${id}"]`), careerId));
  await page.click('.inspector .is-sec:has(h4:text-is("Goals")) [data-act=create], .inspector [data-act=create][data-type=goal]');
  await page.fill('.dlg-form [name=title]', 'Enter the Finance industry');
  await page.keyboard.press('Enter');
  await wait(600);
  const goalId = await findId('goal', 'Enter the Finance industry');
  ok('2. Create a goal under the domain', !!goalId && (await S((id) => window.__lifeos.store.get(id).areaId, goalId)) === careerId);

  // objective under goal
  await page.click('.inspector [data-act=create][data-type=objective]');
  await page.fill('.dlg-form [name=title]', 'Obtain first relevant Finance role');
  const hz = await page.inputValue('.dlg-form [name=horizon]');
  await page.keyboard.press('Enter');
  await wait(600);
  const objId = await findId('objective', 'Obtain first relevant Finance role');
  ok('Create objective under goal (horizon defaults to annual)', !!objId && hz === 'year');

  // ---------- 3. project under the objective, with first next action ----------
  await page.click('.inspector [data-act=create][data-type=project]');
  await page.fill('.dlg-form [name=title]', 'Job Search');
  await page.fill('.dlg-form [name=nextAction]', 'Extract university practical work into CV');
  await page.keyboard.press('Enter');
  await wait(600);
  const projId = await findId('project', 'Job Search');
  const pr = await S((id) => { const p = window.__lifeos.store.get(id); return { obj: p.objectiveId, area: p.areaId, next: window.__lifeos.M.nextActionOf(id)?.title }; }, projId);
  ok('3. Create project under goal/objective', pr.obj === objId && pr.area === careerId && pr.next === 'Extract university practical work into CV', JSON.stringify(pr));

  // sub-project CV
  await page.click('.new-btn');
  await page.click('.tbtn[data-type=project]');
  await page.fill('.dlg-form [name=title]', 'Finance CV');
  await page.selectOption('.dlg-form [name=parentId]', projId);
  await page.keyboard.press('Enter');
  await wait(600);
  const cvId = await findId('project', 'Finance CV');

  // ---------- 4. task under the project via quick add ----------
  await page.fill('.inspector [data-quick=task]', 'Rewrite CV experience section');
  await page.keyboard.press('Enter');
  await wait(500);
  const taskId = await findId('task', 'Rewrite CV experience section');
  const tk = await S((id) => window.__lifeos.store.get(id), taskId);
  ok('4. Create a task under the project (auto next action)', tk && tk.projectId === cvId && tk.isNext === true);
  const chain = await S((id) => window.__lifeos.M.whyChain(id).map(x => x.id === 'mission' ? 'MISSION' : x.title).join(' → '), taskId);
  ok('Why-chain traces task to mission', chain === 'MISSION → Finance Career → Enter the Finance industry → Obtain first relevant Finance role → Job Search → Finance CV → Rewrite CV experience section', chain);

  // ---------- 5. edit all fields ----------
  p = await clickNode(cvId);
  await page.fill('.inspector .insp-title', 'Finance CV v2');
  await page.fill('.inspector [data-bind$="|desired"]', 'CV that positions Finance experience credibly');
  await page.fill('.inspector [data-bind$="|deadline"]', '2026-10-20');
  await page.selectOption('.inspector [data-bind$="|priority"]', 'high');
  await page.selectOption('.inspector .st-sel select', 'active');
  await page.fill('.inspector [data-alloc-target]', '4'); await page.keyboard.press('Tab');
  await page.click('.inspector summary'); await wait(200);
  await page.fill('.inspector [data-bind$="|current"]', 'Generic template');
  await page.fill('.inspector [data-bind$="|why"]', 'Nothing moves without a credible CV');
  await page.fill('.inspector [data-bind$="|notes"]', 'Ask a friend in banking to review');
  await page.fill('.inspector [data-quick=milestone]', 'Experience section'); await page.keyboard.press('Enter'); await wait(300);
  await page.keyboard.press('Tab');
  await wait(500);
  const cv = await S((id) => { const x = window.__lifeos.store.get(id); const a = window.__lifeos.store.data.allocations.find(a => a.targetId === id); return { ...x, alloc: a && a.amount }; }, cvId);
  ok('5. Edit fields (title, outcome, deadline, priority, allocation, current, why, notes, milestone)', cv.title === 'Finance CV v2' && cv.desired.startsWith('CV that') && cv.deadline === '2026-10-20' && cv.priority === 'high' && cv.alloc === 4 && cv.current === 'Generic template' && cv.why.startsWith('Nothing') && cv.notes.startsWith('Ask') && cv.milestones.length === 1, JSON.stringify({ t: cv.title, d: cv.deadline, pr: cv.priority, al: cv.alloc, ms: cv.milestones.length }));
  const graphLabel = await S((id) => document.querySelector(`#graph [data-id="${id}"] .p-title`)?.textContent, cvId);
  ok('Graph label updates live after title edit', graphLabel === 'Finance CV v2', graphLabel);
  // task fields
  await S((id) => document.querySelector(`.inspector [data-act=select][data-id="${id}"]`).click(), taskId); await wait(400);
  await page.fill('.inspector [data-bind$="|estimate"]', '2'); await page.keyboard.press('Tab');
  await page.fill('.inspector [data-bind$="|due"]', '2026-10-02');
  await page.click('.inspector .seg:has-text("Must today")'); await wait(300);
  const t2 = await S((id) => window.__lifeos.store.get(id), taskId);
  ok('Edit task fields (estimate, due, plan today)', t2.estimate === 2 && t2.due === '2026-10-02' && t2.plannedFor && t2.plannedPriority === 'must');
  await shot('05-task-inspector');

  // ---------- 6. relationship between unrelated domains ----------
  await page.keyboard.press('Escape'); await wait(200);
  const teachId = await findId('area', 'Teaching');
  const pfId = await findId('area', 'Personal Finance');
  await page.click('[data-act=collapse-all]'); await wait(900);
  await clickNode(teachId);
  await page.click('.inspector .insp-foot [data-act=link]'); await wait(300);
  await clickNode(pfId); await wait(200);
  await page.click('.rk:has-text("Funds")');
  await page.click('.dialog button[type=submit]'); await wait(600);
  const rel = await S(([a, b]) => window.__lifeos.store.data.relationships.find(r => r.from === a && r.to === b), [teachId, pfId]);
  ok('6. Create relationship between two domains (link mode + dialog)', rel && rel.kind === 'funds' && /money/.test(rel.note), rel && rel.note);

  // ---------- 7. click the relationship ----------
  await page.keyboard.press('Escape'); await wait(200); await page.keyboard.press('Escape'); await wait(300);
  await page.click('[data-act=mode][data-mode=relationships]'); await wait(300); await page.keyboard.press('f'); await wait(900);
  const ep = await S((id) => window.__lifeos.graph().edgeScreenPos(id), rel.id);
  await page.mouse.click(ep.x, ep.y); await wait(500);
  const relInsp = await S(() => document.querySelector('.inspector .rel-mid span')?.textContent);
  ok('7. Click relationship explains it', relInsp === 'MONEY FLOW', relInsp);
  await shot('06-relationship-inspector');

  // resource dependency edge explanation
  await page.click('[data-act=mode][data-mode=map]'); await wait(500);

  // ---------- 8. expand/collapse ----------
  const vis0 = await S(() => document.querySelectorAll('#graph .node').length);
  await clickNode(careerId, true); await wait(700);
  const vis1 = await S(() => document.querySelectorAll('#graph .node:not(.is-exiting)').length);
  const goalVisible = await S((id) => !!window.__lifeos.graph().has(id), goalId);
  await clickNode(careerId, true); await wait(900);
  const vis2 = await S(() => document.querySelectorAll('#graph .node').length);
  ok('8. Double-click expands and collapses', vis1 > vis0 && goalVisible && vis2 === vis0, `${vis0} → ${vis1} → ${vis2}`);

  // ---------- 9. drag nodes ----------
  await S((id) => window.__lifeos.graph().focus(id), teachId); await wait(800);
  p = await nodePos(teachId);
  await page.mouse.move(p.x, p.y); await page.mouse.down();
  await page.mouse.move(p.x + 60, p.y + 30, { steps: 5 }); await page.mouse.move(p.x + 120, p.y + 60, { steps: 5 });
  await page.mouse.up(); await wait(400);
  const off = await S((id) => window.__lifeos.store.data.layout.offsets[id], teachId);
  const p2 = await nodePos(teachId);
  ok('9. Drag repositions node and persists offset', !!off && Math.abs(p2.x - p.x - 120) < 6, JSON.stringify(off));

  // ---------- 10. zoom / pan ----------
  const k0 = (await S(() => window.__lifeos.graph().camera)).k;
  await page.mouse.move(600, 450); await page.mouse.wheel(0, -400); await wait(600);
  const k1 = (await S(() => window.__lifeos.graph().camera)).k;
  const c0 = await S(() => window.__lifeos.graph().camera);
  const empty = await S(() => { for (let y = 760; y > 120; y -= 20) for (let x = 260; x < 1000; x += 20) { const el = document.elementFromPoint(x, y); if (el && (el.id === 'graph' || el.classList.contains('bg-grid'))) return { x, y }; } return null; });
  await page.mouse.move(empty.x, empty.y); await page.mouse.down(); await page.mouse.move(empty.x + 100, empty.y - 40, { steps: 6 }); await page.mouse.up(); await wait(200);
  const c1 = await S(() => window.__lifeos.graph().camera);
  ok('10. Wheel zooms, drag empty space pans', k1 > k0 * 1.2 && Math.abs(c1.x - c0.x - 100) < 3, `k ${k0.toFixed(2)}→${k1.toFixed(2)}, dx ${(c1.x - c0.x).toFixed(0)}`);
  await page.keyboard.press('f'); await wait(700);

  // ---------- 11. search ----------
  await page.keyboard.press('/'); await wait(200);
  await page.keyboard.type('rewrite cv'); await wait(200);
  const firstRes = await S(() => document.querySelector('.pal-row.on')?.innerText.replace(/\s+/g, ' '));
  await page.keyboard.press('Enter'); await wait(900);
  const selNow = await S(() => window.__lifeos.ui.selected);
  ok('11. Search finds nested task (type + path) and focuses it on the map', selNow === taskId && /ACTION|NEXT ACTION/i.test(firstRes) && /Finance CV v2/.test(firstRes) && await S((id) => window.__lifeos.graph().has(id), taskId), firstRes);
  await shot('07-search-focus');

  // ---------- 12. switch views ----------
  const views = ['today', 'week', 'goals', 'projects', 'waiting', 'capacity', 'review', 'map'];
  let viewsOk = true;
  for (const [i, v] of views.entries()) {
    await page.keyboard.press('Escape');
    await page.keyboard.press(String(i + 2 > 8 ? 1 : i + 2)); await wait(350);
    const cur = await S(() => window.__lifeos.ui.view);
    if (cur !== v) viewsOk = false;
    await shot(`08-view-${v}`);
  }
  ok('12. Switch all views by keyboard', viewsOk);

  // ---------- 13. allocate resources (workflow 27) ----------
  await page.keyboard.press('7'); await wait(300);
  const viroraId = await findId('area', 'VIRORA');
  const engineId = await findId('project', 'Grammar Engine');
  await page.fill(`.ctable [data-alloc-target="${viroraId}"]`, '10'); await page.keyboard.press('Tab'); await wait(300);
  await page.click(`[data-act=cap-open][data-id="${viroraId}"]`); await wait(300);
  await page.fill(`.ctr-sub [data-alloc-target="${engineId}"]`, '10'); await page.keyboard.press('Tab'); await wait(300);
  for (const [label, h] of [['Engineering', 3], ['Product', 3], ['Content', 2], ['QA', 2]]) {
    await page.click('.ctr-sub [data-act=bd-add]'); await wait(200);
    const rows = await page.$$('.bd-row');
    const r = rows[rows.length - 1];
    await (await r.$('[data-bd$="|label"]')).fill(label);
    await (await r.$('[data-bd$="|label"]')).press('Tab'); await wait(120);
    const rows2 = await page.$$('.bd-row');
    const amt = await rows2[rows2.length - 1].$('[data-bd$="|amount"]');
    await amt.fill(String(h)); await amt.press('Tab'); await wait(150);
  }
  const alloc = await S((id) => window.__lifeos.store.data.allocations.find(a => a.targetId === id), engineId);
  const sumTxt = await S(() => document.querySelector('.bd-sum')?.textContent);
  ok('13. Allocate 10h to VIRORA project and split 3/3/2/2', alloc && alloc.amount === 10 && alloc.breakdown.map(b => b.label + b.amount).join(',') === 'Engineering3,Product3,Content2,QA2' && /✓/.test(sumTxt), sumTxt);
  // overallocate on purpose (workflow 28)
  const careerAllocIn = `.ctable [data-alloc-target="${careerId}"]`;
  await page.fill(careerAllocIn, '30'); await page.keyboard.press('Tab'); await wait(400);
  const verdict = await S(() => document.querySelector('.verdict')?.innerText);
  const t = await S(() => window.__lifeos.M.timeSummary());
  ok('Overallocation is shown explicitly (workflow 28)', t.over && /OVERALLOCATED/.test(verdict), verdict.split('\n')[0]);
  await shot('09-capacity-over');
  await page.fill(careerAllocIn, '8'); await page.keyboard.press('Tab'); await wait(300);

  // ---------- 14. waiting item ----------
  await page.keyboard.press('6'); await wait(300);
  await page.click('.vhead [data-act=create][data-type=waiting]');
  await page.fill('.dlg-form [name=title]', 'Reply about analyst internship');
  await page.fill('.dlg-form [name=who]', 'Bank recruiter');
  await page.selectOption('.dlg-form [name=projectId]', projId);
  await page.fill('.dlg-form [name=followUpAction]', 'Send a short follow-up note');
  await page.keyboard.press('Enter'); await wait(500);
  const wId = await findId('waiting', 'Reply about analyst internship');
  await page.keyboard.press('Escape');
  const inTable = await S(() => document.querySelectorAll('.wrow').length);
  ok('14. Create waiting item (appears in Waiting view)', !!wId && inTable >= 1);

  // ---------- 15. mark complete ----------
  await page.keyboard.press('2'); await wait(300);
  const firstActId = await findId('task', 'Extract university practical work into CV');
  await S((id) => { window.__lifeos.store.update(id, { plannedFor: new Date().toISOString().slice(0, 10) }); }, firstActId);
  await wait(200);
  const cb = await page.$(`[data-act=complete][data-id="${taskId}"]`);
  await cb.click(); await wait(400);
  const tdone = await S((id) => window.__lifeos.store.get(id).status, taskId);
  const cvFlag = await S((id) => window.__lifeos.M.projectFlags(window.__lifeos.store.get(id)).noNext, cvId);
  ok('15. Complete a next action; project is flagged when none remains', tdone === 'done' && cvFlag === true);
  await shot('10-today');

  // ---------- 16. weekly review ----------
  await page.keyboard.press('8'); await wait(300);
  await page.click('[data-act=review-start]'); await wait(300);
  await page.fill('[data-review=wins]', 'Finished the CV rewrite');
  for (let i = 0; i < 2; i++) { await page.click('[data-act=review-step]:has-text("Next")'); await wait(250); }
  // projects step: add missing next action for CV
  const q = await page.$(`.rv-proj [data-quick=task]`);
  if (q) { await q.fill('Write skills section'); await q.press('Enter'); await wait(300); }
  for (let i = 0; i < 4; i++) { await page.click('[data-act=review-step]:has-text("Next")'); await wait(250); }
  await page.fill('[data-review-out="0|title"]', 'CV experience section drafted');
  await page.selectOption('[data-review-out="0|serves"]', objId);
  await page.fill('[data-review-out="1|title"]', 'Grammar engine milestone chosen');
  await page.click('[data-act=review-finish]'); await wait(500);
  const rv = await S(() => ({ n: window.__lifeos.store.data.reviews.length, outs: window.__lifeos.store.data.objectives.filter(o => o.horizon === 'week').map(o => o.title), last: window.__lifeos.store.data.meta.lastReviewAt }));
  ok('16. Weekly review produces a weekly plan', rv.n === 1 && rv.outs.length === 2 && !!rv.last, JSON.stringify(rv.outs));
  await shot('11-review-summary');

  // ---------- 17. export ----------
  await page.click('[data-act=data-menu]'); await wait(200);
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('[data-m=export]')]);
  const exportPath = path.join(SHOTS, 'export.json');
  await dl.saveAs(exportPath);
  const exported = JSON.parse(require('fs').readFileSync(exportPath, 'utf8'));
  ok('17. Export JSON with schema version', exported.schemaVersion === 1 && exported.areas.length === 10 && exported.relationships.length >= 1 && Array.isArray(exported.reviews));

  // ---------- 18/19. refresh & persistence ----------
  const before = await S(() => ({ a: window.__lifeos.store.data.areas.length, p: window.__lifeos.store.data.projects.length, t: window.__lifeos.store.data.tasks.length, r: window.__lifeos.store.data.relationships.length, off: Object.keys(window.__lifeos.store.data.layout.offsets).length }));
  await page.reload(); await wait(800);
  const after = await S(() => ({ a: window.__lifeos.store.data.areas.length, p: window.__lifeos.store.data.projects.length, t: window.__lifeos.store.data.tasks.length, r: window.__lifeos.store.data.relationships.length, off: Object.keys(window.__lifeos.store.data.layout.offsets).length }));
  ok('18/19. Refresh — data and layout persist', JSON.stringify(before) === JSON.stringify(after), JSON.stringify(after));

  // ---------- 20. import ----------
  await S(() => { window.__lifeos.store.reset(); });
  await wait(300);
  await S(() => { const o = document.querySelector('.onb'); if (o) o.remove(); });
  await page.click('[data-act=data-menu]'); await wait(200);
  const [fc] = await Promise.all([page.waitForEvent('filechooser'), page.click('[data-m=import]')]);
  await fc.setFiles(exportPath); await wait(800);
  const imported = await S(() => ({ a: window.__lifeos.store.data.areas.length, p: window.__lifeos.store.data.projects.length, t: window.__lifeos.store.data.tasks.length, r: window.__lifeos.store.data.relationships.length, off: Object.keys(window.__lifeos.store.data.layout.offsets).length }));
  ok('20. Import exported data restores the system', JSON.stringify(imported) === JSON.stringify(before), JSON.stringify(imported));

  // ---------- 21. nothing breaks: tour all modes & views after import ----------
  await page.keyboard.press('1'); await wait(300);
  for (const m of ['relationships', 'resources', 'execution', 'map']) { await page.click(`[data-act=mode][data-mode=${m}]`); await wait(700); await shot(`12-mode-${m}`); }
  await page.click('[data-act=expand-all]'); await wait(1000); await shot('13-expand-all');
  for (const k of ['2', '3', '4', '5', '6', '7', '8', '1']) { await page.keyboard.press(k); await wait(200); }
  // delete + undo
  const del = await findId('area', 'Side Research');
  await page.keyboard.press('/'); await wait(150); await page.keyboard.type('Side Research'); await wait(150);
  await page.keyboard.press('Enter'); await wait(600);
  await shot('14-before-delete');
  await page.click('.inspector .insp-foot [data-act=delete]', { timeout: 3000 }); await wait(200);
  await page.click('.dialog [data-yes]'); await wait(600);
  const goneOk = !(await findId('area', 'Side Research'));
  await page.click('.toast button'); await wait(500);
  const back = !!(await findId('area', 'Side Research'));
  ok('Delete with fade + undo', goneOk && back);

  ok('21. No runtime errors', errs.length === 0, errs.slice(0, 5).join(' || '));
  console.log(results.join('\n'));
  console.log(`\nScreenshots: ${SHOTS}`);
  await browser.close();
  if (results.some((r) => r.startsWith('FAIL'))) process.exit(1);
})().catch(e => { console.log(results.join('\n')); console.error('TEST CRASH', e); process.exit(1); });
