import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Check, X, Star, RotateCcw, Trophy, BookOpen } from "lucide-react";

/* ---------- Question banks (one per grammar sub-skill) ---------- */

const QUESTION_BANK = {
  articles: [
    { q: "Choose the correct article:\n\n\"I bought ___ apple at the market.\"", options: ["a", "an", "the", "— (no article)"], answer: 1 },
    { q: "\"She is ___ best player on the team.\"", options: ["a", "an", "the", "— (no article)"], answer: 2 },
    { q: "\"We go to ___ school every weekday.\"", options: ["a", "an", "the", "— (no article)"], answer: 3 },
    { q: "\"He saw ___ elephant at the zoo.\"", options: ["a", "an", "the", "— (no article)"], answer: 1 },
    { q: "\"___ sun rises in the east.\"", options: ["A", "An", "The", "— (no article)"], answer: 2 },
    { q: "\"She plays ___ guitar on weekends.\"", options: ["a", "an", "the", "— (no article)"], answer: 2 },
    { q: "\"It was ___ honest mistake.\"", options: ["a", "an", "the", "— (no article)"], answer: 1 },
  ],
  prepositions: [
    { q: "I'll meet you ___ Monday.", options: ["in", "on", "at", "by"], answer: 1 },
    { q: "The meeting starts ___ 3 o'clock.", options: ["in", "on", "at", "by"], answer: 2 },
    { q: "She is good ___ math.", options: ["in", "on", "at", "for"], answer: 2 },
    { q: "We arrived ___ the airport early.", options: ["in", "on", "at", "to"], answer: 2 },
    { q: "The book is ___ the table.", options: ["in", "on", "at", "over"], answer: 1 },
    { q: "He has been waiting ___ an hour.", options: ["since", "for", "during", "from"], answer: 1 },
    { q: "I was born ___ 1998.", options: ["in", "on", "at", "by"], answer: 0 },
  ],
  verb_tenses: [
    { q: "She ___ to school every day.", options: ["go", "goes", "went", "going"], answer: 1 },
    { q: "Yesterday they ___ a movie.", options: ["watch", "watches", "watched", "watching"], answer: 2 },
    { q: "I ___ my homework right now.", options: ["do", "am doing", "did", "have done"], answer: 1 },
    { q: "We ___ in London since 2015.", options: ["lived", "have lived", "live", "are living"], answer: 1 },
    { q: "When you called, I ___ dinner.", options: ["cook", "cooked", "was cooking", "had cooked"], answer: 2 },
    { q: "By 2020, he ___ three books.", options: ["wrote", "has written", "had written", "writes"], answer: 2 },
  ],
  conditionals: [
    { q: "If it rains, we ___ at home.", options: ["stay", "will stay", "would stay", "had stayed"], answer: 1 },
    { q: "If I ___ rich, I would travel the world.", options: ["am", "were", "had been", "will be"], answer: 1 },
    { q: "If she had studied, she ___ the exam.", options: ["would pass", "would have passed", "will pass", "passed"], answer: 1 },
    { q: "If you heat ice, it ___.", options: ["melts", "will melt", "melted", "would melt"], answer: 0 },
    { q: "I would buy a car if I ___ enough money.", options: ["have", "had", "will have", "would have"], answer: 1 },
  ],
  question_formation: [
    { q: "Make a yes/no question from:\n\n\"She likes tea.\"", options: ["Does she like tea?", "Do she likes tea?", "Is she like tea?", "She likes tea?"], answer: 0 },
    { q: "Question for \"They went to Paris.\":\n\nWhere ___?", options: ["did they go", "do they go", "they went", "were they go"], answer: 0 },
    { q: "Wh-question for \"He is 25.\":\n\nHow old ___?", options: ["is he", "he is", "does he", "has he"], answer: 0 },
    { q: "Question for \"You have a car.\":\n\n___?", options: ["Do you have a car?", "You have a car?", "Are you have a car?", "Have you a car?"], answer: 0 },
  ],
  active_passive: [
    { q: "Passive of \"The chef cooked the meal.\":\n\nThe meal ___ by the chef.", options: ["was cooked", "cooked", "is cooking", "has cooked"], answer: 0 },
    { q: "Passive of \"They build houses.\":\n\nHouses ___ by them.", options: ["are built", "build", "were building", "built"], answer: 0 },
    { q: "Passive of \"Shakespeare wrote Hamlet.\":\n\nHamlet ___ by Shakespeare.", options: ["was written", "wrote", "is writing", "had wrote"], answer: 0 },
    { q: "Passive of \"Someone stole my bike.\":\n\nMy bike ___.", options: ["was stolen", "stole", "is stealing", "has stolen"], answer: 0 },
  ],
  reported_speech: [
    { q: "Report: She said, \"I am tired.\"\n\n→ She said she ___ tired.", options: ["was", "is", "were", "had been"], answer: 0 },
    { q: "Report: He said, \"I will call you.\"\n\n→ He said he ___ call me.", options: ["would", "will", "had", "is going to"], answer: 0 },
    { q: "Report: \"I like pizza,\" she said.\n\n→ She said she ___ pizza.", options: ["liked", "likes", "had liked", "was liking"], answer: 0 },
    { q: "Report: They said, \"We are leaving.\"\n\n→ They said they ___ leaving.", options: ["were", "are", "had been", "will"], answer: 0 },
  ],
  punctuation: [
    { q: "What punctuation ends this sentence?\n\n\"What time is it\"", options: ["?", ".", "!", ","], answer: 0 },
    { q: "Which sentence is punctuated correctly?", options: ["I like apples, bananas, and oranges.", "I like apples bananas and oranges.", "I like apples bananas, and oranges.", "I like, apples bananas and oranges."], answer: 0 },
    { q: "The book belongs to John.\n\nIt is ___ book.", options: ["John's", "Johns", "Johns'", "Johns's"], answer: 0 },
    { q: "Which direct speech is punctuated correctly?", options: ["She said, \"I am here.\"", "She said \"I am here\"", "She said, I am here.", "She said \"I am here.\""], answer: 0 },
  ],
};

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/* ---------- Component ---------- */

