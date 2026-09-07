import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Loader2, BookOpen, Check, X } from "lucide-react";
import { shuffle } from "@/lib/vocabGameUtils";
import { emojiMappable } from "@/lib/wordEmoji";
import { SKILLS, GAME_SKILL_MAP } from "@/lib/gameSkills";
import { computeRoundXp, recordRoundReward, generateRoundId, roundPassed } from "@/lib/gameScoring";
import { buildPersonalizedRound, logWordAttempts } from "@/lib/roundComposition";
import { usePictureCopy } from "@/components/games/pictureMatchCopy";
import PictureMatchHud from "@/components/games/PictureMatchHud";
import PictureMatchSet from "@/components/games/PictureMatchSet";
import PictureMatchResult from "@/components/games/PictureMatchResult";
//
// Picture Match — expanded 2026-09-07 to the five-layer game standard.
//
// THE MECHANIC IS UNCHANGED: tap a word, tap the picture (emoji) it matches.
// What scaled is everything behind it: src/lib/wordEmoji.js grew from ~150 to
// ~470 correct mappings, the round is composed by roundComposition.js, scored by
// gameScoring.js, sized by tier, and can now be failed.
//
// THE CEILING: only concrete nouns have an emoji. emojiMappable() filters the
// student's band to those, deduped by picture so no two cards look alike. When
// a band cannot fill the tier's round the round shrinks toward the old size (4)
// rather than padding with weak matches; below MIN_PAIRS the game sits out.
//
// FAILABILITY: an attempt budget (ATTEMPTS_PER_ITEM × items), shown live.
// itemsCorrect counts FIRST-TRY matches only.
//
// LOGGING: both signals, following Definition Match. A wrong tap here is a
// direct word→meaning miss (the picture IS the meaning), not a forgotten card
// position, so correct:false is honest signal for later round composition.
//
// Props: the standard {...base} signature every Skill Hub game takes —
//   words, level, difficulty, user, onBack, onXpEarned(amount, correct),
//   onGameComplete({ scorePct, correct, total })

const GAME = "picture_match";
const ACCENT = SKILLS.find((s) => s.key === GAME_SKILL_MAP[GAME])?.color || "#7C6BE8";

// Same shape as Definition Match: more words AND bigger sets at higher tiers.
const TIER = {
  beginner: { items: 8, setSize: 4 },
  intermediate: { items: 12, setSize: 4 },
  advanced: { items: 12, setSize: 6 },
  proficient: { items: 14, setSize: 7 },
};
const MIN_PAIRS = 4;
const ATTEMPTS_PER_ITEM = 1.75;
const MATCH_MS = 480;
const MISS_MS = 700;
const SET_MS = 600;

function chunkSets(list, size) {
  const sets = [];
  for (let i = 0; i < list.length; i += size) sets.push(list.slice(i, i + size));
  if (sets.length > 1 && sets[sets.length - 1].length < 2) sets[sets.length - 2].push(...sets.pop());
  return sets;
}

