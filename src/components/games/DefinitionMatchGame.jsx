import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Loader2, BookOpen, Check, X, Quote } from "lucide-react";
import { usableWords, shuffle } from "@/lib/vocabGameUtils";
import { definitionForLevel } from "@/lib/definitionTiers";
import { SKILLS } from "@/lib/gameSkills";
import { hintXpMultiplier, cognitiveDemandForLevel } from "@/lib/levels";
import { computeRoundXp, recordRoundReward, generateRoundId, roundPassed } from "@/lib/gameScoring";
import { buildPersonalizedRound, logWordAttempts } from "@/lib/roundComposition";
import { buildSets, dedupeByDefinition } from "@/components/games/definitionMatchBoard";
import { useMatchCopy } from "@/components/games/definitionMatchCopy";
import DefinitionMatchHud from "@/components/games/DefinitionMatchHud";
import DefinitionMatchSet from "@/components/games/DefinitionMatchSet";
import DefinitionMatchResult from "@/components/games/DefinitionMatchResult";
//
// Definition Match — rebuilt 2026-09-06 to the five-layer game standard.
//
// THE HEADLINE CHANGE: this engine no longer calls InvokeLLM. It used to
// generate four definitions per round, which meant paying AI credits, a
// loading spinner and a possible "couldn't build this round" failure, all for
// content the database already holds at a better register. Definitions now
// resolve through definitionForLevel() (src/lib/definitionTiers.js), so they
// are written for the student's OWN level instead of approximately-B1 for
// everyone, the board is instant, and the failure path is gone because the
// data is local. The tier → english_definition → translation fallback chain
// still covers any row the enrichment batch missed.
//
// Where difficulty comes from now: definitionMatchBoard.js decides which words
// share a set. That is the entire lever — see its header for why unit_key
// (topical adjacency) leads and rankDistractors/CEFR is the fallback.
//
// FAILABILITY: an attempt budget, shown live in the HUD. Without a limit every
// word is eventually matchable by elimination, itemsCorrect always equals
// itemsTotal, and PASS_THRESHOLD plus every RewardEvent row become
// meaningless. itemsCorrect counts FIRST-TRY matches only, so knowing the word
// and guessing it are not the same score.
//
// LOGGING: unlike Memory Flip, correctness here is unambiguous — a wrong match
// means the student didn't know the word, not that they forgot a card
// position. So this game logs both correct:true and correct:false, and is the
// first source of miss data in the app (which is what makes the
// "this one beat you last time" badge fire anywhere).

const GAME = "definition_match";
const ACCENT = SKILLS.find((s) => s.key === "vocabulary")?.color || "#7C6BE8";

// Round length stays inside the matching family's 8-14 item range. Higher
// tiers get BOTH more words and bigger sets — more definitions on screen at
// once is what makes disambiguation harder, independent of the words chosen.
const TIER = {
  beginner: { items: 8, setSize: 4 },
  intermediate: { items: 12, setSize: 4 },
  advanced: { items: 12, setSize: 6 },
  proficient: { items: 14, setSize: 7 },
};
const MIN_POOL = 8;
// Perfect play is 1.0 attempts per word. 1.75 leaves room to be wrong on
// roughly three of four words and still finish — generous enough that failing
// means genuinely not knowing the set, not bad luck.
const ATTEMPTS_PER_ITEM = 1.75;
const MATCH_MS = 520;
const MISS_MS = 780;
const SET_MS = 620;

