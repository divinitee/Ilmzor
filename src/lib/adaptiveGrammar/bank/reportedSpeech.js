import { domainBuilder, leg } from "@/lib/adaptiveGrammar/build";
const d = domainBuilder("reported-speech");
const B1 = leg("B1_MCQ"), B2 = leg("B2_MCQ"), B1O = leg("B1_OPEN_GRAMMAR"), B2O = leg("B2_OPEN_GRAMMAR");

// Reported Speech deliberately begins at B1 (ruling §4). No A1/A2 items are
// manufactured: backshift presupposes control of past tenses and pronoun
// shift that A1/A2 learners have not yet consolidated.

export default [
  // ---------------- B1 ----------------
  d.mcq({ b: "statements", t: "tense-backshift", L: "B1", diff: 2, focus: "Present → past backshift plus pronoun shift in a reported statement", pre: ["tense-backshift", "pronoun-time-shift"],
    prompt: "Anna said, 'I am tired.' Which sentence reports this correctly?",
    options: ["Anna said that I am tired.", "Anna said that she was tired.", "Anna said that she is tired.", "Anna said that she tired."], key: 1, why: "I → she; am → was.", legacy: B1("Anna said, 'I am tired.' Which sentence is correct?") }),
  d.mcq({ b: "statements", t: "will-would-backshift", L: "B1", diff: 2, focus: "will → would and tomorrow → the next day", pre: ["tense-backshift", "reported-modals", "pronoun-time-shift"],
    prompt: "Tom said, 'I will call you tomorrow.' Which sentence reports this correctly?",
    options: ["Tom said he would call me the next day.", "Tom said he will call me tomorrow.", "Tom said he would call you tomorrow.", "Tom said he called me the next day."], key: 0, why: "will → would; you → me; tomorrow → the next day.", legacy: B1("Tom said, 'I will call you tomorrow.'") }),
  d.gap({ b: "statements", t: "tense-backshift", L: "B1", diff: 2, focus: "Producing past-simple backshift from a present-simple original", pre: ["tense-backshift"],
    instr: "Complete the gap with TWO words to report the sentence.", source: "'I work in a bank.' → She said that she ______ in a bank.", key: "worked in", alt: ["worked"], why: "Present simple → past simple.",
    flags: ["Answer length depends on whether 'in' is counted; 'worked' alone is accepted. Tighten the instruction at review."] }),
  d.mcq({ b: "questions", t: "reported-wh-question", L: "B1", diff: 2, focus: "No inversion and no auxiliary do in a reported wh-question", pre: ["reported-question-order", "indirect-question-order"],
    prompt: "'Where do you live?' → She asked me where ______.", options: ["did I live", "I lived", "do I live", "lived I"], key: 1, why: "Statement word order, backshifted verb.", legacy: B1("She asked me where ______."), overlaps: ["questions-negation"] }),
  d.gap({ b: "questions", t: "reported-yes-no", L: "B1", diff: 2, focus: "if/whether + statement order in a reported yes/no question", pre: ["reported-question-order"],
    instr: "Complete the gap with FOUR words to report the question.", source: "'Are you coming to the party?' → He asked me ______ to the party.", key: "if I was coming", alt: ["whether I was coming"], why: "if/whether + subject + backshifted verb." }),
  d.mcq({ b: "commands-requests", t: "reported-command", L: "B1", diff: 2, focus: "told + object + to-infinitive for a reported command", pre: ["reported-commands", "verb-object-infinitive"],
    prompt: "'Close the window.' → She ______ the window.", options: ["told me close", "told me to close", "said me to close", "told to me close"], key: 1, why: "tell + object + to-infinitive.", overlaps: ["verb-patterns"] }),
  d.mcq({ b: "reporting-verbs", t: "say-vs-tell", L: "B1", diff: 1, focus: "tell takes a person object, say does not", pre: ["say-tell"],
    prompt: "He ______ that the shop was already closed.", options: ["told", "said me", "said", "told to me"], key: 2, why: "say + that-clause without a person object." }),
  d.guided({ b: "statements", t: "tense-backshift", L: "B1", diff: 2, focus: "Productive reported statement with correct backshift", pre: ["tense-backshift"],
    prompt: "Write one sentence reporting something another person said. Use reported speech.", required: "reported speech with correct tense backshift from the original statement",
    legacy: B1O("Write one sentence reporting something another person said. Use reported speech.") }),
  d.guided({ b: "statements", t: "will-would-backshift", L: "B1", diff: 2, focus: "Productive reporting of a promise/prediction", pre: ["tense-backshift", "reported-modals"],
    prompt: "Write one sentence reporting a promise, prediction, or future statement made by another person.", required: "reported speech correctly reporting a promise/prediction (would/will backshifted appropriately)",
    legacy: B1O("Write one sentence reporting a promise, prediction, or future statement made by another person.") }),

  // ---------------- B2 ----------------
  d.mcq({ b: "modals-reported", t: "cant-couldnt", L: "B2", diff: 2, focus: "can't → couldn't in reported speech", pre: ["reported-modals", "tense-backshift"],
    prompt: "He said, 'I can't attend the meeting.' Which sentence reports this correctly?",
    options: ["He said he couldn't attend the meeting.", "He said he can't attended the meeting.", "He said I couldn't attend the meeting.", "He said he didn't attend the meeting."], key: 0, why: "can't → couldn't.", legacy: B2("He said, 'I can't attend the meeting.'") }),
  d.mcq({ b: "reporting-verbs", t: "deny-gerund", L: "B2", diff: 2, focus: "deny + perfect gerund (not a that-clause with to-infinitive)", pre: ["reporting-verb-patterns", "perfect-gerund"],
    prompt: "She ______ having taken the documents.", options: ["denied", "suggested", "insisted", "warned"], key: 0, why: "Only 'deny' takes a bare (perfect) gerund here.", legacy: B2("She ______ having taken the documents."), overlaps: ["verb-patterns"] }),
  d.gap({ b: "modals-reported", t: "must-had-to", L: "B2", diff: 3, focus: "must (obligation) → had to in reported speech", pre: ["reported-modals"],
    instr: "Complete the gap with THREE words to report the sentence.", source: "'You must submit the form today.' → He told me that I ______ the form that day.", key: "had to submit", why: "Obligation 'must' backshifts to 'had to'." }),
  d.mcq({ b: "reporting-verbs", t: "reporting-verb-patterns", L: "B2", diff: 3, focus: "Matching a reporting verb to its required complement pattern", pre: ["reporting-verb-patterns"],
    prompt: "The manager ______ us not to discuss the case with journalists.", options: ["warned", "suggested", "denied", "insisted"], key: 0, why: "warn + object + (not) to-infinitive; the others take different patterns." }),
  d.rewrite({ b: "commands-requests", t: "reported-request", L: "B2", diff: 2, focus: "Reporting a polite request with ask + object + to-infinitive", pre: ["reported-commands"],
    instr: "Rewrite as reported speech, beginning with the words given.", source: "'Could you send me the file, please?' → She ______", key: "asked me to send her the file", why: "ask + object + to-infinitive, with pronoun shift." }),
  d.rewrite({ b: "reporting-verbs", t: "suggest-pattern", L: "B2", diff: 3, focus: "suggest + -ing / that-clause when reporting a proposal", pre: ["reporting-verb-patterns"],
    instr: "Rewrite as reported speech, beginning with the words given.", source: "'Why don't we meet on Thursday?' → He ______", key: "suggested meeting on Thursday", alt: ["suggested that we meet on Thursday", "suggested that we should meet on Thursday"], why: "suggest + -ing or that-clause, never + object + to-infinitive.", overlaps: ["verb-patterns"] }),
  d.guided({ b: "modals-reported", t: "modal-backshift", L: "B2", diff: 2, focus: "Productive reporting of ability/possibility/obligation", pre: ["reported-modals"],
    prompt: "Report something another person said about an ability, possibility, or obligation. Use appropriate tense and pronoun changes.", required: "reported speech with correct tense/modal backshift for ability, possibility, or obligation",
    legacy: B2O("Report something another person said about an ability, possibility, or obligation. Use appropriate tense and pronoun changes.") }),
  d.guided({ b: "reporting-verbs", t: "reporting-verb-patterns", L: "B2", diff: 3, focus: "Productive reporting verb with its correct complement", pre: ["reporting-verb-patterns"],
    prompt: "Write a sentence using deny, admit, insist, recommend, warn, or suggest to report someone's words.", required: "a reporting verb (deny/admit/insist/recommend/warn/suggest) used with the correct following structure",
    legacy: B2O("Write a sentence using deny, admit, insist, recommend, warn, or suggest to report someone's words.") }),

  // ---------------- C1 ----------------
  d.mcq({ b: "backshift-exceptions", t: "still-true-no-backshift", L: "C1", diff: 3, focus: "Backshift is optional when the reported fact is still true", pre: ["backshift-exceptions", "tense-backshift"],
    prompt: "Yesterday the doctor told me that exercise ______ good for the heart. Which is best in a general, still-true statement?",
    options: ["was", "is", "had been", "would be"], key: 1, why: "A permanently true general fact need not backshift." }),
  d.mcq({ b: "backshift-exceptions", t: "past-perfect-no-further-shift", L: "C1", diff: 2, focus: "Past perfect cannot backshift further", pre: ["backshift-exceptions", "past-perfect"],
    prompt: "'I had already left when it happened.' → He said that he ______ already left when it happened.", options: ["had", "has", "had had", "was"], key: 0, why: "Past perfect stays past perfect." }),
  d.mcq({ b: "modals-reported", t: "unshifted-modals", L: "C1", diff: 3, focus: "would/could/should/might do not backshift further", pre: ["reported-modals", "backshift-exceptions"],
    prompt: "'I might be late.' → She said she ______ be late.", options: ["might", "mighted", "may", "must"], key: 0, why: "'might' has no further past form." }),
  d.rewrite({ b: "reporting-verbs", t: "admit-perfect-gerund", L: "C1", diff: 3, focus: "admit + perfect gerund / that-clause when the admitted act is earlier", pre: ["reporting-verb-patterns", "perfect-gerund"],
    instr: "Rewrite as reported speech, beginning with the words given.", source: "'I took the money,' he said. → He ______", key: "admitted taking the money", alt: ["admitted having taken the money", "admitted that he had taken the money"], why: "admit + gerund/perfect gerund/that-clause.", overlaps: ["verb-patterns"] }),
  d.gap({ b: "questions", t: "reported-question-formal", L: "C1", diff: 2, focus: "Reported question inside a formal noun phrase (no inversion, no do)", pre: ["reported-question-order"],
    instr: "Complete the gap with FOUR words.", source: "The committee asked ______ the funds had been allocated.", key: "how the money had", alt: ["why the remaining funds"], why: "Reported question keeps statement order.",
    flags: ["Open-ended stem allows many valid completions; convert to MCQ or a tighter cue at review."] }),

  // ---------------- C2 ----------------
  d.mcq({ b: "backshift-exceptions", t: "double-backshift-counterfactual", L: "C2", diff: 3, focus: "Reporting an unreal (second) conditional: the past form does not shift and 'would' stays", pre: ["backshift-exceptions", "second-conditional", "reported-modals"],
    prompt: "'If I had more time, I would learn Japanese,' she said. → She said that if she ______ more time, she would learn Japanese.",
    options: ["had", "had had", "has", "would have"], key: 0, why: "The unreal past in a second conditional is already non-factual, so it does not backshift.", overlaps: ["conditionals-wishes"],
    flags: ["c2-check: interaction of backshift rules with counterfactual marking — purely structural. C2 provisional."] }),
];