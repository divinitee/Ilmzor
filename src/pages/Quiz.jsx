import React, { useState, useEffect, useRef, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { BookOpen, CheckCircle, XCircle, ArrowRight, Trophy } from "lucide-react";

export default function Quiz() {
  const { unitKey } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [words, setWords] = useState([]);
  const [unitName, setUnitName] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [correctCount, setCorrectCount] = useState(0);
  const [timeLeft, setTimeLeft] = useState(30);
  const [phase, setPhase] = useState("loading"); // loading, quiz, result
  const [lastResult, setLastResult] = useState(null); // "correct" | "wrong" | null
  const timerRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    loadQuiz();
    return () => clearInterval(timerRef.current);
  }, []);

  const loadQuiz = async () => {
    const me = await base44.auth.me();
    setUser(me);
    const allWords = await base44.entities.VocabularyWord.filter({ unit_key: unitKey });
    if (allWords.length > 0) setUnitName(allWords[0].unit_name);
    const shuffled = [...allWords].sort(() => 0.5 - Math.random());
    setWords(shuffled.slice(0, Math.min(30, shuffled.length)));
    setPhase("quiz");
  };

  const startTimer = useCallback(() => {
    clearInterval(timerRef.current);
    setTimeLeft(30);
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          return 0;
        }
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
    if (timeLeft === 0 && phase === "quiz") {
      handleNext(true);
    }
  }, [timeLeft, phase]);

  const handleNext = async (timeout = false) => {
    clearInterval(timerRef.current);

    if (!timeout) {
      const correct = answer.trim().toLowerCase() === words[currentIndex].english.toLowerCase();
      if (correct) {
        setCorrectCount(prev => prev + 1);
        setLastResult("correct");
      } else {
        setLastResult("wrong");
      }
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
      student_name: user.full_name || user.email,
      student_phone: user.email,
      unit_name: unitName,
      score: finalScore,
      total_questions: words.length,
      date: dateStr
    });
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") handleNext(false);
  };

  if (phase === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-slate-100">
        <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (phase === "result") {
    const finalCorrect = correctCount;
    const percentage = words.length > 0 ? Math.round((finalCorrect / words.length) * 100) : 0;
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-slate-100 flex flex-col">
        <header className="bg-white border-b border-slate-100 px-4 py-3 flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-indigo-600" />
          <span className="font-bold text-slate-800">Destination B1 Quiz</span>
        </header>
        <div className="flex-1 flex items-center justify-center px-4">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 max-w-md w-full text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
              <Trophy className="w-8 h-8 text-emerald-600" />
            </div>
            <h2 className="text-xl font-bold text-slate-800 mb-2">Test Yakunlandi!</h2>
            <p className="text-slate-500 text-sm mb-6">{unitName}</p>
            <div className="bg-gradient-to-r from-indigo-50 to-emerald-50 rounded-xl p-6 mb-6">
              <p className="text-4xl font-bold text-indigo-700">{finalCorrect}<span className="text-slate-400 text-lg"> / {words.length}</span></p>
              <p className="text-sm text-slate-500 mt-1">{percentage}% to'g'ri</p>
            </div>
            <Button onClick={() => navigate("/")} className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 font-semibold">
              Dashboardga qaytish
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const word = words[currentIndex];
  const progress = ((currentIndex) / words.length) * 100;
  const timerPercent = (timeLeft / 30) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-slate-100 flex flex-col">
      <header className="bg-white border-b border-slate-100 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-indigo-600" />
          <span className="font-bold text-slate-800 text-sm">{unitName}</span>
        </div>
        <span className="text-sm font-medium text-slate-500">
          {currentIndex + 1} / {words.length}
        </span>
      </header>

      {/* Progress bar */}
      <div className="h-1 bg-slate-200">
        <div className="h-full bg-indigo-600 transition-all duration-300" style={{ width: `${progress}%` }} />
      </div>

      <div className="flex-1 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 max-w-md w-full">
          {/* Timer */}
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-400">Vaqt</span>
            <span className={`text-xs font-bold ${timeLeft <= 5 ? 'text-red-500' : 'text-slate-500'}`}>{timeLeft}s</span>
          </div>
          <div className="h-1.5 bg-slate-100 rounded-full mb-8 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-1000 ${timeLeft <= 5 ? 'bg-red-500' : timeLeft <= 10 ? 'bg-amber-500' : 'bg-emerald-500'}`}
              style={{ width: `${timerPercent}%` }}
            />
          </div>

          {/* Feedback flash */}
          {lastResult && (
            <div className={`flex items-center justify-center gap-2 mb-4 py-2 rounded-lg text-sm font-semibold ${lastResult === "correct" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"}`}>
              {lastResult === "correct" ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
              {lastResult === "correct" ? "To'g'ri!" : `Noto'g'ri. Javob: ${words[currentIndex]?.english}`}
            </div>
          )}

          {/* Word display */}
          <div className="text-center mb-8">
            <p className="text-xs text-slate-400 uppercase tracking-wider mb-2">O'zbekcha so'z</p>
            <p className="text-3xl font-bold text-slate-800">{word.uzbek}</p>
          </div>

          {/* Input */}
          <input
            ref={inputRef}
            type="text"
            value={answer}
            onChange={e => setAnswer(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Inglizcha javobni yozing..."
            autoComplete="off"
            className="w-full h-12 px-4 border-2 border-slate-200 rounded-xl text-base focus:border-indigo-500 focus:outline-none transition-colors mb-4"
          />

          <Button onClick={() => handleNext(false)} className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 font-semibold gap-2">
            Keyingisi
            <ArrowRight className="w-4 h-4" />
          </Button>

          <div className="flex items-center justify-center gap-4 mt-4 text-sm">
            <span className="text-emerald-600 font-semibold">✓ {correctCount}</span>
            <span className="text-slate-300">|</span>
            <span className="text-red-400 font-semibold">✗ {currentIndex - correctCount}</span>
          </div>
        </div>
      </div>
    </div>
  );
}