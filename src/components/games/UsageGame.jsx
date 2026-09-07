import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { ArrowLeft, Star, Flame, Target, Loader2, BookOpen, Trophy, RotateCcw, ArrowRight, Check, X, HelpCircle } from "lucide-react";
import { shuffle, pickN } from "@/lib/vocabGameUtils";
import { SKILLS } from "@/lib/gameSkills";
import { computeRoundXp, recordRoundReward, generateRoundId, roundPassed } from "@/lib/gameScoring";
import { buildPersonalizedRound, logWordAttempts, PROVENANCE } from "@/lib/roundComposition";
import { synonymForLevel } from "@/lib/synonymTiers";
import { useUsageCopy } from "@/components/games/usageCopy";
import { SENTENCE_REPAIR_BANK, COLLOCATION_BANK } from "@/lib/usageBank";

// ---------------------------------------------------------------------------
// Usage — new engine for the four Vocabulary labels that used to point at
// SentenceBuilderGame's "write a sentence from theme words" mechanic.
//
// THE PROBLEM: four labels (Fill the Blank, Choose the Best Word, Sentence
// Repair, Collocation Match) all pointed at game: "sentence" — the same
// engine that Grammar's Sentence Structure also uses. None of these four
// have anything to do with writing your own sentence. Same fake-duplicate
// situation as Spelling / Word Forms, but wider (six labels across two
// skills shared one engine).
//
// THE FIX: new game key "usage", new engine. SentenceBuilderGame and
// Grammar's Sentence Structure entries are untouched and keep working.
//
// FOUR MECHANICS (all MCQ, all clean pass/fail — no InvokeLLM):
//   fill_blank (Easy): sentence from VocabularyWord.example_en with the word
//     blanked out; pick the word that fills it. Distractors are random words
//     from the pool. No new authoring — example_en has ~98% fill rate.
//   best_word (Medium): same sentence, but distractors are synonyms from
//     synonymTiers.js — near-misses that test register/nuance, not just
//     recognition. No new authoring — the ladder has ~300 entries.
//   sentence_repair (Hard): a sentence with one wrong word choice; pick the
//     correct replacement. Hand-authored bank (20 entries) in usageBank.js.
//   collocation_match (Medium): "make a ___" → pick the word that forms a
//     natural fixed expression. Hand-authored bank (20 entries) in usageBank.js.
//
// GAME_SKILL_MAP: "vocabulary" (not "creativity" like sentence). These four
// are word-selection tasks, not free-text creation — the student picks, not
// writes. Accent #7C6BE8 from SKILLS.
//
// SHARED INFRASTRUCTURE FLOOR:
// 1. gameScoring.js — computeRoundXp / recordRoundReward / roundPassed
// 2. Attempt budget (ATTEMPTS_PER_ITEM = 1.5)
// 3. buildPersonalizedRound (fill_blank, best_word) + logWordAttempts (all)
// 4. Provenance badges (fill_blank, best_word only — fixed banks have none)
// 5. premium-mesh / premium-card / neo-pill, accent #7C6BE8
// 6. usageCopy.js — full en/uz/ru
// 7. Mini blitz lesson — 1 screen (fb/bw/sr), 2 screens (cm)
// ---------------------------------------------------------------------------

const GAME = "usage";
const ACCENT = SKILLS.find((s) => s.key === "vocabulary")?.color || "#7C6BE8";

const TIER = {
  beginner:     6,
  intermediate: 8,
  advanced:     10,
  proficient:   12,
};
const ATTEMPTS_PER_ITEM = 1.5;
const CORRECT_MS = 550;
const MISS_MS = 520;
const BLITZ_KEY = "vm_usage_blitz_seen";

// ---- pool filters ----

