// Writes grammar-run/review/<key>.md: a teacher-readable sample of one topic,
// so Tee can check quality without reading JSON. Random fillers per item,
// fixed seed so the sheet is stable between runs.
//   node grammar-run/sample.mjs <domain.branch.topic>
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";

const key = process.argv[2];
const items = JSON.parse(readFileSync(`content/grammar-practice/${key}.json`, "utf8"));
let seed = 7;
const rnd = (n) => { seed = (seed * 9301 + 49297) % 233280; return Math.floor((seed / 233280) * n); };
const fill = (s, slots = {}, pick) => (s || "").replace(/\{(\w+)\}/g, (_, k) => `**${pick[k] ?? `{${k}}`}**`);

const lines = [`# ${key} — review sample (${items[0].level})`, "",
  "Each item shows one random filler combination (in bold). Mark anything a teacher wouldn't accept.", ""];
for (const stage of ["choose", "build", "transform", "create", "express"]) {
  const its = items.filter((i) => i.stage === stage);
  lines.push(`## ${stage} (${its.length})`, "");
  its.forEach((it, n) => {
    const pick = Object.fromEntries(Object.entries(it.slots || {}).map(([k, v]) => [k, v[rnd(v.length)]]));
    if (it.format === "mcq") {
      lines.push(`${n + 1}. ${fill(it.prompt, it.slots, pick)}  `,
        `   options: ${it.options.map((o, i) => (i === it.key ? `✔ ${o}` : o)).join(" · ")}  `, `   why: ${it.why}`);
    } else if (stage === "build" || stage === "transform") {
      if (it.instr) lines.push(`${n + 1}. _${it.instr}_  `);
      lines.push(`   ${fill(it.source || it.prompt, it.slots, pick)}  `);
      if (it.hint) lines.push(`   → ${fill(it.hint, it.slots, pick)}  `);
      lines.push(`   key: ${[].concat(it.key).join(" + ")}${it.acceptable ? ` (also: ${it.acceptable.join(", ")})` : ""}  `, `   why: ${it.why}`);
    } else if (stage === "create") {
      lines.push(`${n + 1}. ${it.prompt}  `, `   must use: ${it.requiredElement} · ${it.constraints.join(" · ")}`);
    } else {
      lines.push(`${n + 1}. ${it.prompt}  `, `   target: ${it.targetGrammar} · look for: ${it.lookFor.join(" · ")}`);
    }
    lines.push("");
  });
}
mkdirSync("grammar-run/review", { recursive: true });
writeFileSync(`grammar-run/review/${key}.md`, lines.join("\n"));
console.log(`wrote grammar-run/review/${key}.md`);
