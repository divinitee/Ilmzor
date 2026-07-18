import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RotateCcw, ChevronLeft, ChevronRight, Volume2 } from "lucide-react";
import { useTranslationLang } from "@/hooks/useTranslationLang";

export default function FlashCard({ words, unitName, onClose }) {
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [direction, setDirection] = useState(1);
  const { lang } = useTranslationLang();

  const word = words[index];

  const go = (dir) => {
    setDirection(dir);
    setFlipped(false);
    setTimeout(() => setIndex(i => Math.max(0, Math.min(words.length - 1, i + dir))), 100);
  };

  const speak = (text) => {
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "en-US";
    window.speechSynthesis.speak(u);
  };

  if (!word) return null;

  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-border">
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors text-sm font-medium">
          ✕ Yopish
        </button>
        <span className="text-sm font-semibold text-foreground">{unitName}</span>
        <span className="text-xs text-muted-foreground">{index + 1} / {words.length}</span>
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-muted">
        <div
          className="h-full bg-primary transition-all duration-300"
          style={{ width: `${((index + 1) / words.length) * 100}%` }}
        />
      </div>

      {/* Card area */}
      <div className="flex-1 flex flex-col items-center justify-center px-6">
        <p className="text-xs text-muted-foreground mb-6 uppercase tracking-widest font-semibold">
          {flipped ? "Tarjima" : "Ingliz tili"}
        </p>

        <div
          className="w-full max-w-sm cursor-pointer select-none"
          style={{ perspective: 1000 }}
          onClick={() => setFlipped(f => !f)}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={`${index}-${flipped}`}
              initial={{ rotateY: flipped ? -90 : 90, opacity: 0 }}
              animate={{ rotateY: 0, opacity: 1 }}
              exit={{ rotateY: flipped ? 90 : -90, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="bg-background border-2 border-border rounded-3xl shadow-xl p-8 text-center min-h-[200px] flex flex-col items-center justify-center gap-3"
            >
              {!flipped ? (
                <>
                  <p className="text-3xl font-bold text-foreground">{word.english}</p>
                  {word.pronunciation && (
                    <p className="text-sm text-muted-foreground">{word.pronunciation}</p>
                  )}
                  <button
                    onClick={e => { e.stopPropagation(); speak(word.english); }}
                    className="mt-2 p-2 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                  >
                    <Volume2 className="w-4 h-4" />
                  </button>
                </>
              ) : lang === "ru" ? (
                <p className="text-2xl font-bold text-foreground">{word.russian || "—"}</p>
              ) : (
                <>
                  <p className="text-2xl font-bold text-foreground">{word.uzbek}</p>
                  {lang === "both" && word.russian && (
                    <p className="text-lg text-muted-foreground">{word.russian}</p>
                  )}
                </>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        <p className="mt-5 text-xs text-muted-foreground">Kartani bosib aylantiring</p>

        {/* Navigation */}
        <div className="flex items-center gap-6 mt-8">
          <button
            onClick={() => go(-1)}
            disabled={index === 0}
            className="w-12 h-12 rounded-full bg-muted flex items-center justify-center text-foreground disabled:opacity-30 hover:bg-muted/70 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={() => { setFlipped(false); setIndex(0); }}
            className="w-10 h-10 rounded-full bg-muted/50 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <button
            onClick={() => go(1)}
            disabled={index === words.length - 1}
            className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-30 hover:bg-primary/90 transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}