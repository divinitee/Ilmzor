import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { base44 } from "@/api/base44Client";
import { Timer, Lightbulb, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslationLang } from "@/hooks/useTranslationLang";
import { useAppLang } from "@/hooks/useAppLang";

const DIFF_CONFIG = {
  beginner:     { count: 20, types: ["multiple_choice"], hints: true },
  intermediate:  { count: 30, types: ["multiple_choice", "translation"], hints: true },
  advanced:      { count: 30, types: ["translation", "define"], hints: false },
  proficient:    { count: 40, types: ["define"], hints: false },
};

function shuffle(arr) { return [...arr].sort(() => Math.random() - 0.5); }

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
      prompt: `The correct English translation of the Uzbek word "${word.uzbek}" (Russian: "${word.russian || ""}") is "${word.english}". A student wrote: "${userInput}". Is this translation correct? Consider minor typos (1-2 chars) as correct. Reply with JSON: { "correct": true } or { "correct": false }. Do NOT give partial credit.`,
      response_json_schema: { type: "object", properties: { correct: { type: "boolean" } } }
    });
    return res.correct ? 100 : 0;
  } catch {
    const sim = similarityScore(userInput, word.english);
    return sim >= 80 ? 100 : 0;
  }
}

export default function VocabQuizGame({ words, unitName, onBack, user, onCoinsEarned, onGameComplete, difficulty = "intermediate", timePerQ = 30, autoAdvance = true }) {
  const cfg = DIFF_CONFIG[difficulty] || DIFF_CONFIG.intermediate;
  const timed = timePerQ && timePerQ > 0;

  const [questions, setQuestions] = useState([]);
  const [qIndex, setQIndex] = useState(0);
  const [selected, setSelected] = useState(null);
  const [defineInput, setDefineInput] = useState("");
  const [defineScore, setDefineScore] = useState(null);
  const [checking, setChecking] = useState(false);
  const [timeLeft, setTimeLeft] = useState(timed ? timePerQ : 0);
  const [scores, setScores] = useState([]);
  const [done, setDone] = useState(false);
  const [waitingNext, setWaitingNext] = useState(false);
  const [coinAnimation, setCoinAnimation] = useState(null);
  const timerRef = useRef(null);
  const { showRu } = useTranslationLang();
  const { t } = useAppLang();

  const buildQuestions = () => {
    const TARGET = Math.min(cfg.count, Math.max(words.length, 1));
    let expanded = shuffle(words);
    while (expanded.length < TARGET && words.length > 0) {
      expanded = [...expanded, ...shuffle(words)];
    }
    const pool = expanded.slice(0, TARGET);
    const qs = pool.map(word => {
      const type = cfg.types[Math.floor(Math.random() * cfg.types.length)];
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
    setWaitingNext(false);
    startTimer();
  };

  useEffect(() => { buildQuestions(); /* eslint-disable-next-line */ }, [words]);

  const startTimer = () => {
    clearInterval(timerRef.current);
    if (!timed) { setTimeLeft(0); return; }
    setTimeLeft(timePerQ);
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
    afterAnswer();
  };

  useEffect(() => () => clearInterval(timerRef.current), []);

  useEffect(() => {
    if (!done || !user || scores.length === 0) return;
    const correctCount = scores.filter(s => s === 100).length;
    const coinsEarned = correctCount * 1;
    const avg = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
    if (onGameComplete) onGameComplete({ scorePct: avg, correct: correctCount, total: scores.length });
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

  const goNext = () => {
    setSelected(null);
    setDefineInput("");
    setDefineScore(null);
    setWaitingNext(false);
    if (qIndex + 1 >= questions.length) { setDone(true); return; }
    setQIndex(i => i + 1);
    startTimer();
  };

  const afterAnswer = () => {
    if (autoAdvance) setTimeout(goNext, 1000);
    else setWaitingNext(true);
  };

  const handleOption = (opt) => {
    if (selected !== null) return;
    clearInterval(timerRef.current);
    setSelected(opt);
    const q = questions[qIndex];
    const correct = q.type === "multiple_choice" ? opt === q.word.uzbek : opt === q.word.english;
    setScores(s => [...s, correct ? 100 : 0]);
    if (correct) { setCoinAnimation("+1 🪙"); setTimeout(() => setCoinAnimation(null), 1000); }
    afterAnswer();
  };

  const handleDefineSubmit = async () => {
    if (!defineInput.trim() || checking) return;
    clearInterval(timerRef.current);
    setChecking(true);
    const score = await aiSimilarity(defineInput, questions[qIndex].word);
    setDefineScore(score);
    setScores(s => [...s, score]);
    if (score === 100) { setCoinAnimation("+1 🪙"); setTimeout(() => setCoinAnimation(null), 1000); }
    setChecking(false);
    afterAnswer();
  };

  if (questions.length === 0) {
    return <div className="flex items-center justify-center py-20"><div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" /></div>;
  }

  if (done) {
    const total = scores.reduce((a, b) => a + b, 0);
    const avg = Math.round(total / scores.length);
    const correctCount = scores.filter(s => s === 100).length;
    const coinsEarned = correctCount * 1;
    return (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-sm mx-auto px-4 py-10 text-center">
        <div className="text-6xl mb-4">{avg >= 70 ? "🏆" : avg >= 40 ? "👍" : "📚"}</div>
        <h2 className="text-2xl font-bold text-foreground mb-2">{t("gameui.quiz_done")}</h2>
        <p className="text-muted-foreground mb-1">{unitName}</p>
        <p className="text-xs text-muted-foreground mb-4 capitalize">{t("gameui.level_label", { level: difficulty })} · {t("gameui.questions_count", { n: questions.length })}</p>

        <motion.div
          initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.2 }}
          className="bg-amber-500/10 border border-amber-400/30 rounded-2xl p-4 mb-4 flex items-center justify-center gap-3"
        >
          <span className="text-3xl">🪙</span>
          <div>
            <p className="text-2xl font-bold text-amber-600">+{coinsEarned}</p>
            <p className="text-xs text-muted-foreground">{t("gameui.coins_added_x", { n: correctCount })}</p>
          </div>
        </motion.div>

        <div className="bg-primary/10 rounded-2xl p-5 mb-5">
          <p className="text-4xl font-bold text-primary">{avg}%</p>
          <p className="text-sm text-muted-foreground mt-1">{t("gameui.avg_score")}</p>
        </div>
        <div className="space-y-2 mb-6 max-h-64 overflow-y-auto">
          {scores.map((s, i) => (
            <div key={i} className="flex items-center justify-between text-sm px-2">
              <span className="text-muted-foreground">{t("gameui.question_n", { n: i + 1 })}</span>
              <div className="flex items-center gap-2">
                {s === 100 && <span className="text-xs text-amber-600 font-semibold">+1 🪙</span>}
                <span className={`font-semibold ${s === 100 ? "text-emerald-600" : "text-destructive"}`}>{s === 100 ? "100%" : "0%"}</span>
              </div>
            </div>
          ))}
        </div>
        <Button onClick={buildQuestions} className="w-full mb-2">{t("gameui.retry")}</Button>
        <Button variant="outline" onClick={onBack} className="w-full">{t("gameui.back")}</Button>
      </motion.div>
    );
  }

  const q = questions[qIndex];
  const timerPct = timed ? (timeLeft / timePerQ) * 100 : 0;

  return (
    <div className="max-w-sm mx-auto px-4 py-6 relative">
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
        <button onClick={onBack} className="text-muted-foreground text-sm hover:text-foreground select-none">← {t("gameui.back")}</button>
        <span className="text-xs text-muted-foreground font-medium">{qIndex + 1} / {questions.length}</span>
        <div className="flex items-center gap-1 text-sm font-semibold text-primary">
          {timed ? (<><Timer className="w-4 h-4" /><span>{timeLeft}s</span></>) : <span className="text-xs">{t("gameui.untimed")}</span>}
        </div>
      </div>

      {/* Timer bar */}
      {timed && (
        <div className="h-1.5 bg-muted rounded-full mb-6 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-1000"
            style={{ width: `${timerPct}%`, background: timerPct > 50 ? "#6366f1" : timerPct > 25 ? "#f59e0b" : "#ef4444" }}
          />
        </div>
      )}
      {!timed && <div className="mb-6" />}

      {/* Question */}
      <AnimatePresence mode="wait">
        <motion.div key={qIndex} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.2 }}>
          <div className="bg-background border border-border rounded-2xl p-5 mb-5 text-center">
            {q.type === "multiple_choice" && (
              <>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2 font-semibold">{t("gameui.translate_to_uz")}</p>
                <p className="text-2xl font-bold text-foreground">{q.word.english}</p>
                {cfg.hints && q.word.pronunciation && <p className="text-sm text-muted-foreground mt-1">{q.word.pronunciation}</p>}
              </>
            )}
            {q.type === "translation" && (
              <>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2 font-semibold">{t("gameui.translate_to_en")}</p>
                <p className="text-2xl font-bold text-foreground">{q.word.uzbek}</p>
                {cfg.hints && showRu && q.word.russian && <p className="text-sm text-muted-foreground mt-1">{q.word.russian}</p>}
              </>
            )}
            {q.type === "define" && (
              <>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2 font-semibold">
                  <Lightbulb className="inline w-3.5 h-3.5 mr-1" />{t("gameui.write_en_translation")}
                </p>
                <p className="text-2xl font-bold text-foreground">{q.word.uzbek}</p>
                {cfg.hints && showRu && q.word.russian && <p className="text-sm text-muted-foreground mt-1">{q.word.russian}</p>}
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
                placeholder={t("gameui.write_en_placeholder")}
                className="w-full h-28 px-4 py-3 border-2 border-input rounded-xl text-sm bg-background text-foreground focus:border-primary focus:outline-none transition-colors resize-none"
                disabled={checking || defineScore !== null}
              />
              {defineScore !== null && (
                <div className={`mt-3 rounded-xl p-3 text-center font-semibold text-sm ${defineScore === 100 ? "bg-emerald-500/10 text-emerald-700" : "bg-destructive/10 text-destructive"}`}>
                  {defineScore === 100 ? t("gameui.correct_great") : t("gameui.wrong")} — {t("gameui.correct_wrong_pct", { pct: defineScore === 100 ? "100%" : "0%" })}
                  <p className="text-xs font-normal mt-1 text-muted-foreground">{t("gameui.correct_answer_is")} {q.word.english} = {q.word.uzbek}</p>
                </div>
              )}
              {defineScore === null && (
                <Button onClick={handleDefineSubmit} disabled={!defineInput.trim() || checking} className="w-full mt-3">
                  {checking ? t("gameui.checking") : t("gameui.submit_answer")}
                </Button>
              )}
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Manual next button (when auto-advance off) */}
      {waitingNext && !autoAdvance && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <Button onClick={goNext} className="w-full mt-4 select-none">
            {qIndex + 1 >= questions.length ? t("gameui.finish") : t("gameui.next_question")} <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </motion.div>
      )}
    </div>
  );
}