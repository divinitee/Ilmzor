import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Star, Check, RotateCcw, Trophy, BookOpen } from "lucide-react";
import { pickEmojiPairs } from "@/lib/wordEmoji";

const PAIRS_PER_ROUND = 4;

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function PictureMatchGame({ words = [], onBack, onResult, user, isActive }) {
  const [seed, setSeed] = useState(0);
  const [pairs, setPairs] = useState([]);
  const [emojis, setEmojis] = useState([]);
  const [selectedWord, setSelectedWord] = useState(null);
  const [selectedEmoji, setSelectedEmoji] = useState(null);
  const [matched, setMatched] = useState(new Set());
  const [wrongPair, setWrongPair] = useState(null);
  const [coins, setCoins] = useState(0);
  const [moves, setMoves] = useState(0);
  const [finished, setFinished] = useState(false);

  useEffect(() => {
    const round = pickEmojiPairs(words, PAIRS_PER_ROUND);
    if (round.length < 2) return;
    setPairs(shuffle(round));
    setEmojis(shuffle(round));
    setMatched(new Set());
    setSelectedWord(null);
    setSelectedEmoji(null);
    setCoins(0);
    setMoves(0);
    setFinished(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seed]);

  const done = pairs.length > 0 && matched.size === pairs.length;

  const tryCheck = (word, emojiWord) => {
    if (word === emojiWord) {
      const next = new Set(matched);
      next.add(word);
      setMatched(next);
      setCoins((c) => c + 1);
      setSelectedWord(null);
      setSelectedEmoji(null);
      if (next.size === pairs.length) {
        setFinished(true);
        onResult?.({ coins: coins + 1, correct: next.size, total: pairs.length });
      }
    } else {
      setWrongPair({ word, emoji: emojiWord });
      setTimeout(() => {
        setWrongPair(null);
        setSelectedWord(null);
        setSelectedEmoji(null);
      }, 600);
    }
  };

  const handleWordPick = (w) => {
    if (matched.has(w.word) || wrongPair) return;
    setSelectedWord(w.word);
    if (selectedEmoji) { setMoves((m) => m + 1); tryCheck(w.word, selectedEmoji); }
  };
  const handleEmojiPick = (w) => {
    if (matched.has(w.word) || wrongPair) return;
    setSelectedEmoji(w.word);
    if (selectedWord) { setMoves((m) => m + 1); tryCheck(selectedWord, w.word); }
  };

  const replay = () => setSeed((s) => s + 1);

  if (pairs.length < 2) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-muted/30 px-4">
        <BookOpen className="w-10 h-10 text-muted-foreground/40 mb-3" />
        <p className="text-sm text-muted-foreground mb-5 text-center">
          Not enough picture-mappable words in this unit yet.
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
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 py-10">
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="w-full max-w-sm text-center">
          <div className="w-20 h-20 mx-auto rounded-full bg-emerald-500/15 flex items-center justify-center mb-5">
            <Trophy className="w-10 h-10 text-emerald-600" />
          </div>
          <p className="text-xs font-semibold uppercase tracking-widest text-blue-500 mb-1">Picture Match</p>
          <h2 className="text-2xl font-bold text-foreground mb-1">All matched!</h2>
          <p className="text-sm text-muted-foreground mb-6">
            {coins} pairs · {moves} moves · {coins * 10} XP
          </p>
          <div className="flex gap-3">
            <button onClick={replay} className="flex-1 h-12 rounded-xl border-2 border-border bg-card text-foreground font-semibold flex items-center justify-center gap-2 hover:bg-muted/50 transition-colors select-none">
              <RotateCcw className="w-4 h-4" /> Play again
            </button>
            <button onClick={onBack} className="flex-1 h-12 rounded-xl bg-gradient-to-b from-blue-500 to-blue-700 text-white font-semibold flex items-center justify-center gap-2 shadow-lg select-none">
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
        <button onClick={onBack} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground select-none">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <span className="text-xs font-bold text-blue-600">Picture Match</span>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-600 text-xs font-bold select-none">
          <Star className="w-3.5 h-3.5" /> {coins}
        </div>
      </header>

      <div className="h-1 bg-muted">
        <motion.div
          className="h-full bg-gradient-to-r from-blue-500 to-indigo-600"
          animate={{ width: `${(matched.size / pairs.length) * 100}%` }}
        />
      </div>

      <div className="flex-1 flex flex-col px-4 py-6 max-w-lg mx-auto w-full">
        <p className="text-xs text-muted-foreground mb-4 text-center">
          Tap a word, then tap its matching picture.
        </p>

        <div className="grid grid-cols-2 gap-3">
          {/* words */}
          <div className="flex flex-col gap-2.5">
            {pairs.map((p) => {
              const isMatched = matched.has(p.word);
              const isSelected = selectedWord === p.word;
              const isWrong = wrongPair && wrongPair.word === p.word;
              return (
                <motion.button
                  key={p.word}
                  onClick={() => handleWordPick(p)}
                  disabled={isMatched || wrongPair}
                  whileTap={isMatched || wrongPair ? undefined : { scale: 0.96 }}
                  animate={isWrong ? { x: [0, -6, 6, -4, 0] } : {}}
                  className={`relative rounded-xl border-2 px-3 py-3 text-sm font-semibold transition-colors select-none min-h-[56px] flex items-center justify-center ${
                    isMatched
                      ? "bg-emerald-500/15 border-emerald-500/60 text-emerald-700 dark:text-emerald-400"
                      : isSelected
                      ? "bg-primary/15 border-primary text-primary"
                      : "bg-card border-border text-foreground hover:border-primary/50"
                  }`}
                >
                  {p.word}
                  {isMatched && <Check className="w-3.5 h-3.5 absolute top-1.5 right-1.5 text-emerald-500" />}
                </motion.button>
              );
            })}
          </div>
          {/* emojis */}
          <div className="flex flex-col gap-2.5">
            {emojis.map((p) => {
              const isMatched = matched.has(p.word);
              const isSelected = selectedEmoji === p.word;
              const isWrong = wrongPair && wrongPair.emoji === p.word;
              return (
                <motion.button
                  key={p.word}
                  onClick={() => handleEmojiPick(p)}
                  disabled={isMatched || wrongPair}
                  whileTap={isMatched || wrongPair ? undefined : { scale: 0.96 }}
                  animate={isWrong ? { x: [0, 6, -6, 4, 0] } : {}}
                  className={`relative rounded-xl border-2 px-3 py-2 text-4xl leading-none transition-colors select-none min-h-[56px] flex items-center justify-center ${
                    isMatched
                      ? "bg-emerald-500/15 border-emerald-500/60"
                      : isSelected
                      ? "bg-primary/15 border-primary"
                      : "bg-card border-border hover:border-primary/50"
                  }`}
                >
                  <span>{p.emoji}</span>
                  {isMatched && <Check className="w-3.5 h-3.5 absolute top-1.5 right-1.5 text-emerald-500" />}
                </motion.button>
              );
            })}
          </div>
        </div>

        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground mt-6">
          <span>Moves: {moves}</span>
          <span aria-hidden>·</span>
          <span className="flex items-center gap-1">
            <Star className="w-3 h-3 text-amber-400" /> {coins}/{pairs.length}
          </span>
        </div>
      </div>
    </div>
  );
}