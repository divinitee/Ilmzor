// Hand-authored: tenses / present / continuous-negative (A1).
//
// Level A1 because that is what the placement bank already declares for this
// topic (adaptiveGrammar/bank/tenses.js, "aren't (not don't) before -ing").
// Written the same way as continuous-now.mjs, against the same gates: two slots
// of four fillers on every deterministic item (320 / 320 / 240 surface
// variants), every sentence distinct, and the subject — the only thing the key
// depends on — never slotted. Every filler was checked in combination with
// every filler of the other slot, so each variant is a sentence a teacher would
// accept.
//
// Two deliberate choices:
//   - The do-support distractor is "don't / doesn't + -ing", not "doesn't +
//     base". "She doesn't watch TV at the moment" is grammatical English
//     (a temporary habit), so it would be a second right answer; "doesn't
//     watching" is the error learners actually make and is never right.
//   - Typed answers (build, transform) avoid verbs with British/American
//     spelling splits (travelling / traveling): the grader accepts contraction
//     variants only, so the other spelling would be marked wrong.
//
// Run: node tools/grammar-practice/authored/continuous-negative.mjs
// Writes content/grammar-practice/tenses.present.continuous-negative.json

import { writeFileSync } from "node:fs";

const BASE = { domain: "tenses", branch: "present", topic: "continuous-negative", level: "A1", pv: "2.5" };

const NEG = { i: ["am not", "am not"], sg: ["isn't", "is not"], pl: ["aren't", "are not"] };
const WRONG_BE = { i: ["isn't", "is not"], sg: ["aren't", "are not"], pl: ["isn't", "is not"] };
const DO = { i: ["don't", "do not"], sg: ["doesn't", "does not"], pl: ["don't", "do not"] };

// Four options, one per learner error: the wrong form of BE, do-support before
// -ing, and — alternating — BE + not with the -ing missing, or not with BE
// dropped (the zero-copula error Uzbek and Russian speakers carry over).
const opts = (type, full, ing, base, alt) => {
  const f = full ? 1 : 0;
  return [
    `${NEG[type][f]} ${ing}`,
    `${WRONG_BE[type][f]} ${ing}`,
    `${DO[type][f]} ${ing}`,
    alt === "base" ? `${NEG[type][f]} ${base}` : `not ${ing}`,
  ];
};

const PRONOUNS = ["We", "They", "You"];
const agree = (type, subj) =>
  type === "i" ? "Use am not with I (short form: I'm not), then the -ing form."
    : type === "sg" ? `${subj} is singular, so use isn't (is not) plus the -ing form.`
      : PRONOUNS.includes(subj) ? `Use aren't (are not) with ${subj.toLowerCase()}, plus the -ing form.`
        : `${subj} means more than one, so use aren't (are not) plus the -ing form.`;

const NOT_DO = "The present continuous makes its negative with be + not, never with don't or doesn't.";

