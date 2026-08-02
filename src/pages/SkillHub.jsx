import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { motion, AnimatePresence } from "framer-motion";
import {
  BookOpen, SpellCheck, FileText, Headphones, PenLine, Mic,
  Brain, ArrowLeft, X, Zap, Clock, Star, Sparkles, ChevronRight, Play,
} from "lucide-react";
import ParticleBackground from "@/components/ParticleBackground";
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
import { getGameStats, recordGameResult } from "@/lib/gameSkills";

/* ---------- Skill tree data ---------- */

const TOP_SKILLS = [
  { id: "vocabulary", label: "Vocabulary", icon: BookOpen, hue: "from-blue-500 to-indigo-600", ring: "ring-blue-400/50", glow: "rgba(59,130,246,0.55)" },
  { id: "grammar", label: "Grammar", icon: SpellCheck, hue: "from-violet-500 to-purple-600", ring: "ring-violet-400/50", glow: "rgba(139,92,246,0.55)" },
  { id: "reading", label: "Reading", icon: FileText, hue: "from-cyan-500 to-sky-600", ring: "ring-cyan-400/50", glow: "rgba(14,165,233,0.55)", comingSoon: true },
  { id: "listening", label: "Listening", icon: Headphones, hue: "from-teal-500 to-emerald-600", ring: "ring-teal-400/50", glow: "rgba(20,184,166,0.55)", comingSoon: true },
  { id: "writing", label: "Writing", icon: PenLine, hue: "from-indigo-500 to-blue-700", ring: "ring-indigo-400/50", glow: "rgba(99,102,241,0.55)", comingSoon: true },
  { id: "speaking", label: "Speaking", icon: Mic, hue: "from-rose-500 to-pink-600", ring: "ring-rose-400/50", glow: "rgba(244,63,94,0.55)", comingSoon: true },
];

const gen = (names, game) => names.map((name, i) => ({
  name,
  game,
  difficulty: ["Easy", "Medium", "Hard"][i % 3],
  time: ["3 min", "5 min", "8 min"][i % 3],
  xp: [40, 65, 100][i % 3],
}));

const C = (label, subs, challenges, comingSoon = false) => ({ label, subs, challenges, comingSoon });
const grammarCh = (names, bank) => names.map((name, i) => ({
  name, game: "grammar", bank,
  difficulty: ["Easy", "Medium", "Hard"][i % 3],
  time: ["3 min", "5 min", "8 min"][i % 3],
  xp: [40, 65, 100][i % 3],
}));

