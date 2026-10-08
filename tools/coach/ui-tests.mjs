// Stage 3 pure UI helpers: node --experimental-strip-types tools/coach/ui-tests.mjs
import { buildWordQuestions, evidenceItem, grammarPath, stageForDepth, WORD_QUESTIONS } from "../../src/lib/coach/wordCheck.js";
import { coachT, labelKey, reasonKey } from "../../src/lib/coach/coachCopy.js";
import { DEPTHS } from "../../base44/shared/coachPlan.js";
import { LIVE_GRAMMAR_TOPICS } from "../../base44/shared/coachGraph.js";
let pass = 0, fail = 0;
const ok = (n, c) => { c ? pass++ : fail++; console.log(`  ${c ? "PASS" : "FAIL"}  ${n}`); };
let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const W = (id, en, uz, ru) => ({ id, english: en, uzbek: uz, russian: ru });
const target = W("t", "apple", "olma", "яблоко");
const pool = [target, W("a", "pear", "nok", "груша"), W("b", "bread", "non", "хлеб"), W("c", "water", "suv", "вода"), W("d", "milk", "sut", "молоко")];
for (const depth of Object.keys(DEPTHS)) ok(`every plan depth has a word question count (${depth})`, WORD_QUESTIONS[depth] >= 1);
const qs = buildWordQuestions(target, pool, { depth: "remediation", lang: "uz", rnd });
ok("remediation word -> 3 questions, alternating types", qs.length === 3 && qs[0].type === "multiple_choice" && qs[1].type === "translation");
ok("each question has the correct answer exactly once and 4 unique options", qs.every((q) => q.options.filter((o) => o === q.correct).length === 1 && new Set(q.options).size === q.options.length && q.options.length === 4));
ok("multiple_choice answer = native (uz), translation answer = english", qs[0].correct === "olma" && qs[1].correct === "apple");
ok("ru learners get russian", buildWordQuestions(target, pool, { depth: "probe", lang: "ru", rnd })[0].correct === "яблоко");
ok("no translation -> no questions (never fake evidence)", buildWordQuestions(W("x", "zzz", "", ""), pool, { depth: "probe", lang: "uz" }).length === 0);
ok("too few distractors -> no questions", buildWordQuestions(target, [target, pool[1]], { depth: "probe", lang: "uz" }).length === 0);
const ev = evidenceItem(target, qs[0], "olma");
ok("evidence item matches the server's quiz grading contract", ev.word_id === "t" && ev.type === "multiple_choice" && ev.given === "olma" && ev.correct === true);
ok("every live grammar topic maps to a bank path", LIVE_GRAMMAR_TOPICS.every((k) => { const p = grammarPath(`grammar:${k}`); return p && p.join(".") === k; }));
ok("hub items never map to a practice bank", grammarPath("grammar:hub.articles") === null);
ok("weak/new grammar starts at choose; practice -> build", stageForDepth("remediation") === "choose" && stageForDepth("probe") === "choose" && stageForDepth("practice") === "build" && stageForDepth("brushup") === "transform");
for (const lang of ["en", "uz", "ru"]) for (const p of ["vira", "velvet", "vi"]) {
  const t = coachT(lang, p);
  ok(`copy complete: ${lang}/${p}`, ["today_title", "start", "keep_going", "done_title", "hello", "map_title", "nothing_title", "label_weak"].every((k) => t(k, { n: 10 }) && t(k, { n: 10 }) !== k && !/round/i.test(t(k, { n: 10 }))));
}
ok("server labels map to localized keys", ["New", "Needs work", "Practising", "Strong"].map(labelKey).join() === "label_new,label_weak,label_learning,label_solid");
ok("server short reasons map", reasonKey("Due") === "review_due" && reasonKey("Needs work") === "reason_weak" && reasonKey("New") === "reason_new" && reasonKey("Practice") === "reason_practice");
console.log(`\n${pass} passed, ${fail} failed`);
