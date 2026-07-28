import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Volume2, ArrowLeft, RefreshCw, Eraser, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppLang } from "@/hooks/useAppLang";

const DIFF_CONFIG = {
  beginner:     { rounds: 6, minLen: 3, maxLen: 6, showMeaning: true },
  intermediate: { rounds: 8, minLen: 4, maxLen: 8, showMeaning: true },
  advanced:      { rounds: 10, minLen: 5, maxLen: 12, showMeaning: false },
  proficient:    { rounds: 12, minLen: 6, maxLen: 14, showMeaning: false },
};

function shuffle(arr) { return [...arr].sort(() => Math.random() - 0.5); }

export default function SpellingGame({ words, unitName, onBack, onCoinsEarned, onGameComplete, difficulty = "intermediate" }) {
  const { t } = useAppLang();
  const cfg = DIFF_CONFIG[difficulty] || DIFF_CONFIG.intermediate;

  const eligible = useMemo(
    () => words.filter(w => {
      const len = (w.english || "").replace(/[^a-zA-Z]/g, "").length;
      return len >= cfg.minLen && len <= cfg.maxLen;
    }),
    [words, cfg]
  );

  const [round, setRound] = useState([]);
  const [idx, setIdx] = useState(0);
  const [letters, setLetters] = useState([]); // {char, used}
  const [placed, setPlaced] = useState([]); // chars chosen in order
  const [status, setStatus] = useState(null); // "correct" | "wrong" | null
  const [scores, setScores] = useState([]);
  const [done, setDone] = useState(false);
  const [coinAnim, setCoinAnim] = useState(null);

  const buildRound = () => {
    const pool = eligible.length > 0 ? eligible : words;
    const picked = shuffle(pool).slice(0, cfg.rounds);
    setRound(picked);
    setIdx(0);
    setScores([]);
    setDone(false);
    loadWord(picked[0], 0);
  };

  useEffect(() => { buildRound(); /* eslint-disable-next-line */ }, [words, difficulty]);

  const speak = (text) => {
    try {
      const u = new SpeechSynthesisUtterance(text);
      u.lang = "en-US";
      u.rate = 0.9;
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(u);
    } catch { /* ignore */ }
  };

  const loadWord = (word, i) => {
    if (!word) { setDone(true); return; }
    const clean = (word.english || "").replace(/[^a-zA-Z]/g, "").toLowerCase();
    const scram = shuffle(clean.split("")).map(c => ({ char: c, used: false }));
    setLetters(scram);
    setPlaced([]);
    setStatus(null);
    setTimeout(() => speak(clean), 250);
  };

  const currentWord = round[idx];
  const cleanTarget = (currentWord?.english || "").replace(/[^a-zA-Z]/g, "").toLowerCase();

  const pickLetter = (li) => {
    if (status) return;
    if (letters[li].used) return;
    const next = [...placed, letters[li].char];
    setPlaced(next);
    setLetters(ls => ls.map((l, j) => j === li ? { ...l, used: true } : l));
    if (next.length === cleanTarget.length) {
      check(next.join(""));
    }
  };

  const removeLast = () => {
    if (status || placed.length === 0) return;
    const last = placed[placed.length - 1];
    // free a matching unused letter (first match from end)
    let freed = false;
    setLetters(ls => ls.map((l) => {
      if (!freed && l.used && l.char === last) { freed = true; return { ...l, used: false }; }
      return l;
    }));
    setPlaced(p => p.slice(0, -1));
  };

  const check = (attempt) => {
    const ok = attempt === cleanTarget;
    setStatus(ok ? "correct" : "wrong");
    setScores(s => [...s, ok ? 1 : 0]);
    if (ok) {
      setCoinAnim("+1 🪙");
      setTimeout(() => setCoinAnim(null), 900);
    }
    setTimeout(next, ok ? 1100 : 1600);
  };

  const next = () => {
    if (idx + 1 >= round.length) { setDone(true); return; }
    setIdx(i => i + 1);
    loadWord(round[idx + 1], idx + 1);
  };

  // award coins once on completion
  useEffect(() => {
    if (!done || scores.length === 0) return;
    const correctCount = scores.filter(Boolean).length;
    const pct = scores.length ? Math.round((correctCount / scores.length) * 100) : 0;
    if (onCoinsEarned) onCoinsEarned(correctCount, correctCount);
    if (onGameComplete) onGameComplete({ scorePct: pct, correct: correctCount, total: scores.length });
  }, [done]); /* eslint-disable-next-line */

  useEffect(() => () => { try { window.speechSynthesis.cancel(); } catch { /* */ } }, []);

  if (done) {
    const correctCount = scores.filter(Boolean).length;
    return (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-sm mx-auto px-4 py-10 text-center">
        <div className="text-6xl mb-4">{correctCount / round.length >= 0.7 ? "🏆" : "📚"}</div>
        <h2 className="text-2xl font-bold text-foreground mb-2">{t("gameui.spelling_done")}</h2>
        <p className="text-muted-foreground text-sm mb-1">{unitName}</p>
        <p className="text-xs text-muted-foreground mb-4 capitalize">{t("gameui.level_label", { level: difficulty })}</p>
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.2 }}
          className="bg-amber-500/10 border border-amber-400/30 rounded-2xl p-4 mb-4 flex items-center justify-center gap-3">
          <span className="text-3xl">🪙</span>
          <div>
            <p className="text-2xl font-bold text-amber-600">+{correctCount}</p>
            <p className="text-xs text-muted-foreground">{t("gameui.coins_added")}</p>
          </div>
        </motion.div>
        <div className="bg-primary/10 rounded-2xl p-5 mb-5">
          <p className="text-3xl font-bold text-primary">{correctCount} / {round.length}</p>
          <p className="text-sm text-muted-foreground mt-1">{t("gameui.spelling_correct_words")}</p>
        </div>
        <Button onClick={buildRound} className="w-full mb-2">{t("gameui.retry")}</Button>
        <Button variant="outline" onClick={onBack} className="w-full">{t("gameui.back")}</Button>
      </motion.div>
    );
  }

  if (round.length === 0 || !currentWord) {
    return <div className="flex items-center justify-center py-20"><div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" /></div>;
  }

  return (
    <div className="max-w-sm mx-auto px-4 py-6 relative">
      <AnimatePresence>
        {coinAnim && (
          <motion.div initial={{ opacity: 1, y: 0, scale: 1 }} animate={{ opacity: 0, y: -60, scale: 1.4 }}
            className="absolute top-12 left-1/2 -translate-x-1/2 z-50 text-xl font-bold text-amber-500 pointer-events-none">
            {coinAnim}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-center justify-between mb-4">
        <button onClick={onBack} className="text-muted-foreground text-sm hover:text-foreground select-none flex items-center gap-1">
          <ArrowLeft className="w-4 h-4" /> {t("gameui.back")}
        </button>
        <span className="text-xs text-muted-foreground font-medium">{idx + 1} / {round.length}</span>
        <button onClick={() => speak(cleanTarget)} className="text-primary hover:text-primary/70 select-none flex items-center gap-1 text-sm font-semibold">
          <Volume2 className="w-4 h-4" /> {t("gameui.spelling_audio")}
        </button>
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={idx} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.2 }}>
          {/* Prompt */}
          <div className="bg-background border border-border rounded-2xl p-5 mb-5 text-center">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2 font-semibold">{t("gameui.spelling_listen_write")}</p>
            <button onClick={() => speak(cleanTarget)} className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-violet-600 flex items-center justify-center mx-auto shadow-lg active:scale-95 transition-transform select-none">
              <Volume2 className="w-7 h-7 text-white" />
            </button>
            {cfg.showMeaning && currentWord.uzbek && (
              <p className="text-base font-semibold text-foreground mt-3">{currentWord.uzbek}</p>
            )}
          </div>

          {/* Slots */}
          <div className="flex flex-wrap justify-center gap-2 mb-5">
            {cleanTarget.split("").map((_, i) => {
              const ch = placed[i];
              let cls = "w-9 h-11 rounded-xl border-2 flex items-center justify-center text-lg font-bold transition-colors";
              if (status === "correct") cls += " border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300";
              else if (status === "wrong" && i < placed.length) cls += " border-destructive bg-destructive/10 text-destructive";
              else if (ch) cls += " border-primary bg-primary/10 text-foreground";
              else cls += " border-border bg-background text-muted-foreground";
              return <div key={i} className={cls}>{ch || ""}</div>;
            })}
          </div>

          {/* Status */}
          {status && (
            <div className={`text-center text-sm font-semibold mb-4 ${status === "correct" ? "text-emerald-600" : "text-destructive"}`}>
              {status === "correct" ? t("gameui.spelling_correct") : t("gameui.spelling_wrong", { word: currentWord.english })}
            </div>
          )}

          {/* Letter grid */}
          <div className="grid grid-cols-5 gap-2 mb-4">
            {letters.map((l, i) => (
              <button
                key={i}
                onClick={() => pickLetter(i)}
                disabled={l.used || !!status}
                className={`h-12 rounded-xl text-lg font-bold border-2 select-none transition-all ${
                  l.used ? "border-border bg-muted/30 text-transparent" : "border-border bg-background text-foreground hover:border-primary/50 active:scale-95"
                }`}
              >
                {l.char.toUpperCase()}
              </button>
            ))}
          </div>

          {/* Controls */}
          <div className="flex gap-2">
            <Button variant="outline" onClick={removeLast} disabled={!!status || placed.length === 0} className="flex-1 select-none">
              <Eraser className="w-4 h-4 mr-1" /> {t("gameui.spelling_erase")}
            </Button>
            <Button variant="outline" onClick={() => speak(cleanTarget)} className="flex-1 select-none">
              <RefreshCw className="w-4 h-4 mr-1" /> {t("gameui.spelling_replay")}
            </Button>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}