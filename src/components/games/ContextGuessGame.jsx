import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Loader2, BookOpen, Check, X, Languages } from "lucide-react";
import { usableWords } from "@/lib/vocabGameUtils";
import { playableWords, usesTranslationClue } from "@/lib/synonymTiers";
import { SKILLS } from "@/lib/gameSkills";
import { hintXpMultiplier } from "@/lib/levels";
import { computeRoundXp, recordRoundReward, generateRoundId, roundPassed } from "@/lib/gameScoring";
import { buildPersonalizedRound, logWordAttempts } from "@/lib/roundComposition";
import { buildQuestions } from "@/components/games/contextGuessRound";
import { useContextCopy } from "@/components/games/contextGuessCopy";
import ContextGuessHud from "@/components/games/ContextGuessHud";
import ContextGuessPrompt from "@/components/games/ContextGuessPrompt";
import ContextGuessOptions from "@/components/games/ContextGuessOptions";
import ContextGuessResult from "@/components/games/ContextGuessResult";
//
// Context Guess — rebuilt 2026-09-07 to the five-layer game standard. The old
// engine was a thin wrapper around VocabMcqShell (now deleted — this was its
// only consumer): hardcoded blue/indigo, zero i18n, score × 10 XP with no
// ledger, no personalization, and no way to fail a round.
//
// TWO SUBSTANTIVE CHANGES beyond the shared-infra floor:
//
// 1. CONTEXT SOURCE. It used to read `description`, a loosely-filled free-text
//    field — 1,201 of 2,282 rows have it, and only 1,195 of those actually
//    contain the target word, so a "read the word in context" game was showing
//    a sentence without the word in it, or no sentence at all, most of the
//    time. It now reads example_en (2,282 filled, 2,242 containing the word),
//    the same field Memory Flip's study reveal and the Definition game use.
//
// 2. THE CLUE ESCALATES BY LEVEL, which is the actual point of the rebuild.
//    Starter/A1 choose between support-language translations (Starter also gets
//    the word's emoji when wordEmoji.js has one); A2+ choose between synonyms
//    written at their own tier — rotten is "bad" to an A2 and "putrid" to a C1
//    (see src/lib/synonymTiers.js). Distractors are other words' clues at the
//    SAME tier, so the four options sit at one register and cannot be sorted by
//    difficulty instead of meaning.
//
// SHAPE: kept as multiple choice. The alternative considered was showing the
// clue as a hint and asking the student to produce something, but that is the
// Definition game's job (free text + AI grading) and this node has to stay a
// fast, cheap, no-AI round; MCQ is also what makes same-tier distractors
// pedagogically load-bearing — the discrimination between four near-synonyms IS
// the exercise at B2/C1.
//
// FAILABILITY: a wrong option is struck out and the student picks again on the
// same word rather than being pushed forward, and every pick costs a try from a
// budget shown live in the HUD. itemsCorrect counts FIRST-TRY picks only, so
// knowing a word and eliminating your way to it are not the same score.
//
// LOGGING: correctness here is unambiguous, so both signals are logged
// (correct:true and correct:false) — the Definition Match / Picture Match
// category, not Memory Flip's positional-slip case.

const GAME = "context_guess";
const ACCENT = SKILLS.find((s) => s.key === "vocabulary")?.color || "#7C6BE8";

const TIER = {
  beginner: { items: 8 },
  intermediate: { items: 10 },
  advanced: { items: 12 },
  proficient: { items: 12 },
};
const MIN_POOL = 8;
// Perfect play is 1.0 picks per word. 1.5 allows being wrong once on half the
// round and still finishing — failing means genuinely not reading the context.
const ATTEMPTS_PER_ITEM = 1.5;
const CORRECT_MS = 700;
const MISS_MS = 650;

