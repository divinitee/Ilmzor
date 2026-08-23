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
import { useSkillLoc } from "@/lib/skillHubI18n";

/* ---------- Skill tree data ---------- */

const TOP_SKILLS = [
  { id: "vocabulary", label: "Vocabulary", icon: BookOpen, hue: "from-blue-500 to-indigo-600", ring: "ring-blue-400/50", glow: "rgba(59,130,246,0.55)", color: "#3b82f6" },
  { id: "grammar", label: "Grammar", icon: SpellCheck, hue: "from-rose-500 to-red-600", ring: "ring-rose-400/50", glow: "rgba(239,68,68,0.55)", color: "#ef4444" },
  { id: "reading", label: "Reading", icon: FileText, hue: "from-amber-400 to-yellow-500", ring: "ring-amber-400/50", glow: "rgba(250,204,21,0.5)", comingSoon: true, color: "#facc15" },
  { id: "listening", label: "Listening", icon: Headphones, hue: "from-slate-200 to-white", ring: "ring-slate-200/50", glow: "rgba(248,250,252,0.55)", comingSoon: true, color: "#f8fafc" },
  { id: "writing", label: "Writing", icon: PenLine, hue: "from-blue-700 to-indigo-800", ring: "ring-blue-500/50", glow: "rgba(37,99,235,0.5)", comingSoon: true, color: "#1d4ed8" },
  { id: "speaking", label: "Speaking", icon: Mic, hue: "from-emerald-500 to-green-600", ring: "ring-emerald-400/50", glow: "rgba(34,197,94,0.55)", comingSoon: true, color: "#22c55e" },
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

/* Staggered comet phases — a bright head with a fading tail streaming hub → skill */
const PULSE_PHASES = [
  { begin: 0,    r: 3.0, fo: 0.95 },
  { begin: 0.55, r: 2.2, fo: 0.55 },
  { begin: 1.1,  r: 1.5, fo: 0.3  },
];

function StreamPulses({ color, x, y, filterId }) {
  return PULSE_PHASES.map((p, i) => (
    <circle key={i} r={p.r} fill={color} fillOpacity={p.fo} opacity={0} filter={`url(#${filterId})`}>
      <animateMotion dur="2.2s" begin={`${p.begin}s`} repeatCount="indefinite" path={`M 50 50 L ${x} ${y}`} calcMode="linear" />
      <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.22;0.7;1" dur="2.2s" begin={`${p.begin}s`} repeatCount="indefinite" />
    </circle>
  ));
}



/* ---------- Page ---------- */

export default function SkillHub({ isActive = true, user = null }) {
  const [words, setWords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userCoins, setUserCoins] = useState(null);

  const [selected, setSelected] = useState(null); // top skill id
  const [activeChild, setActiveChild] = useState(null); // subskill child zoomed into
  const [activeGame, setActiveGame] = useState(null); // { game, difficulty }
  const [soonLabel, setSoonLabel] = useState(null); // label of a coming-soon skill
  const loc = useSkillLoc();

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

        {/* Coins chip */}
        {user && (
          <div className="flex justify-center mb-2">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-400/20 text-amber-300 text-xs font-semibold select-none">
              <Star className="w-3.5 h-3.5" /> {userCoins?.coins || 0} XP
            </div>
          </div>
        )}

        {/* Mind map stage */}
        <div className="relative w-full aspect-square max-w-[560px] mx-auto min-h-[360px]" style={{ perspective: "1400px" }}>
          <AnimatePresence mode="wait">
            {!selected ? (
              <OverviewView key="overview" onSelect={setSelected} onComingSoon={(label) => setSoonLabel(label)} />
            ) : activeChild ? (
              <GamesView
                key={`games-${selected}-${activeChild.label}`}
                child={activeChild}
                skill={TOP_SKILLS.find((s) => s.id === selected)}
                onBack={() => setActiveChild(null)}
                onPlay={(challenge) => {
                  setActiveChild(null);
                  setActiveGame({ game: challenge.game, difficulty: challenge.difficulty, bank: challenge.bank, skillLabel: activeChild.label });
                }}
              />
            ) : (
              <DetailView
                key={`detail-${selected}`}
                skillId={selected}
                onBack={() => setSelected(null)}
                onPickChild={(child) => setActiveChild(child)}
                onComingSoon={(label) => setSoonLabel(label)}
              />
            )}
          </AnimatePresence>
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

/* ---------- Overview: center + 6 skills ---------- */

function OverviewView({ onSelect, onComingSoon }) {
  const loc = useSkillLoc();
  const nodes = TOP_SKILLS.map((s, i) => ({ ...s, ...pos(i, 6, 38, 36) }));
  const [hoveredId, setHoveredId] = useState(null);
  return (
    <motion.div
      className="absolute inset-0"
      initial={{ opacity: 0, scale: 0.9, filter: "blur(6px)" }} animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }} exit={{ opacity: 0, scale: 1.6, filter: "blur(10px)" }} transition={{ duration: 0.5, ease: [0.2, 0.8, 0.2, 1] }}
    >
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none" pointerEvents="none" style={{ filter: "drop-shadow(0 0 5px rgba(99,102,241,0.5))" }}>
        <defs>
          <linearGradient id="ovGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#93c5fd" />
            <stop offset="100%" stopColor="#a78bfa" />
          </linearGradient>
          <filter id="ovPulse" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="2.2" />
          </filter>
        </defs>
        {nodes.map((n) => {
          const hot = hoveredId === n.id;
          return (
            <line key={n.id} x1={50} y1={50} x2={n.x} y2={n.y}
              stroke={n.color} strokeLinecap="round" vectorEffect="non-scaling-stroke"
              strokeWidth={hot ? 1.4 : 0.7}
              style={{ opacity: hot ? 0.9 : 0.3, transition: "opacity .3s ease, stroke-width .3s ease" }} />
          );
        })}
        {nodes.map((n) => hoveredId === n.id && (
          <g key={n.id + "-p"}>
            <StreamPulses color={n.color} x={n.x} y={n.y} filterId="ovPulse" />
          </g>
        ))}
      </svg>

      {/* Center node */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          className="relative w-24 h-24 md:w-28 md:h-28"
        >
          <div className="absolute inset-0 animate-neo-float">
            <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full pointer-events-none animate-neo-breathe"
              style={{ width: "200%", height: "200%", background: "radial-gradient(closest-side, rgba(37,99,235,0.7), rgba(124,58,237,0.3) 55%, transparent 75%)", filter: "blur(26px)" }} />
            <div className="relative w-full h-full rounded-full border border-white/25 bg-white/[0.1] backdrop-blur-2xl flex flex-col items-center justify-center text-white shadow-[0_0_55px_rgba(37,99,235,0.6),inset_0_1px_0_rgba(255,255,255,0.22)]">
              <Brain className="w-7 h-7 mb-1 drop-shadow-[0_0_10px_rgba(255,255,255,0.6)]" />
              <span className="text-[10px] font-bold tracking-wide leading-none text-center px-2">{loc("ui.center")}</span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Skill nodes */}
      {nodes.map((n, i) => (
        <SkillNode key={n.id} node={n} index={i} onClick={() => onSelect(n.id)} onComingSoon={onComingSoon} hot={hoveredId === n.id}
          onHoverStart={() => setHoveredId(n.id)} onHoverEnd={() => setHoveredId(null)} />
      ))}
    </motion.div>
  );
}