const SKILL_CHILDREN = {
  vocabulary: [
    C("Meaning", ["Definitions", "Context", "Multiple meanings"], [
      { name: "Definition Match", game: "definition_match", difficulty: "Easy", time: "3 min", xp: 40 },
      { name: "Picture Match", game: "picture_match", difficulty: "Medium", time: "5 min", xp: 65 },
      { name: "Context Guess", game: "context_guess", difficulty: "Hard", time: "8 min", xp: 100 },
      { name: "Memory Flip", game: "memory_flip", difficulty: "Easy", time: "3 min", xp: 40 },
    ]),
    C("Pronunciation", ["Word stress", "IPA"], gen(["Hear & Choose", "Stress Battle", "Minimal Pairs", "Shadow Me"], "spelling"), true),
    C("Spelling", ["Typing", "Letter order", "Missing letters"], gen(["Typing", "Letter Order", "Missing Letters"], "spelling")),
    C("Word Forms", ["Noun", "Verb", "Adjective", "Adverb", "Prefixes", "Suffixes", "Root words"], gen(["Word Family Builder", "Prefix Match", "Suffix Builder", "Root Hunt"], "wordforms")),
    C("Usage", ["Example sentences", "Fill in the blank", "Collocations", "Common mistakes"], gen(["Fill the Blank", "Choose the Best Word", "Sentence Repair", "Collocation Match"], "sentence")),
    C("Relationships", ["Synonyms", "Antonyms", "Related words", "Word families"], gen(["Synonym Sprint", "Antonym Hunt", "Related Words", "Connection Challenge"], "quiz")),
  ],
  grammar: [
    C("Sentence Structure", ["Word Order"], gen(["Word Order", "Build It"], "sentence")),
    C("Verb Tenses", [], grammarCh(["Present vs Past", "Perfect Tenses"], "verb_tenses")),
    C("Articles", [], grammarCh(["A or An", "The or Zero"], "articles")),
    C("Prepositions", [], grammarCh(["Time Prepositions", "Place Prepositions"], "prepositions")),
    C("Punctuation", [], grammarCh(["End Marks", "Apostrophes & Commas"], "punctuation")),
    C("Question Formation", [], grammarCh(["Yes/No Questions", "Wh-Questions"], "question_formation")),
    C("Active vs Passive", [], grammarCh(["Form the Passive", "Spot the Voice"], "active_passive")),
    C("Conditionals", [], grammarCh(["Zero & First", "Second & Third"], "conditionals")),
    C("Reported Speech", [], grammarCh(["Statements", "Questions & Commands"], "reported_speech")),
  ],
  speaking: [
    C("Pronunciation", [], gen(["Hear & Choose", "Repeat"], "spelling")),
    C("Fluency", [], gen(["Speak Up", "Quick Talk"], "sentence")),
    C("Intonation", [], gen(["Rise / Fall", "Intone"], "spelling")),
    C("Shadowing", [], gen(["Shadow Me", "Echo"], "spelling")),
    C("Conversation", [], gen(["Roleplay", "Dialog"], "sentence")),
    C("Roleplay", [], gen(["Scene", "Improvise"], "sentence")),
  ],
  reading: [
    C("Comprehension", [], gen(["Read & Answer", "Deep Read"], "definition")),
    C("Skimming", [], gen(["Fast Scan", "Gist"], "quiz")),
    C("Scanning", [], gen(["Find It", "Hunt"], "crossword")),
    C("Inference", [], gen(["Guess", "Read Between"], "definition")),
    C("Vocabulary in Context", [], gen(["Context Words", "Clue"], "definition")),
  ],
  listening: [
    C("Understanding", [], gen(["Listen In", "Catch"], "spelling")),
    C("Key Information", [], gen(["Key Hunt", "Main Point"], "quiz")),
    C("Different Accents", [], gen(["Accent Match", "Voices"], "spelling")),
    C("Speed Training", [], gen(["Speed Run", "Rapid"], "quiz")),
    C("Vocabulary Recognition", [], gen(["Hear & Pick", "Spot"], "spelling")),
  ],
  writing: [
    C("Sentence Building", [], gen(["Build", "Arrange"], "sentence")),
    C("Paragraph Writing", [], gen(["Paragraph", "Flow"], "sentence")),
    C("Essay Writing", [], gen(["Essay", "Draft"], "sentence")),
    C("Grammar Accuracy", [], gen(["Accuracy", "Proofread"], "wordforms")),
    C("Vocabulary Usage", [], gen(["Use It", "Choose Word"], "definition")),
  ],
};

const DIFF_STYLE = {
  Easy: "text-emerald-300 bg-emerald-500/10 border-emerald-400/30",
  Medium: "text-amber-300 bg-amber-500/10 border-amber-400/30",
  Hard: "text-rose-300 bg-rose-500/10 border-rose-400/30",
};
const DIFF_TO_GAME = { Easy: "beginner", Medium: "intermediate", Hard: "advanced" };

const pos = (i, n, rx, ry) => {
  const a = (-90 + (i / n) * 360) * (Math.PI / 180);
  return { x: 50 + rx * Math.cos(a), y: 50 + ry * Math.sin(a) };
};

/* ---------- Page ---------- */