/* ---------------- choose: 20 mcq ---------------- */
const CHOOSE = [
  ["I", "i", "listen", "listening", false, "base", "I ______ to {audio} on my {device} right now.",
    { audio: ["music", "a podcast", "the news", "an audiobook"], device: ["phone", "laptop", "tablet", "computer"] }],
  ["Aziza", "sg", "cook", "cooking", false, "not", "Aziza ______ {food} in the kitchen at the moment. She is at {place}.",
    { food: ["plov", "soup", "rice", "pasta"], place: ["work", "university", "the gym", "the market"] }],
  ["My parents", "pl", "watch", "watching", false, "base", "My parents ______ {program} right now. They are {activity}.",
    { program: ["TV", "the news", "a film", "a football match"], activity: ["having dinner", "drinking tea", "talking in the kitchen", "working in the garden"] }],
  ["The students", "pl", "write", "writing", true, "not", "The students ______ {task} at the moment. The teacher is {activity}.",
    { task: ["a test", "an essay", "a dictation", "notes"], activity: ["explaining the rule", "checking homework", "reading a text aloud", "showing a video"] }],
  ["Timur", "sg", "drive", "driving", false, "base", "Timur ______ to {place} today. He is going by {transport}.",
    { place: ["work", "university", "the city centre", "his office"], transport: ["bus", "metro", "taxi", "train"] }],
  ["We", "pl", "study", "studying", false, "not", "We ______ {subject} this week because our teacher is {reason}.",
    { subject: ["English", "maths", "history", "physics"], reason: ["ill", "away", "at a conference", "on holiday"] }],
  ["Dilnoza", "sg", "sleep", "sleeping", false, "base", "Dilnoza ______ now. She is {activity} with her {person}.",
    { activity: ["talking", "doing homework", "playing chess", "watching a film"], person: ["sister", "mother", "friend", "cousin"] }],
  ["They", "pl", "play", "playing", false, "not", "They ______ {sport} today because it is {weather}.",
    { sport: ["football", "basketball", "volleyball", "tennis"], weather: ["raining", "too hot", "too cold", "very windy"] }],
  ["I", "i", "use", "using", true, "not", "I ______ my {device} at the moment. It is {state}.",
    { device: ["phone", "laptop", "tablet", "camera"], state: ["broken", "at home", "in my bag", "charging"] }],
  ["Sardor", "sg", "run", "running", false, "base", "Sardor ______ in the {place} today. He has a {problem}.",
    { place: ["park", "stadium", "gym", "street"], problem: ["cold", "headache", "bad knee", "sore foot"] }],
  ["My brother", "sg", "sit", "sitting", true, "not", "My brother ______ at his {furniture} right now. He is in the {room}.",
    { furniture: ["desk", "computer", "table", "usual place"], room: ["kitchen", "garden", "shower", "yard"] }],
  ["You", "pl", "pay", "paying", false, "base", "You ______ attention to the {speaker} right now. You are looking at your {device}.",
    { speaker: ["teacher", "lecturer", "guide", "coach"], device: ["phone", "laptop", "watch", "notebook"] }],
  ["The baby", "sg", "cry", "crying", false, "not", "The baby ______ now. She is {activity} in her {place}.",
    { activity: ["sleeping", "smiling", "playing", "lying quietly"], place: ["bed", "cot", "room", "pram"] }],
  ["Madina and Olga", "pl", "shop", "shopping", false, "base", "Madina and Olga ______ at the {place} today. They are {activity} at home.",
    { place: ["market", "bazaar", "mall", "supermarket"], activity: ["cleaning", "cooking", "resting", "studying"] }],
  ["My phone", "sg", "work", "working", true, "not", "My phone ______ properly {time}. I can't {action}.",
    { time: ["today", "right now", "at the moment", "this week"], action: ["call my mother", "send messages", "open my email", "use the internet"] }],
  ["We", "pl", "wait", "waiting", false, "base", "We ______ for the {transport} now. We are walking to {place}.",
    { transport: ["bus", "taxi", "minibus", "train"], place: ["school", "university", "work", "the market"] }],
  ["Anvar", "sg", "make", "making", false, "not", "Anvar ______ {food} for dinner today. His {person} is cooking.",
    { food: ["plov", "soup", "a salad", "pasta"], person: ["mother", "wife", "sister", "brother"] }],
  ["The children", "pl", "swim", "swimming", false, "base", "The children ______ in the {place} today. The water is too {state}.",
    { place: ["pool", "river", "lake", "canal"], state: ["cold", "dirty", "deep", "shallow"] }],
  ["I", "i", "work", "working", false, "not", "I ______ {time}. I am at home with my {person}.",
    { time: ["today", "this week", "right now", "at the moment"], person: ["family", "parents", "children", "little sister"] }],
  ["Jasur", "sg", "lie", "lying", false, "base", "Jasur ______ on the {furniture} now. He is {activity}.",
    { furniture: ["sofa", "bed", "floor", "carpet"], activity: ["doing his homework", "helping his father", "washing the dishes", "at the gym"] }],
].map(([subj, type, base, ing, full, alt, prompt, slots]) => ({
  ...BASE, stage: "choose", format: "mcq",
  prompt, options: opts(type, full, ing, base, alt), key: 0, why: `${agree(type, subj)} ${NOT_DO}`, slots,
}));