export default function DefinitionMatchGame({ words = [], level, difficulty = "intermediate", cognitiveDemand, user, onBack, onXpEarned, onGameComplete }) {
  const { c, t, lang } = useMatchCopy();
  const rm = useReducedMotion();
  const pool = useMemo(() => usableWords(words), [words]);
  const tier = TIER[difficulty] || TIER.intermediate;
  const demand = cognitiveDemand || cognitiveDemandForLevel(level);

  // Session XP persists across "Keep going" blocks; the round itself resets.
  const [sessionXp, setSessionXp] = useState(0);

  // Round
  const [phase, setPhase] = useState(pool.length < MIN_POOL ? "empty" : "loading"); // loading | playing | result | empty
  const [sets, setSets] = useState([]);
  const [setIndex, setSetIndex] = useState(0);
  const [defOrder, setDefOrder] = useState([]);
  const [solved, setSolved] = useState([]);
  const [selected, setSelected] = useState(null); // { side: word|def, id }
  const [feedback, setFeedback] = useState(null); // { type: match|miss, wordId, defId }
  const [firstTryCount, setFirstTryCount] = useState(0);
  const [streak, setStreak] = useState(0);
  const [streakBest, setStreakBest] = useState(0);
  const [tries, setTries] = useState(0);
  const [budget, setBudget] = useState(0);
  const [summary, setSummary] = useState(null);
  const [flyups, setFlyups] = useState([]);

  // Refs mirror everything finishRound banks, so a timeout closure always
  // reads live numbers rather than the render they were created in.
  const roundId = useRef(null);
  const roundWords = useRef([]);
  const firstTry = useRef(new Set());
  const missedOnce = useRef(new Set());
  const triesRef = useRef(0);
  const budgetRef = useRef(0);
  const streakBestRef = useRef(0);
  const finishing = useRef(false);
  const busy = useRef(false);

  // Example-sentence help: every VocabularyWord carries example_en (verified
  // 100% filled), so this is always available. Presented as a bonus for
  // matching without it, never as a penalty — same policy as Memory Flip's
  // translation reveal. Starter/A1 have a multiplier of 1, so they are never
  // charged for needing support.
  const baseMultiplier = hintXpMultiplier(level);
  const [showExample, setShowExample] = useState(false);
  const exampleUsed = useRef(false);
  const currentMultiplier = () => (exampleUsed.current ? baseMultiplier : 1);

  const startRound = useCallback(async (startStreak) => {
    if (pool.length < MIN_POOL) { setPhase("empty"); return; }
    setPhase("loading");
    finishing.current = false;
    busy.current = false;
    roundId.current = generateRoundId();
    firstTry.current = new Set();
    missedOnce.current = new Set();

    const chosen = await buildPersonalizedRound({ words: pool, userEmail: user?.email, count: tier.items });
    const grouped = buildSets({ words: chosen, pool, size: tier.setSize, demand });
    const built = grouped
      .map((group) =>
        dedupeByDefinition(
          group.map((w, i) => ({
            id: `${w.english}-${i}`,
            word: w.english,
            wordId: w.id,
            pronunciation: w.pronunciation,
            provenance: w._provenance,
            example: w.example_en,
            definition: definitionForLevel(w, level, lang),
          }))
        ).filter((it) => it.definition)
      )
      .filter((group) => group.length > 1);

    const flat = built.flat();
    roundWords.current = flat;
    budgetRef.current = Math.max(flat.length, Math.round(flat.length * ATTEMPTS_PER_ITEM));
    triesRef.current = 0;
    streakBestRef.current = startStreak;

    setSets(built);
    setSetIndex(0);
    setDefOrder(built.length ? shuffle(built[0]).map((it) => it.id) : []);
    setSolved([]);
    setSelected(null);
    setFeedback(null);
    setFirstTryCount(0);
    setStreak(startStreak);
    setStreakBest(startStreak);
    setTries(0);
    setBudget(budgetRef.current);
    setSummary(null);
    setFlyups([]);
    setShowExample(false);
    exampleUsed.current = false;
    setPhase(flat.length > 1 ? "playing" : "empty");
  }, [pool, tier.items, tier.setSize, demand, user?.email, level, lang]);

  useEffect(() => { startRound(0); }, [startRound]);

  const finishRound = useCallback((reason) => {
    if (finishing.current || !roundWords.current.length) return;
    finishing.current = true;
    const items = roundWords.current;
    const itemsTotal = items.length;
    const itemsCorrect = firstTry.current.size;
    const finalStreakBest = streakBestRef.current;
    const usedTries = triesRef.current;
    const mult = currentMultiplier();

    const { amount, streakBonus } = computeRoundXp({ itemsCorrect, streakBest: finalStreakBest, hintMultiplier: mult });
    recordRoundReward({ userEmail: user?.email, game: GAME, roundId: roundId.current, itemsTotal, itemsCorrect, streakBest: finalStreakBest, hintMultiplier: mult, level });
    // Both signals: a first-try match is a win, anything else is a miss.
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

  const advanceOrFinish = useCallback((nextSolved) => {
    const current = sets[setIndex] || [];
    const done = current.every((it) => nextSolved.includes(it.id));
    if (!done) {
      if (triesRef.current >= budgetRef.current) finishRound("budget");
      return;
    }
    if (setIndex + 1 >= sets.length) { finishRound("clear"); return; }
    setTimeout(() => {
      if (finishing.current) return;
      const nextIdx = setIndex + 1;
      setSetIndex(nextIdx);
      setDefOrder(shuffle(sets[nextIdx]).map((it) => it.id));
      setSelected(null);
      if (triesRef.current >= budgetRef.current) finishRound("budget");
    }, SET_MS);
  }, [sets, setIndex, finishRound]);

  const resolve = (wordItem, defItem) => {
    busy.current = true;
    triesRef.current += 1;
    setTries(triesRef.current);
    setSelected(null);

    if (wordItem.id === defItem.id) {
      const clean = !missedOnce.current.has(wordItem.word);
      if (clean) {
        firstTry.current.add(wordItem.word);
        setFirstTryCount(firstTry.current.size);
        const s = streak + 1;
        streakBestRef.current = Math.max(streakBestRef.current, s);
        setStreak(s);
        setStreakBest(streakBestRef.current);
        const fid = `${roundId.current}-${wordItem.id}`;
        setFlyups((f) => [...f, { id: fid, amount: computeRoundXp({ itemsCorrect: 1 }).amount }]);
        setTimeout(() => setFlyups((f) => f.filter((x) => x.id !== fid)), 900);
      }
      setFeedback({ type: "match", wordId: wordItem.id, defId: defItem.id });
      setTimeout(() => {
        busy.current = false;
        if (finishing.current) return;
        setFeedback(null);
        setSolved((prev) => {
          const next = [...prev, wordItem.id];
          advanceOrFinish(next);
          return next;
        });
      }, MATCH_MS);
    } else {
      missedOnce.current.add(wordItem.word);
      setStreak(0);
      setFeedback({ type: "miss", wordId: wordItem.id, defId: defItem.id });
      setTimeout(() => {
        busy.current = false;
        if (finishing.current) return;
        setFeedback(null);
        if (triesRef.current >= budgetRef.current) finishRound("budget");
      }, MISS_MS);
    }
  };

  const onWordTap = (it) => {
    if (phase !== "playing" || busy.current || solved.includes(it.id)) return;
    if (selected?.side === "def") {
      const def = (sets[setIndex] || []).find((x) => x.id === selected.id);
      if (def) resolve(it, def);
      return;
    }
    setSelected(selected?.side === "word" && selected.id === it.id ? null : { side: "word", id: it.id });
  };

  const onDefTap = (it) => {
    if (phase !== "playing" || busy.current || solved.includes(it.id)) return;
    if (selected?.side === "word") {
      const word = (sets[setIndex] || []).find((x) => x.id === selected.id);
      if (word) resolve(word, it);
      return;
    }
    setSelected(selected?.side === "def" && selected.id === it.id ? null : { side: "def", id: it.id });
  };

  const toggleExample = () => {
    setShowExample((v) => { if (!v) exampleUsed.current = true; return !v; });
  };

  const stateOfWord = (it) => {
    if (solved.includes(it.id)) return "solved";
    if (feedback?.wordId === it.id) return feedback.type;
    return selected?.side === "word" && selected.id === it.id ? "selected" : "idle";
  };
  const stateOfDef = (it) => {
    if (solved.includes(it.id)) return "solved";
    if (feedback?.defId === it.id) return feedback.type;
    return selected?.side === "def" && selected.id === it.id ? "selected" : "idle";
  };

  const current = sets[setIndex] || [];
  const defs = defOrder.map((id) => current.find((x) => x.id === id)).filter(Boolean);
  const playing = phase === "playing";
  const liveXp = sessionXp + (playing ? computeRoundXp({ itemsCorrect: firstTryCount, streakBest, hintMultiplier: currentMultiplier() }).amount : 0);
  const progress = roundWords.current.length ? solved.length / roundWords.current.length : 0;
  const triesLeft = Math.max(0, budget - tries);

  return (
    <div className="min-h-screen bg-background premium-mesh flex flex-col">
      <DefinitionMatchHud
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

        {playing && (
          <>
            <div className="flex items-center justify-between gap-2 mb-3 text-[11px] text-muted-foreground">
              <span>{c("panel", { n: setIndex + 1, total: sets.length })} · {c("item_progress", { n: firstTryCount, total: roundWords.current.length })}</span>
              <button onClick={toggleExample} className="min-h-[44px] flex items-center gap-1 font-semibold select-none px-2" style={{ color: showExample ? undefined : ACCENT }}>
                <Quote className="w-3.5 h-3.5" aria-hidden="true" /> {showExample ? c("hide_example") : c("show_example")}
              </button>
            </div>
            <p className="text-xs text-muted-foreground text-center mb-3">{c("instruction")}</p>

            <DefinitionMatchSet
              items={current}
              defs={defs}
              accent={ACCENT}
              stateOfWord={stateOfWord}
              stateOfDef={stateOfDef}
              showExample={showExample}
              onWordTap={onWordTap}
              onDefTap={onDefTap}
            />

            <div className="h-8 mt-3 flex items-center justify-center" aria-live="polite">
              <AnimatePresence mode="wait">
                {feedback && (
                  <motion.span key={feedback.type + feedback.wordId} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: rm ? 0 : 0.2 }} className={`flex items-center gap-1.5 text-sm font-semibold ${feedback.type === "match" ? "text-emerald-400" : "text-rose-400"}`}>
                    {feedback.type === "match" ? <Check className="w-4 h-4" aria-hidden="true" /> : <X className="w-4 h-4" aria-hidden="true" />}
                    {feedback.type === "match" ? c("match") : c("miss")}
                  </motion.span>
                )}
              </AnimatePresence>
            </div>
          </>
        )}

        {phase === "result" && summary && (
          <div className="flex-1 flex items-center">
            <DefinitionMatchResult
              summary={summary}
              words={roundWords.current.map((it) => ({ english: it.word, _provenance: it.provenance }))}
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