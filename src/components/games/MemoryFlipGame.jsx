import React, { useState, useMemo, useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Star, RotateCcw, Trophy, BookOpen } from "lucide-react";
import { usableWords, pickN, meaningInLang, shuffle } from "@/lib/vocabGameUtils";
import { useAppLang } from "@/hooks/useAppLang";

const PAIR_COUNT = 6;

// "Memory Flip" — flip cards two at a time to match each word with its meaning.
export default function MemoryFlipGame({ words = [], onBack, onCoinsEarned, onGameComplete }) {
  const [round, setRound] = useState(0);
  const { lang } = useAppLang();

  const pairs = useMemo(() => {
    const pool = usableWords(words);
    if (pool.length < PAIR_COUNT) return [];
    return pickN(pool, PAIR_COUNT);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round, words]);

  const cards = useMemo(() => {
    if (!pairs.length) return [];
    const list = [];
    pairs.forEach((w, i) => {
      list.push({ id: `${i}-w`, pairId: i, content: w.english, type: "word" });
      list.push({ id: `${i}-m`, pairId: i, content: meaningInLang(w, lang), type: "meaning" });
    });
    return shuffle(list);
  }, [pairs]);

  const [flipped, setFlipped] = useState([]);
  const [matched, setMatched] = useState(new Set());
  const [moves, setMoves] = useState(0);
  const [finished, setFinished] = useState(false);

  useEffect(() => {
    setFlipped([]);
    setMatched(new Set());
    setMoves(0);
    setFinished(false);
  }, [cards]);

  useEffect(() => {
    if (PAIR_COUNT > 0 && matched.size === PAIR_COUNT && !finished) {
      setFinished(true);
      const extra = Math.max(0, moves - PAIR_COUNT);
      const pct = Math.max(40, 100 - extra * 8);
      onGameComplete?.({ scorePct: pct });
      const coins = Math.max(0, PAIR_COUNT * 5 - extra * 2);
      if (coins > 0) onCoinsEarned?.(coins, PAIR_COUNT);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matched]);

  const handleClick = (card) => {
    if (finished || !cards.length) return;
    if (matched.has(card.pairId)) return;
    if (flipped.includes(card.id)) return;
    if (flipped.length >= 2) return;

    const next = [...flipped, card.id];
    setFlipped(next);

    if (next.length === 2) {
      setMoves((m) => m + 1);
      const [aId, bId] = next;
      const a = cards.find((c) => c.id === aId);
      const b = cards.find((c) => c.id === bId);
      if (a.pairId === b.pairId) {
        setTimeout(() => {
          setMatched((prev) => new Set(prev).add(a.pairId));
          setFlipped([]);
        }, 350);
      } else {
        setTimeout(() => setFlipped([]), 850);
      }
    }
  };

  const handleRetry = () => setRound((r) => r + 1);

  if (!cards.length) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-muted/30 px-4">
        <BookOpen className="w-10 h-10 text-muted-foreground/40 mb-3" />
        <p className="text-sm text-muted-foreground mb-5 text-center">
          Not enough words for this game yet.
        </p>
        <button
          onClick={onBack}
          className="h-11 px-5 rounded-xl bg-primary text-primary-foreground font-semibold select-none"
        >
          Back to Skill Hub
        </button>
      </div>
    );
  }

  if (finished) {
    const extra = Math.max(0, moves - PAIR_COUNT);
    const pct = Math.max(40, 100 - extra * 8);
    const pass = pct >= 60;
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 py-10">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-full max-w-sm text-center"
        >
          <div
            className={`w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-5 ${
              pass ? "bg-emerald-500/15" : "bg-amber-500/15"
            }`}
          >
            <Trophy className={`w-10 h-10 ${pass ? "text-emerald-600" : "text-amber-500"}`} />
          </div>
          <p className="text-xs font-semibold uppercase tracking-widest text-blue-500 mb-1">
            Memory Flip
          </p>
          <h2 className="text-2xl font-bold text-foreground mb-1">{pct}%</h2>
          <p className="text-sm text-muted-foreground mb-6">
            Solved in {moves} moves · {PAIR_COUNT} pairs
          </p>
          <div className="flex gap-3">
            <button
              onClick={handleRetry}
              className="flex-1 h-12 rounded-xl border-2 border-border bg-card text-foreground font-semibold flex items-center justify-center gap-2 hover:bg-muted/50 transition-colors select-none"
            >
              <RotateCcw className="w-4 h-4" /> Play again
            </button>
            <button
              onClick={onBack}
              className="flex-1 h-12 rounded-xl bg-gradient-to-b from-blue-500 to-blue-700 text-white font-semibold flex items-center justify-center gap-2 shadow-lg select-none"
            >
              <BookOpen className="w-4 h-4" /> Skill Hub
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="bg-background/80 backdrop-blur-xl border-b border-border px-4 py-3 flex items-center justify-between safe-header">
        <button
          onClick={onBack}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground select-none"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <span className="text-xs font-bold text-blue-600">Memory Flip</span>
        <div className="flex items-center gap-3 text-xs font-bold select-none">
          <span className="text-muted-foreground">Moves {moves}</span>
          <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-600">
            <Star className="w-3.5 h-3.5" /> {matched.size}/{PAIR_COUNT}
          </span>
        </div>
      </header>

      <div className="flex-1 px-4 py-6 max-w-lg mx-auto w-full">
        <p className="text-xs text-muted-foreground mb-4 text-center font-medium">
          Flip two cards — match each word with its meaning.
        </p>
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
          {cards.map((c) => {
            const isUp = flipped.includes(c.id) || matched.has(c.pairId);
            const isMatched = matched.has(c.pairId);
            return (
              <motion.button
                key={c.id}
                onClick={() => handleClick(c)}
                disabled={isUp}
                whileTap={{ scale: isUp ? 1 : 0.95 }}
                className={`relative rounded-xl border-2 flex items-center justify-center text-center px-2 py-3 min-h-[78px] select-none transition-colors ${
                  isMatched
                    ? "border-emerald-500 bg-emerald-500/10"
                    : isUp
                    ? "border-blue-400 bg-blue-500/10"
                    : "border-border bg-card hover:border-blue-300"
                }`}
              >
                {isUp ? (
                  <span
                    className={
                      c.type === "word"
                        ? "text-sm font-bold text-foreground leading-tight"
                        : "text-[11px] text-muted-foreground leading-tight"
                    }
                  >
                    {c.content}
                  </span>
                ) : (
                  <span className="text-2xl text-muted-foreground/30">?</span>
                )}
              </motion.button>
            );
          })}
        </div>
      </div>
    </div>
  );
}