import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Gamepad2, Zap, MessageSquare, ChevronRight, Lock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import VocabQuizGame from "@/components/games/VocabQuizGame";
import SentenceBuilderGame from "@/components/games/SentenceBuilderGame";
import UnitDrawer from "@/components/UnitDrawer";
import RoomLeaderboard from "@/components/games/RoomLeaderboard";

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
    tags: ["10 savol", "20s / savol", "AI baholash"],
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
];

export default function Games({ isActive = false, user = null }) {
  const [words, setWords] = useState([]);
  const [units, setUnits] = useState([]);
  const [selectedUnit, setSelectedUnit] = useState(null);
  const [unitDrawerOpen, setUnitDrawerOpen] = useState(false);
  const [activeGame, setActiveGame] = useState(null);
  const [loading, setLoading] = useState(true);
  const [trialRounds, setTrialRounds] = useState(() => parseInt(localStorage.getItem(TRIAL_KEY) || "0", 10));
  const [userCoins, setUserCoins] = useState(null);
  const trialExhausted = !isActive && trialRounds >= MAX_TRIAL_ROUNDS;

  useEffect(() => {
    base44.entities.VocabularyWord.list('unit_number').then(all => {
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

  const startGame = (game) => {
    if (!isActive) {
      const next = trialRounds + 1;
      localStorage.setItem(TRIAL_KEY, String(next));
      setTrialRounds(next);
    }
    setActiveGame(game);
  };

  const handleBack = () => setActiveGame(null);

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
        onBack={handleBack}
        user={user}
        onCoinsEarned={handleCoinsEarned}
      />
    );
  }

  if (activeGame === "sentence") {
    return (
      <SentenceBuilderGame
        words={words}
        onBack={handleBack}
        trialExhausted={!isActive && trialRounds >= MAX_TRIAL_ROUNDS}
        onNewRound={() => {
          if (!isActive) {
            const next = trialRounds + 1;
            localStorage.setItem(TRIAL_KEY, String(next));
            setTrialRounds(next);
          }
        }}
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
          <h2 className="text-xl font-bold text-foreground mb-2">Bepul sinov tugadi</h2>
          <p className="text-sm text-muted-foreground">
            {MAX_TRIAL_ROUNDS} ta bepul o'yin o'ynab bo'ldingiz. Davom etish uchun obuna kerak.
          </p>
        </div>
        <Link to="/pricing">
          <button className="bg-primary text-primary-foreground text-base font-semibold px-6 py-3 rounded-xl hover:bg-primary/90 transition-colors select-none w-full">
            Obuna rejalarini ko'rish →
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
            <p className="text-xs font-semibold uppercase tracking-widest opacity-75 mb-1">O'yinlar zonasi 🎮</p>
            <h2 className="text-xl font-bold mb-0.5">O'ynang & O'rganing!</h2>
            <p className="text-xs opacity-80">To'g'ri javob = 🪙 tanga</p>
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
              <span className="text-[10px] opacity-75">tanga</span>
            </motion.div>
          )}
        </div>
      </motion.div>

      {/* Unit selector */}
      <div className="mb-5">
        <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-2">Aktiv Unit</p>
        <button
          onClick={() => setUnitDrawerOpen(true)}
          className="w-full flex items-center justify-between px-4 py-3 bg-background border border-border rounded-xl hover:border-primary transition-colors select-none"
        >
          <span className="text-sm font-medium text-foreground">{selectedUnit?.name || "Unit tanlang"}</span>
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>

      {/* Trial indicator */}
      {!isActive && (
        <div className="mb-4 bg-amber-500/10 border border-amber-400/30 rounded-xl px-4 py-3 flex items-center justify-between">
          <p className="text-xs font-medium text-amber-700 dark:text-amber-400">
            Bepul sinov: {trialRounds}/{MAX_TRIAL_ROUNDS} o'yin ishlatildi
          </p>
          <Link to="/pricing" className="text-xs font-bold text-primary hover:underline select-none">Obuna →</Link>
        </div>
      )}

      {/* Game cards */}
      <div className="space-y-4">
        {GAME_CARDS.map((card, idx) => (
          <motion.div
            key={card.id}
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.08 }}
            onClick={() => startGame(card.id)}
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
                  <h3 className="font-bold text-foreground mb-1">{card.title}</h3>
                  <p className="text-sm text-muted-foreground mb-3">{card.desc}</p>
                  <div className="flex flex-wrap gap-2">
                    {card.tags.map(tag => (
                      <span key={tag} className={`text-xs ${card.tagColor} px-2 py-0.5 rounded-full font-medium`}>{tag}</span>
                    ))}
                    <span className="text-xs bg-amber-500/10 text-amber-700 dark:text-amber-400 px-2 py-0.5 rounded-full font-medium">🪙 Tanga yutib oling</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Room Leaderboard */}
      <RoomLeaderboard user={user} />

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