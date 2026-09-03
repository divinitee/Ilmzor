import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { motion, AnimatePresence } from "framer-motion";
import { Star, Sparkles, BookmarkPlus } from "lucide-react";
import SkillStage from "@/components/skillhub/SkillStage";
import VocabQuizGame from "@/components/games/VocabQuizGame";
import SentenceBuilderGame from "@/components/games/SentenceBuilderGame";
import SpellingGame from "@/components/games/SpellingGame";
import WordFormsGame from "@/components/games/WordFormsGame";
import CrosswordGame from "@/components/games/CrosswordGame";
import DefinitionGame from "@/components/games/DefinitionGame";
import GrammarQuizGame from "@/components/games/GrammarQuizGame";
import DefinitionMatchGame from "@/components/games/DefinitionMatchGame";
import ContextGuessGame from "@/components/games/ContextGuessGame";
import MemoryFlipGame from "@/components/games/MemoryFlipGame";
import PictureMatchGame from "@/components/games/PictureMatchGame";
import OddOneOutGame from "@/components/games/OddOneOutGame";
import { recordGameResult, syncGameResultToServer } from "@/lib/gameSkills";
import { useSkillLoc } from "@/lib/skillHubI18n";
import { DIFF_TO_GAME, getRandomChallenge } from "@/lib/skillTreeData";

/* ---------- Page ---------- */

// autoRandomToken: bumped by the dashboard's Random Challenge quick action
// (see Home.jsx's navigateTab "skillhub-random" handling) to launch straight
// into a random playable game instead of just opening the Skill Hub tab.
export default function SkillHub({ isActive = true, user = null, autoRandomToken = 0 }) {
  const [words, setWords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userCoins, setUserCoins] = useState(null);
  const [activeGame, setActiveGame] = useState(null); // { game, difficulty, bank, skillLabel }
  const [soonLabel, setSoonLabel] = useState(null);
  const loc = useSkillLoc();

  useEffect(() => {
    base44.entities.VocabularyWord.list("unit_number", 2000)
      .then((all) => setWords(all))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!autoRandomToken || loading) return;
    const challenge = getRandomChallenge();
    if (challenge) setActiveGame(challenge);
  }, [autoRandomToken, loading]);

  useEffect(() => {
    if (!user) return;
    base44.entities.UserCoins.filter({ user_id: user.id }).then((res) => {
      if (res.length > 0) setUserCoins(res[0]);
    });
  }, [user]);

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
    } catch (e) {
      console.error(e);
    }
  };

  const handleGameComplete = (result) => {
    if (!activeGame) return;
    const pct = Math.max(0, Math.min(100, Math.round(result?.scorePct ?? 0)));
    recordGameResult(activeGame.game, pct); // instant local UI (completion chips)
    syncGameResultToServer(user?.email, activeGame.game, pct); // fire-and-forget DB sync for the dashboard
  };

  if (activeGame) {
    const diff = DIFF_TO_GAME[activeGame.difficulty] || "intermediate";
    const base = { words, unitName: "Skill Hub", onBack: () => setActiveGame(null), onCoinsEarned: handleCoinsEarned, onGameComplete: handleGameComplete, difficulty: diff };
    if (activeGame.game === "quiz")
      return <VocabQuizGame {...base} user={user} timePerQ={30} autoAdvance />;
    if (activeGame.game === "sentence")
      return <SentenceBuilderGame {...base} user={user} />;
    if (activeGame.game === "spelling")
      return <SpellingGame {...base} />;
    if (activeGame.game === "wordforms")
      return <WordFormsGame {...base} />;
    if (activeGame.game === "crossword")
      return <CrosswordGame {...base} />;
    if (activeGame.game === "definition")
      return <DefinitionGame {...base} user={user} />;
    if (activeGame.game === "grammar")
      return <GrammarQuizGame {...base} bankKey={activeGame.bank} skillLabel={activeGame.skillLabel} />;
    if (activeGame.game === "definition_match")
      return <DefinitionMatchGame {...base} />;
    if (activeGame.game === "context_guess")
      return <ContextGuessGame {...base} />;
    if (activeGame.game === "memory_flip")
      return <MemoryFlipGame {...base} />;
    if (activeGame.game === "picture_match")
      return <PictureMatchGame {...base} />;
    if (activeGame.game === "odd_one_out")
      return <OddOneOutGame {...base} />;
  }

  return (
    <div className="relative min-h-[calc(100vh-0px)] overflow-hidden">
      {/* ParticleBackground removed — Home.jsx (the only parent that ever
          renders SkillHub) already provides one persistently. Two instances
          were running simultaneously here, doubling canvas redraw cost on
          the one screen that already has the most else going on. */}

      <div className="relative z-10 max-w-3xl mx-auto px-4 pt-6 pb-28">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}
          className="text-center mb-4"
        >
          <div className="relative inline-flex mb-4">
            <span className="neo-bloom" aria-hidden="true" />
            <div className="relative neo-pill px-4 py-1.5 text-fuchsia-200 text-[11px] font-semibold uppercase tracking-[0.18em]">
              <Sparkles className="w-3.5 h-3.5" /> {loc("ui.lab")}
            </div>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight">
            Skill Hub
          </h1>
          <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
            {loc("ui.sub")}
          </p>
        </motion.div>

        {/* Coins chip + My Words entry point (lives inside Skill Hub, not a
            new top-level nav item — the real Skill Hub UI is a spatial
            mind-map, not a flat subskill list, so this sits in the header
            rather than nested under a "Vocabulary" list that doesn't exist
            as such in the rendered UI). */}
        {user && (
          <div className="flex justify-center items-center gap-2 mb-2">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-400/20 text-amber-300 text-xs font-semibold select-none">
              <Star className="w-3.5 h-3.5" /> {userCoins?.coins || 0} XP
            </div>
            <Link
              to="/my-words"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-400/20 text-blue-400 text-xs font-semibold select-none"
            >
              <BookmarkPlus className="w-3.5 h-3.5" /> My Words
            </Link>
          </div>
        )}

        {/* 3D mind-map stage */}
        <div className="relative w-full aspect-square max-w-[560px] mx-auto min-h-[360px]">
          <SkillStage
            onPlayGame={(g) => setActiveGame(g)}
            onComingSoon={(label) => setSoonLabel(label)}
          />
        </div>
      </div>

      {/* Coming-soon notice */}
      <AnimatePresence>
        {soonLabel && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setSoonLabel(null)}
          >
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <motion.div
              initial={{ y: 20, opacity: 0, scale: 0.96 }} animate={{ y: 0, opacity: 1, scale: 1 }} exit={{ y: 20, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 26 }}
              className="premium-card relative w-full max-w-sm rounded-[28px] p-6 text-center"
            >
              <div className="w-14 h-14 rounded-2xl bg-primary/15 border border-primary/25 flex items-center justify-center mx-auto mb-4">
                <Sparkles className="w-7 h-7 text-primary" />
              </div>
              <h3 className="text-lg font-bold text-foreground">{loc(soonLabel)}</h3>
              <p className="text-sm text-muted-foreground mt-1 mb-5">{loc("ui.comingSoonTitle")}</p>
              <button onClick={() => setSoonLabel(null)} className="neo-pill px-5 py-2 text-sm font-semibold text-foreground hover:bg-white/10 transition-colors select-none">
                {loc("ui.gotIt")}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}