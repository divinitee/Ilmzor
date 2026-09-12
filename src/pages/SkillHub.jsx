import React, { useState, useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { motion, AnimatePresence } from "framer-motion";
import { Star, Sparkles, BookmarkPlus } from "lucide-react";
import SkillStage from "@/components/skillhub/SkillStage";
import VocabQuizGame from "@/components/games/VocabQuizGame";
import SentenceBuilderGame from "@/components/games/SentenceBuilderGame";
import UsageGame from "@/components/games/UsageGame";
import SpellingGame from "@/components/games/SpellingGame";
import WordFormsGame from "@/components/games/WordFormsGame";
import CrosswordGame from "@/components/games/CrosswordGame";
import DefinitionGame from "@/components/games/DefinitionGame";
import GrammarQuizGame from "@/components/games/GrammarQuizGame";
import DefinitionMatchGame from "@/components/games/DefinitionMatchGame";
import ContextGuessGame from "@/components/games/ContextGuessGame";
import SynonymSprintGame from "@/components/games/SynonymSprintGame";
import CardFlipFable from "@/components/games/CardFlipFable";
import PictureMatchGame from "@/components/games/PictureMatchGame";
import OddOneOutGame from "@/components/games/OddOneOutGame";
import RelatedWordsGame from "@/components/games/RelatedWordsGame";
import { recordGameResult, syncGameResultToServer } from "@/lib/gameSkills";
import { useSkillLoc } from "@/lib/skillHubI18n";
import { useAppLang } from "@/hooks/useAppLang";
import { getRandomChallenge } from "@/lib/skillTreeData";
import { levelOf, difficultyFor, wordsForLevel, cognitiveDemandForLevel } from "@/lib/levels";
import { resolveUserNameOrEmail } from "@/lib/profileName";
import { hasDiagnostic, resolveSkillEntry } from "@/lib/skillDiagnostics";

/* ---------- Page ---------- */

// autoRandomToken: bumped by the dashboard's Random Challenge quick action
// (see Home.jsx's navigateTab "skillhub-random" handling) to launch straight
// into a random playable game instead of just opening the Skill Hub tab.
export default function SkillHub({ isActive = true, user = null, autoRandomToken = 0, assignmentMode = false, assignmentGroups = [] }) {
  const [words, setWords] = useState([]); // raw pool, all levels
  const [loading, setLoading] = useState(true);
  const [userXp, setUserXp] = useState(null);
  const [activeGame, setActiveGame] = useState(null); // { game, difficulty, bank, skillLabel }
  const [soonLabel, setSoonLabel] = useState(null);
  const [lockedInfo, setLockedInfo] = useState(null); // { label, minLevel } — distinct from soonLabel: "not unlocked for you" vs "not built yet"
  const [pendingAssignment, setPendingAssignment] = useState(null);
  const [assignmentGroup, setAssignmentGroup] = useState(assignmentGroups[0]?.code || "");
  const [assignmentDueDate, setAssignmentDueDate] = useState("");
  const [assigning, setAssigning] = useState(false);
  const [assignmentMessage, setAssignmentMessage] = useState("");
  const loc = useSkillLoc();
  const { t } = useAppLang();
  const navigate = useNavigate();

  // Skill Hub entry gate. A skill with a diagnostic routes through its own
  // entry check instead of diving into subskills: placement complete goes to
  // the skill's home, anything else goes to its assessment. Skills without a
  // diagnostic are untouched and keep the original dive behaviour.
  const handleEnterSkill = (skillId) => {
    if (assignmentMode || !hasDiagnostic(skillId)) return false;
    resolveSkillEntry(skillId, user?.email)
      .then((entry) => { if (entry) navigate(entry.route); })
      .catch((e) => console.error("skill entry resolve failed", e));
    return true;
  };

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
          user_name: resolveUserNameOrEmail(user),
        });
        setUserXp(updated);
      } else {
        const created = await base44.entities.UserCoins.create({
          user_id: user.id,
          user_name: resolveUserNameOrEmail(user),
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

  const handleAssignGame = (challenge) => {
    setAssignmentGroup(assignmentGroups[0]?.code || "");
    setAssignmentDueDate("");
    setPendingAssignment(challenge);
  };

  const createAssignment = async () => {
    if (!pendingAssignment || !assignmentGroup || !user) return;
    setAssigning(true);
    try {
      await base44.entities.HomeworkAssignment.create({
        teacher_id: user.id,
        teacher_email: user.email,
        classroom_code: assignmentGroup,
        skill_id: pendingAssignment.skillId || "",
        skill_label: pendingAssignment.skillLabel || "",
        title: pendingAssignment.title || pendingAssignment.game,
        game: pendingAssignment.game,
        bank: pendingAssignment.bank || undefined,
        difficulty: pendingAssignment.difficulty || undefined,
        due_date: assignmentDueDate || undefined,
        status: "active",
      });
      setPendingAssignment(null);
      setAssignmentMessage("Homework assigned.");
      setTimeout(() => setAssignmentMessage(""), 2500);
    } catch (error) {
      console.error("Homework assignment failed", error);
      setAssignmentMessage("Assignment failed. Please try again.");
    } finally {
      setAssigning(false);
    }
  };

  if (activeGame && !assignmentMode) {
    // The node's own Easy/Medium/Hard nudges one step either side of the
    // student's actual level (difficultyFor in levels.js) rather than
    // setting difficulty outright — so "Hard" means hard for this student,
    // not "third node in the category," and two students at different
    // levels playing the same node get different intensity.
    const diff = difficultyFor(studentLevel, activeGame.difficulty);
    // level + cognitiveDemand ride alongside difficulty (round intensity) as
    // a separate signal — "how hard the language is" vs "what kind of
    // thinking the task requires". Every engine gets them; only the
    // AI-generating ones (definition_match, definition today) act on them
    // so far. See levels.js's "Cognitive demand" section.
    const base = { words: poolWords, unitName: "Skill Hub", onBack: () => setActiveGame(null), onXpEarned: handleXpEarned, onGameComplete: handleGameComplete, difficulty: diff, level: studentLevel, cognitiveDemand: cognitiveDemandForLevel(studentLevel) };
    if (activeGame.game === "quiz")
      return <VocabQuizGame {...base} user={user} timePerQ={30} autoAdvance />;
    if (activeGame.game === "sentence")
      return <SentenceBuilderGame {...base} user={user} />;
    if (activeGame.game === "usage")
      // New engine (2026-09-07): four Vocabulary modes branched on `bank`
      // (fill_blank / best_word / sentence_repair / collocation_match).
      // SentenceBuilderGame and Grammar's Sentence Structure keep "sentence".
      return <UsageGame {...base} user={user} bank={activeGame.bank} />;
    if (activeGame.game === "spelling")
      // Rebuilt 2026-09-07: three distinct mechanics branched on `bank`
      // (missing_letters / letter_order / typing), same shape as
      // GrammarQuizGame's bankKey. Takes `user` for personalization + logging.
      return <SpellingGame {...base} user={user} bank={activeGame.bank} />;
    if (activeGame.game === "wordforms")
      // Rebuilt 2026-09-07: four distinct mechanics branched on `bank`
      // (word_family / prefix_match / suffix_builder / root_hunt). Takes
      // `user` for logWordAttempts. No InvokeLLM — hand-authored banks.
      return <WordFormsGame {...base} user={user} bank={activeGame.bank} />;
    if (activeGame.game === "crossword")
      return <CrosswordGame {...base} />;
    if (activeGame.game === "definition")
      return <DefinitionGame {...base} user={user} />;
    if (activeGame.game === "grammar")
      return <GrammarQuizGame {...base} bankKey={activeGame.bank} skillLabel={activeGame.skillLabel} />;
    if (activeGame.game === "definition_match")
      // Takes `user` on top of base: the rebuilt engine (2026-09-06) reads
      // user.email for personalized round composition and for its own
      // RewardEvent / WordAttempt logging.
      return <DefinitionMatchGame {...base} user={user} />;
    if (activeGame.game === "context_guess")
      // Standard signature since the 2026-09-07 rebuild — takes `user` on top
      // of base for round composition and reward / attempt logging.
      return <ContextGuessGame {...base} user={user} />;
    // Memory Flip's production engine as of 2026-09-06 (bake-off winner; the
    // previous MemoryFlipGame.jsx and the CardFlipOpus entry were removed with
    // it, and remain in git history and the checkpoints if ever needed).
    // Takes `user` on top of base: it reads user.email for round composition
    // (WordAttempt / SavedWord) and for its reward + attempt logging.
    if (activeGame.game === "memory_flip")
      return <CardFlipFable {...base} user={user} />;
    if (activeGame.game === "picture_match")
      // Standard signature since the 2026-09-07 expansion — takes `user` on
      // top of base for round composition and reward / attempt logging.
      return <PictureMatchGame {...base} user={user} />;
    if (activeGame.game === "synonym_sprint")
      // Vocabulary > Relationships, standard signature — takes `user` on top of
      // base for round composition and reward / attempt logging.
      return <SynonymSprintGame {...base} user={user} />;
    if (activeGame.game === "odd_one_out")
      // Refined 2026-09-07: now reads user.email for RewardEvent / WordAttempt
      // logging (gameScoring.js + logWordAttempts), same as the other
      // Vocabulary games. buildPersonalizedRound is NOT used — the bank is a
      // fixed 20-entry hardcoded set, not sourced from VocabularyWord.
      return <OddOneOutGame {...base} user={user} />;
    if (activeGame.game === "related_words" || activeGame.game === "connection_challenge")
      // New 2026-09-07: the last two Relationships nodes, moved off the generic
      // "quiz" engine. One engine file with a bank/mode split — Related Words
      // (category recognition) and Connection Challenge (category inference
      // from 3 examples). Fixed hand-authored bank, same as Antonym Hunt.
      return <RelatedWordsGame {...base} user={user} bank={activeGame.game} />;
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
            {assignmentMode ? "Choose homework" : loc("ui.skillHub")}
          </h1>
          <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
            {assignmentMode ? "Open a skill, choose an activity, then assign it to one of your groups." : loc("ui.sub")}
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
              <BookmarkPlus className="w-3.5 h-3.5" /> {t("nav.my_words")}
            </Link>
          </div>
        )}

        {/* 3D mind-map stage */}
        <div className="relative w-full aspect-square max-w-[560px] mx-auto min-h-[360px]">
          <SkillStage
            onPlayGame={assignmentMode ? handleAssignGame : (g) => setActiveGame(g)}
            onComingSoon={(label) => setSoonLabel(label)}
            studentLevel={studentLevel}
            onLocked={(info) => setLockedInfo(info)}
            onEnterSkill={handleEnterSkill}
            assignmentMode={assignmentMode}
          />
        </div>
      </div>

      <AnimatePresence>
        {pendingAssignment && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => !assigning && setPendingAssignment(null)}
          >
            <div className="absolute inset-0 bg-black/65 backdrop-blur-sm" />
            <motion.div
              initial={{ y: 18, opacity: 0, scale: 0.97 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 18, opacity: 0, scale: 0.97 }}
              className="premium-card relative w-full max-w-md rounded-[28px] p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-[10px] uppercase tracking-[0.2em] text-primary font-bold">Assign homework</div>
              <h3 className="mt-2 text-xl font-bold text-foreground">{pendingAssignment.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {pendingAssignment.skillLabel} · {pendingAssignment.difficulty}
              </p>

              {assignmentGroups.length === 0 ? (
                <p className="mt-6 text-sm text-amber-500">Create a group first, then you can assign Skill Hub homework to it.</p>
              ) : (
                <div className="mt-6 space-y-4">
                  <label className="block">
                    <span className="text-xs font-semibold text-muted-foreground">Group</span>
                    <select
                      value={assignmentGroup}
                      onChange={(e) => setAssignmentGroup(e.target.value)}
                      className="mt-1.5 w-full h-11 rounded-xl bg-background border border-border px-3 text-sm text-foreground"
                    >
                      {assignmentGroups.map((group) => (
                        <option key={group.id} value={group.code}>
                          {group.label || group.code} · {group.code}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="block">
                    <span className="text-xs font-semibold text-muted-foreground">Due date, optional</span>
                    <input
                      type="date"
                      value={assignmentDueDate}
                      onChange={(e) => setAssignmentDueDate(e.target.value)}
                      className="mt-1.5 w-full h-11 rounded-xl bg-background border border-border px-3 text-sm text-foreground"
                    />
                  </label>
                </div>
              )}

              <div className="mt-6 flex gap-3">
                <button
                  onClick={() => setPendingAssignment(null)}
                  disabled={assigning}
                  className="flex-1 h-11 rounded-xl border border-border text-sm font-semibold text-foreground hover:bg-muted transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={createAssignment}
                  disabled={assigning || !assignmentGroup || assignmentGroups.length === 0}
                  className="flex-1 h-11 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  {assigning ? "Assigning..." : "Assign"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {assignmentMessage && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 rounded-full border border-primary/30 bg-background/95 backdrop-blur px-4 py-2 text-sm font-semibold text-foreground shadow-xl">
          {assignmentMessage}
        </div>
      )}

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