/* ---------- Detail: selected skill as hub + children ---------- */

function DetailView({ skillId, onBack, onPickChild, onComingSoon }) {
  const loc = useSkillLoc();
  const skill = TOP_SKILLS.find((s) => s.id === skillId);
  const children = SKILL_CHILDREN[skillId] || [];
  const n = children.length;
  const rx = n > 6 ? 42 : 38;
  const ry = n > 6 ? 40 : 36;
  const nodes = children.map((c, i) => ({ ...c, ...pos(i, n, rx, ry) }));
  const [hoveredLabel, setHoveredLabel] = useState(null);

  return (
    <motion.div
      className="absolute inset-0"
      initial={{ opacity: 0, scale: 0.4, filter: "blur(10px)" }} animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }} exit={{ opacity: 0, scale: 1.6, filter: "blur(10px)" }} transition={{ duration: 0.55, ease: [0.2, 0.8, 0.2, 1] }}
    >
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none" pointerEvents="none" style={{ filter: "drop-shadow(0 0 5px rgba(139,92,246,0.4))" }}>
        <defs>
          <linearGradient id="dtGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#c4b5fd" />
            <stop offset="100%" stopColor="#93c5fd" />
          </linearGradient>
          <filter id="dtPulse" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="2.2" />
          </filter>
        </defs>
        {nodes.map((c) => {
          const hot = hoveredLabel === c.label;
          return (
            <line key={c.label} x1={50} y1={50} x2={c.x} y2={c.y}
              stroke={skill?.color || "#a78bfa"} strokeLinecap="round" vectorEffect="non-scaling-stroke"
              strokeWidth={hot ? 1.4 : 0.7}
              style={{ opacity: hot ? 0.9 : 0.3, transition: "opacity .3s ease, stroke-width .3s ease" }} />
          );
        })}
        {nodes.map((c) => hoveredLabel === c.label && (
          <g key={c.label + "-p"}>
            <StreamPulses color={skill?.color || "#a78bfa"} x={c.x} y={c.y} filterId="dtPulse" />
          </g>
        ))}
      </svg>

      {/* Hub node = selected skill */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
        <motion.button
          onClick={onBack}
          initial={{ scale: 0.8 }} animate={{ scale: 1 }}
          whileHover={{ scale: 1.06, y: -3 }} whileTap={{ scale: 0.94 }}
          className="relative w-24 h-24 md:w-28 md:h-28"
        >
          <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full pointer-events-none animate-neo-breathe"
            style={{ width: "190%", height: "190%", background: `radial-gradient(closest-side, ${skill?.glow || "rgba(99,102,241,0.6)"}, transparent 72%)`, filter: "blur(24px)" }} />
          <div className="relative w-full h-full rounded-full border border-white/20 bg-white/[0.09] backdrop-blur-2xl flex flex-col items-center justify-center text-white"
            style={{ boxShadow: `0 0 45px ${skill?.glow || "rgba(99,102,241,0.5)"}, inset 0 1px 0 rgba(255,255,255,0.18)` }}>
            <div className="absolute inset-0 rounded-full ring-1 ring-white/25" />
            {skill && <skill.icon className="w-7 h-7 mb-1 drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]" />}
            <span className="text-[11px] font-bold tracking-wide leading-none text-center px-2">{loc(skill?.label)}</span>
          </div>
        </motion.button>
      </div>

      {/* Back button */}
      <button
        onClick={onBack}
        className="absolute left-1/2 -translate-x-1/2 -bottom-1 z-20 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground bg-card/70 backdrop-blur border border-border rounded-full px-3 py-1.5 select-none"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> {loc("ui.allSkills")}
      </button>

      {/* Child nodes */}
      {nodes.map((c, i) => (
        <ChildNode key={c.label} node={c} index={i} onClick={() => onPickChild(c)} onComingSoon={onComingSoon} hot={hoveredLabel === c.label} glow={skill?.glow}
          onHoverStart={() => setHoveredLabel(c.label)} onHoverEnd={() => setHoveredLabel(null)} />
      ))}
    </motion.div>
  );
}

