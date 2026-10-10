// Stage 3 correction checks (A, B, C, D + Back fix) against the REAL Coach /
// PracticeRunner / CoachTodayCard code with the mocked server (serverApi.mock.js).
import { chromium } from "playwright";
const OUT = process.argv[2] || ".";
const BASE = "http://localhost:5199/";
const results = []; const ok = (n, c, x = "") => { results.push([c, n]); console.log(`${c ? "PASS" : "FAIL"}  ${n}${!c && x ? " -> " + x : ""}`); };
const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" }).catch(() => chromium.launch());
const errors = [];
async function open(q) {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => { if ((m.type() === "error" || m.type() === "warning") && !/Failed to load resource|React Router Future Flag/.test(m.text())) errors.push(m.text().slice(0, 200)); });
  await page.goto(BASE + "?" + q);
  return page;
}
const vis = (p, t) => p.getByText(t, { exact: false }).first().isVisible().catch(() => false);
const log = (p) => p.evaluate(() => window.__log);
const onboard = async (p) => { await p.getByRole("button", { name: /Make my plan/ }).click(); await p.getByRole("button", { name: /Start/ }).waitFor(); };

// ---- C: card minutes come from the server, never hardcoded -------------------
for (const m of [10, 15, 20]) {
  const p = await open(`start=/&minutes=${m}`);
  await p.waitForTimeout(500);
  const txt = await p.getByTestId("coach-card-sub").innerText();
  ok(`C: card shows the server's minutes (${m})`, txt.startsWith(`${m} min`), txt);
  await p.close();
}
{ const p = await open("start=/&whoami=fail"); await p.waitForTimeout(500);
  const txt = await p.getByTestId("coach-card-sub").innerText();
  ok("C: whoami fails -> no number shown ('Picked for you')", txt === "Picked for you" && !/\d/.test(txt), txt); await p.close(); }
{ const p = await open("start=/&whoami=slow&minutes=20"); await p.waitForTimeout(200);
  const before = await p.getByTestId("coach-card-sub").innerText();
  await p.waitForTimeout(1800);
  const after = await p.getByTestId("coach-card-sub").innerText();
  ok("C: while loading -> no number; then the server value", before === "Picked for you" && after.startsWith("20 min"), `${before} | ${after}`); await p.close(); }

// ---- A: every planned item unavailable --------------------------------------
{ const p = await open("start=/coach&scenario=unavailable");
  await onboard(p);
  await p.getByRole("button", { name: /Start/ }).click();
  await p.getByText("We couldn't load your practice").waitFor({ timeout: 8000 }).catch(() => {});
  await p.screenshot({ path: `${OUT}/A-unavailable.png`, fullPage: true });
  const L = await log(p);
  ok("A: all items unavailable -> 'couldn't load' screen", await vis(p, "We couldn't load your practice"));
  ok("A: all items unavailable -> no 'Done' wording, no Keep going", !(await vis(p, "That's today's plan done")) && !(await vis(p, "Today's Practice is done")) && !(await p.getByRole("button", { name: /Keep going/ }).isVisible().catch(() => false)));
  ok("A: all items unavailable -> NOTHING submitted (no fabricated evidence)", L.filter((e) => e.kind === "submit:start").length === 0, JSON.stringify(L.filter((e) => e.kind.startsWith("submit"))));
  await p.getByRole("button", { name: /Try again/ }).click();
  await p.waitForTimeout(500);
  ok("A: 'Try again' -> the items are still in the plan", await vis(p, "past") || (await p.getByRole("button", { name: /Start/ }).isVisible()));
  await p.close(); }

// ---- A: partly unavailable --------------------------------------------------
{ const p = await open("start=/coach&scenario=partial");
  await onboard(p);
  await p.getByRole("button", { name: /Start/ }).click();
  for (let k = 0; k < 6; k++) {
    if (await vis(p, "What does it mean?") || await vis(p, "Which English word?")) {
      await p.locator(".premium-card .grid button").first().click();
      await p.getByRole("button", { name: /^Next$/ }).click().catch(() => {});
    }
    await p.waitForTimeout(300);
    if (await vis(p, "couldn't load. They stay in your plan")) break;
  }
  await p.screenshot({ path: `${OUT}/A-partial.png`, fullPage: true });
  const L = await log(p);
  const subs = L.filter((e) => e.kind === "submit:start");
  ok("A: partly unavailable -> Done + '1 item(s) couldn't load' note", await vis(p, "That's today's plan done") && await vis(p, "1 item(s) couldn't load"));
  ok("A: partly unavailable -> only the completed word was submitted (1 quiz round, no grammar)", subs.length === 1 && subs[0].detail.game === "quiz", JSON.stringify(subs.map((e) => e.detail)));
  ok("A + B: session not complete on the server -> NO Keep going", !(await p.getByRole("button", { name: /Keep going/ }).isVisible().catch(() => false)) && await vis(p, "That's all the guided practice for today"));
  await p.close(); }

