import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Loader2, BookOpen, Check, X, Languages } from "lucide-react";
import { usableWords } from "@/lib/vocabGameUtils";
import { synonymPlayableWords } from "@/lib/synonymTiers";
import { SKILLS } from "@/lib/gameSkills";
import { hintXpMultiplier } from "@/lib/levels";
import { computeRoundXp, recordRoundReward, generateRoundId, roundPassed } from "@/lib/gameScoring";
import { buildPersonalizedRound, logWordAttempts } from "@/lib/roundComposition";
import { buildQuestions } from "@/components/games/synonymSprintRound";
import { useSprintCopy } from "@/components/games/synonymSprintCopy";
import SynonymSprintHud from "@/components/games/SynonymSprintHud";
import SynonymSprintPrompt from "@/components/games/SynonymSprintPrompt";
import SynonymSprintOptions from "@/components/games/SynonymSprintOptions";
import SynonymSprintResult from "@/components/games/SynonymSprintResult";
//
// Synonym Sprint — built 2026-09-07, the first game under Vocabulary >
// Relationships.
//
// WHAT IT REPLACES: the node used to point at `quiz` (VocabQuizGame), a generic
// English↔Uzbek translation drill with no synonym logic at all — the same
// engine "Related Words" and "Connection Challenge" still point at, and which
// this build deliberately does not touch. Those two keep working exactly as
// they do today until their own briefs land.
//
// THE MECHANIC: show the word, pick the synonym. Difficulty rises with the
// student's own level through WHICH synonym is correct — the ladder authored for
// Context Guess (src/lib/synonymTiers.js): rotten is "bad" to an A2 and "putrid"
// to a C1. One rule differs from Context Guess: Starter/A1 fall through to the
// A2 rung instead of reading a translation, per Tee's spec that A1 and A2 share
// the simplest tier (see sprintSynonymForLevel). Distractors are other words'
// synonyms at the SAME tier, so all four options sit at one register and
// "pick the fancy-looking one" is not a strategy.
//
// No context sentence, so the pool filter drops the sentence requirement that
// playableWords() enforces for Context Guess — which also means this game can
// play words the other one can't.
//
// PACING: this is the "sprint" of the section — 8 words at the beginner tier,
// two-column options, and faster feedback beats than the Meaning games, so a
// round lands in a minute or two rather than the more deliberate 3-4.
//
// FAILABILITY: an attempt budget shown live in the HUD; a wrong pick is struck
// out and the student picks again on the same word. itemsCorrect counts
// FIRST-TRY picks only.
//
// LOGGING: a wrong pick is unambiguous here (nothing positional to forget), so
// both signals are logged — the Definition Match / Picture Match / Context Guess
// category rather than Memory Flip's positive-only case.

const GAME = "synonym_sprint";
const ACCENT = SKILLS.find((s) => s.key === "vocabulary")?.color || "#7C6BE8";

const TIER = {
  beginner: { items: 8 },
  intermediate: { items: 10 },
  advanced: { items: 12 },
  proficient: { items: 12 },
};
const MIN_POOL = 8;
// Perfect play is 1.0 picks per word. 1.5 allows being wrong once on half the
// round and still finishing.
const ATTEMPTS_PER_ITEM = 1.5;
// Snappier than Context Guess's 700/650 — the round is meant to feel like a
// sprint, and there is no sentence to re-read before moving on.
const CORRECT_MS = 480;
const MISS_MS = 520;

export default function SynonymSprintGame({ words = [], level, difficulty = "beginner", user, onBack, onXpEarned, onGameComplete }) {
  const { c, t, lang } = useSprintCopy();
  const rm = useReducedMotion();
  const tier = TIER[difficulty] || TIER.beginner;

  // Pool is the words with a synonym ladder at (or below) this level. Thin
  // bands sit the round out gracefully — the same degradation Picture Match
  // uses for words with no emoji.
  const pool = useMemo(() => synonymPlayableWords(usableWords(words), level), [words, level]);

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

  // Translation reveal is available at every level here (unlike Context Guess,
  // where Starter/A1 read translations as the options themselves). Always framed
  // as a bonus for going English-only, never a penalty — and hintXpMultiplier is
  // 1 at Starter/A1, so beginners are never charged for needing the anchor.
  const baseMultiplier = hintXpMultiplier(level);
  const [showTranslation, setShowTranslation] = useState(false);
  const helpUsed = useRef(false);
  const currentMultiplier = () => (helpUsed.current ? baseMultiplier : 1);

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
  }, [user?.email, level, onXpEarned, onGameComplete, baseMultiplier]);

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
      <SynonymSprintHud
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
              {q.translation && (
                <button onClick={toggleTranslation} className="min-h-[44px] flex items-center gap-1 font-semibold select-none px-2" style={{ color: showTranslation ? undefined : ACCENT }}>
                  <Languages className="w-3.5 h-3.5" aria-hidden="true" /> {showTranslation ? c("hide_translation") : c("show_translation")}
                </button>
              )}
            </div>
            <p className="text-xs text-muted-foreground text-center mb-3">{c("instruction")}</p>

            <AnimatePresence mode="wait">
              <motion.div key={q.id} initial={rm ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={rm ? undefined : { opacity: 0, y: -12 }} transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}>
                <SynonymSprintPrompt q={q} accent={ACCENT} showTranslation={showTranslation} />
                <SynonymSprintOptions
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
            <SynonymSprintResult
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