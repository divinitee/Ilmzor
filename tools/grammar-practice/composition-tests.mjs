import bank from "../../src/lib/grammarPractice/bank/tenses.present.third-person-s.js";
import { composeRound, recordSeen, expandPool, renderItem, rng, poolSizes, variantCount }
  from "../../src/lib/grammarPractice/composition.js";

let pass = 0, fail = 0;
const ok = (name, cond, extra = "") => {
  cond ? pass++ : fail++;
  console.log(`  ${cond ? "PASS" : "FAIL"}  ${name}${extra && !cond ? " -> " + extra : ""}`);
};

console.log("=== determinism ===");
const a = composeRound({ items: bank, stage: "choose", size: 8, seed: 42 });
const b = composeRound({ items: bank, stage: "choose", size: 8, seed: 42 });
const c = composeRound({ items: bank, stage: "choose", size: 8, seed: 43 });
ok("same seed reproduces the round exactly", JSON.stringify(a) === JSON.stringify(b));
ok("different seed produces a different round", JSON.stringify(a) !== JSON.stringify(c));

console.log("=== slot expansion ===");
const build = bank.filter((i) => i.stage === "build");
const pool = expandPool(build);
ok("pool equals the sum of per-item variant counts",
  pool.length === build.reduce((n, i) => n + variantCount(i), 0), String(pool.length));
const r = composeRound({ items: bank, stage: "build", size: 20, seed: 7 });
const leftover = r.items.filter((i) => /\{\w+\}/.test(`${i.source || ""}${i.prompt || ""}${i.hint || ""}`));
ok("no unresolved placeholders survive rendering", leftover.length === 0,
  leftover.map((i) => i.source).join(" | "));
ok("rendered items carry no slots object", r.items.every((i) => i.slots === undefined));
const multi = build.find((i) => variantCount(i) > 1);
const v0 = renderItem({ item: multi, variantIndex: 0, variantId: "x" }, rng(1));
const v1 = renderItem({ item: multi, variantIndex: 1, variantId: "y" }, rng(1));
ok("different variant indexes give different sentences", v0.source !== v1.source);

console.log("=== mcq shuffling ===");
const mcqRound = composeRound({ items: bank, stage: "choose", size: 20, seed: 99 });
const keyStillCorrect = mcqRound.items.every((it) => {
  const orig = bank.find((o) => o.id === it.id);
  return it.options[it.key] === orig.options[orig.key];
});
ok("key remaps so options[key] is still the correct answer", keyStillCorrect);
const positions = new Set(mcqRound.items.map((i) => i.key));
ok("shuffling spreads the answer across positions", positions.size >= 3, [...positions].join(","));
const cycled = mcqRound.items.every((it, i) => it.key === i % 4);
ok("answer position is not a predictable cycle", !cycled);

console.log("=== repeat distance ===");
let hist = {};
const seenIds = [];
for (let i = 0; i < 3; i += 1) {
  const round = composeRound({ items: bank, stage: "build", size: 10, seed: 100 + i, history: hist });
  seenIds.push(...round.variantIds);
  hist = recordSeen(hist, round.variantIds);
}
ok("30 draws from a 58-variant pool produce no repeat", new Set(seenIds).size === seenIds.length,
  `${seenIds.length - new Set(seenIds).size} repeats`);
ok("history records every served variant", Object.keys(hist).length === 30);

console.log("=== exhaustion is reported honestly ===");
const small = composeRound({ items: bank, stage: "express", size: 10, seed: 5 });
ok("asking for more than exists sets exhausted", small.exhausted === true);
ok("and returns what it has rather than padding", small.items.length === 5);

console.log("=== the 60-minute question, measured ===");
const sizes = poolSizes(bank);
console.log("   pool per stage (after expansion):", JSON.stringify(sizes));
let h = {}, draws = 0, firstRepeat = null;
const served = new Set();
while (draws < 240) {
  const round = composeRound({ items: bank, stage: "choose", size: 10, seed: draws, history: h });
  for (const id of round.variantIds) {
    draws += 1;
    if (served.has(id) && firstRepeat === null) firstRepeat = draws;
    served.add(id);
  }
  h = recordSeen(h, round.variantIds);
}
console.log(`   240 draws at the choose stage -> first repeat at draw ${firstRepeat}`);
ok("one topic alone cannot carry an hour of the choose stage", firstRepeat !== null && firstRepeat <= sizes.choose + 1);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
