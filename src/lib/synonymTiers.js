// Reader-relative SYNONYM tiers — the clue ladder Context Guess runs on.
//
// Exact mirror of definitionTiers.js's idea, with synonyms instead of
// definitions: for one word, the clue shown is a different word depending on
// who is looking at it. Tee's canonical example, `rotten` in "The apple was
// rotten":
//     A2 "bad" → B1 "awful" → B2 "spoiled" → C1 "putrid"
// Same escalation of precision/register at each step, and deliberately no
// syn_a1 — an A1 student reads the support-language translation and that is
// the whole story at that level, exactly as definitionTiers.js has no def_a1.
//
// CONTENT PATH (2026-09-07): pilot set, not a full enrichment batch. The
// definition batch had a head start — english_definition was already on all
// 2,282 rows, so def_a2..def_c1 were a rewrite of existing text. Synonyms
// start from zero, and a four-tier ladder is much less mechanical than a
// definition rewrite: "the most precise uncommon synonym" is a real editorial
// judgement per word, and a wrong rung (a near-synonym that doesn't actually
// fit the sentence) makes the game teach something false. So the ladders below
// are hand-authored, offline, against words verified to exist in the live pool,
// and the game filters its pool to words that have a ladder — the same
// "not enough words for this game yet" degradation Picture Match uses for
// words with no emoji. Full-corpus coverage is a followup batch.
//
// FORWARD-COMPATIBLE: resolution reads VocabularyWord.syn_a2..syn_c1 FIRST and
// only falls back to this module. When the enrichment batch lands, the rows it
// fills start winning automatically with no engine change; a ladder can be
// deleted from here once its rows are covered.
//
// Never generated at play time — no InvokeLLM anywhere in this path.

export const SYN_FIELD = { A2: "syn_a2", B1: "syn_b1", B2: "syn_b2", C1: "syn_c1" };

