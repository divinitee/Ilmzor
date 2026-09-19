// src/lib/vocabGameUtils.js
var meaningInLang = (w, lang) => {
  if (!w) return "";
  if (lang === "uz") return w.uzbek || "";
  if (lang === "ru") return w.russian || "";
  return w.english_definition || w.uzbek || w.russian || "";
};

// src/lib/definitionTiers.js
var TIER_FIELD = {
  A2: "def_a2",
  B1: "def_b1",
  B2: "def_b2",
  C1: "def_c1"
};
var clean = (v) => typeof v === "string" && v.trim() ? v.trim() : "";
function tieredDefinition(word, studentLevel) {
  const field = TIER_FIELD[studentLevel] || TIER_FIELD.A2;
  return clean(word?.[field]);
}
function definitionForLevel(word, studentLevel, lang) {
  return tieredDefinition(word, studentLevel) || clean(word?.english_definition) || clean(meaningInLang(word, lang));
}

// src/lib/vocab/lemma.js
function normalizeLemma(value) {
  return String(value ?? "").toLowerCase().trim().replace(/\s+/g, " ").replace(/^[^\p{L}\p{N}(]+|[^\p{L}\p{N})]+$/gu, "");
}

// src/lib/vocab/enrichment.js
var SUPPORT_LADDER = {
  Starter: { mode: "translation", field: null, writtenFor: null },
  A1: { mode: "translation", field: null, writtenFor: null },
  A2: { mode: "definition", field: "def_a2", writtenFor: "A1" },
  B1: { mode: "definition", field: "def_b1", writtenFor: "A2" },
  "B1+": { mode: "definition", field: "def_b1_plus", writtenFor: "B1" },
  B2: { mode: "definition", field: "def_b2", writtenFor: "B1+" },
  C1: { mode: "definition", field: "def_c1", writtenFor: "B2" }
};
var DESCENT = ["C1", "B2", "B1+", "B1", "A2"];
var clean2 = (v) => typeof v === "string" && v.trim() ? v.trim() : "";
var usesTranslationSupport = (level) => SUPPORT_LADDER[level]?.mode === "translation";
function indexSenses(senses = []) {
  const byLemma = /* @__PURE__ */ new Map();
  const byRowId = /* @__PURE__ */ new Map();
  const byWordId = /* @__PURE__ */ new Map();
  for (const s of senses) {
    if (!s || s.approved === false) continue;
    const lemma = normalizeLemma(s.lemma_key);
    if (lemma) {
      const lemmaBucket = byLemma.get(lemma);
      if (lemmaBucket) lemmaBucket.push(s);
      else byLemma.set(lemma, [s]);
    }
    const rowId = s.source_row_id;
    if (rowId) {
      const rowBucket = byRowId.get(rowId);
      if (rowBucket) rowBucket.push(s);
      else byRowId.set(rowId, [s]);
    }
    if (s.word_id) {
      const wordBucket = byWordId.get(s.word_id);
      if (wordBucket) wordBucket.push(s);
      else byWordId.set(s.word_id, [s]);
    }
  }
  const bySenseOrder = (a, b) => (b.is_primary ? 1 : 0) - (a.is_primary ? 1 : 0) || (a.sense_index ?? 0) - (b.sense_index ?? 0);
  for (const bucket of byLemma.values()) bucket.sort(bySenseOrder);
  for (const bucket of byRowId.values()) bucket.sort(bySenseOrder);
  for (const bucket of byWordId.values()) bucket.sort(bySenseOrder);
  return { byLemma, byRowId, byWordId };
}
function resolveWordSense(index, input = {}) {
  const { byRowId, byLemma, byWordId } = index || {};
  const { row_id, word_id, sense_index, lemma } = input;
  if (row_id) {
    const bucket = byRowId?.get(row_id);
    if (!bucket || bucket.length === 0) {
      return { ok: true, word_id: row_id, sense_index: 0, sense_id: `${row_id}:0`, sense: null };
    }
    if (sense_index !== void 0 && sense_index !== null) {
      const groupBucket = byWordId?.get(bucket[0].word_id) || bucket;
      const exact = groupBucket.find((s) => s.sense_index === sense_index);
      if (exact) {
        return { ok: true, word_id: exact.word_id, sense_index: exact.sense_index, sense_id: `${exact.word_id}:${exact.sense_index}`, sense: exact };
      }
    }
    if (bucket.length === 1) {
      const sense = bucket[0];
      return { ok: true, word_id: sense.word_id, sense_index: sense.sense_index, sense_id: `${sense.word_id}:${sense.sense_index}`, sense };
    }
    return {
      ok: false,
      reason: "ambiguous_sense",
      word_id: bucket[0].word_id,
      candidates: bucket.map((s) => `${s.word_id}:${s.sense_index}`)
    };
  }
  if (word_id && sense_index !== void 0 && sense_index !== null) {
    return { ok: true, word_id, sense_index, sense_id: `${word_id}:${sense_index}` };
  }
  if (lemma) {
    const bucket = byLemma?.get(normalizeLemma(lemma));
    if (!bucket || bucket.length === 0) {
      return { ok: false, reason: "no_corpus_row" };
    }
    const distinctIndexes = new Set(bucket.map((s) => s.sense_index));
    if (distinctIndexes.size > 1) {
      return {
        ok: false,
        reason: "ambiguous_sense",
        word_id: bucket[0].word_id,
        candidates: bucket.map((s) => `${s.word_id}:${s.sense_index}`)
      };
    }
    const sense = bucket[0];
    return { ok: true, word_id: sense.word_id, sense_index: sense.sense_index, sense_id: `${sense.word_id}:${sense.sense_index}`, sense };
  }
  return { ok: false, reason: "unparseable" };
}
var POS_LABELS = { noun: "n.", verb: "v.", adjective: "adj.", adverb: "adv." };
function posLabel(pos) {
  return POS_LABELS[clean2(pos).toLowerCase()] || "";
}
function posForWord({ word, senses, senseIndex } = {}) {
  if (!senses || !word?.id) return "";
  const resolution = resolveWordSense(senses, { row_id: word.id, sense_index: senseIndex });
  const sense = resolution?.ok ? resolution.sense : null;
  return posLabel(sense?.pos);
}
function definitionFromSense(sense, level) {
  if (!sense) return "";
  const own = SUPPORT_LADDER[level]?.field;
  if (own && clean2(sense[own])) return clean2(sense[own]);
  for (const rung of DESCENT) {
    const field = SUPPORT_LADDER[rung].field;
    if (field && clean2(sense[field])) return clean2(sense[field]);
  }
  return clean2(sense.english_definition);
}
function translationFromSense(sense, lang) {
  if (!sense) return "";
  if (lang === "ru") return clean2(sense.translation_ru) || clean2(sense.translation_uz);
  if (lang === "uz") return clean2(sense.translation_uz) || clean2(sense.translation_ru);
  return clean2(sense.translation_uz) || clean2(sense.translation_ru);
}
function supportFor({ word, level, lang, senses, senseIndex } = {}) {
  let senseResolution = null;
  if (senses) {
    const byRow = word?.id ? resolveWordSense(senses, { row_id: word.id, sense_index: senseIndex }) : null;
    if (byRow && byRow.ok && byRow.sense) {
      senseResolution = byRow;
    } else if (word?.english) {
      const byLemma = resolveWordSense(senses, { lemma: word.english });
      if (byLemma.ok && byLemma.sense) {
        senseResolution = byLemma;
      } else if (!byLemma.ok && byLemma.reason === "ambiguous_sense") {
        senseResolution = byLemma;
      } else {
        senseResolution = byRow || byLemma;
      }
    } else {
      senseResolution = byRow;
    }
  }
  const sense = senseResolution?.ok ? senseResolution.sense : null;
  const translation = translationFromSense(sense, lang) || clean2(meaningInLang(word, lang === "en" ? "uz" : lang));
  const definition = definitionFromSense(sense, level) || clean2(definitionForLevel(word, level, lang));
  const mode = usesTranslationSupport(level) ? "translation" : "definition";
  return {
    mode,
    // What to show as the meaning, respecting the ladder: A1/Starter read the
    // translation, everyone above reads their own definition rung — with the
    // other value always available for the optional hint reveal that
    // HINT_XP_MULTIPLIER already prices.
    primary: mode === "translation" ? translation || definition : definition || translation,
    definition,
    translation,
    example: clean2(sense?.example_en) || clean2(word?.example_en),
    pronunciation: clean2(sense?.pronunciation) || clean2(word?.pronunciation),
    cefr: clean2(sense?.cefr) || clean2(word?.cefr),
    register: clean2(sense?.register),
    collocations: sense?.collocations || [],
    wordForms: sense?.word_forms || [],
    senseIndex: sense?.sense_index ?? null,
    senseLabel: clean2(sense?.sense_label),
    fromSense: !!sense,
    senseResolution
  };
}
export {
  SUPPORT_LADDER,
  indexSenses,
  posForWord,
  posLabel,
  resolveWordSense,
  supportFor,
  usesTranslationSupport
};
