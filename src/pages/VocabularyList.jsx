import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { BookOpen, ChevronDown, Search, LayoutGrid, Layers } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import FlashCard from "@/components/FlashCard";
import TranslationLangToggle from "@/components/TranslationLangToggle";
import { useTranslationLang } from "@/hooks/useTranslationLang";
import { useAppLang } from "@/hooks/useAppLang";
import { Link } from "react-router-dom";


export default function VocabularyList({ isActive = false }) {
  const [words, setWords] = useState([]);
  const [units, setUnits] = useState([]);
  const [selectedUnit, setSelectedUnit] = useState("");
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [openUnit, setOpenUnit] = useState(null);
  const [flashcardUnit, setFlashcardUnit] = useState(null);
  const { lang } = useTranslationLang();
  const { t } = useAppLang();

  useEffect(() => { loadWords(); }, []);

  const loadWords = async () => {
    try {
      const all = await base44.entities.VocabularyWord.list('unit_number', 2000);
      setWords(all);
      // Build ordered unit list
      const unitMap = {};
      all.forEach(w => {
        if (!unitMap[w.unit_key]) unitMap[w.unit_key] = { key: w.unit_key, name: w.unit_name, num: w.unit_number || 99 };
      });
      const unitList = Object.values(unitMap).sort((a, b) => a.num - b.num);
      setUnits(unitList);
      if (unitList.length > 0) setOpenUnit(unitList[0].key);
    } finally {
      setLoading(false);
    }
  };

  const filteredWords = (unitKey) => {
    const all = words
      .filter(w => w.unit_key === unitKey)
      .filter(w => {
        if (!search) return true;
        const s = search.toLowerCase();
        return w.english.toLowerCase().includes(s) || w.uzbek.toLowerCase().includes(s) || (w.russian || "").toLowerCase().includes(s);
      });
    // Trial: only first 5 words visible
    return isActive ? all : all.slice(0, 5);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="relative">
    <div className="relative z-10 max-w-lg mx-auto px-4 py-6">
      {flashcardUnit && (
        <FlashCard
          words={words.filter(w => w.unit_key === flashcardUnit.key)}
          unitName={flashcardUnit.name}
          onClose={() => setFlashcardUnit(null)}
        />
      )}
      <div className="flex items-center gap-2 mb-3">
        <BookOpen className="w-5 h-5 text-primary" />
        <h2 className="text-lg font-bold text-foreground">{t("vocab.title")}</h2>
        <span className="ml-auto text-xs bg-emerald-500/10 text-emerald-700 font-semibold px-2.5 py-1 rounded-full">{t("vocab.free_badge")}</span>
      </div>
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs text-muted-foreground font-medium">{t("vocab.translation_lang")}</span>
        <TranslationLangToggle compact />
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          placeholder={t("vocab.search_placeholder")}
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full h-10 pl-9 pr-4 border border-input rounded-xl text-sm bg-background text-foreground focus:border-primary focus:outline-none transition-colors"
        />
      </div>

      {/* Unit accordions */}
      <div className="space-y-3">
        {units.map((unit, idx) => {
          const unitWords = filteredWords(unit.key);
          const isOpen = openUnit === unit.key || !!search;
          const displayName = unit.name;
          return (
            <motion.div
              key={unit.key}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.04, duration: 0.3 }}
              className="bg-background rounded-2xl border border-border overflow-hidden"
            >
              <div className="flex items-center">
                <button
                  onClick={() => setOpenUnit(isOpen && !search ? null : unit.key)}
                  className="flex-1 flex items-center justify-between px-5 py-4 text-left select-none hover:bg-muted/30 transition-colors"
                >
                  <div>
                    <p className="font-semibold text-foreground text-sm">{displayName}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{t("vocab.words_count", { n: words.filter(w => w.unit_key === unit.key).length })}</p>
                  </div>
                  <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`} />
                </button>
                <button
                  onClick={() => setFlashcardUnit({ key: unit.key, name: displayName })}
                  className="px-3 py-4 text-primary hover:text-primary/70 transition-colors border-l border-border select-none"
                  title={t("vocab.flashcard_mode")}
                >
                  <Layers className="w-4 h-4" />
                </button>
              </div>

              <AnimatePresence>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="border-t border-border">
                      {/* Header row */}
                      <div className={`px-4 py-2 bg-muted/30 text-xs font-semibold text-muted-foreground uppercase tracking-wider ${lang === "both" ? "grid grid-cols-3" : "grid grid-cols-2"}`}>
                        <span>{t("vocab.english")}</span>
                        {(lang === "both" || lang === "uz") && <span>{t("vocab.uzbek")}</span>}
                        {(lang === "both" || lang === "ru") && <span>{t("vocab.russian")}</span>}
                      </div>
                      {unitWords.length === 0 ? (
                        <p className="px-4 py-3 text-sm text-muted-foreground">{t("vocab.no_words")}</p>
                      ) : (
                        unitWords.map((w, i) => (
                          <div
                            key={w.id || i}
                            className={`px-4 py-3 gap-2 text-sm ${lang === "both" ? "grid grid-cols-3" : "grid grid-cols-2"} ${i % 2 === 0 ? "" : "bg-muted/20"} border-b border-border last:border-0`}
                          >
                            <div>
                              <p className="font-semibold text-foreground">{w.english}</p>
                              {w.pronunciation && <p className="text-xs text-muted-foreground mt-0.5">{w.pronunciation}</p>}
                            </div>
                            {(lang === "both" || lang === "uz") && <p className="text-foreground">{w.uzbek}</p>}
                            {(lang === "both" || lang === "ru") && <p className="text-muted-foreground">{w.russian || "—"}</p>}
                          </div>
                        ))
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>

      {!isActive && (
        <div className="mt-6 bg-gradient-to-br from-indigo-500/10 to-violet-500/10 border border-indigo-300 dark:border-indigo-700 rounded-2xl p-5 text-center">
          <p className="text-sm font-bold text-foreground mb-1">{t("vocab.trial_title")}</p>
          <p className="text-xs text-muted-foreground mb-4">{t("vocab.trial_desc")}</p>
          <Link to="/pricing">
            <button className="bg-primary text-primary-foreground text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-primary/90 transition-colors select-none">
              {t("vocab.view_plans")}
            </button>
          </Link>
        </div>
      )}

      <footer className="mt-8 text-center text-xs text-muted-foreground pb-4">
        {t("vocab.footer_created")} <strong className="text-foreground">Salohiddin Nurullaev & Temur Normatov</strong>
      </footer>
    </div>
    </div>
  );
}