/* ---------- Node components ---------- */

function SkillNode({ node, index, onClick, onComingSoon, hot, onHoverStart, onHoverEnd }) {
  const loc = useSkillLoc();
  const soon = node.comingSoon;
  return (
    <div className="absolute z-10" style={{ left: `${node.x}%`, top: `${node.y}%`, transform: "translate(-50%, -50%)" }}>
      <div className="animate-neo-float">
        <motion.button
          onClick={() => (soon ? onComingSoon?.(node.label) : onClick?.())}
          onMouseEnter={onHoverStart}
          onMouseLeave={onHoverEnd}
          initial={{ scale: 0.6, opacity: 0, z: -260 }} animate={{ scale: 1, opacity: 1, z: 0 }} transition={{ delay: 0.05 + index * 0.06, type: "spring", stiffness: 200, damping: 22 }}
          whileHover={{ scale: 1.08, y: -4 }} whileTap={{ scale: 0.95 }}
          className="group relative"
          style={{ filter: soon ? undefined : `drop-shadow(0 14px 26px ${node.glow})`, transformPerspective: 700 }}
        >
          {!soon && (
            <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 -z-10 rounded-full pointer-events-none animate-neo-breathe"
              style={{ width: "140%", height: "140%", background: `radial-gradient(closest-side, ${node.glow}, transparent 72%)`, filter: "blur(16px)", opacity: 0.6 }} />
          )}
          <span
            className={`relative flex flex-col items-center justify-center text-white rounded-[28px] w-20 h-20 md:w-24 md:h-24 border backdrop-blur-xl transition-colors ${soon ? "border-white/10 bg-white/[0.03] opacity-55 group-hover:opacity-80" : "border-white/15 bg-white/[0.07] group-hover:border-white/30 group-hover:bg-white/[0.12]"} ${hot ? "skill-border-glow" : ""}`}
            style={hot ? { "--arrival-color": node.glow } : undefined}
          >
            <node.icon className={soon ? "w-6 h-6 mb-1 opacity-60" : "w-6 h-6 mb-1 drop-shadow-[0_0_8px_rgba(255,255,255,0.55)]"} />
            <span className="text-[10px] font-bold tracking-wide leading-none text-center px-1.5">{loc(node.label)}</span>
            {soon && <span className="text-[7px] font-medium leading-none mt-0.5 opacity-60">{loc("ui.soon")}</span>}
          </span>
        </motion.button>
      </div>
    </div>
  );
}

