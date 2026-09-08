// Internal item builder — keeps bank files compact and guarantees that ids,
// format ↔ formatType ↔ evidenceClass, and provenance markers are derived
// consistently. PRIVATE to this folder: the engine never sees this module,
// only the plain objects it produces.

export const FORMAT_OF_TYPE = {
  mcq: "recognition",
  error_identification: "recognition",
  gap_fill: "controlled_construction",
  word_order: "controlled_construction",
  sentence_correction: "controlled_construction",
  rewrite: "transformation",
  constrained_sentence: "guided_production",
  free_response: "open_production",
};

export const EVIDENCE_OF_FORMAT = {
  recognition: "recognition",
  controlled_construction: "controlled_construction",
  transformation: "controlled_construction",
  guided_production: "free_production",
  open_production: "free_production",
};

// legacyRef factory: leg("A1_MCQ")("verbatim question")            → reused unchanged
//                    leg("A1_MCQ")("verbatim question", "what changed") → adapted
export const leg = (pool) => (question, adapted) => (adapted ? { pool, question, adapted } : { pool, question });

export function domainBuilder(domain) {
  const seq = {};
  const base = (formatType, s, content, answer) => {
    const key = `${s.b}.${s.t}.${s.L}`;
    seq[key] = (seq[key] || 0) + 1;
    const format = FORMAT_OF_TYPE[formatType];
    const it = {
      id: `agp.${domain}.${s.b}.${s.t}.${s.L.toLowerCase()}.${String(seq[key]).padStart(3, "0")}`,
      domain, branch: s.b, topic: s.t, cefrLevel: s.L, difficulty: s.diff ?? 2,
      format, formatType, evidenceClass: EVIDENCE_OF_FORMAT[format],
      diagnosticFocus: s.focus, prerequisites: s.pre || [],
      content, answer,
      source: s.legacy ? (s.legacy.adapted ? "legacy_adapted" : "legacy") : "new",
    };
    if (s.legacy) {
      it.legacyRef = { pool: s.legacy.pool, question: s.legacy.question };
      if (s.legacy.adapted) it.adaptationNote = s.legacy.adapted;
    }
    if (s.overlaps) it.overlaps = s.overlaps;
    if (s.flags) it.reviewFlags = s.flags;
    return it;
  };
  const strAnswer = (s) => Array.isArray(s.key)
    ? { type: "sequence", expected: s.key, ...(s.alt ? { acceptable: s.alt } : {}), explanation: s.why }
    : { type: "exact", expected: s.key, ...(s.alt ? { acceptable: s.alt } : {}), explanation: s.why };
  return {
    mcq: (s) => base("mcq", s, { prompt: s.prompt, options: s.options }, { type: "index", expected: s.key, explanation: s.why }),
    errorId: (s) => base("error_identification", s,
      { prompt: s.prompt || "Which part of the sentence contains an error?", options: s.options },
      { type: "index", expected: s.key, explanation: s.why }),
    gap: (s) => base("gap_fill", s,
      { prompt: s.instr || "Complete the gap(s) with the correct form of the word(s) in brackets, or one suitable word where no bracket is given.", source: s.source },
      strAnswer(s)),
    order: (s) => base("word_order", s,
      { prompt: s.instr || "Put the words in the correct order.", tokens: s.tokens },
      { type: "sequence", expected: s.key, ...(s.alt ? { acceptable: s.alt } : {}), explanation: s.why }),
    correct: (s) => base("sentence_correction", s,
      { prompt: s.instr || "This sentence has ONE grammar error. Write the corrected sentence.", source: s.source },
      strAnswer(s)),
    rewrite: (s) => base("rewrite", s,
      { prompt: s.instr || "Rewrite the sentence starting with the words given. Keep the meaning.", source: s.source, hint: s.hint },
      strAnswer(s)),
    guided: (s) => base("constrained_sentence", s,
      { prompt: s.prompt },
      { type: "rubric", instruction: s.prompt, requiredElement: s.required, constraints: s.constraints || ["exactly one sentence"] }),
  };
}