import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { ArrowLeft, Star, Flame, Loader2, BookOpen, Check, X, Languages } from "lucide-react";
import { usableWords, meaningInLang, shuffle } from "@/lib/vocabGameUtils";
import { SKILLS } from "@/lib/gameSkills";
import { hintXpMultiplier } from "@/lib/levels";
import { computeRoundXp, recordRoundReward, generateRoundId, PASS_THRESHOLD } from "@/lib/gameScoring";
import { buildPersonalizedRound, logWordAttempts } from "@/lib/roundComposition";
import { useFableCopy } from "@/components/games/cardFlipFableCopy";
import CardFlipFableCard from "@/components/games/CardFlipFableCard";
import CardFlipFableResult from "@/components/games/CardFlipFableResult";

// "CardFlip Fable" — independent Memory Flip implementation for the bake-off.
//
// Props contract (identical to every Skill Hub game):
//   words, unitName, level, cognitiveDemand, difficulty, user,
//   onBack(), onXpEarned(amount, correctCount), onGameComplete({ scorePct, correct, total })
//
// Scoring: gameScoring.js only (items = found pairs; streak = consecutive
// matches without a miss). Logging: positive signal only — a found pair logs
// correct:true, a mismatch logs nothing (Layer 4.1).
// A mismatch breaks the streak but does not reduce base XP; it shows up in
// the round's accuracy (pairs / moves), which is also what onGameComplete
// reports as scorePct.

const GAME = "memory_flip";
const ACCENT = SKILLS.find((s) => s.key === "vocabulary")?.color || "#6366f1";
const PAIRS_BY_DIFFICULTY = { beginner: 8, intermediate: 10, advanced: 12, proficient: 14 };
const MIN_PAIRS = 8;
const MATCH_MS = 350;
const MISS_MS = 850;
const GRID_CLASS = { 8: "grid-cols-4 sm:grid-cols-4", 10: "grid-cols-4 sm:grid-cols-5", 12: "grid-cols-4 sm:grid-cols-6", 14: "grid-cols-4 sm:grid-cols-7" };

