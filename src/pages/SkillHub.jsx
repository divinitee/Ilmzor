import React, { useState, useEffect, useMemo } from "react";
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
import { useAppLang } from "@/hooks/useAppLang";
import { getRandomChallenge } from "@/lib/skillTreeData";
import { levelOf, difficultyFor, wordsForLevel } from "@/lib/levels";

/* ---------- Page ---------- */

// autoRandomToken: bumped by the dashboard's Random Challenge quick action
// (see Home.jsx's navigateTab "skillhub-random" handling) to launch straight
// into a random playable game instead of just opening the Skill Hub tab.
export default function SkillHub({ isActive = true, user = null, autoRandomToken = 0 }) {
  const [words, setWords] = useState([]); // raw pool, all levels
  const [loading, setLoading] = useState(true);
  const [userXp, setUserXp] = useState(null);
  const [activeGame, setActiveGame] = useState(null); // { game, difficulty, bank, skillLabel }
  const [soonLabel, setSoonLabel] = useState(null);
  const [lockedInfo, setLockedInfo] = useState(null); // { label, minLevel } — distinct from soonLabel: "not unlocked for you" vs "not built yet"
  const loc = useSkillLoc();
  const { t } = useAppLang();

  useEffect(() => {
    // Paginated, not a single list(..., 2000) call — the collection is
    // ~2,282 rows and climbing (the enrichment batch only adds rows, never
    // removes them), so a fixed cap silently drops words forever. Sorted
    // and deduped by id rather than unit_number: most rows have no
    // unit_number, which makes that sort non-deterministic and was
    // producing duplicate pages (the same bug VocabReview.jsx hit and
    // fixed the same way).
    let cancelled = false;
    (async () => {
      const byId = new Map();
      let skip = 0;
      const PAGE = 500;
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const page = await base44.entities.VocabularyWord.list("id", PAGE, skip);
        page.forEach((w) => byId.set(w.id, w));
        if (page.length < PAGE) break;
        skip += PAGE;
      }
      if (!cancelled) {
        setWords([...byId.values()]);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!autoRandomToken || loading) return;
    const challenge = getRandomChallenge();
    if (challenge) setActiveGame(challenge);
  }, [autoRandomToken, loading]);

  useEffect(() => {
    if (!user) return;
    // UserCoins is the underlying storage entity for XP — kept unchanged
    // internally to avoid a data migration; every user-facing surface
    // presents it purely as XP now (see i18n + game components).
    base44.entities.UserCoins.filter({ user_id: user.id }).then((res) => {
      if (res.length > 0) setUserXp(res[0]);
    });
  }, [user]);

  // What games actually get. Skill Hub is consolidation — a student's own
  // band plus one below, never above; new material is the Learning Path's
  // job (see levels.js). Falls back toward the full pool if a band is thin,
  // so this only ever narrows what a student sees, never empties a game.
  const studentLevel = useMemo(() => levelOf(user), [user]);
  const poolWords = useMemo(() => wordsForLevel(words, studentLevel), [words, studentLevel]);

  const handleXpEarned = async (earned, correctCount) => {
    if (!user || earned === 0) return;
    try {
      if (userXp) {
        const updated = await base44.entities.UserCoins.update(userXp.id, {
          coins: (userXp.coins || 0) + earned,
          total_correct: (userXp.total_correct || 0) + correctCount,
          user_name: user.full_name || user.email,
        });
        setUserXp(updated);
      } else {
        const created = await base44.entities.UserCoins.create({
          user_id: user.id,
          user_name: user.full_name || user.email,
          email: user.email,
          classroom_code: user.classroom_code || "",
          coins: earned,
          total_correct: correctCount,
        });
        setUserXp(created);
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
    // The node's own Easy/Medium/Hard nudges one step either side of the
    // student's actual level (difficultyFor in levels.js) rather than
    // setting difficulty outright — so "Hard" means hard for this student,
    // not "third node in the category," and two students at different
    // levels playing the same node get different intensity.
    const diff = difficultyFor(studentLevel, activeGame.difficulty);
    const base = { words: poolWords, unitName: "Skill Hub", onBack: () => setActiveGame(null), onXpEarned: handleXpEarned, onGameComplete: handleGameComplete, difficulty: diff };
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
      // PictureMatchGame takes onResult, not onXpEarned/onGameComplete —
      // base's versions of those were never being called, so this game's
      // XP and completion silently never recorded. Adapt onResult into both
      // rather than changing the component itself, which other call sites
      // (there are none today, but the shape is worth keeping general) might
      // reasonably expect to stay as-is.
      return (
        <PictureMatchGame
          {...base}
          user={user}
          onResult={(r) => {
            handleXpEarned(r?.xp || 0, r?.correct || 0);
            handleGameComplete({ scorePct: r?.total ? (r.correct / r.total) * 100 : 0 });
          }}
        />
      );
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

        {/* XP chip + My Words entry point (lives inside Skill Hub, not a
            new top-level nav item — the real Skill Hub UI is a spatial
            mind-map, not a flat subskill list, so this sits in the header
            rather than nested under a "Vocabulary" list that doesn't exist
            as such in the rendered UI). */}
        {user && (
          <div className="flex justify-center items-center gap-2 mb-2">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-400/20 text-amber-300 text-xs font-semibold select-none">
              <Star className="w-3.5 h-3.5" /> {userXp?.coins || 0} XP
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
            studentLevel={studentLevel}
            onLocked={(info) => setLockedInfo(info)}
          />
        </div>
      </div>

      {/* Level-locked notice — a game that exists and works, just not
          unlocked for this student yet. Kept as its own modal (not reusing
          soonLabel) so the copy and mental model stay distinct from
          "not built yet". */}
      <AnimatePresence>
        {lockedInfo && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setLockedInfo(null)}
          >
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <motion.div
              initial={{ y: 20, opacity: 0, scale: 0.96 }} animate={{ y: 0, opacity: 1, scale: 1 }} exit={{ y: 20, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 26 }}
              className="premium-card relative w-full max-w-sm rounded-[28px] p-6 text-center"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-14 h-14 rounded-2xl bg-primary/15 border border-primary/25 flex items-center justify-center mx-auto mb-4">
                <Sparkles className="w-7 h-7 text-primary" />
              </div>
              <h3 className="text-lg font-bold text-foreground">
                {t("gameui.reach_level_title", { level: lockedInfo.minLevel })}
              </h3>
              <p className="text-sm text-muted-foreground mt-1 mb-5">{t("gameui.reach_level_body", { level: lockedInfo.minLevel })}</p>
              <button onClick={() => setLockedInfo(null)} className="neo-pill px-5 py-2 text-sm font-semibold text-foreground hover:bg-white/10 transition-colors select-none">
                {loc("ui.gotIt")}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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