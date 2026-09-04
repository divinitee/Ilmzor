import React, { useState, useEffect, useRef, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { BookOpen, CheckCircle, XCircle, ArrowRight, Trophy, ChevronLeft } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAppLang } from "@/hooks/useAppLang";
import { resolveUserNameOrEmail } from "@/lib/profileName";

const pageVariants = {
  initial: { x: "100%", opacity: 0 },
  animate: { x: 0, opacity: 1, transition: { type: "spring", stiffness: 300, damping: 30 } },
  exit: { x: "-100%", opacity: 0, transition: { duration: 0.2 } },
};

export default function Quiz() {
  const { unitKey } = useParams();
  const navigate = useNavigate();
  const { t } = useAppLang();
  const [user, setUser] = useState(null);
  const [words, setWords] = useState([]);
  const [unitName, setUnitName] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [correctCount, setCorrectCount] = useState(0);
  const [timeLeft, setTimeLeft] = useState(30);
  const [phase, setPhase] = useState("loading");
  const [lastResult, setLastResult] = useState(null);
  const timerRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    loadQuiz();
    return () => clearInterval(timerRef.current);
  }, []);

  const loadQuiz = async () => {
    const me = await base44.auth.me();
    setUser(me);
    const allWords = await base44.entities.VocabularyWord.filter({ unit_key: unitKey }, 'unit_number', 500);
    if (allWords.length > 0) setUnitName(allWords[0].unit_name);
    const TARGET = 30;
    const shuffled = [...allWords].sort(() => 0.5 - Math.random());
    let questions = [...shuffled];
    // If fewer than TARGET words, repeat/cycle to fill up to TARGET questions
    while (questions.length < TARGET && allWords.length > 0) {
      const extra = [...allWords].sort(() => 0.5 - Math.random());
      questions = [...questions, ...extra];
    }
    setWords(questions.slice(0, Math.min(TARGET, questions.length)));
    setPhase("quiz");
  };

  const startTimer = useCallback(() => {
    clearInterval(timerRef.current);
    setTimeLeft(30);
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) { clearInterval(timerRef.current); return 0; }
        return prev - 1;
      });
    }, 1000);
  }, []);

  useEffect(() => {
    if (phase === "quiz" && words.length > 0 && currentIndex < words.length) {
      startTimer();
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [phase, currentIndex, words.length, startTimer]);

  useEffect(() => {
    if (timeLeft === 0 && phase === "quiz") handleNext(true);
  }, [timeLeft, phase]);

  const handleNext = async (timeout = false) => {
    clearInterval(timerRef.current);
    if (!timeout) {
      const correct = answer.trim().toLowerCase() === words[currentIndex].english.toLowerCase();
      if (correct) { setCorrectCount(prev => prev + 1); setLastResult("correct"); }
      else setLastResult("wrong");
    } else {
      setLastResult("wrong");
    }
    setTimeout(() => {
      setLastResult(null);
      setAnswer("");
      const nextIndex = currentIndex + 1;
      if (nextIndex >= words.length) {
        endQuiz(correctCount + ((!timeout && answer.trim().toLowerCase() === words[currentIndex].english.toLowerCase()) ? 1 : 0));
      } else {
        setCurrentIndex(nextIndex);
      }
    }, 600);
  };

  const endQuiz = async (finalScore) => {
    clearInterval(timerRef.current);
    setPhase("result");
    const now = new Date();
    const dateStr = now.toLocaleDateString() + " " + now.toLocaleTimeString().slice(0, 5);
    await base44.entities.QuizResult.create({
      student_name: resolveUserNameOrEmail(user),
      student_phone: user.email,
      unit_name: unitName,
      score: finalScore,
      total_questions: words.length,
      date: dateStr
    });
  };

  if (phase === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (phase === "result") {
    const percentage = words.length > 0 ? Math.round((correctCount / words.length) * 100) : 0;
    return (
      <motion.div className="min-h-screen bg-muted/40 flex flex-col" variants={pageVariants} initial="initial" animate="animate">
        <header className="bg-background border-b border-border px-4 pb-3 flex items-center gap-2 safe-header sticky top-0 z-30">
          <button onClick={() => navigate("/")} className="text-muted-foreground hover:text-foreground mr-1 select-none p-1">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <BookOpen className="w-5 h-5 text-primary select-none" />
          <span className="font-bold text-foreground">{t("quiz.result_header")}</span>
        </header>
        <div className="flex-1 flex items-center justify-center px-4">
          <div className="bg-background rounded-2xl shadow-sm border border-border p-8 max-w-md w-full text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-4">
              <Trophy className="w-8 h-8 text-emerald-600 select-none" />
            </div>
            <h2 className="text-xl font-bold text-foreground mb-2">{t("quiz.finished_title")}</h2>
            <p className="text-muted-foreground text-sm mb-6">{unitName}</p>
            <div className="bg-muted/40 rounded-xl p-6 mb-6">
              <p className="text-4xl font-bold text-primary">{correctCount}<span className="text-muted-foreground text-lg"> / {words.length}</span></p>
              <p className="text-sm text-muted-foreground mt-1">{t("quiz.correct_pct", { n: percentage })}</p>
            </div>
            <Button onClick={() => navigate("/")} className="w-full h-12 font-semibold select-none">
              {t("quiz.back_to_dashboard")}
            </Button>
          </div>
        </div>
      </motion.div>
    );
  }

  const word = words[currentIndex];
  const progress = (currentIndex / words.length) * 100;
  const timerPercent = (timeLeft / 30) * 100;

  return (
    <motion.div className="min-h-screen bg-muted/40 flex flex-col" variants={pageVariants} initial="initial" animate="animate">
      <header className="bg-background border-b border-border px-4 pb-3 flex items-center justify-between safe-header sticky top-0 z-30">
        <div className="flex items-center gap-1">
          <button onClick={() => { clearInterval(timerRef.current); navigate("/"); }} className="text-muted-foreground hover:text-foreground p-1 select-none">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <BookOpen className="w-4 h-4 text-primary select-none" />
          <span className="font-bold text-foreground text-sm">{unitName}</span>
        </div>
        <span className="text-sm font-medium text-muted-foreground select-none">
          {currentIndex + 1} / {words.length}
        </span>
      </header>

      <div className="h-1 bg-muted">
        <div className="h-full bg-primary transition-all duration-300" style={{ width: `${progress}%` }} />
      </div>

      <div className="flex-1 flex items-center justify-center px-4">
        <div className="bg-background rounded-2xl shadow-sm border border-border p-8 max-w-md w-full">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-muted-foreground select-none">{t("quiz.time")}</span>
            <span className={`text-xs font-bold select-none ${timeLeft <= 5 ? 'text-destructive' : 'text-muted-foreground'}`}>{timeLeft}s</span>
          </div>
          <div className="h-1.5 bg-muted rounded-full mb-8 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-1000 ${timeLeft <= 5 ? 'bg-destructive' : timeLeft <= 10 ? 'bg-amber-500' : 'bg-emerald-500'}`}
              style={{ width: `${timerPercent}%` }}
            />
          </div>

          <AnimatePresence>
            {lastResult && (
              <motion.div
                key={lastResult}
                initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className={`flex items-center justify-center gap-2 mb-4 py-2 rounded-lg text-sm font-semibold select-none ${lastResult === "correct" ? "bg-emerald-500/10 text-emerald-700" : "bg-destructive/10 text-destructive"}`}
              >
                {lastResult === "correct" ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                {lastResult === "correct" ? t("quiz.correct") : `${t("quiz.wrong")} ${words[currentIndex]?.english}`}
              </motion.div>
            )}
          </AnimatePresence>

          <div className="text-center mb-8 select-none">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">{t("quiz.uzbek_word")}</p>
            <p className="text-3xl font-bold text-foreground">{word.uzbek}</p>
            {word.russian && (
              <p className="text-sm text-muted-foreground mt-1 italic">{word.russian}</p>
            )}
          </div>

          <input
            ref={inputRef}
            type="text"
            value={answer}
            onChange={e => setAnswer(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") handleNext(false); }}
            placeholder={t("quiz.answer_placeholder")}
            autoComplete="off"
            className="w-full h-12 px-4 border-2 border-input rounded-xl text-base bg-background text-foreground focus:border-primary focus:outline-none transition-colors mb-4"
          />

          <Button onClick={() => handleNext(false)} className="w-full h-12 font-semibold gap-2 select-none">
            {t("quiz.next")}
            <ArrowRight className="w-4 h-4" />
          </Button>

          <div className="flex items-center justify-center gap-4 mt-4 text-sm select-none">
            <span className="text-emerald-600 font-semibold">✓ {correctCount}</span>
            <span className="text-muted-foreground">|</span>
            <span className="text-destructive font-semibold">✗ {currentIndex - correctCount}</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}