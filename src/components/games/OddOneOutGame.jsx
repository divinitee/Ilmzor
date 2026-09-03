import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Check, X, Star, RotateCcw, Sparkles } from "lucide-react";
import { shuffle, pickN } from "@/lib/vocabGameUtils";

// Each entry: a target word, 4 words that mean roughly the same thing,
// and 1 word that means the opposite — the "odd one out". Curated bank,
// independent of the VocabularyWord library (which has no synonym/antonym
// fields yet) — same pattern as GrammarQuizGame's hardcoded QUESTION_BANK.
const ODD_ONE_OUT_BANK = [
  { target: "Happy", synonyms: ["Glad", "Joyful", "Cheerful", "Pleased"], antonym: "Sad" },
  { target: "Big", synonyms: ["Large", "Huge", "Giant", "Massive"], antonym: "Tiny" },
  { target: "Fast", synonyms: ["Quick", "Rapid", "Swift", "Speedy"], antonym: "Slow" },
  { target: "Hot", synonyms: ["Warm", "Boiling", "Scorching", "Heated"], antonym: "Cold" },
  { target: "Easy", synonyms: ["Simple", "Effortless", "Basic", "Straightforward"], antonym: "Difficult" },
  { target: "Strong", synonyms: ["Powerful", "Tough", "Sturdy", "Mighty"], antonym: "Weak" },
  { target: "Brave", synonyms: ["Courageous", "Fearless", "Bold", "Daring"], antonym: "Cowardly" },
  { target: "Kind", synonyms: ["Gentle", "Caring", "Generous", "Friendly"], antonym: "Cruel" },
  { target: "Clean", synonyms: ["Spotless", "Tidy", "Neat", "Fresh"], antonym: "Dirty" },
  { target: "Rich", synonyms: ["Wealthy", "Affluent", "Prosperous", "Well-off"], antonym: "Poor" },
  { target: "Quiet", synonyms: ["Silent", "Calm", "Peaceful", "Hushed"], antonym: "Loud" },
  { target: "Young", synonyms: ["Youthful", "Juvenile", "Fresh", "New"], antonym: "Old" },
  { target: "Beautiful", synonyms: ["Pretty", "Lovely", "Gorgeous", "Stunning"], antonym: "Ugly" },
  { target: "Safe", synonyms: ["Secure", "Protected", "Sheltered", "Guarded"], antonym: "Dangerous" },
  { target: "Full", synonyms: ["Packed", "Filled", "Loaded", "Crammed"], antonym: "Empty" },
  { target: "Wide", synonyms: ["Broad", "Spacious", "Vast", "Expansive"], antonym: "Narrow" },
  { target: "Bright", synonyms: ["Radiant", "Vivid", "Shining", "Brilliant"], antonym: "Dark" },
  { target: "Early", synonyms: ["Prompt", "Timely", "Advance", "Beforehand"], antonym: "Late" },
  { target: "High", synonyms: ["Tall", "Elevated", "Lofty", "Towering"], antonym: "Low" },
  { target: "Open", synonyms: ["Unlocked", "Ajar", "Accessible", "Unsealed"], antonym: "Closed" },
];

const ROUND_COUNT = 8;

// "Antonym Hunt" — four of the five words on screen mean roughly the same
// as the target; one means the opposite. Trains discrimination among
// similar options, not just recognition — deliberately different from
// Synonym Sprint's straight multiple-choice recall.
export default function OddOneOutGame({ onBack, onXpEarned, onGameComplete }) {
  const [round, setRound] = useState(0);

  const rounds = useMemo(() => {
    const picks = pickN(ODD_ONE_OUT_BANK, Math.min(ROUND_COUNT, ODD_ONE_OUT_BANK.length));
    return picks.map((entry) => ({
      target: entry.target,
      correct: entry.antonym,
      options: shuffle([...entry.synonyms, entry.antonym]),
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round]);

  const count = rounds.length;
  const [idx, setIdx] = useState(0);
  const [selected, setSelected] = useState(null);
  const [answered, setAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);

  const r = rounds[idx];

  const handleSelect = (opt) => {
    if (answered || !r) return;
    setSelected(opt);
    setAnswered(true);
    if (opt === r.correct) setScore((s) => s + 1);
  };

  const handleNext = () => {
    if (idx + 1 >= count) {
      const pct = count ? Math.round((score / count) * 100) : 0;
      setFinished(true);
      onGameComplete?.({ scorePct: pct });
      if (score > 0) onXpEarned?.(score * 10, score);
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
    setRound((n) => n + 1);
  };

  if (finished) {
    const pct = Math.round((score / count) * 100);
    const earned = score * 10;
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
            <Sparkles className={`w-10 h-10 ${pass ? "text-emerald-600" : "text-amber-500"}`} />
          </div>
          <p className="text-xs font-semibold uppercase tracking-widest text-blue-500 mb-1">
            Antonym Hunt
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
              Skill Hub
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
        <span className="text-xs font-bold text-blue-600">Antonym Hunt</span>
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
          Round {idx + 1} of {count}
        </p>

        <AnimatePresence mode="wait">
          <motion.div
            key={idx}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            className="bg-card border border-border rounded-2xl p-5 mb-5 shadow-sm text-center"
          >
            <p className="text-[11px] text-muted-foreground mb-2 font-medium uppercase tracking-wider">
              Find the odd one out
            </p>
            <p className="text-base text-foreground leading-relaxed">
              Four of these mean the same as <b className="text-blue-600">{r?.target}</b>. One means
              the opposite — tap it.
            </p>
          </motion.div>
        </AnimatePresence>

        <div className="grid grid-cols-2 gap-2.5">
          {r?.options.map((opt) => {
            const isCorrect = answered && opt === r.correct;
            const isWrong = answered && opt === selected && opt !== r.correct;
            return (
              <motion.button
                key={opt}
                onClick={() => handleSelect(opt)}
                disabled={answered}
                whileTap={{ scale: answered ? 1 : 0.97 }}
                className={`px-4 py-3.5 rounded-xl border-2 text-sm font-medium flex items-center justify-between select-none transition-all ${
                  isCorrect
                    ? "border-emerald-500 bg-emerald-500/10 text-emerald-300"
                    : isWrong
                    ? "border-rose-500 bg-rose-500/10 text-rose-300"
                    : answered
                    ? "border-border bg-card text-muted-foreground"
                    : "border-border bg-card text-foreground hover:border-blue-400 hover:bg-blue-500/5"
                }`}
              >
                <span>{opt}</span>
                {isCorrect && <Check className="w-4 h-4 text-emerald-500" />}
                {isWrong && <X className="w-4 h-4 text-rose-500" />}
              </motion.button>
            );
          })}
        </div>

        <AnimatePresence>
          {answered && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-5">
              <button
                onClick={handleNext}
                className="w-full h-12 rounded-xl bg-gradient-to-b from-blue-500 to-blue-700 text-white font-semibold shadow-lg flex items-center justify-center gap-2 select-none"
              >
                {idx + 1 >= count ? "Finish" : "Next round"}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