export default function ContextGuessGame({ words = [], level, difficulty = "intermediate", user, onBack, onXpEarned, onGameComplete }) {
  const { c, t, lang } = useContextCopy();
  const rm = useReducedMotion();
  const tier = TIER[difficulty] || TIER.intermediate;
  const translationMode = usesTranslationClue(level);

  // Pool is filtered to words playable AT THIS LEVEL: a sentence containing the
  // word, plus a clue. At Starter/A1 that's almost the whole band (translations
  // are on 2,237/2,221 rows); at A2+ it's the words with synonym-ladder data,
  // and the round sits out gracefully when the band is too thin — same
  // degradation Picture Match uses for words with no emoji.
  const pool = useMemo(() => playableWords(usableWords(words), level, lang), [words, level, lang]);

  const [sessionXp, setSessionXp] = useState(0);
  const [phase, setPhase] = useState(pool.length < MIN_POOL ? "empty" : "loading"); // loading | playing | result | empty
  const [questions, setQuestions] = useState([]);
  const [idx, setIdx] = useState(0);
  const [ruledOut, setRuledOut] = useState([]);
  const [revealed, setRevealed] = useState(false);
  const [feedback, setFeedback] = useState(null); // correct | miss
  const [firstTryCount, setFirstTryCount] = useState(0);
  const [streak, setStreak] = useState(0);
  const [streakBest, setStreakBest] = useState(0);
  const [tries, setTries] = useState(0);
  const [budget, setBudget] = useState(0);
  const [summary, setSummary] = useState(null);
  const [flyups, setFlyups] = useState([]);

  // Refs mirror everything finishRound banks, so a timeout closure always reads
  // live numbers instead of the render it was created in.
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

  // Translation help, A2+ only: Starter/A1 already read the translation as the
  // options themselves, so there is nothing to reveal. Presented as a bonus for
  // going English-only, never as a penalty.
  const baseMultiplier = hintXpMultiplier(level);
  const canReveal = !translationMode;
  const [showTranslation, setShowTranslation] = useState(false);
  const helpUsed = useRef(false);
  const currentMultiplier = () => (helpUsed.current && canReveal ? baseMultiplier : 1);

  const startRound = useCallback(async (startStreak) => {
    if (pool.length < MIN_POOL) { setPhase("empty"); return; }
    setPhase("loading");
    finishing.current = false;
    busy.current = false;
    roundId.current = generateRoundId();
    firstTry.current = new Set();
    missedOnce.current = new Set();

    const chosen = await buildPersonalizedRound({ words: pool, userEmail: user?.email, count: tier.items });
    const built = buildQuestions({ chosen, pool, level, lang });
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
    setShowTranslation(false);
    helpUsed.current = false;
    setPhase(built.length >= 2 ? "playing" : "empty");
  }, [pool, tier.items, user?.email, level, lang]);

  useEffect(() => { startRound(0); }, [startRound]);

  const finishRound = useCallback((reason) => {
    if (finishing.current || !roundItems.current.length) return;
    finishing.current = true;
    const items = roundItems.current;
    const itemsTotal = items.length;
    const itemsCorrect = firstTry.current.size;
    const finalStreakBest = streakBestRef.current;
    const usedTries = triesRef.current;
    const mult = currentMultiplier();

    const { amount, streakBonus } = computeRoundXp({ itemsCorrect, streakBest: finalStreakBest, hintMultiplier: mult });
    recordRoundReward({ userEmail: user?.email, game: GAME, roundId: roundId.current, itemsTotal, itemsCorrect, streakBest: finalStreakBest, hintMultiplier: mult, level });
    // Both signals — a wrong pick here means the student didn't know the word.
    logWordAttempts({
      userEmail: user?.email,
      game: GAME,
      level,
      roundId: roundId.current,
      items: items.map((it) => ({ word: it.word, wordId: it.wordId, correct: firstTry.current.has(it.word) })),
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
      hintMultiplier: mult,
    });
    setPhase("result");
  }, [user?.email, level, onXpEarned, onGameComplete, canReveal, baseMultiplier]);

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
      setTimeout(() => {
        busy.current = false;
        if (finishing.current) return;
        setFeedback(null);
        advance();
      }, CORRECT_MS);
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

  const toggleTranslation = () => {
    setShowTranslation((v) => { if (!v) helpUsed.current = true; return !v; });
  };

  const playing = phase === "playing";
  const q = questions[idx];
  const liveXp = sessionXp + (playing ? computeRoundXp({ itemsCorrect: firstTryCount, streakBest, hintMultiplier: currentMultiplier() }).amount : 0);
  const progress = questions.length ? idx / questions.length : 0;
  const triesLeft = Math.max(0, budget - tries);

  return (
    <div className="min-h-screen bg-background premium-mesh flex flex-col">
      <ContextGuessHud
        accent={ACCENT}
        onBack={onBack}
        xp={liveXp}
        streak={streak}
        triesLeft={triesLeft}
        showTries={playing && budget > 0}
        lowTries={budget > 0 && triesLeft <= Math.ceil(budget * 0.25)}
      />

      <div className="h-1 bg-white/5" role="progressbar" aria-valuenow={Math.round(progress * 100)} aria-valuemin={0} aria-valuemax={100}>
        <motion.div className="h-full" style={{ background: `linear-gradient(90deg, ${ACCENT}, ${ACCENT}aa)` }} animate={{ width: `${progress * 100}%` }} transition={{ duration: rm ? 0 : 0.5, ease: [0.16, 1, 0.3, 1] }} />
      </div>

      <div className="flex-1 flex flex-col px-3 py-4 max-w-2xl mx-auto w-full relative">
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
              {canReveal && q.translation && (
                <button onClick={toggleTranslation} className="min-h-[44px] flex items-center gap-1 font-semibold select-none px-2" style={{ color: showTranslation ? undefined : ACCENT }}>
                  <Languages className="w-3.5 h-3.5" aria-hidden="true" /> {showTranslation ? c("hide_translation") : c("show_translation")}
                </button>
              )}
            </div>
            <p className="text-xs text-muted-foreground text-center mb-3">
              {translationMode ? c("instruction_translation") : c("instruction_synonym")}
            </p>

            <AnimatePresence mode="wait">
              <motion.div key={q.id} initial={rm ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={rm ? undefined : { opacity: 0, y: -12 }} transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}>
                <ContextGuessPrompt q={q} accent={ACCENT} showTranslation={showTranslation} />
                <ContextGuessOptions
                  options={q.options}
                  accent={ACCENT}
                  ruledOut={ruledOut}
                  revealed={revealed}
                  correct={q.correct}
                  onPick={handlePick}
                  disabled={false}
                />
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
            <ContextGuessResult
              summary={summary}
              items={roundItems.current}
              accent={ACCENT}
              onKeepGoing={() => startRound(streak)}
              onPlayAgain={() => { setSessionXp(0); startRound(0); }}
              onExit={onBack}
            />
          </div>
        )}
      </div>
    </div>
  );
}