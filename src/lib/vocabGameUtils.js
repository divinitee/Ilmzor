// The meaning in the app's current language (uz/en/ru from useAppLang).
//
// BUGFIX (2026-09-04): English mode used to fall back to w.uzbek (then
// w.russian) because VocabularyWord had no English meaning field at all —
// so a student in English mode was shown Uzbek, silently, in every game
// that calls this. VocabularyWord now carries a real english_definition on
// every row (AI-generated, verified against the full 2,282-row set: zero
// missing, zero self-referencing). English mode reads that field first.
//
// The uzbek/russian fallback stays, but only as a safety net for a future
// word added to the pool before the next enrichment pass reaches it — not
// the normal path anymore. It intentionally still leaks in that one edge
// case rather than showing nothing, which was the pre-existing tradeoff for
// every language; making a word appear with no meaning at all would be a
// worse failure than a rare, temporary Uzbek fallback.
export const meaningInLang = (w, lang) => {
  if (!w) return "";
  if (lang === "uz") return w.uzbek || "";
  if (lang === "ru") return w.russian || "";
  return w.english_definition || w.uzbek || w.russian || "";
};

export const usableWords = (words = []) =>
  words.filter((w) => w && w.english && (w.uzbek || w.russian));

export function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export const pickN = (arr, n) => shuffle(arr).slice(0, n);

// Build a multiple-choice question: pick the correct meaning of `target`
// from 4 options (1 correct + 3 distractors from the pool), in `lang`.
export function buildMeaningMcq(pool, target, lang) {
  const correct = meaningInLang(target, lang);
  const distractors = [];
  const used = new Set([correct]);
  for (const w of shuffle(pool)) {
    const m = meaningInLang(w, lang);
    if (m && !used.has(m)) {
      used.add(m);
      distractors.push(m);
      if (distractors.length >= 3) break;
    }
  }
  const options = shuffle([correct, ...distractors]);
  return { correct, options };
}