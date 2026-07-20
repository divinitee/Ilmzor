import React from "react";
import { motion } from "framer-motion";
import { BookOpen } from "lucide-react";

const LETTERS = ["V", "o", "c", "a", "b"];

export default function AppLoader() {
  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-indigo-50 via-background to-violet-50 dark:from-slate-950 dark:via-background dark:to-indigo-950 overflow-hidden">
      {/* Soft animated aura */}
      <motion.div
        aria-hidden
        className="absolute w-72 h-72 rounded-full bg-primary/20 blur-3xl"
        animate={{ scale: [1, 1.2, 1], opacity: [0.4, 0.7, 0.4] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        aria-hidden
        className="absolute w-56 h-56 rounded-full bg-violet-400/20 blur-3xl"
        animate={{ scale: [1.1, 0.9, 1.1], opacity: [0.3, 0.6, 0.3] }}
        transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
      />

      <div className="relative flex flex-col items-center">
        {/* Bouncing book badge */}
        <motion.div
          initial={{ scale: 0.6, opacity: 0, rotate: -8 }}
          animate={{ scale: 1, opacity: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 260, damping: 18 }}
          className="w-20 h-20 rounded-3xl bg-gradient-to-br from-primary to-violet-600 flex items-center justify-center shadow-lg mb-6"
        >
          <motion.div
            animate={{ y: [0, -8, 0], rotate: [0, 6, -6, 0] }}
            transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
          >
            <BookOpen className="w-9 h-9 text-white" />
          </motion.div>
        </motion.div>

        {/* Animated word */}
        <div className="flex items-center gap-0.5 mb-5">
          {LETTERS.map((l, i) => (
            <motion.span
              key={i}
              className="text-2xl font-bold text-foreground font-display"
              animate={{ y: [0, -6, 0], opacity: [0.7, 1, 0.7] }}
              transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut", delay: i * 0.1 }}
            >
              {l}
            </motion.span>
          ))}
        </div>

        {/* Three-dot pulse */}
        <div className="flex items-center gap-1.5">
          {[0, 1, 2].map(i => (
            <motion.span
              key={i}
              className="w-2 h-2 rounded-full bg-primary"
              animate={{ scale: [0.7, 1.2, 0.7], opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 1, repeat: Infinity, ease: "easeInOut", delay: i * 0.15 }}
            />
          ))}
        </div>

        <motion.p
          className="text-xs text-muted-foreground mt-5 font-medium"
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
        >
          Yuklanmoqda...
        </motion.p>
      </div>

      <p className="absolute bottom-6 text-[11px] text-muted-foreground/70">
        VocabularyMaster · A2 · B1 · B2
      </p>
    </div>
  );
}