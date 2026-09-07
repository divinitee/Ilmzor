import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { ArrowLeft, Check, X, Star, Flame, Target, Loader2, BookOpen, Trophy, RotateCcw, ArrowRight, HelpCircle, Sparkles } from "lucide-react";
import { shuffle, pickN } from "@/lib/vocabGameUtils";
import { SKILLS } from "@/lib/gameSkills";
import { computeRoundXp, recordRoundReward, generateRoundId, roundPassed } from "@/lib/gameScoring";
import { logWordAttempts } from "@/lib/roundComposition";
import { CATEGORY_BANK, CATEGORY_ENTRIES, ALL_WORDS, WORD_TO_CATEGORY } from "@/lib/relatedWordsBank";
import { useRelatedWordsCopy } from "@/components/games/relatedWordsCopy";

// ---------------------------------------------------------------------------
// Related Words + Connection Challenge — the last two nodes in Vocabulary >
// Relationships, and the last piece of Vocabulary overall. Both moved off the
// generic "quiz" engine (VocabQuizGame.jsx) onto this dedicated engine.
//
// MECHANIC:
//   related_words (Easy/Medium): show a target word + 4 options; pick the one
//     in the same semantic category. Tests surrounding vocabulary of a topic.
//   connection_challenge (Hard): show 3 same-category words + 4 options; pick
//     the one that belongs to the same group. The category must be inferred
//     from the examples — that inference step is what earns "Hard".
//
// CONTENT: hand-authored pilot bank (relatedWordsBank.js, 25 categories × 8
//   words = 200 words). Same precedent as OddOneOutGame's ODD_ONE_OUT_BANK.
//   Full coverage flagged as a content-authoring followup.
//
// PERSONALIZATION: skipped — fixed hand-authored bank, same as Antonym Hunt.
//   buildPersonalizedRound doesn't fit (bank words don't map to VocabularyWord
//   rows). logWordAttempts IS used (target word as `word`, no wordId) so
//   per-word history accumulates. No provenance badges.
//
// FIVE-LAYER STANDARD:
//   1. gameScoring.js — computeRoundXp / recordRoundReward / roundPassed
//   2. Attempt budget — ATTEMPTS_PER_ITEM multiplier, shown live in HUD
//   3. logWordAttempts — per-word history (no buildPersonalizedRound)
//   4. premium-mesh / premium-card / neo-pill shell, accent #7C6BE8
//   5. relatedWordsCopy.js — full en/uz/ru
// ---------------------------------------------------------------------------

const ACCENT = SKILLS.find((s) => s.key === "vocabulary")?.color || "#7C6BE8";

const MODE_CONFIG = {
  related_words:       { count: 8, attemptsPerItem: 1.5, gameKey: "related_words", blitzScreens: 2 },
  connection_challenge: { count: 6, attemptsPerItem: 1.5, gameKey: "connection_challenge", blitzScreens: 3 },
};

const CORRECT_MS = 480;
const MISS_MS = 520;

// ---- Question builders (pure) ----

function buildRelatedWordsQ(categoryKey, idx) {
  const words = CATEGORY_BANK[categoryKey];
  // Pick 2: one as the shown target, one as the correct answer (a DIFFERENT
  // word from the same category — the student has to recognize the shared
  // topic, not just match the same word).
  const picked = pickN(words, 2);
  const target = picked[0];
  const correct = picked[1];
  // 3 distractors from other categories
  const otherCats = CATEGORY_ENTRIES.filter(([c]) => c !== categoryKey);
  const distractorPool = otherCats.flatMap(([, w]) => w);
  const distractors = pickN(distractorPool, 3);
  const options = shuffle([correct, ...distractors]);
  return {
    id: `${categoryKey}-${target}-${correct}-${idx}`,
    target,
    clues: [],
    correct,
    category: categoryKey,
    options,
  };
}

function buildConnectionChallengeQ(categoryKey, idx) {
  const words = CATEGORY_BANK[categoryKey];
  // Need 4 words from this category: 3 clues + 1 correct
  const chosen = pickN(words, 4);
  const clues = chosen.slice(0, 3);
  const correct = chosen[3];
  // 3 distractors from other categories
  const otherCats = CATEGORY_ENTRIES.filter(([c]) => c !== categoryKey);
  const distractorPool = otherCats.flatMap(([, w]) => w);
  const distractors = pickN(distractorPool, 3);
  const options = shuffle([correct, ...distractors]);
  return {
    id: `${categoryKey}-${correct}-${idx}`,
    target: "",
    clues,
    correct,
    category: categoryKey,
    options,
  };
}

// ---- Blitz lesson overlay ----

