// Adaptive Grammar Placement Test — item data contract + integrity check.
//
// This file defines the SHAPE of an item and validates a dataset for
// internal consistency (unique ids, known domains/concepts, well-formed
// answers). It contains no selection, scoring, thresholding, or level logic —
// those belong to Claude's adaptive engine, which only READS this data.
//
// ITEM SHAPE (every field below except those marked optional is required):
// {
//   id:              "agp.<domain>.<branch>.<topic>.<level>.<nnn>"   stable, never reused
//   domain:          one of DOMAIN_IDS                              primary diagnostic owner
//   branch:          branch id within the domain
//   topic:           topic id within the branch
//   cefrLevel:       "A1" | "A2" | "B1" | "B2" | "C1" | "C2"
//   difficulty:      1 | 2 | 3                                      position within the rung
//   format:          FORMATS                                        evidence family
//   formatType:      FORMAT_TYPES                                   concrete mechanic
//   evidenceType:    "recognition" | "controlled" | "production"
//   diagnosticFocus: one sentence — the distinction this item measures
//   prerequisites:   concept ids from CONCEPT_IDS (may be [])
//   content:         { prompt, options?, tokens?, source?, hint? }
//   answer:          see ANSWER TYPES
//   source:          "new" | "legacy"
//   legacyRef?:      { pool, question } — verbatim key into placementContent.js
//   overlaps?:       other domain ids the item touches (flagged, not owned)
//   reviewFlags?:    strings for curriculum review, e.g. "c2-definition-pending"
// }
//
// ANSWER TYPES (answer.type):
//   "index"     expected: number (index into content.options), explanation
//   "exact"     expected: string, acceptable?: string[] (case/space-insensitive)
//   "sequence"  expected: string[] (ordered — gap-fill with several gaps, or
//               token ordering; tokens compared after trimming)
//   "rubric"    instruction, requiredElement, constraints?: string[] —
//               graded by a rubric-based grader (production evidence). Field
//               names mirror the legacy evaluateGrammarConstruction task shape
//               so the existing grader can be reused without adaptation.

import { CEFR_LEVELS, DOMAINS, DOMAIN_IDS, CONCEPT_IDS } from "@/lib/adaptiveGrammar/domains";

export const FORMATS = ["recognition", "controlled", "transformation", "guided_production", "open_production"];

export const FORMAT_TYPES = {
  recognition: ["mcq", "error_identification"],
  controlled: ["gap_fill", "word_order", "sentence_correction"],
  transformation: ["rewrite"],
  guided_production: ["constrained_sentence"],
  open_production: ["free_response"],
};

export const EVIDENCE_TYPES = ["recognition", "controlled", "production"];
export const ANSWER_TYPES = ["index", "exact", "sequence", "rubric"];

const branchesOf = Object.fromEntries(DOMAINS.map((d) => [d.id, d.branches]));

export function validateItem(item) {
  const errs = [];
  const req = ["id", "domain", "branch", "topic", "cefrLevel", "difficulty", "format", "formatType", "evidenceType", "diagnosticFocus", "prerequisites", "content", "answer", "source"];
  for (const k of req) if (item[k] === undefined || item[k] === null) errs.push(`missing ${k}`);
  if (errs.length) return errs;

  if (!DOMAIN_IDS.includes(item.domain)) errs.push(`unknown domain ${item.domain}`);
  else if (!branchesOf[item.domain].includes(item.branch)) errs.push(`unknown branch ${item.branch} for ${item.domain}`);
  if (!CEFR_LEVELS.includes(item.cefrLevel)) errs.push(`bad cefrLevel ${item.cefrLevel}`);
  if (![1, 2, 3].includes(item.difficulty)) errs.push(`bad difficulty ${item.difficulty}`);
  if (!FORMATS.includes(item.format)) errs.push(`bad format ${item.format}`);
  else if (!FORMAT_TYPES[item.format].includes(item.formatType)) errs.push(`formatType ${item.formatType} not valid for ${item.format}`);
  if (!EVIDENCE_TYPES.includes(item.evidenceType)) errs.push(`bad evidenceType`);
  const expectedId = `agp.${item.domain}.${item.branch}.${item.topic}.${item.cefrLevel.toLowerCase()}.`;
  if (!item.id.startsWith(expectedId)) errs.push(`id ${item.id} does not match ${expectedId}nnn`);
  for (const p of item.prerequisites) if (!CONCEPT_IDS.includes(p)) errs.push(`unknown prerequisite ${p}`);
  if (item.overlaps) for (const o of item.overlaps) if (!DOMAIN_IDS.includes(o)) errs.push(`unknown overlap domain ${o}`);
  if (item.source === "legacy" && !item.legacyRef?.pool) errs.push("legacy item missing legacyRef");
  if (!item.content.prompt) errs.push("content.prompt required");

  const a = item.answer;
  if (!ANSWER_TYPES.includes(a.type)) errs.push(`bad answer.type ${a.type}`);
  if (a.type === "index") {
    if (!Array.isArray(item.content.options) || item.content.options.length < 2) errs.push("index answer needs content.options");
    else if (typeof a.expected !== "number" || a.expected < 0 || a.expected >= item.content.options.length) errs.push("answer.expected out of range");
  }
  if (a.type === "exact" && typeof a.expected !== "string") errs.push("exact answer needs string expected");
  if (a.type === "sequence" && !Array.isArray(a.expected)) errs.push("sequence answer needs array expected");
  if (a.type === "rubric" && !(a.instruction && a.requiredElement)) errs.push("rubric answer needs instruction + requiredElement");
  if (a.type === "rubric" && item.evidenceType !== "production") errs.push("rubric answers must be production evidence");
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