export default function SkillHub({ isActive = true, user = null }) {
  const [words, setWords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userCoins, setUserCoins] = useState(null);

  const [selected, setSelected] = useState(null); // top skill id
  const [modalChild, setModalChild] = useState(null); // { skillId, child }
  const [activeGame, setActiveGame] = useState(null); // { game, difficulty }

  useEffect(() => {
    base44.entities.VocabularyWord.list("unit_number", 2000)
      .then((all) => setWords(all))
      .finally(() => setLoading(false));
  }, []);

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
    recordGameResult(activeGame.game, pct);
  };

  if (activeGame) {
    const diff = DIFF_TO_GAME[activeGame.difficulty] || "intermediate";
    const base = { words, unitName: "Skill Hub", onBack: () => setActiveGame(null), onCoinsEarned: handleCoinsEarned, onGameComplete: handleGameComplete, difficulty: diff };
    if (activeGame.game === "quiz")
      return <VocabQuizGame {...base} user={user} timePerQ={30} autoAdvance />;
    if (activeGame.game === "sentence")
      return <SentenceBuilderGame {...base} />;
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
  }

  return (
    <div className="relative min-h-[calc(100vh-0px)] overflow-hidden">
      <ParticleBackground />

      <div className="relative z-10 max-w-3xl mx-auto px-4 pt-6 pb-28">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}
          className="text-center mb-4"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-400/20 text-blue-300 text-[11px] font-semibold mb-3 select-none">
            <Sparkles className="w-3.5 h-3.5" /> Your English Laboratory
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight">
            What skill are we honing today?
          </h1>
          <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
            Choose one area to train. Games, exercises and recommendations will adapt automatically.
          </p>
        </motion.div>

        {/* Coins chip */}
        {user && (
          <div className="flex justify-center mb-2">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-400/20 text-amber-300 text-xs font-semibold select-none">
              <Star className="w-3.5 h-3.5" /> {userCoins?.coins || 0} XP
            </div>
          </div>
        )}

        {/* Mind map stage */}
        <div className="relative w-full aspect-square max-w-[560px] mx-auto min-h-[360px]">
          <AnimatePresence mode="wait">
            {!selected ? (
              <OverviewView key="overview" onSelect={setSelected} />
            ) : (
              <DetailView
                key={`detail-${selected}`}
                skillId={selected}
                onBack={() => setSelected(null)}
                onPickChild={(child) => !child.comingSoon && setModalChild({ skillId: selected, child })}
              />
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Challenge modal */}
      <AnimatePresence>
        {modalChild && (
          <ChallengeModal
            child={modalChild.child}
            skillLabel={TOP_SKILLS.find((s) => s.id === modalChild.skillId)?.label}
            onClose={() => setModalChild(null)}
            onPlay={(challenge) => {
              setModalChild(null);
              setActiveGame({ game: challenge.game, difficulty: challenge.difficulty, bank: challenge.bank, skillLabel: modalChild.child.label });
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

/* ---------- Overview: center + 6 skills ---------- */

function OverviewView({ onSelect }) {
  const nodes = TOP_SKILLS.map((s, i) => ({ ...s, ...pos(i, 6, 38, 36) }));
  return (
    <motion.div
      className="absolute inset-0"
      initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }}
    >
      <svg className="absolute inset-0 w-full h-full animate-pulse" viewBox="0 0 100 100" preserveAspectRatio="none">
        <defs>
          <linearGradient id="ovGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#60a5fa" />
            <stop offset="100%" stopColor="#6366f1" />
          </linearGradient>
        </defs>
        {nodes.map((n) => (
          <line key={n.id} x1="50" y1="50" x2={n.x} y2={n.y} stroke="url(#ovGrad)" strokeWidth="0.5" strokeOpacity="0.5" vectorEffect="non-scaling-stroke" />
        ))}
      </svg>

      {/* Center node */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          className="relative w-24 h-24 md:w-28 md:h-28 rounded-full bg-gradient-to-br from-blue-600 to-indigo-700 flex flex-col items-center justify-center text-white shadow-[0_0_45px_rgba(59,130,246,0.6)]"
        >
          <div className="absolute inset-0 rounded-full ring-2 ring-blue-300/40 animate-pulse" />
          <Brain className="w-7 h-7 mb-1" />
          <span className="text-[10px] font-bold tracking-wide leading-none text-center px-2">English Skills</span>
        </motion.div>
      </div>

      {/* Skill nodes */}
      {nodes.map((n, i) => (
        <SkillNode key={n.id} node={n} index={i} onClick={() => onSelect(n.id)} />
      ))}
    </motion.div>
  );
}

/* ---------- Detail: selected skill as hub + children ---------- */

function DetailView({ skillId, onBack, onPickChild }) {
  const skill = TOP_SKILLS.find((s) => s.id === skillId);
  const children = SKILL_CHILDREN[skillId] || [];
  const n = children.length;
  const rx = n > 6 ? 42 : 38;
  const ry = n > 6 ? 40 : 36;
  const nodes = children.map((c, i) => ({ ...c, ...pos(i, n, rx, ry) }));

  return (
    <motion.div
      className="absolute inset-0"
      initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }}
    >
      <svg className="absolute inset-0 w-full h-full animate-pulse" viewBox="0 0 100 100" preserveAspectRatio="none">
        <defs>
          <linearGradient id="dtGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#60a5fa" />
            <stop offset="100%" stopColor={skill?.glow.replace(/rgba?\(([^)]+)\)/, "") || "#6366f1"} />
          </linearGradient>
        </defs>
        {nodes.map((c) => (
          <line key={c.label} x1="50" y1="50" x2={c.x} y2={c.y} stroke="url(#dtGrad)" strokeWidth="0.5" strokeOpacity="0.45" vectorEffect="non-scaling-stroke" />
        ))}
      </svg>

      {/* Hub node = selected skill */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
        <motion.button
          onClick={onBack}
          initial={{ scale: 0.8 }} animate={{ scale: 1 }}
          whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.94 }}
          className={`relative w-24 h-24 md:w-28 md:h-28 rounded-full bg-gradient-to-br ${skill?.hue} flex flex-col items-center justify-center text-white shadow-[0_0_40px_rgba(59,130,246,0.5)]`}
        >
          <div className="absolute inset-0 rounded-full ring-2 ring-white/30 animate-pulse" />
          {skill && <skill.icon className="w-7 h-7 mb-1" />}
          <span className="text-[11px] font-bold tracking-wide leading-none text-center px-2">{skill?.label}</span>
        </motion.button>
      </div>

      {/* Back button */}
      <button
        onClick={onBack}
        className="absolute left-1/2 -translate-x-1/2 -bottom-1 z-20 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground bg-card/70 backdrop-blur border border-border rounded-full px-3 py-1.5 select-none"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> All skills
      </button>

      {/* Child nodes */}
      {nodes.map((c, i) => (
        <ChildNode key={c.label} node={c} index={i} onClick={() => onPickChild(c)} />
      ))}
    </motion.div>
  );
}

