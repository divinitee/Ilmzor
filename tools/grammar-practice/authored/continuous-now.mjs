// Hand-authored: tenses / present / continuous-now (A1).
//
// Six generated batches failed this topic — three on rules I had not written
// down, two on loopholes in rules I had (single-slot items, duplicated items),
// one on being generated from a stale prompt. The round-trip cost more than the
// authoring does, so this one is written directly against the same gates the
// generator has to pass: two slots of four fillers on every deterministic item
// (320 / 320 / 240 surface variants), every sentence distinct, every sentence
// carrying exactly one NOW marker, and every slot in a position that cannot
// change the answer — the key here depends only on the subject, which is never
// slotted.
//
// Run: node tools/grammar-practice/authored/continuous-now.mjs
// Writes content/grammar-practice/tenses.present.continuous-now.json

import { writeFileSync } from "node:fs";

const BASE = { domain: "tenses", branch: "present", topic: "continuous-now", level: "A1", pv: "2.5" };

// Distractors are the three errors an A1 learner actually makes: the wrong
// form of BE, the other wrong form of BE, and the present simple.
const opts = (type, ing, base, sform) =>
  type === "i" ? [`am ${ing}`, `is ${ing}`, `are ${ing}`, base]
    : type === "sg" ? [`is ${ing}`, `are ${ing}`, `am ${ing}`, sform]
      : [`are ${ing}`, `is ${ing}`, `am ${ing}`, base];

const agree = (type, subj) =>
  type === "i" ? "Use am with I in the present continuous."
    : type === "sg" ? `${subj} is singular, so use is plus the -ing form.`
      : `${subj} is plural, so use are plus the -ing form.`;

