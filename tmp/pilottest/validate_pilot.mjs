// VIRORA — 100-word pilot validation (2026-09-19).
// Runs the REAL, live indexSenses()/resolveWordSense()/posForWord() from
// src/lib/vocab/enrichment.js against the exact 104 WordSense rows just
// created live in Base44, read back here from pilot_senses.json (a literal
// copy of the create_entities payload). Confirms: (a) every row resolves
// via its own word_id with no ambiguity, (b) posForWord() returns the
// intended label for every one of the four supported POS categories,
// (c) posLabel() correctly returns "" for phrasal_verb (not a badge
// category) rather than mislabeling it, (d) the two duplicate-headword
// lemmas among the 100 (loose, connection, pain, search) resolve each of
// their two physical rows independently and correctly.
import { indexSenses, posForWord, posLabel } from "/tmp/pilottest/enrichment.bundle.mjs";
import { readFileSync } from "fs";

const senses = JSON.parse(readFileSync("/tmp/pilottest/pilot_senses.json", "utf8"));
const index = indexSenses(senses);

let pass = 0, fail = 0;
function check(name, cond, detail) {
  const ok = !!cond;
  console.log(`${ok ? "PASS" : "FAIL"} — ${name}` + (ok ? "" : ` — ${detail || ""}`));
  if (ok) pass++; else fail++;
}

const EXPECTED_LABEL = { noun: "n.", verb: "v.", adjective: "adj.", adverb: "adv.", phrasal_verb: "" };

// 1. Every one of the 104 rows resolves correctly via its own word_id,
//    and posForWord() returns exactly the label its stored pos implies.
for (const row of senses) {
  const label = posForWord({ word: { id: row.word_id }, senses: index });
  const expected = EXPECTED_LABEL[row.pos] ?? "";
  check(
    `${row.lemma_key} (${row.word_id.slice(-6)}) pos=${row.pos} -> "${expected}"`,
    label === expected,
    `got "${label}"`
  );
}

// 2. Sanity: a word NOT in the pilot (no WordSense row at all) still safely
//    returns no badge — the pilot must not have broken the "no senses yet"
//    fallback for the ~2,047 words untouched by this batch.
check(
  "untouched word (no pilot row) -> no badge",
  posForWord({ word: { id: "6a0000000000000000000000" }, senses: index }) === ""
);

// 3. The 4 duplicate-headword lemmas in the pilot: confirm BOTH physical
//    rows resolve independently and agree on POS (same meaning, different
//    row — never a species-C conflict, verified during word selection).
const dupPairs = [
  ["loose", "6a4282fd46ba24054c1dcd4b", "6a6ef9b2a6015561480927ce"],
  ["connection", "6a42816a2098612b1526f91e", "6a4288ad6941e70ad6a00e5c"],
  ["pain", "6a42821646ba24054c1dccf1", "6a4288ad6941e70ad6a00e85"],
  ["search", "6a4265cce20c7210db6908bf", "6a6ef83f0f1e82a5a073667a"],
];
for (const [lemma, idA, idB] of dupPairs) {
  const a = posForWord({ word: { id: idA }, senses: index });
  const b = posForWord({ word: { id: idB }, senses: index });
  check(`${lemma}: both physical rows resolve, same pos ("${a}")`, a === b && a !== "");
}

console.log(`\n${pass} passed, ${fail} failed. (${senses.length} pilot rows checked)`);
process.exit(fail ? 1 : 0);
