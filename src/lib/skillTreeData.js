import { BookOpen, SpellCheck, FileText, Headphones, PenLine, Mic } from "lucide-react";

export const TOP_SKILLS = [
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

export const SKILL_CHILDREN = {
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
    C("Usage", ["Example sentences", "Fill in the blank", "Common mistakes"], gen(["Fill the Blank", "Choose the Best Word", "Sentence Repair"], "sentence")),
    C("Phrases & Chunks", ["Collocations", "Fixed expressions"], gen(["Collocation Match"], "sentence")),
    C("Relationships", ["Synonyms", "Antonyms", "Related words"], gen(["Synonym Sprint", "Antonym Hunt", "Related Words", "Connection Challenge"], "quiz")),
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

export const DIFF_STYLE = {
  Easy: "text-emerald-300 bg-emerald-500/10 border-emerald-400/30",
  Medium: "text-amber-300 bg-amber-500/10 border-amber-400/30",
  Hard: "text-rose-300 bg-rose-500/10 border-rose-400/30",
};
export const DIFF_TO_GAME = { Easy: "beginner", Medium: "intermediate", Hard: "advanced" };

export const pos = (i, n, rx, ry) => {
  const a = (-90 + (i / n) * 360) * (Math.PI / 180);
  return { x: 50 + rx * Math.cos(a), y: 50 + ry * Math.sin(a) };
};

export const PULSE_PHASES = [
  { begin: 0, r: 3.0, fo: 0.95 },
  { begin: 0.55, r: 2.2, fo: 0.55 },
  { begin: 1.1, r: 1.5, fo: 0.3 },
];