// word → [A2, B1, B2, C1], authored as a rising precision ladder.
// Tuples rather than objects purely to keep 170 ladders readable.
const LADDER = {
  // ---- states & qualities ----
  rotten: ["bad", "awful", "spoiled", "putrid"],
  old: ["not new", "aged", "elderly", "venerable"],
  big: ["large", "huge", "enormous", "colossal"],
  small: ["little", "tiny", "minute", "diminutive"],
  happy: ["glad", "pleased", "delighted", "elated"],
  sad: ["unhappy", "miserable", "sorrowful", "despondent"],
  angry: ["mad", "furious", "enraged", "livid"],
  afraid: ["scared", "frightened", "terrified", "petrified"],
  tired: ["sleepy", "exhausted", "weary", "fatigued"],
  hungry: ["empty", "starving", "famished", "ravenous"],
  cold: ["cool", "chilly", "freezing", "frigid"],
  hot: ["warm", "boiling", "scorching", "sweltering"],
  wet: ["damp", "soaked", "drenched", "saturated"],
  dry: ["not wet", "dried", "parched", "arid"],
  clean: ["tidy", "spotless", "immaculate", "pristine"],
  dirty: ["messy", "filthy", "grimy", "squalid"],
  loud: ["noisy", "booming", "deafening", "thunderous"],
  quiet: ["silent", "hushed", "faint", "inaudible"],
  fast: ["quick", "rapid", "swift", "expeditious"],
  slow: ["not fast", "sluggish", "unhurried", "languid"],
  strong: ["powerful", "sturdy", "robust", "formidable"],
  weak: ["not strong", "feeble", "frail", "infirm"],
  easy: ["simple", "effortless", "straightforward", "elementary"],
  hard: ["difficult", "tough", "demanding", "arduous"],
  rich: ["wealthy", "well-off", "affluent", "opulent"],
  poor: ["not rich", "broke", "impoverished", "destitute"],
  beautiful: ["pretty", "lovely", "gorgeous", "exquisite"],
  ugly: ["not pretty", "unattractive", "hideous", "grotesque"],
  funny: ["amusing", "comical", "hilarious", "droll"],
  strange: ["odd", "weird", "peculiar", "bizarre"],
  important: ["big", "serious", "significant", "paramount"],
  famous: ["well-known", "celebrated", "renowned", "illustrious"],
  brave: ["bold", "fearless", "courageous", "intrepid"],
  clever: ["smart", "bright", "intelligent", "astute"],
  stupid: ["silly", "foolish", "unwise", "inane"],
  kind: ["nice", "caring", "compassionate", "benevolent"],
  rude: ["not polite", "impolite", "discourteous", "insolent"],
  polite: ["nice", "well-mannered", "courteous", "civil"],
  honest: ["truthful", "sincere", "candid", "forthright"],
  lazy: ["not active", "idle", "inactive", "indolent"],
  busy: ["full", "occupied", "hectic", "frenetic"],
  calm: ["quiet", "relaxed", "composed", "serene"],
  nervous: ["worried", "anxious", "uneasy", "apprehensive"],
  lonely: ["alone", "lonesome", "isolated", "forlorn"],
  proud: ["pleased", "satisfied", "gratified", "exultant"],
  jealous: ["upset", "envious", "resentful", "covetous"],
  shy: ["quiet", "timid", "reserved", "diffident"],
  rare: ["not common", "uncommon", "scarce", "sporadic"],
  common: ["normal", "usual", "widespread", "ubiquitous"],
  new: ["not old", "recent", "modern", "novel"],
  cheap: ["low-priced", "inexpensive", "affordable", "economical"],
  expensive: ["dear", "costly", "pricey", "exorbitant"],
  empty: ["with nothing", "bare", "vacant", "void"],
  full: ["filled", "packed", "crammed", "replete"],
  heavy: ["not light", "weighty", "hefty", "ponderous"],
  light: ["not heavy", "featherlight", "weightless", "gossamer"],
  narrow: ["thin", "tight", "slender", "constricted"],
  wide: ["broad", "spacious", "expansive", "capacious"],
  deep: ["far down", "profound", "bottomless", "abyssal"],
  sharp: ["pointed", "keen", "acute", "incisive"],
  smooth: ["even", "sleek", "glossy", "silken"],
  rough: ["not smooth", "coarse", "jagged", "abrasive"],
  soft: ["not hard", "tender", "supple", "yielding"],
  bright: ["light", "shining", "radiant", "luminous"],
  dark: ["not light", "dim", "gloomy", "murky"],
  safe: ["not dangerous", "secure", "protected", "inviolable"],
  dangerous: ["not safe", "risky", "hazardous", "perilous"],
  sick: ["ill", "unwell", "ailing", "indisposed"],
  healthy: ["well", "fit", "robust", "hale"],
  fresh: ["new", "crisp", "unspoiled", "newly-made"],
  ancient: ["very old", "age-old", "antique", "primordial"],
  huge: ["very big", "massive", "immense", "gargantuan"],
  tiny: ["very small", "minute", "microscopic", "infinitesimal"],
  serious: ["big", "grave", "severe", "weighty"],
  urgent: ["quick", "pressing", "immediate", "exigent"],
  simple: ["easy", "plain", "uncomplicated", "unadorned"],
  complex: ["not simple", "complicated", "intricate", "labyrinthine"],
  perfect: ["very good", "flawless", "faultless", "impeccable"],
  terrible: ["very bad", "awful", "dreadful", "appalling"],
  wonderful: ["very good", "great", "marvellous", "sublime"],
  boring: ["not fun", "dull", "tedious", "soporific"],
  exciting: ["fun", "thrilling", "exhilarating", "electrifying"],
  tasty: ["good", "delicious", "flavourful", "delectable"],
  // ---- actions ----
  begin: ["start", "commence", "initiate", "inaugurate"],
  finish: ["end", "complete", "conclude", "finalize"],
  build: ["make", "construct", "erect", "fabricate"],
  break: ["damage", "smash", "shatter", "fracture"],
  buy: ["get", "purchase", "acquire", "procure"],
  sell: ["trade", "vend", "market", "peddle"],
  keep: ["hold", "retain", "preserve", "conserve"],
  throw: ["toss", "hurl", "fling", "propel"],
  catch: ["grab", "seize", "capture", "apprehend"],
  hide: ["cover", "conceal", "obscure", "camouflage"],
  find: ["see", "discover", "locate", "unearth"],
  lose: ["not find", "misplace", "forfeit", "squander"],
  ask: ["question", "enquire", "request", "solicit"],
  answer: ["reply", "respond", "retort", "rejoin"],
  say: ["tell", "state", "declare", "assert"],
  shout: ["yell", "cry", "bellow", "vociferate"],
  whisper: ["say quietly", "murmur", "mutter", "susurrate"],
  talk: ["speak", "chat", "converse", "discourse"],
  explain: ["tell", "describe", "clarify", "elucidate"],
  argue: ["fight", "dispute", "quarrel", "remonstrate"],
  agree: ["say yes", "accept", "consent", "concur"],
  refuse: ["say no", "reject", "decline", "rebuff"],
  allow: ["let", "permit", "authorize", "sanction"],
  forbid: ["not allow", "ban", "prohibit", "proscribe"],
  help: ["aid", "assist", "support", "succour"],
  save: ["keep", "rescue", "salvage", "redeem"],
  hurt: ["harm", "injure", "wound", "afflict"],
  kill: ["end life", "slay", "murder", "assassinate"],
  fix: ["mend", "repair", "restore", "rectify"],
  destroy: ["ruin", "wreck", "demolish", "obliterate"],
  change: ["make different", "alter", "modify", "transform"],
  grow: ["get bigger", "increase", "expand", "burgeon"],
  shrink: ["get smaller", "decrease", "contract", "diminish"],
  jump: ["hop", "leap", "bound", "vault"],
  run: ["go fast", "race", "sprint", "hurtle"],
  walk: ["go", "stroll", "stride", "amble"],
  climb: ["go up", "ascend", "scale", "clamber"],
  fall: ["drop", "tumble", "plunge", "plummet"],
  push: ["move", "shove", "thrust", "propel"],
  pull: ["move", "drag", "haul", "tow"],
  carry: ["take", "bear", "transport", "convey"],
  hold: ["keep", "grip", "grasp", "clutch"],
  hit: ["strike", "knock", "smack", "pummel"],
  cut: ["slice", "sever", "slit", "incise"],
  choose: ["pick", "select", "opt for", "designate"],
  decide: ["choose", "settle", "determine", "resolve"],
  try: ["attempt", "strive", "endeavour", "essay"],
  need: ["want", "require", "necessitate", "warrant"],
  hope: ["want", "wish", "expect", "aspire"],
  worry: ["think", "fret", "agonize", "brood"],
  enjoy: ["like", "love", "relish", "savour"],
  hate: ["dislike", "detest", "loathe", "abhor"],
  laugh: ["smile", "giggle", "chuckle", "guffaw"],
  cry: ["weep", "sob", "wail", "lament"],
  sleep: ["rest", "doze", "slumber", "repose"],
  wake: ["get up", "rouse", "awaken", "stir"],
  eat: ["have", "consume", "devour", "ingest"],
  drink: ["have", "sip", "swallow", "imbibe"],
  cook: ["make", "prepare", "roast", "sauté"],
  wash: ["clean", "rinse", "scrub", "cleanse"],
  wear: ["have on", "dress in", "don", "sport"],
  show: ["let see", "display", "reveal", "exhibit"],
  hidden: ["not seen", "covered", "concealed", "clandestine"],
  watch: ["look at", "observe", "view", "scrutinize"],
  look: ["see", "glance", "gaze", "peruse"],
  listen: ["hear", "attend", "heed", "hearken"],
  learn: ["study", "master", "grasp", "assimilate"],
  teach: ["show", "train", "instruct", "edify"],
  remember: ["not forget", "recall", "recollect", "reminisce"],
  forget: ["not remember", "overlook", "neglect", "disremember"],
  think: ["believe", "consider", "reflect", "ruminate"],
  understand: ["get", "grasp", "comprehend", "fathom"],
  guess: ["think", "suppose", "estimate", "surmise"],
  believe: ["think", "trust", "accept", "credit"],
  doubt: ["not believe", "question", "mistrust", "disbelieve"],
  promise: ["say", "pledge", "vow", "covenant"],
  warn: ["tell", "alert", "caution", "admonish"],
  praise: ["say good things", "compliment", "commend", "extol"],
  blame: ["fault", "accuse", "reproach", "censure"],
  travel: ["go", "journey", "voyage", "traverse"],
  arrive: ["get there", "reach", "land", "alight"],
  leave: ["go", "depart", "exit", "vacate"],
  stay: ["remain", "wait", "linger", "abide"],
  meet: ["see", "encounter", "greet", "rendezvous"],
  join: ["put together", "connect", "unite", "amalgamate"],
  separate: ["split", "divide", "detach", "sever"],
  share: ["give", "divide", "distribute", "apportion"],
  give: ["hand", "offer", "present", "bestow"],
  take: ["get", "grab", "seize", "appropriate"],
  steal: ["take", "rob", "thieve", "pilfer"],
  pay: ["give money", "settle", "remit", "recompense"],
  earn: ["get", "make", "gain", "accrue"],
  spend: ["use", "pay out", "expend", "disburse"],
  waste: ["lose", "misuse", "squander", "dissipate"],
  count: ["add up", "tally", "calculate", "enumerate"],
  measure: ["check", "gauge", "quantify", "calibrate"],
  // ---- things & ideas ----
  job: ["work", "post", "occupation", "vocation"],
  house: ["home", "building", "residence", "dwelling"],
  road: ["street", "route", "highway", "thoroughfare"],
  shop: ["store", "outlet", "retailer", "emporium"],
  doctor: ["medic", "physician", "practitioner", "clinician"],
  child: ["kid", "youngster", "youth", "juvenile"],
  friend: ["mate", "buddy", "companion", "confidant"],
  enemy: ["rival", "opponent", "adversary", "nemesis"],
  problem: ["trouble", "issue", "difficulty", "predicament"],
  idea: ["thought", "plan", "concept", "notion"],
  plan: ["idea", "scheme", "strategy", "blueprint"],
  reason: ["why", "cause", "motive", "rationale"],
  result: ["end", "outcome", "consequence", "upshot"],
  chance: ["luck", "opportunity", "possibility", "contingency"],
  danger: ["risk", "threat", "hazard", "peril"],
  mistake: ["error", "slip", "blunder", "oversight"],
  story: ["tale", "account", "narrative", "chronicle"],
  noise: ["sound", "racket", "din", "cacophony"],
  smell: ["scent", "odour", "aroma", "fragrance"],
  pain: ["hurt", "ache", "agony", "anguish"],
  fear: ["worry", "fright", "dread", "trepidation"],
  anger: ["upset", "rage", "fury", "wrath"],
  joy: ["happiness", "delight", "elation", "jubilation"],
  money: ["cash", "funds", "capital", "assets"],
  price: ["cost", "charge", "fee", "valuation"],
  gift: ["present", "donation", "offering", "bequest"],
  rule: ["law", "regulation", "principle", "statute"],
  fight: ["battle", "conflict", "clash", "altercation"],
  speech: ["talk", "address", "lecture", "oration"],
  trip: ["travel", "journey", "voyage", "expedition"],
  home: ["house", "residence", "abode", "domicile"],
  food: ["meal", "diet", "nourishment", "sustenance"],
  garbage: ["rubbish", "waste", "refuse", "detritus"],
};

