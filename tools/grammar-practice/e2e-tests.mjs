import bank from "../../src/lib/grammarPractice/bank/tenses.present.simple-routine.js";
import { composeRound } from "../../src/lib/grammarPractice/composition.js";
import { gradeItem, scoreRound, emptyResponse, hasResponse } from "../../src/lib/grammarPractice/grading.js";
let pass=0, fail=0; const ok=(n,c,x="")=>{c?pass++:fail++;console.log(`  ${c?"PASS":"FAIL"}  ${n}${!c&&x?" -> "+x:""}`)};

for (const stage of ["choose","build","transform"]) {
  const r = composeRound({ items: bank, stage, size: 10, seed: 7 });
  ok(`${stage}: composes a full round`, r.items.length === 10);
  // a perfect student
  const right = r.items.map((it) => it.format === "mcq" ? it.key : it.key);
  ok(`${stage}: correct answers score 100%`, scoreRound(r.items, right).pct === 100);
  // a student who answers everything wrong
  const wrong = r.items.map((it) =>
    it.format === "mcq" ? (it.key + 1) % it.options.length
      : Array.isArray(it.key) ? it.key.map(() => "zzz") : "zzz");
  ok(`${stage}: wrong answers score 0%`, scoreRound(r.items, wrong).pct === 0);
  // every item can be answered and every empty starts unanswered
  ok(`${stage}: empty response is never submittable`,
     r.items.every((it) => !hasResponse(it, emptyResponse(it))));
  // typed items forgive case/spacing but not form
  const sloppy = r.items.map((it) => it.format === "mcq" ? it.key
    : Array.isArray(it.key) ? it.key.map((k) => ` ${k.toUpperCase()} `) : ` ${it.key.toUpperCase()} `);
  ok(`${stage}: sloppy capitals and spacing still score 100%`, scoreRound(r.items, sloppy).pct === 100);
}

// the contraction variants the ingester added must actually be accepted
const neg = bank.find((i) => i.acceptable?.length);
ok("ingested acceptable variant grades correct", gradeItem(neg, neg.acceptable[0]).correct,
   JSON.stringify({ key: neg.key, alt: neg.acceptable }));

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail?1:0);
