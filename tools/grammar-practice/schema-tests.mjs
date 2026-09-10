import { validateItem } from "../../src/lib/grammarPractice/schema.js";
const base = { domain:"tenses", branch:"present", topic:"third-person-s", level:"A2" };
let pass = 0, fail = 0;
const t = (name, item, shouldFail) => {
  const p = validateItem(item);
  const ok = shouldFail ? p.length > 0 : p.length === 0;
  ok ? pass++ : fail++;
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${name}${!ok && p.length ? "  -> " + p.join("; ") : ""}`);
};

console.log("defects that shipped in the first real batch:");
t("two blanks with a single-string key is refused",
  { ...base, stage:"transform", format:"rewrite", source:"She works at a bank.",
    hint:"______ she ______ (work) at a bank?", key:"Does she work" }, true);
t("key echoing words already printed is refused",
  { ...base, stage:"transform", format:"rewrite", source:"x",
    hint:"The shop ______ (close) at eight.", key:"the shop doesn't close" }, true);
t("array key matching blank count is accepted",
  { ...base, stage:"transform", format:"rewrite", source:"She works at a bank.",
    hint:"______ she ______ (work) at a bank?", key:["Does","work"] }, false);

console.log("slot integrity:");
t("undeclared placeholder is refused",
  { ...base, stage:"build", format:"gap_fill", instr:"x",
    source:"He ______ (go) to {place}.", key:"goes" }, true);
t("declared-but-unused slot is refused",
  { ...base, stage:"build", format:"gap_fill", instr:"x", source:"He ______ (go) home.",
    key:"goes", slots:{ place:["a","b"] } }, true);
t("matching slots are accepted",
  { ...base, stage:"build", format:"gap_fill", instr:"x", source:"He ______ (go) to {place}.",
    key:"goes", slots:{ place:["school","work"] } }, false);

console.log("mcq:");
t("key out of range is refused",
  { ...base, stage:"choose", format:"mcq", prompt:"He ______ home.", options:["go","goes"], key:5 }, true);
t("duplicate options refused",
  { ...base, stage:"choose", format:"mcq", prompt:"He ______ home.", options:["go","go","goes"], key:2 }, true);
t("valid mcq accepted",
  { ...base, stage:"choose", format:"mcq", prompt:"He ______ home.", options:["go","goes","going"], key:1 }, false);

console.log("stage/format pairing:");
t("rewrite under the choose stage is refused",
  { ...base, stage:"choose", format:"rewrite", source:"x", hint:"y ______", key:"z" }, true);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
