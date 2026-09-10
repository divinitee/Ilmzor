import { tierFor, bestStreak, summarise } from "/app/src/lib/grammarPractice/feedback.js";
let pass=0, fail=0;
const t=(name,cond)=>{ if(cond){pass++;console.log("  PASS "+name);} else {fail++;console.log("  FAIL "+name);} };

console.log("=== tiers ===");
t("100% is perfect", tierFor(100)==="perfect");
t("90% is strong", tierFor(90)==="strong");
t("89% falls to solid", tierFor(89)==="solid");
t("70% is solid", tierFor(70)==="solid");
t("69% falls to shaky", tierFor(69)==="shaky");
t("50% is shaky", tierFor(50)==="shaky");
t("49% is early", tierFor(49)==="early");
t("0% is early", tierFor(0)==="early");

console.log("=== streak ===");
const g=(...b)=>b.map((c,i)=>({correct:c,expected:"x",item:{variantId:"v"+i,prompt:"p",why:"w"}}));
t("all correct", bestStreak(g(1,1,1,1,1))===5);
t("broken run takes the longest", bestStreak(g(1,1,0,1,1,1))===3);
t("none correct", bestStreak(g(0,0,0))===0);
t("trailing run counts", bestStreak(g(0,1,1))===2);

console.log("=== summary ===");
const s=summarise(g(1,1,0,1,0,1,1,1,1,1));
t("counts correct", s.correct===8 && s.total===10);
t("percentage", s.pct===80);
t("tier from percentage", s.tier==="solid");
t("streak", s.streak===5);
t("misses only", s.missed.length===2);
t("miss carries the answer", s.missed[0].expected==="x");
const perfect=summarise(g(1,1,1));
t("perfect round has no review list", perfect.missed.length===0 && perfect.tier==="perfect");
t("empty round does not divide by zero", summarise([]).pct===0);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail?1:0);