/* ---------------- build: 20 gap_fill ---------------- */
const INSTR_B = "Complete the sentence with the negative present continuous form of the verb in brackets.";
// Spelling notes for the -ing forms learners get wrong.
const SPELL = {
  drop: (b, ing) => `Drop the final e: ${b} becomes ${ing}.`,
  double: (b, ing) => `Double the last letter: ${b} becomes ${ing}.`,
  ie: (b, ing) => `Change ie to y: ${b} becomes ${ing}.`,
  y: (b, ing) => `Keep the y: ${b} becomes ${ing}.`,
};
const BUILD = [
  ["My sister", "sg", "watch", "isn't watching", "My sister ______ (watch) {program} right now. She's busy with her {task}.",
    { program: ["TV", "a film", "a series", "cartoons"], task: ["homework", "project", "essay", "exam preparation"] }],
  ["I", "i", "eat", "am not eating", "I ______ (eat) {food} {time}. I'm on a diet.",
    { food: ["bread", "sweets", "fast food", "meat"], time: ["today", "this week", "right now", "at the moment"] }],
  ["The boys", "pl", "play", "are not playing", "The boys ______ (play) {sport} in the {place} today. It's too hot.",
    { sport: ["football", "basketball", "volleyball", "table tennis"], place: ["yard", "park", "school gym", "sports hall"] }],
  ["Kamila", "sg", "study", "isn't studying", "Kamila ______ (study) in the {place} at the moment. She's at the {other}.",
    { place: ["library", "classroom", "reading room", "computer room"], other: ["café", "bank", "doctor's", "post office"] }, "y"],
  ["We", "pl", "go", "aren't going", "We ______ (go) to {city} this week because our {person} is ill.",
    { city: ["Samarkand", "Bukhara", "Tashkent", "Khiva"], person: ["grandmother", "father", "mother", "little brother"] }],
  ["My father", "sg", "drive", "isn't driving", "My father ______ (drive) to {place} today. His {vehicle} is broken.",
    { place: ["work", "the market", "the office", "the bank"], vehicle: ["car", "van", "truck", "minivan"] }, "drop"],
  ["You", "pl", "wear", "aren't wearing", "You ______ (wear) a {clothing} today, and it's {weather} outside!",
    { clothing: ["coat", "jacket", "hat", "scarf"], weather: ["cold", "freezing", "windy", "snowing"] }],
  ["Our dog", "sg", "lie", "isn't lying", "Our dog ______ (lie) on the {spot} now. He's {activity} in the garden.",
    { spot: ["sofa", "carpet", "bed", "floor"], activity: ["playing", "running", "sleeping", "eating"] }, "ie"],
  ["They", "pl", "work", "aren't working", "They ______ (work) at the {place} this week. They're at a {event} in Tashkent.",
    { place: ["office", "factory", "shop", "hotel"], event: ["conference", "training course", "wedding", "family event"] }],
  ["I", "i", "use", "am not using", "I ______ (use) my {device} {time}, so you can take it.",
    { device: ["laptop", "charger", "tablet", "camera"], time: ["now", "right now", "at the moment", "today"] }, "drop"],
  ["Bekzod", "sg", "sit", "isn't sitting", "Bekzod ______ (sit) at his {furniture} right now. He's {where}.",
    { furniture: ["desk", "computer", "table", "usual place"], where: ["in the kitchen", "outside", "at lunch", "in a meeting"] }, "double"],
  ["Nilufar", "sg", "take", "isn't taking", "Nilufar ______ (take) the {transport} to university today. Her {person} is driving her.",
    { transport: ["bus", "metro", "minibus", "train"], person: ["brother", "father", "uncle", "friend"] }, "drop"],
  ["The students", "pl", "listen", "aren't listening", "The students ______ (listen) to the {speaker} at the moment. They're talking about the {topic}.",
    { speaker: ["teacher", "lecturer", "guest speaker", "presenter"], topic: ["football match", "weekend", "exam", "new film"] }],
  ["My mother", "sg", "make", "isn't making", "My mother ______ (make) {food} today. We're eating at {place}.",
    { food: ["plov", "soup", "dinner", "breakfast"], place: ["a café", "my aunt's house", "a restaurant", "my grandmother's house"] }, "drop"],
  ["I", "i", "run", "am not running", "I ______ (run) in the {place} this week because my {body} hurts.",
    { place: ["park", "stadium", "gym", "street"], body: ["knee", "foot", "back", "ankle"] }, "double"],
  ["It", "sg", "rain", "is not raining", "It ______ (rain) in {city} right now, so we can go to the {place}.",
    { city: ["Tashkent", "Samarkand", "Namangan", "Bukhara"], place: ["park", "market", "stadium", "zoo"] }],
  ["You", "pl", "do", "aren't doing", "You ______ (do) your {task} right now. You're {activity}!",
    { task: ["homework", "exercises", "project", "reading"], activity: ["playing games", "chatting with friends", "watching videos", "looking at your phone"] }],
  ["Rustam and Lola", "pl", "get", "aren't getting", "Rustam and Lola ______ (get) ready for the {event} right now. They're {activity}.",
    { event: ["wedding", "party", "exam", "trip"], activity: ["at work", "asleep", "in class", "on the phone"] }, "double"],
  ["Aziz", "sg", "plan", "isn't planning", "Aziz ______ (plan) a {thing} at the moment. He's too busy with {work}.",
    { thing: ["trip", "party", "holiday", "birthday dinner"], work: ["work", "his exams", "his new job", "university"] }, "double"],
  ["We", "pl", "have", "are not having", "We ______ (have) a {subject} lesson in the {room} today. It's online.",
    { subject: ["biology", "maths", "history", "chemistry"], room: ["main hall", "computer room", "library", "big classroom"] }, "drop"],
].map(([subj, type, base, key, source, slots, spell]) => {
  const ing = key.split(" ").pop();
  const note = spell ? SPELL[spell](base, ing) : `The verb ${base} becomes ${ing}.`;
  return {
    ...BASE, stage: "build", format: "gap_fill", instr: INSTR_B, source, key,
    why: `${agree(type, subj)} ${note}`, slots,
  };
});

