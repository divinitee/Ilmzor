import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Check, X, Star, RotateCcw, Trophy, BookOpen } from "lucide-react";
import { usableWords, pickN } from "@/lib/vocabGameUtils";

/**
 * Shared multiple-choice shell for vocabulary meaning games.
 * - buildQuestions(pool) -> array of { options:[str], correct:str, ...promptData }
 * - renderPrompt(q) -> JSX shown in the question card
 */
export default function VocabMcqShell({
  words = [],
  headerLabel = "Vocabulary",
  buildQuestion,
  renderPrompt,
  poolFilter,
  roundCount = 8,
  onBack,
  onCoinsEarned,
  onGameComplete,
}) {
  const pool = useMemo(() => {
    const all = usableWords(words);
    if (poolFilter) {
      const filtered = all.filter(poolFilter);
      if (filtered.length >= 4) return filtered;
    }
    return all;
  }, [words]);

  const [round, setRound] = useState(0);
  const questions = useMemo(() => {
    if (pool.length < 4) return [];
    const targets = pickN(pool, Math.min(roundCount, pool.length));
    return targets.map((t) => buildQuestion(pool, t));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round, pool.length]);

  const count = questions.length;
  const [idx, setIdx] = useState(0);
  const [selected, setSelected] = useState(null);
  const [answered, setAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);

  const q = questions[idx];

  const handleSelect = (i) => {
    if (answered || !q) return;
    setSelected(i);
    setAnswered(true);
    if (q.options[i] === q.correct) setScore((s) => s + 1);
  };

  const handleNext = () => {
    if (idx + 1 >= count) {
      const pct = count ? Math.round((score / count) * 100) : 0;
      setFinished(true);
      onGameComplete?.({ scorePct: pct });
      if (score > 0) onCoinsEarned?.(score * 10, score);
    } else {
      setIdx((i) => i + 1);
      setSelected(null);
      setAnswered(false);
    }
  };

  const handleRetry = () => {
    setIdx(0);
    setSelected(null);
    setAnswered(false);
    setScore(0);
    setFinished(false);
    setRound((r) => r + 1);
  };

  if (count === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-muted/30 px-4">
        <BookOpen className="w-10 h-10 text-muted-foreground/40 mb-3" />
        <p className="text-sm text-muted-foreground mb-5 text-center">
          No words available for this game yet.
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
    const pct = Math.round((score / count) * 100);
    const earned = score * 10;
    const pass = pct >= 60;
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-slate-950 dark:to-indigo-950 flex flex-col items-center justify-center px-4 py-10">
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
            {headerLabel}
          </p>
          <h2 className="text-2xl font-bold text-foreground mb-1">{pct}%</h2>
          <p className="text-sm text-muted-foreground mb-6">
            {score} / {count} correct · {earned} XP
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-slate-950 dark:to-indigo-950 flex flex-col">
      <header className="bg-background/80 backdrop-blur-xl border-b border-border px-4 py-3 flex items-center justify-between safe-header">
        <button
          onClick={onBack}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground select-none"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <span className="text-xs font-bold text-blue-600 truncate max-w-[55%] text-center">
          {headerLabel}
        </span>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-600 text-xs font-bold select-none">
          <Star className="w-3.5 h-3.5" /> {score}
        </div>
      </header>

      <div className="h-1 bg-muted">
        <motion.div
          className="h-full bg-gradient-to-r from-blue-500 to-indigo-600"
          animate={{ width: `${((idx + (answered ? 1 : 0)) / count) * 100}%` }}
        />
      </div>

      <div className="flex-1 flex flex-col px-4 py-6 max-w-lg mx-auto w-full">
        <p className="text-xs text-muted-foreground mb-3 font-medium">
          Question {idx + 1} of {count}
        </p>

        <AnimatePresence mode="wait">
          <motion.div
            key={idx}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            className="bg-card border border-border rounded-2xl p-5 mb-5 shadow-sm"
          >
            {renderPrompt(q)}
          </motion.div>
        </AnimatePresence>

        <div className="space-y-2.5">
          {q.options.map((opt, i) => {
            const isCorrect = answered && opt === q.correct;
            const isWrong = answered && i === selected && opt !== q.correct;
            return (
              <motion.button
                key={i}
                onClick={() => handleSelect(i)}
                disabled={answered}
                whileTap={{ scale: answered ? 1 : 0.97 }}
                className={`w-full text-left px-4 py-3.5 rounded-xl border-2 text-sm font-medium flex items-center justify-between transition-all select-none ${
                  isCorrect
                    ? "border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                    : isWrong
                    ? "border-rose-500 bg-rose-500/10 text-rose-700 dark:text-rose-300"
                    : answered
                    ? "border-border bg-card text-muted-foreground"
                    : "border-border bg-card text-foreground hover:border-blue-400 hover:bg-blue-500/5"
                }`}
              >
                <span>{opt}</span>
                {isCorrect && <Check className="w-5 h-5 text-emerald-500" />}
                {isWrong && <X className="w-5 h-5 text-rose-500" />}
              </motion.button>
            );
          })}
        </div>

        <AnimatePresence>
          {answered && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-5"
            >
              <button
                onClick={handleNext}
                className="w-full h-12 rounded-xl bg-gradient-to-b from-blue-500 to-blue-700 text-white font-semibold shadow-lg flex items-center justify-center gap-2 select-none"
              >
                {idx + 1 >= count ? "Finish" : "Next question"}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}