export default function CardFlipFable({ words = [], level, difficulty = "intermediate", user, onBack, onXpEarned, onGameComplete }) {
  const { c, t, lang } = useFableCopy();
  const rm = useReducedMotion();
  const pool = useMemo(() => usableWords(words), [words]);
  const targetPairs = PAIRS_BY_DIFFICULTY[difficulty] || PAIRS_BY_DIFFICULTY.intermediate;
  const pairCount = Math.min(targetPairs, pool.length);

  // Session (persists across "Keep going" blocks)
  const [sessionXp, setSessionXp] = useState(0);
  const [block, setBlock] = useState(1);

  // Round
  const [phase, setPhase] = useState(pool.length < MIN_PAIRS ? "empty" : "loading"); // loading | playing | result | empty
  const [pairs, setPairs] = useState([]);
  const [cards, setCards] = useState([]);
  const [flipped, setFlipped] = useState([]);
  const [matched, setMatched] = useState(() => new Set());
  const [feedback, setFeedback] = useState(null); // { type: match|miss, ids }
  const [moves, setMoves] = useState(0);
  const [streak, setStreak] = useState(0);
  const [streakBest, setStreakBest] = useState(0);
  const [summary, setSummary] = useState(null);
  const [flyups, setFlyups] = useState([]);
  const roundId = useRef(null);
  const foundItems = useRef([]);
  const finishing = useRef(false);

  // Translation reveal: A2+ start English-only (definition) and can reveal
  // uz/ru at the cost of the hint multiplier; Starter/A1 (multiplier 1) start
  // revealed. In English UI there is nothing to reveal.
  const canReveal = lang !== "en";
  const baseMultiplier = hintXpMultiplier(level);
  const [revealed, setRevealed] = useState(baseMultiplier === 1);
  const revealUsed = useRef(baseMultiplier === 1);
  const hintMultiplier = revealUsed.current && canReveal ? baseMultiplier : 1;

  const startRound = useCallback(async (startStreak) => {
    if (pool.length < MIN_PAIRS) { setPhase("empty"); return; }
    setPhase("loading");
    finishing.current = false;
    roundId.current = generateRoundId();
    foundItems.current = [];
    const chosen = await buildPersonalizedRound({ words: pool, userEmail: user?.email, count: pairCount });
    const list = [];
    chosen.forEach((w, i) => {
      list.push({ id: `${i}-w`, pairId: i, type: "word", content: w.english, provenance: w._provenance });
      list.push({ id: `${i}-m`, pairId: i, type: "meaning", content: w.english_definition || meaningInLang(w, lang), translation: meaningInLang(w, lang) });
    });
    setPairs(chosen);
    setCards(shuffle(list));
    setFlipped([]); setMatched(new Set()); setFeedback(null); setMoves(0);
    setStreak(startStreak); setStreakBest(startStreak); setSummary(null); setFlyups([]);
    setPhase("playing");
  }, [pool, pairCount, user?.email, lang]);

  useEffect(() => { startRound(0); }, [startRound]);

  const finishRound = useCallback((finalMoves, finalStreakBest) => {
    if (finishing.current) return;
    finishing.current = true;
    const itemsCorrect = pairs.length;
    const mult = hintMultiplier;
    const { amount, streakBonus } = computeRoundXp({ itemsCorrect, streakBest: finalStreakBest, hintMultiplier: mult });
    const accuracy = finalMoves ? itemsCorrect / finalMoves : 0;
    recordRoundReward({ userEmail: user?.email, game: GAME, roundId: roundId.current, itemsTotal: itemsCorrect, itemsCorrect, streakBest: finalStreakBest, hintMultiplier: mult, level });
    logWordAttempts({ userEmail: user?.email, game: GAME, level, roundId: roundId.current, items: foundItems.current });
    onXpEarned?.(amount, itemsCorrect);
    onGameComplete?.({ scorePct: Math.round(accuracy * 100), correct: itemsCorrect, total: itemsCorrect });
    setSessionXp((v) => v + amount);
    setSummary({ passed: accuracy >= PASS_THRESHOLD, moves: finalMoves, accuracyPct: Math.round(accuracy * 100), streakBest: finalStreakBest, amount, streakBonus, itemsCorrect, hintMultiplier: mult });
    setPhase("result");
  }, [pairs.length, hintMultiplier, user?.email, level, onXpEarned, onGameComplete]);

  const handleFlip = (card) => {
    if (phase !== "playing" || feedback || flipped.length >= 2) return;
    if (matched.has(card.pairId) || flipped.includes(card.id)) return;
    const next = [...flipped, card.id];
    setFlipped(next);
    if (next.length < 2) return;

    const a = cards.find((x) => x.id === next[0]);
    const b = cards.find((x) => x.id === next[1]);
    const nextMoves = moves + 1;
    setMoves(nextMoves);

    if (a.pairId === b.pairId) {
      const s = streak + 1;
      const best = Math.max(streakBest, s);
      setStreak(s); setStreakBest(best);
      setFeedback({ type: "match", ids: next });
      const w = pairs[a.pairId];
      foundItems.current.push({ word: w.english, wordId: w.id, correct: true });
      const gain = computeRoundXp({ itemsCorrect: 1 }).amount;
      const fid = `${roundId.current}-${a.pairId}`;
      setFlyups((f) => [...f, { id: fid, amount: gain }]);
      setTimeout(() => setFlyups((f) => f.filter((x) => x.id !== fid)), 900);
      setTimeout(() => {
        const m = new Set(matched).add(a.pairId);
        setMatched(m); setFlipped([]); setFeedback(null);
        if (m.size === pairs.length) finishRound(nextMoves, best);
      }, MATCH_MS);
    } else {
      setStreak(0);
      setFeedback({ type: "miss", ids: next });
      setTimeout(() => { setFlipped([]); setFeedback(null); }, MISS_MS);
    }
  };

  const toggleReveal = () => {
    setRevealed((v) => { if (!v) revealUsed.current = true; return !v; });
  };

  const cardState = (card) => {
    if (matched.has(card.pairId)) return "matched";
    if (feedback?.ids.includes(card.id)) return feedback.type;
    return flipped.includes(card.id) ? "up" : "down";
  };

  const liveXp = sessionXp + (phase === "playing" ? computeRoundXp({ itemsCorrect: matched.size, streakBest, hintMultiplier }).amount : 0);
  const progress = pairs.length ? matched.size / pairs.length : 0;

  return (
    <div className="min-h-screen bg-background premium-mesh flex flex-col">
      <header className="bg-background/70 backdrop-blur-xl border-b border-white/10 px-3 py-2 flex items-center justify-between safe-header gap-2">
        <button onClick={onBack} className="min-h-[44px] min-w-[44px] flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground select-none px-1">
          <ArrowLeft className="w-4 h-4" aria-hidden="true" /> {t("gameui.back")}
        </button>
        <span className="text-xs font-bold truncate" style={{ color: ACCENT }}>{c("title")}</span>
        <div className="flex items-center gap-1.5 text-xs font-bold select-none">
          <span className="neo-pill px-2.5 h-8 text-amber-300" aria-label={c("xp")}>
            <Star className="w-3.5 h-3.5" aria-hidden="true" /> {liveXp}
          </span>
          <span className={`neo-pill px-2.5 h-8 ${streak > 0 ? "text-orange-300" : "text-muted-foreground"}`} aria-label={c("streak")}>
            <Flame className="w-3.5 h-3.5" aria-hidden="true" /> {streak}
          </span>
        </div>
      </header>

      <div className="h-1 bg-white/5" role="progressbar" aria-valuenow={Math.round(progress * 100)} aria-valuemin={0} aria-valuemax={100}>
        <motion.div className="h-full" style={{ background: `linear-gradient(90deg, ${ACCENT}, ${ACCENT}aa)` }} animate={{ width: `${progress * 100}%` }} transition={{ duration: rm ? 0 : 0.5, ease: [0.16, 1, 0.3, 1] }} />
      </div>

      <div className="flex-1 flex flex-col px-3 py-4 max-w-2xl mx-auto w-full relative">
        {/* XP fly-ups */}
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

        {phase === "playing" && (
          <>
            <div className="flex items-center justify-between gap-2 mb-3 text-[11px] text-muted-foreground">
              <span>{c("block", { n: block })} · {c("pairs_progress", { n: matched.size, total: pairs.length })}</span>
              {canReveal && (
                <button onClick={toggleReveal} className="min-h-[44px] flex items-center gap-1 font-semibold select-none px-2" style={{ color: revealed ? undefined : ACCENT }}>
                  <Languages className="w-3.5 h-3.5" aria-hidden="true" /> {revealed ? c("english_only") : c("show_translation")}
                </button>
              )}
            </div>
            <p className="text-xs text-muted-foreground text-center mb-3">{c("instruction")}</p>

            <div className={`grid gap-2 ${GRID_CLASS[pairCount] || "grid-cols-4"}`}>
              {cards.map((card, i) => (
                <CardFlipFableCard
                  key={card.id}
                  index={i}
                  accent={ACCENT}
                  card={card.type === "meaning" && revealed && canReveal ? { ...card, content: card.translation || card.content } : card}
                  state={cardState(card)}
                  onClick={() => handleFlip(card)}
                />
              ))}
            </div>

            <div className="h-8 mt-3 flex items-center justify-center" aria-live="polite">
              <AnimatePresence mode="wait">
                {feedback && (
                  <motion.span key={feedback.type + feedback.ids[0]} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: rm ? 0 : 0.2 }} className={`flex items-center gap-1.5 text-sm font-semibold ${feedback.type === "match" ? "text-emerald-400" : "text-rose-400"}`}>
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
            <CardFlipFableResult
              summary={summary}
              pairs={pairs}
              accent={ACCENT}
              onKeepGoing={() => { setBlock((b) => b + 1); startRound(streak); }}
              onPlayAgain={() => { setSessionXp(0); setBlock(1); startRound(0); }}
              onExit={onBack}
            />
          </div>
        )}
      </div>
    </div>
  );
}