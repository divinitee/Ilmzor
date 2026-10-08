import { chromium } from "playwright";
const OUT = process.argv[2];
const results = []; const ok = (n, c, x = "") => { results.push([c, n]); console.log(`${c ? "PASS" : "FAIL"}  ${n}${!c && x ? " -> " + x : ""}`); };
const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" }).catch(() => chromium.launch());
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
const errors = []; page.on("pageerror", (e) => errors.push(String(e))); page.on("console", (m) => { if ((m.type() === "error" || m.type() === "warning") && !/Failed to load resource|React Router Future Flag/.test(m.text())) errors.push(m.text().slice(0, 200)); }); // external fonts are unreachable in this sandbox
const shot = (n) => page.screenshot({ path: `${OUT}/${n}.png`, fullPage: true });
const vis = (t) => page.getByText(t, { exact: false }).first().isVisible().catch(() => false);
const log = () => page.evaluate(() => window.__log);

await page.goto("http://localhost:5199/?start=/coach&lang=en");
await page.getByText("Meet your coach").waitFor({ timeout: 15000 });
await shot("01-onboarding");
ok("onboarding: goal + minutes pickers for Velvet", await vis("Build my vocabulary") && await vis("15 min") && await vis("20 min"));
await page.getByText("Build my vocabulary").click(); await page.getByText("15 min").click();
await page.getByRole("button", { name: /Make my plan/ }).click();
await page.getByText("Today's Practice").first().waitFor();
await page.waitForTimeout(400);
await shot("02-plan");
ok("plan lists the 3 server items with real names", await vis("apple") && await vis("simple routine") && await vis("bread"));
ok("reason chips localised (Needs work / New / Due for review)", await vis("Needs work") && await vis("Due for review"));
await page.getByRole("button", { name: /Start/ }).click();

async function runSession(tag) {
  const counts = { word: 0, grammar: 0 };
  for (let step = 0; step < 80; step++) {
    await page.waitForTimeout(150);
    if (await page.getByRole("button", { name: /Keep going/ }).isVisible().catch(() => false)) return { counts, end: "keep" };
    if (await vis("That's all the guided practice for today")) return { counts, end: "final" };
    const wordQ = (await vis("What does it mean?")) || (await vis("Which English word?"));
    if (wordQ) {
      if (counts.word === 0) await shot(`${tag}-word`);
      try {
        await page.locator(".premium-card .grid button").first().click({ timeout: 3000 });
        counts.word++;
        await page.getByRole("button", { name: /^Next$/ }).click({ timeout: 3000 });
      } catch { /* re-render mid-click: loop re-reads the screen */ }
      continue;
    }
    const optA = page.locator("button:has(span:text-is('A'))").first();
    if (await optA.isVisible().catch(() => false) && await optA.isEnabled().catch(() => false)) {
      if (counts.grammar === 0) await shot(`${tag}-grammar`);
      await optA.click();
      await page.getByRole("button", { name: /^Check$/ }).click();
      counts.grammar++;
      const nextBtn = page.getByRole("button", { name: /^(Next|Finish)/ });
      await nextBtn.first().click();
      continue;
    }
    const doneBtn = page.getByRole("button", { name: /^Done$/ });
    if (await doneBtn.isVisible().catch(() => false)) { await shot(`${tag}-grammar-result`); await doneBtn.click(); continue; }
  }
  return { counts, end: "stuck" };
}
const s1 = await runSession("03-today");
await shot("04-done-today");
ok("today's session ran word + grammar + word and reached Done", s1.end === "keep" && s1.counts.word === 5 && s1.counts.grammar >= 3, JSON.stringify(s1));
let L = await log();
const subs = L.filter((e) => e.kind === "submit:start");
ok("3 submissions, all tagged with today's session_key (quiz, grammar, quiz)", subs.length === 3 && subs.every((e) => e.detail.session_key === "2026-10-08:today:0") && subs.map((e) => e.detail.game).join() === "quiz,grammar_practice,quiz", JSON.stringify(subs.map((e) => e.detail)));
const ordered = (L) => { // every getToday after a submit starts must come after that submit ended
  let open = 0, bad = 0; for (const e of L) { if (e.kind === "submit:start") open++; if (e.kind === "submit:end") open--; if (e.kind === "coachApi:getToday" && open > 0) bad++; } return bad === 0; };
ok("no getToday while a submission is in flight (Done computed after evidence)", ordered(L));
ok("Done shows Keep going because the SERVER said available", await vis("A fresh plan from what you just did"));

await page.getByRole("button", { name: /Keep going/ }).click();
const s2 = await runSession("05-cont");
await shot("06-done-final");
L = await log();
const cs = L.filter((e) => e.kind === "submit:start" && String(e.detail.session_key).includes("continuation"));
ok("continuation ran its own queue with its own session_key (grammar LAST)", s2.end === "final" && cs.length === 2 && cs[1].detail.game === "grammar_practice", JSON.stringify(s2) + JSON.stringify(cs.map((e) => e.detail)));
ok("grammar-last race: getToday only after the grammar submit finished", ordered(L));
const gEnd = L.findIndex((e) => e.kind === "submit:end" && e.detail.game === "grammar_practice" && String(e.detail.session_key).includes("continuation"));
const resultShownAfter = gEnd >= 0;
ok("after the only continuation: no Keep going, server says none left", !(await page.getByRole("button", { name: /Keep going/ }).isVisible().catch(() => false)) && resultShownAfter);
ok("startContinuation called exactly once", L.filter((e) => e.kind === "coachApi:startContinuation").length === 1);

await page.getByRole("button", { name: /Your map/ }).click().catch(() => {});
await page.waitForTimeout(600);
await shot("07-map");
ok("Learner Map renders labels + names", await vis("Needs work") && await vis("Strong") && await vis("apple"));

await page.goto("http://localhost:5199/?start=/&lang=uz");
await page.waitForTimeout(800);
await shot("08-home-card-uz");
ok("Home card (uz): Velvet · Bugungi mashg'ulot", await vis("Velvet") && await vis("Bugungi mashg'ulot"));
await page.goto("http://localhost:5199/?start=/coach&lang=ru");
await page.getByRole("button", { name: /Составить план/ }).click();
await page.waitForTimeout(600);
await shot("09-plan-ru");
ok("Plan (ru) renders", await vis("Практика на сегодня"));
ok("no runtime errors in the console", errors.length === 0, errors.slice(0, 5).join(" | "));
console.log(`\n${results.filter((r) => r[0]).length} passed, ${results.filter((r) => !r[0]).length} failed`);
await browser.close();