// fill_blank: words with example_en that contains the word as a whole word.
// Does NOT use usableWords() — we only need english + example_en, not
// uzbek/russian (the meaning isn't shown in this mode).
function fillBlankPool(words) {
  return words.filter((w) => {
    const en = (w.english || "").trim();
    const sentence = (w.example_en || "").trim();
    if (!en || !sentence) return false;
    const escaped = en.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`\\b${escaped}\\b`, "i").test(sentence);
  });
}

// best_word: same as fill_blank but also needs 3+ unique synonyms from the ladder
function bestWordPool(words) {
  return fillBlankPool(words).filter((w) => {
    const en = (w.english || "").trim().toLowerCase();
    const syns = new Set();
    for (const tier of ["A2", "B1", "B2", "C1"]) {
      const s = synonymForLevel(w, tier);
      if (s && s.toLowerCase() !== en) syns.add(s);
    }
    return syns.size >= 3;
  });
}

// ---- question builders ----

function buildFillBlankQ(word, pool) {
  const en = word.english;
  const escaped = en.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const sentence = word.example_en.replace(new RegExp(`\\b${escaped}\\b`, "i"), "_____");
  const distractors = shuffle(pool.filter((w) => w.english !== en)).slice(0, 3).map((w) => w.english);
  return { id: `${en}-${Math.random()}`, sentence, correct: en, options: shuffle([en, ...distractors]), word: en, _provenance: word._provenance };
}

function buildBestWordQ(word) {
  const en = word.english;
  const escaped = en.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const sentence = word.example_en.replace(new RegExp(`\\b${escaped}\\b`, "i"), "_____");
  const syns = new Set();
  for (const tier of ["A2", "B1", "B2", "C1"]) {
    const s = synonymForLevel(word, tier);
    if (s && s.toLowerCase() !== en.toLowerCase()) syns.add(s);
  }
  const distractors = shuffle([...syns]).slice(0, 3);
  return { id: `${en}-${Math.random()}`, sentence, correct: en, options: shuffle([en, ...distractors]), word: en, _provenance: word._provenance };
}

function buildRepairQ(entry) {
  return { id: `${entry.correct}-${Math.random()}`, sentence: entry.sentence, wrong: entry.wrong, correct: entry.correct, options: shuffle([entry.correct, ...entry.distractors]), word: entry.correct };
}

function buildCollocationQ(entry) {
  return { id: `${entry.correct}-${Math.random()}`, sentence: entry.prompt, correct: entry.correct, options: shuffle([entry.correct, ...entry.distractors]), word: entry.correct, isCollocation: true };
}

// ---- component ----