const clean = (v) => (typeof v === "string" && v.trim() ? v.trim() : "");

const TIER_INDEX = { A2: 0, B1: 1, B2: 2, C1: 3 };

function ladderFor(word) {
  const key = String(word || "").trim().toLowerCase();
  const l = LADDER[key];
  if (!l || !clean(l[0])) return null;
  return l;
}

// Starter and A1 read the support-language translation, never a synonym —
// the same rule definitionTiers.js encodes by having no def_a1.
export function usesTranslationClue(level) {
  return level === "Starter" || level === "A1";
}

// The English synonym clue for a student at `studentLevel`. Entity field wins,
// pilot ladder is the fallback, and a tier with neither resolves DOWN the
// ladder (a C1 student on a word with only an A2 rung still gets a usable
// clue) rather than returning nothing.
export function synonymForLevel(word, studentLevel) {
  const order = ["C1", "B2", "B1", "A2"];
  const start = Math.max(0, order.indexOf(studentLevel in TIER_INDEX ? studentLevel : "A2"));
  const chain = order.slice(start);
  for (const tier of chain) {
    const fromEntity = clean(word?.[SYN_FIELD[tier]]);
    if (fromEntity) return fromEntity;
  }
  const l = ladderFor(word?.english);
  if (!l) return "";
  for (const tier of chain) {
    const v = clean(l[TIER_INDEX[tier]]);
    if (v) return v;
  }
  return "";
}

