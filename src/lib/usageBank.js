// ---------------------------------------------------------------------------
// Hand-authored content banks for the three Usage modes that have no existing
// dynamic data source: best_word, sentence_repair, and collocation_match.
//
// fill_blank does NOT use this file — it draws from VocabularyWord.example_en,
// which already has ~98% fill rate.
//
// POOL SIZES: 15-20 entries each — enough for repeat play at the round sizes
// the engine uses (6-12 per round = 30-60% of the pool).
// ---------------------------------------------------------------------------

// best_word: each entry has a sentence with a blank (_____) where exactly one
// word is the defensibly correct choice. Distractors are hand-picked per item
// (not pulled raw from a synonym ladder) so that exactly one answer is right —
// the sentence context eliminates the distractors, not just register/nuance.
export const BEST_WORD_BANK = [
  { sentence: "The medicine had a strong _____ on her headache.",       correct: "effect",   distractors: ["result", "outcome", "purpose"] },
  { sentence: "He _____ a promise to visit his grandmother.",           correct: "made",     distractors: ["said", "spoke", "did"] },
  { sentence: "The storm _____ serious damage to the roof.",            correct: "caused",   distractors: ["brought", "produced", "created"] },
  { sentence: "She _____ great pride in her children's success.",       correct: "takes",    distractors: ["makes", "does", "gives"] },
  { sentence: "The students _____ attention to the teacher's explanation.", correct: "paid",  distractors: ["spent", "put", "placed"] },
  { sentence: "He _____ a deep breath and jumped into the pool.",       correct: "took",     distractors: ["made", "did", "caught"] },
  { sentence: "The company _____ a profit for the first time this year.", correct: "made",    distractors: ["did", "performed", "produced"] },
  { sentence: "She _____ a good impression at the job interview.",      correct: "made",     distractors: ["did", "took", "put"] },
  { sentence: "The plane will _____ off at exactly 3 PM.",              correct: "take",     distractors: ["go", "get", "leave"] },
  { sentence: "I need to _____ an appointment with the dentist.",       correct: "make",     distractors: ["do", "have", "give"] },
  { sentence: "She _____ a cold from standing in the rain.",             correct: "caught",   distractors: ["received", "picked", "held"] },
  { sentence: "The book _____ a huge influence on my life.",             correct: "had",      distractors: ["made", "took", "gave"] },
  { sentence: "He _____ his best to win the competition.",               correct: "did",      distractors: ["made", "put", "had"] },
  { sentence: "The noise _____ him from concentrating.",                  correct: "distracted", distractors: ["disturbed", "bothered", "interrupted"] },
  { sentence: "She _____ a lot of research on the topic.",               correct: "did",      distractors: ["made", "took", "had"] },
];

