import { normalizeLemma } from "@/lib/vocab/lemma";
import { wordsForLemmas } from "@/lib/vocab/repository";
import { wordsForLevel, MIN_POOL } from "@/lib/levels";
import { shuffle } from "@/lib/vocabGameUtils";

// The thematic curriculum: a scaffolded graph of themes, not a list of tags.
//
// Themes and their membership are DATA (VocabTheme + ThemeWord), never
// hardcoded here — adding themes for a 10,000-word corpus has to be an insert,
// not an edit to this file. Everything below is pure: it takes rows and returns
// structures, so it is testable in node and cannot drift from what the database
// says.
//
// With zero published themes — the state at creation — buildCurriculum returns
// an empty graph and poolForTheme is never called, so every existing surface
// keeps using the CEFR band pool from wordsForLevel() exactly as today.

export const ROLE = { CORE: "core", SUPPORTING: "supporting", RECYCLED: "recycled" };
export const THEME_STATUS = { NOT_STARTED: "not_started", IN_PROGRESS: "in_progress", MASTERED: "mastered" };

// Build the theme graph from raw rows. Unpublished themes are excluded, and a
// prerequisite pointing at a missing or unpublished theme is REPORTED rather
// than silently dropped — a dangling edge would leave a theme permanently
// locked, which reads to a learner as a broken app.
export function buildCurriculum({ themes = [], themeWords = [] } = {}) {
  const published = themes.filter((t) => t && t.key && t.is_published !== false);
  const byKey = new Map(published.map((t) => [t.key, t]));
  const issues = [];

  const members = new Map(published.map((t) => [t.key, { core: [], supporting: [], recycled: [] }]));
  for (const tw of themeWords) {
    if (!tw || tw.approved === false) continue;
    const bucket = members.get(tw.theme_key);
    if (!bucket) continue; // membership in an unpublished theme is not an error
    const lemma = normalizeLemma(tw.lemma_key);
    if (!lemma) continue;
    const role = bucket[tw.role] ? tw.role : ROLE.CORE;
    bucket[role].push({ lemma, wordId: tw.word_id || null, senseIndex: tw.sense_index ?? null, order: tw.order_index ?? null });
  }
  for (const bucket of members.values()) {
    for (const role of Object.keys(bucket)) {
      bucket[role].sort((a, b) => (a.order ?? Number.MAX_SAFE_INTEGER) - (b.order ?? Number.MAX_SAFE_INTEGER));
    }
  }

  for (const t of published) {
    for (const p of t.prerequisite_keys || []) {
      if (!byKey.has(p)) issues.push({ theme: t.key, kind: "missing_prerequisite", ref: p });
    }
    for (const r of t.recycle_theme_keys || []) {
      if (!byKey.has(r)) issues.push({ theme: t.key, kind: "missing_recycle_source", ref: r });
    }
  }
  issues.push(...findCycles(published));

  const ordered = [...published].sort(
    (a, b) => (a.tier ?? 0) - (b.tier ?? 0) || (a.order_index ?? 0) - (b.order_index ?? 0) || String(a.key).localeCompare(String(b.key))
  );

  return { themes: ordered, byKey, members, issues };
}

// Depth-first cycle detection. A cycle makes every theme in it unreachable, so
// it is worth naming precisely instead of failing at unlock time.
function findCycles(themes) {
  const edges = new Map(themes.map((t) => [t.key, (t.prerequisite_keys || []).filter((k) => themes.some((x) => x.key === k))]));
  const state = new Map();
  const found = [];
  const walk = (key, trail) => {
    if (state.get(key) === "done") return;
    if (state.get(key) === "open") { found.push({ theme: key, kind: "prerequisite_cycle", ref: trail.join(" → ") }); return; }
    state.set(key, "open");
    for (const next of edges.get(key) || []) walk(next, [...trail, next]);
    state.set(key, "done");
  };
  for (const t of themes) walk(t.key, [t.key]);
  return found;
}

// Whether a theme is open to this learner: every prerequisite mastered.
// Derived from ThemeProgress rows on each call, never stored — changing a
// prerequisite re-gates the map immediately instead of leaving a stale flag.
export function isThemeUnlocked(theme, progressByKey = new Map()) {
  const prereqs = theme?.prerequisite_keys || [];
  if (prereqs.length === 0) return true;
  return prereqs.every((k) => progressByKey.get(k)?.status === THEME_STATUS.MASTERED);
}

