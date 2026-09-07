import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Loader2, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { checkAiGate, incrementAiUsage } from "@/lib/aiLimits";
import { definitionForLevel } from "@/lib/definitionTiers";
import { SKILLS, GAME_SKILL_MAP } from "@/lib/gameSkills";
import { computeRoundXp, recordRoundReward, generateRoundId, roundPassed } from "@/lib/gameScoring";
import { buildPersonalizedRound, logWordAttempts } from "@/lib/roundComposition";
import { evaluateDefinition, averageScore, clearedBar } from "@/components/games/definitionGrader";
import { useDefinitionCopy } from "@/components/games/definitionCopy";
import DefinitionHud from "@/components/games/DefinitionHud";
import DefinitionPrompt from "@/components/games/DefinitionPrompt";
import DefinitionFeedback from "@/components/games/DefinitionFeedback";
import DefinitionResult from "@/components/games/DefinitionResult";
//
// Definition — refined 2026-09-07 to the five-layer game standard.
//
// THE MECHANIC IS UNCHANGED: the student reads a word + definition + example and
// writes the meaning in their own words; evaluateDefinition() (definitionGrader.js,
// prompt untouched) scores it on accuracy / completeness / own-words and gives
// one tip. This is the app's only free-text engine and stays that way.
//
// WHAT CHANGED: the round's SHOWN definitions no longer come from a second LLM
// call at round start. They resolve through definitionForLevel() — the
// student's own def_a2/def_b1/def_b2/def_c1 tier — and the example is the
// word's own example_en. So: no "preparing round" AI wait, one AI call per
// answer instead of one-plus-one-per-session, and text written for the
// student's level rather than "approximately B1 for everyone". Consequently the
// AI gate only applies at submit time — a student with no allowance left can
// still open the round (nothing is spent building it); they just can't be
// graded until it resets.
//
// SCORING: gameScoring.js only. "Correct" for a free-text answer = the grader's
// average clears CLEAR_AVG (definitionGrader.js). The grader's own 1-5 `xp`
// is still returned but no longer drives the economy. Pass/fail on the result
// screen is roundPassed(), not a pool×4 threshold invented here.
//
// LOGGING: both signals. A cleared answer is correct:true, a below-bar answer
// is correct:false — unlike a matching game there is no "forgot a position"
// ambiguity; the student read the word and could not explain it.

const GAME = "definition";
const ACCENT = SKILLS.find((s) => s.key === GAME_SKILL_MAP[GAME])?.color || "#CE6A86";

const DIFF_CONFIG = {
  beginner:     { count: 5,  minWords: 5 },
  intermediate: { count: 6,  minWords: 8 },
  advanced:     { count: 7,  minWords: 12 },
  proficient:   { count: 8,  minWords: 16 },
};