/* ---------------- choose: 20 mcq ---------------- */
const CHOOSE = [
  ["I", "i", "read", "reading", "", "Right now I ______ {object} in the {place}.",
    { object: ["a book", "a magazine", "an article", "a letter"], place: ["kitchen", "garden", "library", "classroom"] }],
  ["Aziza", "sg", "cook", "cooking", "cooks", "Look! Aziza ______ {food} in the {place}.",
    { food: ["soup", "plov", "pasta", "rice"], place: ["kitchen", "garden", "canteen", "café"] }],
  ["My parents", "pl", "watch", "watching", "", "My parents ______ {program} in the {place} right now.",
    { program: ["the news", "a film", "a match", "a documentary"], place: ["living room", "kitchen", "bedroom", "hall"] }],
  ["The children", "pl", "play", "playing", "", "Listen! The children ______ {game} in the {place}.",
    { game: ["football", "chess", "a card game", "hide and seek"], place: ["garden", "park", "yard", "street"] }],
  ["Timur", "sg", "write", "writing", "writes", "At the moment Timur ______ {item} at the {place}.",
    { item: ["an email", "a report", "a message", "a list"], place: ["desk", "table", "office", "library"] }],
  ["We", "pl", "wait", "waiting", "", "We ______ for {person} at the {place} right now.",
    { person: ["the teacher", "my brother", "a friend", "the doctor"], place: ["station", "entrance", "bus stop", "gate"] }],
  ["You", "pl", "listen", "listening", "", "Listen! You ______ to {audio} on your {device}.",
    { audio: ["music", "a podcast", "the news", "a lesson"], device: ["phone", "laptop", "radio", "tablet"] }],
  ["The baby", "sg", "sleep", "sleeping", "sleeps", "The baby ______ {manner} in the {place} at the moment.",
    { manner: ["quietly", "peacefully", "deeply", "well"], place: ["bedroom", "car", "living room", "hall"] }],
  ["My brother", "sg", "drive", "driving", "drives", "Look! My brother ______ to {place} in his {vehicle}.",
    { place: ["work", "the airport", "the market", "the village"], vehicle: ["car", "van", "truck", "taxi"] }],
  ["The students", "pl", "study", "studying", "", "The students ______ {subject} in the {place} right now.",
    { subject: ["English", "history", "biology", "geography"], place: ["classroom", "library", "hall", "computer room"] }],
  ["I", "i", "help", "helping", "", "Right now I ______ {person} with the {task}.",
    { person: ["my mother", "my sister", "my friend", "my cousin"], task: ["cooking", "cleaning", "shopping", "homework"] }],
  ["Nargiza", "sg", "clean", "cleaning", "cleans", "At the moment Nargiza ______ the {object} in the {place}.",
    { object: ["table", "window", "floor", "dishes"], place: ["kitchen", "bathroom", "hall", "classroom"] }],
  ["My friends", "pl", "travel", "travelling", "", "My friends ______ to {place} by {transport} right now.",
    { place: ["Tashkent", "Samarkand", "the capital", "the coast"], transport: ["train", "bus", "plane", "car"] }],
  ["The teacher", "sg", "explain", "explaining", "explains", "Listen! The teacher ______ the {topic} to the {group}.",
    { topic: ["rule", "exercise", "lesson", "homework"], group: ["class", "students", "group", "children"] }],
  ["You", "pl", "wear", "wearing", "", "Look! You ______ a {clothing} in this {weather}.",
    { clothing: ["coat", "jacket", "scarf", "hat"], weather: ["cold weather", "warm weather", "rain", "wind"] }],
  ["Dilshod", "sg", "fix", "fixing", "fixes", "Dilshod ______ his {object} in the {place} at the moment.",
    { object: ["bike", "phone", "car", "laptop"], place: ["garden", "garage", "yard", "room"] }],
  ["We", "pl", "prepare", "preparing", "", "We ______ {food} for the {event} right now.",
    { food: ["dinner", "a salad", "tea", "sandwiches"], event: ["guests", "party", "family", "meeting"] }],
  ["The birds", "pl", "sing", "singing", "", "Listen! The birds ______ in the {place} outside the {room}.",
    { place: ["trees", "garden", "park", "street"], room: ["window", "kitchen", "bedroom", "classroom"] }],
  ["Malika", "sg", "talk", "talking", "talks", "At the moment Malika ______ to her {person} on the {device}.",
    { person: ["mother", "teacher", "friend", "sister"], device: ["phone", "computer", "tablet", "laptop"] }],
  ["I", "i", "look", "looking", "", "Right now I ______ for my {object} in the {place}.",
    { object: ["keys", "bag", "phone", "notebook"], place: ["kitchen", "car", "bedroom", "classroom"] }],
].map(([subj, type, base, ing, sform, prompt, slots]) => ({
  ...BASE, stage: "choose", format: "mcq",
  prompt, options: opts(type, ing, base, sform), key: 0, why: agree(type, subj), slots,
}));

