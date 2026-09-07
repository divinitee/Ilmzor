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
  Kitchen:    ["stove", "fridge", "sink", "oven", "pot", "plate", "knife", "spoon"],
  Weather:    ["rain", "snow", "wind", "storm", "cloud", "sun", "fog", "ice"],
  Family:     ["mother", "father", "sister", "brother", "aunt", "uncle", "cousin", "parent"],
  Colors:     ["red", "blue", "green", "yellow", "purple", "orange", "brown", "pink"],
  Animals:    ["dog", "cat", "horse", "cow", "sheep", "goat", "duck", "rabbit"],
  Body:       ["head", "hand", "foot", "arm", "leg", "eye", "ear", "nose"],
  Clothes:    ["shirt", "dress", "pants", "shoes", "hat", "coat", "skirt", "socks"],
  Food:       ["bread", "rice", "meat", "fish", "fruit", "cheese", "egg", "soup"],
  School:     ["desk", "book", "pen", "pencil", "ruler", "eraser", "notebook", "lesson"],
  Transport:  ["car", "bus", "train", "plane", "bike", "boat", "truck", "taxi"],
  Jobs:       ["doctor", "teacher", "engineer", "lawyer", "nurse", "chef", "pilot", "artist"],
  Sports:     ["football", "tennis", "swimming", "boxing", "running", "cycling", "golf", "rugby"],
  Nature:     ["mountain", "river", "forest", "desert", "valley", "cliff", "waterfall", "ocean"],
  Music:      ["guitar", "piano", "violin", "drum", "flute", "trumpet", "melody", "rhythm"],
  Emotions:   ["joy", "anger", "fear", "sadness", "surprise", "pride", "shame", "jealousy"],
  Travel:     ["passport", "suitcase", "ticket", "hotel", "airport", "tourist", "visa", "souvenir"],
  Technology:  ["computer", "phone", "screen", "keyboard", "battery", "software", "network", "password"],
  Health:     ["medicine", "hospital", "patient", "treatment", "symptom", "disease", "vaccine", "recovery"],
  House:      ["roof", "wall", "door", "window", "stairs", "ceiling", "chimney", "balcony"],
  Shopping:   ["price", "discount", "receipt", "customer", "cashier", "product", "brand", "market"],
  Garden:     ["flower", "tree", "grass", "leaf", "root", "seed", "soil", "branch"],
  Office:     ["printer", "folder", "meeting", "schedule", "report", "contract", "employee", "salary"],
  City:       ["street", "building", "park", "bridge", "tower", "square", "subway", "traffic"],
  Tools:      ["hammer", "screwdriver", "nail", "saw", "wrench", "pliers", "drill", "tape"],
  Money:      ["cash", "coin", "bank", "wallet", "budget", "loan", "profit", "debt"],
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