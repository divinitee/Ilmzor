// Content lint for one authored topic, run BEFORE ingest. ingest.mjs checks
// structure (slots, arity, variance, duplicates); this checks the English and
// the marking traps that structure checks can't see. Written 2026-10-07 for
// the grammar production run.
//
//   node tools/grammar-practice/lint-topic.mjs content/grammar-practice/<d>.<b>.<t>.json
//
// FAIL = fix the content and re-run (exit 1). FLAG = look at it; fix it or say
// in the progress log why it's fine. Never edit this file to make a topic pass.
import { readFileSync, readdirSync } from "node:fs";

const file = process.argv[2];
if (!file) { console.error("usage: lint-topic.mjs <topic.json>"); process.exit(1); }
const items = JSON.parse(readFileSync(file, "utf8"));
const fails = [], flags = [];
const F = (m) => fails.push(m), G = (m) => flags.push(m);
const COUNTS = { choose: 20, build: 20, transform: 15, create: 8, express: 5 };
const LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"];

// ---- topic identity vs the placement inventory (the topic list the map uses)
const { domain, branch, topic, level } = items[0] || {};
for (const it of items) {
  if (it.domain !== domain || it.branch !== branch || it.topic !== topic) F(`mixed topic fields in one file (${it.domain}.${it.branch}.${it.topic})`);
  if (it.level !== level) F(`mixed levels in one file (${it.level} vs ${level})`);
}
if (!file.endsWith(`${domain}.${branch}.${topic}.json`)) F(`file name must be ${domain}.${branch}.${topic}.json`);
const inv = {};
for (const f of readdirSync("src/lib/adaptiveGrammar/bank").filter((x) => x.endsWith(".js") && x !== "index.js")) {
  const s = readFileSync(`src/lib/adaptiveGrammar/bank/${f}`, "utf8");
  const d = (s.match(/domainBuilder\("([a-z-]+)"/) || [])[1];
  for (const m of s.matchAll(/b: "([a-z-]+)", t: "([a-z0-9-]+)", L: "(A1|A2|B1|B2|C1|C2)"/g)) {
    const k = `${d}.${m[1]}.${m[2]}`;
    (inv[k] ||= []).push(m[3]);
  }
}
const key = `${domain}.${branch}.${topic}`;
if (!inv[key]) F(`${key} is not a topic in the placement bank — use the exact slug from WORKLIST.tsv`);
else {
  const low = inv[key].sort((a, b) => LEVELS.indexOf(a) - LEVELS.indexOf(b))[0];
  if (level !== low) G(`level ${level} differs from the placement bank's lowest level for this topic (${low}) — say why in the log`);
}

// ---- counts
const byStage = {};
for (const it of items) byStage[it.stage] = (byStage[it.stage] || 0) + 1;
for (const [s, n] of Object.entries(COUNTS)) if ((byStage[s] || 0) !== n) F(`${s}: ${byStage[s] || 0} items, need ${n}`);

// ---- helpers
const VOWEL_SOUND = (w) => {
  const x = w.toLowerCase().replace(/^[^a-z0-9]+/, "");
  if (/^(uni|use|usu|uti|eu|ewe|one|once|ufo|ukr|ura)/.test(x)) return false; // "a university", "a European"
  if (/^(hour|honest|honou?r|heir)/.test(x)) return true;                     // "an hour"
  if (/^(8|11|18|80)/.test(x)) return true;
  return /^[aeiou]/.test(x);
};
// Words whose British/American spellings differ: a typed answer containing one
// marks the other spelling wrong unless `acceptable` lists it.
const SPLIT = /\b(\w+(?:ll(?:ing|ed|er))|\w*(?:our|ours)|\w+(?:is|iz)(?:e|es|ed|ing|ation)|centre|theatre|metre|litre|programme|practise[sd]?|practising|grey|gray|mum|mom|catalogue|dialogue|defence|licence|cheque|tyre|jewellery|aluminium|fulfil|enrol|travel(?:ler|er)s?)\b/i;
const SPLIT_OK = /\b(fall|full|tell|sell|call|kill|fill|spell|smell|well|will|still|till|ball|hall|wall|mall|tall|bell|shell|yell|pull|roll|poll|bill|hill|skill|chill|drill|thrill|spill|grill|our|ours|four|hour|hours|your|yours|tour|pour|sour|flour|journey|course|source|court|this|his|is|raise|praise|rise|arise|wise|noise|exercise|advise|advice|surprise|promise|size|prize|seize|otherwise|paradise|precise|concise|enterprise|televise|revise|despise|compromise|merchandise|demise|premise|treatise|expertise|disguise|cruise|bruise|liaise|fizz|quiz|whizz|calling|selling|telling|falling|filling|killing|spelling|smelling|willing|pulling|rolling|yelling|filled|called|killed|spelled|smelled|pulled|rolled|yelled|seller|teller|caller|killer|smaller|taller|stiller|driller|thriller|speller|fuller)\b/i;
const sentenceOf = (it) => it.prompt || it.source || "";
const words = (s) => s.split(/\s+/).filter(Boolean).length;

const seq = {};
for (const it of items) {
  seq[it.stage] = (seq[it.stage] || 0) + 1;
  const id = `${it.stage}#${seq[it.stage]}`;
  const det = ["choose", "build", "transform"].includes(it.stage);
  const text = [it.prompt, it.source, it.hint].filter(Boolean).join(" || ");
  const slots = it.slots || {};

  if (det) {
    if (!it.why || words(it.why) < 4) F(`${id}: missing or empty "why"`);
    if (it.why && /\{[a-z_]+\}/.test(it.why)) F(`${id}: "why" contains a slot placeholder`);
  }
  if (/ {2,}/.test(text)) F(`${id}: double space`);
  const main = sentenceOf(it);
  if (det && main && !/[.?!]["')]?$/.test(main.trim())) G(`${id}: sentence does not end with . ? or !`);
  if (det && words(main) > 28) G(`${id}: ${words(main)} words — long for one practice sentence`);

  // MCQ integrity
  if (it.format === "mcq") {
    const o = it.options || [];
    if (o.length !== 4) F(`${id}: ${o.length} options, need 4`);
    if (new Set(o.map((x) => String(x).trim().toLowerCase())).size !== o.length) F(`${id}: two options are the same`);
    if (!Number.isInteger(it.key) || it.key < 0 || it.key >= o.length) F(`${id}: key must be an option index 0-${o.length - 1}`);
    if (o.some((x) => /\{[a-z_]+\}/.test(x))) F(`${id}: an option contains a slot placeholder`);
  }

  // typed answers
  if (det && it.format !== "mcq") {
    const keys = Array.isArray(it.key) ? it.key : [it.key];
    if (keys.some((k) => typeof k !== "string" || !k.trim())) F(`${id}: empty key`);
    if (keys.some((k) => /\{[a-z_]+\}/.test(k))) F(`${id}: key contains a slot placeholder — the key must not depend on a slot`);
    for (const k of keys) {
      const hit = (String(k).match(new RegExp(SPLIT, "gi")) || []).filter((w) => !SPLIT_OK.test(w));
      if (hit.length && !(it.acceptable || []).length) F(`${id}: typed key "${k}" has a British/American spelling split (${hit.join(", ")}) — pick another verb or list the other spelling in "acceptable"`);
    }
    if (typeof it.key === "string" && /'s\b|'d\b/.test(it.key) && !(it.acceptable || []).length)
      G(`${id}: key "${it.key}" uses 's or 'd — ingest does not expand these; add the full form to "acceptable"`);
  }

  // slots
  for (const [name, fill] of Object.entries(slots)) {
    if (!Array.isArray(fill) || fill.length < 2) { F(`${id}: slot {${name}} needs at least 2 fillers`); continue; }
    if (fill.some((f) => !String(f).trim())) F(`${id}: slot {${name}} has an empty filler`);
    if (new Set(fill.map((f) => f.toLowerCase())).size !== fill.length) F(`${id}: slot {${name}} repeats a filler`);
    // a / an agreement in front of the slot
    for (const m of text.matchAll(new RegExp(`\\b(a|an|A|An) \\{${name}\\}`, "g"))) {
      const art = m[1].toLowerCase();
      for (const f of fill) {
        if (art === "a" && VOWEL_SOUND(f)) F(`${id}: "a {${name}}" with filler "${f}" → "a ${f}"`);
        if (art === "an" && !VOWEL_SOUND(f)) F(`${id}: "an {${name}}" with filler "${f}" → "an ${f}"`);
      }
    }
    // filler that starts with an article placed after an article
    for (const m of text.matchAll(new RegExp(`\\b(a|an|the|A|An|The) \\{${name}\\}`, "g")))
      for (const f of fill) if (/^(a|an|the)\s/i.test(f)) F(`${id}: "${m[1]} {${name}}" with filler "${f}" doubles the article`);
  }

  // create / express need their rubric fields
  if (it.stage === "create" && (!it.prompt || !it.requiredElement || !(it.constraints || []).length)) F(`${id}: create needs prompt, requiredElement, constraints`);
  if (it.stage === "express" && (!it.prompt || !it.targetGrammar || !(it.lookFor || []).length)) F(`${id}: express needs prompt, targetGrammar, lookFor`);
}

// sameness: many items in a stage opening with the same four words
for (const s of ["choose", "build", "transform"]) {
  const open = {};
  for (const it of items.filter((x) => x.stage === s)) {
    const k = sentenceOf(it).split(/\s+/).slice(0, 4).join(" ").toLowerCase();
    open[k] = (open[k] || 0) + 1;
  }
  for (const [k, n] of Object.entries(open)) if (n > 3) G(`${s}: ${n} items open with "${k}" — vary the sentences`);
}

console.log(`lint ${key} (${level}) — ${fails.length} FAIL, ${flags.length} FLAG`);
fails.forEach((m) => console.log("  FAIL " + m));
flags.forEach((m) => console.log("  FLAG " + m));
process.exit(fails.length ? 1 : 0);