function BlitzLesson({ mode, copy, onDone }) {
  const c = copy;
  const rm = useReducedMotion();
  const [screen, setScreen] = useState(0);
  const prefix = mode === "connection_challenge" ? "cc" : "rw";
  const totalScreens = MODE_CONFIG[mode].blitzScreens;
  const titles = Array.from({ length: totalScreens }, (_, i) => c(`${prefix}_blitz_${i + 1}_title`));
  const bodies = Array.from({ length: totalScreens }, (_, i) => c(`${prefix}_blitz_${i + 1}_body`));

  const handleNext = () => {
    if (screen + 1 >= totalScreens) onDone();
    else setScreen(screen + 1);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <motion.div
        initial={rm ? false : { y: 20, opacity: 0, scale: 0.96 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 26 }}
        className="premium-card relative w-full max-w-sm rounded-[28px] p-6"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${ACCENT}22`, border: `1px solid ${ACCENT}44` }}>
              <Sparkles className="w-4.5 h-4.5" style={{ color: ACCENT }} aria-hidden="true" />
            </div>
            <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: ACCENT }}>
              {screen + 1} / {totalScreens}
            </span>
          </div>
          <button onClick={onDone} className="text-xs text-muted-foreground hover:text-foreground select-none px-2 py-1">
            {c("skip")}
          </button>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={screen}
            initial={rm ? false : { opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={rm ? undefined : { opacity: 0, x: -20 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          >
            <h3 className="text-lg font-bold text-foreground mb-2">{titles[screen]}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{bodies[screen]}</p>
          </motion.div>
        </AnimatePresence>

        <div className="flex items-center justify-between mt-6">
          <div className="flex gap-1.5">
            {Array.from({ length: totalScreens }, (_, i) => (
              <div key={i} className={`h-1.5 rounded-full transition-all ${i === screen ? "w-6" : "w-1.5"}`} style={{ background: i === screen ? ACCENT : "rgba(255,255,255,0.15)" }} />
            ))}
          </div>
          <button onClick={handleNext} className="neo-pill px-5 py-2 text-sm font-semibold text-foreground hover:bg-white/10 transition-colors select-none">
            {screen + 1 >= totalScreens ? c("got_it") : c("next")}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ---- Main engine ----

export default function RelatedWordsGame({ bank = "related_words", onBack, onXpEarned, onGameComplete, user, level }) {
  const { c, t } = useRelatedWordsCopy();
  const rm = useReducedMotion();
  const mode = bank;
  const cfg = MODE_CONFIG[mode];
  const gameKey = cfg.gameKey;
  const prefix = mode === "connection_challenge" ? "cc" : "rw";

  const [showBlitz, setShowBlitz] = useState(false);
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

  // Blitz: show once per mode, re-viewable via "?" (never forced on repeat)
  const blitzKey = `vm_${mode}_blitz_seen`;
  useEffect(() => {
    if (!localStorage.getItem(blitzKey)) setShowBlitz(true);
  }, [blitzKey]);

  const startRound = useCallback((startStreak) => {
    setPhase("loading");
    finishing.current = false;
    busy.current = false;
    roundId.current = generateRoundId();
    firstTry.current = new Set();
    missedOnce.current = new Set();

    // Pick categories for this round
    const catNames = CATEGORY_ENTRIES.map(([c]) => c);
    const pickedCats = pickN(catNames, Math.min(cfg.count, catNames.length));

    const built = pickedCats.map((catName, i) =>
      mode === "connection_challenge"
        ? buildConnectionChallengeQ(catName, i)
        : buildRelatedWordsQ(catName, i)
    );

    roundItems.current = built;
    budgetRef.current = Math.max(built.length, Math.round(built.length * cfg.attemptsPerItem));
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
  }, [cfg, mode]);

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
    recordRoundReward({ userEmail: user?.email, game: gameKey, roundId: roundId.current, itemsTotal, itemsCorrect, streakBest: finalStreakBest, hintMultiplier: 1, level });
    logWordAttempts({
      userEmail: user?.email,
      game: gameKey,
      level,
      roundId: roundId.current,
      items: items.map((it) => ({ word: it.correct, correct: firstTry.current.has(it.correct) })),
    });

    const scorePct = Math.round((itemsCorrect / itemsTotal) * 100);
    onXpEarned?.(amount, itemsCorrect);
    onGameComplete?.({ scorePct, correct: itemsCorrect, total: itemsTotal });
    setSessionXp((v) => v + amount);
    setSummary({
      passed: roundPassed(itemsCorrect, itemsTotal),
      reason,
      firstTry: [...firstTry.current],
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
  }, [user?.email, level, gameKey, onXpEarned, onGameComplete]);

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
      const clean = !missedOnce.current.has(q.correct);
      if (clean) {
        firstTry.current.add(q.correct);
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
      setTimeout(() => {
        busy.current = false;
        if (finishing.current) return;
        setFeedback(null);
        advance();
      }, CORRECT_MS);
    } else {
      missedOnce.current.add(q.correct);
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

  const dismissBlitz = () => {
    localStorage.setItem(blitzKey, "1");
    setShowBlitz(false);
  };

  const playing = phase === "playing";
  const q = questions[idx];
  const liveXp = sessionXp + (playing ? computeRoundXp({ itemsCorrect: firstTryCount, streakBest }).amount : 0);
  const progress = questions.length ? idx / questions.length : 0;
  const triesLeft = Math.max(0, budget - tries);

  return (
    <div className="min-h-screen bg-background premium-mesh flex flex-col">
      {/* HUD */}
      <header className="bg-background/70 backdrop-blur-xl border-b border-white/10 px-3 py-2 flex items-center justify-between safe-header gap-2">
        <button onClick={onBack} className="min-h-[44px] min-w-[44px] flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground select-none px-1">
          <ArrowLeft className="w-4 h-4" aria-hidden="true" /> {t("gameui.back")}
        </button>
        <span className="text-xs font-bold truncate" style={{ color: ACCENT }}>{c(`${prefix}_title`)}</span>
        <div className="flex items-center gap-1.5 text-xs font-bold select-none">
          <button onClick={() => setShowBlitz(true)} className="neo-pill w-8 h-8 flex items-center justify-center text-muted-foreground hover:text-foreground" aria-label="How to play">
            <HelpCircle className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
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
            <p className="text-xs text-muted-foreground text-center mb-3">{c(`${prefix}_instruction`)}</p>

            <AnimatePresence mode="wait">
              <motion.div key={q.id} initial={rm ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={rm ? undefined : { opacity: 0, y: -12 }} transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}>
                {/* Connection Challenge: show 3 clue words */}
                {mode === "connection_challenge" && q.clues.length > 0 && (
                  <div className="premium-card px-4 py-5 mb-4">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground text-center mb-3">{c("cc_clues_label")}</p>
                    <div className="flex flex-wrap justify-center gap-2">
                      {q.clues.map((clue, i) => (
                        <span key={i} className="px-3 py-1.5 rounded-xl border border-white/15 bg-white/[0.06] text-sm font-semibold text-foreground">
                          {clue}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Related Words: show target word */}
                {mode === "related_words" && (
                  <div className="premium-card px-4 py-6 text-center mb-4">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">{c("rw_target_label")}</p>
                    <p className="text-3xl font-bold text-foreground tracking-tight">{q.target}</p>
                  </div>
                )}

                {/* Options */}
                <div className="grid grid-cols-2 gap-2.5">
                  {q.options.map((opt, i) => {
                    const out = ruledOut.includes(opt);
                    const isCorrect = revealed && opt === q.correct;
                    return (
                      <motion.button
                        key={`${opt}-${i}`}
                        onClick={() => handlePick(opt)}
                        disabled={out || revealed}
                        whileTap={{ scale: out || revealed ? 1 : 0.97 }}
                        className={`min-h-[64px] px-3 py-3 rounded-2xl border text-sm font-semibold flex items-center justify-center gap-1.5 text-center transition-colors select-none ${
                          isCorrect
                            ? "border-emerald-400/60 bg-emerald-500/10 text-emerald-200"
                            : out
                            ? "border-rose-400/40 bg-rose-500/5 text-rose-300/70 line-through"
                            : "border-white/10 bg-white/[0.04] text-foreground hover:border-white/25"
                        }`}
                      >
                        <span className="break-words">{opt}</span>
                        {isCorrect && <Check className="w-4 h-4 text-emerald-400 shrink-0" aria-hidden="true" />}
                        {out && <X className="w-4 h-4 text-rose-400 shrink-0" aria-hidden="true" />}
                      </motion.button>
                    );
                  })}
                </div>
              </motion.div>
            </AnimatePresence>

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
                {roundItems.current.map((it) => (
                  <li key={it.id} className="flex items-center justify-between gap-2 text-xs">
                    <span className={`font-semibold truncate ${firstTry.current.has(it.correct) ? "text-foreground" : "text-muted-foreground"}`}>{it.correct}</span>
                    <span className="text-[10px] text-muted-foreground truncate max-w-[45%]">{it.category}</span>
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

      {/* Blitz lesson overlay */}
      <AnimatePresence>
        {showBlitz && <BlitzLesson mode={mode} copy={c} onDone={dismissBlitz} />}
      </AnimatePresence>
    </div>
  );
}