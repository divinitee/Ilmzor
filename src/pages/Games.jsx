import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Gamepad2, Zap, MessageSquare, ChevronRight, Lock, Info } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useSearchParams } from "react-router-dom";
import VocabQuizGame from "@/components/games/VocabQuizGame";
import SentenceBuilderGame from "@/components/games/SentenceBuilderGame";
import SpellingGame from "@/components/games/SpellingGame";
import WordFormsGame from "@/components/games/WordFormsGame";
import CrosswordGame from "@/components/games/CrosswordGame";
import DefinitionGame from "@/components/games/DefinitionGame";
import UnitDrawer from "@/components/UnitDrawer";
import RoomLeaderboard from "@/components/games/RoomLeaderboard";
import GameSetup from "@/components/games/GameSetup";
import ProgressOverview from "@/components/games/ProgressOverview";
import InstructionsContent from "@/components/games/InstructionsContent";
import GameInstructionsSheet from "@/components/games/GameInstructionsSheet";
import { recordGameResult, getGameStats, GAME_SKILL_MAP } from "@/lib/gameSkills";
import { useAppLang } from "@/hooks/useAppLang";

const TRIAL_KEY = "vocab_trial_rounds";
const MAX_TRIAL_ROUNDS = 5;

const GAME_CARDS = [
  {
    id: "quiz",
    title: "Vokabulyar Quiz",
    desc: "Ko'p tanlovli savollar, tarjima va AI baholash",
    emoji: "⚡",
    gradient: "from-indigo-500 to-violet-600",
    lightBg: "from-indigo-500/10 to-violet-500/10",
    border: "border-indigo-200 dark:border-indigo-800",
    tags: ["30 savol", "30s / savol", "AI baholash"],
    tagColor: "bg-indigo-500/10 text-indigo-700 dark:text-indigo-400",
    img: "https://images.unsplash.com/photo-1606326608606-aa0b62935f2b?w=300&q=80",
  },
  {
    id: "sentence",
    title: "Jumla Yasash",
    desc: "So'zlardan jumla tuzing, AI grammatika va ijodkorlikni baholaydi",
    emoji: "💬",
    gradient: "from-violet-500 to-pink-600",
    lightBg: "from-violet-500/10 to-pink-500/10",
    border: "border-violet-200 dark:border-violet-800",
    tags: ["Barcha unitlar", "AI tekshiruv"],
    tagColor: "bg-violet-500/10 text-violet-700 dark:text-violet-400",
    img: "https://images.unsplash.com/photo-1455390582262-044cdead277a?w=300&q=80",
  },
  {
    id: "spelling",
    title: "To'g'ri Yozish",
    desc: "So'z ovozini eshiting yoki ma'nosini ko'rib, harflardan so'zni to'g'ri yiging",
    emoji: "🔤",
    gradient: "from-amber-500 to-orange-600",
    lightBg: "from-amber-500/10 to-orange-500/10",
    border: "border-amber-300 dark:border-amber-700",
    tags: ["Audio", "Harflardan yig'ing"],
    tagColor: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
    img: "https://images.unsplash.com/photo-1517842645767-c63904cac77f?w=300&q=80",
  },
  {
    id: "wordforms",
    title: "So'z Shakllari",
    desc: "Berilgan so'zning turli grammatik shakllarini (Fe'l, Ot, Sifat, Ravish) to'g'ri toping",
    emoji: "🧩",
    gradient: "from-teal-500 to-emerald-600",
    lightBg: "from-teal-500/10 to-emerald-500/10",
    border: "border-teal-300 dark:border-teal-700",
    tags: ["Grammatika", "AI tekshiruv"],
    tagColor: "bg-teal-500/10 text-teal-700 dark:text-teal-400",
    img: "https://images.unsplash.com/photo-1543002588-bfa74002ed7e?w=300&q=80",
  },
  {
    id: "crossword",
    title: "Krossvord",
    desc: "Lug'at boyligingizni sinab ko'ring va krossvord katakchalarini to'ldiring",
    emoji: "🟦",
    gradient: "from-sky-500 to-blue-600",
    lightBg: "from-sky-500/10 to-blue-500/10",
    border: "border-sky-300 dark:border-sky-700",
    tags: ["Interaktiv", "Yonama/Pastga"],
    tagColor: "bg-sky-500/10 text-sky-700 dark:text-sky-400",
    img: "https://images.unsplash.com/photo-1606857521015-1f7b76870e9f?w=300&q=80",
  },
  {
    id: "definition",
    title: "So'z Ta'rifi",
    desc: "So'z ta'rifini o'qing va o'z so'zlaringiz bilan qayta yozing, AI 1–5 tanga baholaydi",
    emoji: "📖",
    gradient: "from-rose-500 to-pink-600",
    lightBg: "from-rose-500/10 to-pink-500/10",
    border: "border-rose-200 dark:border-rose-800",
    tags: ["AI baholash", "1–5 tanga"],
    tagColor: "bg-rose-500/10 text-rose-700 dark:text-rose-400",
    img: "https://images.unsplash.com/photo-1524995997946-a1c2e2d4d3e8?w=300&q=80",
  },
];