/* ---------- Node components ---------- */

function SkillNode({ node, index, onClick }) {
  const soon = node.comingSoon;
  return (
    <div className="absolute z-10" style={{ left: `${node.x}%`, top: `${node.y}%`, transform: "translate(-50%, -50%)" }}>
      <motion.button
        onClick={soon ? undefined : onClick}
        disabled={soon}
        initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.05 + index * 0.06 }}
        whileHover={soon ? undefined : { scale: 1.1 }} whileTap={soon ? undefined : { scale: 0.92 }}
        className={soon
          ? "group relative w-20 h-20 md:w-24 md:h-24 rounded-2xl bg-muted/50 border-2 border-dashed border-muted-foreground/30 flex flex-col items-center justify-center text-muted-foreground cursor-not-allowed"
          : `group relative w-20 h-20 md:w-24 md:h-24 rounded-2xl bg-gradient-to-br ${node.hue} flex flex-col items-center justify-center text-white backdrop-blur-md border border-white/20 shadow-[0_8px_30px_rgba(15,23,42,0.4)] hover:shadow-[0_0_30px_rgba(59,130,246,0.5)] transition-shadow`}
      >
        {!soon && <div className={`absolute inset-0 rounded-2xl ring-1 ${node.ring} opacity-60 group-hover:opacity-100 transition-opacity`} />}
        <node.icon className={soon ? "w-6 h-6 mb-1 opacity-50" : "w-6 h-6 mb-1"} />
        <span className="text-[10px] font-bold tracking-wide leading-none text-center px-1.5">{node.label}</span>
        {soon
          ? <span className="text-[7px] font-medium leading-none mt-0.5 opacity-70">(coming soon)</span>
          : <div className="absolute -bottom-1.5 right-1 w-4 h-4 rounded-full bg-blue-400/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <ChevronRight className="w-2.5 h-2.5 text-white" />
            </div>}
      </motion.button>
    </div>
  );
}

