// ---------------------------------------------------------------------------
// Hand-authored content banks for the four Word Forms modes.
//
// Same pattern as OddOneOutGame's ODD_ONE_OUT_BANK: a fixed, curated set
// independent of the VocabularyWord library, so the game never calls
// InvokeLLM (the old engine's per-round AI cost bug). Each mode filters to
// only the entries that have the data it needs, so partial coverage degrades
// to "not enough words for this game yet" rather than crashing.
//
// POOL SIZES (current):
//   WORD_FAMILY_BANK:  20 entries — all have noun/verb/adjective/adverb
//   PREFIX_BANK:       20 entries — all have base/prefix/meaning/result
//   SUFFIX_BANK:       20 entries — all have base/suffix/pos/result/meaning
//   ROOT_BANK:         12 groups — each has root/meaning + 4 members
//
// Flagged as a content-authoring followup: these pools are thin for repeat
// play (a round of 6 = 30% of the pool; after 3-4 rounds you've seen most
// entries). More entries and a CEFR level per entry would enable per-level
// filtering and personalization.
// ---------------------------------------------------------------------------

export const WORD_FAMILY_BANK = [
  { base: "beauty",   noun: "beauty",       verb: "beautify",   adjective: "beautiful",   adverb: "beautifully" },
  { base: "success",  noun: "success",      verb: "succeed",    adjective: "successful",  adverb: "successfully" },
  { base: "danger",   noun: "danger",       verb: "endanger",   adjective: "dangerous",   adverb: "dangerously" },
  { base: "power",    noun: "power",        verb: "empower",    adjective: "powerful",    adverb: "powerfully" },
  { base: "act",      noun: "action",       verb: "act",        adjective: "active",      adverb: "actively" },
  { base: "create",   noun: "creation",     verb: "create",     adjective: "creative",    adverb: "creatively" },
  { base: "hope",     noun: "hope",         verb: "hope",       adjective: "hopeful",     adverb: "hopefully" },
  { base: "care",     noun: "care",         verb: "care",       adjective: "careful",     adverb: "carefully" },
  { base: "help",     noun: "help",         verb: "help",       adjective: "helpful",      adverb: "helpfully" },
  { base: "thought",  noun: "thought",      verb: "think",      adjective: "thoughtful",  adverb: "thoughtfully" },
  { base: "wonder",   noun: "wonder",       verb: "wonder",     adjective: "wonderful",   adverb: "wonderfully" },
  { base: "peace",    noun: "peace",        verb: "pacify",     adjective: "peaceful",    adverb: "peacefully" },
  { base: "joy",      noun: "joy",          verb: "enjoy",      adjective: "joyful",      adverb: "joyfully" },
  { base: "strength", noun: "strength",     verb: "strengthen", adjective: "strong",      adverb: "strongly" },
  { base: "anger",    noun: "anger",        verb: "anger",      adjective: "angry",       adverb: "angrily" },
  { base: "use",      noun: "use",          verb: "use",        adjective: "useful",       adverb: "usefully" },
  { base: "force",    noun: "force",        verb: "force",      adjective: "forceful",    adverb: "forcefully" },
  { base: "play",     noun: "play",         verb: "play",       adjective: "playful",     adverb: "playfully" },
  { base: "color",    noun: "color",        verb: "color",      adjective: "colorful",    adverb: "colorfully" },
  { base: "pain",     noun: "pain",         verb: "pain",       adjective: "painful",     adverb: "painfully" },
];

export const PREFIX_BANK = [
  { base: "happy",      prefix: "un-",  meaning: "not happy",        result: "unhappy" },
  { base: "do",         prefix: "re-",  meaning: "do again",        result: "redo" },
  { base: "like",       prefix: "dis-", meaning: "not like",        result: "dislike" },
  { base: "understand", prefix: "mis-", meaning: "understand wrongly", result: "misunderstand" },
  { base: "view",       prefix: "pre-", meaning: "see before",      result: "preview" },
  { base: "stop",       prefix: "non-", meaning: "not stopping",    result: "nonstop" },
  { base: "fair",       prefix: "un-",  meaning: "not fair",        result: "unfair" },
  { base: "write",      prefix: "re-",  meaning: "write again",    result: "rewrite" },
  { base: "agree",      prefix: "dis-", meaning: "not agree",      result: "disagree" },
  { base: "take",       prefix: "mis-", meaning: "take wrongly",   result: "mistake" },
  { base: "cook",       prefix: "pre-", meaning: "cook before",    result: "precook" },
  { base: "sense",      prefix: "non-", meaning: "not sense",      result: "nonsense" },
  { base: "lock",       prefix: "un-",  meaning: "not locked",     result: "unlock" },
  { base: "build",      prefix: "re-",  meaning: "build again",    result: "rebuild" },
  { base: "appear",     prefix: "dis-", meaning: "not appear",    result: "disappear" },
  { base: "lead",       prefix: "mis-", meaning: "lead wrongly",   result: "mislead" },
  { base: "pay",        prefix: "pre-", meaning: "pay before",     result: "prepay" },
  { base: "fiction",    prefix: "non-", meaning: "not fiction",    result: "nonfiction" },
  { base: "pack",       prefix: "un-",  meaning: "not packed",     result: "unpack" },
  { base: "play",       prefix: "re-",  meaning: "play again",     result: "replay" },
];