// The learner-facing map: every published theme with its status and lock state.
export function curriculumMap(curriculum, progressRows = []) {
  const progressByKey = new Map(progressRows.filter((p) => p?.theme_key).map((p) => [p.theme_key, p]));
  return curriculum.themes.map((theme) => {
    const progress = progressByKey.get(theme.key) || null;
    const counts = curriculum.members.get(theme.key) || { core: [], supporting: [], recycled: [] };
    return {
      theme,
      status: progress?.status || THEME_STATUS.NOT_STARTED,
      unlocked: isThemeUnlocked(theme, progressByKey),
      lockedBy: (theme.prerequisite_keys || []).filter((k) => progressByKey.get(k)?.status !== THEME_STATUS.MASTERED),
      masteryPct: progress?.mastery_pct || 0,
      coreTotal: counts.core.length,
      coreMastered: progress?.core_mastered || 0,
    };
  });
}

// Lemmas a theme recycles: its own recycled-role rows PLUS the core words of
// every theme in recycle_theme_keys. Pulled BY REFERENCE — recycling never
// duplicates a ThemeWord row, which is what keeps one word one record however
// many later themes reinforce it.
export function recycledLemmas(curriculum, themeKey) {
  const theme = curriculum.byKey.get(themeKey);
  if (!theme) return [];
  const out = new Set((curriculum.members.get(themeKey)?.recycled || []).map((m) => m.lemma));
  for (const sourceKey of theme.recycle_theme_keys || []) {
    for (const m of curriculum.members.get(sourceKey)?.core || []) out.add(m.lemma);
  }
  return [...out];
}

// The word pool for one theme, banded to the learner and composed
// core + supporting + recycled.
//
// DEGRADATION IS THE POINT. A theme holds 50-120 words; after CEFR banding a
// learner may see far fewer, and several engines refuse to run below a
// threshold (MIN_POOL = 40, Crossword needs 4+ placeable words, every MCQ needs
// 4 distinct options). So the chain is:
//     theme (core + supporting) → its recycled words → prerequisite themes'
//     words → the plain CEFR band pool
// Each step only ADDS. A thin theme therefore plays slightly off-theme rather
// than handing a game an unplayable pool — the same principle wordsForLevel()
// already applies to unbanded words.
export function poolForTheme({ curriculum, themeKey, index, level, minPool = MIN_POOL } = {}) {
  const theme = curriculum?.byKey?.get(themeKey);
  if (!theme) return { words: [], sources: [], theme: null };

  const members = curriculum.members.get(themeKey) || { core: [], supporting: [], recycled: [] };
  const band = (lemmas) => wordsForLevel(wordsForLemmas(index, lemmas), level);

  const core = band(members.core.map((m) => m.lemma));
  const supporting = band(members.supporting.map((m) => m.lemma));
  const recycled = band(recycledLemmas(curriculum, themeKey));

  const seen = new Set();
  const words = [];
  const sources = [];
  const push = (list, source) => {
    for (const w of list) {
      const lemma = normalizeLemma(w?.english);
      if (!lemma || seen.has(lemma)) continue;
      seen.add(lemma);
      words.push(w);
      sources.push(source);
    }
  };

  push(core, ROLE.CORE);
  push(supporting, ROLE.SUPPORTING);
  push(recycled, ROLE.RECYCLED);

  if (words.length < minPool) {
    for (const prereqKey of theme.prerequisite_keys || []) {
      const prereq = curriculum.members.get(prereqKey);
      if (!prereq) continue;
      push(band([...prereq.core, ...prereq.supporting].map((m) => m.lemma)), "prerequisite");
      if (words.length >= minPool) break;
    }
  }

  return { theme, words, sources, coreCount: core.length, supportingCount: supporting.length, recycledCount: recycled.length, degraded: words.length < minPool };
}

// A themed round: recycle_share of the items pulled from recycled words, the
// rest from core then supporting, never short. Same never-a-short-round
// contract as composeRound() in roundComposition.js, and deliberately shaped
// the same way so the adaptive engine can hand its output straight to it.
export function composeThemedSelection({ pool, count, recycleShare } = {}) {
  const words = pool?.words || [];
  if (words.length === 0) return [];
  const sources = pool?.sources || [];
  const share = typeof recycleShare === "number" ? recycleShare : (pool?.theme?.recycle_share ?? 0.25);

  const of = (role) => words.filter((_, i) => sources[i] === role);
  const recycleTarget = Math.min(Math.round(count * share), Math.max(0, count - 1));

  const picked = [];
  const seen = new Set();
  const take = (list, n) => {
    for (const w of shuffle(list)) {
      if (picked.length >= count || n <= 0) break;
      const lemma = normalizeLemma(w.english);
      if (seen.has(lemma)) continue;
      seen.add(lemma);
      picked.push(w);
      n -= 1;
    }
  };

  take(of(ROLE.RECYCLED), recycleTarget);
  take(of(ROLE.CORE), count - picked.length);
  take(of(ROLE.SUPPORTING), count - picked.length);
  take(words, count - picked.length); // top-up from anything left, incl. prerequisite fill
  return shuffle(picked);
}