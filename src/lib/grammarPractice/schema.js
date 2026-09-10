// Grammar practice item schema — validation only. PURE, no imports.
//
// This is the deterministic half of content QA. The adversarial AI pass judges
// whether an item has a second *linguistically* valid answer; this file judges
// whether an item is structurally coherent at all — key/blank arity, slot
// integrity, option validity. Those are different jobs and neither substitutes
// for the other: a real batch shipped ten items whose key could not be rendered
// against its blanks, and the AI verifier passed every one of them because it
// was asked about language, not structure.

export const STAGES = ["choose", "build", "transform", "create", "express"];

export const FORMAT_BY_STAGE = {
  choose: ["mcq", "error_identification"],
  build: ["gap_fill", "word_order", "sentence_correction"],
  transform: ["rewrite"],
  create: ["constrained_sentence"],
  express: ["free_response"],
};

/** Blank marker used in every authored sentence. */
export const BLANK = /_{2,}/g;
const countBlanks = (s) => (String(s || "").match(BLANK) || []).length;
const placeholders = (s) => new Set([...String(s || "").matchAll(/\{(\w+)\}/g)].map((m) => m[1]));
const words = (s) => String(s || "").replace(/\([a-z]+\)/gi, " ").replace(BLANK, " ")
  .toLowerCase().replace(/[?.!,]/g, " ").split(/\s+/).filter(Boolean);

/** Returns an array of problem strings. Empty array == valid. */
export function validateItem(it, i = 0) {
  const p = [];
  const at = (m) => p.push(`[${i}] ${m}`);

  for (const f of ["domain", "branch", "topic", "level", "stage", "format"]) {
    if (!it?.[f]) at(`missing ${f}`);
  }
  if (!STAGES.includes(it?.stage)) at(`unknown stage "${it?.stage}"`);
  else if (!FORMAT_BY_STAGE[it.stage].includes(it.format)) {
    at(`format "${it.format}" is not valid for stage "${it.stage}"`);
  }

  // ---- slots: placeholders and declarations must agree exactly ----
  const declared = new Set(Object.keys(it?.slots || {}));
  const used = new Set([...placeholders(it?.source), ...placeholders(it?.hint), ...placeholders(it?.prompt)]);
  for (const k of used) if (!declared.has(k)) at(`placeholder {${k}} has no slot`);
  for (const k of declared) if (!used.has(k)) at(`slot "${k}" is never used`);
  for (const [k, v] of Object.entries(it?.slots || {})) {
    if (!Array.isArray(v) || v.length < 2) at(`slot "${k}" needs at least 2 fillers`);
    else if (v.some((x) => typeof x !== "string" || !x.trim())) at(`slot "${k}" has a non-string filler`);
    else if (new Set(v).size !== v.length) at(`slot "${k}" has duplicate fillers`);
  }

  // ---- per format ----
  if (it?.format === "mcq") {
    if (!Array.isArray(it.options) || it.options.length < 3) at("mcq needs at least 3 options");
    else {
      if (new Set(it.options).size !== it.options.length) at("mcq has duplicate options");
      if (!Number.isInteger(it.key) || it.key < 0 || it.key >= it.options.length) at("mcq key out of range");
    }
    if (countBlanks(it.prompt) !== 1) at("mcq prompt needs exactly one blank");
  }

  if (it?.format === "gap_fill" || it?.format === "rewrite") {
    const text = it.format === "rewrite" ? it.hint : it.source;
    const n = countBlanks(text);
    if (n < 1) at(`${it.format} needs at least one blank`);
    if (Array.isArray(it.key)) {
      if (it.key.length !== n) at(`key has ${it.key.length} parts but there are ${n} blanks`);
    } else if (typeof it.key === "string") {
      if (n > 1) at(`${n} blanks but key is a single string — use an array, one entry per blank`);
      // The defect an AI verifier does not catch: the key restating words that
      // are already printed on screen between the blanks.
      const printed = new Set(words(text));
      const echoed = words(it.key).filter((w) => printed.has(w));
      if (echoed.length) at(`key repeats words already printed in the sentence: ${echoed.join(", ")}`);
    } else at("missing key");
    if (it.format === "rewrite" && !it.source) at("rewrite needs a source sentence");
  }

  if (it?.format === "constrained_sentence") {
    if (!it.prompt) at("missing prompt");
    if (!it.requiredElement) at("missing requiredElement");
    if (!Array.isArray(it.constraints) || !it.constraints.length) at("missing constraints");
  }

  if (it?.format === "free_response") {
    if (!it.prompt) at("missing prompt");
    if (!it.targetGrammar) at("missing targetGrammar");
    if (!Array.isArray(it.lookFor) || !it.lookFor.length) at("missing lookFor");
  }

  return p;
}

export function validateBank(items) {
  const problems = items.flatMap((it, i) => validateItem(it, i));
  const ids = items.map((i) => i.id).filter(Boolean);
  const dupes = ids.filter((id, i) => ids.indexOf(id) !== i);
  if (dupes.length) problems.push(`duplicate ids: ${[...new Set(dupes)].join(", ")}`);
  return problems;
}

/** Total surface variants an item expands to, given its slots. */
export const variantCount = (it) =>
  Object.values(it?.slots || {}).reduce((n, v) => n * v.length, 1);
