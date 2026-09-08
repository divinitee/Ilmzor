// Adaptive Grammar Placement Test — item data contract + integrity check.
//
// Defines the SHAPE of an item and validates a dataset for internal
// consistency. No selection, scoring, thresholding or level logic lives here.
//
// ITEM SHAPE
// {
//   id:              "agp.<domain>.<branch>.<topic>.<level>.<nnn>"  stable, never reused
//   domain:          DOMAIN_IDS                                     primary diagnostic owner
//   branch:          branch id within the domain
//   topic:           topic id within the branch
//   cefrLevel:       "A1" | "A2" | "B1" | "B2" | "C1" | "C2"
//   difficulty:      1 | 2 | 3   relative WITHIN the rung (1 lower, 2 typical, 3 upper-bound)
//   format:          FORMATS      broad assessment format
//   formatType:      FORMAT_TYPES[format]   specific interaction pattern
//   evidenceClass:   EVIDENCE_CLASS_OF_FORMAT[format]  engine-facing evidence category
//   diagnosticFocus: one sentence — the distinction this item measures
//   prerequisites:   concept ids from CONCEPT_IDS (may be [])
//   content:         { prompt, options?, tokens?, source?, hint? }
//   answer:          ANSWER TYPES below
//   source:          "legacy" (reused unchanged) | "legacy_adapted" (wording corrected) | "new"
//   legacyRef?:      { pool, question } — verbatim key into the legacy pool; required for both legacy sources
//   adaptationNote?: what changed and why; required for legacy_adapted
//   overlaps?:       other domain ids the item touches (flagged, not owned)
//   reviewFlags?:    strings for curriculum review
// }
//
// evidenceClass mapping (fixed):
//   recognition             → recognition
//   controlled_construction → controlled_construction
//   transformation          → controlled_construction
//   guided_production       → free_production
//   open_production         → free_production   (schema-ready; not produced in V1)
//
// ANSWER TYPES (answer.type):
//   "index"     expected: number (index into content.options), explanation
//   "exact"     expected: string, acceptable?: string[]   (case/space-insensitive compare)
//   "sequence"  expected: string[], acceptable?: string[][] (ordered; multi-gap or token order)
//   "rubric"    instruction, requiredElement, constraints?: string[] — free_production only;
//               field names mirror the legacy evaluateGrammarConstruction task shape.

import { CEFR_LEVELS, DOMAINS, DOMAIN_IDS, CONCEPT_IDS } from "@/lib/adaptiveGrammar/domains";

export const FORMATS = ["recognition", "controlled_construction", "transformation", "guided_production", "open_production"];

export const FORMAT_TYPES = {
  recognition: ["mcq", "error_identification"],
  controlled_construction: ["gap_fill", "word_order", "sentence_correction"],
  transformation: ["rewrite"],
  guided_production: ["constrained_sentence"],
  open_production: ["free_response"],
};

export const EVIDENCE_CLASSES = ["recognition", "controlled_construction", "free_production"];

export const EVIDENCE_CLASS_OF_FORMAT = {
  recognition: "recognition",
  controlled_construction: "controlled_construction",
  transformation: "controlled_construction",
  guided_production: "free_production",
  open_production: "free_production",
};

export const ANSWER_TYPES = ["index", "exact", "sequence", "rubric"];
export const SOURCES = ["legacy", "legacy_adapted", "new"];

const branchesOf = Object.fromEntries(DOMAINS.map((d) => [d.id, d.branches]));

