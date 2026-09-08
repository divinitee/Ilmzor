// Adaptive Grammar Placement Test — PUBLIC CONTRACT.
//
// Claude's adaptive engine imports ONLY from '@/lib/adaptiveGrammar'. The
// internal file layout (bank/*.js, build.js, samples/) is private and may be
// reorganised without touching the engine.
//
// Exports:
//   ADAPTIVE_GRAMMAR_ITEMS  flat array of every item, all domains/levels
//   DOMAINS                 the 13 authoritative domains + their branches
//   CONCEPTS / CONCEPT_IDS  prerequisite concept registry
//   CEFR_LEVELS             A1 … C2
//   validateDataset         integrity check over an item array
//   FORMATS / FORMAT_TYPES / EVIDENCE_CLASSES / EVIDENCE_CLASS_OF_FORMAT
//
// This module contains NO selection, scoring, level-determination, confidence,
// stopping or session logic — all of that belongs to the engine.
//
// Nothing here imports any legacy placement file at runtime. Legacy-derived
// items carry a `legacyRef` pointer for provenance only; their content is
// copied, so `src/lib/placementContent.js` is never loaded by this dataset.

import { DOMAINS, DOMAIN_IDS, CONCEPTS, CONCEPT_IDS, CEFR_LEVELS } from "@/lib/adaptiveGrammar/domains";
import { validateDataset, validateItem, FORMATS, FORMAT_TYPES, EVIDENCE_CLASSES, EVIDENCE_CLASS_OF_FORMAT, ANSWER_TYPES, SOURCES } from "@/lib/adaptiveGrammar/schema";

import tenses from "@/lib/adaptiveGrammar/bank/tenses";
import nounsArticles from "@/lib/adaptiveGrammar/bank/nounsArticles";
import pronouns from "@/lib/adaptiveGrammar/bank/pronouns";
import verbPatterns from "@/lib/adaptiveGrammar/bank/verbPatterns";
import adjAdv from "@/lib/adaptiveGrammar/bank/adjAdv";
import comparison from "@/lib/adaptiveGrammar/bank/comparison";
import questionsNegation from "@/lib/adaptiveGrammar/bank/questionsNegation";
import modals from "@/lib/adaptiveGrammar/bank/modals";
import prepPhrasal from "@/lib/adaptiveGrammar/bank/prepPhrasal";
import sentenceStructure from "@/lib/adaptiveGrammar/bank/sentenceStructure";
import conditionalsWishes from "@/lib/adaptiveGrammar/bank/conditionalsWishes";
import passiveCausative from "@/lib/adaptiveGrammar/bank/passiveCausative";
import reportedSpeech from "@/lib/adaptiveGrammar/bank/reportedSpeech";

export const ADAPTIVE_GRAMMAR_ITEMS = [
  ...tenses, ...nounsArticles, ...pronouns, ...verbPatterns, ...adjAdv,
  ...comparison, ...questionsNegation, ...modals, ...prepPhrasal,
  ...sentenceStructure, ...conditionalsWishes, ...passiveCausative, ...reportedSpeech,
];

export { DOMAINS, DOMAIN_IDS, CONCEPTS, CONCEPT_IDS, CEFR_LEVELS };
export { validateDataset, validateItem, FORMATS, FORMAT_TYPES, EVIDENCE_CLASSES, EVIDENCE_CLASS_OF_FORMAT, ANSWER_TYPES, SOURCES };