export default function UsageGame({ words = [], bank: mode = "fill_blank", user, level, difficulty = "intermediate", onBack, onXpEarned, onGameComplete }) {
  const { c, t } = useUsageCopy();
  const rm = useReducedMotion();
  const itemCount = TIER[difficulty] || TIER.intermediate;

  // Pool for VocabularyWord-based modes
  const pool = useMemo(() => {
    if (mode === "fill_blank") return fillBlankPool(words);
    if (mode === "best_word") return bestWordPool(words);
    return [];
  }, [words, mode]);

  const usesVocabPool = mode === "fill_blank" || mode === "best_word";
  const fixedBank = mode === "sentence_repair" ? SENTENCE_REPAIR_BANK : mode === "collocation_match" ? COLLOCATION_BANK : [];

  const [sessionXp, setSessionXp] = useState(0);
  const [phase, setPhase] = useState("loading");
  const [questions, setQuestions] = useState([]);
  const [idx, setIdx] = useState(0);
  const [ruledOut, setRuledOut] = useState([]);
  const [revealed, setRevealed] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [firstTryCount, setFirstTryCount] = useState(0);
  const [streak, setStreak] = useState(0);
  const [streakBest, setStreakBest] = useState(0);
  const [tries, setTries] = useState(0);
  const [budget, setBudget] = useState(0);
  const [summary, setSummary] = useState(null);
  const [flyups, setFlyups] = useState([]);
  const [showBlitz, setShowBlitz] = useState(false);

  const roundId = useRef(null);
  const roundItems = useRef([]);
  const firstTry = useRef(new Set());
  const missedOnce = useRef(new Set());
  const triesRef = useRef(0);
  const budgetRef = useRef(0);
  const streakBestRef = useRef(0);
  const idxRef = useRef(0);
  const finishing = useRef(false);
  const busy = useRef(false);

  const titleKey = `title_${mode}`;
  const instructionKey = `${mode === "fill_blank" ? "fb" : mode === "best_word" ? "bw" : mode === "sentence_repair" ? "sr" : "cm"}_instruction`;

  // Blitz: show once per mode
  useEffect(() => {
    try {
      const seen = JSON.parse(localStorage.getItem(BLITZ_KEY) || "{}");
      if (!seen[mode]) { setShowBlitz(true); seen[mode] = true; localStorage.setItem(BLITZ_KEY, JSON.stringify(seen)); }
    } catch { /* ignore */ }
  }, [mode]);

  const startRound = useCallback(async (startStreak) => {
    setPhase("loading");
    finishing.current = false;
    busy.current = false;
    roundId.current = generateRoundId();
    firstTry.current = new Set();
    missedOnce.current = new Set();

    let built = [];

    if (usesVocabPool) {
      if (pool.length < 4) { setPhase("empty"); return; }
      // buildPersonalizedRound fetches WordAttempt + SavedWord from the server.
      // If those calls hang (rate limit, slow network), race against a timeout
      // and fall back to a simple shuffle — the game stays playable without
      // personalization, same as OddOneOutGame's fixed-bank approach.
      let chosen = null;
      try {
        chosen = await Promise.race([
          buildPersonalizedRound({ words: pool, userEmail: user?.email, count: Math.min(itemCount, pool.length) }),
          new Promise((resolve) => setTimeout(() => resolve(null), 4000)),
        ]);
      } catch { /* rate limit or network — fall through to shuffle */ }
      if (!chosen || chosen.length === 0) chosen = shuffle(pool).slice(0, Math.min(itemCount, pool.length));
      built = chosen.map((w) => mode === "fill_blank" ? buildFillBlankQ(w, pool) : buildBestWordQ(w));
    } else {
      const picks = pickN(fixedBank, Math.min(itemCount, fixedBank.length));
      built = picks.map((e) => mode === "sentence_repair" ? buildRepairQ(e) : buildCollocationQ(e));
    }

    if (built.length === 0) { setPhase("empty"); return; }

    roundItems.current = built;
    budgetRef.current = Math.max(built.length, Math.round(built.length * ATTEMPTS_PER_ITEM));
    triesRef.current = 0;
    streakBestRef.current = startStreak;
    idxRef.current = 0;

    setQuestions(built);
    setIdx(0);
    setRuledOut([]);
    setRevealed(false);
    setFeedback(null);
    setFirstTryCount(0);
    setStreak(startStreak);
    setStreakBest(startStreak);
    setTries(0);
    setBudget(budgetRef.current);
    setSummary(null);
    setFlyups([]);
    setPhase("playing");
  }, [pool, fixedBank, usesVocabPool, itemCount, mode, user?.email]);

  useEffect(() => { startRound(0); }, [startRound]);

  const finishRound = useCallback((reason) => {
    if (finishing.current || !roundItems.current.length) return;
    finishing.current = true;
    const items = roundItems.current;
    const itemsTotal = items.length;
    const itemsCorrect = firstTry.current.size;
    const finalStreakBest = streakBestRef.current;
    const usedTries = triesRef.current;

    const { amount, streakBonus } = computeRoundXp({ itemsCorrect, streakBest: finalStreakBest });
    recordRoundReward({ userEmail: user?.email, game: GAME, roundId: roundId.current, itemsTotal, itemsCorrect, streakBest: finalStreakBest, hintMultiplier: 1, level });
    logWordAttempts({
      userEmail: user?.email,
      game: GAME,
      level,
      roundId: roundId.current,
      items: items.map((it) => ({ word: it.word, correct: firstTry.current.has(it.word) })),
    });

    const scorePct = Math.round((itemsCorrect / itemsTotal) * 100);
    onXpEarned?.(amount, itemsCorrect);
    onGameComplete?.({ scorePct, correct: itemsCorrect, total: itemsTotal });
    setSessionXp((v) => v + amount);
    setSummary({
      passed: roundPassed(itemsCorrect, itemsTotal),
      reason,
      tries: usedTries,
      budget: budgetRef.current,
      accuracyPct: usedTries ? Math.round((itemsCorrect / usedTries) * 100) : 0,
      streakBest: finalStreakBest,
      amount,
      streakBonus,
      itemsCorrect,
      itemsTotal,
    });
    setPhase("result");
  }, [user?.email, level, onXpEarned, onGameComplete]);

  const advance = useCallback(() => {
    const next = idxRef.current + 1;
    if (next >= roundItems.current.length) { finishRound("clear"); return; }
    idxRef.current = next;
    setIdx(next);
    setRuledOut([]);
    setRevealed(false);
    if (triesRef.current >= budgetRef.current) finishRound("budget");
  }, [finishRound]);

  const handlePick = (opt) => {
    const q = roundItems.current[idxRef.current];
    if (phase !== "playing" || busy.current || !q || revealed) return;
    busy.current = true;
    triesRef.current += 1;
    setTries(triesRef.current);

    if (opt === q.correct) {
      const clean = !missedOnce.current.has(q.word);
      if (clean) {
        firstTry.current.add(q.word);
        setFirstTryCount(firstTry.current.size);
        const s = streak + 1;
        streakBestRef.current = Math.max(streakBestRef.current, s);
        setStreak(s);
        setStreakBest(streakBestRef.current);
        const fid = `${roundId.current}-${q.id}`;
        setFlyups((f) => [...f, { id: fid, amount: computeRoundXp({ itemsCorrect: 1 }).amount }]);
        setTimeout(() => setFlyups((f) => f.filter((x) => x.id !== fid)), 900);
      }
      setRevealed(true);
      setFeedback("correct");
      setTimeout(() => { busy.current = false; if (finishing.current) return; advance(); }, CORRECT_MS);
    } else {
      missedOnce.current.add(q.word);
      setStreak(0);
      setRuledOut((r) => [...r, opt]);
      setFeedback("miss");
      setTimeout(() => {
        busy.current = false;
        if (finishing.current) return;
        setFeedback(null);
        if (triesRef.current >= budgetRef.current) finishRound("budget");
      }, MISS_MS);
    }
  };

  // ---- Blitz ----
  const blitzScreens = useMemo(() => {
    const prefix = mode === "fill_blank" ? "fb" : mode === "best_word" ? "bw" : mode === "sentence_repair" ? "sr" : "cm";
    const screens = [c(`${prefix}_blitz_1`)];
    if (mode === "collocation_match") screens.push(c("cm_blitz_2"));
    return screens;
  }, [mode, c]);
  const [blitzIdx, setBlitzIdx] = useState(0);

  // ---- Derived ----
  const playing = phase === "playing";
  const q = questions[idx];
  const liveXp = sessionXp + (playing ? computeRoundXp({ itemsCorrect: firstTryCount, streakBest }).amount : 0);
  const progress = questions.length ? idx / questions.length : 0;
  const triesLeft = Math.max(0, budget - tries);

  if (showBlitz) {
    const isLast = blitzIdx >= blitzScreens.length - 1;
    return (
      <div className="min-h-screen bg-background premium-mesh flex flex-col items-center justify-center px-4">
        <motion.div initial={rm ? false : { opacity: 0, y: 16, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }} className="premium-card p-6 w-full max-w-sm text-center">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: `${ACCENT}22`, border: `1px solid ${ACCENT}44` }}>
            <HelpCircle className="w-7 h-7" style={{ color: ACCENT }} aria-hidden="true" />
          </div>
          <p className="text-[11px] font-semibold uppercase tracking-widest mb-2" style={{ color: ACCENT }}>{c(titleKey)}</p>
          <p className="text-base text-foreground leading-relaxed mb-6">{blitzScreens[blitzIdx]}</p>
          <div className="flex gap-2">
            <button onClick={() => setShowBlitz(false)} className="flex-1 h-11 rounded-xl border border-white/15 bg-white/[0.04] text-foreground text-sm font-semibold select-none">{c("blitz_skip")}</button>
            <button onClick={() => { if (isLast) setShowBlitz(false); else setBlitzIdx((i) => i + 1); }} className="flex-1 h-11 rounded-xl text-white font-semibold select-none" style={{ background: `linear-gradient(180deg, ${ACCENT}, ${ACCENT}cc)` }}>{isLast ? c("blitz_start") : c("blitz_next")}</button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background premium-mesh flex flex-col">
      {/* HUD */}
      <header className="bg-background/70 backdrop-blur-xl border-b border-white/10 px-3 py-2 flex items-center justify-between safe-header gap-2">
        <button onClick={onBack} className="min-h-[44px] min-w-[44px] flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground select-none px-1">
          <ArrowLeft className="w-4 h-4" aria-hidden="true" /> {t("gameui.back")}
        </button>
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-bold truncate" style={{ color: ACCENT }}>{c(titleKey)}</span>
          <button onClick={() => setShowBlitz(true)} className="min-h-[28px] min-w-[28px] flex items-center justify-center text-muted-foreground hover:text-foreground select-none">
            <HelpCircle className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
        </div>
        <div className="flex items-center gap-1.5 text-xs font-bold select-none">
          {playing && budget > 0 && (
            <span className={`neo-pill px-2.5 h-8 ${triesLeft <= Math.ceil(budget * 0.25) ? "text-destructive" : "text-muted-foreground"}`} aria-label={c("attempts")}>
              <Target className="w-3.5 h-3.5" aria-hidden="true" /> {triesLeft}
            </span>
          )}
          <span className="neo-pill px-2.5 h-8 text-amber-300" aria-label={c("xp")}>
            <Star className="w-3.5 h-3.5" aria-hidden="true" /> {liveXp}
          </span>
          <span className={`neo-pill px-2.5 h-8 ${streak > 0 ? "text-orange-300" : "text-muted-foreground"}`} aria-label={c("streak")}>
            <Flame className="w-3.5 h-3.5" aria-hidden="true" /> {streak}
          </span>
        </div>
      </header>

      {/* Progress bar */}
      <div className="h-1 bg-white/5" role="progressbar" aria-valuenow={Math.round(progress * 100)} aria-valuemin={0} aria-valuemax={100}>
        <motion.div className="h-full" style={{ background: `linear-gradient(90deg, ${ACCENT}, ${ACCENT}aa)` }} animate={{ width: `${progress * 100}%` }} transition={{ duration: rm ? 0 : 0.5, ease: [0.16, 1, 0.3, 1] }} />
      </div>

      <div className="flex-1 flex flex-col px-3 py-4 max-w-2xl mx-auto w-full relative">
        {/* XP flyups */}
        <div className="pointer-events-none absolute inset-x-0 top-2 flex justify-center z-20" aria-live="polite">
          <AnimatePresence>
            {flyups.map((f) => (
              <motion.span key={f.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: -18 }} exit={{ opacity: 0, y: -40 }} transition={{ duration: rm ? 0.1 : 0.8, ease: "easeOut" }} className="absolute text-sm font-bold text-amber-300 drop-shadow">
                +{f.amount} {c("xp")}
              </motion.span>
            ))}
          </AnimatePresence>
        </div>

        {phase === "empty" && (
          <div className="premium-card flex-1 flex flex-col items-center justify-center text-center p-8">
            <BookOpen className="w-10 h-10 text-muted-foreground/40 mb-3" aria-hidden="true" />
            <p className="text-sm text-muted-foreground mb-5">{c("empty")}</p>
            <button onClick={onBack} className="h-12 px-6 rounded-xl text-white font-semibold select-none" style={{ background: ACCENT }}>{t("nav.skill_hub")}</button>
          </div>
        )}

        {phase === "loading" && (
          <div className="premium-card flex-1 flex flex-col items-center justify-center text-center p-8">
            <Loader2 className="w-8 h-8 animate-spin mb-3" style={{ color: ACCENT }} aria-hidden="true" />
            <p className="text-sm text-muted-foreground">{c("loading")}</p>
          </div>
        )}

        {playing && q && (
          <>
            <div className="flex items-center justify-between gap-2 mb-3 text-[11px] text-muted-foreground">
              <span>{c("question", { n: idx + 1, total: questions.length })} · {c("item_progress", { n: firstTryCount, total: questions.length })}</span>
            </div>
            <p className="text-xs text-muted-foreground text-center mb-3">{c(instructionKey)}</p>

            <AnimatePresence mode="wait">
              <motion.div key={q.id} initial={rm ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={rm ? undefined : { opacity: 0, y: -12 }} transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}>
                {/* Sentence / prompt */}
                <div className="premium-card px-4 py-6 text-center mb-4">
                  {q.isCollocation ? (
                    <p className="text-2xl font-bold text-foreground">{q.sentence}</p>
                  ) : q.wrong ? (
                    <p className="text-lg leading-relaxed text-foreground">
                      {q.sentence.split(q.wrong).map((part, i, arr) => (
                        <React.Fragment key={i}>
                          {part}
                          {i < arr.length - 1 && (
                            <span className="font-bold text-rose-400 underline decoration-rose-400/50 underline-offset-2">{q.wrong}</span>
                          )}
                        </React.Fragment>
                      ))}
                    </p>
                  ) : (
                    <p className="text-lg leading-relaxed text-foreground">{q.sentence}</p>
                  )}
                </div>

                {/* Options */}
                <div className="grid grid-cols-2 gap-2.5">
                  {q.options.map((opt, i) => {
                    const out = ruledOut.includes(opt);
                    const isCorrect = revealed && opt === q.correct;
                    return (
                      <button
                        key={`${opt}-${i}`}
                        onClick={() => handlePick(opt)}
                        disabled={out || revealed}
                        className={`min-h-[56px] px-3 py-3 rounded-2xl border text-sm font-semibold transition-colors select-none ${
                          isCorrect ? "border-emerald-400/60 bg-emerald-500/10 text-emerald-200"
                          : out ? "border-rose-400/40 bg-rose-500/5 text-rose-300/70 line-through"
                          : "border-white/10 bg-white/[0.04] text-foreground hover:border-white/25"
                        }`}
                      >
                        {opt}
                        {isCorrect && <Check className="w-4 h-4 inline ml-1 text-emerald-400" aria-hidden="true" />}
                        {out && <X className="w-4 h-4 inline ml-1 text-rose-400" aria-hidden="true" />}
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            </AnimatePresence>

            {/* Feedback */}
            <div className="h-8 mt-3 flex items-center justify-center" aria-live="polite">
              <AnimatePresence mode="wait">
                {feedback && (
                  <motion.span key={feedback + idx + ruledOut.length} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: rm ? 0 : 0.2 }} className={`flex items-center gap-1.5 text-sm font-semibold ${feedback === "correct" ? "text-emerald-400" : "text-rose-400"}`}>
                    {feedback === "correct" ? <Check className="w-4 h-4" aria-hidden="true" /> : <X className="w-4 h-4" aria-hidden="true" />}
                    {feedback === "correct" ? c("correct") : c("miss")}
                  </motion.span>
                )}
              </AnimatePresence>
            </div>
          </>
        )}

        {phase === "result" && summary && (
          <div className="flex-1 flex items-center">
            <motion.div initial={rm ? false : { opacity: 0, y: 16, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }} className="premium-card p-5 w-full max-w-sm mx-auto">
              <div className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-3 ${summary.passed ? "bg-emerald-500/15" : "bg-amber-500/15"}`}>
                <Trophy className={`w-8 h-8 ${summary.passed ? "text-emerald-400" : "text-amber-400"}`} aria-hidden="true" />
              </div>
              <p className="text-[11px] font-semibold uppercase tracking-widest text-center mb-1" style={{ color: ACCENT }}>
                {summary.reason === "budget" ? c("result_out_of_attempts") : c("result_title")}
              </p>
              <h2 className="text-xl font-bold text-foreground text-center flex items-center justify-center gap-1.5">
                {summary.passed ? <Check className="w-5 h-5 text-emerald-400" aria-hidden="true" /> : <X className="w-5 h-5 text-amber-400" aria-hidden="true" />}
                {summary.passed ? c("result_pass") : c("result_fail")}
              </h2>
              <p className="text-3xl font-bold text-center mt-2 text-amber-300">+{summary.amount} {c("xp")}</p>
              {summary.streakBonus > 0 && (
                <p className="text-[11px] text-muted-foreground text-center mt-0.5">{c("streak_bonus", { n: summary.streakBonus })}</p>
              )}

              <div className="grid grid-cols-2 gap-2 mt-4">
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-center">
                  <p className="text-lg font-bold text-foreground leading-none">{summary.itemsCorrect}/{summary.itemsTotal}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">{c("first_try")}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-center">
                  <p className="text-lg font-bold text-foreground leading-none">{summary.tries}/{summary.budget}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">{c("tries_used")}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-center">
                  <p className="text-lg font-bold text-foreground leading-none">{summary.accuracyPct}%</p>
                  <p className="text-[10px] text-muted-foreground mt-1">{c("accuracy")}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-center">
                  <p className="text-lg font-bold text-foreground leading-none">{summary.streakBest}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">{c("best_streak")}</p>
                </div>
              </div>

              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mt-4 mb-1.5">{c("words_this_round")}</p>
              <ul className="max-h-36 overflow-y-auto space-y-1 pr-1">
                {roundItems.current.map((it, i) => (
                  <li key={i} className="flex items-center justify-between gap-2 text-xs">
                    <span className={`font-semibold truncate ${firstTry.current.has(it.word) ? "text-foreground" : "text-muted-foreground"}`}>{it.word}</span>
                    <span className="flex items-center gap-1 shrink-0">
                      {it._provenance === PROVENANCE.SAVED && <span className="text-[9px] text-sky-300">★</span>}
                      {it._provenance === PROVENANCE.WRONG && <span className="text-[9px] text-amber-300">{firstTry.current.has(it.word) ? "✓" : "↻"}</span>}
                    </span>
                  </li>
                ))}
              </ul>

              <button onClick={() => startRound(streak)} className="mt-4 w-full h-12 rounded-xl text-white font-semibold flex items-center justify-center gap-2 shadow-lg select-none" style={{ background: `linear-gradient(180deg, ${ACCENT}, ${ACCENT}cc)` }}>
                {c("keep_going")} <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </button>
              <div className="flex gap-2 mt-2">
                <button onClick={() => { setSessionXp(0); startRound(0); }} className="flex-1 h-11 rounded-xl border border-white/15 bg-white/[0.04] text-foreground text-sm font-semibold flex items-center justify-center gap-1.5 select-none">
                  <RotateCcw className="w-4 h-4" aria-hidden="true" /> {c("play_again")}
                </button>
                <button onClick={onBack} className="flex-1 h-11 rounded-xl border border-white/15 bg-white/[0.04] text-foreground text-sm font-semibold flex items-center justify-center gap-1.5 select-none">
                  <BookOpen className="w-4 h-4" aria-hidden="true" /> {t("nav.skill_hub")}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </div>
  );
}