function ChildNode({ node, index, onClick, onComingSoon, hot, glow, onHoverStart, onHoverEnd }) {
  const loc = useSkillLoc();
  const soon = node.comingSoon;
  return (
    <div className="absolute z-10" style={{ left: `${node.x}%`, top: `${node.y}%`, transform: "translate(-50%, -50%)" }}>
      <div className="animate-neo-float">
        <motion.button
          onClick={() => (soon ? onComingSoon?.(node.label) : onClick?.())}
          onMouseEnter={onHoverStart}
          onMouseLeave={onHoverEnd}
          initial={{ scale: 0.5, opacity: 0, z: -260 }} animate={{ scale: 1, opacity: 1, z: 0 }} transition={{ delay: 0.04 + index * 0.05, type: "spring", stiffness: 240, damping: 22 }}
          whileHover={{ scale: 1.1, y: -3 }} whileTap={{ scale: 0.92 }}
          className="group relative min-w-[92px] max-w-[124px]"
          style={{ transformPerspective: 700 }}
        >
          {!soon && (
            <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 -z-10 rounded-2xl pointer-events-none animate-neo-breathe"
              style={{ width: "150%", height: "155%", background: "radial-gradient(closest-side, rgba(37,99,235,0.5), transparent 72%)", filter: "blur(16px)", opacity: 0.5 }} />
          )}
          <span className={`relative block text-center rounded-2xl px-3 py-2.5 border backdrop-blur-xl transition-colors ${soon ? "border-white/10 bg-white/[0.03] opacity-50 group-hover:opacity-75" : "border-white/15 bg-white/[0.06] group-hover:border-white/30 group-hover:bg-white/[0.11]"} ${hot ? "skill-border-glow" : ""}`}
            style={hot ? { "--arrival-color": glow || "rgba(99,102,241,0.5)" } : undefined}>
            <span className={soon ? "block text-[11px] font-bold text-muted-foreground leading-tight" : "block text-[11px] font-bold text-foreground leading-tight"}>{loc(node.label)}</span>
            {soon ? (
              <span className="block text-[8px] text-muted-foreground/70 mt-0.5 leading-tight">{loc("ui.soon")}</span>
            ) : node.subs.length > 0 ? (
              <span className="block text-[8px] text-muted-foreground mt-0.5 leading-tight">{node.subs.slice(0, 3).map(loc).join(" · ")}</span>
            ) : null}
          </span>
        </motion.button>
      </div>
    </div>
  );
}

/* ---------- Games: subskill hub + challenges in a web ---------- */

