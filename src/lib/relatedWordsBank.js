// ---------------------------------------------------------------------------
// Shared content module for Related Words + Connection Challenge.
//
// No category/topic-grouping data exists anywhere else in the app —
// VocabularyWord has `tags` but they're loose and inconsistent, not the
// clean {category: [words...]} structure these games need. This is a
// hand-authored pilot bank, same precedent as OddOneOutGame's
// ODD_ONE_OUT_BANK: ship playable now, flag full coverage as a followup.
//
// 25 categories × 8 words = 200 words. Each word appears in exactly one
// category to avoid ambiguity (a word in two categories would make "pick
// the one in the same category" have multiple correct answers).
//
// Both games draw from this one module:
//   Related Words: pick target from a category, 3 wrong from other categories
//   Connection Challenge: 3 clues from a category, 1 correct + 3 wrong from others
// ---------------------------------------------------------------------------

export const CATEGORY_BANK = {
  // "pot" → "pan", "knife" → "bowl": pot is also Garden (plant pot), knife is
  // also Tools. Replacements are unambiguously kitchen-only.
  Kitchen:    ["stove", "fridge", "sink", "oven", "pan", "plate", "bowl", "spoon"],
  Weather:    ["rain", "snow", "wind", "storm", "cloud", "sun", "fog", "ice"],
  Family:     ["mother", "father", "sister", "brother", "aunt", "uncle", "cousin", "parent"],
  // "orange" → "black": orange is also Food (the fruit). Black is unambiguously a color.
  Colors:     ["red", "blue", "green", "yellow", "purple", "black", "brown", "pink"],
  Animals:    ["dog", "cat", "horse", "cow", "sheep", "goat", "duck", "rabbit"],
  Body:       ["head", "hand", "foot", "arm", "leg", "eye", "ear", "nose"],
  Clothes:    ["shirt", "dress", "pants", "shoes", "hat", "coat", "skirt", "socks"],
  // "fish" → "butter": fish is also Animals. Butter is unambiguously food.
  Food:       ["bread", "rice", "meat", "butter", "fruit", "cheese", "egg", "soup"],
  School:     ["desk", "book", "pen", "pencil", "ruler", "eraser", "notebook", "lesson"],
  Transport:  ["car", "bus", "train", "plane", "bike", "boat", "truck", "taxi"],
  // doctor→builder, nurse→painter, pilot→baker, teacher→farmer: doctor/nurse
  // are also Health, pilot is also Transport, teacher is also School.
  // Replacements are unambiguously jobs with no secondary category.
  Jobs:       ["builder", "farmer", "engineer", "lawyer", "painter", "chef", "baker", "artist"],
  Sports:     ["football", "tennis", "swimming", "boxing", "running", "cycling", "golf", "rugby"],
  Nature:     ["mountain", "river", "forest", "desert", "valley", "cliff", "waterfall", "ocean"],
  Music:      ["guitar", "piano", "violin", "drum", "flute", "trumpet", "melody", "rhythm"],
  Emotions:   ["joy", "anger", "fear", "sadness", "surprise", "pride", "shame", "jealousy"],
  // ticket→guidebook: ticket is also Transport (bus/train ticket).
  Travel:     ["passport", "suitcase", "guidebook", "hotel", "airport", "tourist", "visa", "souvenir"],
  // keyboard→charger: keyboard is also Music (keyboard instrument).
  Technology:  ["computer", "phone", "screen", "charger", "battery", "software", "network", "password"],
  Health:     ["medicine", "hospital", "patient", "treatment", "symptom", "disease", "vaccine", "recovery"],
  House:      ["roof", "wall", "door", "window", "stairs", "ceiling", "chimney", "balcony"],
  Shopping:   ["price", "discount", "receipt", "customer", "cashier", "product", "brand", "market"],
  // Entire category replaced: every original word (flower, tree, grass, leaf,
  // root, seed, soil, branch) also fits Nature. Replacements are garden
  // structures/equipment that are unambiguously garden, not nature or tools.
  Garden:     ["fence", "greenhouse", "sprinkler", "planter", "patio", "trellis", "gazebo", "flowerbed"],
  // employee→paperclip, salary→briefcase: employee is also Jobs, salary is also
  // Money. Replacements are unambiguously office supplies.
  Office:     ["printer", "folder", "meeting", "schedule", "report", "contract", "paperclip", "briefcase"],
  // subway→statue, traffic→streetlight, park→monument: subway/traffic are also
  // Transport, park is also Nature. Replacements are unambiguously city.
  City:       ["street", "building", "monument", "bridge", "tower", "square", "statue", "streetlight"],
  // nail→bolt: nail is also Body (fingernail). Bolt is unambiguously hardware.
  Tools:      ["hammer", "screwdriver", "bolt", "saw", "wrench", "pliers", "drill", "tape"],
  // cash→deposit: cash is also Shopping (you pay with cash). Deposit is
  // unambiguously money/banking.
  Money:      ["deposit", "coin", "bank", "wallet", "budget", "loan", "profit", "debt"],
};

// Flat list of [category, words] pairs for easy random access
export const CATEGORY_ENTRIES = Object.entries(CATEGORY_BANK);

// All words across all categories (for distractor pool)
export const ALL_WORDS = CATEGORY_ENTRIES.flatMap(([cat, words]) => words);

// Map word → category for quick lookup
export const WORD_TO_CATEGORY = {};
CATEGORY_ENTRIES.forEach(([cat, words]) => {
  words.forEach((w) => { WORD_TO_CATEGORY[w] = cat; });
});

export const CATEGORY_COUNT = CATEGORY_ENTRIES.length;