function ChildNode({ node, index, onClick }) {
  const soon = node.comingSoon;
  return (
    <div className="absolute z-10" style={{ left: `${node.x}%`, top: `${node.y}%`, transform: "translate(-50%, -50%)" }}>
      <motion.button
        onClick={soon ? undefined : onClick}
        disabled={soon}
        initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.04 + index * 0.05, type: "spring", stiffness: 260, damping: 20 }}
        whileHover={soon ? undefined : { scale: 1.12 }} whileTap={soon ? undefined : { scale: 0.9 }}
        className={soon
          ? "group relative rounded-xl bg-muted/40 border border-dashed border-muted-foreground/30 px-3 py-2.5 text-center cursor-not-allowed min-w-[88px] max-w-[120px]"
          : "group relative rounded-xl bg-card/60 backdrop-blur-xl border border-blue-400/20 px-3 py-2.5 text-center hover:border-blue-400/60 hover:shadow-[0_0_28px_rgba(59,130,246,0.45)] transition-shadow min-w-[88px] max-w-[120px]"}
      >
        {!soon && <div className="absolute inset-0 rounded-xl ring-1 ring-blue-300/20 opacity-50 group-hover:opacity-100 transition-opacity animate-pulse" />}
        <span className={soon ? "block text-[11px] font-bold text-muted-foreground leading-tight" : "block text-[11px] font-bold text-foreground leading-tight"}>{node.label}</span>
        {soon ? (
          <span className="block text-[8px] text-muted-foreground/70 mt-0.5 leading-tight">(coming soon)</span>
        ) : node.subs.length > 0 ? (
          <span className="block text-[8px] text-muted-foreground mt-0.5 leading-tight">{node.subs.slice(0, 3).join(" · ")}</span>
        ) : null}
      </motion.button>
    </div>
  );
}

/* ---------- Challenge modal ---------- */

function ChallengeModal({ child, skillLabel, onClose, onPlay }) {
  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ y: 40, opacity: 0, scale: 0.98 }} animate={{ y: 0, opacity: 1, scale: 1 }} exit={{ y: 40, opacity: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 28 }}
        className="relative w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-t-3xl md:rounded-3xl bg-card/90 backdrop-blur-xl border border-blue-400/20 shadow-[0_0_60px_rgba(59,130,246,0.25)]"
      >
        {/* glow header */}
        <div className="sticky top-0 z-10 bg-gradient-to-b from-blue-600/15 to-transparent px-5 pt-5 pb-3 backdrop-blur-xl border-b border-blue-400/10">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-widest text-blue-300 mb-1">{skillLabel}</p>
              <h2 className="text-xl font-bold text-foreground">Choose your challenge</h2>
              <p className="text-xs text-muted-foreground mt-0.5">{child.label}</p>
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-full bg-muted/60 flex items-center justify-center text-muted-foreground hover:text-foreground select-none">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {child.challenges.map((ch, i) => {
            const stats = getGameStats(ch.game);
            const completion = stats.best || 0;
            if (ch.comingSoon) {
              return (
                <div
                  key={ch.name + i}
                  className="relative rounded-2xl bg-muted/30 border border-dashed border-muted-foreground/30 p-4 flex flex-col select-none min-h-[140px]"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border border-muted-foreground/30 text-muted-foreground">{ch.difficulty}</span>
                    <span className="text-[9px] font-semibold text-muted-foreground/70">(coming soon)</span>
                  </div>
                  <h3 className="text-sm font-bold text-muted-foreground/70 leading-tight mb-2">{ch.name}</h3>
                  <div className="flex items-center gap-3 text-[10px] text-muted-foreground/60 mb-2">
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {ch.time}</span>
                    <span className="flex items-center gap-1"><Zap className="w-3 h-3" /> {ch.xp} XP</span>
                  </div>
                  <div className="flex-1" />
                  <span className="text-[9px] text-muted-foreground/50 text-center">Not available yet</span>
                </div>
              );
            }
            return (
              <motion.button
                key={ch.name + i}
                initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
                whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                onClick={() => onPlay(ch)}
                className="group text-left rounded-2xl bg-gradient-to-br from-blue-500/10 to-indigo-500/5 border border-blue-400/20 p-4 hover:border-blue-400/50 hover:shadow-[0_0_24px_rgba(59,130,246,0.3)] transition-all"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${DIFF_STYLE[ch.difficulty]}`}>{ch.difficulty}</span>
                  <Play className="w-4 h-4 text-blue-400 opacity-70 group-hover:opacity-100" />
                </div>
                <h3 className="text-sm font-bold text-foreground leading-tight mb-2">{ch.name}</h3>
                <div className="flex items-center gap-3 text-[10px] text-muted-foreground mb-2">
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {ch.time}</span>
                  <span className="flex items-center gap-1"><Zap className="w-3 h-3 text-amber-400" /> {ch.xp} XP</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full"
                      initial={{ width: 0 }} animate={{ width: `${completion}%` }} transition={{ delay: 0.2 + i * 0.05 }}
                    />
                  </div>
                  <span className="text-[9px] font-semibold text-muted-foreground">{completion}%</span>
                </div>
              </motion.button>
            );
          })}
        </div>
      </motion.div>
    </motion.div>
  );
}