export const SUFFIX_BANK = [
  { base: "act",     suffix: "-tion", pos: "noun",      result: "action",    meaning: "the process of acting" },
  { base: "happy",   suffix: "-ness", pos: "noun",      result: "happiness", meaning: "the state of being happy" },
  { base: "beauty",  suffix: "-ful",  pos: "adjective", result: "beautiful", meaning: "full of beauty" },
  { base: "quick",   suffix: "-ly",   pos: "adverb",    result: "quickly",   meaning: "in a quick way" },
  { base: "read",    suffix: "-able", pos: "adjective", result: "readable",  meaning: "able to be read" },
  { base: "teach",   suffix: "-er",   pos: "noun",      result: "teacher",   meaning: "one who teaches" },
  { base: "create",  suffix: "-tion", pos: "noun",      result: "creation",  meaning: "the process of creating" },
  { base: "sad",     suffix: "-ness", pos: "noun",      result: "sadness",   meaning: "the state of being sad" },
  { base: "hope",    suffix: "-ful",  pos: "adjective", result: "hopeful",   meaning: "full of hope" },
  { base: "slow",    suffix: "-ly",   pos: "adverb",    result: "slowly",    meaning: "in a slow way" },
  { base: "use",     suffix: "-able", pos: "adjective", result: "usable",   meaning: "able to be used" },
  { base: "work",    suffix: "-er",   pos: "noun",      result: "worker",    meaning: "one who works" },
  { base: "educate", suffix: "-tion", pos: "noun",      result: "education", meaning: "the process of educating" },
  { base: "kind",    suffix: "-ness", pos: "noun",      result: "kindness",  meaning: "the state of being kind" },
  { base: "care",    suffix: "-ful",  pos: "adjective", result: "careful",   meaning: "full of care" },
  { base: "loud",    suffix: "-ly",   pos: "adverb",    result: "loudly",    meaning: "in a loud way" },
  { base: "love",    suffix: "-able", pos: "adjective", result: "lovable",   meaning: "able to be loved" },
  { base: "lead",    suffix: "-er",   pos: "noun",      result: "leader",    meaning: "one who leads" },
  { base: "protect", suffix: "-tion", pos: "noun",      result: "protection", meaning: "the process of protecting" },
  { base: "dark",    suffix: "-ness", pos: "noun",      result: "darkness",  meaning: "the state of being dark" },
];

export const ROOT_BANK = [
  { root: "port",   meaning: "carry",  members: ["transport", "import", "export", "report"] },
  { root: "struct", meaning: "build",  members: ["structure", "construct", "instruct", "obstruct"] },
  { root: "dict",   meaning: "say",    members: ["dictionary", "predict", "dictate", "contradict"] },
  { root: "ject",   meaning: "throw",  members: ["inject", "reject", "eject", "project"] },
  { root: "tract",  meaning: "pull",   members: ["attract", "distract", "tractor", "extract"] },
  { root: "vis",    meaning: "see",    members: ["vision", "visible", "visit", "visual"] },
  { root: "spect",  meaning: "look",   members: ["inspect", "respect", "suspect", "spectacle"] },
  { root: "graph",  meaning: "write",  members: ["autograph", "photograph", "paragraph", "telegraph"] },
  { root: "mit",    meaning: "send",   members: ["transmit", "submit", "permit", "omit"] },
  { root: "form",   meaning: "shape",  members: ["transform", "reform", "inform", "formula"] },
  { root: "press",  meaning: "push",   members: ["compress", "express", "impress", "pressure"] },
  { root: "pose",   meaning: "place",  members: ["compose", "expose", "oppose", "propose"] },
];

export const PREFIXES = ["un-", "re-", "dis-", "mis-", "pre-", "non-"];
export const SUFFIXES = ["-tion", "-ness", "-ful", "-ly", "-able", "-er"];