export function validateItem(item) {
  const errs = [];
  const req = ["id", "domain", "branch", "topic", "cefrLevel", "difficulty", "format", "formatType", "evidenceClass", "diagnosticFocus", "prerequisites", "content", "answer", "source"];
  for (const k of req) if (item[k] === undefined || item[k] === null || item[k] === "") errs.push(`missing ${k}`);
  if (errs.length) return errs;
  if ("evidenceType" in item) errs.push("legacy field evidenceType present — use evidenceClass");

  if (!DOMAIN_IDS.includes(item.domain)) errs.push(`unknown domain ${item.domain}`);
  else if (!branchesOf[item.domain].includes(item.branch)) errs.push(`unknown branch ${item.branch} for ${item.domain}`);
  if (!CEFR_LEVELS.includes(item.cefrLevel)) errs.push(`bad cefrLevel ${item.cefrLevel}`);
  if (![1, 2, 3].includes(item.difficulty)) errs.push(`bad difficulty ${item.difficulty}`);
  if (!FORMATS.includes(item.format)) errs.push(`bad format ${item.format}`);
  else {
    if (!FORMAT_TYPES[item.format].includes(item.formatType)) errs.push(`formatType ${item.formatType} not valid for ${item.format}`);
    if (item.evidenceClass !== EVIDENCE_CLASS_OF_FORMAT[item.format]) errs.push(`evidenceClass ${item.evidenceClass} does not match format ${item.format}`);
  }
  const expectedId = `agp.${item.domain}.${item.branch}.${item.topic}.${String(item.cefrLevel).toLowerCase()}.`;
  if (!item.id.startsWith(expectedId) || !/\.\d{3}$/.test(item.id)) errs.push(`id ${item.id} does not match ${expectedId}nnn`);
  for (const p of item.prerequisites) if (!CONCEPT_IDS.includes(p)) errs.push(`unknown prerequisite ${p}`);
  if (item.overlaps) for (const o of item.overlaps) if (!DOMAIN_IDS.includes(o) || o === item.domain) errs.push(`bad overlap domain ${o}`);
  if (!SOURCES.includes(item.source)) errs.push(`bad source ${item.source}`);
  if (item.source !== "new" && !(item.legacyRef?.pool && item.legacyRef?.question)) errs.push("legacy item missing legacyRef {pool, question}");
  if (item.source === "legacy_adapted" && !item.adaptationNote) errs.push("legacy_adapted item missing adaptationNote");
  if (item.source === "new" && item.legacyRef) errs.push("new item must not carry legacyRef");
  if (!item.content.prompt) errs.push("content.prompt required");

  const a = item.answer;
  if (!ANSWER_TYPES.includes(a.type)) errs.push(`bad answer.type ${a.type}`);
  if (a.type === "index") {
    if (!Array.isArray(item.content.options) || item.content.options.length < 2) errs.push("index answer needs content.options");
    else if (typeof a.expected !== "number" || a.expected < 0 || a.expected >= item.content.options.length) errs.push("answer.expected out of range");
    else if (new Set(item.content.options).size !== item.content.options.length) errs.push("duplicate options");
  }
  if (a.type === "exact" && typeof a.expected !== "string") errs.push("exact answer needs string expected");
  if (a.type === "sequence") {
    if (!Array.isArray(a.expected)) errs.push("sequence answer needs array expected");
    else if (item.formatType === "word_order") {
      const sortTok = (arr) => [...arr].sort().join("\u0000");
      if (!Array.isArray(item.content.tokens) || sortTok(item.content.tokens) !== sortTok(a.expected)) errs.push("word_order expected must be a permutation of content.tokens");
    }
  }
  if (a.type === "rubric") {
    if (!(a.instruction && a.requiredElement)) errs.push("rubric answer needs instruction + requiredElement");
    if (item.evidenceClass !== "free_production") errs.push("rubric answers must be free_production evidence");
  } else if (item.evidenceClass === "free_production") errs.push("free_production items must use rubric answers");
  return errs;
}

export function validateDataset(items) {
  const seen = new Set();
  const problems = [];
  for (const it of items) {
    const errs = validateItem(it);
    if (seen.has(it.id)) errs.push("duplicate id");
    seen.add(it.id);
    if (errs.length) problems.push({ id: it.id, errs });
  }
  return problems;
}