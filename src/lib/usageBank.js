// ---------------------------------------------------------------------------
// Hand-authored content banks for the two Usage modes that have no existing
// data source: sentence_repair and collocation_match.
//
// fill_blank and best_word do NOT use this file — they draw from
// VocabularyWord.example_en and synonymTiers.js respectively, both of which
// already have sufficient coverage (example_en ~98% fill, ~300 ladder
// entries). Same "check before authoring" principle the brief requires.
//
// POOL SIZES: 20 entries each — enough for repeat play at the round sizes
// the engine uses (6 per round at intermediate tier = 30% of the pool).
// Full coverage flagged as a content-authoring followup.
// ---------------------------------------------------------------------------

// sentence_repair: each entry has a sentence with one deliberately wrong word
// (wrong word choice, not a grammar error — that's Grammar's job). The student
// picks the correct replacement from 4 options.
export const SENTENCE_REPAIR_BANK = [
  { sentence: "She did a photo of her family.",        wrong: "did",       correct: "took",      distractors: ["made", "got", "shot"] },
  { sentence: "He did a mistake on the test.",          wrong: "did",       correct: "made",      distractors: ["took", "had", "got"] },
  { sentence: "I want to make my homework now.",        wrong: "make",     correct: "do",        distractors: ["take", "get", "have"] },
  { sentence: "Can you say me the time?",               wrong: "say",      correct: "tell",      distractors: ["talk", "speak", "give"] },
  { sentence: "She told that she was tired.",           wrong: "told",     correct: "said",      distractors: ["spoke", "talked", "explained"] },
  { sentence: "I borrowed him my car for the weekend.", wrong: "borrowed", correct: "lent",      distractors: ["gave", "rented", "handed"] },
  { sentence: "The teacher learned us English.",        wrong: "learned",  correct: "taught",    distractors: ["showed", "told", "gave"] },
  { sentence: "She is very sensible about criticism.",  wrong: "sensible", correct: "sensitive", distractors: ["careful", "aware", "concerned"] },
  { sentence: "He succeeded the exam last week.",      wrong: "succeeded",correct: "passed",    distractors: ["made", "took", "did"] },
  { sentence: "I want to watch a photo of your dog.",  wrong: "watch",    correct: "see",       distractors: ["look", "view", "show"] },
  { sentence: "Can you learn me how to swim?",          wrong: "learn",    correct: "teach",     distractors: ["show", "tell", "give"] },
  { sentence: "He said me to be careful.",              wrong: "said",     correct: "told",      distractors: ["spoke", "talked", "asked"] },
  { sentence: "She suggested him to take a break.",     wrong: "suggested",correct: "advised",   distractors: ["told", "asked", "wanted"] },
  { sentence: "The soup tastes very well.",             wrong: "well",     correct: "good",      distractors: ["nice", "fine", "great"] },
  { sentence: "The machine works very good.",          wrong: "good",     correct: "well",      distractors: ["nice", "fine", "great"] },
  { sentence: "She made a lot of exercises yesterday.",wrong: "made",     correct: "did",       distractors: ["took", "got", "had"] },
  { sentence: "He has a heavy problem with his car.",  wrong: "heavy",    correct: "serious",   distractors: ["big", "large", "strong"] },
  { sentence: "The price is very expensive.",          wrong: "expensive",correct: "high",      distractors: ["big", "large", "much"] },
  { sentence: "I did a lot of money from my business.",wrong: "did",      correct: "made",      distractors: ["got", "took", "earned"] },
  { sentence: "She stole the bank and took the money.", wrong: "stole",    correct: "robbed",    distractors: ["took", "broke", "hit"] },
];

// collocation_match: each entry has a prompt with a blank and the student
// picks the word that forms a natural fixed expression.
export const COLLOCATION_BANK = [
  { prompt: "make a ___",      correct: "decision",  distractors: ["conclusion", "result", "ending"] },
  { prompt: "pay ___",          correct: "attention",  distractors: ["focus", "mind", "care"] },
  { prompt: "catch a ___",      correct: "cold",      distractors: ["headache", "pain", "sore"] },
  { prompt: "keep a ___",       correct: "secret",    distractors: ["mystery", "hidden", "private"] },
  { prompt: "save ___",         correct: "time",      distractors: ["minutes", "hours", "moments"] },
  { prompt: "have a ___",       correct: "look",      distractors: ["see", "watch", "view"] },
  { prompt: "come ___",         correct: "true",      distractors: ["real", "right", "correct"] },
  { prompt: "do the ___",       correct: "dishes",    distractors: ["plates", "cups", "spoons"] },
  { prompt: "create a ___",     correct: "mess",      distractors: ["dirt", "chaos", "junk"] },
  { prompt: "take ___",         correct: "care",      distractors: ["worry", "fear", "caution"] },
  { prompt: "break the ___",    correct: "news",      distractors: ["story", "report", "information"] },
  { prompt: "keep in ___",      correct: "touch",     distractors: ["contact", "reach", "mind"] },
  { prompt: "make ___",         correct: "sense",     distractors: ["meaning", "logic", "reason"] },
  { prompt: "take ___",         correct: "turns",     distractors: ["rounds", "goes", "tries"] },
  { prompt: "come to ___",      correct: "mind",      distractors: ["brain", "head", "thought"] },
  { prompt: "get a ___",        correct: "chance",    distractors: ["luck", "turn", "time"] },
  { prompt: "pay a ___",        correct: "visit",     distractors: ["call", "trip", "stop"] },
  { prompt: "get into ___",     correct: "trouble",   distractors: ["problem", "difficulty", "danger"] },
  { prompt: "lose ___",         correct: "weight",    distractors: ["fat", "kilos", "size"] },
  { prompt: "take a ___",       correct: "seat",      distractors: ["chair", "place", "spot"] },
];