/* ---------------- transform: 15 rewrite, three kinds ---------------- */
const MAKE_NEG = "Rewrite the sentence in the negative. Keep the present continuous.";
const SUBJ = "Rewrite the negative sentence with the new subject.";
const NOT_NOW = "Rewrite the sentence to say this is not happening now. Use the present continuous negative.";
const TRANSFORM = [
  // positive -> negative (5)
  [MAKE_NEG, "Aziza is watching {program} in the {room} right now.", "Aziza ______ (watch) {program} in the {room} right now.", "isn't watching",
    "Aziza is singular, so is becomes isn't (is not).",
    { program: ["TV", "a film", "the news", "a series"], room: ["living room", "bedroom", "kitchen", "hall"] }],
  [MAKE_NEG, "The students are writing {task} in the {room} at the moment.", "The students ______ (write) {task} in the {room} at the moment.", "aren't writing",
    "The students means more than one, so are becomes aren't (are not).",
    { task: ["a test", "an essay", "a dictation", "a report"], room: ["classroom", "library", "computer room", "main hall"] }],
  [MAKE_NEG, "I am doing my {task} at the {place} now.", "I ______ (do) my {task} at the {place} now.", "am not doing",
    "With I, am becomes am not (short form: I'm not). Never use amn't.",
    { task: ["homework", "project", "exercises", "revision"], place: ["library", "kitchen table", "café", "office"] }],
  [MAKE_NEG, "My brother is playing {game} on his {device} right now.", "My brother ______ (play) {game} on his {device} right now.", "isn't playing",
    "My brother is singular, so is becomes isn't (is not).",
    { game: ["chess", "a racing game", "a word game", "a football game"], device: ["phone", "laptop", "tablet", "computer"] }],
  [MAKE_NEG, "We are waiting for the {transport} at the {place} at the moment.", "We ______ (wait) for the {transport} at the {place} at the moment.", "aren't waiting",
    "With we, are becomes aren't (are not).",
    { transport: ["bus", "taxi", "train", "minibus"], place: ["station", "corner", "gate", "stop"] }],
  // new subject (5)
  [SUBJ, "Dilshod isn't working at the {place} {time}.", "Dilshod and his brother ______ (work) at the {place} {time}.", "aren't working",
    "Dilshod and his brother means two people, so isn't becomes aren't (are not).",
    { place: ["factory", "hospital", "bank", "hotel"], time: ["today", "this week", "at the moment", "right now"] }],
  [SUBJ, "The children aren't sleeping in the {room} right now. They're {activity}.", "The baby ______ (sleep) in the {room} right now. She's {activity}.", "isn't sleeping",
    "The baby is singular, so aren't becomes isn't (is not).",
    { room: ["bedroom", "living room", "car", "hall"], activity: ["laughing", "playing", "crying", "awake"] }],
  [SUBJ, "She isn't listening to {audio} on her {device} now.", "I ______ (listen) to {audio} on my {device} now.", "am not listening",
    "With I, use am not (short form: I'm not), not isn't.",
    { audio: ["music", "a podcast", "the radio", "an audiobook"], device: ["phone", "laptop", "tablet", "computer"] }],
  [SUBJ, "I'm not using the {device} in the {room} at the moment.", "My parents ______ (use) the {device} in the {room} at the moment.", "aren't using",
    "My parents means more than one, so am not becomes aren't (are not).",
    { device: ["computer", "TV", "radio", "fan"], room: ["living room", "office", "kitchen", "bedroom"] }],
  [SUBJ, "They aren't cooking {food} for the {event} today.", "Nargiza ______ (cook) {food} for the {event} today.", "isn't cooking",
    "Nargiza is singular, so aren't becomes isn't (is not).",
    { food: ["plov", "soup", "samsa", "a cake"], event: ["guests", "party", "wedding", "family dinner"] }],
  // usual habit -> not happening now (5)
  [NOT_NOW, "Sardor usually walks to {place}.", "Sardor ______ (walk) to {place} today. It's {weather}.", "isn't walking",
    "Today is different from usual, so use isn't plus the -ing form, not doesn't.",
    { place: ["work", "school", "university", "the gym"], weather: ["raining", "snowing", "too cold", "too hot"] }],
  [NOT_NOW, "My parents usually watch {program} in the evening.", "My parents ______ (watch) {program} right now. They're {activity}.", "aren't watching",
    "Right now shows this moment, not the habit, so use aren't plus the -ing form.",
    { program: ["the news", "TV", "a series", "football"], activity: ["visiting friends", "at a wedding", "asleep", "in the garden"] }],
  [NOT_NOW, "I usually drink {drink} at {time}.", "I ______ (drink) {drink} this week. My doctor told me to stop.", "am not drinking",
    "This week is a temporary change, so use am not plus the -ing form, not don't.",
    { drink: ["coffee", "sweet tea", "fizzy drinks", "energy drinks"], time: ["breakfast", "lunch", "work", "night"] }],
  [NOT_NOW, "Madina studies in the {place} every {day}.", "Madina ______ (study) in the {place} today. She's at home with a cold.", "isn't studying",
    "Today is different from usual, so use isn't plus the -ing form. Study keeps its y: studying.",
    { place: ["library", "reading room", "computer room", "classroom"], day: ["morning", "afternoon", "evening", "weekday"] }],
  [NOT_NOW, "The boys play {sport} in the {place} after school.", "The boys ______ (play) {sport} in the {place} this week. They have exams.", "aren't playing",
    "This week is a temporary change, so use aren't plus the -ing form, not don't.",
    { sport: ["football", "basketball", "volleyball", "tennis"], place: ["yard", "park", "sports hall", "stadium"] }],
].map(([instr, source, hint, key, why, slots]) => ({
  ...BASE, stage: "transform", format: "rewrite", instr, source, hint, key, why, slots,
}));