export default function Games({ isActive = false, user = null }) {
  const { t, lang, translations } = useAppLang();
  const [words, setWords] = useState([]);
  const [units, setUnits] = useState([]);
  const [selectedUnit, setSelectedUnit] = useState(null);
  const [unitDrawerOpen, setUnitDrawerOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [trialRounds, setTrialRounds] = useState(() => parseInt(localStorage.getItem(TRIAL_KEY) || "0", 10));
  const [userCoins, setUserCoins] = useState(null);
  const [infoGame, setInfoGame] = useState(null);
  const trialExhausted = !isActive && trialRounds >= MAX_TRIAL_ROUNDS;

  // Routing via search params: ?game=<id> (setup) or ?game=<id>&play=1&difficulty=... (playing)
  const [searchParams, setSearchParams] = useSearchParams();
  const gameParam = searchParams.get("game");
  const isPlaying = searchParams.get("play") === "1";
  const setupGame = gameParam && !isPlaying ? gameParam : null;
  const activeGame = gameParam && isPlaying ? gameParam : null;
  const config = {
    difficulty: searchParams.get("difficulty") || "intermediate",
    timePerQ: searchParams.get("timePerQ") ? Number(searchParams.get("timePerQ")) : 30,
    autoAdvance: searchParams.get("autoAdvance") !== "0",
  };

  const mergeParams = (updates, options) => {
    const next = new URLSearchParams(searchParams);
    for (const [k, v] of Object.entries(updates)) {
      if (v === null || v === undefined || v === "") next.delete(k);
      else next.set(k, String(v));
    }
    setSearchParams(next, options);
  };
  const clearGameParams = (options) => mergeParams({ game: null, play: null, difficulty: null, timePerQ: null, autoAdvance: null }, options);

  useEffect(() => {
    base44.entities.VocabularyWord.list('unit_number', 2000).then(all => {
      setWords(all);
      const unitMap = {};
      all.forEach(w => {
        if (!unitMap[w.unit_key]) unitMap[w.unit_key] = { key: w.unit_key, name: w.unit_name, num: w.unit_number ?? 99 };
      });
      const unitList = Object.values(unitMap).sort((a, b) => a.num - b.num);
      setUnits(unitList);
      if (unitList.length > 0) setSelectedUnit(unitList[0]);
    }).finally(() => setLoading(false));
  }, []);

  // Load user coins
  useEffect(() => {
    if (!user) return;
    base44.entities.UserCoins.filter({ user_id: user.id }).then(res => {
      if (res.length > 0) setUserCoins(res[0]);
    });
  }, [user]);

  const unitWords = words.filter(w => selectedUnit && w.unit_key === selectedUnit.key);

  const openSetup = (game) => mergeParams({ game, play: null });

  const handleSetupStart = (cfg) => {
    if (!isActive) {
      const next = trialRounds + 1;
      localStorage.setItem(TRIAL_KEY, String(next));
      setTrialRounds(next);
    }
    mergeParams({ game: gameParam, play: "1", difficulty: cfg.difficulty, timePerQ: cfg.timePerQ, autoAdvance: cfg.autoAdvance ? "1" : "0" }, { replace: true });
  };

  const handleBack = () => clearGameParams({ replace: true });

  const handleCoinsEarned = async (earned, correctCount) => {
    if (!user || earned === 0) return;
    try {
      if (userCoins) {
        const updated = await base44.entities.UserCoins.update(userCoins.id, {
          coins: (userCoins.coins || 0) + earned,
          total_correct: (userCoins.total_correct || 0) + correctCount,
          user_name: user.full_name || user.email,
        });
        setUserCoins(updated);
      } else {
        const created = await base44.entities.UserCoins.create({
          user_id: user.id,
          user_name: user.full_name || user.email,
          email: user.email,
          classroom_code: user.classroom_code || "",
          coins: earned,
          total_correct: correctCount,
        });
        setUserCoins(created);
      }
    } catch (e) { console.error(e); }
  };

  const handleGameComplete = (result) => {
    const gameId = activeGame;
    if (!gameId) return;
    const pct = Math.max(0, Math.min(100, Math.round(result?.scorePct ?? 0)));
    recordGameResult(gameId, pct);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (setupGame) {
    return (
      <div className="max-w-lg mx-auto px-4 py-6">
        <InstructionsContent gameId={setupGame} />
        <GameSetup
          gameId={setupGame}
          unitName={selectedUnit?.name || ""}
          onStart={handleSetupStart}
          onCancel={() => clearGameParams({ replace: true })}
        />
      </div>
    );
  }

  if (activeGame === "quiz") {
    return (
      <VocabQuizGame
        words={unitWords}
        unitName={selectedUnit?.name || ""}
        onBack={handleBack}
        user={user}
        onCoinsEarned={handleCoinsEarned}
        difficulty={config?.difficulty || "intermediate"}
        timePerQ={config?.timePerQ ?? 30}
        autoAdvance={config?.autoAdvance ?? true}
        onGameComplete={handleGameComplete}
      />
    );
  }

  if (activeGame === "sentence") {
    return (
      <SentenceBuilderGame
        words={words}
        onBack={handleBack}
        difficulty={config?.difficulty || "beginner"}
        trialExhausted={!isActive && trialRounds >= MAX_TRIAL_ROUNDS}
        onNewRound={() => {
          if (!isActive) {
            const next = trialRounds + 1;
            localStorage.setItem(TRIAL_KEY, String(next));
            setTrialRounds(next);
          }
        }}
        onGameComplete={handleGameComplete}
      />
    );
  }

  if (activeGame === "spelling") {
    return (
      <SpellingGame
        words={unitWords}
        unitName={selectedUnit?.name || ""}
        onBack={handleBack}
        onCoinsEarned={handleCoinsEarned}
        onGameComplete={handleGameComplete}
        difficulty={config?.difficulty || "intermediate"}
      />
    );
  }

  if (activeGame === "wordforms") {
    return (
      <WordFormsGame
        words={unitWords}
        unitName={selectedUnit?.name || ""}
        onBack={handleBack}
        onCoinsEarned={handleCoinsEarned}
        onGameComplete={handleGameComplete}
        difficulty={config?.difficulty || "intermediate"}
      />
    );
  }

  if (activeGame === "crossword") {
    return (
      <CrosswordGame
        words={unitWords}
        unitName={selectedUnit?.name || ""}
        onBack={handleBack}
        onCoinsEarned={handleCoinsEarned}
        onGameComplete={handleGameComplete}
        difficulty={config?.difficulty || "intermediate"}
      />
    );
  }

  if (activeGame === "definition") {
    return (
      <DefinitionGame
        words={unitWords}
        unitName={selectedUnit?.name || ""}
        onBack={handleBack}
        user={user}
        onCoinsEarned={handleCoinsEarned}
        onGameComplete={handleGameComplete}
        difficulty={config?.difficulty || "intermediate"}
      />
    );
  }

  if (trialExhausted) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center space-y-5">
        <div className="w-16 h-16 bg-indigo-500/10 rounded-2xl flex items-center justify-center mx-auto">
          <Lock className="w-8 h-8 text-indigo-600" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-foreground mb-2">{t("games.trial_ended_title")}</h2>
          <p className="text-sm text-muted-foreground">
            {t("games.trial_ended_desc", { max: MAX_TRIAL_ROUNDS })}
          </p>
        </div>
        <Link to="/pricing">
          <button className="bg-primary text-primary-foreground text-base font-semibold px-6 py-3 rounded-xl hover:bg-primary/90 transition-colors select-none w-full">
            {t("home.view_plans")}
          </button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-6 relative z-10">

      {/* Hero banner */}
      <motion.div
        initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden bg-gradient-to-br from-indigo-600 to-violet-700 rounded-2xl p-5 mb-6 text-white"
      >
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: "radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px), radial-gradient(circle at 60% 80%, white 1px, transparent 1px)",
          backgroundSize: "60px 60px"
        }} />
        <div className="relative flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest opacity-75 mb-1">{t("games.zone_badge")}</p>
            <h2 className="text-xl font-bold mb-0.5">{t("games.hero_title")}</h2>
            <p className="text-xs opacity-80">{t("games.hero_sub")}</p>
          </div>
          {/* Coin display */}
          {user && (
            <motion.div
              key={userCoins?.coins}
              initial={{ scale: 1.2 }} animate={{ scale: 1 }}
              className="flex flex-col items-center bg-white/15 backdrop-blur rounded-xl px-4 py-3"
            >
              <span className="text-2xl">🪙</span>
              <span className="text-lg font-bold leading-none">{userCoins?.coins || 0}</span>
              <span className="text-[10px] opacity-75">{t("games.coins")}</span>
            </motion.div>
          )}
        </div>
      </motion.div>

      <ProgressOverview coins={userCoins?.coins || 0} />

      {/* Unit selector */}
      <div className="mb-5">
        <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-2">{t("games.active_unit")}</p>
        <button
          onClick={() => setUnitDrawerOpen(true)}
          className="w-full flex items-center justify-between px-4 py-3 bg-background border border-border rounded-xl hover:border-primary transition-colors select-none"
        >
          <span className="text-sm font-medium text-foreground">{selectedUnit?.name || t("games.unit_placeholder")}</span>
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>

      {/* Trial indicator */}
      {!isActive && (
        <div className="mb-4 bg-amber-500/10 border border-amber-400/30 rounded-xl px-4 py-3 flex items-center justify-between">
          <p className="text-xs font-medium text-amber-700 dark:text-amber-400">
            {t("games.trial_used", { n: trialRounds, max: MAX_TRIAL_ROUNDS })}
          </p>
          <Link to="/pricing" className="text-xs font-bold text-primary hover:underline select-none">{t("games.view_plans")}</Link>
        </div>
      )}

      {/* Game cards */}
      <div className="space-y-4">
        {GAME_CARDS.map((card, idx) => (
          <motion.div
            key={card.id}
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.08 }}
            onClick={() => openSetup(card.id)}
            className={`relative overflow-hidden bg-gradient-to-br ${card.lightBg} border ${card.border} rounded-2xl cursor-pointer select-none group`}
            whileTap={{ scale: 0.98 }}
          >
            {/* Background image */}
            <div className="absolute right-0 top-0 w-28 h-full opacity-20 group-hover:opacity-30 transition-opacity">
              <img src={card.img} alt="" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-r from-background/80 to-transparent" />
            </div>

            <div className="relative p-5">
              <div className="flex items-start gap-4">
                <motion.div
                  className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${card.gradient} flex items-center justify-center flex-shrink-0 shadow-lg`}
                  whileHover={{ rotate: [0, -5, 5, 0], transition: { duration: 0.4 } }}
                >
                  <span className="text-2xl">{card.emoji}</span>
                </motion.div>
                <div className="flex-1">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <h3 className="font-bold text-foreground">{t(`games.cards.${card.id}.title`)}</h3>
                    <button
                      onClick={(e) => { e.stopPropagation(); setInfoGame(card.id); }}
                      className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center hover:bg-primary/20 transition-colors select-none flex-shrink-0"
                      title={t("games.how_to_play")}
                    >
                      <Info className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">{t(`games.cards.${card.id}.desc`)}</p>
                  <div className="flex items-center gap-2 mb-3 flex-wrap">
                    <span className="text-[11px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                      🎯 {t(`games.skills.${GAME_SKILL_MAP[card.id]}`)}
                    </span>
                    {getGameStats(card.id).plays > 0 && (
                      <span className="text-[11px] bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded-full font-medium">
                        ⭐ {getGameStats(card.id).best}%
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {(translations[lang]?.games?.cards[card.id]?.tags || []).map(tag => (
                      <span key={tag} className={`text-xs ${card.tagColor} px-2 py-0.5 rounded-full font-medium`}>{tag}</span>
                    ))}
                    <span className="text-xs bg-amber-500/10 text-amber-700 dark:text-amber-400 px-2 py-0.5 rounded-full font-medium">{t("games.coin_tag")}</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Room Leaderboard */}
      <RoomLeaderboard user={user} />

      <GameInstructionsSheet
        gameId={infoGame}
        open={!!infoGame}
        onClose={() => setInfoGame(null)}
        onStart={() => { const g = infoGame; setInfoGame(null); openSetup(g); }}
      />
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