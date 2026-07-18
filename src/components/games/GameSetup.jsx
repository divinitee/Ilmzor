import React, { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Clock, Zap } from "lucide-react";

export const DIFFICULTIES = [
  { id: "beginner", label: "Beginner", emoji: "🌱", desc: "Oson, boshlang'ich", color: "from-emerald-500 to-teal-500" },
  { id: "intermediate", label: "Intermediate", emoji: "🚀", desc: "O'rta daraja", color: "from-sky-500 to-blue-500" },
  { id: "advanced", label: "Advanced", emoji: "🔥", desc: "Murakkab", color: "from-violet-500 to-purple-500" },
  { id: "proficient", label: "Proficient", emoji: "👑", desc: "Juda murakkab", color: "from-amber-500 to-orange-500" },
];

const TIME_OPTIONS = [15, 30, 45, 60, 90, 0]; // 0 = untimed

export default function GameSetup({ gameId, unitName, onStart, onCancel }) {
  const [difficulty, setDifficulty] = useState("beginner");
  const [timePerQ, setTimePerQ] = useState(30);
  const [autoAdvance, setAutoAdvance] = useState(true);

  const isQuiz = gameId === "quiz";

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <button onClick={onCancel} className="text-muted-foreground text-sm hover:text-foreground flex items-center gap-1 select-none">
          <ArrowLeft className="w-4 h-4" /> Bekor qilish
        </button>
        <span className="text-xs text-muted-foreground truncate ml-2">{unitName}</span>
      </div>

      <h2 className="text-lg font-bold text-foreground mb-1">O'yin sozlamalari</h2>
      <p className="text-sm text-muted-foreground mb-6">Qiyinlik darajasini tanlang va o'zingizga moslang.</p>

      {/* Difficulty */}
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Qiyinlik darajasi</p>
      <div className="grid grid-cols-2 gap-3 mb-6">
        {DIFFICULTIES.map((d, i) => {
          const active = difficulty === d.id;
          return (
            <motion.button
              key={d.id}
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              onClick={() => setDifficulty(d.id)}
              className={`relative p-4 rounded-2xl border-2 text-left select-none transition-all ${active ? "border-primary shadow-md bg-primary/5" : "border-border hover:border-primary/40"}`}
            >
              <div className="text-2xl mb-1">{d.emoji}</div>
              <p className="font-bold text-foreground text-sm">{d.label}</p>
              <p className="text-xs text-muted-foreground">{d.desc}</p>
              {active && <div className="absolute top-3 right-3 w-2.5 h-2.5 rounded-full bg-primary" />}
            </motion.button>
          );
        })}
      </div>

      {/* Quiz-specific: timing + auto-advance */}
      {isQuiz && (
        <>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" /> Har bir savolga vaqt
          </p>
          <div className="flex flex-wrap gap-2 mb-6">
            {TIME_OPTIONS.map(t => {
              const active = timePerQ === t;
              return (
                <button
                  key={t}
                  onClick={() => setTimePerQ(t)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium border-2 select-none transition-all ${active ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/40"}`}
                >
                  {t === 0 ? "∞ Cheksiz" : `${t}s`}
                </button>
              );
            })}
          </div>

          <div className="flex items-center justify-between bg-background border border-border rounded-2xl p-4 mb-6">
            <div className="pr-3">
              <p className="text-sm font-semibold text-foreground">Avtomatik keyingi savol</p>
              <p className="text-xs text-muted-foreground mt-0.5">O'chirib qo'ysangiz, javobni tahlil qilib, xatolarni ko'rishingiz mumkin</p>
            </div>
            <button
              onClick={() => setAutoAdvance(v => !v)}
              className={`relative w-12 h-7 rounded-full transition-colors select-none flex-shrink-0 ${autoAdvance ? "bg-primary" : "bg-muted-foreground/30"}`}
              aria-pressed={autoAdvance}
            >
              <motion.span
                animate={{ x: autoAdvance ? 22 : 2 }}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
                className="absolute top-0.5 left-0 w-6 h-6 bg-white rounded-full shadow"
              />
            </button>
          </div>
        </>
      )}

      <Button onClick={() => onStart({ difficulty, timePerQ, autoAdvance })} className="w-full h-12 text-base font-bold select-none">
        <Zap className="w-4 h-4 mr-1" /> Boshlash
      </Button>
    </div>
  );
}