/* ---------------- create: 8 ---------------- */
const CREATE = [
  ["Write one sentence about something you are not doing right now.", "I'm not or I am not plus a verb ending in -ing",
    ["exactly one sentence", "must include right now", "must use I"]],
  ["Write one sentence about something another person is not doing at the moment.", "isn't or is not plus a verb ending in -ing",
    ["exactly one sentence", "must include at the moment", "must be about another person"]],
  ["Write one sentence about something two or more people are not doing today.", "aren't or are not plus a verb ending in -ing",
    ["exactly one sentence", "must include today", "must use a plural subject"]],
  ["Write one sentence about a phone, computer or machine that is not working right now.", "isn't working or is not working",
    ["exactly one sentence", "must include right now", "must name a device or machine"]],
  ["Write one sentence about something you usually do but are not doing this week.", "I'm not or I am not plus a verb ending in -ing",
    ["exactly one sentence", "must include this week", "must use I"]],
  ["Write one sentence telling a friend that they are not listening to you.", "aren't or are not plus listening",
    ["exactly one sentence", "must use you as the subject", "must use the verb listen"]],
  ["Write one sentence about someone in your family and something they are not doing today.", "isn't or is not plus a verb ending in -ing",
    ["exactly one sentence", "must include today", "must name a family member"]],
  ["Write two sentences: first say what someone is not doing now, then say what they are doing instead.", "a negative and a positive sentence in the present continuous",
    ["exactly two sentences", "first sentence negative, second sentence positive", "the same person in both sentences"]],
].map(([prompt, requiredElement, constraints]) => ({
  ...BASE, stage: "create", format: "constrained_sentence", prompt, requiredElement, constraints,
}));

