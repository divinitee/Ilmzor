// Builds grammar-run/WORKLIST.tsv: every practice topic to author, in run order.
// Source of topics = the placement bank (src/lib/adaptiveGrammar/bank), the only
// topic inventory that exists (385 topics). Re-run any time; it re-reads the
// live banks so "status" is always current.
//   node grammar-run/make_worklist.mjs
import { readFileSync, readdirSync, existsSync, writeFileSync } from "node:fs";

const LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"];
const CORE = ["tenses", "nouns-articles", "questions-negation", "sentence-structure"]; // placement core set (D4, provisional)
const REST = ["pronouns", "verb-patterns", "adj-adv", "comparison", "modals", "prep-phrasal", "conditionals-wishes", "passive-causative", "reported-speech"];
const DOM_ORDER = [...CORE, ...REST];

const topics = {};
const branchOrder = {};
for (const f of readdirSync("src/lib/adaptiveGrammar/bank").filter((x) => x.endsWith(".js") && x !== "index.js")) {
  const s = readFileSync(`src/lib/adaptiveGrammar/bank/${f}`, "utf8");
  const d = (s.match(/domainBuilder\("([a-z-]+)"/) || [])[1];
  // one item per d.xxx({ ... }) call; read b, t, L, focus out of each
  for (const m of s.matchAll(/b: "([a-z-]+)", t: "([a-z0-9-]+)", L: "(A1|A2|B1|B2|C1|C2)"([^\n]*)/g)) {
    const k = `${d}.${m[1]}.${m[2]}`;
    const focus = (m[4].match(/focus: "([^"]+)"/) || [])[1] || "";
    (branchOrder[d] ||= []).includes(m[1]) || branchOrder[d].push(m[1]);
    const t = (topics[k] ||= { d, b: m[1], t: m[2], levels: [], focus: [] });
    t.levels.push(m[3]);
    if (focus && !t.focus.includes(focus)) t.focus.push(focus);
  }
}

const low = (t) => [...t.levels].sort((a, b) => LEVELS.indexOf(a) - LEVELS.indexOf(b))[0];
const wave = (t) => {
  const k = `${t.d}.${t.b}.${t.t}`;
  if (k.startsWith("tenses.present.")) return "A";
  const l = low(t);
  return l === "A1" || l === "A2" ? "B" : l === "B1" ? "C" : "D";
};
const status = (t) => {
  const k = `${t.d}.${t.b}.${t.t}`;
  if (!existsSync(`src/lib/grammarPractice/bank/${k}.js`)) return "todo";
  if (k === "tenses.present.third-person-s") return "rebuild"; // legacy, below the variance floor
  return "live";
};

const rows = Object.values(topics).sort((x, y) =>
  wave(x).localeCompare(wave(y)) ||
  DOM_ORDER.indexOf(x.d) - DOM_ORDER.indexOf(y.d) ||
  LEVELS.indexOf(low(x)) - LEVELS.indexOf(low(y)) ||
  branchOrder[x.d].indexOf(x.b) - branchOrder[y.d].indexOf(y.b) ||
  x.t.localeCompare(y.t));

const out = ["#\twave\ttopic\tlevel\tplacement_items\tstatus\tfocus (from the placement bank)"];
rows.forEach((t, i) => out.push([i + 1, wave(t), `${t.d}.${t.b}.${t.t}`, low(t), t.levels.length, status(t), t.focus.join(" | ")].join("\t")));
writeFileSync("grammar-run/WORKLIST.tsv", out.join("\n") + "\n");

const c = {};
for (const t of rows) { const w = wave(t), s = status(t); c[w] = c[w] || {}; c[w][s] = (c[w][s] || 0) + 1; }
console.log(`WORKLIST.tsv — ${rows.length} topics`, JSON.stringify(c));
