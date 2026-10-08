// Pure helpers for the Coach word check (VT-40 Stage 3). Questions use the
// existing "quiz" evidence contract, so the SERVER grades them
// (progressCore.gradeTranslation): multiple_choice = pick the native
// translation; translation = pick the English headword.

/** Questions per word by plan depth (a word is small; grammar uses the full count). */
export const WORD_QUESTIONS = { probe: 1, "brush-up": 2, brush_up: 2, practice: 2, remediation: 3 };

export const nativeKeyFor = (lang) => (lang === "ru" ? "russian" : "uzbek");

function shuffle(arr, rnd = Math.random) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

/**
 * Build the questions for one word. Distractors come from `pool` (other words),
 * never the target, never duplicates, never empty. Returns [] when the word has
 * no usable native translation (then the item is skipped, not faked).
 */
export function buildWordQuestions(word, pool, { depth, lang, rnd = Math.random } = {}) {
  const nk = nativeKeyFor(lang);
  const native = (w) => (w?.[nk] || w?.uzbek || "").trim();
  if (!word?.english || !native(word)) return [];
  const n = WORD_QUESTIONS[depth] || 1;
  const others = pool.filter((w) => w && w.id !== word.id && w.english && native(w) && native(w) !== native(word) && w.english !== word.english);
  const qs = [];
  for (let k = 0; k < n; k++) {
    const type = k % 2 === 0 ? "multiple_choice" : "translation";
    const picks = shuffle(others, rnd).slice(0, 3);
    if (picks.length < 2) break;
    const correct = type === "multiple_choice" ? native(word) : word.english;
    const options = shuffle([correct, ...picks.map((w) => (type === "multiple_choice" ? native(w) : w.english))], rnd);
    qs.push({ type, prompt: type === "multiple_choice" ? word.english : native(word), options, correct });
  }
  return qs;
}

/** The evidence item the server grades itself (given = the option text chosen). */
export const evidenceItem = (word, q, given) => ({ word: word.english, word_id: word.id, type: q.type, given, correct: given === q.correct });

/** "grammar:tenses.present.simple-routine" -> ["tenses","present","simple-routine"]. */
export function grammarPath(itemKey) {
  const slug = String(itemKey || "").replace(/^grammar:/, "");
  const [domain, branch, ...rest] = slug.split(".");
  return domain && branch && rest.length ? [domain, branch, rest.join(".")] : null;
}

/** Plan depth -> grammar practice stage. Weak/new start at "choose" (recognise first). */
export const stageForDepth = (depth) => (depth === "practice" ? "build" : depth === "brush-up" || depth === "brush_up" ? "transform" : "choose");
