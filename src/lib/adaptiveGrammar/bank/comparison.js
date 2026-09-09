import { domainBuilder, leg } from "@/lib/adaptiveGrammar/build";
const d = domainBuilder("comparison");
const A2 = leg("A2_MCQ"), B1 = leg("B1_MCQ"), B1O = leg("B1_OPEN_GRAMMAR");

export default [
  // ---------------- A1 ----------------
  d.mcq({ b: "comparative", t: "er-comparative", L: "A1", diff: 2, focus: "-er comparative of a short adjective with 'than'", pre: ["comparative-form"],
    prompt: "My brother is ______ than me.", options: ["tall", "taller", "tallest", "more tall"], key: 1, why: "Short adjective → -er + than." }),
  d.gap({ b: "comparative", t: "er-comparative", L: "A1", diff: 2, focus: "Spelling of -er with a final consonant doubled", pre: ["comparative-form"],
    source: "Today is ______ (hot) than yesterday.", key: "hotter", why: "hot → hotter." }),

  // ---------------- A2 ----------------
  d.mcq({ b: "comparative", t: "er-comparative", L: "A2", diff: 1, focus: "-er comparative (not 'more fast')", pre: ["comparative-form"],
    prompt: "My car is ______ than yours.", options: ["fast", "faster", "fastest", "more fast"], key: 1, why: "One syllable → faster.", legacy: A2("My car is ______ than yours.") }),
  d.mcq({ b: "superlative", t: "irregular-superlative", L: "A2", diff: 1, focus: "best as superlative of good, with 'the'", pre: ["superlative-form"],
    prompt: "This is the ______ restaurant in town.", options: ["good", "better", "best", "most good"], key: 2, why: "Irregular superlative → best.", legacy: A2("This is the ______ restaurant in town.") }),
  d.mcq({ b: "comparative", t: "more-comparative", L: "A2", diff: 1, focus: "more + long adjective", pre: ["comparative-form"],
    prompt: "A train is usually ______ than a bus.", options: ["more comfortable", "comfortabler", "most comfortable", "comfortable"], key: 0, why: "Long adjective → more + adj.", legacy: A2("A train is usually ______ than a bus.") }),
  d.mcq({ b: "comparative", t: "less-comparative", L: "A2", diff: 2, focus: "less + adjective + than", pre: ["less-fewer", "comparative-form"],
    prompt: "This exercise is ______ difficult than the last one.", options: ["less", "least", "little", "fewer"], key: 0, why: "Comparative of inferiority → less.", legacy: A2("This exercise is ______ difficult than the last one.") }),
  d.mcq({ b: "equality", t: "as-as", L: "A2", diff: 1, focus: "as + adj + as", pre: ["as-as"],
    prompt: "My sister is as tall ______ me.", options: ["than", "as", "like", "that"], key: 1, why: "Equality → as ... as.", legacy: A2("My sister is as tall ______ me.") }),
  d.gap({ b: "superlative", t: "est-superlative", L: "A2", diff: 2, focus: "-iest spelling with 'the'", pre: ["superlative-form"],
    source: "Samarkand is one of ______ (old) cities in the world.", key: "the oldest", why: "the + -est." }),
  d.correct({ b: "comparative", t: "double-comparative-error", L: "A2", diff: 2, focus: "Not combining more with -er", pre: ["comparative-form"],
    source: "My new flat is more bigger than the old one.", key: "My new flat is bigger than the old one.", alt: ["My new flat is much bigger than the old one."], why: "Never 'more + -er'." }),

  // ---------------- B1 ----------------
  d.mcq({ b: "modified-comparison", t: "much-comparative", L: "B1", diff: 2, focus: "much + more + adjective (modifier position)", pre: ["comparative-modifiers", "comparative-form"],
    prompt: "This problem is ______ than I expected.", options: ["much difficult", "much more difficult", "more much difficult", "most difficult"], key: 1, why: "much + more + adj.", legacy: B1("This problem is ______ than I expected.") }),
  d.mcq({ b: "modified-comparison", t: "slightly-comparative", L: "B1", diff: 1, focus: "slightly + comparative", pre: ["comparative-modifiers"],
    prompt: "The new model is slightly ______ than the old one.", options: ["efficient", "more efficient", "most efficient", "efficiently"], key: 1, why: "'than' → comparative form.", legacy: B1("The new model is slightly ______ than the old one.") }),
  d.mcq({ b: "parallel-comparison", t: "the-more-the-more", L: "B1", diff: 2, focus: "the + comparative ..., the + comparative", pre: ["double-comparative", "comparative-form"],
    prompt: "The more you practise, ______ you become.", options: ["the better", "better", "the best", "more better"], key: 0, why: "Parallel 'the + comparative'.", legacy: B1("The more you practise, ______ you become.") }),
  d.mcq({ b: "equality", t: "not-as-as", L: "B1", diff: 1, focus: "not as ... as = less than", pre: ["as-as", "less-fewer"],
    prompt: "Which sentence means the same as 'The film is not as good as the book'?", options: ["The book is better than the film.", "The film is better than the book.", "The film is as good as the book.", "The book is not as good as the film."], key: 0, why: "not as good as → the other is better." }),
  d.mcq({ b: "comparative", t: "fewer-less", L: "B1", diff: 2, focus: "fewer with countable plurals, less with uncountables", pre: ["less-fewer", "countable-uncountable"],
    prompt: "There were ______ people at the concert than last year.", options: ["fewer", "less", "little", "lesser"], key: 0, why: "people = countable → fewer.", overlaps: ["nouns-articles"] }),
  d.rewrite({ b: "equality", t: "not-as-as", L: "B1", diff: 2, focus: "Comparative → negative equality transformation", pre: ["as-as", "comparative-form"],
    source: "The bus is cheaper than the train.", hint: "The train is ______ the bus.", key: "not as cheap as", alt: ["not so cheap as", "more expensive than"], why: "cheaper than ↔ not as cheap as." }),
  d.gap({ b: "parallel-comparison", t: "progressive-comparative", L: "B1", diff: 2, focus: "comparative + and + comparative for gradual change", pre: ["progressive-comparative", "comparative-form"],
    source: "As the exam got closer, I felt ______ (nervous).", key: "more and more nervous", why: "Gradual increase → more and more + adj." }),
  d.guided({ b: "modified-comparison", t: "much-comparative", L: "B1", diff: 2, focus: "Productive intensified comparative", pre: ["comparative-modifiers"],
    prompt: "Write a sentence comparing two things. Use much, far, a lot, or slightly with a comparative.", required: "an intensified comparative using much/far/a lot/slightly + comparative form",
    legacy: B1O("Write a sentence comparing two things. Use much, far, a lot, or slightly with a comparative.") }),
  d.guided({ b: "parallel-comparison", t: "the-more-the-more", L: "B1", diff: 3, focus: "Productive parallel comparative", pre: ["double-comparative"],
    prompt: "Write one sentence using 'The more..., the more...' to show a relationship between two changes.", required: "the correct 'The + comparative..., the + comparative...' parallel structure",
    legacy: B1O("Write one sentence using 'The more..., the more...' to show a relationship between two changes.") }),

  // ---------------- B2 ----------------
  d.gap({ b: "modified-comparison", t: "by-far", L: "B2", diff: 2, focus: "by far intensifying a superlative", pre: ["superlative-modifiers", "superlative-form"],
    instr: "Complete the gap with ONE word.", source: "This is by ______ the best film I have seen this year.", key: "far", why: "'by far' + superlative." }),
  d.mcq({ b: "like-as", t: "like-vs-as", L: "B2", diff: 2, focus: "like + noun (similarity) vs as + clause/role", pre: ["like-vs-as"],
    prompt: "She works ______ a nurse in the local hospital.", options: ["like", "as", "such as", "so"], key: 1, why: "Actual role → as." }),
  d.mcq({ b: "like-as", t: "like-vs-as", L: "B2", diff: 2, focus: "as + clause ('as I said') vs like + noun", pre: ["like-vs-as"],
    prompt: "______ I mentioned earlier, the deadline has been moved.", options: ["Like", "As", "Such as", "Alike"], key: 1, why: "Followed by a clause → as." }),
  d.mcq({ b: "superlative", t: "superlative-present-perfect", L: "B2", diff: 1, focus: "Superlative + present perfect (the best ... I have ever ...)", pre: ["superlative-form", "present-perfect"],
    prompt: "That was the most delicious meal I ______.", options: ["ever ate", "have ever eaten", "had ever eaten", "ever eat"], key: 1, why: "Superlative + ever → present perfect.", overlaps: ["tenses"] }),
  d.rewrite({ b: "superlative", t: "negative-to-superlative", L: "B2", diff: 2, focus: "'No other ... as ... as' → superlative", pre: ["as-as", "superlative-form"],
    source: "No other city in the country is as expensive as London.", hint: "London is ______.", key: "the most expensive city in the country", alt: ["the country's most expensive city"], why: "Negative equality ≡ superlative." }),
  d.correct({ b: "equality", t: "as-as-adverb", L: "B2", diff: 2, focus: "as + ADVERB + as when modifying a verb", pre: ["as-as", "adjective-adverb-distinction"],
    source: "Please answer as quick as you can.", key: "Please answer as quickly as you can.", why: "Modifying 'answer' → adverb inside as...as." }),
  d.mcq({ b: "modified-comparison", t: "twice-as", L: "B2", diff: 2, focus: "Multipliers with as ... as (twice as much as)", pre: ["as-as", "comparative-modifiers"],
    prompt: "Rent in the capital is ______ in my hometown.", options: ["twice as expensive as", "twice more expensive than", "two times expensive than", "double expensive as"], key: 0, why: "Multiplier + as ... as." }),

  // ---------------- C1 ----------------
  d.rewrite({ b: "parallel-comparison", t: "the-more-the-more", L: "C1", diff: 2, focus: "Reduced parallel comparative with ellipsis ('the sooner, the better')", pre: ["double-comparative", "ellipsis-substitution"],
    instr: "Rewrite the sentence using 'The ..., the ...' and no more than six words.", source: "If we leave sooner, it will be better.", hint: "The ______.", key: "sooner, the better", alt: ["sooner the better"], why: "Elliptical parallel comparative.", overlaps: ["pronouns"] }),
  d.mcq({ b: "comparative", t: "comparative-of-adverbs", L: "C1", diff: 2, focus: "Irregular adverb comparatives (better/worse/further) after a verb", pre: ["comparative-form", "irregular-adverbs"],
    prompt: "Since the surgery, he has been able to walk much ______ than before.", options: ["farther", "more far", "farer", "the farthest"], key: 0, why: "far → farther/further.", overlaps: ["adj-adv"] }),
  d.mcq({ b: "equality", t: "as-as-clause-inversion", L: "C1", diff: 3, focus: "Formal inverted 'as' clause of comparison ('as did / as is')", pre: ["as-as", "subject-auxiliary-inversion"],
    prompt: "The northern regions saw heavy rainfall, ______ several coastal towns.", options: ["as did", "as also", "like did", "so did also"], key: 0, why: "Formal comparison clause with inversion: as + auxiliary + subject.", overlaps: ["sentence-structure"] }),
  d.gap({ b: "superlative", t: "superlative-of-two", L: "C1", diff: 2, focus: "Comparative (not superlative) when comparing exactly two, formal usage", pre: ["comparative-form", "superlative-form"],
    instr: "Complete with the correct form of the adjective in brackets.", source: "Of the two candidates, Ms Karimova is clearly ______ (qualified).", key: "the more qualified", alt: ["more qualified"], why: "Two items → comparative with 'the'." }),

  // ---------------- C2 ----------------
  d.mcq({ b: "modified-comparison", t: "the-comparative-for-it", L: "C2", diff: 3, focus: "'the + comparative' with a causal 'for it' / 'for that' ('none the wiser', 'all the better')", pre: ["double-comparative", "comparative-form"],
    prompt: "She explained it twice, but I was ______ wiser.", options: ["none the", "not the", "no more", "none more"], key: 0, why: "Idiomatic causal comparative 'none the wiser' — comparative preceded by 'the' meaning 'to that degree'.",
    flags: ["c2-check: the 'the + comparative' causal construction is a grammatical use of the definite article with comparatives, not a vocabulary item; however 'none the wiser' is semi-fixed. C2 provisional."] }),
];