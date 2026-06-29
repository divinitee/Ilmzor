import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { base44 } from "@/api/base44Client";
import { Timer, CheckCircle2, XCircle, Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";

const QUESTION_TYPES = ["define"];
const TIME_PER_Q = 30;
const TOTAL_QUESTIONS = 30;

function shuffle(arr) {
  return [...arr].sort(() => Math.random() - 0.5);
}

function levenshtein(a, b) {
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, (_, i) => Array.from({ length: n + 1 }, (_, j) => i === 0 ? j : j === 0 ? i : 0));
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = a[i-1] === b[j-1] ? dp[i-1][j-1] : 1 + Math.min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1]);
  return dp[m][n];
}

function similarityScore(userInput, target) {
  const a = userInput.toLowerCase().trim();
  const b = target.toLowerCase().trim();
  if (!a) return 0;
  const dist = levenshtein(a, b);
  const maxLen = Math.max(a.length, b.length);
  return Math.max(0, Math.round((1 - dist / maxLen) * 100));
}

async function aiSimilarity(userInput, word) {
  try {
    const res = await base44.integrations.Core.InvokeLLM({
      prompt: `The correct English translation of the Uzbek word "${word.uzbek}" (Russian: "${word.russian || ""}") is "${word.english}". A student wrote: "${userInput}". Score how correct this English translation is from 0 to 100. Consider typos leniently. Only reply with a single integer number.`,
      response_json_schema: { type: "object", properties: { score: { type: "number" } } }
    });
    return Math.min(100, Math.max(0, Math.round(res.score || 0)));
  } catch {
    return similarityScore(userInput, word.english);
  }
}