/* ---------------- express: 5 ---------------- */
const EXPRESS = [
  ["Describe three things you are not doing right now, and say what you are doing instead. Write three or four sentences.",
    "present continuous negative with I'm not or I am not", ["I'm not or I am not", "verbs ending in -ing", "right now or another now marker"]],
  ["A friend calls and asks you to meet. Explain why you can't: say what you are and aren't doing at the moment. Write three or four sentences.",
    "present continuous negative and positive for actions happening now", ["isn't, aren't or I'm not", "correct -ing spelling", "at the moment or right now"]],
  ["Describe what the people in your home are not doing right now. Write three or four sentences.",
    "present continuous negative with isn't and aren't", ["isn't with singular subjects", "aren't with plural subjects", "no don't or doesn't before -ing"]],
  ["Describe a day that is different from usual. What are you and your family not doing today? Write three or four sentences.",
    "present continuous negative for temporary situations today", ["today as the time marker", "am not, isn't or aren't plus -ing", "a contrast with the usual routine"]],
  ["Look out of a window, or imagine a busy street. Describe what people are not doing at the moment. Write three or four sentences.",
    "present continuous negative with singular and plural subjects", ["isn't with singular subjects", "aren't with plural subjects", "at the moment or right now"]],
].map(([prompt, targetGrammar, lookFor]) => ({
  ...BASE, stage: "express", format: "free_response", prompt, targetGrammar, lookFor,
}));

const items = [...CHOOSE, ...BUILD, ...TRANSFORM, ...CREATE, ...EXPRESS];
const out = "content/grammar-practice/tenses.present.continuous-negative.json";
writeFileSync(out, JSON.stringify(items, null, 1) + "\n");
console.log(`wrote ${out} — ${items.length} items`);
