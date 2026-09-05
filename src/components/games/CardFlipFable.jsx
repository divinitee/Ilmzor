import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Loader2, BookOpen, Check, X, Languages } from "lucide-react";
import { usableWords, meaningInLang } from "@/lib/vocabGameUtils";
import { SKILLS } from "@/lib/gameSkills";
import { hintXpMultiplier } from "@/lib/levels";
import { computeRoundXp, recordRoundReward, generateRoundId, roundPassed } from "@/lib/gameScoring";
import { buildPersonalizedRound, logWordAttempts } from "@/lib/roundComposition";
import { buildOpeningBoard, dealInto, isDead } from "@/components/games/cardFlipFableBoard";
import { meaningForLevel, usesSupportLanguage } from "@/components/games/cardFlipFableMeaning";
import { studyMsForBoard } from "@/components/games/cardFlipFableStudy";
import { useFableCopy } from "@/components/games/cardFlipFableCopy";
import CardFlipFableHud from "@/components/games/CardFlipFableHud";
import CardFlipFableCard from "@/components/games/CardFlipFableCard";
import CardFlipFableResult from "@/components/games/CardFlipFableResult";

// "CardFlip Fable" — the Memory Flip implementation that continues after the
// bake-off. Props contract (identical to every Skill Hub game):
//   words, unitName, level, cognitiveDemand, difficulty, user,
//   onBack(), onXpEarned(amount, correctCount), onGameComplete({ scorePct, correct, total })
//
// Round shape: a large board (Tee's pick) as a window over a deeper stream.
// A study reveal shows the whole opening board face-up, for a length set by the
// information on it (cardFlipFableStudy.js) — never shortened by CEFR level.
// A matched pair leaves and fresh cards deal into the freed slots under the
// invariants in cardFlipFableBoard.js. The block ends on a full clear, or — as
// a guard that should be unreachable — on a dead board. No round clock in this
// iteration. itemsCorrect = pairs matched out of pairs in the round, so
// PASS_THRESHOLD is a real bar.
//
// Meaning cards are CEFR-aware via cardFlipFableMeaning.js: Starter/A1 anchor
// on the support-language translation, A2 on a shortened English definition,
// B1+ on the full definition.
//
// Scoring: gameScoring.js only. Logging: positive signal only — a found pair
// logs correct:true, a mismatch logs nothing.

const GAME = "memory_flip";
const ACCENT = SKILLS.find((s) => s.key === "vocabulary")?.color || "#6366f1";
// boardPairs = how much of the round is on screen (Tee liked the big board);
// roundPairs = the stream the board rotates through.
const TIER = {
  beginner: { boardPairs: 8, roundPairs: 12 },
  intermediate: { boardPairs: 10, roundPairs: 15 },
  advanced: { boardPairs: 12, roundPairs: 18 },
  proficient: { boardPairs: 14, roundPairs: 21 },
};
const MIN_PAIRS = 8;
const MATCH_MS = 350;
const MISS_MS = 850;
const GRID_CLASS = { 8: "grid-cols-4 sm:grid-cols-4", 10: "grid-cols-4 sm:grid-cols-5", 12: "grid-cols-4 sm:grid-cols-6", 14: "grid-cols-4 sm:grid-cols-7" };

