// Regenerates PRACTICE_KEYS in base44/shared/grammarKeys.js from the practice
// banks, so progressApi can server-grade every live topic. Run it after EVERY
// ingest. A topic missing from PRACTICE_KEYS still plays, but gradePractice()
// returns null for it and the learner's answers never become mastery evidence.
//
//   node tools/grammar-practice/build-keys.mjs           rewrite PRACTICE_KEYS
//   node tools/grammar-practice/build-keys.mjs --check   exit 1 if the file has drifted
//
// QUIZ_KEYS (GrammarQuizGame) and the file header are kept byte-for-byte; only
// the PRACTICE_KEYS line is replaced. Value format (read by progressCore.js):
// "a|b" accepted answers (MCQ = correct option TEXT), "§a+b" multi-slot answer.
// create/express are rubric-judged and deliberately absent.
import { readFileSync, readdirSync, writeFileSync } from "node:fs";

const BANK_DIR = "src/lib/grammarPractice/bank";
const KEYS_FILE = "base44/shared/grammarKeys.js";
const STAGE = { choose: "c", build: "b", transform: "t" };

const load = (f) => JSON.parse(
  readFileSync(`${BANK_DIR}/${f}`, "utf8").replace(/^[\s\S]*?export default /, "").replace(/;\s*$/, ""));

const keys = {};
for (const file of readdirSync(BANK_DIR).filter((f) => f.endsWith(".js")).sort()) {
  const topic = file.replace(/\.js$/, "");
  const out = {};
  for (const it of load(file)) {
    const letter = STAGE[it.stage];
    if (!letter) continue;
    const n = it.id.split(".").pop();
    let v;
    if (it.format === "mcq") v = it.options[it.key];
    else if (Array.isArray(it.key)) v = "§" + it.key.join("+");
    else v = [it.key, ...(it.acceptable || [])].join("|");
    if (typeof v !== "string" || !v) throw new Error(`${it.id}: cannot derive a key`);
    out[`${letter}${n}`] = v;
  }
  keys[topic] = out;
}

const src = readFileSync(KEYS_FILE, "utf8");
const line = `export const PRACTICE_KEYS = ${JSON.stringify(keys)};`;
const next = src.replace(/^export const PRACTICE_KEYS = .*;$/m, line);
if (next === src && !src.includes(line)) throw new Error("PRACTICE_KEYS line not found");

if (process.argv.includes("--check")) {
  if (next !== src) {
    const have = Object.keys(JSON.parse(src.match(/^export const PRACTICE_KEYS = (.*);$/m)[1]));
    console.error(`DRIFT — grammarKeys.js does not match the banks.`);
    console.error(`  banks: ${Object.keys(keys).length} topic(s); keys file: ${have.length}.`);
    console.error(`  Run: node tools/grammar-practice/build-keys.mjs`);
    process.exit(1);
  }
  console.log(`grammarKeys.js in sync — ${Object.keys(keys).length} topic(s)`);
} else {
  writeFileSync(KEYS_FILE, next);
  const n = Object.values(keys).reduce((a, o) => a + Object.keys(o).length, 0);
  console.log(`wrote PRACTICE_KEYS — ${Object.keys(keys).length} topic(s), ${n} gradable items`);
}