export default function DefinitionGame({ words = [], onBack, user, onXpEarned, onGameComplete, difficulty = "intermediate", level }) {
  const { c, t, lang } = useDefinitionCopy();
  const rm = useReducedMotion();
  const cfg = DIFF_CONFIG[difficulty] || DIFF_CONFIG.intermediate;
  // Only words that resolve to a shown definition at this student's tier.
  const pool = useMemo(() => words.filter((w) => w?.english && definitionForLevel(w, level, lang)), [words, level, lang]);

  const [phase, setPhase] = useState(pool.length ? "loading" : "empty"); // loading | playing | result | empty
  const [items, setItems] = useState([]);
  const [qIndex, setQIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [result, setResult] = useState(null); // grader output | { blocked: true }
  const [checking, setChecking] = useState(false);
  const [streak, setStreak] = useState(0);
  const [streakBest, setStreakBest] = useState(0);
  const [clearedCount, setClearedCount] = useState(0);
  const [summary, setSummary] = useState(null);
  const [flyup, setFlyup] = useState(null);

  const roundId = useRef(null);
  const cleared = useRef(new Set());
  const scores = useRef([]);
  const streakBestRef = useRef(0);
  const startedRef = useRef(false);

  const startRound = useCallback(async () => {
    if (!pool.length) { setPhase("empty"); return; }
    setPhase("loading");
    roundId.current = generateRoundId();
    cleared.current = new Set();
    scores.current = [];
    streakBestRef.current = 0;
    const chosen = await buildPersonalizedRound({ words: pool, userEmail: user?.email, count: Math.min(cfg.count, pool.length) });
    setItems(chosen.map((w) => ({
      english: w.english, uzbek: w.uzbek, wordId: w.id, provenance: w._provenance,
      definition: definitionForLevel(w, level, lang), example: w.example_en || "",
    })));
    setQIndex(0); setAnswer(""); setResult(null); setSummary(null); setFlyup(null);
    setStreak(0); setStreakBest(0); setClearedCount(0);
    setPhase("playing");
  }, [pool, cfg.count, user?.email, level, lang]);

  // Words prop re-renders (e.g. after an XP update) must not restart the round.
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    startRound();
  }, [startRound]);

  const current = items[qIndex];

  const handleSubmit = async () => {
    if (!answer.trim() || checking || !current) return;
    setChecking(true);
    if (user) {
      const gate = await checkAiGate(user.email, user.id, user.role === "admin");
      if (!gate.allowed) {
        // No allowance left means this attempt stays ungraded — never a
        // fabricated score (same rule as LessonRunner).
        setResult({ blocked: true });
        setChecking(false);
        return;
      }
    }
    const res = await evaluateDefinition(answer, { english: current.english, uzbek: current.uzbek, definition: current.definition }, cfg, level);
    if (user) incrementAiUsage(user.email, user.id, "").catch(() => {});
    scores.current.push(averageScore(res));
    if (clearedBar(res)) {
      cleared.current.add(current.english);
      setClearedCount(cleared.current.size);
      const s = streak + 1;
      streakBestRef.current = Math.max(streakBestRef.current, s);
      setStreak(s); setStreakBest(streakBestRef.current);
      setFlyup({ id: `${roundId.current}-${qIndex}`, amount: computeRoundXp({ itemsCorrect: 1 }).amount });
      setTimeout(() => setFlyup(null), 900);
    } else {
      setStreak(0);
    }
    setResult(res);
    setChecking(false);
  };

  const finishRound = () => {
    const itemsTotal = items.length;
    const itemsCorrect = cleared.current.size;
    const finalStreakBest = streakBestRef.current;
    const { amount, streakBonus } = computeRoundXp({ itemsCorrect, streakBest: finalStreakBest, hintMultiplier: 1 });
    recordRoundReward({ userEmail: user?.email, game: GAME, roundId: roundId.current, itemsTotal, itemsCorrect, streakBest: finalStreakBest, hintMultiplier: 1, level });
    logWordAttempts({
      userEmail: user?.email, game: GAME, level, roundId: roundId.current,
      items: items.map((it) => ({ word: it.english, wordId: it.wordId, correct: cleared.current.has(it.english) })),
    });
    const scorePct = itemsTotal ? Math.round((itemsCorrect / itemsTotal) * 100) : 0;
    onXpEarned?.(amount, itemsCorrect);
    onGameComplete?.({ scorePct, correct: itemsCorrect, total: itemsTotal });
    const avgPct = scores.current.length ? Math.round(scores.current.reduce((a, b) => a + b, 0) / scores.current.length) : 0;
    setSummary({ passed: roundPassed(itemsCorrect, itemsTotal), amount, streakBonus, itemsCorrect, itemsTotal, avgPct, streakBest: finalStreakBest, cleared: [...cleared.current] });
    setPhase("result");
  };

  const handleNext = () => {
    if (qIndex + 1 >= items.length) { finishRound(); return; }
    setQIndex((i) => i + 1);
    setAnswer("");
    setResult(null);
  };

  const playing = phase === "playing";
  const liveXp = playing ? computeRoundXp({ itemsCorrect: clearedCount, streakBest }).amount : summary?.amount || 0;
  const progress = items.length ? qIndex / items.length : 0;

  return (
    <div className="min-h-screen bg-background premium-mesh flex flex-col">
      <DefinitionHud accent={ACCENT} onBack={onBack} xp={liveXp} streak={streak} qIndex={qIndex} total={items.length} showProgress={playing} />

      <div className="h-1 bg-white/5" role="progressbar" aria-valuenow={Math.round(progress * 100)} aria-valuemin={0} aria-valuemax={100}>
        <motion.div className="h-full" style={{ background: `linear-gradient(90deg, ${ACCENT}, ${ACCENT}aa)` }} animate={{ width: `${progress * 100}%` }} transition={{ duration: rm ? 0 : 0.5, ease: [0.16, 1, 0.3, 1] }} />
      </div>

      <div className="flex-1 flex flex-col px-3 py-4 max-w-md mx-auto w-full relative">
        <div className="pointer-events-none absolute inset-x-0 top-2 flex justify-center z-20" aria-live="polite">
          <AnimatePresence>
            {flyup && (
              <motion.span key={flyup.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: -18 }} exit={{ opacity: 0, y: -40 }} transition={{ duration: rm ? 0.1 : 0.8, ease: "easeOut" }} className="absolute text-sm font-bold text-amber-300 drop-shadow">
                +{flyup.amount} {c("xp")}
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        {phase === "empty" && (
          <div className="premium-card flex-1 flex flex-col items-center justify-center text-center p-8">
            <BookOpen className="w-10 h-10 text-muted-foreground/40 mb-3" aria-hidden="true" />
            <p className="text-sm text-muted-foreground mb-5">{t("gameui.def_no_words")}</p>
            <button onClick={onBack} className="h-12 px-6 rounded-xl text-white font-semibold select-none" style={{ background: ACCENT }}>{t("nav.skill_hub")}</button>
          </div>
        )}

        {phase === "loading" && (
          <div className="premium-card flex-1 flex flex-col items-center justify-center text-center p-8">
            <Loader2 className="w-8 h-8 animate-spin mb-3" style={{ color: ACCENT }} aria-hidden="true" />
            <p className="text-sm text-muted-foreground">{c("loading")}</p>
          </div>
        )}

        {playing && current && (
          <AnimatePresence mode="wait">
            <motion.div key={qIndex} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: rm ? 0 : 0.2 }}>
              <DefinitionPrompt item={current} accent={ACCENT} minWords={cfg.minWords} />

              {!result ? (
                <>
                  <textarea
                    value={answer}
                    onChange={(e) => setAnswer(e.target.value)}
                    placeholder={t("gameui.def_placeholder")}
                    className="w-full h-32 px-4 py-3 border border-white/10 rounded-xl text-sm bg-white/[0.04] text-foreground focus:border-white/30 focus:outline-none transition-colors resize-none mb-4"
                    disabled={checking}
                  />
                  <Button onClick={handleSubmit} disabled={!answer.trim() || checking} className="w-full select-none">
                    {checking ? t("gameui.checking") : t("gameui.def_submit")}
                  </Button>
                </>
              ) : result.blocked ? (
                <div className="premium-card p-5 mb-4 text-center">
                  <p className="text-sm text-muted-foreground mb-4">{c("ai_limit")}</p>
                  <Button variant="outline" onClick={onBack} className="w-full select-none">{t("gameui.back")}</Button>
                </div>
              ) : (
                <DefinitionFeedback result={result} accent={ACCENT} isLast={qIndex + 1 >= items.length} onNext={handleNext} />
              )}
            </motion.div>
          </AnimatePresence>
        )}

        {phase === "result" && summary && (
          <div className="flex-1 flex items-center">
            <DefinitionResult summary={summary} items={items} accent={ACCENT} onPlayAgain={startRound} onExit={onBack} />
          </div>
        )}
      </div>
    </div>
  );
}