export default function CardFlipFable({ words = [], level, difficulty = "intermediate", user, onBack, onXpEarned, onGameComplete }) {
  const { c, t, lang } = useFableCopy();
  const rm = useReducedMotion();
  const pool = useMemo(() => usableWords(words), [words]);
  const tier = TIER[difficulty] || TIER.intermediate;
  const roundPairs = Math.min(tier.roundPairs, pool.length);
  const boardPairs = Math.min(tier.boardPairs, roundPairs);
  const slots = boardPairs * 2;

  // Session (persists across "Keep going" blocks)
  const [sessionXp, setSessionXp] = useState(0);
  const [block, setBlock] = useState(1);

  // Round
  const [phase, setPhase] = useState(pool.length < MIN_PAIRS ? "empty" : "loading"); // loading | peek | playing | result | empty
  const [pairs, setPairs] = useState([]);
  const [deck, setDeck] = useState({ board: [], pile: [], dealSeq: 0 });
  const [flipped, setFlipped] = useState([]);
  const [feedback, setFeedback] = useState(null); // { type: match|miss, ids }
  const [matchedCount, setMatchedCount] = useState(0);
  const [streak, setStreak] = useState(0);
  const [streakBest, setStreakBest] = useState(0);
  const [studyMs, setStudyMs] = useState(0);
  const [summary, setSummary] = useState(null);
  const [flyups, setFlyups] = useState([]);
  // Refs mirror the values finishRound needs, so the clock (an interval
  // closure) and the terminal guard always bank the live numbers.
  const roundId = useRef(null);
  const foundItems = useRef([]);
  const finishing = useRef(false);
  const pairsRef = useRef([]);
  const deckRef = useRef(deck);
  const matchedRef = useRef(0);
  const movesRef = useRef(0);
  const streakBestRef = useRef(0);
  const finishRef = useRef(null);

  // Translation reveal: A2+ read an English definition and can reveal the
  // uz/ru translation at the cost of the hint multiplier. Starter/A1 already
  // read the support-language translation on the card, and an English UI has
  // no support language, so neither offers a reveal.
  const canReveal = lang !== "en" && !usesSupportLanguage(level);
  const baseMultiplier = hintXpMultiplier(level);
  const [revealed, setRevealed] = useState(baseMultiplier === 1);
  const revealUsed = useRef(baseMultiplier === 1);
  const currentMultiplier = () => (revealUsed.current && canReveal ? baseMultiplier : 1);

  const setDeckBoth = (d) => { deckRef.current = d; setDeck(d); };

  const startRound = useCallback(async (startStreak) => {
    if (pool.length < MIN_PAIRS) { setPhase("empty"); return; }
    setPhase("loading");
    finishing.current = false;
    roundId.current = generateRoundId();
    foundItems.current = [];
    const chosen = await buildPersonalizedRound({ words: pool, userEmail: user?.email, count: roundPairs });
    const list = [];
    chosen.forEach((w, i) => {
      list.push({ id: `${i}-w`, pairId: i, type: "word", content: w.english, provenance: w._provenance });
      list.push({ id: `${i}-m`, pairId: i, type: "meaning", content: meaningForLevel(w, level, lang), translation: meaningInLang(w, lang) });
    });
    pairsRef.current = chosen; setPairs(chosen);
    const opening = buildOpeningBoard(list, slots);
    setDeckBoth(opening);
    setStudyMs(studyMsForBoard(opening.board));
    matchedRef.current = 0; movesRef.current = 0; streakBestRef.current = startStreak;
    setMatchedCount(0); setStreak(startStreak); setStreakBest(startStreak);
    setFlipped([]); setFeedback(null); setSummary(null); setFlyups([]);
    setPhase("peek");
  }, [pool, roundPairs, slots, user?.email, lang, level]);

  useEffect(() => { startRound(0); }, [startRound]);

  // Study reveal → play. Length comes from the board's information load.
  useEffect(() => {
    if (phase !== "peek" || !studyMs) return;
    const id = setTimeout(() => setPhase("playing"), studyMs);
    return () => clearTimeout(id);
  }, [phase, studyMs]);

  const finishRound = useCallback((reason) => {
    if (finishing.current || !pairsRef.current.length) return;
    finishing.current = true;
    const itemsTotal = pairsRef.current.length;
    const itemsCorrect = matchedRef.current;
    const finalStreakBest = streakBestRef.current;
    const finalMoves = movesRef.current;
    const mult = currentMultiplier();
    const { amount, streakBonus } = computeRoundXp({ itemsCorrect, streakBest: finalStreakBest, hintMultiplier: mult });
    recordRoundReward({ userEmail: user?.email, game: GAME, roundId: roundId.current, itemsTotal, itemsCorrect, streakBest: finalStreakBest, hintMultiplier: mult, level });
    logWordAttempts({ userEmail: user?.email, game: GAME, level, roundId: roundId.current, items: foundItems.current });
    const scorePct = Math.round((itemsCorrect / itemsTotal) * 100);
    onXpEarned?.(amount, itemsCorrect);
    onGameComplete?.({ scorePct, correct: itemsCorrect, total: itemsTotal });
    setSessionXp((v) => v + amount);
    setSummary({ passed: roundPassed(itemsCorrect, itemsTotal), reason, found: foundItems.current.map((i) => i.word), moves: finalMoves, accuracyPct: finalMoves ? Math.round((itemsCorrect / finalMoves) * 100) : 0, streakBest: finalStreakBest, amount, streakBonus, itemsCorrect, itemsTotal, hintMultiplier: mult });
    setPhase("result");
  }, [user?.email, level, onXpEarned, onGameComplete, canReveal, baseMultiplier]);
  finishRef.current = finishRound;

  const handleFlip = (card) => {
    if (phase !== "playing" || feedback || flipped.length >= 2 || flipped.includes(card.id)) return;
    const next = [...flipped, card.id];
    setFlipped(next);
    if (next.length < 2) return;

    const a = deckRef.current.board.find((x) => x?.id === next[0]);
    movesRef.current += 1;

    if (a.pairId === card.pairId) {
      const s = streak + 1;
      streakBestRef.current = Math.max(streakBestRef.current, s);
      setStreak(s); setStreakBest(streakBestRef.current);
      setFeedback({ type: "match", ids: next });
      const w = pairsRef.current[a.pairId];
      foundItems.current.push({ word: w.english, wordId: w.id, correct: true });
      const fid = `${roundId.current}-${a.pairId}`;
      setFlyups((f) => [...f, { id: fid, amount: computeRoundXp({ itemsCorrect: 1 }).amount }]);
      setTimeout(() => setFlyups((f) => f.filter((x) => x.id !== fid)), 900);
      setTimeout(() => {
        if (finishing.current) return;
        matchedRef.current += 1; setMatchedCount(matchedRef.current);
        setFlipped([]); setFeedback(null);
        if (matchedRef.current === pairsRef.current.length) { finishRound("clear"); return; }
        // Rotate: the pair leaves, fresh cards deal into the freed slots.
        const board = [...deckRef.current.board];
        const freed = [];
        next.forEach((id) => { const i = board.findIndex((x) => x?.id === id); if (i >= 0) { board[i] = null; freed.push(i); } });
        const d = dealInto({ board, pile: deckRef.current.pile, dealSeq: deckRef.current.dealSeq }, freed);
        setDeckBoth(d);
        // Terminal guard — unreachable while the invariant holds; degrades a
        // logic error into a banked round instead of a dead board.
        if (isDead(d.board, d.pile)) finishRound("dead");
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

  const peeking = phase === "peek";
  const cardState = (card) => {
    if (peeking) return "up";
    if (feedback?.ids.includes(card.id)) return feedback.type;
    return flipped.includes(card.id) ? "up" : "down";
  };

  const onBoard = peeking || phase === "playing";
  const liveXp = sessionXp + (onBoard ? computeRoundXp({ itemsCorrect: matchedCount, streakBest, hintMultiplier: currentMultiplier() }).amount : 0);
  const progress = pairs.length ? matchedCount / pairs.length : 0;

  return (
    <div className="min-h-screen bg-background premium-mesh flex flex-col">
      <CardFlipFableHud accent={ACCENT} onBack={onBack} xp={liveXp} streak={streak} />

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

        {onBoard && (
          <>
            <div className="flex items-center justify-between gap-2 mb-3 text-[11px] text-muted-foreground">
              <span>{c("block", { n: block })} · {c("pairs_progress", { n: matchedCount, total: pairs.length })}</span>
              {canReveal && (
                <button onClick={toggleReveal} className="min-h-[44px] flex items-center gap-1 font-semibold select-none px-2" style={{ color: revealed ? undefined : ACCENT }}>
                  <Languages className="w-3.5 h-3.5" aria-hidden="true" /> {revealed ? c("english_only") : c("show_translation")}
                </button>
              )}
            </div>
            <p className="text-xs text-muted-foreground text-center mb-3" aria-live="polite">{peeking ? c("peek") : c("instruction")}</p>

            <div className={`grid gap-2 ${GRID_CLASS[boardPairs] || "grid-cols-4"}`}>
              {deck.board.map((card, i) =>
                card ? (
                  <CardFlipFableCard
                    key={card.id}
                    index={card.dealtAt === 0 ? i : 0}
                    accent={ACCENT}
                    card={card.type === "meaning" && revealed && canReveal ? { ...card, content: card.translation || card.content } : card}
                    state={cardState(card)}
                    onClick={() => handleFlip(card)}
                  />
                ) : (
                  <div key={`slot-${i}`} className="min-h-[64px] sm:min-h-[76px] rounded-2xl border border-dashed border-white/10" aria-hidden="true" />
                )
              )}
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