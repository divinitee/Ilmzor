import { domainBuilder, leg } from "@/lib/adaptiveGrammar/build";
const d = domainBuilder("comparison");
const A2 = leg("A2_MCQ"), B1 = leg("B1_MCQ"), B1O = leg("B1_OPEN_GRAMMAR");

export default [
  // ---------------- A2 ----------------
  d.mcq({ b: "comparative", t: "short-adjective-er", L: "A2", diff: 1, focus: "-er comparative on a one-syllable adjective", pre: ["comparative-form"],
    prompt: "My car is ______ than yours.", options: ["fast", "faster", "fastest", "more fast"], key: 1, why: "Short adjective → -er.", legacy: A2("My car is ______ than yours.") }),
  d.mcq({ b: "comparative", t: "more-long-adjective", L: "A2", diff: 1, focus: "more + long adjective (not -er)", pre: ["comparative-form"],
    prompt: "A train is usually ______ than a bus.", options: ["more comfortable", "comfortabler", "most comfortable", "comfortable"], key: 0, why: "Three syllables → more + adjective.", legacy: A2("A train is usually ______ than a bus.") }),
  d.mcq({ b: "superlative", t: "irregular-superlative", L: "A2", diff: 1, focus: "Irregular superlative best", pre: ["superlative-form"],
    prompt: "This is the ______ restaurant in town.", options: ["good", "better", "best", "most good"], key: 2, why: "good → best.", legacy: A2("This is the ______ restaurant in town.") }),
  d.mcq({ b: "equality", t: "as-as", L: "A2", diff: 1, focus: "as ... as for equality", pre: ["as-as"],
    prompt: "My sister is as tall ______ me.", options: ["than", "as", "like", "that"], key: 1, why: "as + adjective + as.", legacy: A2("My sister is as tall ______ me.") }),
  d.mcq({ b: "comparative", t: "less", L: "A2", diff: 2, focus: "less for a lower degree with a long adjective", pre: ["less-fewer", "comparative-form"],
    prompt: "This exercise is ______ difficult than the last one.", options: ["less", "least", "little", "fewer"], key: 0, why: "Lower degree → less + adjective.", legacy: A2("This exercise is ______ difficult than the last one.") }),
  d.gap({ b: "comparative", t: "spelling-doubling", L: "A2", diff: 2, focus: "Consonant doubling in the comparative (big → bigger)", pre: ["comparative-form"],
    source: "Tashkent is much ______ (big) than Samarkand.", key: "bigger", why: "CVC adjective doubles the final consonant." }),
  d.order({ b: "superlative", t: "the-superlative", L: "A2", diff: 2, focus: "the + superlative + noun + in + place", pre: ["superlative-form", "definite-article"],
    tokens: ["the", "in", "is", "class", "she", "student", "tallest"], key: ["she", "is", "the", "tallest", "student", "in", "class"], why: "the + superlative before the noun." }),

  // ---------------- B1 ----------------
  d.mcq({ b: "modified-comparison", t: "much-comparative", L: "B1", diff: 2, focus: "much before a comparative (not before a bare adjective)", pre: ["comparative-modifiers"],
    prompt: "This problem is ______ than I expected.", options: ["much difficult", "much more difficult", "more much difficult", "most difficult"], key: 1, why: "much + comparative form.", legacy: B1("This problem is ______ than I expected.") }),
  d.mcq({ b: "modified-comparison", t: "slightly-comparative", L: "B1", diff: 1, focus: "Comparative required after a degree modifier", pre: ["comparative-modifiers"],
    prompt: "The new model is slightly ______ than the old one.", options: ["efficient", "more efficient", "most efficient", "efficiently"], key: 1, why: "'than' requires a comparative.", legacy: B1("The new model is slightly ______ than the old one.") }),
  d.mcq({ b: "parallel-comparison", t: "the-more-the-more", L: "B1", diff: 3, focus: "The + comparative, the + comparative parallel structure", pre: ["double-comparative"],
    prompt: "The more you practise, ______ you become.", options: ["the better", "better", "the best", "more better"], key: 0, why: "Both halves need 'the + comparative'.", legacy: B1("The more you practise, ______ you become.") }),
  d.gap({ b: "equality", t: "not-as-as", L: "B1", diff: 2, focus: "not as ... as for a lower degree", pre: ["as-as"],
    instr: "Complete the gaps with two words so the meaning matches: winter here is warmer.", source: "Winter here isn't ______ cold ______ in Moscow.", key: ["as", "as"], alt: [["so", "as"]], why: "not as/so + adjective + as." }),
  d.rewrite({ b: "comparative", t: "comparative-to-equality", L: "B1", diff: 2, focus: "Rewriting a comparative as not as ... as", pre: ["comparative-form", "as-as"],
    source: "Bukhara is smaller than Tashkent.", hint: "Bukhara isn't ______ Tashkent.", key: "as big as", alt: ["as large as"], why: "smaller than → not as big as." }),
  d.mcq({ b: "like-as", t: "like-noun", L: "B1", diff: 2, focus: "like + noun vs as + clause", pre: ["like-vs-as"],
    prompt: "She sings ______ her mother did when she was young.", options: ["like of", "as", "so as", "such as"], key: 1, why: "A following clause requires 'as'." }),
  d.guided({ b: "modified-comparison", t: "much-comparative", L: "B1", diff: 2, focus: "Productive intensified comparative", pre: ["comparative-modifiers"],
    prompt: "Write a sentence comparing two things. Use much, far, a lot, or slightly with a comparative.", required: "an intensified comparative using much/far/a lot/slightly + comparative form",
    legacy: B1O("Write a sentence comparing two things. Use much, far, a lot, or slightly with a comparative.") }),
  d.guided({ b: "parallel-comparison", t: "the-more-the-more", L: "B1", diff: 3, focus: "Productive double comparative", pre: ["double-comparative"],
    prompt: "Write one sentence using 'The more..., the more...' to show a relationship between two changes.", required: "the correct 'The + comparative..., the + comparative...' parallel structure",
    legacy: B1O("Write one sentence using 'The more..., the more...' to show a relationship between two changes.") }),

  // ---------------- B2 ----------------
  d.mcq({ b: "comparative", t: "less-fewer", L: "B2", diff: 2, focus: "fewer with countable plurals, less with uncountables", pre: ["less-fewer", "countable-uncountable"],
    prompt: "There were ______ applicants this year, and they had ______ experience than last year's group.", options: ["less / fewer", "fewer / less", "fewer / fewer", "less / less"], key: 1, why: "applicants countable → fewer; experience uncountable → less.", overlaps: ["nouns-articles"] }),
  d.mcq({ b: "parallel-comparison", t: "progressive-comparative", L: "B2", diff: 2, focus: "Repeated comparative for gradual change", pre: ["progressive-comparative"],
    prompt: "Housing in the city is getting ______.", options: ["more and more expensive", "expensiver and expensiver", "the more expensive", "much expensive"], key: 0, why: "Gradual change → more and more + adjective." }),
  d.mcq({ b: "superlative", t: "superlative-modifiers", L: "B2", diff: 2, focus: "by far modifying a superlative", pre: ["superlative-modifiers"],
    prompt: "It was ______ the best performance of the evening.", options: ["by far", "much", "very much", "far more"], key: 0, why: "Superlative intensifier → by far." }),
  d.rewrite({ b: "superlative", t: "superlative-to-comparative", L: "B2", diff: 3, focus: "Expressing a superlative meaning with a comparative + any other", pre: ["superlative-form", "comparative-form"],
    source: "This is the most reliable car I have ever driven.", hint: "This car is ______ I have ever driven.", key: "more reliable than any other", alt: ["more reliable than any other car"], why: "Superlative → comparative + than any other." }),
  d.mcq({ b: "like-as", t: "as-if", L: "B2", diff: 3, focus: "as if + past form for an unreal comparison", pre: ["like-vs-as", "as-if"],
    prompt: "He talks about the plan as if it ______ already been approved.", options: ["has", "had", "have", "would have"], key: 1, why: "Unreal/doubtful comparison → past form.", overlaps: ["conditionals-wishes"] }),
  d.correct({ b: "equality", t: "double-comparative-error", L: "B2", diff: 1, focus: "No double marking: 'more' cannot combine with -er", pre: ["comparative-form"],
    source: "The second interview was more easier than the first.", key: "The second interview was easier than the first.", why: "One comparative marker only." }),

  // ---------------- C1 ----------------
  d.mcq({ b: "parallel-comparison", t: "the-more-inversion", L: "C1", diff: 3, focus: "Double comparative with a full clause and correct ellipsis", pre: ["double-comparative"],
    prompt: "______ the deadline approached, the more anxious the team became.", options: ["The nearer", "Nearer", "The near", "More near"], key: 0, why: "Both clauses need 'the + comparative'; 'the nearer' fits the clause." }),
  d.mcq({ b: "modified-comparison", t: "no-more-than", L: "C1", diff: 2, focus: "'no more ... than' as a denial of both, not a comparison of degree", pre: ["comparative-modifiers"],
    prompt: "'The new policy is no more effective than the old one' means that ______.", options: ["the new one is better", "neither policy is effective", "the old one is worse", "both are highly effective"], key: 1, why: "'no more X than' denies X of both terms." }),
  d.gap({ b: "comparative", t: "comparative-correlative-ellipsis", L: "C1", diff: 3, focus: "Comparative with an elliptical than-clause using an auxiliary", pre: ["comparative-form", "ellipsis-substitution"],
    instr: "Complete the gap with TWO words so the comparison is complete but not repetitive.", source: "She earns considerably more now than she ______ five years ago.", key: "did", alt: ["used to"], why: "Elliptical than-clause takes the auxiliary alone.",
    flags: ["Instruction says TWO words but the natural answer 'did' is one; 'used to' is two. Tighten the instruction to 'ONE or TWO words' at review."] }),
  d.rewrite({ b: "equality", t: "as-as-quantity", L: "C1", diff: 2, focus: "as much/many + noun + as for quantity equality", pre: ["as-as", "much-many"],
    source: "I did not expect the project to require so much time.", hint: "The project required ______ I had expected.", key: "more time than", why: "Quantity comparison with a than-clause.", overlaps: ["nouns-articles"] }),

  // ---------------- C2 ----------------
  d.mcq({ b: "modified-comparison", t: "not-so-much-as", L: "C2", diff: 3, focus: "'not so much X as Y' as a reformulating comparative, not a degree comparison", pre: ["as-as", "comparative-modifiers"],
    prompt: "The difficulty was ______ the cost as the lack of trained staff.", options: ["not so much", "no more", "much less than", "far from"], key: 0, why: "'not so much X as Y' corrects one description with another; the other options do not license the following 'as'.",
    flags: ["c2-check: a fixed correlative comparative construction with obligatory 'as' — structural, not lexical. C2 provisional."] }),
];