/* ---------------- build: 20 gap_fill ---------------- */
const INSTR_B = "Complete the sentence with the present continuous form of the verb in brackets.";
const BUILD = [
  ["My cat", "sg", "sleep", "is sleeping", "Look! My cat ______ (sleep) on the {furniture} in the {room}.",
    { furniture: ["sofa", "chair", "bed", "carpet"], room: ["living room", "bedroom", "kitchen", "hall"] }],
  ["I", "i", "drink", "am drinking", "I ______ (drink) {drink} in the {place} right now.",
    { drink: ["tea", "coffee", "water", "juice"], place: ["kitchen", "canteen", "office", "garden"] }],
  ["The boys", "pl", "laugh", "are laughing", "Listen! The boys ______ (laugh) at a {thing} in the {place}.",
    { thing: ["joke", "film", "story", "video"], place: ["classroom", "garden", "hall", "yard"] }],
  ["Elena", "sg", "draw", "is drawing", "At the moment Elena ______ (draw) a {object} on the {surface}.",
    { object: ["house", "tree", "cat", "flower"], surface: ["board", "paper", "wall", "notebook"] }],
  ["We", "pl", "wait", "are waiting", "We ______ (wait) for the {transport} at the {place} right now.",
    { transport: ["bus", "train", "taxi", "minibus"], place: ["station", "corner", "stop", "entrance"] }],
  ["My sister", "sg", "wash", "is washing", "Right now my sister ______ (wash) the {object} in the {place}.",
    { object: ["dishes", "windows", "car", "clothes"], place: ["kitchen", "garden", "yard", "bathroom"] }],
  ["The train", "sg", "leave", "is leaving", "Look! The train ______ (leave) the {place} in this {weather}.",
    { place: ["station", "platform", "city", "town"], weather: ["rain", "snow", "fog", "wind"] }],
  ["You", "pl", "use", "are using", "You ______ (use) my {device} in the {place} at the moment.",
    { device: ["phone", "laptop", "tablet", "camera"], place: ["kitchen", "office", "classroom", "garden"] }],
  ["My brother", "sg", "stay", "is staying", "Today my brother ______ (stay) with our {person} in the {place}.",
    { person: ["grandmother", "uncle", "cousin", "aunt"], place: ["village", "city", "old house", "new flat"] }],
  ["Somebody", "sg", "knock", "is knocking", "Listen! Somebody ______ (knock) on the {object} of our {place}.",
    { object: ["door", "window", "gate", "back door"], place: ["house", "flat", "office", "shop"] }],
  ["The workers", "pl", "build", "are building", "The workers ______ (build) a {structure} near the {place} right now.",
    { structure: ["house", "wall", "bridge", "school"], place: ["park", "river", "market", "station"] }],
  ["I", "i", "learn", "am learning", "At the moment I ______ (learn) {subject} with my {person}.",
    { subject: ["English", "Russian", "maths", "chess"], person: ["teacher", "friend", "brother", "cousin"] }],
  ["The woman", "sg", "cross", "is crossing", "Look! The woman ______ (cross) the {place} with a {thing}.",
    { place: ["road", "street", "square", "bridge"], thing: ["child", "bag", "dog", "suitcase"] }],
  ["My parents", "pl", "talk", "are talking", "My parents ______ (talk) about the {topic} in the {room} right now.",
    { topic: ["holiday", "wedding", "house", "weekend"], room: ["kitchen", "garden", "living room", "car"] }],
  ["Lola", "sg", "prepare", "is preparing", "Today Lola ______ (prepare) {food} for the {group}.",
    { food: ["plov", "soup", "salad", "tea"], group: ["guests", "family", "children", "students"] }],
  ["The baby", "sg", "cry", "is crying", "The baby ______ (cry) {manner} in the {room} at the moment.",
    { manner: ["loudly", "quietly", "again", "a lot"], room: ["bedroom", "car", "hall", "garden"] }],
  ["The students", "pl", "write", "are writing", "Right now the students ______ (write) a {task} in their {object}.",
    { task: ["test", "essay", "letter", "list"], object: ["notebooks", "books", "copybooks", "notes"] }],
  ["Rustam", "sg", "run", "is running", "Look! Rustam ______ (run) towards the {place} with his {person}.",
    { place: ["park", "school", "station", "house"], person: ["brother", "friend", "dog", "cousin"] }],
  ["We", "pl", "watch", "are watching", "At the moment we ______ (watch) a {program} on the {device}.",
    { program: ["film", "match", "show", "documentary"], device: ["TV", "laptop", "phone", "tablet"] }],
  ["My uncle", "sg", "work", "is working", "Today my uncle ______ (work) in the {place} with his {colleague}.",
    { place: ["garden", "office", "shop", "garage"], colleague: ["brother", "friend", "son", "partner"] }],
].map(([subj, type, base, key, source, slots]) => ({
  ...BASE, stage: "build", format: "gap_fill", instr: INSTR_B, source, key,
  why: `${agree(type, subj)} The verb ${base} becomes ${key.split(" ")[1]}.`, slots,
}));