export default function PictureMatchGame({ words = [], level, difficulty = "intermediate", user, onBack, onXpEarned, onGameComplete }) {
  const { c, t } = usePictureCopy();
  const rm = useReducedMotion();
  const pool = useMemo(() => emojiMappable(words), [words]);
  const tier = TIER[difficulty] || TIER.intermediate;

  const [sessionXp, setSessionXp] = useState(0);
  const [phase, setPhase] = useState(pool.length < MIN_PAIRS ? "empty" : "loading"); // loading | playing | result | empty
  const [sets, setSets] = useState([]);
  const [setIndex, setSetIndex] = useState(0);
  const [picOrder, setPicOrder] = useState([]);
  const [solved, setSolved] = useState([]);
  const [selected, setSelected] = useState(null); // { side: word|pic, id }
  const [feedback, setFeedback] = useState(null); // { type: match|miss, wordId, picId }
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
  const finishing = useRef(false);
  const busy = useRef(false);

  const startRound = useCallback(async (startStreak) => {
    if (pool.length < MIN_PAIRS) { setPhase("empty"); return; }
    setPhase("loading");
    finishing.current = false;
    busy.current = false;
    roundId.current = generateRoundId();
    firstTry.current = new Set();
    missedOnce.current = new Set();

    const count = Math.min(tier.items, pool.length);
    const chosen = await buildPersonalizedRound({ words: pool, userEmail: user?.email, count });
    const items = chosen.map((w, i) => ({ id: `${w.english}-${i}`, word: w.english, wordId: w.id, emoji: w.emoji, provenance: w._provenance }));
    const built = chunkSets(items, tier.setSize);

    roundItems.current = items;
    budgetRef.current = Math.max(items.length, Math.round(items.length * ATTEMPTS_PER_ITEM));
    triesRef.current = 0;
    streakBestRef.current = startStreak;

    setSets(built);
    setSetIndex(0);
    setPicOrder(built.length ? shuffle(built[0]).map((it) => it.id) : []);
    setSolved([]); setSelected(null); setFeedback(null);
    setFirstTryCount(0); setStreak(startStreak); setStreakBest(startStreak);
    setTries(0); setBudget(budgetRef.current); setSummary(null); setFlyups([]);
    setPhase(items.length >= MIN_PAIRS ? "playing" : "empty");
  }, [pool, tier.items, tier.setSize, user?.email]);

  useEffect(() => { startRound(0); }, [startRound]);

  const finishRound = useCallback((reason) => {
    if (finishing.current || !roundItems.current.length) return;
    finishing.current = true;
    const items = roundItems.current;
    const itemsTotal = items.length;
    const itemsCorrect = firstTry.current.size;
    const finalStreakBest = streakBestRef.current;
    const usedTries = triesRef.current;

    const { amount, streakBonus } = computeRoundXp({ itemsCorrect, streakBest: finalStreakBest, hintMultiplier: 1 });
    recordRoundReward({ userEmail: user?.email, game: GAME, roundId: roundId.current, itemsTotal, itemsCorrect, streakBest: finalStreakBest, hintMultiplier: 1, level });
    logWordAttempts({
      userEmail: user?.email, game: GAME, level, roundId: roundId.current,
      items: items.map((it) => ({ word: it.word, wordId: it.wordId, correct: firstTry.current.has(it.word) })),
    });

    const scorePct = Math.round((itemsCorrect / itemsTotal) * 100);
    onXpEarned?.(amount, itemsCorrect);
    onGameComplete?.({ scorePct, correct: itemsCorrect, total: itemsTotal });
    setSessionXp((v) => v + amount);
    setSummary({ passed: roundPassed(itemsCorrect, itemsTotal), reason, firstTry: [...firstTry.current], tries: usedTries, budget: budgetRef.current, accuracyPct: usedTries ? Math.round((itemsCorrect / usedTries) * 100) : 0, streakBest: finalStreakBest, amount, streakBonus, itemsCorrect, itemsTotal });
    setPhase("result");
  }, [user?.email, level, onXpEarned, onGameComplete]);

  const advanceOrFinish = useCallback((nextSolved) => {
    const current = sets[setIndex] || [];
    if (!current.every((it) => nextSolved.includes(it.id))) {
      if (triesRef.current >= budgetRef.current) finishRound("budget");
      return;
    }
    if (setIndex + 1 >= sets.length) { finishRound("clear"); return; }
    setTimeout(() => {
      if (finishing.current) return;
      const nextIdx = setIndex + 1;
      setSetIndex(nextIdx);
      setPicOrder(shuffle(sets[nextIdx]).map((it) => it.id));
      setSelected(null);
      if (triesRef.current >= budgetRef.current) finishRound("budget");
    }, SET_MS);
  }, [sets, setIndex, finishRound]);

  const resolve = (wordItem, picItem) => {
    busy.current = true;
    triesRef.current += 1;
    setTries(triesRef.current);
    setSelected(null);
    if (wordItem.id === picItem.id) {
      if (!missedOnce.current.has(wordItem.word)) {
        firstTry.current.add(wordItem.word);
        setFirstTryCount(firstTry.current.size);
        const s = streak + 1;
        streakBestRef.current = Math.max(streakBestRef.current, s);
        setStreak(s); setStreakBest(streakBestRef.current);
        const fid = `${roundId.current}-${wordItem.id}`;
        setFlyups((f) => [...f, { id: fid, amount: computeRoundXp({ itemsCorrect: 1 }).amount }]);
        setTimeout(() => setFlyups((f) => f.filter((x) => x.id !== fid)), 900);
      }
      setFeedback({ type: "match", wordId: wordItem.id, picId: picItem.id });
      setTimeout(() => {
        busy.current = false;
        if (finishing.current) return;
        setFeedback(null);
        setSolved((prev) => { const next = [...prev, wordItem.id]; advanceOrFinish(next); return next; });
      }, MATCH_MS);
    } else {
      missedOnce.current.add(wordItem.word);
      setStreak(0);
      setFeedback({ type: "miss", wordId: wordItem.id, picId: picItem.id });
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
    if (selected?.side === "pic") {
      const pic = (sets[setIndex] || []).find((x) => x.id === selected.id);
      if (pic) resolve(it, pic);
      return;
    }
    setSelected(selected?.side === "word" && selected.id === it.id ? null : { side: "word", id: it.id });
  };
  const onPicTap = (it) => {
    if (phase !== "playing" || busy.current || solved.includes(it.id)) return;
    if (selected?.side === "word") {
      const word = (sets[setIndex] || []).find((x) => x.id === selected.id);
      if (word) resolve(word, it);
      return;
    }
    setSelected(selected?.side === "pic" && selected.id === it.id ? null : { side: "pic", id: it.id });
  };

  const stateOfWord = (it) => solved.includes(it.id) ? "solved" : feedback?.wordId === it.id ? feedback.type : selected?.side === "word" && selected.id === it.id ? "selected" : "idle";
  const stateOfPic = (it) => solved.includes(it.id) ? "solved" : feedback?.picId === it.id ? feedback.type : selected?.side === "pic" && selected.id === it.id ? "selected" : "idle";

  const current = sets[setIndex] || [];
  const pictures = picOrder.map((id) => current.find((x) => x.id === id)).filter(Boolean);
  const playing = phase === "playing";
  const liveXp = sessionXp + (playing ? computeRoundXp({ itemsCorrect: firstTryCount, streakBest }).amount : 0);
  const progress = roundItems.current.length ? solved.length / roundItems.current.length : 0;
  const triesLeft = Math.max(0, budget - tries);

  return (
    <div className="min-h-screen bg-background premium-mesh flex flex-col">
      <PictureMatchHud accent={ACCENT} onBack={onBack} xp={liveXp} streak={streak} triesLeft={triesLeft} showTries={playing && budget > 0} lowTries={budget > 0 && triesLeft <= Math.ceil(budget * 0.25)} />

      <div className="h-1 bg-white/5" role="progressbar" aria-valuenow={Math.round(progress * 100)} aria-valuemin={0} aria-valuemax={100}>
        <motion.div className="h-full" style={{ background: `linear-gradient(90deg, ${ACCENT}, ${ACCENT}aa)` }} animate={{ width: `${progress * 100}%` }} transition={{ duration: rm ? 0 : 0.5, ease: [0.16, 1, 0.3, 1] }} />
      </div>

      <div className="flex-1 flex flex-col px-3 py-4 max-w-lg mx-auto w-full relative">
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
            <p className="text-[11px] text-muted-foreground mb-3">{c("panel", { n: setIndex + 1, total: sets.length })} · {c("item_progress", { n: firstTryCount, total: roundItems.current.length })}</p>
            <p className="text-xs text-muted-foreground text-center mb-3">{c("instruction")}</p>

            <PictureMatchSet items={current} pictures={pictures} accent={ACCENT} stateOfWord={stateOfWord} stateOfPic={stateOfPic} onWordTap={onWordTap} onPicTap={onPicTap} />

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
            <PictureMatchResult summary={summary} items={roundItems.current} accent={ACCENT} onKeepGoing={() => startRound(streak)} onPlayAgain={() => { setSessionXp(0); startRound(0); }} onExit={onBack} />
          </div>
        )}
      </div>
    </div>
  );
}