// ---- Back during a session sends queued answers first -----------------------
{ const p = await open("start=/coach&scenario=normal");
  await onboard(p);
  await p.getByRole("button", { name: /Start/ }).click();
  await p.getByText("What does it mean?").waitFor();
  await p.locator(".premium-card .grid button").first().click();   // 1 of 3 questions answered (queued, unsent)
  await p.getByRole("button", { name: "Back" }).click();
  await p.getByRole("button", { name: /Start/ }).waitFor({ timeout: 8000 });
  const L = await log(p);
  const iBack = L.findIndex((e) => e.kind === "submit:start");
  const sub = L[iBack];
  const iEnd = L.findIndex((e, i) => i > iBack && e.kind === "submit:end");
  const iReload = L.findIndex((e, i) => i > iEnd && e.kind === "coachApi:getToday");
  ok("Back: the partial word answer is sent (1 real answer) WITHOUT the Coach session_key", !!sub && sub.detail.game === "quiz" && sub.detail.n === 1 && sub.detail.session_key === undefined, JSON.stringify(sub));
  ok("Back: the plan reloads only AFTER that answer is saved", iEnd > iBack && iReload > iEnd);
  ok("Back: the unfinished word is still in today's plan", await vis(p, "apple"));
  ok("Back: no Keep going offered (session not complete)", !(await p.getByRole("button", { name: /Keep going/ }).isVisible().catch(() => false)));
  await p.close(); }


// ---- Back AFTER finishing a word: that word's answers carry the session_key ----
{ const p = await open("start=/coach&scenario=normal");
  await onboard(p);
  await p.getByRole("button", { name: /Start/ }).click();
  for (let k = 0; k < 3; k++) {
    await p.getByText(/What does it mean\?|Which English word\?/).first().waitFor();
    await p.locator(".premium-card .grid button").first().click();
    await p.getByRole("button", { name: /^Next$/ }).click();
  }
  await p.locator("button:has(span:text-is('A'))").first().waitFor({ timeout: 8000 });
  await p.getByRole("button", { name: "Back" }).click();
  await p.getByRole("button", { name: /Start/ }).waitFor({ timeout: 8000 });
  const subs = (await log(p)).filter((e) => e.kind === "submit:start");
  ok("finished word -> its 3 answers sent WITH the session_key (before grammar); Back sends nothing extra", subs.length === 1 && subs[0].detail.n === 3 && subs[0].detail.session_key === "2026-10-08:today:0", JSON.stringify(subs.map((e) => e.detail)));
  ok("finished word no longer in the plan; unfinished items remain", !(await vis(p, "apple")) && await vis(p, "bread"));
  await p.close(); }

// ---- D: grammar round outside Coach (unchanged) vs inside Coach -------------
async function playRound(p) {
  for (let k = 0; k < 40; k++) {
    const a = p.locator("button:has(span:text-is('A'))").first();
    if (await a.isVisible().catch(() => false) && await a.isEnabled().catch(() => false)) {
      await a.click();
      await p.getByRole("button", { name: /^Check$/ }).click();
      const btn = p.getByRole("button", { name: /^(Next|Finish)/ }).first();
      const label = await btn.innerText();
      await btn.click();
      if (/Finish/.test(label)) return true;
    } else await p.waitForTimeout(100);
  }
  return false;
}
{ const p = await open("start=/practice&mode=plain");
  await p.waitForTimeout(500);
  const finished = await playRound(p);
  await p.waitForTimeout(150);
  const L = await log(p);
  const started = L.some((e) => e.kind === "submit:start"), endedYet = L.some((e) => e.kind === "submit:end");
  const resultShown = await p.getByRole("button", { name: /^Done$/ }).isVisible().catch(() => false);
  ok("D plain: result screen appears immediately (save NOT awaited, as before)", finished && resultShown && started && !endedYet, JSON.stringify({ finished, resultShown, started, endedYet }));
  ok("D plain: 'Practise again' is still offered", await p.getByRole("button", { name: /Practise again/ }).isVisible());
  const payload = L.find((e) => e.kind === "submit:start")?.detail;
  ok("D plain: payload carries no coach key", payload && payload.game === "grammar_practice" && !payload.session_key, JSON.stringify(payload));
  await p.getByRole("button", { name: /^Done$/ }).click();
  ok("D plain: result 'Done' still calls onExit (no onFinish passed)", (await p.locator("#ended").innerText()) === "exit");
  await p.close(); }
{ const p = await open("start=/practice&mode=coach");
  await p.waitForTimeout(500);
  const finished = await playRound(p);
  await p.waitForTimeout(150);
  const midShown = await p.getByRole("button", { name: /^Done$/ }).isVisible().catch(() => false);
  await p.getByRole("button", { name: /^Done$/ }).waitFor({ timeout: 5000 });
  const L = await log(p);
  ok("D coach: result waits for the save (not shown while saving, shown after submit:end)", finished && !midShown && L.some((e) => e.kind === "submit:end"));
  ok("D coach: no 'Practise again'", !(await p.getByRole("button", { name: /Practise again/ }).isVisible().catch(() => false)));
  ok("D coach: payload carries the session_key", L.find((e) => e.kind === "submit:start")?.detail.session_key === "2026-10-08:today:0");
  await p.getByRole("button", { name: /^Done$/ }).click();
  ok("D coach: result 'Done' calls onFinish (completed), not onExit", (await p.locator("#ended").innerText()) === "finish");
  await p.close(); }
{ const p = await open("start=/practice&mode=coach");
  await p.waitForTimeout(500);
  await p.getByRole("button", { name: /^Exit$/ }).click();
  const L = await log(p);
  ok("D coach: Exit mid-round calls onExit ('left') and sends nothing", (await p.locator("#ended").innerText()) === "exit" && !L.some((e) => e.kind === "submit:start"));
  await p.close(); }

ok("no runtime errors in the console", errors.length === 0, errors.slice(0, 4).join(" | "));
console.log(`\n${results.filter((r) => r[0]).length} passed, ${results.filter((r) => !r[0]).length} failed`);
await browser.close();