/* ---------------- transform: 15 rewrite, three kinds ---------------- */
const NEG = "Rewrite the sentence in the negative using the present continuous.";
const SUBJ = "Rewrite the sentence with the new subject using the present continuous.";
const CONT = "Rewrite the sentence in the present continuous.";
const TRANSFORM = [
  // negative (5)
  [NEG, "Kamila is reading {object} in the {place} right now.", "Kamila ______ (read) {object} in the {place} right now.", "isn't reading",
    "Use isn't plus the -ing form for a singular negative.",
    { object: ["a book", "a message", "a magazine", "an article"], place: ["library", "bedroom", "garden", "office"] }],
  [NEG, "The children are playing {game} in the {place} at the moment.", "The children ______ (play) {game} in the {place} at the moment.", "aren't playing",
    "The children is plural, so use aren't plus the -ing form.",
    { game: ["football", "chess", "a game", "cards"], place: ["park", "garden", "yard", "street"] }],
  [NEG, "I am waiting for {person} at the {place} right now.", "I ______ (wait) for {person} at the {place} right now.", "am not waiting",
    "Use am not plus the -ing form for a negative with I.",
    { person: ["my friend", "the teacher", "the doctor", "my brother"], place: ["station", "school", "gate", "entrance"] }],
  [NEG, "My mother is cooking {food} in the {place} at the moment.", "My mother ______ (cook) {food} in the {place} at the moment.", "isn't cooking",
    "Use isn't plus the -ing form for a singular negative.",
    { food: ["soup", "plov", "pasta", "rice"], place: ["kitchen", "garden", "canteen", "café"] }],
  [NEG, "The workers are fixing the {object} near the {place} right now.", "The workers ______ (fix) the {object} near the {place} right now.", "aren't fixing",
    "The workers is plural, so use aren't plus the -ing form.",
    { object: ["road", "roof", "door", "gate"], place: ["school", "market", "station", "park"] }],
  // subject change (5)
  [SUBJ, "I am cooking {food} for the {group} at the moment.", "We ______ (cook) {food} for the {group} at the moment.", "are cooking",
    "We is plural, so use are plus the -ing form.",
    { food: ["dinner", "soup", "plov", "tea"], group: ["guests", "family", "children", "students"] }],
  [SUBJ, "She is writing {item} in the {place} right now.", "They ______ (write) {item} in the {place} right now.", "are writing",
    "They is plural, so use are plus the -ing form.",
    { item: ["an email", "a letter", "a message", "a list"], place: ["office", "classroom", "library", "kitchen"] }],
  [SUBJ, "The students are studying {subject} in the {place} at the moment.", "The student ______ (study) {subject} in the {place} at the moment.", "is studying",
    "The student is singular, so use is plus the -ing form.",
    { subject: ["English", "history", "biology", "maths"], place: ["classroom", "library", "hall", "computer room"] }],
  [SUBJ, "You are carrying a {object} to the {place} right now.", "He ______ (carry) a {object} to the {place} right now.", "is carrying",
    "He is singular, so use is plus the -ing form.",
    { object: ["box", "bag", "chair", "suitcase"], place: ["car", "house", "office", "garden"] }],
  [SUBJ, "My sister is preparing {food} for the {group} at the moment.", "My sisters ______ (prepare) {food} for the {group} at the moment.", "are preparing",
    "My sisters is plural, so use are plus the -ing form.",
    { food: ["breakfast", "tea", "a salad", "dinner"], group: ["guests", "family", "children", "neighbours"] }],
  // present simple -> present continuous (5)
  [CONT, "Maksim washes the {object} in the {place} every Sunday.", "Look! Maksim ______ (wash) the {object} in the {place}.", "is washing",
    "Look! shows the action is happening now, so use is plus the -ing form.",
    { object: ["car", "dishes", "windows", "floor"], place: ["garden", "kitchen", "yard", "bathroom"] }],
  [CONT, "My father drives the {vehicle} to {place} every day.", "My father ______ (drive) the {vehicle} to {place} right now.", "is driving",
    "Right now shows the action is happening now, so use is plus the -ing form.",
    { vehicle: ["car", "bus", "truck", "taxi"], place: ["work", "the market", "the city", "the airport"] }],
  [CONT, "The baby sleeps in the {room} near the {object} every afternoon.", "The baby ______ (sleep) in the {room} near the {object} at the moment.", "is sleeping",
    "At the moment shows the action is happening now, so use is plus the -ing form.",
    { room: ["bedroom", "living room", "hall", "car"], object: ["window", "door", "sofa", "table"] }],
  [CONT, "We work on the {task} in the {place} every week.", "We ______ (work) on the {task} in the {place} today.", "are working",
    "Today describes a temporary situation, so use are plus the -ing form.",
    { task: ["project", "report", "exercise", "plan"], place: ["office", "library", "classroom", "café"] }],
  [CONT, "The birds sing in the {place} near our {object} every morning.", "Listen! The birds ______ (sing) in the {place} near our {object}.", "are singing",
    "Listen! shows the action is happening now, so use are plus the -ing form.",
    { place: ["trees", "garden", "park", "street"], object: ["house", "window", "gate", "school"] }],
].map(([instr, source, hint, key, why, slots]) => ({
  ...BASE, stage: "transform", format: "rewrite", instr, source, hint, key, why, slots,
}));