export default function GrammarQuizGame({
  bankKey = "articles",
  skillLabel = "Grammar",
  onBack,
  onCoinsEarned,
  onGameComplete,
}) {
  const [round, setRound] = useState(0);
  const questions = useMemo(
    () => {
      const bank = QUESTION_BANK[bankKey] || QUESTION_BANK.articles;
      return shuffle(bank).slice(0, Math.min(8, bank.length));
    },
    [bankKey, round]
  );
  const count = questions.length;

  const [idx, setIdx] = useState(0);
  const [selected, setSelected] = useState(null);
  const [answered, setAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);

  const q = questions[idx];

  const handleSelect = (i) => {
    if (answered) return;
    setSelected(i);
    setAnswered(true);
    if (i === q.answer) setScore((s) => s + 1);
  };

  const handleNext = () => {
    if (idx + 1 >= count) {
      const finalScore = score;
      const pct = Math.round((finalScore / count) * 100);
      const earned = finalScore * 10;
      setFinished(true);
      onGameComplete?.({ scorePct: pct });
      if (earned > 0) onCoinsEarned?.(earned, finalScore);
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

  if (finished) {
    const pct = Math.round((score / count) * 100);
    const earned = score * 10;
    const pass = pct >= 60;
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 py-10">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          className="w-full max-w-sm text-center"
        >
          <div className={`w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-5 ${pass ? "bg-emerald-500/15" : "bg-amber-500/15"}`}>
            <Trophy className={`w-10 h-10 ${pass ? "text-emerald-600" : "text-amber-500"}`} />
          </div>
          <p className="text-xs font-semibold uppercase tracking-widest text-violet-500 mb-1">{skillLabel}</p>
          <h2 className="text-2xl font-bold text-foreground mb-1">{pct}%</h2>
          <p className="text-sm text-muted-foreground mb-6">
            {score} / {count} correct · {earned} XP earned
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
      {/* Header */}
      <header className="bg-background/80 backdrop-blur-xl border-b border-border px-4 py-3 flex items-center justify-between safe-header">
        <button onClick={onBack} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground select-none">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <span className="text-xs font-bold text-violet-600 truncate max-w-[50%] text-center">{skillLabel}</span>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-600 text-xs font-bold select-none">
          <Star className="w-3.5 h-3.5" /> {score}
        </div>
      </header>

      {/* Progress */}
      <div className="h-1 bg-muted">
        <motion.div
          className="h-full bg-gradient-to-r from-violet-500 to-purple-600"
          animate={{ width: `${((idx + (answered ? 1 : 0)) / count) * 100}%` }}
        />
      </div>

      {/* Question */}
      <div className="flex-1 flex flex-col px-4 py-6 max-w-lg mx-auto w-full">
        <p className="text-xs text-muted-foreground mb-3 font-medium">Question {idx + 1} of {count}</p>

        <AnimatePresence mode="wait">
          <motion.div
            key={idx}
            initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}
            className="bg-card border border-border rounded-2xl p-5 mb-5 shadow-sm"
          >
            <p className="text-base font-semibold text-foreground leading-rel whitespace-pre-line">{q.q}</p>
          </motion.div>
        </AnimatePresence>

        <div className="space-y-2.5">
          {q.options.map((opt, i) => {
            const isCorrect = answered && i === q.answer;
            const isWrong = answered && i === selected && i !== q.answer;
            return (
              <motion.button
                key={i}
                onClick={() => handleSelect(i)}
                disabled={answered}
                whileTap={{ scale: answered ? 1 : 0.97 }}
                className={`w-full text-left px-4 py-3.5 rounded-xl border-2 text-sm font-medium flex items-center justify-between transition-all select-none ${
                  isCorrect
                    ? "border-emerald-500 bg-emerald-500/10 text-emerald-300"
                    : isWrong
                    ? "border-rose-500 bg-rose-500/10 text-rose-300"
                    : answered
                    ? "border-border bg-card text-muted-foreground"
                    : "border-border bg-card text-foreground hover:border-violet-400 hover:bg-violet-500/5"
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
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className="mt-5"
            >
              <button
                onClick={handleNext}
                className="w-full h-12 rounded-xl bg-gradient-to-b from-violet-500 to-purple-700 text-white font-semibold shadow-lg flex items-center justify-center gap-2 select-none"
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