// sentence_repair: each entry has a sentence with one deliberately wrong word
// (wrong word choice, not a grammar error — that's Grammar's job). The student
// picks the correct replacement from 4 options. Every distractor is
// unambiguously incorrect — not just less common — in the specific sentence
// context shown.
export const SENTENCE_REPAIR_BANK = [
  { sentence: "She did a photo of her family.",        wrong: "did",       correct: "took",      distractors: ["made", "got", "caught"] },
  { sentence: "He did a mistake on the test.",          wrong: "did",       correct: "made",      distractors: ["took", "put", "got"] },
  { sentence: "I want to make my homework now.",        wrong: "make",     correct: "do",        distractors: ["take", "get", "have"] },
  { sentence: "Can you say me the time?",               wrong: "say",      correct: "tell",      distractors: ["talk", "speak", "pass"] },
  { sentence: "She told that she was tired.",           wrong: "told",     correct: "said",      distractors: ["spoke", "talked", "chatted"] },
  { sentence: "I borrowed him my car for the weekend.", wrong: "borrowed", correct: "lent",      distractors: ["took", "rented", "handed"] },
  { sentence: "The teacher learned us English.",        wrong: "learned",  correct: "taught",    distractors: ["read", "told", "brought"] },
  { sentence: "She is very sensible to criticism.",    wrong: "sensible", correct: "sensitive", distractors: ["careful", "aware", "concerned"] },
  { sentence: "He succeeded the exam last week.",      wrong: "succeeded",correct: "passed",    distractors: ["made", "met", "saw"] },
  { sentence: "I want to watch a photo of your dog.",  wrong: "watch",    correct: "see",       distractors: ["look", "make", "draw"] },
  { sentence: "Can you learn me how to swim?",          wrong: "learn",    correct: "teach",     distractors: ["study", "read", "give"] },
  { sentence: "He said me to be careful.",              wrong: "said",     correct: "told",      distractors: ["spoke", "talked", "called"] },
  { sentence: "She suggested him to take a break.",     wrong: "suggested",correct: "advised",   distractors: ["said", "spoke", "talked"] },
  { sentence: "The soup tastes very well.",             wrong: "well",     correct: "good",      distractors: ["badly", "quickly", "sweetly"] },
  { sentence: "The machine works very good.",          wrong: "good",     correct: "well",      distractors: ["poor", "rough", "weak"] },
  { sentence: "She made a lot of exercises yesterday.",wrong: "made",     correct: "did",       distractors: ["took", "went", "put"] },
  { sentence: "He has a heavy problem with his car.",  wrong: "heavy",    correct: "serious",   distractors: ["tall", "wide", "strong"] },
  { sentence: "The price is very expensive.",          wrong: "expensive",correct: "high",      distractors: ["tall", "wide", "much"] },
  { sentence: "I did a lot of money from my business.",wrong: "did",      correct: "made",      distractors: ["went", "put", "spent"] },
  { sentence: "She stole the bank and took the money.", wrong: "stole",    correct: "robbed",    distractors: ["took", "found", "hit"] },
];

// collocation_match: each entry has a prompt with a blank and the student
// picks the word that forms a natural fixed expression. Every distractor is
// unambiguously incorrect — not just less common — as a collocation partner.
export const COLLOCATION_BANK = [
  { prompt: "make a ___",      correct: "decision",  distractors: ["conclusion", "result", "ending"] },
  { prompt: "pay ___",          correct: "attention",  distractors: ["focus", "mind", "care"] },
  { prompt: "catch a ___",      correct: "cold",      distractors: ["headache", "pain", "sore"] },
  { prompt: "keep a ___",       correct: "secret",    distractors: ["mystery", "hidden", "private"] },
  { prompt: "save ___",         correct: "time",      distractors: ["luck", "fate", "chance"] },
  { prompt: "have a ___",       correct: "look",      distractors: ["sight", "gaze", "blink"] },
  { prompt: "come ___",         correct: "true",      distractors: ["real", "wrong", "false"] },
  { prompt: "do the ___",       correct: "dishes",    distractors: ["plates", "cups", "spoons"] },
  { prompt: "create a ___",     correct: "mess",      distractors: ["dirt", "dust", "trash"] },
  { prompt: "take ___",         correct: "care",      distractors: ["worry", "fear", "danger"] },
  { prompt: "break the ___",    correct: "news",      distractors: ["tale", "report", "information"] },
  { prompt: "keep in ___",      correct: "touch",     distractors: ["connection", "reach", "brain"] },
  { prompt: "make ___",         correct: "sense",     distractors: ["purpose", "logic", "reason"] },
  { prompt: "take ___",         correct: "turns",     distractors: ["circles", "goes", "tries"] },
  { prompt: "come to ___",      correct: "mind",      distractors: ["brain", "head", "thought"] },
  { prompt: "get a ___",        correct: "chance",    distractors: ["luck", "fate", "doom"] },
  { prompt: "pay a ___",        correct: "visit",     distractors: ["chat", "trip", "stop"] },
  { prompt: "get into ___",     correct: "trouble",   distractors: ["problem", "mistake", "fear"] },
  { prompt: "lose ___",         correct: "weight",    distractors: ["height", "meters", "size"] },
  { prompt: "take a ___",       correct: "seat",      distractors: ["door", "wall", "ceiling"] },
];