/* ---------------- create: 8 ---------------- */
const CREATE = [
  ["Write one sentence about something you are doing right now.", "I with am plus a verb ending in -ing",
    ["exactly one sentence", "must include right now", "must use I"]],
  ["Write one sentence about what another person is doing at the moment.", "a singular subject with is plus a verb ending in -ing",
    ["exactly one sentence", "must include at the moment", "must be about another person"]],
  ["Write one sentence about what two or more people are doing right now.", "a plural subject with are plus a verb ending in -ing",
    ["exactly one sentence", "must include right now", "must use a plural subject"]],
  ["Write one sentence beginning with Look! about something you can see happening.", "am, is or are plus a verb ending in -ing",
    ["exactly one sentence", "must begin with Look!", "must describe a visible action"]],
  ["Write one sentence beginning with Listen! about something you can hear happening.", "am, is or are plus a verb ending in -ing",
    ["exactly one sentence", "must begin with Listen!", "must describe a sound you can hear"]],
  ["Write one sentence about what someone in your family is doing at the moment.", "a singular subject with is plus a verb ending in -ing",
    ["exactly one sentence", "must include at the moment", "must name a family member"]],
  ["Write one sentence about an animal doing something right now.", "is plus a verb ending in -ing",
    ["exactly one sentence", "must include right now", "must use an animal as the subject"]],
  ["Write one sentence about something that is true only today, not every day.", "am, is or are plus a verb ending in -ing",
    ["exactly one sentence", "must include today", "must describe a temporary situation"]],
].map(([prompt, requiredElement, constraints]) => ({
  ...BASE, stage: "create", format: "constrained_sentence", prompt, requiredElement, constraints,
}));

/* ---------------- express: 5 ---------------- */
const EXPRESS = [
  ["Describe what you are doing right now. Write three or four sentences.",
    "present continuous with am plus -ing", ["am with I", "verbs ending in -ing", "right now or another now marker"]],
  ["Look around you and describe what other people are doing at the moment. Write three or four sentences.",
    "present continuous with is and are plus -ing", ["is with singular subjects", "are with plural subjects", "actions happening now"]],
  ["Describe what the people in your home are doing right now. Write three or four sentences.",
    "present continuous for actions happening now", ["different subjects", "correct am, is or are", "verbs ending in -ing"]],
  ["Imagine you are in a busy park. Describe what different people are doing. Write three or four sentences.",
    "present continuous with singular and plural subjects", ["is with singular subjects", "are with plural subjects", "verbs ending in -ing"]],
  ["Describe what is different about today compared with a normal day. Write three or four sentences.",
    "present continuous for temporary situations happening today", ["today as the time marker", "am, is or are plus -ing", "temporary activities"]],
].map(([prompt, targetGrammar, lookFor]) => ({
  ...BASE, stage: "express", format: "free_response", prompt, targetGrammar, lookFor,
}));

const items = [...CHOOSE, ...BUILD, ...TRANSFORM, ...CREATE, ...EXPRESS];
const out = "content/grammar-practice/tenses.present.continuous-now.json";
writeFileSync(out, JSON.stringify(items, null, 1) + "\n");
console.log(`wrote ${out} — ${items.length} items`);