function GamesView({ child, skill, onBack, onPlay }) {
  const loc = useSkillLoc();
  const challenges = child.challenges;
  const n = challenges.length;
  const rx = n > 6 ? 42 : 38;
  const ry = n > 6 ? 40 : 36;
  const nodes = challenges.map((c, i) => ({ ...c, i, ...pos(i, n, rx, ry) }));
  const [hovered, setHovered] = useState(null);
  const glow = skill?.glow || "rgba(99,102,241,0.5)";
  const color = skill?.color || "#a78bfa";

  return (
    <motion.div
      className="absolute inset-0"
      initial={{ opacity: 0, scale: 0.4, filter: "blur(10px)" }} animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }} exit={{ opacity: 0, scale: 0.4, filter: "blur(10px)" }} transition={{ duration: 0.55, ease: [0.2, 0.8, 0.2, 1] }}
      style={{ transformStyle: "preserve-3d" }}
    >
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none" pointerEvents="none" style={{ filter: `drop-shadow(0 0 5px ${glow})` }}>
        <defs>
          <filter id="gmPulse" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="2.2" />
          </filter>
        </defs>
        {nodes.map((c) => {
          const hot = hovered === c.i;
          return (
            <line key={"g" + c.i} x1={50} y1={50} x2={c.x} y2={c.y}
              stroke={color} strokeLinecap="round" vectorEffect="non-scaling-stroke"
              strokeWidth={hot ? 1.4 : 0.7}
              style={{ opacity: hot ? 0.9 : 0.3, transition: "opacity .3s ease, stroke-width .3s ease" }} />
          );
        })}
        {nodes.map((c) => hovered === c.i && (
          <g key={"gp" + c.i}>
            <StreamPulses color={color} x={c.x} y={c.y} filterId="gmPulse" />
          </g>
        ))}
      </svg>

      {/* Hub node = subskill (child) */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
        <motion.button
          onClick={onBack}
          initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          whileHover={{ scale: 1.06, y: -3 }} whileTap={{ scale: 0.94 }}
          className="relative w-24 h-24 md:w-28 md:h-28"
        >
          <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full pointer-events-none animate-neo-breathe"
            style={{ width: "190%", height: "190%", background: `radial-gradient(closest-side, ${glow}, transparent 72%)`, filter: "blur(24px)" }} />
          <div className="relative w-full h-full rounded-full border border-white/20 bg-white/[0.09] backdrop-blur-2xl flex flex-col items-center justify-center text-white"
            style={{ boxShadow: `0 0 45px ${glow}, inset 0 1px 0 rgba(255,255,255,0.18)` }}>
            <div className="absolute inset-0 rounded-full ring-1 ring-white/25" />
            <Sparkles className="w-6 h-6 mb-1 drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]" />
            <span className="text-[10px] font-bold tracking-wide leading-none text-center px-2">{loc(child.label)}</span>
          </div>
        </motion.button>
      </div>

      {/* Back button */}
      <button onClick={onBack} className="absolute left-1/2 -translate-x-1/2 -bottom-1 z-20 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground bg-card/70 backdrop-blur border border-border rounded-full px-3 py-1.5 select-none">
        <ArrowLeft className="w-3.5 h-3.5" /> {loc(skill?.label)}
      </button>

      {/* Game nodes */}
      {nodes.map((c) => (
        <GameNode key={"gn" + c.i} node={c} onClick={() => onPlay(c)} hot={hovered === c.i} glow={glow}
          onHoverStart={() => setHovered(c.i)} onHoverEnd={() => setHovered(null)} />
      ))}
    </motion.div>
  );
}

function GameNode({ node, onClick, hot, glow, onHoverStart, onHoverEnd }) {
  const loc = useSkillLoc();
  const soon = node.comingSoon;
  const completion = getGameStats(node.game).best || 0;
  return (
    <div className="absolute z-10" style={{ left: `${node.x}%`, top: `${node.y}%`, transform: "translate(-50%, -50%)" }}>
      <div className="animate-neo-float">
        <motion.button
          onClick={() => (soon ? null : onClick?.())}
          onMouseEnter={onHoverStart}
          onMouseLeave={onHoverEnd}
          initial={{ scale: 0.4, opacity: 0, z: -260 }} animate={{ scale: 1, opacity: 1, z: 0 }} transition={{ delay: 0.05 + node.i * 0.06, type: "spring", stiffness: 220, damping: 22 }}
          whileHover={{ scale: 1.08, y: -3 }} whileTap={{ scale: 0.95 }}
          className="group relative min-w-[96px] max-w-[128px]"
          style={{ transformPerspective: 700 }}
        >
          {!soon && (
            <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 -z-10 rounded-2xl pointer-events-none animate-neo-breathe"
              style={{ width: "150%", height: "155%", background: `radial-gradient(closest-side, ${glow}, transparent 72%)`, filter: "blur(16px)", opacity: 0.5 }} />
          )}
          <span className={`relative block text-center rounded-2xl px-3 py-2.5 border backdrop-blur-xl transition-colors ${soon ? "border-white/10 bg-white/[0.03] opacity-50" : "border-white/15 bg-white/[0.06] group-hover:border-white/30 group-hover:bg-white/[0.11]"} ${hot ? "skill-border-glow" : ""}`}
            style={hot ? { "--arrival-color": glow } : undefined}>
            <span className="block text-[11px] font-bold text-foreground leading-tight">{loc(node.name)}</span>
            <span className={`mt-1 inline-block text-[8px] font-bold px-1.5 py-0.5 rounded-full border ${DIFF_STYLE[node.difficulty]}`}>{loc(node.difficulty)}</span>
            <span className="mt-1 flex items-center justify-center gap-2 text-[8px] text-muted-foreground leading-tight">
              <span className="flex items-center gap-0.5"><Clock className="w-2.5 h-2.5" />{loc(node.time)}</span>
              <span className="flex items-center gap-0.5"><Zap className="w-2.5 h-2.5 text-amber-400" />{node.xp}</span>
            </span>
            {!soon && completion > 0 && (
              <span className="block text-[8px] text-muted-foreground/70 mt-0.5">{completion}%</span>
            )}
          </span>
        </motion.button>
      </div>
    </div>
  );
}