// The support-language translation shown at Starter/A1 (and as the optional
// help reveal higher up). Starter/A1 always get the support language even when
// the interface is English — an English-only beginner card would have no
// anchor at all.
export function translationClue(word, lang) {
  if (lang === "ru") return clean(word?.russian) || clean(word?.uzbek);
  if (lang === "uz") return clean(word?.uzbek) || clean(word?.russian);
  return clean(word?.uzbek) || clean(word?.russian);
}

// The clue a given student sees for a given word — "" when this word cannot be
// played at this level, which is what the pool filter keys off.
export function clueForLevel(word, studentLevel, lang) {
  return usesTranslationClue(studentLevel)
    ? translationClue(word, lang)
    : synonymForLevel(word, studentLevel);
}

// Words playable at this level: a usable sentence AND a clue. The sentence has
// to actually contain the word, otherwise "read the word in context" has no
// context — 2,242 of 2,282 rows qualify.
export function playableWords(words = [], studentLevel, lang) {
  return words.filter((w) => {
    const en = clean(w?.english);
    const sentence = clean(w?.example_en);
    if (!en || !sentence) return false;
    if (!sentence.toLowerCase().includes(en.toLowerCase().split(" ")[0])) return false;
    return !!clueForLevel(w, studentLevel, lang);
  });
}

// Diagnostics only — how many rows of a pool have pilot synonym coverage.
export function synonymCoverage(words = []) {
  return words.filter((w) => !!synonymForLevel(w, "A2")).length;
}