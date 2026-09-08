import { domainBuilder, leg } from "@/lib/adaptiveGrammar/build";
const d = domainBuilder("conditionals-wishes");
const A2 = leg("A2_MCQ"), B1 = leg("B1_MCQ"), B2 = leg("B2_MCQ"), B1O = leg("B1_OPEN_GRAMMAR"), B2O = leg("B2_OPEN_GRAMMAR");

export default [
  // ---------------- A2 ----------------
  d.mcq({ b: "zero-first", t: "zero-conditional", L: "A2", diff: 1, focus: "Zero conditional: present + present for a general truth", pre: ["zero-conditional", "present-simple"],
    prompt: "If you heat ice, it ______.", options: ["melts", "will melt", "melted", "is melting"], key: 0, why: "General truth → present simple in both clauses.", legacy: A2("If you heat ice, it ______.") }),
  d.mcq({ b: "zero-first", t: "first-conditional", L: "A2", diff: 1, focus: "First conditional: if + present, will + base", pre: ["first-conditional", "future-will"],
    prompt: "If it rains tomorrow, we ______ at home.", options: ["stay", "stayed", "will stay", "have stayed"], key: 2, why: "Real future possibility → will + base.", legacy: A2("If it rains tomorrow, we ______ at home.") }),
  d.mcq({ b: "zero-first", t: "first-conditional-no-will-in-if", L: "A2", diff: 2, focus: "No 'will' in the if-clause", pre: ["first-conditional"],
    prompt: "If you don't hurry, you ______ the bus.", options: ["miss", "will miss", "missed", "are missing"], key: 1, why: "Present in the if-clause, will in the result clause.", legacy: A2("If you don't hurry, you ______ the bus.") }),
  d.gap({ b: "zero-first", t: "first-conditional", L: "A2", diff: 2, focus: "Producing both halves of a first conditional", pre: ["first-conditional"],
    source: "If she ______ (finish) early, she ______ (call) you.", key: ["finishes", "will call"], alt: [["finishes", "'ll call"]], why: "present simple + will." }),

  // ---------------- B1 ----------------
  d.mcq({ b: "second", t: "second-conditional", L: "B1", diff: 2, focus: "Second conditional: if + past, would + base (unreal present)", pre: ["second-conditional"],
    prompt: "If I were you, I ______ for that job.", options: ["apply", "will apply", "would apply", "applied"], key: 2, why: "Hypothetical advice → would + base.", legacy: B1("If I were you, I ______ for that job.") }),
  d.mcq({ b: "second", t: "second-conditional-if-clause", L: "B1", diff: 2, focus: "Past form in the if-clause of a second conditional", pre: ["second-conditional"],
    prompt: "What would you do if you ______ a million dollars?", options: ["win", "won", "will win", "have won"], key: 1, why: "Unreal → past simple in the if-clause.", legacy: B1("What would you do if you ______ a million dollars?") }),
  d.mcq({ b: "linkers", t: "unless", L: "B1", diff: 2, focus: "unless = if not", pre: ["unless"],
    prompt: "You won't pass the exam ______ you study more.", options: ["if", "unless", "although", "because"], key: 1, why: "Negative condition → unless.", legacy: B1("You won't pass the exam ______ you study more.") }),
  d.gap({ b: "second", t: "were-subjunctive", L: "B1", diff: 2, focus: "'were' for all persons in the unreal if-clause", pre: ["second-conditional"],
    source: "If I ______ (be) taller, I ______ (play) basketball.", key: ["were", "would play"], alt: [["was", "would play"]], why: "Unreal 'were' (formal) or 'was' (informal) + would." }),
  d.mcq({ b: "wishes-preference", t: "wish-present", L: "B1", diff: 3, focus: "wish + past form for an unreal present", pre: ["wish-unreal-present"],
    prompt: "I wish I ______ more free time during the week.", options: ["have", "had", "will have", "would have had"], key: 1, why: "Unreal present → past form after wish." }),
  d.guided({ b: "second", t: "second-conditional", L: "B1", diff: 2, focus: "Productive second conditional", pre: ["second-conditional"],
    prompt: "Write one sentence about an imaginary or unlikely situation using the second conditional.", required: "second conditional: if + past simple, would + base verb (imaginary/unlikely situation)",
    legacy: B1O("Write one sentence about an imaginary or unlikely situation using the second conditional.") }),
  d.guided({ b: "linkers", t: "unless", L: "B1", diff: 2, focus: "Productive unless", pre: ["unless"],
    prompt: "Write one sentence using unless to describe a condition for a future situation.", required: "unless + present simple used correctly to express a negative condition",
    legacy: B1O("Write one sentence using unless to describe a condition for a future situation.") }),

  // ---------------- B2 ----------------
  d.mcq({ b: "third", t: "third-conditional", L: "B2", diff: 2, focus: "Third conditional: if + past perfect, would have + pp", pre: ["third-conditional", "modal-perfect"],
    prompt: "If you had told me, I ______ you.", options: ["would help", "would have helped", "helped", "will help"], key: 1, why: "Unreal past → would have + pp.", legacy: B2("If you had told me, I ______ you.") }),
  d.mcq({ b: "mixed", t: "mixed-past-present", L: "B2", diff: 3, focus: "Mixed conditional: past condition, present result", pre: ["mixed-conditional", "third-conditional"],
    prompt: "If I had studied medicine, I ______ a doctor now.", options: ["am", "would be", "would have been", "was"], key: 1, why: "Past condition + present result → would + base.", legacy: B2("If I had studied medicine, I ______ a doctor now.") }),
  d.mcq({ b: "linkers", t: "provided-that", L: "B2", diff: 2, focus: "provided that as a strong conditional linker", pre: ["conditional-linkers"],
    prompt: "You may use my car ______ you drive carefully.", options: ["unless", "provided that", "otherwise", "despite"], key: 1, why: "Condition with a proviso → provided that.", legacy: B2("You may use my car ______ you drive carefully.") }),
  d.mcq({ b: "wishes-preference", t: "wish-past", L: "B2", diff: 2, focus: "wish + past perfect for past regret", pre: ["wish-unreal-past"],
    prompt: "I wish I ______ more attention during the lesson.", options: ["paid", "had paid", "have paid", "would pay"], key: 1, why: "Past regret → wish + past perfect.", legacy: B2("I wish I ______ more attention during the lesson.") }),
  d.mcq({ b: "wishes-preference", t: "would-rather-subject", L: "B2", diff: 3, focus: "would rather + subject + past simple for another person's action", pre: ["would-rather"],
    prompt: "I'd rather you ______ anyone about this.", options: ["don't tell", "didn't tell", "won't tell", "haven't told"], key: 1, why: "would rather + subject + past simple.", legacy: B2("I'd rather you ______ anyone about this.") }),
  d.gap({ b: "third", t: "third-conditional", L: "B2", diff: 2, focus: "Producing both halves of a third conditional", pre: ["third-conditional"],
    source: "If we ______ (leave) earlier, we ______ (not miss) the train.", key: ["had left", "wouldn't have missed"], alt: [["had left", "would not have missed"]], why: "past perfect + would(n't) have + pp." }),
  d.rewrite({ b: "mixed", t: "mixed-past-present", L: "B2", diff: 3, focus: "Turning two facts into a mixed conditional", pre: ["mixed-conditional"],
    instr: "Rewrite as ONE conditional sentence beginning with the words given.", source: "I didn't take the job in Almaty. I don't live abroad now.", hint: "If I ______", key: "had taken the job in Almaty, I would live abroad now", why: "Past condition, present result." }),
  d.guided({ b: "third", t: "third-conditional", L: "B2", diff: 2, focus: "Productive third conditional expressing past regret", pre: ["third-conditional"],
    prompt: "Describe a past situation you wish had happened differently. Use the third conditional.", required: "third conditional: if + past perfect, would have + past participle, expressing past regret",
    legacy: B2O("Describe a past situation you wish had happened differently. Use the third conditional.") }),
  d.guided({ b: "wishes-preference", t: "wish-past", L: "B2", diff: 2, focus: "Productive wish + past perfect", pre: ["wish-unreal-past"],
    prompt: "Write one sentence about a past situation you regret. Use wish + past perfect.", required: "wish + past perfect expressing regret about the past",
    legacy: B2O("Write one sentence about a past situation you regret. Use wish + past perfect.") }),

  // ---------------- C1 ---------------- (inverted conditionals: provisional C1 per ruling §4)
  d.mcq({ b: "inverted", t: "had-inversion", L: "C1", diff: 2, focus: "Inverted third conditional: Had + subject + pp, without if", pre: ["inverted-conditional", "third-conditional"],
    prompt: "______ I known about the problem, I would have acted sooner.", options: ["Had", "Have", "Did", "Were"], key: 0, why: "Inversion replaces 'If I had'.", legacy: B2("______ I known about the problem, I would have acted sooner.") }),
  d.rewrite({ b: "inverted", t: "had-inversion", L: "C1", diff: 3, focus: "Producing an inverted third conditional", pre: ["inverted-conditional"],
    instr: "Rewrite the sentence without 'if', beginning with the word given.", source: "If the company had acted sooner, the losses would have been smaller.", hint: "Had ______",
    key: "the company acted sooner, the losses would have been smaller", why: "Had + subject + past participle." }),
  d.mcq({ b: "inverted", t: "were-to-inversion", L: "C1", diff: 3, focus: "Were + subject + to-infinitive for a remote hypothetical", pre: ["inverted-conditional", "second-conditional"],
    prompt: "______ the government to raise taxes again, many small businesses would close.", options: ["Were", "Was", "Had", "Should"], key: 0, why: "Formal remote hypothesis → Were + subject + to + base." }),
  d.mcq({ b: "wishes-preference", t: "wish-would", L: "C1", diff: 2, focus: "wish + would for annoyance at someone else's repeated behaviour", pre: ["wish-would", "wish-unreal-present"],
    prompt: "I wish he ______ interrupting me every time I try to explain something.", options: ["stopped", "would stop", "stops", "had stopped"], key: 1, why: "Annoyance at another's behaviour → wish + would." }),
  d.mcq({ b: "linkers", t: "otherwise-implied", L: "C1", diff: 3, focus: "Implied conditional with 'otherwise'", pre: ["implied-conditional", "conditional-linkers"],
    prompt: "She must have left very early; ______ we would have seen her at breakfast.", options: ["otherwise", "unless", "provided that", "in case"], key: 0, why: "'otherwise' carries the unstated negative condition." }),
  d.gap({ b: "wishes-preference", t: "if-only", L: "C1", diff: 2, focus: "If only + past perfect for intensified past regret", pre: ["if-only", "wish-unreal-past"],
    instr: "Complete the gap with THREE words using the verb in brackets.", source: "If only she ______ (tell) us the truth from the beginning.", key: "had told us", why: "If only + past perfect for past regret." }),

  // ---------------- C2 ----------------
  d.mcq({ b: "inverted", t: "should-inversion", L: "C2", diff: 3, focus: "Should + subject + base infinitive for a formal remote possibility (no if)", pre: ["inverted-conditional", "first-conditional"],
    prompt: "______ any difficulties arise during the installation, please contact our technical team.", options: ["Should", "Would", "Had", "Were"], key: 0, why: "Formal 'Should + subject + base' = 'If any difficulties should arise'.",
    flags: ["c2-check: 'Should'-inversion is a distinct conditional inversion pattern from Had/Were and is not merely harder vocabulary. C2 provisional; arguably C1 in formal-writing courses."] }),
  d.mcq({ b: "mixed", t: "mixed-present-past", L: "C2", diff: 3, focus: "Reverse mixed conditional: present/permanent condition, past result", pre: ["mixed-conditional"],
    prompt: "If she weren't so cautious by nature, she ______ that offer years ago.", options: ["would accept", "would have accepted", "had accepted", "accepted"], key: 1, why: "Ongoing condition (present) + unreal past result → would have + pp.",
    flags: ["c2-check: the present-condition/past-result direction is the rarer mixed type; genuinely grammatical. C2 provisional."] }),
];