// The meaning in the app's current language (uz/en/ru from useAppLang).
// "en" has no dedicated meaning field on VocabularyWord, so it falls back
// to showing whichever translation exists, Uzbek first.
export const meaningInLang = (w, lang) => {
  if (!w) return "";
  if (lang === "uz") return w.uzbek || "";
  if (lang === "ru") return w.russian || "";
  return w.uzbek || w.russian || "";
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