export default function VocabQuizGame({ words, unitName, onBack, user, onCoinsEarned }) {
  const [questions, setQuestions] = useState([]);
  const [qIndex, setQIndex] = useState(0);
  const [selected, setSelected] = useState(null);
  const [defineInput, setDefineInput] = useState("");
  const [defineScore, setDefineScore] = useState(null);
  const [checking, setChecking] = useState(false);
  const [timeLeft, setTimeLeft] = useState(TIME_PER_Q);
  const [scores, setScores] = useState([]);
  const [done, setDone] = useState(false);
  const [coinAnimation, setCoinAnimation] = useState(null); // "+N 🪙"
  const timerRef = useRef(null);

  useEffect(() => {
    buildQuestions();
  }, [words]);

  const buildQuestions = () => {
    const TARGET = TOTAL_QUESTIONS;
    let expanded = shuffle(words);
    while (expanded.length < TARGET && words.length > 0) {
      expanded = [...expanded, ...shuffle(words)];
    }
    const pool = expanded.slice(0, Math.min(TARGET, expanded.length));
    const qs = pool.map(word => {
      const type = QUESTION_TYPES[Math.floor(Math.random() * QUESTION_TYPES.length)];
      let options = [];
      if (type === "multiple_choice") {
        const distractors = shuffle(words.filter(w => w.id !== word.id)).slice(0, 3).map(w => w.uzbek);
        options = shuffle([word.uzbek, ...distractors]);
      }
      if (type === "translation") {
        const distractors = shuffle(words.filter(w => w.id !== word.id)).slice(0, 3).map(w => w.english);
        options = shuffle([word.english, ...distractors]);
      }
      return { word, type, options };
    });
    setQuestions(qs);
    setQIndex(0);
    setScores([]);
    setDone(false);
    startTimer();
  };

  const startTimer = () => {
    clearInterval(timerRef.current);
    setTimeLeft(TIME_PER_Q);
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) { clearInterval(timerRef.current); handleTimeout(); return 0; }
        return t - 1;
      });
    }, 1000);
  };

  const handleTimeout = () => {
    setScores(s => [...s, 0]);
    setSelected("__timeout__");
    setTimeout(() => advance(false), 1200);
  };

  useEffect(() => () => clearInterval(timerRef.current), []);

  useEffect(() => {
    if (!done || !user || scores.length === 0) return;
    const correctCount = scores.filter(s => s >= 50).length;
    const coinsEarned = correctCount * 10; // 10 coins per correct answer
    const now = new Date();
    const dateStr = now.toLocaleDateString() + " " + now.toLocaleTimeString().slice(0, 5);
    base44.entities.QuizResult.create({
      student_name: user.full_name || user.email,
      student_phone: user.email,
      unit_name: unitName,
      score: correctCount,
      total_questions: scores.length,
      date: dateStr
    }).catch(() => {});
    if (coinsEarned > 0 && onCoinsEarned) onCoinsEarned(coinsEarned, correctCount);
  }, [done]);

  const advance = (correct) => {
    clearInterval(timerRef.current);
    setTimeout(() => {
      setSelected(null);
      setDefineInput("");
      setDefineScore(null);
      if (qIndex + 1 >= questions.length) { setDone(true); return; }
      setQIndex(i => i + 1);
      startTimer();
    }, 1000);
  };

  const handleOption = (opt) => {
    if (selected !== null) return;
    clearInterval(timerRef.current);
    setSelected(opt);
    const q = questions[qIndex];
    const correct = q.type === "multiple_choice" ? opt === q.word.uzbek : opt === q.word.english;
    setScores(s => [...s, correct ? 100 : 0]);
    if (correct) { setCoinAnimation("+10 🪙"); setTimeout(() => setCoinAnimation(null), 1000); }
    advance(correct);
  };

  const handleDefineSubmit = async () => {
    if (!defineInput.trim() || checking) return;
    clearInterval(timerRef.current);
    setChecking(true);
    const score = await aiSimilarity(defineInput, questions[qIndex].word);
    setDefineScore(score);
    setScores(s => [...s, score]);
    setChecking(false);
    advance(score >= 50);
  };

  if (questions.length === 0) {
    return <div className="flex items-center justify-center py-20"><div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" /></div>;
  }

  if (done) {
    const total = scores.reduce((a, b) => a + b, 0);
    const avg = Math.round(total / scores.length);
    const correctCount = scores.filter(s => s >= 50).length;
    const coinsEarned = correctCount * 10;
    return (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-sm mx-auto px-4 py-10 text-center">
        <div className="text-6xl mb-4">{avg >= 70 ? "🏆" : avg >= 40 ? "👍" : "📚"}</div>
        <h2 className="text-2xl font-bold text-foreground mb-2">Quiz tugadi!</h2>
        <p className="text-muted-foreground mb-4">{unitName}</p>

        {/* Coins earned */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.2 }}
          className="bg-amber-500/10 border border-amber-400/30 rounded-2xl p-4 mb-4 flex items-center justify-center gap-3"
        >
          <span className="text-3xl">🪙</span>
          <div>
            <p className="text-2xl font-bold text-amber-600">+{coinsEarned}</p>
            <p className="text-xs text-muted-foreground">tanga qo'shildi ({correctCount} × 10)</p>
          </div>
        </motion.div>

        <div className="bg-primary/10 rounded-2xl p-5 mb-5">
          <p className="text-4xl font-bold text-primary">{avg}%</p>
          <p className="text-sm text-muted-foreground mt-1">O'rtacha ball</p>
        </div>
        <div className="space-y-2 mb-6">
          {scores.map((s, i) => (
            <div key={i} className="flex items-center justify-between text-sm px-2">
              <span className="text-muted-foreground">Savol {i + 1}</span>
              <div className="flex items-center gap-2">
                {s >= 50 && <span className="text-xs text-amber-600 font-semibold">+10 🪙</span>}
                <span className={`font-semibold ${s >= 70 ? "text-emerald-600" : s >= 40 ? "text-amber-500" : "text-destructive"}`}>{s}%</span>
              </div>
            </div>
          ))}
        </div>
        <Button onClick={buildQuestions} className="w-full mb-2">Qayta urinib ko'ring</Button>
        <Button variant="outline" onClick={onBack} className="w-full">Orqaga</Button>
      </motion.div>
    );
  }

  const q = questions[qIndex];
  const timerPct = (timeLeft / TIME_PER_Q) * 100;

  return (
    <div className="max-w-sm mx-auto px-4 py-6 relative">
      {/* Coin animation */}
      <AnimatePresence>
        {coinAnimation && (
          <motion.div
            initial={{ opacity: 1, y: 0, scale: 1 }}
            animate={{ opacity: 0, y: -60, scale: 1.4 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.9 }}
            className="absolute top-12 left-1/2 -translate-x-1/2 z-50 text-xl font-bold text-amber-500 pointer-events-none"
          >
            {coinAnimation}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <button onClick={onBack} className="text-muted-foreground text-sm hover:text-foreground">← Orqaga</button>
        <span className="text-xs text-muted-foreground font-medium">{qIndex + 1} / {questions.length}</span>
        <div className="flex items-center gap-1 text-sm font-semibold text-primary">
          <Timer className="w-4 h-4" />
          <span>{timeLeft}s</span>
        </div>
      </div>

      {/* Timer bar */}
      <div className="h-1.5 bg-muted rounded-full mb-6 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-1000"
          style={{ width: `${timerPct}%`, background: timerPct > 50 ? "#6366f1" : timerPct > 25 ? "#f59e0b" : "#ef4444" }}
        />
      </div>

      {/* Question */}
      <AnimatePresence mode="wait">
        <motion.div key={qIndex} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.2 }}>
          <div className="bg-background border border-border rounded-2xl p-5 mb-5 text-center">
            {q.type === "multiple_choice" && (
              <>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2 font-semibold">O'zbekchaga tarjima qiling</p>
                <p className="text-2xl font-bold text-foreground">{q.word.english}</p>
                {q.word.pronunciation && <p className="text-sm text-muted-foreground mt-1">{q.word.pronunciation}</p>}
              </>
            )}
            {q.type === "translation" && (
              <>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2 font-semibold">Inglizchaga tarjima qiling</p>
                <p className="text-2xl font-bold text-foreground">{q.word.uzbek}</p>
                {q.word.russian && <p className="text-sm text-muted-foreground mt-1">{q.word.russian}</p>}
              </>
            )}
            {q.type === "define" && (
              <>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2 font-semibold">
                  <Lightbulb className="inline w-3.5 h-3.5 mr-1" />Inglizcha tarjimasini yozing
                </p>
                <p className="text-2xl font-bold text-foreground">{q.word.uzbek}</p>
                {q.word.russian && <p className="text-sm text-muted-foreground mt-1">{q.word.russian}</p>}
              </>
            )}
          </div>

          {/* Answers */}
          {(q.type === "multiple_choice" || q.type === "translation") && (
            <div className="grid grid-cols-2 gap-3">
              {q.options.map((opt, i) => {
                const correctOpt = q.type === "multiple_choice" ? q.word.uzbek : q.word.english;
                let cls = "border-2 border-border bg-background text-foreground hover:border-primary/50 transition-colors";
                if (selected !== null) {
                  if (opt === correctOpt) cls = "border-2 border-emerald-500 bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300";
                  else if (opt === selected) cls = "border-2 border-destructive bg-destructive/10 text-destructive";
                  else cls = "border-2 border-border bg-muted/30 text-muted-foreground";
                }
                return (
                  <button key={i} onClick={() => handleOption(opt)} className={`rounded-xl px-3 py-3 text-sm font-medium text-left select-none transition-all ${cls}`}>
                    {opt}
                  </button>
                );
              })}
            </div>
          )}

          {q.type === "define" && (
            <div>
              <textarea
                value={defineInput}
                onChange={e => setDefineInput(e.target.value)}
                placeholder="Inglizcha tarjimasini yozing..."
                className="w-full h-28 px-4 py-3 border-2 border-input rounded-xl text-sm bg-background text-foreground focus:border-primary focus:outline-none transition-colors resize-none"
                disabled={checking || defineScore !== null}
              />
              {defineScore !== null && (
                <div className={`mt-3 rounded-xl p-3 text-center font-semibold text-sm ${defineScore >= 70 ? "bg-emerald-500/10 text-emerald-700" : defineScore >= 40 ? "bg-amber-500/10 text-amber-700" : "bg-destructive/10 text-destructive"}`}>
                  {defineScore >= 70 ? "✅ Ajoyib!" : defineScore >= 40 ? "👍 Yaxshi urinish!" : "❌ Qayta urinib ko'ring"} — {defineScore}% to'g'ri
                  <p className="text-xs font-normal mt-1 text-muted-foreground">To'g'ri javob: {q.word.english} = {q.word.uzbek}</p>
                </div>
              )}
              {defineScore === null && (
                <Button onClick={handleDefineSubmit} disabled={!defineInput.trim() || checking} className="w-full mt-3">
                  {checking ? "Tekshirilmoqda..." : "Javobni yuborish"}
                </Button>
              )}
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}