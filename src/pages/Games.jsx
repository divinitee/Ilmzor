import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Gamepad2, Zap, MessageSquare, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";
import VocabQuizGame from "@/components/games/VocabQuizGame";
import SentenceBuilderGame from "@/components/games/SentenceBuilderGame";
import UnitDrawer from "@/components/UnitDrawer";

export default function Games() {
  const [words, setWords] = useState([]);
  const [units, setUnits] = useState([]);
  const [selectedUnit, setSelectedUnit] = useState(null);
  const [unitDrawerOpen, setUnitDrawerOpen] = useState(false);
  const [activeGame, setActiveGame] = useState(null); // "quiz" | "sentence"
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.entities.VocabularyWord.list().then(all => {
      setWords(all);
      const unitMap = {};
      all.forEach(w => {
        if (!unitMap[w.unit_key]) unitMap[w.unit_key] = { key: w.unit_key, name: w.unit_name, num: w.unit_number || 99 };
      });
      const unitList = Object.values(unitMap).sort((a, b) => a.num - b.num);
      setUnits(unitList);
      if (unitList.length > 0) setSelectedUnit(unitList[0]);
    }).finally(() => setLoading(false));
  }, []);

  const unitWords = words.filter(w => selectedUnit && w.unit_key === selectedUnit.key);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (activeGame === "quiz") {
    return (
      <VocabQuizGame
        words={unitWords}
        unitName={selectedUnit?.name || ""}
        onBack={() => setActiveGame(null)}
      />
    );
  }

  if (activeGame === "sentence") {
    return (
      <SentenceBuilderGame
        words={words}
        onBack={() => setActiveGame(null)}
      />
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-6 relative z-10">
      <div className="flex items-center gap-2 mb-6">
        <Gamepad2 className="w-5 h-5 text-primary" />
        <h2 className="text-lg font-bold text-foreground">O'yinlar</h2>
      </div>

      {/* Unit selector */}
      <div className="mb-6">
        <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-2">Aktiv Unit</p>
        <button
          onClick={() => setUnitDrawerOpen(true)}
          className="w-full flex items-center justify-between px-4 py-3 bg-background border border-border rounded-xl hover:border-primary transition-colors select-none"
        >
          <span className="text-sm font-medium text-foreground">{selectedUnit?.name || "Unit tanlang"}</span>
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>

      {/* Game cards */}
      <div className="space-y-4">
        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
          onClick={() => setActiveGame("quiz")}
          className="bg-gradient-to-br from-indigo-500/10 to-violet-500/10 border border-indigo-200 dark:border-indigo-800 rounded-2xl p-5 cursor-pointer hover:shadow-md transition-shadow select-none"
        >
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-indigo-500/20 flex items-center justify-center flex-shrink-0">
              <Zap className="w-6 h-6 text-indigo-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-foreground mb-1">Vokabulyar Quiz</h3>
              <p className="text-sm text-muted-foreground">Ko'p tanlovli savollar, tarjima va so'zni inglizcha izohlash (AI baholash bilan)</p>
              <div className="flex gap-2 mt-3">
                <span className="text-xs bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 px-2 py-0.5 rounded-full font-medium">10 savol</span>
                <span className="text-xs bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 px-2 py-0.5 rounded-full font-medium">20s / savol</span>
                <span className="text-xs bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 px-2 py-0.5 rounded-full font-medium">AI baholash</span>
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          onClick={() => setActiveGame("sentence")}
          className="bg-gradient-to-br from-violet-500/10 to-pink-500/10 border border-violet-200 dark:border-violet-800 rounded-2xl p-5 cursor-pointer hover:shadow-md transition-shadow select-none"
        >
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-violet-500/20 flex items-center justify-center flex-shrink-0">
              <MessageSquare className="w-6 h-6 text-violet-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-foreground mb-1">Jumla Yasash</h3>
              <p className="text-sm text-muted-foreground">O'xshash ma'noli so'zlardan foydalanib jumla tuzing. AI grammatika va ijodkorlikni baholaydi.</p>
              <div className="flex gap-2 mt-3">
                <span className="text-xs bg-violet-500/10 text-violet-700 dark:text-violet-400 px-2 py-0.5 rounded-full font-medium">Barcha unitlar</span>
                <span className="text-xs bg-violet-500/10 text-violet-700 dark:text-violet-400 px-2 py-0.5 rounded-full font-medium">AI tekshiruv</span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      <UnitDrawer
        open={unitDrawerOpen}
        onClose={() => setUnitDrawerOpen(false)}
        units={units}
        selectedUnit={selectedUnit?.key}
        onSelect={(key) => setSelectedUnit(units.find(u => u.key === key))}
      />
    </div>
  );
}